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
from backend.agents import tour_api as _tour_api
from backend.agents import tour_lod as _tour_lod
from backend.agents import dish_finder as _dish_finder
from backend.agents.image_classifier import classify_image, ImageClassification


# --- validation constants (P0.4 audit) ------------------------------------
MAX_MENU_ITEMS = 80          # 분식점/한정식 대응 (Korean diner menus often 50-80 items)
MAX_ALLERGIES = 20
MAX_DISH_NAME_LEN = 120
MAX_TTS_ITEMS = 30           # cap parallel TTS to protect Gemini quota
ALLOWED_LANGUAGES = {"en", "ko", "ja", "zh-Hans", "zh-Hant"}
ALLOWED_RELIGIONS = {"", "halal", "kosher"}
ALLOWED_DIETS = {"", "vegan", "vegetarian", "pescatarian"}
# Strict allergen allowlist (verdict.py ALLERGENS_14 + a small stable set)
ALLOWED_ALLERGENS = {
    "pork", "beef", "chicken", "seafood", "fish", "shellfish",
    "egg", "dairy", "gluten", "soy", "nuts", "peanut", "sesame", "alcohol",
}

# Dish name: Korean / CJK / Latin / digits / whitespace / minimal punctuation.
# Prevents exotic unicode escape attempts from OCR spoofing.
_DISH_NAME_OK = re.compile(r"^[\w가-힣一-龥ぁ-んァ-ン0-9\s\-·()()&,.\[\]]+$")


# --- CORS (P0.1 audit + D8 wildcard support) ------------------------------
def _cors_origins_config() -> dict:
    """
    CORS_ORIGINS env: comma-separated whitelist. Items containing '*' are
    treated as glob patterns and compiled into allow_origin_regex.
    Examples:
        http://localhost:3000
        https://menulens.vercel.app                ← Vercel production
        https://menulens-*.vercel.app              ← Vercel preview deployments
        https://menulens-*-victor-jh.vercel.app    ← branch previews
    Each '*' matches one DNS label segment ([^.]+), not arbitrary text.
    """
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    parts = [o.strip() for o in raw.split(",") if o.strip()]
    exact: list[str] = []
    patterns: list[str] = []
    for p in parts:
        if "*" in p:
            patterns.append(re.escape(p).replace(r"\*", "[^.]+"))
        else:
            exact.append(p)
    if not exact and not patterns:
        exact = ["http://localhost:3000"]
    return {
        "allow_origins": exact,
        "allow_origin_regex": ("^(" + "|".join(patterns) + ")$") if patterns else None,
        "allow_credentials": "*" not in exact,
    }


app = FastAPI(
    title="MenuLens API",
    version="0.1.1-poc",
    description="한국 식당 메뉴판을 읽고 바가지·알레르기·문화를 판정하는 AI 어시스턴트",
)

_cors_cfg = _cors_origins_config()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_cfg["allow_origins"],
    allow_origin_regex=_cors_cfg["allow_origin_regex"],
    allow_credentials=_cors_cfg["allow_credentials"],
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
    # Hermes router classification (D11 P1):
    #   "menu"              — printed menu list (default)
    #   "single_dish"       — one cooked dish photo (no menu)
    #   "table_with_dishes" — multiple dishes on a table (no menu)
    #   "not_food"          — receipt / sign / random image
    image_kind: str = "menu"
    image_kind_confidence: float = 0.0
    main_dish_ko: Optional[str] = None
    detected_dishes_ko: Optional[list[str]] = None


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


_ALLOWED_MODES = {"", "auto", "text", "photo"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_menu_endpoint(
    image: UploadFile = File(..., description="Menu board image (JPEG/PNG)"),
    language: str = Form("en"),
    allergies: str = Form("", description="Comma-separated allergen keys"),
    religion: str = Form(""),
    diet: str = Form(""),
    mode: str = Form("auto", description="auto | text (메뉴판 강제) | photo (사진 강제)"),
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

    if mode not in _ALLOWED_MODES:
        raise HTTPException(400, f"mode must be one of {sorted(_ALLOWED_MODES)}")
    force_mode = mode if mode in ("text", "photo") else None

    # ── Hermes router ──────────────────────────────────────────────────
    # Run the image classifier in PARALLEL with menu_reader. The router's
    # output is advisory — menu_reader is the source of truth for whether
    # a parseable menu was actually present. This keeps menu cases zero-cost
    # latency-wise (both calls run concurrently) and lets the dispatcher
    # combine signals at the end:
    #   - menu_reader returned ≥3 items → "menu" (regardless of classifier)
    #   - menu_reader returned 0 items + classifier says single_dish → identify dish
    #   - menu_reader returned 0 items + classifier says not_food (high conf)
    #     → friendly NOT_A_MENU rejection (no dish identification attempted)
    classifier_task = asyncio.create_task(
        classify_image(image_bytes, image.content_type or "image/jpeg")
    )
    try:
        menu_result: MenuReadResult = await read_menu(
            image_bytes,
            image.filename or "upload.jpg",
            force_mode=force_mode,
        )
    except RuntimeError as e:
        # Cancel the classifier so we don't leak a half-finished call.
        classifier_task.cancel()
        raise HTTPException(502, f"Menu reading failed: {e}")
    classifier: ImageClassification = await classifier_task

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

    # Combine menu_reader truth with classifier hint to pick a single
    # image_kind for the frontend. The frontend uses this to vary the
    # Results header copy ("X of N dishes safe" vs "이 음식: 안전 ✓").
    if len(analyzed_items) >= 3:
        # Plenty of menu items → definitely a menu, regardless of classifier.
        final_kind = "menu"
    elif len(analyzed_items) == 0:
        # No items: classifier decides. not_food rejection takes precedence
        # (the frontend already short-circuits this via warnings:["not_a_menu"]).
        final_kind = (
            classifier.kind if classifier.confidence >= 0.7 else "menu"
        )
        if classifier.kind == "not_food" and classifier.confidence >= 0.85:
            warnings.append("not_a_menu")
    else:
        # 1-2 items found. Trust classifier if it strongly disagrees with
        # "menu", else default to menu mode.
        if (
            classifier.kind in ("single_dish", "table_with_dishes")
            and classifier.confidence >= 0.85
        ):
            final_kind = classifier.kind
        else:
            final_kind = "menu"

    return AnalyzeResponse(
        items=analyzed_items,
        ocr_quality=menu_result.ocr_quality,
        warnings=warnings,
        processing_time_seconds=round(time.time() - start, 2),
        image_kind=final_kind,
        image_kind_confidence=classifier.confidence,
        main_dish_ko=classifier.main_dish_ko,
        detected_dishes_ko=classifier.detected_dishes_ko,
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


class NearbyRestaurantOut(BaseModel):
    content_id: str
    title: str
    addr: str
    addr_detail: Optional[str] = None
    mapx: Optional[float] = None
    mapy: Optional[float] = None
    distance_m: Optional[int] = None
    first_image: Optional[str] = None
    first_image_thumbnail: Optional[str] = None
    tel: Optional[str] = None
    cat3: Optional[str] = None


class NearbyResponse(BaseModel):
    status: str  # ok | missing_key | upstream_error | no_results
    source: str = "lod"  # "lod" | "openapi"
    items: list[NearbyRestaurantOut] = []
    total_count: int = 0
    message: Optional[str] = None
    language_used: str = "en"
    radius_m: int = 0
    center_lat: float
    center_lon: float


class RestaurantDetailOut(BaseModel):
    content_id: str
    operating_hours: Optional[str] = None
    rest_date: Optional[str] = None
    info_center: Optional[str] = None
    parking: Optional[str] = None
    seat: Optional[str] = None
    first_menu: Optional[str] = None
    signature_menu: Optional[str] = None
    smoking: Optional[str] = None
    reservation: Optional[str] = None


# Korean peninsula bounding box (33~39N, 124~132E) — covers Jeju to Dokdo.
_LAT_MIN, _LAT_MAX = 33.0, 39.0
_LON_MIN, _LON_MAX = 124.0, 132.0


_ALLOWED_SOURCES = {"lod", "openapi", "auto"}


def _to_nearby_out(items) -> list[NearbyRestaurantOut]:
    return [
        NearbyRestaurantOut(
            content_id=r.content_id,
            title=r.title,
            addr=r.addr,
            addr_detail=r.addr_detail,
            mapx=r.mapx,
            mapy=r.mapy,
            distance_m=r.distance_m,
            first_image=r.first_image,
            first_image_thumbnail=r.first_image_thumbnail,
            tel=r.tel,
            cat3=r.cat3,
        )
        for r in items
    ]


@app.get("/restaurants/nearby", response_model=NearbyResponse)
async def restaurants_nearby_endpoint(
    lat: float,
    lon: float,
    radius: int = 500,
    language: str = "en",
    limit: int = 10,
    source: str = "auto",
):
    """
    Restaurants within `radius` of (lat, lon).

    Two sources, swappable via `source`:
      - "lod"     LOD SPARQL endpoint (no key, rich metadata, KO-only labels)
      - "openapi" KorService2 locationBasedList2 (multilingual, needs serviceKey)
      - "auto"    LOD first; on miss + valid OpenAPI key, fall back to OpenAPI

    LOD is the default for "auto" because it's always reachable and ships
    photos + opening hours + signature menu inline (richer than KorService2).
    """
    if language not in ALLOWED_LANGUAGES:
        raise HTTPException(400, f"Unsupported language: {language}")
    if source not in _ALLOWED_SOURCES:
        raise HTTPException(400, f"source must be one of {sorted(_ALLOWED_SOURCES)}")
    if not (_LAT_MIN <= lat <= _LAT_MAX) or not (_LON_MIN <= lon <= _LON_MAX):
        raise HTTPException(400, "Coordinates outside Korea bounding box")
    if radius < 100 or radius > 20000:
        raise HTTPException(400, "radius must be in [100, 20000]")
    if limit < 1 or limit > 30:
        raise HTTPException(400, "limit must be in [1, 30]")

    used_source = "lod"
    if source == "openapi":
        result = await _tour_api.search_nearby_restaurants(
            lat=lat, lon=lon, radius=radius, language=language, num_of_rows=limit
        )
        used_source = "openapi"
    elif source == "lod":
        result = await _tour_lod.search_nearby_via_lod(
            lat=lat, lon=lon, radius=radius, language=language, num_of_rows=limit
        )
    else:  # auto
        result = await _tour_lod.search_nearby_via_lod(
            lat=lat, lon=lon, radius=radius, language=language, num_of_rows=limit
        )
        if result.status != "ok":
            api_result = await _tour_api.search_nearby_restaurants(
                lat=lat, lon=lon, radius=radius, language=language, num_of_rows=limit
            )
            if api_result.status == "ok":
                result = api_result
                used_source = "openapi"

    return NearbyResponse(
        status=result.status,
        source=used_source,
        items=_to_nearby_out(result.items),
        total_count=result.total_count,
        message=result.message,
        language_used=result.language_used,
        radius_m=result.radius_m,
        center_lat=lat,
        center_lon=lon,
    )


class DishFinderRestaurantOut(BaseModel):
    content_id: str
    title: str
    addr: Optional[str] = None
    mapx: Optional[float] = None
    mapy: Optional[float] = None
    distance_m: Optional[int] = None
    first_image: Optional[str] = None
    first_image_thumbnail: Optional[str] = None
    tel: Optional[str] = None
    cat3: Optional[str] = None
    best_menu: Optional[str] = None


class DishFinderResponse(BaseModel):
    status: str  # ok | no_results | upstream_error | missing_input
    items: list[DishFinderRestaurantOut] = []
    total_count: int = 0
    message: Optional[str] = None
    dish_ko_used: Optional[str] = None
    language_used: Optional[str] = None


_DISH_NAME_KO_RE = re.compile(r"^[\w가-힣一-龥0-9\s\-·()()&,.\[\]]+$")


@app.get("/restaurants/by_dish", response_model=DishFinderResponse)
async def restaurants_by_dish_endpoint(
    dish_ko: str,
    language: str = "en",
    limit: int = 10,
    user_lat: Optional[float] = None,
    user_lon: Optional[float] = None,
):
    """
    LOD ktop:bestMenu 역방향 — 특정 음식을 시그니처로 등록한 식당 list.
    Used by Hermes Phase 2 single_dish flow: image_classifier identifies a
    food photo → frontend looks up restaurants serving that dish.
    """
    if language not in ALLOWED_LANGUAGES:
        raise HTTPException(400, f"Unsupported language: {language}")
    dish_ko = (dish_ko or "").strip()
    if not dish_ko or len(dish_ko) > 30:
        raise HTTPException(400, "dish_ko must be 1-30 chars")
    if not _DISH_NAME_KO_RE.match(dish_ko):
        raise HTTPException(400, "dish_ko contains invalid characters")
    if limit < 1 or limit > 30:
        raise HTTPException(400, "limit must be in [1, 30]")
    if user_lat is not None and not (_LAT_MIN <= user_lat <= _LAT_MAX):
        raise HTTPException(400, "user_lat outside Korea bounding box")
    if user_lon is not None and not (_LON_MIN <= user_lon <= _LON_MAX):
        raise HTTPException(400, "user_lon outside Korea bounding box")

    result = await _dish_finder.find_restaurants_by_dish(
        dish_ko=dish_ko,
        user_lat=user_lat,
        user_lon=user_lon,
        language=language,
        limit=limit,
    )
    return DishFinderResponse(
        status=result.status,
        items=[
            DishFinderRestaurantOut(
                content_id=r.content_id,
                title=r.title,
                addr=r.addr,
                mapx=r.mapx,
                mapy=r.mapy,
                distance_m=r.distance_m,
                first_image=r.first_image,
                first_image_thumbnail=r.first_image_thumbnail,
                tel=r.tel,
                cat3=r.cat3,
                best_menu=r.best_menu,
            )
            for r in result.items
        ],
        total_count=result.total_count,
        message=result.message,
        dish_ko_used=result.dish_ko_used,
        language_used=result.language_used,
    )


_CONTENT_ID_RE = re.compile(r"^[0-9]{1,20}$")


@app.get("/restaurants/{content_id}", response_model=RestaurantDetailOut)
async def restaurant_detail_endpoint(
    content_id: str,
    language: str = "en",
    source: str = "auto",
):
    """
    Restaurant detail — operating hours, parking, signature menu.

    `source="auto"` tries LOD first (richer ktop:openTime / ktop:bestMenu),
    then falls back to OpenAPI detailIntro2 if LOD has no record.
    """
    if language not in ALLOWED_LANGUAGES:
        raise HTTPException(400, f"Unsupported language: {language}")
    if source not in _ALLOWED_SOURCES:
        raise HTTPException(400, f"source must be one of {sorted(_ALLOWED_SOURCES)}")
    if not _CONTENT_ID_RE.match(content_id):
        raise HTTPException(400, "Invalid content_id")

    detail = None
    if source == "openapi":
        detail = await _tour_api.restaurant_detail(content_id, language=language)
    elif source == "lod":
        detail = await _tour_lod.restaurant_detail_via_lod(content_id, language=language)
    else:  # auto
        detail = await _tour_lod.restaurant_detail_via_lod(content_id, language=language)
        if detail is None:
            detail = await _tour_api.restaurant_detail(content_id, language=language)

    if detail is None:
        raise HTTPException(404, "Restaurant detail unavailable")
    return RestaurantDetailOut(
        content_id=detail.content_id,
        operating_hours=detail.operating_hours,
        rest_date=detail.rest_date,
        info_center=detail.info_center,
        parking=detail.parking,
        seat=detail.seat,
        first_menu=detail.first_menu,
        signature_menu=detail.signature_menu,
        smoking=detail.smoking,
        reservation=detail.reservation,
    )


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
