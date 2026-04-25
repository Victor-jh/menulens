"""
외국인 한식 리뷰 수집 + 즉시 보상 룰렛.

가치 (제안서 어필):
- 외국인 한식 만족도 raw data 자산화 → 한국관광공사·진흥원 외국인 공략(마케팅) 데이터
- 짧은 체류 기간(평균 6일) 고려한 즉시성 보상 (룰렛)
- 익명 데이터, 한국어 자동 번역으로 식당·정책 활용도 ↑
"""
from __future__ import annotations

import asyncio
import os
import random
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_REPO_ROOT / "backend" / ".env")

import google.generativeai as genai
import httpx

from backend.agents.review_enricher import enrich as enrich_review, ReviewEnrichment


class ReviewIn(BaseModel):
    dish_name: str
    dish_name_en: Optional[str] = None
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    language: str = "en"
    visit_kind: str = "unknown"  # dine_in | takeout | unknown
    tags: list[str] = Field(default_factory=list)
    image_b64: Optional[str] = None
    visitor_country: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    dish_name: str
    dish_name_en: Optional[str]
    rating: int
    comment: Optional[str]
    comment_ko: Optional[str]
    comment_en: Optional[str] = None
    comment_ja: Optional[str] = None
    comment_zh: Optional[str] = None
    sentiment: str = "neutral"
    aspects: list[str] = []
    themes: list[str] = []
    recommend: bool = False
    threads_text: Optional[str] = None
    threads_status: str = "pending"
    threads_post_id: Optional[str] = None
    language: str
    visit_kind: str
    tags: list[str]
    visitor_country: Optional[str]
    reward_code: Optional[str]
    created_at: str


class RewardResult(BaseModel):
    code: str               # internal: 5K | COFFEE | NEXT
    label: str              # display label in user language
    label_ko: str           # Korean label for staff hand-off (if any)
    description: str        # short description
    won: bool               # True = real reward, False = "next time"
    rarity: str             # common | rare | jackpot


# Reward distribution — 짧은 체류 외국인이라 즉시 받는 보상이 핵심.
# Phase 1: code만 발급, 실 보상은 운영 단계 정책으로 (현재는 mock)
REWARD_TABLE = [
    # (code, weight, label_en, label_ko, desc_en, rarity)
    ("COFFEE",  10, "Coffee voucher",      "커피 쿠폰",      "Free coffee at participating cafés", "rare"),
    ("5K",       8, "₩5,000 dining credit","₩5,000 식사 크레딧", "Use at any partner Korean restaurant", "rare"),
    ("STICKER",  35, "MenuLens sticker",    "메뉴렌즈 스티커",  "Cute sticker pack at the airport kiosk", "common"),
    ("MAP",      25, "Hidden gem map",      "숨은 맛집 지도",   "Curated map of foreigner-friendly Korean restaurants", "common"),
    ("NEXT",     22, "Try again next time", "다음 기회에",      "Save another review to spin again", "common"),
]


async def _post_to_threads(text: Optional[str]) -> tuple[Optional[str], str]:
    """
    Post a Threads-ready text. If THREADS_ACCESS_TOKEN/THREADS_USER_ID env are set,
    posts via Meta Threads API; otherwise marks as 'skipped' (Phase 1 preview-only).
    Returns (post_id, status).
    """
    if not text:
        return None, "skipped"
    token = os.getenv("THREADS_ACCESS_TOKEN")
    user_id = os.getenv("THREADS_USER_ID")
    if not (token and user_id):
        return None, "skipped"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Two-step: create container → publish
            create = await client.post(
                f"https://graph.threads.net/v1.0/{user_id}/threads",
                params={"media_type": "TEXT", "text": text, "access_token": token},
            )
            create.raise_for_status()
            container_id = create.json().get("id")
            if not container_id:
                return None, "failed"
            publish = await client.post(
                f"https://graph.threads.net/v1.0/{user_id}/threads_publish",
                params={"creation_id": container_id, "access_token": token},
            )
            publish.raise_for_status()
            return publish.json().get("id"), "posted"
    except Exception:
        return None, "failed"


def _draw_reward() -> RewardResult:
    """Weighted draw."""
    weights = [w for _, w, *_ in REWARD_TABLE]
    chosen = random.choices(REWARD_TABLE, weights=weights, k=1)[0]
    code, _, label_en, label_ko, desc, rarity = chosen
    return RewardResult(
        code=code,
        label=label_en,
        label_ko=label_ko,
        description=desc,
        won=(code != "NEXT"),
        rarity=rarity,
    )


async def _translate_to_ko(text: str, source_lang: str) -> Optional[str]:
    """Gemini로 사용자 코멘트를 한국어로 짧게 번역."""
    if not text or source_lang == "ko":
        return text or None
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")
    prompt = (
        f"Translate the following short food review to Korean. "
        f"Keep it concise, natural, and preserve emotion. Reply with the translation only.\n\n"
        f"Review ({source_lang}): {text}"
    )
    try:
        resp = await asyncio.wait_for(
            asyncio.to_thread(
                model.generate_content,
                prompt,
                generation_config={"temperature": 0.2},
            ),
            timeout=10.0,
        )
        return (resp.text or "").strip() or None
    except Exception:
        return None


def _get_supabase():
    try:
        from supabase import create_client
    except ImportError:
        return None
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not (url and key):
        return None
    return create_client(url, key)


async def submit_review(payload: ReviewIn) -> tuple[ReviewOut, RewardResult]:
    """리뷰 저장 + LLM 다국어/분류 enrichment + Threads 포스트 (Phase 2 OAuth) + 룰렛."""
    sb = _get_supabase()

    # 1) LLM enrichment in parallel with reward draw
    enrichment_task = enrich_review(
        dish_name=payload.dish_name,
        dish_name_en=payload.dish_name_en,
        rating=payload.rating,
        raw_comment=payload.comment,
        source_lang=payload.language,
        visitor_country=payload.visitor_country,
    )
    reward = _draw_reward()
    enrichment: ReviewEnrichment = await enrichment_task

    # 2) Threads post (Phase 1: skip unless THREADS_ACCESS_TOKEN env present)
    threads_post_id, threads_status = await _post_to_threads(enrichment.threads_text)

    row = {
        "dish_name": payload.dish_name,
        "dish_name_en": payload.dish_name_en,
        "rating": payload.rating,
        "comment": payload.comment,
        "comment_ko": enrichment.comment_ko,
        "comment_en": enrichment.comment_en,
        "comment_ja": enrichment.comment_ja,
        "comment_zh": enrichment.comment_zh,
        "sentiment": enrichment.sentiment,
        "aspects": enrichment.aspects,
        "themes": enrichment.themes,
        "recommend": enrichment.recommend,
        "threads_text": enrichment.threads_text,
        "threads_post_id": threads_post_id,
        "threads_status": threads_status,
        "language": payload.language,
        "visit_kind": payload.visit_kind,
        "tags": payload.tags or [],
        "image_b64": payload.image_b64,
        "visitor_country": payload.visitor_country,
        "reward_code": reward.code,
    }

    def _make_unpersisted_out() -> ReviewOut:
        return ReviewOut(
            id=0,
            dish_name=row["dish_name"],
            dish_name_en=row["dish_name_en"],
            rating=row["rating"],
            comment=row["comment"],
            comment_ko=row["comment_ko"],
            comment_en=row["comment_en"],
            comment_ja=row["comment_ja"],
            comment_zh=row["comment_zh"],
            sentiment=row["sentiment"],
            aspects=row["aspects"],
            themes=row["themes"],
            recommend=row["recommend"],
            threads_text=row["threads_text"],
            threads_status=row["threads_status"],
            threads_post_id=row["threads_post_id"],
            language=row["language"],
            visit_kind=row["visit_kind"],
            tags=row["tags"],
            visitor_country=row["visitor_country"],
            reward_code=row["reward_code"],
            created_at="(not persisted)",
        )

    if sb is None:
        # Graceful degrade — no Supabase → still return reward
        return _make_unpersisted_out(), reward

    try:
        def _insert():
            return sb.table("reviews").insert(row).execute()
        res = await asyncio.to_thread(_insert)
    except Exception:
        # Table missing or other DB error — keep reward UX intact
        return _make_unpersisted_out(), reward

    saved = res.data[0] if res.data else row | {"id": 0, "created_at": ""}
    out = ReviewOut(
        id=saved.get("id") or 0,
        dish_name=saved["dish_name"],
        dish_name_en=saved.get("dish_name_en"),
        rating=saved["rating"],
        comment=saved.get("comment"),
        comment_ko=saved.get("comment_ko"),
        comment_en=saved.get("comment_en"),
        comment_ja=saved.get("comment_ja"),
        comment_zh=saved.get("comment_zh"),
        sentiment=saved.get("sentiment", "neutral"),
        aspects=saved.get("aspects") or [],
        themes=saved.get("themes") or [],
        recommend=bool(saved.get("recommend", False)),
        threads_text=saved.get("threads_text"),
        threads_status=saved.get("threads_status", "pending"),
        threads_post_id=saved.get("threads_post_id"),
        language=saved.get("language", "en"),
        visit_kind=saved.get("visit_kind", "unknown"),
        tags=saved.get("tags") or [],
        visitor_country=saved.get("visitor_country"),
        reward_code=saved.get("reward_code"),
        created_at=str(saved.get("created_at") or ""),
    )
    return out, reward


async def list_recent_reviews(limit: int = 20) -> list[ReviewOut]:
    sb = _get_supabase()
    if sb is None:
        return []
    select_cols = (
        "id,dish_name,dish_name_en,rating,comment,"
        "comment_ko,comment_en,comment_ja,comment_zh,"
        "sentiment,aspects,themes,recommend,"
        "threads_text,threads_post_id,threads_status,"
        "language,visit_kind,tags,visitor_country,reward_code,created_at"
    )
    def _q():
        return (
            sb.table("reviews")
            .select(select_cols)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
    try:
        res = await asyncio.to_thread(_q)
    except Exception:
        return []
    out: list[ReviewOut] = []
    for r in (res.data or []):
        out.append(ReviewOut(
            id=r.get("id") or 0,
            dish_name=r["dish_name"],
            dish_name_en=r.get("dish_name_en"),
            rating=r["rating"],
            comment=r.get("comment"),
            comment_ko=r.get("comment_ko"),
            comment_en=r.get("comment_en"),
            comment_ja=r.get("comment_ja"),
            comment_zh=r.get("comment_zh"),
            sentiment=r.get("sentiment") or "neutral",
            aspects=r.get("aspects") or [],
            themes=r.get("themes") or [],
            recommend=bool(r.get("recommend", False)),
            threads_text=r.get("threads_text"),
            threads_post_id=r.get("threads_post_id"),
            threads_status=r.get("threads_status") or "pending",
            language=r.get("language") or "en",
            visit_kind=r.get("visit_kind") or "unknown",
            tags=r.get("tags") or [],
            visitor_country=r.get("visitor_country"),
            reward_code=r.get("reward_code"),
            created_at=str(r.get("created_at") or ""),
        ))
    return out
