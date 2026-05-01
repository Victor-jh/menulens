"""
Unit tests for backend.agents.verdict.decide().

verdict.decide() is the single source of truth for the 🟢🟡🔴 chip the user
sees on every dish card. Bugs here are user-visible and high-stakes (e.g.,
serving a halal user a pork dish as 🟢). These tests lock in the decision
tree from verdict.py's docstring:

  4. 🔴 allergen_conflict      — user.allergies ∩ dish.allergens
  3. 🔴 religion_conflict      — halal × not halal_safe
  3. 🔴 diet_hard_conflict     — vegan/vegetarian × meat·seafood
  2. 🟡 diet_soft_conflict     — vegan × egg/dairy
  2. 🟡 price_caution          — 110~130%  (ADR-007)
  2. 🔴 price_suspect          — >130%      (ADR-007)
  1. 🟢 all clear

Pure-logic tests — no mocks. DishProfile and PriceJudgment are pydantic
models we construct directly (same approach as verdict.py's __main__ canary).
"""
from __future__ import annotations

import pytest

from backend.agents.dish_profiler import DishProfile
from backend.agents.price_sentinel import PriceJudgment, PriceVerdict
from backend.agents.verdict import FinalColor, UserProfile, decide


# --- helpers (mirror verdict.py __main__ for shape parity) ---------------
def _dish(
    name: str = "테스트",
    *,
    allergens: list[str] | None = None,
    halal: bool = True,
    vegan: bool = False,
    vegetarian: bool = False,
    source: str = "official_db",
) -> DishProfile:
    return DishProfile(
        name_ko=name,
        name_translated=name,
        description="",
        allergens=allergens or [],
        halal_safe=halal,
        vegan_safe=vegan,
        vegetarian_safe=vegetarian,
        source=source,
    )


def _price(verdict: PriceVerdict, listed: int = 9000, benchmark: int = 9000) -> PriceJudgment:
    return PriceJudgment(
        dish_name="",
        listed_price=listed,
        benchmark_price=benchmark,
        benchmark_source="참가격",
        ratio=listed / benchmark,
        verdict=verdict,
        explanation=f"ratio={listed/benchmark:.2f}",
        match_method="exact",
        match_confidence=0.95,
    )


# --- a) green: profile clears all gates --------------------------------------
def test_pescatarian_bibimbap_fair_price_is_green():
    """Pescatarian + 비빔밥(no meat) + fair price → 🟢, no triggers.

    Baseline 'happy path' — guards against any rule accidentally firing
    on an entirely safe dish.
    """
    profile = UserProfile(diet="pescatarian")
    dish = _dish("비빔밥", allergens=["egg", "soybean"], halal=False, vegan=False, vegetarian=True)
    result = decide(dish, _price(PriceVerdict.FAIR), profile)
    assert result.color == FinalColor.GREEN
    assert result.trigger_flags == []


# --- b) red: pescatarian × pork = hard diet conflict -------------------------
def test_pescatarian_with_pork_is_red_diet_hard_conflict():
    """Pescatarian eats fish but NOT pork. 김치찌개 (pork) must trip diet_hard_conflict."""
    profile = UserProfile(diet="pescatarian")
    dish = _dish("김치찌개", allergens=["pork", "soybean"], halal=False)
    result = decide(dish, _price(PriceVerdict.FAIR), profile)
    assert result.color == FinalColor.RED
    assert "diet_hard_conflict" in result.trigger_flags


# --- c) red: halal × pork = religion conflict -------------------------------
def test_halal_user_with_pork_is_red_religion_conflict():
    """Ahmed-persona case: halal religion + pork dish must produce religion_conflict.

    Distinct from diet_hard_conflict — religion is a separate severity-3 check.
    """
    profile = UserProfile(religion="halal")
    dish = _dish("김치찌개", allergens=["pork", "soybean"], halal=False)
    result = decide(dish, _price(PriceVerdict.FAIR), profile)
    assert result.color == FinalColor.RED
    assert "religion_conflict" in result.trigger_flags
    # verdict.py adds the haram trigger ingredient to the reason string.
    assert any("pork" in r.lower() for r in result.reasons)


# --- d) red: allergen intersection trips allergen_conflict ------------------
def test_nut_allergy_with_nut_dish_is_red_allergen_conflict():
    """Chen-like persona: nuts allergy + 삼계탕(nuts) → allergen_conflict.

    This is the highest-severity check in the tree. Even if other checks
    pass, the dish must be 🔴.
    """
    profile = UserProfile(allergies=["nuts"])
    dish = _dish("삼계탕", allergens=["chicken", "nuts"], halal=True)
    result = decide(dish, _price(PriceVerdict.FAIR), profile)
    assert result.color == FinalColor.RED
    assert "allergen_conflict" in result.trigger_flags
    assert any("nuts" in r for r in result.reasons)


# --- e) red: price >130% benchmark = price_suspect --------------------------
def test_price_suspect_alone_is_red():
    """Even with a totally safe dish, >130% benchmark price triggers 🔴 price_suspect.

    Per ADR-007 — ratio 1.35 sits above the SUSPECT threshold.
    """
    profile = UserProfile()  # no diet, no religion, no allergies
    dish = _dish("된장찌개", allergens=["soybean"], halal=True)
    result = decide(dish, _price(PriceVerdict.SUSPECT, listed=13500, benchmark=10000), profile)
    assert result.color == FinalColor.RED
    assert "price_suspect" in result.trigger_flags


# --- f) yellow: price 110~130% benchmark = price_caution --------------------
def test_price_caution_alone_is_yellow():
    """15% over benchmark is the canonical 🟡 case (ADR-007 110~130% band)."""
    profile = UserProfile()
    dish = _dish("된장찌개", allergens=["soybean"], halal=True)
    result = decide(dish, _price(PriceVerdict.CAUTION, listed=11500, benchmark=10000), profile)
    assert result.color == FinalColor.YELLOW
    assert "price_caution" in result.trigger_flags


# --- g) severity ordering: red beats yellow ---------------------------------
def test_red_diet_overrides_yellow_price():
    """When both fire, the higher-severity color wins, but reasons list both.

    This guards the `results.sort(key=...)` step in verdict.decide().
    """
    profile = UserProfile(diet="vegetarian")
    dish = _dish("김치찌개", allergens=["pork"], halal=False)
    result = decide(dish, _price(PriceVerdict.CAUTION, listed=11500, benchmark=10000), profile)
    assert result.color == FinalColor.RED
    # Both flags should be present — the UI shows all reasons, not just the top one.
    assert "diet_hard_conflict" in result.trigger_flags
    assert "price_caution" in result.trigger_flags


# --- h) unknown source + no price = unknown chip ----------------------------
def test_unknown_dish_with_no_price_is_unknown():
    """If the dish failed RAG (source='unknown') AND no price benchmark,
    we must surface ⚪ rather than falsely-confident 🟢.

    Audit-relevant: the no_data signal lets the UI show a 'we don't know'
    badge instead of a misleading green.
    """
    profile = UserProfile()
    dish = _dish("외계인음식", allergens=[], halal=False, source="unknown")
    result = decide(dish, None, profile)
    assert result.color == FinalColor.UNKNOWN
    assert "no_data" in result.trigger_flags


# --- i) clean profile + no price returns green (not unknown) ----------------
def test_known_dish_no_price_is_green():
    """Dish profile is from official_db but no price comparison available.
    Should be 🟢 (not ⚪) — we have enough info to clear the dish."""
    profile = UserProfile()
    dish = _dish("비빔밥", allergens=["egg"], halal=False, source="official_db")
    result = decide(dish, None, profile)
    assert result.color == FinalColor.GREEN
    assert result.trigger_flags == []
