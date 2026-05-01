"""
LOD shared utilities — used by both `tour_lod` (location-based nearby) and
`dish_finder` (dish-based reverse lookup) so each module doesn't reach into
the other's private namespace.

Constants
---------
- `SPARQL_ENDPOINT` — Visit Korea LOD SPARQL endpoint (no auth).
- `DEFAULT_TIMEOUT` — single-request timeout (s).
- `CACHE_TTL` — fresh-response cache lifetime (s) before re-fetch.
- `GASTRO_CLASS_URI` — `kto:Gastro` parent class URI; covers 한식/양식/일식/
  중식/이색/카페 subclasses with one type filter.

Helpers
-------
- `bbox_for(lat, lon, radius_m)` — degree bounding box around a circle.
- `haversine_m(lat1, lon1, lat2, lon2)` — great-circle distance in meters.
- `content_id_from_uri(uri)` — strip the LOD URI to its trailing content_id.
- `category_id_from_uri(uri)` — strip a category URI to its code (e.g.
  "A05020100").
- `run_sparql(query)` — async GET with one retry + 250ms backoff. Returns
  parsed JSON dict, or `None` on non-JSON response. Raises `httpx.HTTPError`
  if both attempts fail; callers wrap with their own stale-cache fallback.

Why split out from `tour_lod`
-----------------------------
`dish_finder` was importing `_SPARQL_ENDPOINT`, `_haversine_m`, etc. with
leading underscores from `tour_lod`, creating a private-API coupling that
silently breaks if `tour_lod` refactors. Moving the truly cross-cutting
pieces into a shared module makes the dependency edge explicit.
"""
from __future__ import annotations

import asyncio
import math
from typing import Optional

import httpx

# ── Endpoint + budgets ────────────────────────────────────────────────
SPARQL_ENDPOINT = "http://data.visitkorea.or.kr/sparql"
DEFAULT_TIMEOUT = 12.0
CACHE_TTL = 3600.0

# kto:Gastro is the parent class — covers all 6 cuisine subclasses.
GASTRO_CLASS_URI = "http://data.visitkorea.or.kr/ontology/Gastro"


# ── Geo helpers ───────────────────────────────────────────────────────
def bbox_for(lat: float, lon: float, radius_m: int) -> tuple[float, float, float, float]:
    """Bounding box in degrees that fully contains the (lat, lon, radius) circle."""
    dlat = radius_m / 111_320.0
    cos_lat = max(0.001, math.cos(math.radians(lat)))
    dlon = radius_m / (111_320.0 * cos_lat)
    return lat - dlat, lat + dlat, lon - dlon, lon + dlon


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """Great-circle distance in meters (Earth radius 6_371_000)."""
    R = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return int(2 * R * math.asin(min(1.0, math.sqrt(a))))


# ── URI parsers ───────────────────────────────────────────────────────
def content_id_from_uri(uri: str) -> Optional[str]:
    """Last path segment of a Visit Korea resource URI."""
    if not uri:
        return None
    return uri.rsplit("/", 1)[-1] or None


def category_id_from_uri(uri: Optional[str]) -> Optional[str]:
    """Strip a `data.visitkorea.or.kr/resource/<code>` URI down to `<code>`."""
    if not uri:
        return None
    return uri.rsplit("/", 1)[-1] if "/" in uri else uri


# ── HTTP runner with retry ────────────────────────────────────────────
async def run_sparql(query: str) -> Optional[dict]:
    """
    GET the LOD endpoint with one retry on transient HTTP error.

    Visit Korea SPARQL has intermittent 404/503 windows; a single retry
    after 250ms catches the common short-flap case. Returns ``None`` if
    the response is non-JSON (LOD sometimes returns HTML during partial
    outages). Raises `httpx.HTTPError` on persistent failure so callers
    can implement their own stale-cache / friendly-error fallback.
    """
    last_err: Optional[Exception] = None
    async with httpx.AsyncClient(
        timeout=DEFAULT_TIMEOUT, follow_redirects=True
    ) as client:
        for attempt in (0, 1):
            try:
                resp = await client.get(
                    SPARQL_ENDPOINT,
                    params={"query": query, "format": "json"},
                    headers={"Accept": "application/sparql-results+json"},
                )
                resp.raise_for_status()
                ct = resp.headers.get("content-type", "")
                if "json" not in ct.lower() and "sparql-results" not in ct.lower():
                    return None
                try:
                    return resp.json()
                except Exception:
                    return None
            except httpx.HTTPError as e:
                last_err = e
                if attempt == 0:
                    await asyncio.sleep(0.25)
                    continue
                raise
    if last_err:
        raise last_err
    return None
