"""
Dish Profiler Agent — 메뉴명에서 재료·알레르기·문화 맥락 추출

References:
- ADR-004: 3-agent architecture
- ROADMAP.md D3: hansik 800 RAG
- ROADMAP.md D5: allergy classification

Data sources:
- 한식진흥원 길라잡이 800선 (공공데이터 15129784)
- pgvector on Supabase
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


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
    
    source: str = Field(..., description="official_db | llm_inference | hybrid")


# 알레르기 14종 표준 (식품위생법 시행규칙 기준)
ALLERGENS_14 = [
    "egg", "milk", "buckwheat", "peanut", "soybean", "wheat",
    "mackerel", "crab", "shrimp", "pork", "peach", "tomato",
    "sulfite", "walnut",
]


async def profile_dish(
    dish_name: str,
    user_language: str = "en",
    user_allergies: list[str] | None = None,
) -> DishProfile:
    """
    메뉴명 → 풍부한 프로필.
    
    TODO (D3):
    - Supabase pgvector similarity search with hansik 800 embeddings
    - If similarity > 0.85, use official translation
    - Else, fall back to Claude Sonnet with structured output
    
    TODO (D5):
    - Ingredient extraction prompt
    - Allergen matching against 14 standard categories
    - Halal/vegan/vegetarian inference
    """
    raise NotImplementedError("D3/D5 구현 예정")


if __name__ == "__main__":
    import asyncio
    result = asyncio.run(profile_dish("김치찌개"))
    print(result.model_dump_json(indent=2))
