"""
Price Sentinel Agent — 메뉴·가격에서 바가지 판정 (D4).

References:
- ADR-002: 한국소비자원 참가격 8품목 한정
- ADR-007: 임계값 🟢<110, 🟡 110~130, 🔴>130 확정
- ROADMAP.md D4: price benchmark

Data: backend/data/consumer_price.json (한국소비자원 참가격 서울 2025-12)
Matching cascade:
    1. exact substring against keys + aliases
    2. fuzzy match (rapidfuzz token_set_ratio)
    3. embedding fallback via hansik_800 similarity
"""
from __future__ import annotations

import asyncio
import json
import os
from enum import Enum
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_REPO_ROOT / "backend" / ".env")

_PRICE_JSON_PATH = _REPO_ROOT / "backend" / "data" / "consumer_price.json"


class PriceVerdict(str, Enum):
    FAIR = "🟢"      # ratio <= 1.10
    CAUTION = "🟡"   # 1.10 < ratio <= 1.30
    SUSPECT = "🔴"   # ratio > 1.30
    UNKNOWN = "⚪"   # no benchmark


class PriceJudgment(BaseModel):
    dish_name: str
    listed_price: int
    benchmark_key: Optional[str] = None
    benchmark_price: Optional[int] = Field(None, description="참가격 기준 (원)")
    benchmark_source: str = Field("none", description="참가격 | none")
    match_method: str = Field("none", description="exact | alias | fuzzy | embedding | none")
    match_confidence: float = Field(0.0, ge=0.0, le=1.0)
    ratio: Optional[float] = None
    verdict: PriceVerdict
    explanation: str = Field(..., description="사용자용 한 줄 설명")


# --- data loader -----------------------------------------------------------
def _load_price_data() -> dict:
    with _PRICE_JSON_PATH.open(encoding="utf-8") as f:
        return json.load(f)


_PRICE_DATA: Optional[dict] = None


def _data() -> dict:
    global _PRICE_DATA
    if _PRICE_DATA is None:
        _PRICE_DATA = _load_price_data()
    return _PRICE_DATA


def _benchmark_for(key: str) -> Optional[int]:
    for item in _data()["items"]:
        if item["key"] == key:
            return int(item["avg_price"])
    return None


# --- matching cascade ------------------------------------------------------
def _exact_or_alias_match(dish_name: str) -> tuple[Optional[str], str]:
    """Return (key, method) where method in {'exact', 'alias'}."""
    d = _data()
    name_stripped = dish_name.replace(" ", "")
    # exact key substring
    for item in d["items"]:
        if item["key"] in name_stripped:
            return item["key"], "exact"
    # alias substring (일반적 변형: 물냉면, 짜장면, 돌솥비빔밥 등)
    for key, aliases in d.get("aliases", {}).items():
        for alias in aliases:
            if alias.replace(" ", "") in name_stripped:
                return key, "alias"
    return None, "none"


def _fuzzy_match(dish_name: str, score_cutoff: int = 80) -> tuple[Optional[str], int]:
    """rapidfuzz token_set_ratio against keys + aliases."""
    try:
        from rapidfuzz import fuzz
    except ImportError:
        return None, 0
    d = _data()
    best_key, best_score = None, 0
    name_stripped = dish_name.replace(" ", "")
    for key, aliases in d.get("aliases", {}).items():
        for cand in [key] + aliases:
            s = fuzz.token_set_ratio(name_stripped, cand.replace(" ", ""))
            if s > best_score:
                best_score, best_key = s, key
    if best_score >= score_cutoff:
        return best_key, best_score
    return None, best_score


# --- embedding fallback (hansik_800 via Gemini) ---------------------------
async def _embedding_match(dish_name: str, min_sim: float = 0.65) -> tuple[Optional[str], float]:
    """
    Query hansik_800 → get top match's name_ko → see if it's one of our 8 items.
    Useful when Menu Reader OCR produces "김치찌게" or "김치찌개백반" etc.
    """
    try:
        from backend.agents.dish_profiler import _rag_lookup
        match = await _rag_lookup(dish_name)
    except Exception:
        return None, 0.0
    if not match:
        return None, 0.0
    sim = float(match.get("similarity") or 0.0)
    if sim < min_sim:
        return None, sim
    matched_name = match.get("name_ko") or ""
    key, _ = _exact_or_alias_match(matched_name)
    return key, sim


# --- verdict ---------------------------------------------------------------
def _verdict_for(ratio: float) -> PriceVerdict:
    th = _data()["thresholds"]
    if ratio <= th["fair_max_ratio"]:
        return PriceVerdict.FAIR
    if ratio <= th["caution_max_ratio"]:
        return PriceVerdict.CAUTION
    return PriceVerdict.SUSPECT


def _explanation(benchmark: int, ratio: float, verdict: PriceVerdict) -> str:
    pct = int(round((ratio - 1) * 100))
    if verdict is PriceVerdict.FAIR:
        return f"서울 평균 ₩{benchmark:,} 대비 정상가"
    if verdict is PriceVerdict.CAUTION:
        return f"서울 평균 ₩{benchmark:,} 대비 {pct}% 비쌈 — 주의"
    return f"서울 평균 ₩{benchmark:,} 대비 {pct}% 높음 — 관광지 가격 의심"


# --- public API -----------------------------------------------------------
async def judge_price(dish_name: str, listed_price: int) -> PriceJudgment:
    """
    바가지 판정 (ADR-002 · ADR-007).

    Cascade:
        1. exact/alias substring → confidence 0.95
        2. rapidfuzz token_set_ratio >=80 → confidence 0.75
        3. hansik_800 embedding sim >=0.65 → confidence 0.60
        4. unknown
    """
    # 1. exact / alias
    key, method = _exact_or_alias_match(dish_name)
    confidence = 0.95 if method == "exact" else 0.90 if method == "alias" else 0.0

    # 2. fuzzy
    if not key:
        key, score = _fuzzy_match(dish_name)
        if key:
            method = "fuzzy"
            confidence = 0.60 + (score - 80) / 100  # 0.60~0.80 기반

    # 3. embedding fallback
    if not key:
        key, sim = await _embedding_match(dish_name)
        if key:
            method = "embedding"
            confidence = min(0.70, sim)

    if not key:
        return PriceJudgment(
            dish_name=dish_name,
            listed_price=listed_price,
            verdict=PriceVerdict.UNKNOWN,
            explanation="참가격 8품목에 매칭되지 않음 (확대는 Phase 2 크라우드 제보)",
            match_method="none",
            match_confidence=0.0,
        )

    benchmark = _benchmark_for(key)
    if benchmark is None:
        return PriceJudgment(
            dish_name=dish_name,
            listed_price=listed_price,
            verdict=PriceVerdict.UNKNOWN,
            explanation=f"key={key} 매칭됐으나 price missing",
            match_method=method,
            match_confidence=confidence,
        )

    ratio = listed_price / benchmark
    verdict = _verdict_for(ratio)

    return PriceJudgment(
        dish_name=dish_name,
        listed_price=listed_price,
        benchmark_key=key,
        benchmark_price=benchmark,
        benchmark_source="참가격",
        match_method=method,
        match_confidence=round(confidence, 2),
        ratio=round(ratio, 3),
        verdict=verdict,
        explanation=_explanation(benchmark, ratio, verdict),
    )


if __name__ == "__main__":
    # ADR-007 canary + 매칭 방법별 샘플
    cases = [
        ("김치찌개", 9000),      # exact, fair 🟢
        ("김치찌개", 10500),     # exact, caution 🟡 (122%)
        ("김치찌개", 12000),     # exact, suspect 🔴 (ADR-007 canary, 140%)
        ("김치찌개백반", 12000), # alias → 김치찌개, 🔴
        ("물냉면", 15000),       # alias → 냉면, caution 🟡 (124%)
        ("돌솥비빔밥", 15000),   # alias → 비빔밥, caution 🟡 (134% → 🔴)
        ("짜장면", 9000),        # alias → 자장면, caution 🟡 (117%)
        ("떡볶이", 5000),        # unknown
    ]
    for name, price in cases:
        r = asyncio.run(judge_price(name, price))
        method_info = f"[{r.match_method}/{r.match_confidence:.2f}]" if r.match_method != "none" else "[none]"
        print(f"{r.verdict.value} {name:12s} ₩{price:>6,}  {method_info:22s} {r.explanation}")
