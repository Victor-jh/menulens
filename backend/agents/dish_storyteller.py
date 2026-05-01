"""
Dish Storyteller — 음식의 정체성·재료·지역 변형·사진 시각 추론.

차별화 포인트 (Papago/번역 도구가 못하는 영역):
- "이 음식이 무엇인지" — 정체성·역사·언제 먹는지
- "주로 어떤 재료" — 일반적 구성 + 변형 가능성
- "지역별로 어떻게 다른지" — 천안 병천순대, 광주 암뽕, 서울 백순대 같은 차이
- "지금 사진은 어디 음식으로 보이는지" — 사진 시각 단서로 지역 추론

요청은 사용자가 카드를 펼친 시점에만 lazy 호출 (POST /story).
기본 RAG 결과(dish_profiler)는 빠른 응답을 보장하고, 이건 추가 컨텍스트.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_REPO_ROOT / "backend" / ".env")

import google.generativeai as genai

GEMINI_STORY_MODEL = "gemini-2.5-flash"

LANG_LABEL = {
    "en": "English",
    "ko": "Korean (한국어)",
    "ja": "Japanese (日本語)",
    "zh-Hans": "Simplified Chinese (简体中文)",
    "zh-Hant": "Traditional Chinese (繁體中文)",
}


class RegionalVariant(BaseModel):
    region: str = Field(..., description="지역명 (예: 천안 병천, 광주, 서울)")
    name: Optional[str] = Field(None, description="지역에서 부르는 다른 이름 (있으면)")
    distinctive: str = Field(..., description="어떻게 다른지 한 문장")


class VisualMatch(BaseModel):
    likely_region: Optional[str] = Field(None, description="사진 시각 단서로 추론한 지역 (확실치 않으면 null)")
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    reasoning: str = Field("", description="왜 그렇게 추정했는지 1~2문장")


class IngredientInfo(BaseModel):
    name_ko: str = Field(..., description="재료 한국어명")
    name_en: Optional[str] = Field(None, description="재료 영문명")
    icon: Optional[str] = Field(None, description="재료를 시각적으로 표현할 단일 이모지 1개 (예: 🥬 🐖 🦐 🥚 🍚)")
    category: str = Field(..., description="채소/육류/해산물/곡물/장류/조미료/과일/유제품/계란/기타 중 하나")
    description: str = Field(..., description="이 재료가 어떤 식재료이고 음식에서 어떤 역할을 하는지 1~2문장")
    allergen_tags: list[str] = Field(default_factory=list, description="14종 중 매핑되는 알레르기: pork/beef/chicken/seafood/fish/shellfish/egg/dairy/gluten/soy/nuts/peanut/sesame/alcohol")
    diet_flags: list[str] = Field(default_factory=list, description="diet 관련 라벨: meat/dairy/egg/seafood/animal-derived/vegan-ok 중 해당")


class DishTags(BaseModel):
    """확장 가능한 태그 분류 — 검색·추천·필터링에 사용."""
    cuisine: list[str] = Field(default_factory=list, description="찌개/국밥/구이/면/밥/볶음/무침/전/떡 등")
    occasion: list[str] = Field(default_factory=list, description="해장/보양/명절/여름/겨울/일상/특별식")
    flavor: list[str] = Field(default_factory=list, description="진한/담백/매운/구수한/시원한/단/짠")
    social: list[str] = Field(default_factory=list, description="1인-가능/술안주/공유/분식/한정식")


class FactCards(BaseModel):
    """큐레이션된 fact 6개 — 서술 대신 카드로 시각화."""
    when_eaten: str = Field("", description="언제 먹는지 1줄 (예: '해장으로 / 추운 겨울 / 명절 아침')")
    origin: str = Field("", description="유래 1줄 (예: '장터에서 도지 부속 활용')")
    pairs_with: list[str] = Field(default_factory=list, description="어울리는 음식 3~5개 (소주/막걸리/깍두기 등)")
    why_locals_love_it: str = Field("", description="한국인이 좋아하는 이유 1줄")
    typical_price_range_won: Optional[str] = Field(None, description="대략 가격대 (예: '7,000~12,000원')")
    serving_temp: str = Field("", description="hot/cold/room — 사용자 언어")


class DishStory(BaseModel):
    """Public response shape for /story endpoint.

    Consumers (frontend `DishDetail` panel, future Phase 2 single_dish UX)
    should treat the `*_detail` and `fact_cards` fields as the canonical
    source of truth. The flat `cultural_context` / `typical_ingredients`
    / `how_to_eat` strings are kept for v1 compatibility but slated for
    deprecation — the structured equivalents render better on mobile and
    survive translation more cleanly.
    """

    name_ko: str
    name_en: str
    short_description: str = Field(..., description="한 문장 요약")
    cultural_context: str = Field(..., description="(legacy) 음식의 정체성·역사 2~4문장 — fact_cards로 대체 권장")
    typical_ingredients: list[str] = Field(default_factory=list, description="(legacy) 일반적 주재료 이름만")
    typical_ingredients_detail: list[IngredientInfo] = Field(default_factory=list, description="재료별 상세 정보 (UI 카드)")
    how_to_eat: str = Field("", description="(legacy) 먹는 방법 1~2문장 — fact_cards로 대체 권장")
    regional_variants: list[RegionalVariant] = Field(default_factory=list, description="지역 변형 (없으면 빈 리스트)")
    visual_match: Optional[VisualMatch] = Field(None, description="사진 첨부 시에만 채워짐")
    tags: DishTags = Field(default_factory=DishTags, description="검색·필터 태그")
    fact_cards: FactCards = Field(default_factory=FactCards, description="시각화용 fact 큐레이션")


_PROMPT = """You are a Korean food cultural guide for a foreign tourist in Korea.
Reply with VALID JSON ONLY matching this exact schema. Every value MUST be SHORT and SCANNABLE — this is a mobile UI, not an essay.

{{
  "name_ko": "한국어 메뉴명",
  "name_en": "English name (한식진흥원 official if known)",
  "short_description": "ONE short sentence in {lang}, max 12 words",
  "cultural_context": "(legacy) 2 sentences max in {lang}",
  "typical_ingredients": ["재료1", "재료2", ...],
  "typical_ingredients_detail": [
    {{
      "name_ko": "재료 한국어명",
      "name_en": "ingredient English name",
      "icon": "🥬",
      "category": "채소|육류|해산물|곡물|장류|조미료|과일|유제품|계란|기타 중 하나",
      "description": "ONE sentence in {lang}, max 18 words. Concrete role in this dish only.",
      "allergen_tags": ["pork", "soy"],
      "diet_flags": ["meat", "animal-derived"]
    }}
  ],
  "how_to_eat": "(legacy) 1 sentence max in {lang}",
  "regional_variants": [
    {{"region": "지역명 in Korean", "name": "지역 별칭 if any", "distinctive": "ONE phrase max 12 words in {lang}"}}
  ],
  "visual_match": {{
    "likely_region": "지역명 or null",
    "confidence": 0.0-1.0,
    "reasoning": "ONE phrase max 15 words in {lang}, or 'no clear cue'"
  }},
  "tags": {{
    "cuisine":  ["찌개", "국밥"],
    "occasion": ["해장", "겨울", "보양"],
    "flavor":   ["구수한", "진한"],
    "social":   ["1인 가능", "술안주"]
  }},
  "fact_cards": {{
    "when_eaten":          "1 short phrase in {lang}, max 10 words. 'Hangover cure' or 'Cold winter days'",
    "origin":              "1 short phrase in {lang}, max 12 words. Where/how it started.",
    "pairs_with":          ["소주", "막걸리", "깍두기"],
    "why_locals_love_it":  "1 short phrase in {lang}, max 12 words.",
    "typical_price_range_won": "7,000~12,000",
    "serving_temp":        "hot|cold|room (in {lang}: hot=뜨겁게/Hot, cold=차갑게/Cold)"
  }}
}}

CRITICAL Rules:
0. PUNCHY > THOROUGH. Mobile cards. Trim every adjective.
1. Korean field values stay Korean (name_ko, region, ingredient.name_ko, tags.*, pairs_with).
2. UI-language values (descriptions, fact_cards strings) follow {lang}.
3. ingredient.icon: ONE emoji, never empty. Stick to common food/animal icons.
4. ingredient.allergen_tags FIXED list: pork beef chicken seafood fish shellfish egg dairy gluten soy nuts peanut sesame alcohol.
5. ingredient.diet_flags FIXED list: meat dairy egg seafood animal-derived vegan-ok.
6. tags.cuisine: 1~3 items. tags.occasion / flavor / social: 0~3 each.
7. fact_cards.pairs_with: 2~5 Korean food/drink names (Korean script).
8. fact_cards.typical_price_range_won: just digits + '~' + digits, no '원'.
9. regional_variants: 1~4 only if real regional differences exist. Empty if uniform.
10. visual_match.likely_region must be null unless image attached AND clear cue. Don't guess.
11. NO markdown fences. NO preamble. JSON object only.
"""


# In-memory cache (PoC). Key: sha256(name + lang + image_hash).
_STORY_CACHE: dict[str, DishStory] = {}


def _cache_key(name: str, language: str, image_bytes: Optional[bytes]) -> str:
    h = hashlib.sha256()
    h.update(language.encode())
    h.update(b":")
    h.update(name.encode())
    if image_bytes:
        h.update(b":")
        h.update(hashlib.sha256(image_bytes).digest())
    return h.hexdigest()


async def tell_story(
    name_ko: str,
    language: str = "en",
    image_bytes: Optional[bytes] = None,
) -> DishStory:
    """LLM-driven cultural narrative for a dish, optionally grounded by a photo."""
    lang_label = LANG_LABEL.get(language, "English")
    key = _cache_key(name_ko, language, image_bytes)
    if key in _STORY_CACHE:
        return _STORY_CACHE[key]

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not configured")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(GEMINI_STORY_MODEL)

    prompt = _PROMPT.replace("{lang}", lang_label)
    user_msg = f"Dish: {name_ko}\nUser's UI language: {lang_label}"
    parts: list = [prompt, user_msg]
    if image_bytes:
        parts.append({"mime_type": "image/jpeg", "data": image_bytes})

    resp = await asyncio.wait_for(
        asyncio.to_thread(
            model.generate_content,
            parts,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.4,
            },
        ),
        timeout=25.0,
    )
    raw = (resp.text or "").strip()
    # Tolerant parse — strip stray fences if model misbehaves.
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            raise RuntimeError(f"Storyteller produced no JSON. Snippet: {raw[:200]}")
        data = json.loads(m.group(0))

    story = DishStory(**data)
    _STORY_CACHE[key] = story
    return story


if __name__ == "__main__":
    async def _demo():
        for name in ("순대국", "비빔밥", "냉면"):
            s = await tell_story(name, language="en")
            print(f"\n--- {name} ---")
            print(s.model_dump_json(indent=2, exclude_none=True))
    asyncio.run(_demo())
