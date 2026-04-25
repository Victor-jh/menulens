"""
MenuLens FastAPI — Main entrypoint.

Endpoints:
    POST /analyze  — Upload menu image + user profile → full analysis
    GET  /health   — Service health (credential-safe)
    GET  /         — API info

Security hardening (2026-04-25 P0 audit):
- CORS: whitelist origins via CORS_ORIGINS env var (comma-separated)
- /health: no credential presence leakage
- /analyze: input validation (language/allergies/diet/religion), size caps
- TTS: top-N cap to prevent cost runaway

References:
- ROADMAP D6 integration, D7 Hard Gate, D8 P0 audit fixes
- AGENTS.md §4 cost guardrails
"""
from __future__ import annotations

import asyncio
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_REPO_ROOT))
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_REPO_ROOT / "backend" / ".env")

from backend.agents.menu_reader import read_menu, MenuReadResult
from backend.agents.dish_profiler import profile_dish, DishProfile
from backend.agents.price_sentinel import judge_price, lookup_benchmark, PriceJudgment
from backend.agents.verdict import decide, UserProfile, VerdictResult
from backend.agents.tts import synthesize, order_phrase, TTSResult
from backend.agents.dish_storyteller import tell_story, DishStory
from backend.agents.fx import krw_to, ccy_for_language
from backend.agents.reviews import (
    ReviewIn,
    ReviewOut,
    RewardResult,
    submit_review,
    list_recent_reviews,
)


# --- validation constants (P0.4 audit) ------------------------------------
MAX_MENU_ITEMS = 80          # 분식점/한정식 대응 (Korean diner menus often 50-80 items)
MAX_ALLERGIES = 20
MAX_DISH_NAME_LEN = 120
MAX_TTS_ITEMS = 30           # cap parallel TTS to protect Gemini quota
ALLOWED_LANGUAGES = {"en", "ko", "ja", "zh-Hans", "zh-Hant"}
ALLOWED_RELIGIONS = {"", "halal", "kosher"}
ALLOWED_DIETS = {"", "vegan", "vegetarian"}
# Strict allergen allowlist (verdict.py ALLERGENS_14 + a small stable set)
ALLOWED_ALLERGENS = {
    "pork", "beef", "chicken", "seafood", "fish", "shellfish",
    "egg", "dairy", "gluten", "soy", "nuts", "peanut", "sesame", "alcohol",
}

# Dish name: Korean / CJK / Latin / digits / whitespace / minimal punctuation.
# Prevents exotic unicode escape attempts from OCR spoofing.
_DISH_NAME_OK = re.compile(r"^[\w가-힣一-龥ぁ-んァ-ン0-9\s\-·()()&,.\[\]]+$")


# --- CORS (P0.1 audit) -----------------------------------------------------
def _cors_origins() -> list[str]:
    """
    CORS_ORIGINS env: comma-separated whitelist.
    Default: only localhost:3000 (dev). In production, set explicitly.
    "*" still allowed but warns (PoC escape hatch).
    """
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return origins or ["http://localhost:3000"]


app = FastAPI(
    title="MenuLens API",
    version="0.1.1-poc",
    description="한국 식당 메뉴판을 읽고 바가지·알레르기·문화를 판정하는 AI 어시스턴트",
)

_origins = _cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    # credentials only when explicit origin list (not "*") — same-site safe
    allow_credentials="*" not in _origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "X-Requested-With"],
    max_age=600,
)


class AnalyzedItem(BaseModel):
    name: str
    translated: Optional[str] = None
    romanization: Optional[str] = None
    listed_price: Optional[int] = None
    color: str  # 🟢 | 🟡 | 🔴 | ⚪
    reasons: list[str] = []
    trigger_flags: list[str] = []
    order_phrase: Optional[str] = None
    tts_audio_b64: Optional[str] = None
    tts_audio_mime: Optional[str] = None
    tts_cached: bool = False
    dish_profile: Optional[DishProfile] = None
    price_judgment: Optional[PriceJudgment] = None
    source: str = "menu_text"
    item_type: str = "menu_item"
    free_side_likely: bool = False


class AnalyzeResponse(BaseModel):
    items: list[AnalyzedItem]
    ocr_quality: float
    warnings: list[str] = []
    processing_time_seconds: float


@app.get("/")
async def root():
    return {
        "service": "MenuLens",
        "version": app.version,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    # P0.2: no credential presence leakage — generic OK only.
    return {"status": "ok", "version": app.version}


async def _analyze_one(
    name: str,
    price: Optional[int],
    profile: UserProfile,
    include_tts: bool = True,
) -> tuple[DishProfile, Optional[PriceJudgment], VerdictResult, Optional[TTSResult]]:
    """한 메뉴에 대해 dish_profiler + price_sentinel + TTS + verdict 병렬 실행."""
    dish_task = profile_dish(name, user_language=profile.language, user_allergies=profile.allergies)
    # Listed price → judge against benchmark. No price (photo mode) → benchmark-only lookup.
    if price is not None:
        price_task = judge_price(name, price)
    else:
        price_task = lookup_benchmark(name)
    phrase = order_phrase(name)
    tts_task = synthesize(phrase) if include_tts else None

    tasks = [dish_task]
    if price_task:
        tasks.append(price_task)
    if tts_task:
        tasks.append(tts_task)

    results = await asyncio.gather(*tasks, return_exceptions=True)

    dish_profile = results[0] if not isinstance(results[0], Exception) else None
    idx = 1
    price_judgment = None
    if price_task:
        price_judgment = results[idx] if not isinstance(results[idx], Exception) else None
        idx += 1
    tts_result: Optional[TTSResult] = None
    if tts_task:
        tts_result = results[idx] if not isinstance(results[idx], Exception) else None

    if dish_profile is None:
        # 메뉴 처리 실패 — 최소 응답
        from backend.agents.dish_profiler import DishProfile as DP
        dish_profile = DP(name_ko=name, name_translated=name, description="(profile failed)", source="unknown")

    verdict = decide(dish_profile, price_judgment, profile)
    return dish_profile, price_judgment, verdict, tts_result


def _sanitize_profile_inputs(
    language: str, allergies: str, religion: str, diet: str
) -> UserProfile:
    """P0.4: validate and normalize profile form fields."""
    if language not in ALLOWED_LANGUAGES:
        raise HTTPException(400, f"Unsupported language: {language}")
    if religion not in ALLOWED_RELIGIONS:
        raise HTTPException(400, f"Unsupported religion: {religion}")
    if diet not in ALLOWED_DIETS:
        raise HTTPException(400, f"Unsupported diet: {diet}")

    tokens = [a.strip().lower() for a in allergies.split(",") if a.strip()]
    if len(tokens) > MAX_ALLERGIES:
        raise HTTPException(400, f"Too many allergies (max {MAX_ALLERGIES})")
    unknown = [t for t in tokens if t not in ALLOWED_ALLERGENS]
    if unknown:
        raise HTTPException(400, f"Unknown allergen(s): {unknown[:3]}")

    return UserProfile(
        language=language,
        allergies=tokens,
        religion=religion or None,
        diet=diet or None,
    )


def _valid_dish_name(name: str) -> bool:
    if not name or len(name) > MAX_DISH_NAME_LEN:
        return False
    return bool(_DISH_NAME_OK.match(name))


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_menu_endpoint(
    image: UploadFile = File(..., description="Menu board image (JPEG/PNG)"),
    language: str = Form("en"),
    allergies: str = Form("", description="Comma-separated allergen keys"),
    religion: str = Form(""),
    diet: str = Form(""),
):
    """
    메뉴판 이미지 업로드 → 3 에이전트 + verdict → 색깔 판정 응답.
    """
    start = time.time()

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(400, "Image file required")
    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(413, "Image too large (max 10MB)")

    profile = _sanitize_profile_inputs(language, allergies, religion, diet)

    try:
        menu_result: MenuReadResult = await read_menu(image_bytes, image.filename or "upload.jpg")
    except RuntimeError as e:
        raise HTTPException(502, f"Menu reading failed: {e}")

    # P0.3: cost guard — soft truncate large menus instead of rejecting.
    items_in = menu_result.items
    truncated_from: Optional[int] = None
    if len(items_in) > MAX_MENU_ITEMS:
        truncated_from = len(items_in)
        items_in = items_in[:MAX_MENU_ITEMS]

    # Filter invalid dish names (possible OCR junk or adversarial input)
    filtered = [it for it in items_in if _valid_dish_name(it.name)]
    dropped = len(items_in) - len(filtered)

    # TTS only for the first N items (user can regenerate others on demand later)
    tts_decisions = [i < MAX_TTS_ITEMS for i in range(len(filtered))]

    results = await asyncio.gather(*[
        _analyze_one(item.name, item.price, profile, include_tts=use_tts)
        for item, use_tts in zip(filtered, tts_decisions)
    ])

    analyzed_items: list[AnalyzedItem] = []
    for item, (dish_profile, price_judgment, verdict, tts) in zip(filtered, results):
        analyzed_items.append(AnalyzedItem(
            name=item.name,
            translated=dish_profile.name_translated,
            romanization=dish_profile.romanization,
            listed_price=item.price,
            color=verdict.color.value,
            reasons=verdict.reasons,
            trigger_flags=verdict.trigger_flags,
            order_phrase=tts.text if tts else None,
            tts_audio_b64=tts.audio_b64 if tts else None,
            tts_audio_mime=tts.audio_mime if tts else None,
            tts_cached=tts.cached if tts else False,
            dish_profile=dish_profile,
            price_judgment=price_judgment,
            source=getattr(item, "source", "menu_text"),
            item_type=getattr(item, "item_type", "menu_item"),
            free_side_likely=getattr(item, "free_side_likely", False),
        ))

    warnings = list(menu_result.warnings)
    if truncated_from:
        warnings.append(
            f"메뉴가 많아서 상위 {MAX_MENU_ITEMS}개만 분석했어요 (전체 {truncated_from}개 인식). "
            f"메뉴판을 두세 부분으로 나눠 다시 찍으면 모두 분석할 수 있어요."
        )
    if dropped:
        warnings.append(f"Dropped {dropped} items with invalid names (likely OCR noise).")
    if len(filtered) > MAX_TTS_ITEMS:
        warnings.append(f"TTS generated for first {MAX_TTS_ITEMS} items only.")

    return AnalyzeResponse(
        items=analyzed_items,
        ocr_quality=menu_result.ocr_quality,
        warnings=warnings,
        processing_time_seconds=round(time.time() - start, 2),
    )


@app.get("/fx")
async def fx_endpoint(
    krw: int,
    target: Optional[str] = None,
    language: str = "en",
):
    """Convert KRW to a user-friendly currency (frankfurter.app, 6h cache)."""
    if krw < 0 or krw > 10_000_000:
        raise HTTPException(400, "krw out of range (0~10,000,000)")
    ccy = (target or ccy_for_language(language) or "USD").upper()
    out = await krw_to(krw, ccy)
    if out is None:
        raise HTTPException(502, f"Failed to fetch FX rate for {ccy}")
    return out


class TTSRequest(BaseModel):
    text: str
    voice: str = "Kore"
    language: str = "ko"


class TTSResponse(BaseModel):
    text: str
    audio_b64: str
    audio_mime: str = "audio/wav"
    cached: bool = False


@app.post("/tts", response_model=TTSResponse)
async def tts_endpoint(req: TTSRequest):
    """Generate speech audio for an arbitrary phrase (used for combined order phrases)."""
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(400, "text is required")
    if len(text) > 400:
        raise HTTPException(413, "text too long (max 400 chars)")
    try:
        out = await synthesize(text, voice=req.voice or "Kore", language=req.language or "ko")
    except Exception as e:
        msg = str(e)
        # Surface quota/rate-limit clearly so the client can fall back gracefully
        if "429" in msg or "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower():
            raise HTTPException(
                429,
                "TTS quota reached. Korean text on the screen still works — show your phone to the staff.",
            )
        raise HTTPException(502, f"TTS failed: {msg[:160]}")
    return TTSResponse(
        text=out.text,
        audio_b64=out.audio_b64,
        audio_mime=out.audio_mime,
        cached=out.cached,
    )


class ReviewSubmitResponse(BaseModel):
    review: ReviewOut
    reward: RewardResult


@app.post("/reviews", response_model=ReviewSubmitResponse)
async def submit_review_endpoint(payload: ReviewIn):
    """외국인 한식 리뷰 + 즉시 룰렛 보상 (PoC: code only)."""
    if payload.rating < 1 or payload.rating > 5:
        raise HTTPException(400, "rating must be 1..5")
    if payload.language not in ALLOWED_LANGUAGES:
        raise HTTPException(400, f"Unsupported language: {payload.language}")
    if payload.comment and len(payload.comment) > 1500:
        raise HTTPException(413, "comment too long (max 1500 chars)")
    try:
        review, reward = await submit_review(payload)
    except Exception as e:
        raise HTTPException(502, f"Review submit failed: {e}")
    return ReviewSubmitResponse(review=review, reward=reward)


@app.get("/reviews/recent")
async def reviews_recent(limit: int = 20):
    if limit < 1 or limit > 100:
        raise HTTPException(400, "limit 1..100")
    return await list_recent_reviews(limit)


@app.post("/story", response_model=DishStory)
async def story_endpoint(
    name_ko: str = Form(..., description="메뉴명 (한국어)"),
    language: str = Form("en"),
    image: Optional[UploadFile] = File(None),
):
    """
    Lazy-loaded LLM enrichment for a single dish.
    Returns cultural context, typical ingredients, regional variants, optional photo-based region inference.
    """
    if language not in ALLOWED_LANGUAGES:
        raise HTTPException(400, f"Unsupported language: {language}")
    if not _valid_dish_name(name_ko):
        raise HTTPException(400, "Invalid dish name")

    img_bytes: Optional[bytes] = None
    if image is not None:
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(400, "Image must be an image MIME type")
        raw = await image.read()
        if len(raw) > 10 * 1024 * 1024:
            raise HTTPException(413, "Image too large (max 10MB)")
        img_bytes = raw

    try:
        return await tell_story(name_ko=name_ko, language=language, image_bytes=img_bytes)
    except RuntimeError as e:
        raise HTTPException(502, f"Storyteller failed: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.api.main:app",
        host="0.0.0.0",
        port=int(os.getenv("APP_PORT", "8000")),
        reload=True,
    )
