"""
MenuLens FastAPI — Main entrypoint.

Endpoints:
    POST /analyze  — Upload menu image + user profile → full analysis
    GET  /health   — Service health
    GET  /         — API info

References:
- ROADMAP D6: FastAPI integration (D5 verdict 통합 포함)
"""
from __future__ import annotations

import asyncio
import os
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


app = FastAPI(
    title="MenuLens API",
    version="0.1.0-poc",
    description="한국 식당 메뉴판을 읽고 바가지·알레르기·문화를 판정하는 AI 어시스턴트",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # PoC only. Tighten for production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        "version": "0.1.0-poc",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "gemini_key": bool(os.getenv("GEMINI_API_KEY")),
        "anthropic_key": bool(os.getenv("ANTHROPIC_API_KEY")),
        "supabase_url": bool(os.getenv("SUPABASE_URL")),
    }


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


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_menu_endpoint(
    image: UploadFile = File(..., description="Menu board image (JPEG/PNG)"),
    language: str = Form("en"),
    allergies: str = Form("", description="Comma-separated: pork,peanut"),
    religion: str = Form("", description="halal | kosher | (empty)"),
    diet: str = Form("", description="vegan | vegetarian | (empty)"),
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

    profile = UserProfile(
        language=language,
        allergies=[a.strip() for a in allergies.split(",") if a.strip()],
        religion=religion or None,
        diet=diet or None,
    )

    try:
        menu_result: MenuReadResult = await read_menu(image_bytes, image.filename or "upload.jpg")
    except RuntimeError as e:
        raise HTTPException(500, f"Menu reading failed: {e}")

    # 모든 메뉴를 병렬 처리 (dish + price + tts + verdict)
    results = await asyncio.gather(*[
        _analyze_one(item.name, item.price, profile)
        for item in menu_result.items
    ])

    analyzed_items = []
    for item, (dish_profile, price_judgment, verdict, tts) in zip(menu_result.items, results):
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

    return AnalyzeResponse(
        items=analyzed_items,
        ocr_quality=menu_result.ocr_quality,
        warnings=menu_result.warnings,
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
