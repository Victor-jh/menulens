"""
Dish Profiler Agent — 메뉴명에서 재료·알레르기·문화 맥락 추출.

References:
- ADR-004: 3-agent architecture
- ADR-008: Gemini text-embedding-004 (768 dim)
- ROADMAP.md D3: hansik 800 RAG
- ROADMAP.md D5: allergy classification
- docs/research/05_한식800선_정제스펙.md §4.3 매칭 임계값

Data sources:
- 한식진흥원 길라잡이 800선 (공공데이터 15129784, fileData)
- pgvector on Supabase (match_hansik RPC)
"""
from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_REPO_ROOT / "backend" / ".env")

try:
    import google.generativeai as genai
    _GEMINI_OK = True
except ImportError:
    _GEMINI_OK = False

try:
    from supabase import create_client
    _SUPABASE_OK = True
except ImportError:
    _SUPABASE_OK = False


class DishProfile(BaseModel):
    """Enriched profile of a single dish."""
    name_ko: str = Field(..., description="메뉴명 (원문)")
    name_official: Optional[str] = Field(None, description="한식진흥원 공식 영문 표기")
    name_translated: str = Field(..., description="사용자 언어로 번역")
    romanization: Optional[str] = Field(None, description="공식 라틴 발음 (한식진흥원)")
    description: str = Field(..., description="한 줄 문화 맥락 설명 (사용자 언어)")

    ingredients: list[str] = Field(default_factory=list, description="desc_ko에서 추출된 재료 키워드")
    allergens: list[str] = Field(default_factory=list, description="알레르기 태그 (14종 중)")

    halal_safe: bool = Field(False, description="할랄 적합 여부 (halal_likely)")
    vegan_safe: bool = Field(False, description="비건 적합 여부")
    vegetarian_safe: bool = Field(False, description="채식 적합 여부 (계란·유제품 허용)")

    pronunciation: Optional[str] = Field(None, description="주문용 한국어 문장 (D5)")
    pronunciation_romanized: Optional[str] = Field(None, description="로마자 발음 (D5)")
    spicy_level: Optional[int] = Field(None, ge=0, le=3, description="0=안매움, 1=약간, 2=매움, 3=매우 매움")
    category: Optional[str] = Field(None, description="찌개 [Jjigae] 형식 카테고리")

    match_similarity: Optional[float] = Field(None, description="hansik_800 매칭 유사도 (0~1, cosine)")
    source: str = Field(..., description="official_db | llm_inference | hybrid | unknown")


# 알레르기 14종 표준 (식품위생법 시행규칙 기준)
ALLERGENS_14 = [
    "egg", "milk", "buckwheat", "peanut", "soybean", "wheat",
    "mackerel", "crab", "shrimp", "pork", "peach", "tomato",
    "sulfite", "walnut",
]

# spec §4.3 임계값 (cosine similarity, 1 - distance)
MATCH_HIGH = 0.65   # >= 0.65 → official_db 사용
MATCH_LOW  = 0.50   # 0.50~0.65 → 후보 3개 hybrid (D5 Claude 선택)
#                     < 0.50 → LLM fallback (D5)

# Manual overrides — for dishes NOT in 한식 길라잡이 800선 that the embedding
# search would otherwise mis-match to a similar Korean noodle/dish.
# Audit P0 (2026-05-02): 짜장면 was returning 잡채's English name & description
# because hansik_800 has no Sino-Korean (中華料理) entries — closest neighbour
# in 768d embedding space was 잡채 (also a noodle dish).
# Each entry mirrors the shape of an `_rag_lookup` row.
_DISH_OVERRIDES: dict[str, dict] = {
    "짜장면": {
        "name_ko": "짜장면",
        "name_en": "Black Bean Noodles",
        "romanization": "Jajangmyeon",
        "desc_en": "Wheat noodles topped with thick black bean sauce, "
                   "stir-fried with diced pork and onion. The most popular "
                   "Korean-Chinese fusion dish, often ordered for delivery.",
        "ingredients_extracted": ["면", "춘장(검은콩)", "돼지", "양파", "감자"],
        "allergy_tags": ["wheat", "soybean", "pork"],
        "halal_status": "not_halal",
        "vegan_status": "not_vegan",
        "spicy_level": 0,
        "category": "면 [Myeon]",
        "similarity": 1.0,
    },
    "자장면": {  # 표준어 표기
        "name_ko": "자장면",
        "name_en": "Black Bean Noodles",
        "romanization": "Jajangmyeon",
        "desc_en": "Wheat noodles topped with thick black bean sauce, "
                   "stir-fried with diced pork and onion.",
        "ingredients_extracted": ["면", "춘장(검은콩)", "돼지", "양파"],
        "allergy_tags": ["wheat", "soybean", "pork"],
        "halal_status": "not_halal",
        "vegan_status": "not_vegan",
        "spicy_level": 0,
        "category": "면 [Myeon]",
        "similarity": 1.0,
    },
    "짬뽕": {
        "name_ko": "짬뽕",
        "name_en": "Spicy Seafood Noodle Soup",
        "romanization": "Jjamppong",
        "desc_en": "Spicy red broth with wheat noodles, mussels, squid, "
                   "shrimp, pork and vegetables. Korean-Chinese staple.",
        "ingredients_extracted": ["면", "어패류", "오징어", "새우", "돼지", "고추"],
        "allergy_tags": ["wheat", "shrimp", "crab", "pork"],
        "halal_status": "not_halal",
        "vegan_status": "not_vegan",
        "spicy_level": 2,
        "category": "면 [Myeon]",
        "similarity": 1.0,
    },
    "탕수육": {
        "name_ko": "탕수육",
        "name_en": "Sweet and Sour Pork",
        "romanization": "Tangsuyuk",
        "desc_en": "Battered fried pork served with a sweet and sour sauce "
                   "made from vinegar, sugar and vegetables.",
        "ingredients_extracted": ["돼지", "전분", "식초", "설탕", "양파"],
        "allergy_tags": ["pork", "wheat", "soybean"],
        "halal_status": "not_halal",
        "vegan_status": "not_vegan",
        "spicy_level": 0,
        "category": "튀김 [Twigim]",
        "similarity": 1.0,
    },
    "군만두": {
        "name_ko": "군만두",
        "name_en": "Pan-fried Dumplings",
        "romanization": "Gunmandu",
        "desc_en": "Pan-fried dumplings filled with pork, kimchi or vegetables.",
        "ingredients_extracted": ["만두피", "돼지", "부추", "양파"],
        "allergy_tags": ["wheat", "pork"],
        "halal_status": "not_halal",
        "vegan_status": "not_vegan",
        "spicy_level": 0,
        "category": "만두 [Mandu]",
        "similarity": 1.0,
    },
}


def _get_clients():
    if not (_GEMINI_OK and _SUPABASE_OK):
        raise RuntimeError("google-generativeai / supabase 패키지 미설치. pip install -r backend/requirements.txt")
    gemini_key = os.getenv("GEMINI_API_KEY")
    sb_url = os.getenv("SUPABASE_URL")
    # SERVICE_KEY 우선 (RLS 우회, 백엔드 전용). ANON은 RLS 정책 없으면 빈 결과 반환.
    sb_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not (gemini_key and sb_url and sb_key):
        raise RuntimeError("GEMINI_API_KEY / SUPABASE_URL / SUPABASE_*_KEY 환경변수 필요")
    genai.configure(api_key=gemini_key)
    return create_client(sb_url, sb_key)


GEMINI_EMBED_MODEL = "models/gemini-embedding-001"
GEMINI_EMBED_DIM = 768  # SQL VECTOR(768) 정합 (ADR-008)


async def _embed_query(text: str) -> list[float]:
    """Gemini gemini-embedding-001, 768d, RETRIEVAL_QUERY (ADR-008)."""
    r = await asyncio.to_thread(
        genai.embed_content,
        model=GEMINI_EMBED_MODEL,
        content=text,
        task_type="RETRIEVAL_QUERY",
        output_dimensionality=GEMINI_EMBED_DIM,
    )
    return r["embedding"]


async def _rag_lookup(dish_name: str) -> Optional[dict]:
    """hansik_800 pgvector 매칭 (spec §4.3)."""
    supabase = _get_clients()
    emb = await _embed_query(dish_name)
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

    D3 동작 (spec §4.3):
    - hansik_800 pgvector 매칭 (Gemini text-embedding-004, 768d)
    - similarity >= 0.65 → 공식 DB 사용 (source=official_db)
    - 0.50 <= sim < 0.65 → hybrid (D5에서 Claude가 후보 중 확정)
    - sim < 0.50 → unknown (D5 LLM fallback 예정)
    """
    # Manual overrides win over RAG — used for Sino-Korean (中華料理) dishes
    # like 짜장면/짬뽕 that 800선 doesn't cover and where embedding similarity
    # would otherwise produce a wrong neighbor (e.g., 짜장면→잡채).
    normalized = dish_name.replace(" ", "")
    override = _DISH_OVERRIDES.get(normalized)
    if override is not None:
        return DishProfile(
            name_ko=override["name_ko"],
            name_official=override["name_en"],
            name_translated=override["name_en"],
            romanization=override["romanization"],
            description=override["desc_en"],
            ingredients=override.get("ingredients_extracted", []),
            allergens=override.get("allergy_tags", []),
            halal_safe=(override.get("halal_status") == "halal_likely"),
            vegan_safe=(override.get("vegan_status") == "vegan"),
            vegetarian_safe=override.get("vegan_status") in ("vegan", "vegetarian"),
            spicy_level=override.get("spicy_level"),
            category=override.get("category"),
            match_similarity=override.get("similarity", 1.0),
            source="official_db",
        )

    try:
        match = await _rag_lookup(dish_name)
    except RuntimeError:
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
    source = "official_db" if sim >= MATCH_HIGH else "hybrid"

    return DishProfile(
        name_ko=match.get("name_ko") or dish_name,
        name_official=match.get("name_en"),
        name_translated=match.get("name_en") or dish_name,
        romanization=match.get("romanization"),
        description=match.get("desc_en") or "",
        ingredients=match.get("ingredients_extracted") or [],
        allergens=match.get("allergy_tags") or [],
        halal_safe=(match.get("halal_status") == "halal_likely"),
        vegan_safe=(match.get("vegan_status") == "vegan"),
        vegetarian_safe=(match.get("vegan_status") in ("vegan", "vegetarian")),
        pronunciation=None,
        pronunciation_romanized=None,
        spicy_level=match.get("spicy_level"),
        category=match.get("category"),
        match_similarity=sim,
        source=source,
    )


if __name__ == "__main__":
    async def _demo():
        for name in ("김치찌개", "된장찌개", "물냉면", "삼계탕"):
            r = await profile_dish(name)
            print(f"\n--- {name} ---")
            print(r.model_dump_json(indent=2, exclude_none=True))
    asyncio.run(_demo())
