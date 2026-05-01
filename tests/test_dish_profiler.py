"""
Unit tests for backend.agents.dish_profiler.profile_dish() — focused on the
manual `_DISH_OVERRIDES` map.

Background (audit P0 — see _DISH_OVERRIDES comment in dish_profiler.py):
  hansik_800 has no Sino-Korean (中華料理) entries. Without overrides, an
  embedding search for 짜장면 returns 잡채's English name & description — the
  closest neighbour in 768d embedding space (also a noodle dish). The override
  table short-circuits RAG for these dishes BEFORE any Supabase/Gemini call,
  so these tests run with zero external dependencies.

Tests for non-override dishes (which require Supabase + Gemini) are
intentionally omitted — they're covered by tests/test_smoke_e2e.py.
"""
from __future__ import annotations

import pytest

from backend.agents.dish_profiler import profile_dish


# --- a) 짜장면 returns Black Bean Noodles, not Japchae -----------------------
@pytest.mark.asyncio
async def test_jjajangmyeon_override_returns_black_bean_noodles():
    """The whole reason _DISH_OVERRIDES exists. If this regresses, users see
    'Japchae' on a 짜장면 menu item — the bug that triggered the audit."""
    result = await profile_dish("짜장면")
    assert result.name_translated == "Black Bean Noodles"
    assert result.name_official == "Black Bean Noodles"
    # Defense-in-depth: the wrong neighbour was Japchae. Hard-fail if it sneaks back.
    assert "Japchae" not in result.name_translated
    assert "Japchae" not in (result.description or "")


# --- b) 자장면 (alt spelling) hits the same override entry ------------------
@pytest.mark.asyncio
async def test_jajangmyeon_alt_spelling_also_hits_override():
    """표준어 표기 자장면 must resolve to the same English name. Both spellings
    appear in real menus — missing one would cause inconsistent UX."""
    result = await profile_dish("자장면")
    assert result.name_translated == "Black Bean Noodles"
    assert result.source == "official_db"


# --- c) 짬뽕 ----------------------------------------------------------------
@pytest.mark.asyncio
async def test_jjamppong_override_returns_spicy_seafood_noodles():
    """짬뽕 is the other Korean-Chinese staple — must carry shrimp+crab
    allergens through so verdict.decide() can fire allergen_conflict."""
    result = await profile_dish("짬뽕")
    assert result.name_translated == "Spicy Seafood Noodle Soup"
    assert "shrimp" in result.allergens
    assert "crab" in result.allergens
    assert result.spicy_level == 2


# --- d) 탕수육 ---------------------------------------------------------------
@pytest.mark.asyncio
async def test_tangsuyuk_override_returns_sweet_and_sour_pork():
    """탕수육 must be flagged as containing pork so halal users see 🔴."""
    result = await profile_dish("탕수육")
    assert result.name_translated == "Sweet and Sour Pork"
    assert "pork" in result.allergens
    assert result.halal_safe is False  # has pork → not halal


# --- e) 군만두 ---------------------------------------------------------------
@pytest.mark.asyncio
async def test_gunmandu_override_returns_pan_fried_dumplings():
    """군만두 = pan-fried dumplings, the standard side-order companion to
    짜장면/짬뽕. Same Sino-Korean gap in hansik_800."""
    result = await profile_dish("군만두")
    assert result.name_translated == "Pan-fried Dumplings"
    assert "wheat" in result.allergens


# --- f) Override metadata invariants ----------------------------------------
@pytest.mark.asyncio
async def test_override_sets_official_db_source_and_full_similarity():
    """All override hits must claim source='official_db' and similarity=1.0
    so the UI treats them with the same confidence as a real RAG hit
    (no 'low confidence' warning chip)."""
    for name in ("짜장면", "짬뽕", "탕수육", "군만두"):
        result = await profile_dish(name)
        assert result.source == "official_db", f"{name} source mismatch"
        assert result.match_similarity == 1.0, f"{name} similarity mismatch"


# --- g) Whitespace normalization --------------------------------------------
@pytest.mark.asyncio
async def test_override_strips_internal_whitespace():
    """profile_dish does `name.replace(' ', '')` before lookup. OCR commonly
    inserts stray spaces between Hangul jamo on noisy menu photos. The
    override must still match."""
    result = await profile_dish("짜 장 면")  # OCR artifact
    assert result.name_translated == "Black Bean Noodles"
