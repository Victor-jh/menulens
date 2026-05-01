"""
Unit tests for backend.agents.image_classifier.classify_image().

The Hermes router is a single Gemini Vision call that decides whether the
uploaded image is a menu, a single dish photo, a banchan-spread table, or
not-food. The dispatcher uses this to route to the correct downstream
agent without making the user toggle 'menu vs photo' mode by hand.

Strategy: we don't hit Gemini in CI. We replace `genai.GenerativeModel` with
a fake whose `generate_content_async` returns canned JSON, exercising every
branch of the post-call parsing logic — including the fail-safe 'fall back
to menu' paths that protect against transient Gemini errors.
"""
from __future__ import annotations

import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.agents import image_classifier
from backend.agents.image_classifier import classify_image


def _fake_model_returning(text: str) -> MagicMock:
    """Build a MagicMock that mimics genai.GenerativeModel(...) and returns
    a response object whose `.text` attribute equals `text`."""
    fake_resp = SimpleNamespace(text=text)
    model = MagicMock()
    model.generate_content_async = AsyncMock(return_value=fake_resp)
    return model


@pytest.fixture
def fake_genai(monkeypatch):
    """Replace `image_classifier.genai` with a fake module exposing
    `configure(...)` and `GenerativeModel(...)`. Each test sets the model's
    canned response by reassigning `fake_genai.GenerativeModel.return_value`.

    Also sets GEMINI_API_KEY so the early-out (line 144) doesn't short-circuit.
    """
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    fake = MagicMock()
    fake.configure = MagicMock()
    fake.GenerativeModel = MagicMock()
    monkeypatch.setattr(image_classifier, "genai", fake)
    return fake


# --- a) menu kind: clean happy path -----------------------------------------
@pytest.mark.asyncio
async def test_classify_menu_kind(fake_genai):
    """A menu image returns kind='menu' with high confidence."""
    fake_genai.GenerativeModel.return_value = _fake_model_returning(
        json.dumps({"kind": "menu", "confidence": 0.95, "reason": "printed price list"})
    )
    result = await classify_image(b"\x89PNG fake", mime_type="image/png")
    assert result.kind == "menu"
    assert result.confidence == 0.95
    assert result.main_dish_ko is None


# --- b) single_dish: main_dish_ko populated ---------------------------------
@pytest.mark.asyncio
async def test_classify_single_dish_with_main_dish(fake_genai):
    """single_dish should carry the most prominent Korean dish name forward
    so the downstream profiler can RAG against hansik_800."""
    fake_genai.GenerativeModel.return_value = _fake_model_returning(
        json.dumps({
            "kind": "single_dish",
            "confidence": 0.9,
            "main_dish_ko": "비빔밥",
            "reason": "single bowl, no menu text",
        })
    )
    result = await classify_image(b"jpeg-bytes")
    assert result.kind == "single_dish"
    assert result.main_dish_ko == "비빔밥"
    assert result.confidence == 0.9


# --- c) not_food: receipts, sceneries, etc. ---------------------------------
@pytest.mark.asyncio
async def test_classify_not_food(fake_genai):
    """Receipt / scenery / non-food image is classified as not_food so the
    dispatcher can short-circuit with a useful error instead of hallucinating
    a menu."""
    fake_genai.GenerativeModel.return_value = _fake_model_returning(
        json.dumps({"kind": "not_food", "confidence": 0.95, "reason": "receipt"})
    )
    result = await classify_image(b"jpeg-bytes")
    assert result.kind == "not_food"


# --- d) invalid kind defaults to menu (defensive parsing) -------------------
@pytest.mark.asyncio
async def test_invalid_kind_defaults_to_menu(fake_genai):
    """If Gemini returns a kind outside the four-value enum, fall back to
    'menu' (the existing flow handles edge cases best — see module docstring).
    Audit-relevant: locks in defensive parsing on line 177 of image_classifier.py."""
    fake_genai.GenerativeModel.return_value = _fake_model_returning(
        json.dumps({"kind": "weird_kind", "confidence": 0.8})
    )
    result = await classify_image(b"jpeg-bytes")
    assert result.kind == "menu"
    assert result.confidence == 0.8


# --- e) JSON decode error: fall back, surface error in reason ---------------
@pytest.mark.asyncio
async def test_json_decode_error_returns_safe_fallback(fake_genai):
    """Gemini sometimes returns prose despite system prompt. Must fall back
    to the safe default rather than crash the request pipeline."""
    fake_genai.GenerativeModel.return_value = _fake_model_returning(
        "this is not json at all, just prose"
    )
    result = await classify_image(b"jpeg-bytes")
    assert result.kind == "menu"
    assert result.confidence == 0.0
    # Reason must call out json — operators rely on this in error logs.
    assert "json" in (result.reason or "").lower()


# --- f) genai package missing: graceful degrade -----------------------------
@pytest.mark.asyncio
async def test_missing_genai_returns_default(monkeypatch):
    """If google-generativeai isn't installed (rare, but possible in stripped
    deploy images) we must still return a parseable result, not raise."""
    monkeypatch.setattr(image_classifier, "genai", None)
    result = await classify_image(b"jpeg-bytes")
    assert result.kind == "menu"
    assert result.confidence == 0.0
    assert "not installed" in (result.reason or "").lower()


# --- g) GEMINI_API_KEY missing: graceful degrade ----------------------------
@pytest.mark.asyncio
async def test_missing_api_key_returns_default(monkeypatch, fake_genai):
    """No API key = no call. We must short-circuit BEFORE constructing the
    model so we don't waste the genai client setup."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    result = await classify_image(b"jpeg-bytes")
    assert result.kind == "menu"
    assert "GEMINI_API_KEY" in (result.reason or "")
    # Confirm we never even built the model.
    fake_genai.GenerativeModel.assert_not_called()
