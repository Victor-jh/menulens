"""
E2E smoke test — 촬영/제출 직전 5분 안에 핵심 흐름 점검.

Usage:
    # 로컬 backend 검증
    pytest tests/test_smoke_e2e.py -v

    # 프로덕션 (Render) 검증 — D12 촬영 직전 권장
    MENULENS_API=https://menulens-backend.onrender.com pytest tests/test_smoke_e2e.py -v

What it tests (Hermes 라우터 + Phase 2 dish_finder 포함)
    1. /health 200 + version field
    2. /analyze synthetic 메뉴 → items >= 3 + image_kind="menu"
    3. /analyze + allergies=peanut,sesame,nuts → 삼계탕 RED + nuts trigger
    4. /restaurants/nearby?source=lod 200 (status=ok or upstream_error — 둘 다 graceful)
    5. /restaurants/by_dish?dish_ko=비빔밥 200 + status valid
    6. /fx?krw=42000&language=ja 200 + JPY in result
    7. CORS preflight from menulens-app.vercel.app

Each test is independent. Run takes ~30-60s on warm prod, ~3min on cold.
"""
from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

import httpx
import pytest


API = os.getenv("MENULENS_API", "http://localhost:8000")
FIXTURE = Path(__file__).resolve().parent.parent / "frontend" / "public" / "synthetic_menu.png"
TIMEOUT = httpx.Timeout(60.0, connect=10.0)


def _post_analyze(
    *,
    allergies: str = "",
    religion: str = "",
    diet: str = "",
    language: str = "en",
) -> dict[str, Any]:
    """Helper — POST /analyze with the synthetic menu fixture."""
    assert FIXTURE.exists(), f"Synthetic menu fixture missing at {FIXTURE}"
    with httpx.Client(timeout=TIMEOUT) as client:
        with FIXTURE.open("rb") as f:
            r = client.post(
                f"{API}/analyze",
                files={"image": ("synthetic_menu.png", f, "image/png")},
                data={
                    "language": language,
                    "allergies": allergies,
                    "religion": religion,
                    "diet": diet,
                },
            )
    r.raise_for_status()
    return r.json()


# ── Test 1: backend alive ─────────────────────────────────────────────


def test_health_200_with_version() -> None:
    with httpx.Client(timeout=TIMEOUT) as client:
        r = client.get(f"{API}/health")
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "ok"
    assert "version" in body  # smoke: version key shipped


# ── Test 2: Hermes routes a clear menu image to "menu" ────────────────


def test_analyze_menu_kind_and_items() -> None:
    body = _post_analyze()
    assert body["items"], "no items returned for synthetic menu"
    assert len(body["items"]) >= 3, f"too few items: {len(body['items'])}"
    # Hermes should classify a menu board as "menu". Tolerance: confidence
    # may dip on certain images, in which case backend falls back to "menu"
    # via the items≥3 rule, so the field MUST end up "menu" either way.
    assert body.get("image_kind") == "menu", body.get("image_kind")
    # OCR sanity
    assert body["ocr_quality"] >= 0.5
    assert body["processing_time_seconds"] > 0


# ── Test 3: Chen persona — peanut/sesame/nuts safety ──────────────────


def test_analyze_chen_nuts_blocked_on_samgyetang() -> None:
    body = _post_analyze(allergies="peanut,sesame,nuts")
    items = body["items"]
    samgyetang = next(
        (i for i in items if i["name"] in ("삼계탕", "Samgyetang")), None
    )
    if samgyetang is None:
        pytest.skip("synthetic menu missing samgyetang — fixture changed")
    # Must be flagged red — chestnut (밤) maps to nuts via 800선 RAG.
    assert samgyetang["color"] == "🔴", samgyetang
    flags = samgyetang.get("trigger_flags") or []
    assert any("allergen" in str(f).lower() for f in flags), flags


# ── Test 4: nearby graceful (LOD outage tolerant) ─────────────────────


def test_nearby_returns_200_even_during_lod_outage() -> None:
    with httpx.Client(timeout=TIMEOUT) as client:
        r = client.get(
            f"{API}/restaurants/nearby",
            params={
                "lat": 37.5665,
                "lon": 126.978,
                "radius": 500,
                "language": "en",
                "source": "lod",
            },
        )
    assert r.status_code == 200
    body = r.json()
    # Either ok with items or upstream_error with helpful message — never raise.
    assert body["status"] in ("ok", "upstream_error", "no_results", "missing_key"), body


# ── Test 5: dish_finder Phase 2 (LOD bestMenu reverse) ────────────────


def test_dish_finder_returns_200_for_bibimbap() -> None:
    with httpx.Client(timeout=TIMEOUT) as client:
        r = client.get(
            f"{API}/restaurants/by_dish",
            params={"dish_ko": "비빔밥", "language": "en", "limit": 5},
        )
    assert r.status_code == 200, r.text[:200]
    body = r.json()
    assert body["status"] in ("ok", "upstream_error", "no_results"), body


# ── Test 6: FX endpoint (외화 환산) ──────────────────────────────────


def test_fx_krw_to_jpy() -> None:
    with httpx.Client(timeout=TIMEOUT) as client:
        r = client.get(f"{API}/fx", params={"krw": 42000, "language": "ja"})
    assert r.status_code == 200
    body = r.json()
    # JPY equivalent is the public-facing field; presence + plausible range.
    text = str(body).lower()
    assert "jpy" in text or "yen" in text or "¥" in text, body


# ── Test 7: CORS preflight from canonical Vercel domain ───────────────


def test_cors_preflight_from_vercel_origin() -> None:
    with httpx.Client(timeout=TIMEOUT) as client:
        r = client.options(
            f"{API}/analyze",
            headers={
                "Origin": "https://menulens-app.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
    # FastAPI CORS middleware returns 200 on preflight. Allow 204 for proxy variants.
    assert r.status_code in (200, 204), r.status_code
    allow = r.headers.get("access-control-allow-origin", "")
    # Either exact match or wildcard accepted.
    assert allow in ("*", "https://menulens-app.vercel.app"), allow


# ── Bonus: latency budget ─────────────────────────────────────────────


@pytest.mark.parametrize("warmup_pings", [1])
def test_analyze_under_30s_when_warm(warmup_pings: int) -> None:
    """After a warmup ping, /analyze should finish under 30s for synthetic menu.

    Render free tier cold start adds ~30s so this test is meant for warm runs.
    Skip if first probe takes >5s (likely cold).
    """
    with httpx.Client(timeout=TIMEOUT) as client:
        t0 = time.time()
        client.get(f"{API}/health")
        if time.time() - t0 > 5:
            pytest.skip("backend appears cold — skipping latency assertion")
    t1 = time.time()
    _post_analyze()
    elapsed = time.time() - t1
    assert elapsed < 30, f"/analyze took {elapsed:.1f}s, expected <30s warm"
