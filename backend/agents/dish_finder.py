"""
Dish Finder — Hermes Phase 2.

Inverts the LOD nearby query: instead of "what restaurants are near me?",
this asks "which restaurants serve this specific dish as their signature?"

Use case: tourist sees a food photo (instagram, friend's plate, restaurant
window, delivery ad) → uploads → image_classifier detects "single_dish" +
main_dish_ko → THIS module finds 5-10 restaurants that registered that dish
as their `ktop:bestMenu` in the KTO Linked Open Data graph.

This is a use of TourAPI 4.0 LOD that no prior 13-year contest entry has
attempted (per ROADMAP §8 / SESSION_HANDOFF.md): bestMenu is normally a
display-only attribute. We invert it into a dish-to-restaurant index.

Resilience contract (mirrors tour_lod.py):
  - Single retry on transient HTTP error (Visit Korea endpoint flaps).
  - Stale-cache fallback: if LOD fails, serve last-known result of any age
    rather than blank UI ("⏳ N분 전 캐시" label).
  - Returns DishFinderResult with status field — never raises to caller.
"""
from __future__ import annotations

import asyncio
import time
from typing import Optional

import httpx
from pydantic import BaseModel, Field

from backend.agents._lod_shared import (
    CACHE_TTL as _CACHE_TTL,
    GASTRO_CLASS_URI as _GASTRO_CLASS_URI,
    haversine_m as _haversine_m,
    content_id_from_uri as _content_id_from_uri,
    category_id_from_uri as _category_id_from_uri,
    run_sparql as _run_sparql,
)


class DishFinderRestaurant(BaseModel):
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
    best_menu: Optional[str] = None  # echo of the dish name as registered


class DishFinderResult(BaseModel):
    status: str  # "ok" | "no_results" | "upstream_error" | "missing_input"
    items: list[DishFinderRestaurant] = Field(default_factory=list)
    total_count: int = 0
    message: Optional[str] = None
    dish_ko_used: Optional[str] = None
    language_used: Optional[str] = None


_BY_DISH_CACHE: dict[tuple, tuple[float, DishFinderResult]] = {}
_LOCK = asyncio.Lock()


def _build_by_dish_query(dish_ko: str, limit: int) -> str:
    """SPARQL — restaurants whose ktop:bestMenu CONTAINS the dish name.

    Using CONTAINS rather than = because LOD entries are free-text and
    often include extra context (e.g., "쟁반짜장 짬뽕 탕수육"). A simple
    substring match is more forgiving than exact equality.

    Escape risk: dish_ko comes from Gemini Vision output; we already
    sanitize length and characters in caller. SPARQL string literals do
    not have an injection vector here because we use FILTER STR(...)
    rather than direct concatenation into the BGP.
    """
    safe = (dish_ko or "").strip()[:30].replace('"', "")
    return f"""
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX wgs:  <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX ktop: <http://data.visitkorea.or.kr/property/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?s ?name ?lat ?lng ?bestMenu ?category ?tel ?address ?image WHERE {{
  ?s a <{_GASTRO_CLASS_URI}> ;
     rdfs:label   ?name ;
     ktop:bestMenu ?bestMenu .
  FILTER(CONTAINS(LCASE(STR(?bestMenu)), LCASE("{safe}")))
  OPTIONAL {{ ?s wgs:lat       ?lat       }}
  OPTIONAL {{ ?s wgs:long      ?lng       }}
  OPTIONAL {{ ?s ktop:category ?category  }}
  OPTIONAL {{ ?s ktop:tel      ?tel       }}
  OPTIONAL {{ ?s ktop:address  ?address   }}
  OPTIONAL {{ ?s foaf:depiction ?image    }}
}}
LIMIT {limit}
""".strip()


async def find_restaurants_by_dish(
    dish_ko: str,
    user_lat: Optional[float] = None,
    user_lon: Optional[float] = None,
    language: str = "en",
    limit: int = 10,
) -> DishFinderResult:
    """
    Returns up to `limit` restaurants whose bestMenu mentions `dish_ko`.

    If user coordinates are supplied, results are sorted by distance.
    Without coordinates we return them in LOD insertion order (typically
    nationwide spread; tourists in Seoul may want to filter by city).
    """
    dish_ko = (dish_ko or "").strip()[:30]
    if not dish_ko:
        return DishFinderResult(
            status="missing_input",
            message="dish_ko required",
            language_used=language,
        )

    ck = (dish_ko, language, limit)
    now = time.time()
    async with _LOCK:
        cached = _BY_DISH_CACHE.get(ck)
        if cached and now - cached[0] < _CACHE_TTL:
            res = cached[1]
            # If user coords supplied, recompute distances on the fly so
            # cached results sort correctly for a different user.
            if user_lat is not None and user_lon is not None:
                items = list(res.items)
                for it in items:
                    if it.mapx is not None and it.mapy is not None:
                        it.distance_m = _haversine_m(
                            user_lat, user_lon, it.mapy, it.mapx
                        )
                items.sort(key=lambda r: (r.distance_m if r.distance_m is not None else 10**9))
                return res.model_copy(update={"items": items})
            return res

    query = _build_by_dish_query(dish_ko, max(limit * 3, 20))

    def _serve_stale_or_error(reason: str) -> DishFinderResult:
        """Closure: serve a stale cached response if available, else propagate
        the upstream error.

        Captures `cached`, `now`, `dish_ko`, `language` from the enclosing
        scope so the SPARQL try/except site can call it with just the error
        reason. Stale-cache shows '⏳ N분 전 캐시' so the user knows the
        data isn't real-time but the UI still has content (preferable to a
        blank section during periodic Visit Korea LOD outages).
        """
        if cached:
            stale_age = int(now - cached[0])
            return DishFinderResult(
                status="ok",
                items=cached[1].items,
                total_count=cached[1].total_count,
                message=f"⏳ 데이터 일시 지연 — {stale_age // 60}분 전 캐시 표시 중",
                dish_ko_used=dish_ko,
                language_used=language,
            )
        return DishFinderResult(
            status="upstream_error",
            message=reason,
            dish_ko_used=dish_ko,
            language_used=language,
        )

    try:
        payload = await _run_sparql(query)
    except httpx.HTTPError as e:
        return _serve_stale_or_error(f"LOD 호출 실패: {str(e)[:120]}")
    if not payload:
        return _serve_stale_or_error("LOD 응답 비어있음 (HTML?)")

    bindings = (payload.get("results", {}) or {}).get("bindings", [])

    # Multi-valued depictions cause multiple rows per resource — collapse.
    seen: dict[str, dict] = {}
    for b in bindings:
        s_uri = (b.get("s") or {}).get("value")
        if not s_uri:
            continue
        rec = seen.setdefault(s_uri, {"s": s_uri, "images": []})
        for k in ("name", "lat", "lng", "category", "tel", "address", "bestMenu"):
            cell = b.get(k) or {}
            v = cell.get("value")
            if v and k not in rec:
                rec[k] = v
        img = (b.get("image") or {}).get("value")
        if img and img not in rec["images"]:
            rec["images"].append(img)

    items: list[DishFinderRestaurant] = []
    for rec in seen.values():
        cid = _content_id_from_uri(rec["s"])
        if not cid:
            continue
        try:
            ilat = float(rec["lat"]) if rec.get("lat") else None
            ilng = float(rec["lng"]) if rec.get("lng") else None
        except (KeyError, TypeError, ValueError):
            ilat = ilng = None
        dist: Optional[int] = None
        if (
            ilat is not None
            and ilng is not None
            and user_lat is not None
            and user_lon is not None
        ):
            dist = _haversine_m(user_lat, user_lon, ilat, ilng)
        first_img = rec["images"][0] if rec["images"] else None
        items.append(
            DishFinderRestaurant(
                content_id=cid,
                title=rec.get("name") or cid,
                addr=rec.get("address"),
                mapx=ilng,
                mapy=ilat,
                distance_m=dist,
                first_image=first_img,
                first_image_thumbnail=first_img,
                tel=rec.get("tel"),
                cat3=_category_id_from_uri(rec.get("category")),
                best_menu=rec.get("bestMenu"),
            )
        )

    if user_lat is not None and user_lon is not None:
        items.sort(key=lambda r: (r.distance_m if r.distance_m is not None else 10**9))
    items = items[:limit]

    result = DishFinderResult(
        status="ok" if items else "no_results",
        items=items,
        total_count=len(items),
        dish_ko_used=dish_ko,
        language_used=language,
        message=None if items else f"'{dish_ko}'을(를) 시그니처로 등록한 식당이 LOD에 없습니다.",
    )

    async with _LOCK:
        _BY_DISH_CACHE[ck] = (now, result)
    return result


if __name__ == "__main__":  # pragma: no cover
    import sys

    dish = sys.argv[1] if len(sys.argv) > 1 else "비빔밥"
    res = asyncio.run(find_restaurants_by_dish(dish, limit=10))
    print(res.model_dump_json(indent=2))
