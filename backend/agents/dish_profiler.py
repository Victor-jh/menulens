"""
Dish Profiler Agent — 메뉴명에서 재료·알레르기·문화 맥락 추출.

References:
- ADR-004: 3-agent architecture
- ROADMAP.md D3: hansik 800 RAG (이 파일 D3 작업)
- ROADMAP.md D5: allergy classification (D5 이후 완성)
- docs/research/05_한식800선_정제스펙.md §4.3 매칭 임계값

Data sources:
- 한식진흥원 길라잡이 800선 (공공데이터 15129784)
- pgvector on Supabase (match_hansik RPC)
"""
from __future__ import annotations

import asyncio
import os
from typing import Optional

from pydantic import BaseModel, Field

try:
    from openai import OpenAI
    _OPENAI_OK = True
except ImportError:
    _OPENAI_OK = False

try:
    from supabase import create_client
    _SUPABASE_OK = True
except ImportError:
    _SUPABASE_OK = False


class DishProfile(BaseModel):
    """Enriched profile of a single dish."""
    name_ko: str = Field(..., description="메뉴명 (원문)")
    name_official: Optional[str] = Field(None, description="한식진흥원 공식 표기")
    name_translated: str = Field(..., description="사용자 언어로 번역")
    description: str = Field(..., description="한 줄 문화 맥락 설명 (사용자 언어)")

    ingredients: list[str] = Field(default_factory=list, description="주재료 리스트")
    allergens: list[str] = Field(default_factory=list, description="알레르기 유발 14종 중 해당")

    halal_safe: bool = Field(False, description="할랄 적합 여부")
    vegan_safe: bool = Field(False, description="비건 적합 여부")
    vegetarian_safe: bool = Field(False, description="채식 적합 여부 (계란·유제품 허용)")

    pronunciation: Optional[str] = Field(None, description="주문용 한국어 문장")
    pronunciation_romanized: Optional[str] = Field(None, description="로마자 발음")

    match_similarity: Optional[float] = Field(None, description="hansik_800 매칭 유사도 (0~1)")
    source: str = Field(..., description="official_db | llm_inference | hybrid | unknown")


# 알레르기 14종 표준 (식품위생법 시행규칙 기준)
ALLERGENS_14 = [
    "egg", "milk", "buckwheat", "peanut", "soybean", "wheat",
    "mackerel", "crab", "shrimp", "pork", "peach", "tomato",
    "sulfite", "walnut",
]

# spec §4.3 임계값
MATCH_HIGH = 0.65   # cosine similarity >= 0.65 → 공식 사용 (cosine_distance <= 0.35)
MATCH_LOW  = 0.50   # 0.50 <= sim < 0.65 → 후보 3개 중 Claude 선택 (D5+)
#                     sim < 0.50 → 매칭 실패, LLM fallback


def _get_clients():
    if not (_OPENAI_OK and _SUPABASE_OK):
        raise RuntimeError("openai/supabase 패키지 미설치. pip install -r backend/requirements.txt")
    oa_key = os.getenv("OPENAI_API_KEY")
    sb_url = os.getenv("SUPABASE_URL")
    sb_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
    if not (oa_key and sb_url and sb_key):
        raise RuntimeError("OPENAI_API_KEY / SUPABASE_URL / SUPABASE_*_KEY 환경변수 필요")
    return OpenAI(api_key=oa_key), create_client(sb_url, sb_key)


async def _embed(text: str, openai_client) -> list[float]:
    resp = await asyncio.to_thread(
        openai_client.embeddings.create,
        model="text-embedding-3-small",
        input=[text],
    )
    return resp.data[0].embedding


async def _rag_lookup(dish_name: str) -> Optional[dict]:
    """hansik_800 pgvector 매칭. spec §4.3 임계값 적용."""
    openai_client, supabase = _get_clients()
    emb = await _embed(dish_name, openai_client)
    res = await asyncio.to_thread(
        supabase.rpc(
            "match_hansik",
            {"query_embedding": emb, "match_threshold": MATCH_LOW, "match_count": 3},
        ).execute
    )
    rows = res.data or []
    if not rows:
        return None
    return rows[0]


async def profile_dish(
    dish_name: str,
    user_language: str = "en",
    user_allergies: list[str] | None = None,
) -> DishProfile:
    """
    메뉴명 → 풍부한 프로필.

    D3 동작:
    - hansik_800 pgvector 매칭 (spec §4.3)
    - similarity >= 0.65: 공식 번역·설명 사용 (source=official_db)
    - 0.50 <= sim < 0.65: 후보 반환 + 추후 Claude 선택 (D5 확장 지점)
    - sim < 0.50: 매칭 실패, 최소 정보만 반환 (D5 LLM fallback 예정)

    D5 확장 포인트:
    - LLM fallback (Claude Sonnet structured output)
    - 사용자 프로필(user_allergies)과 allergy_tags 교차 → 위험 하이라이트
    - pronunciation / romanization
    """
    try:
        match = await _rag_lookup(dish_name)
    except RuntimeError:
        # 환경 미구성 — 스켈레톤 응답
        return DishProfile(
            name_ko=dish_name,
            name_translated=dish_name,
            description="(profile unavailable — RAG backend not configured)",
            source="unknown",
        )

    if match is None:
        return DishProfile(
            name_ko=dish_name,
            name_translated=dish_name,
            description="(no match in hansik_800, D5 LLM fallback 예정)",
            source="unknown",
        )

    sim = float(match.get("similarity") or 0.0)
    if sim >= MATCH_HIGH:
        source = "official_db"
    else:
        source = "hybrid"  # D5에서 Claude로 확정 → official_db or llm_inference

    allergens_db = match.get("allergy_tags") or []

    return DishProfile(
        name_ko=match.get("name_ko") or dish_name,
        name_official=match.get("name_en"),
        name_translated=match.get("name_en") or dish_name,
        description=match.get("desc_en") or match.get("name_en_desc") or "",
        ingredients=match.get("main_ingredients") or [],
        allergens=allergens_db,
        halal_safe=(match.get("halal_status") == "halal_likely"),
        vegan_safe=(match.get("vegan_status") == "vegan"),
        vegetarian_safe=(match.get("vegan_status") in ("vegan", "vegetarian")),
        pronunciation=None,        # D5
        pronunciation_romanized=None,  # D5
        match_similarity=sim,
        source=source,
    )


if __name__ == "__main__":
    async def _demo():
        for name in ("김치찌개", "된장찌개", "삼겹살"):
            r = await profile_dish(name)
            print(f"\n--- {name} ---")
            print(r.model_dump_json(indent=2, exclude_none=True))
    asyncio.run(_demo())
