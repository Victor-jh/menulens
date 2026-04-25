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
from backend.agents.price_sentinel import judge_price, PriceJudgment
from backend.agents.verdict import decide, UserProfile, VerdictResult
from backend.agents.tts import synthesize, order_phrase, TTSResult


# --- validation constants (P0.4 audit) ------------------------------------
MAX_MENU_ITEMS = 50          # reject absurd menus before any LLM call
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
    price_task = judge_price(name, price) if price is not None else None
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

    # P0.3: cost guard — cap item count and TTS generation.
    items_in = menu_result.items
    if len(items_in) > MAX_MENU_ITEMS:
        raise HTTPException(
            413,
            f"Menu has {len(items_in)} items; max {MAX_MENU_ITEMS} per request.",
        )

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
        ))

    warnings = list(menu_result.warnings)
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.api.main:app",
        host="0.0.0.0",
        port=int(os.getenv("APP_PORT", "8000")),
        reload=True,
    )
