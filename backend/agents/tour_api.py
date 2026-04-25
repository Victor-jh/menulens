"""
TourAPI 4.0 (KorService2 family) — restaurant discovery near the user.

Used by /restaurants/nearby and /restaurants/{content_id} endpoints.

Endpoints
---------
- locationBasedList2  — restaurants near (lat, lon)  (distance-sorted)
- detailIntro2        — operating hours, parking, phone, signature menu
- searchKeyword2      — keyword fallback (when GPS unavailable)

Service path is selected per user language so foreign tourists see titles
and addresses in their language without a separate translation pass:

    ko       → KorService2
    en       → EngService2
    ja       → JpnService2
    zh-Hans  → ChsService2
    zh-Hant  → ChtService2

Restaurant contentTypeId = 39 across all language services (TourAPI 4.0 unification).

Graceful degrade
----------------
Missing/empty TOURAPI_SERVICE_KEY → returns NearbyResult(status="missing_key").
The frontend renders "TourAPI 활용신청 대기 중" instead of crashing the page.

Reference: data.go.kr 15101578 (Korea Tourism Organization, KorService2 API).
"""
from __future__ import annotations

import asyncio
import os
import time
from dataclasses import dataclass, field
from typing import Optional

import httpx

_BASE = "https://apis.data.go.kr/B551011"
_DEFAULT_TIMEOUT = 8.0
_CACHE_TTL = 3600.0  # 1h — restaurant lists rarely flap

_LANG_TO_SERVICE = {
    "ko": "KorService2",
    "en": "EngService2",
    "ja": "JpnService2",
    "zh-Hans": "ChsService2",
    "zh-Hant": "ChtService2",
}

_RESTAURANT_CONTENT_TYPE_ID = 39


@dataclass
class Restaurant:
    content_id: str
    title: str
    addr: str
    addr_detail: Optional[str] = None
    mapx: Optional[float] = None  # longitude
    mapy: Optional[float] = None  # latitude
    distance_m: Optional[int] = None
    first_image: Optional[str] = None
    first_image_thumbnail: Optional[str] = None
    tel: Optional[str] = None
    cat3: Optional[str] = None


@dataclass
class RestaurantDetail:
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


@dataclass
class NearbyResult:
    """Wrapper exposing key/upstream issues to the UI as an explicit state."""
    status: str  # "ok" | "missing_key" | "upstream_error" | "no_results"
    items: list[Restaurant] = field(default_factory=list)
    total_count: int = 0
    message: Optional[str] = None
    language_used: str = "en"
    radius_m: int = 0


_NEARBY_CACHE: dict[tuple, tuple[float, NearbyResult]] = {}
_DETAIL_CACHE: dict[tuple, tuple[float, RestaurantDetail]] = {}
_LOCK = asyncio.Lock()


def _service_key() -> Optional[str]:
    raw = (
        os.getenv("TOURAPI_SERVICE_KEY")
        or os.getenv("TOUR_API_SERVICE_KEY")
        or ""
    ).strip()
    return raw or None


def _service_path(language: str) -> str:
    return _LANG_TO_SERVICE.get(language, "EngService2")


def _cache_key_nearby(lat: float, lon: float, radius: int, language: str) -> tuple:
    # ~100m grid keeps repeated GPS jitters on the same hot cache entry.
    return (round(lat, 3), round(lon, 3), radius, language)


def _to_int(v) -> Optional[int]:
    try:
        return int(float(v)) if v not in (None, "", "0", 0) else None
    except (TypeError, ValueError):
        return None


def _to_float(v) -> Optional[float]:
    try:
        return float(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _to_str(v) -> Optional[str]:
    s = ("" if v is None else str(v)).strip()
    return s or None


def _check_result_code(payload: dict) -> Optional[str]:
    header = (payload.get("response", {}) or {}).get("header", {}) or {}
    code = header.get("resultCode")
    msg = header.get("resultMsg")
    if code in (None, "", "0000", "00"):
        return None
    return f"TourAPI error {code}: {msg or 'unknown'}"


def _parse_items(payload: dict) -> tuple[list[dict], int]:
    """`items.item` may be a single dict, list, or empty string. Normalize."""
    body = (payload.get("response", {}) or {}).get("body", {}) or {}
    total_raw = body.get("totalCount")
    try:
        total = int(total_raw) if total_raw not in (None, "") else 0
    except (TypeError, ValueError):
        total = 0
    items_field = body.get("items")
    if not items_field or items_field == "":
        return [], total
    items = items_field.get("item") if isinstance(items_field, dict) else None
    if items is None:
        return [], total
    if isinstance(items, dict):
        return [items], total
    return list(items), total


def _restaurant_from_item(it: dict) -> Optional[Restaurant]:
    cid = _to_str(it.get("contentid"))
    title = _to_str(it.get("title"))
    if not cid or not title:
        return None
    return Restaurant(
        content_id=cid,
        title=title,
        addr=_to_str(it.get("addr1")) or "",
        addr_detail=_to_str(it.get("addr2")),
        mapx=_to_float(it.get("mapx")),
        mapy=_to_float(it.get("mapy")),
        distance_m=_to_int(it.get("dist")),
        first_image=_to_str(it.get("firstimage")),
        first_image_thumbnail=_to_str(it.get("firstimage2")),
        tel=_to_str(it.get("tel")),
        cat3=_to_str(it.get("cat3")),
    )


async def _get_json(url: str, params: dict) -> Optional[dict]:
    async with httpx.AsyncClient(
        timeout=_DEFAULT_TIMEOUT, follow_redirects=True
    ) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        try:
            return resp.json()
        except Exception:
            return None


async def search_nearby_restaurants(
    lat: float,
    lon: float,
    radius: int = 500,
    language: str = "en",
    num_of_rows: int = 10,
) -> NearbyResult:
    """
    locationBasedList2, contentTypeId=39 (음식점), arrange=Q (distance asc).

    Radius is clamped to [100, 20000] meters per TourAPI spec.
    """
    radius = max(100, min(int(radius), 20000))
    key = _service_key()
    if not key:
        return NearbyResult(
            status="missing_key",
            message="TourAPI 활용신청 대기 중 — 키 등록 후 자동 활성화됩니다.",
            language_used=language,
            radius_m=radius,
        )

    ck = _cache_key_nearby(lat, lon, radius, language)
    now = time.time()
    async with _LOCK:
        cached = _NEARBY_CACHE.get(ck)
        if cached and now - cached[0] < _CACHE_TTL:
            return cached[1]

    service = _service_path(language)
    url = f"{_BASE}/{service}/locationBasedList2"
    params = {
        "serviceKey": key,
        "MobileOS": "ETC",
        "MobileApp": "MenuLens",
        "_type": "json",
        "numOfRows": max(1, min(int(num_of_rows), 30)),
        "pageNo": 1,
        "mapX": f"{lon:.6f}",
        "mapY": f"{lat:.6f}",
        "radius": radius,
        "contentTypeId": _RESTAURANT_CONTENT_TYPE_ID,
        "arrange": "Q",
    }
    try:
        payload = await _get_json(url, params)
    except httpx.HTTPError as e:
        return NearbyResult(
            status="upstream_error",
            message=f"TourAPI 호출 실패: {str(e)[:120]}",
            language_used=language,
            radius_m=radius,
        )
    if not payload:
        return NearbyResult(
            status="upstream_error",
            message="TourAPI 빈 응답",
            language_used=language,
            radius_m=radius,
        )
    err = _check_result_code(payload)
    if err:
        return NearbyResult(
            status="upstream_error",
            message=err,
            language_used=language,
            radius_m=radius,
        )
    raw_items, total = _parse_items(payload)
    items = [r for r in (_restaurant_from_item(it) for it in raw_items) if r]
    result = NearbyResult(
        status="ok" if items else "no_results",
        items=items,
        total_count=total,
        message=None if items else "반경 내 등록된 식당이 없습니다.",
        language_used=language,
        radius_m=radius,
    )
    async with _LOCK:
        _NEARBY_CACHE[ck] = (now, result)
    return result


async def restaurant_detail(
    content_id: str, language: str = "en"
) -> Optional[RestaurantDetail]:
    """detailIntro2 → operating hours / phone / parking / signature menu."""
    key = _service_key()
    if not key:
        return None
    cid = (content_id or "").strip()
    if not cid:
        return None
    ck = (cid, language)
    now = time.time()
    async with _LOCK:
        cached = _DETAIL_CACHE.get(ck)
        if cached and now - cached[0] < _CACHE_TTL:
            return cached[1]

    service = _service_path(language)
    url = f"{_BASE}/{service}/detailIntro2"
    params = {
        "serviceKey": key,
        "MobileOS": "ETC",
        "MobileApp": "MenuLens",
        "_type": "json",
        "contentId": cid,
        "contentTypeId": _RESTAURANT_CONTENT_TYPE_ID,
    }
    try:
        payload = await _get_json(url, params)
    except httpx.HTTPError:
        return None
    if not payload or _check_result_code(payload):
        return None
    raw_items, _ = _parse_items(payload)
    if not raw_items:
        return None
    it = raw_items[0]
    detail = RestaurantDetail(
        content_id=cid,
        operating_hours=_to_str(it.get("opentimefood")),
        rest_date=_to_str(it.get("restdatefood")),
        info_center=_to_str(it.get("infocenterfood")),
        parking=_to_str(it.get("parkingfood")),
        seat=_to_str(it.get("seat")),
        first_menu=_to_str(it.get("firstmenu")),
        signature_menu=_to_str(it.get("treatmenu")),
        smoking=_to_str(it.get("smoking")),
        reservation=_to_str(it.get("reservationfood")),
    )
    async with _LOCK:
        _DETAIL_CACHE[ck] = (now, detail)
    return detail


async def search_by_keyword(
    keyword: str, language: str = "en", num_of_rows: int = 10
) -> NearbyResult:
    """searchKeyword2 fallback when GPS denied or 0 nearby results."""
    key = _service_key()
    if not key:
        return NearbyResult(
            status="missing_key",
            message="TourAPI 활용신청 대기 중",
            language_used=language,
        )
    kw = (keyword or "").strip()
    if not kw:
        return NearbyResult(status="ok", language_used=language)
    service = _service_path(language)
    url = f"{_BASE}/{service}/searchKeyword2"
    params = {
        "serviceKey": key,
        "MobileOS": "ETC",
        "MobileApp": "MenuLens",
        "_type": "json",
        "numOfRows": max(1, min(int(num_of_rows), 30)),
        "pageNo": 1,
        "keyword": kw,
        "contentTypeId": _RESTAURANT_CONTENT_TYPE_ID,
    }
    try:
        payload = await _get_json(url, params)
    except httpx.HTTPError as e:
        return NearbyResult(
            status="upstream_error", message=str(e)[:120], language_used=language
        )
    if not payload:
        return NearbyResult(
            status="upstream_error", message="empty response", language_used=language
        )
    err = _check_result_code(payload)
    if err:
        return NearbyResult(status="upstream_error", message=err, language_used=language)
    raw_items, total = _parse_items(payload)
    items = [r for r in (_restaurant_from_item(it) for it in raw_items) if r]
    return NearbyResult(
        status="ok" if items else "no_results",
        items=items,
        total_count=total,
        language_used=language,
    )
