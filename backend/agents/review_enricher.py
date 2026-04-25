"""
LLM enrichment of foreigner Korean-food reviews:
  - sentiment 분류 (positive/mixed/negative/neutral)
  - aspects (taste/price/portion/service/spice/freshness/atmosphere/value 등)
  - themes (recommend/must_try/avoid/hidden_gem/tourist_trap 등)
  - 4개 언어 번역 (ko/en/ja/zh-Hans)
  - Threads-ready 한국어 친근체 카피

데이터 자산 활용 (제안서 어필):
- 외국인 한식 만족도 raw → 한국관광공사 외국인 마케팅 공략 자료
- 한국 식당이 외국인 시선 즉시 확인
- 한식진흥원 메뉴 글로벌화 우선순위 데이터
"""
from __future__ import annotations

import asyncio
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


ALLOWED_SENTIMENTS = {"positive", "mixed", "negative", "neutral"}
ALLOWED_ASPECTS = {
    "taste", "price", "portion", "service", "spice", "freshness",
    "atmosphere", "value", "presentation", "uniqueness", "language",
}
ALLOWED_THEMES = {
    "recommend", "must_try", "avoid", "hidden_gem", "tourist_trap",
    "first_timer_friendly", "vegan_ok", "halal_ok", "kid_ok", "instagrammable",
}


class ReviewEnrichment(BaseModel):
    sentiment: str = "neutral"
    aspects: list[str] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)
    recommend: bool = False
    comment_ko: Optional[str] = None
    comment_en: Optional[str] = None
    comment_ja: Optional[str] = None
    comment_zh: Optional[str] = None
    threads_text: Optional[str] = None  # Korean Threads-ready friendly post


PROMPT = """You analyze a single foreigner-written review of a Korean dish and return STRUCTURED JSON ONLY.

Inputs:
  dish_name (Korean): {dish_name}
  dish_name_en (optional): {dish_name_en}
  rating: {rating} / 5
  source_language: {source_lang}
  raw_comment: {raw_comment}

Return EXACTLY this shape:
{{
  "sentiment": "positive|mixed|negative|neutral",
  "aspects":  ["taste","price","portion","service","spice","freshness","atmosphere","value","presentation","uniqueness","language"],   // 0~5 picks
  "themes":   ["recommend","must_try","avoid","hidden_gem","tourist_trap","first_timer_friendly","vegan_ok","halal_ok","kid_ok","instagrammable"],   // 0~3 picks
  "recommend": true|false,
  "comment_ko": "...",
  "comment_en": "...",
  "comment_ja": "...",
  "comment_zh": "...",
  "threads_text": "..."
}}

Rules:
1. sentiment: derive from rating + tone. rating>=4 + positive tone → positive. rating<=2 + negative tone → negative. mixed signals → mixed. empty/neutral → neutral.
2. aspects: pick from the closed list above based on what the review actually mentions. NEVER invent new ones.
3. themes: pick from closed list. recommend=true if rating>=4 and tone is positive.
4. translations (ko/en/ja/zh): translate raw_comment naturally to that language, max 2 sentences. If raw_comment is empty, generate a 1-line summary like "5/5 — really enjoyed [dish_name_en]" in each language.
5. threads_text: a friendly Korean Threads post, 80~140 chars, hashtags 2~4. Speak as the foreigner reviewer. Examples:
   "🇫🇷 프랑스에서 온 마르코예요. 김치찌개 진짜 맛있었어요! 매콤하지만 중독돼요 🌶 #한식 #김치찌개 #서울맛집"
   "🇯🇵 東京から来たハナです 비빔밥 정말 예뻐요 🥗 색깔이 무지개 같고 고추장 양념 최고! #비빔밥 #한식문화"
6. Output ONE JSON object, no markdown, no preamble, no comments.
"""


def _country_emoji(country_iso: Optional[str]) -> str:
    if not country_iso or len(country_iso) != 2:
        return "🌏"
    base = 127462  # 'A' regional indicator
    a = country_iso.upper()
    return chr(base + (ord(a[0]) - 65)) + chr(base + (ord(a[1]) - 65))


async def enrich(
    dish_name: str,
    dish_name_en: Optional[str],
    rating: int,
    raw_comment: Optional[str],
    source_lang: str = "en",
    visitor_country: Optional[str] = None,
) -> ReviewEnrichment:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return ReviewEnrichment()  # no enrichment available
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash")

    prompt = PROMPT.format(
        dish_name=dish_name,
        dish_name_en=dish_name_en or "(unknown)",
        rating=rating,
        source_lang=source_lang,
        raw_comment=(raw_comment or "(empty)")[:1500],
    )

    try:
        resp = await asyncio.wait_for(
            asyncio.to_thread(
                model.generate_content,
                prompt,
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.3,
                },
            ),
            timeout=15.0,
        )
    except Exception:
        return ReviewEnrichment()

    raw = (resp.text or "").strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw)
    try:
        data = json.loads(raw)
    except Exception:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            return ReviewEnrichment()
        try:
            data = json.loads(m.group(0))
        except Exception:
            return ReviewEnrichment()

    # Sanitise
    sentiment = data.get("sentiment", "neutral")
    if sentiment not in ALLOWED_SENTIMENTS:
        sentiment = "neutral"
    aspects = [a for a in (data.get("aspects") or []) if a in ALLOWED_ASPECTS][:5]
    themes = [t for t in (data.get("themes") or []) if t in ALLOWED_THEMES][:3]

    threads_text = data.get("threads_text")
    if threads_text and visitor_country:
        # Prepend country flag if model didn't already include one
        if not any(ch for ch in threads_text[:4] if ord(ch) > 127000):
            threads_text = f"{_country_emoji(visitor_country)} {threads_text}"

    return ReviewEnrichment(
        sentiment=sentiment,
        aspects=aspects,
        themes=themes,
        recommend=bool(data.get("recommend", False)),
        comment_ko=data.get("comment_ko"),
        comment_en=data.get("comment_en"),
        comment_ja=data.get("comment_ja"),
        comment_zh=data.get("comment_zh"),
        threads_text=threads_text,
    )
