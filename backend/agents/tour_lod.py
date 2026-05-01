"""
TourAPI 4.0 LOD (Linked Open Data) — SPARQL endpoint integration.

Endpoint: http://data.visitkorea.or.kr/sparql  (no API key, CC BY-SA 3.0)

Why LOD as first source for /restaurants/nearby
-----------------------------------------------
- Zero authentication — no service-key provisioning lag (OpenAPI takes hours~days).
- Richer per-restaurant metadata in a single round-trip:
    * rdfs:label                       (Korean name)
    * wgs:lat / wgs:long               (coordinates)
    * dc:description                   (200~600 char Korean blurb)
    * foaf:depiction                   (CDN photo URLs, often 3 per place)
    * ktop:tel / openTime / restDate   (contact + hours)
    * ktop:bestMenu                    (signature dish — often the very
                                        hangul name we saw on the menu)
    * ktop:parking / creditCard / smokingSectionAvailable
    * ktop:category                    (A05020100=한식, A05020200=양식, …)
- 1.47M entities (15,531 kto:Gastro instances) — covers most tourist hubs.
- "LOD SPARQL — 역대 수상작 최초 활용" differentiation per SESSION_HANDOFF.md.

Query strategy
--------------
Saltlux's `geo:nearby(lat lon r)` extension returned no results in smoke tests,
so we use a portable BBOX-then-Haversine pattern:

    1. Compute a square bounding box around (lat, lon) sized for `radius_m`.
    2. SPARQL with FILTER on wgs:lat/long inside the BBOX (LIMIT 5×needed).
    3. Sort by Haversine distance in Python; drop corner-of-bbox false positives.

This needs no extension functions and stays portable across triplestores.
"""
from __future__ import annotations

import asyncio
import time
from typing import Optional

import httpx

from backend.agents.tour_api import (
    NearbyResult,
    Restaurant,
    RestaurantDetail,
)
from backend.agents._lod_shared import (
    CACHE_TTL as _CACHE_TTL,
    GASTRO_CLASS_URI as _GASTRO_CLASS_URI,
    bbox_for as _bbox_for,
    haversine_m as _haversine_m,
    content_id_from_uri as _content_id_from_uri,
    category_id_from_uri as _category_id_from_uri,
    run_sparql as _run_sparql,
)

# KTO category codes (data.visitkorea.or.kr/resource/<code>) for restaurants.
# Used by the frontend to localize cat3 if it wants. Not strictly needed here.
CATEGORY_LABEL_KO = {
    "A05020100": "한식",
    "A05020200": "양식",
    "A05020300": "일식",
    "A05020400": "중식",
    "A05020700": "이색음식점",
    "A05020900": "카페·전통찻집",
}

_NEARBY_CACHE: dict[tuple, tuple[float, NearbyResult]] = {}
_DETAIL_CACHE: dict[tuple, tuple[float, RestaurantDetail]] = {}
_LOCK = asyncio.Lock()






def _build_nearby_query(
    lat_min: float, lat_max: float, lon_min: float, lon_max: float, limit: int
) -> str:
    return f"""
PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX wgs:  <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX ktop: <http://data.visitkorea.or.kr/property/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?s ?name ?lat ?lng ?category ?tel ?address ?image ?bestMenu WHERE {{
  ?s a <{_GASTRO_CLASS_URI}> ;
     rdfs:label ?name ;
     wgs:lat ?lat ;
     wgs:long ?lng .
  FILTER(?lat  >= {lat_min:.6f} && ?lat  <= {lat_max:.6f}
      && ?lng >= {lon_min:.6f} && ?lng <= {lon_max:.6f})
  OPTIONAL {{ ?s ktop:category ?category }}
  OPTIONAL {{ ?s ktop:tel      ?tel      }}
  OPTIONAL {{ ?s ktop:address  ?address  }}
  OPTIONAL {{ ?s foaf:depiction ?image    }}
  OPTIONAL {{ ?s ktop:bestMenu ?bestMenu }}
}}
LIMIT {limit}
""".strip()



async def search_nearby_via_lod(
    lat: float,
    lon: float,
    radius: int = 500,
    language: str = "en",
    num_of_rows: int = 10,
) -> NearbyResult:
    """
    BBOX-then-Haversine SPARQL query against KTO LOD.
    Always available — no service key. Returns the same NearbyResult shape as
    the OpenAPI client so the route handler can swap sources transparently.
    """
    radius = max(100, min(int(radius), 20000))
    ck = (round(lat, 3), round(lon, 3), radius, language)
    now = time.time()
    async with _LOCK:
        cached = _NEARBY_CACHE.get(ck)
        if cached and now - cached[0] < _CACHE_TTL:
            return cached[1]

    lat_min, lat_max, lon_min, lon_max = _bbox_for(lat, lon, radius)
    # Pull more candidates than needed so corner-of-bbox false positives don't
    # starve the final list. Each resource may emit multiple rows due to
    # multi-valued foaf:depiction, so headroom is doubly justified.
    sparql_limit = max(num_of_rows * 5, 30)
    query = _build_nearby_query(lat_min, lat_max, lon_min, lon_max, sparql_limit)

    # Stale-on-error pattern: if SPARQL fails (Visit Korea has periodic 404
    # outages), serve the last successful response of any age rather than
    # leaving the section blank. Better an hour-old list than nothing.
    def _serve_stale_or_error(reason: str) -> NearbyResult:
        if cached:
            stale_age = int(now - cached[0])
            return NearbyResult(
                status="ok",
                items=cached[1].items,
                total_count=cached[1].total_count,
                message=f"⏳ 데이터 일시 지연 — {stale_age // 60}분 전 캐시 표시 중",
                language_used=language,
                radius_m=radius,
            )
        return NearbyResult(
            status="upstream_error",
            message=reason,
            language_used=language,
            radius_m=radius,
        )

    try:
        payload = await _run_sparql(query)
    except httpx.HTTPError as e:
        return _serve_stale_or_error(f"LOD SPARQL 호출 실패: {str(e)[:120]}")
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

    items: list[Restaurant] = []
    for rec in seen.values():
        try:
            ilat = float(rec["lat"])
            ilng = float(rec["lng"])
        except (KeyError, TypeError, ValueError):
            continue
        dist = _haversine_m(lat, lon, ilat, ilng)
        if dist > radius:
            continue
        cid = _content_id_from_uri(rec["s"])
        if not cid:
            continue
        items.append(
            Restaurant(
                content_id=cid,
                title=rec.get("name") or cid,
                addr=rec.get("address") or "",
                addr_detail=None,
                mapx=ilng,
                mapy=ilat,
                distance_m=dist,
                first_image=rec["images"][0] if rec["images"] else None,
                first_image_thumbnail=rec["images"][0] if rec["images"] else None,
                tel=rec.get("tel"),
                cat3=_category_id_from_uri(rec.get("category")),
            )
        )
    items.sort(key=lambda r: (r.distance_m if r.distance_m is not None else 99_999))
    items = items[:num_of_rows]

    result = NearbyResult(
        status="ok" if items else "no_results",
        items=items,
        total_count=len(items),
        message=None if items else "반경 내 LOD 등록 식당이 없습니다.",
        language_used=language,
        radius_m=radius,
    )
    async with _LOCK:
        _NEARBY_CACHE[ck] = (now, result)
    return result


async def restaurant_detail_via_lod(
    content_id: str, language: str = "en"
) -> Optional[RestaurantDetail]:
    """
    Pull rich detail for one resource. SPARQL with several OPTIONAL clauses;
    each missing field stays None instead of failing the whole query.
    """
    cid = (content_id or "").strip()
    if not cid:
        return None
    ck = (cid, language)
    now = time.time()
    async with _LOCK:
        cached = _DETAIL_CACHE.get(ck)
        if cached and now - cached[0] < _CACHE_TTL:
            return cached[1]

    res_uri = f"http://data.visitkorea.or.kr/resource/{cid}"
    query = f"""
PREFIX ktop: <http://data.visitkorea.or.kr/property/>
SELECT ?openTime ?restDate ?tel ?address ?bestMenu ?parking ?creditCard ?smoking
WHERE {{
  OPTIONAL {{ <{res_uri}> ktop:openTime ?openTime }}
  OPTIONAL {{ <{res_uri}> ktop:restDate ?restDate }}
  OPTIONAL {{ <{res_uri}> ktop:tel ?tel }}
  OPTIONAL {{ <{res_uri}> ktop:address ?address }}
  OPTIONAL {{ <{res_uri}> ktop:bestMenu ?bestMenu }}
  OPTIONAL {{ <{res_uri}> ktop:parking ?parking }}
  OPTIONAL {{ <{res_uri}> ktop:creditCard ?creditCard }}
  OPTIONAL {{ <{res_uri}> ktop:smokingSectionAvailable ?smoking }}
}}
LIMIT 1
""".strip()
    try:
        payload = await _run_sparql(query)
    except httpx.HTTPError:
        return None
    if not payload:
        return None
    bindings = (payload.get("results", {}) or {}).get("bindings", [])
    if not bindings:
        return None
    b = bindings[0]

    def _g(k: str) -> Optional[str]:
        cell = b.get(k) or {}
        v = cell.get("value")
        return v.strip() if v else None

    detail = RestaurantDetail(
        content_id=cid,
        operating_hours=_g("openTime"),
        rest_date=_g("restDate"),
        info_center=_g("tel"),
        parking=_g("parking"),
        seat=None,
        first_menu=_g("bestMenu"),
        signature_menu=_g("bestMenu"),
        smoking=_g("smoking"),
        reservation=None,
    )
    async with _LOCK:
        _DETAIL_CACHE[ck] = (now, detail)
    return detail
