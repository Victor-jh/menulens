"""
MenuLens FastAPI — Main entrypoint

Endpoints:
    POST /analyze  — Upload menu image + user profile → full analysis
    GET  /health   — Service health
    GET  /         — API info

References:
- ROADMAP.md D6: FastAPI integration
"""
from __future__ import annotations

import asyncio
import os
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Local imports (relative)
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.agents.menu_reader import read_menu, MenuReadResult
from backend.agents.price_sentinel import judge_price, PriceJudgment


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


class UserProfile(BaseModel):
    language: str = "en"
    allergies: list[str] = []  # e.g., ["pork", "peanut"]
    religion: Optional[str] = None  # "halal" | "kosher" | None
    diet: Optional[str] = None  # "vegan" | "vegetarian" | None


class AnalyzedItem(BaseModel):
    name: str
    translated: Optional[str] = None
    listed_price: Optional[int] = None
    color: str  # "🟢" | "🟡" | "🔴" | "⚪"
    price_judgment: Optional[PriceJudgment] = None
    reasons: list[str] = []
    pronunciation: Optional[str] = None


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


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_menu_endpoint(
    image: UploadFile = File(..., description="Menu board image (JPEG/PNG)"),
    language: str = Form("en"),
    allergies: str = Form("", description="Comma-separated, e.g., pork,peanut"),
):
    """
    메뉴판 이미지 업로드 → 3 에이전트 실행 → 색깔 판정 응답.
    """
    import time
    start = time.time()
    
    # Validate
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(400, "Image file required")
    
    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(413, "Image too large (max 10MB)")
    
    # Profile
    profile = UserProfile(
        language=language,
        allergies=[a.strip() for a in allergies.split(",") if a.strip()],
    )
    
    # Agent 1: Menu Reader
    try:
        menu_result: MenuReadResult = await read_menu(image_bytes, image.filename or "upload.jpg")
    except RuntimeError as e:
        raise HTTPException(500, f"Menu reading failed: {e}")
    
    # Agents 2 & 3: parallel per item
    # TODO(D6): call dish_profiler (D3) once implemented
    price_tasks = [
        judge_price(item.name, item.price) if item.price else None
        for item in menu_result.items
    ]
    price_results = await asyncio.gather(*[t for t in price_tasks if t])
    price_map = {r.dish_name: r for r in price_results}
    
    # Merge
    analyzed_items = []
    for item in menu_result.items:
        pj = price_map.get(item.name) if item.price else None
        color = pj.verdict.value if pj else "⚪"
        
        reasons = []
        if pj and pj.benchmark_price:
            reasons.append(pj.explanation)
        
        # TODO(D5): apply allergy filter → may override color to 🔴
        
        analyzed_items.append(AnalyzedItem(
            name=item.name,
            translated=None,  # TODO D3
            listed_price=item.price,
            color=color,
            price_judgment=pj,
            reasons=reasons,
        ))
    
    elapsed = time.time() - start
    
    return AnalyzeResponse(
        items=analyzed_items,
        ocr_quality=menu_result.ocr_quality,
        warnings=menu_result.warnings,
        processing_time_seconds=round(elapsed, 2),
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("APP_PORT", "8000")),
        reload=True,
    )
