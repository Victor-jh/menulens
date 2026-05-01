"""
Image Classifier — Hermes router agent.

Single Gemini Vision call that classifies the uploaded image into one of
four kinds, so the FastAPI dispatcher can route to the correct downstream
agent without making the user pick a "menu vs photo" mode by hand.

Design contract
---------------
- Input:  image bytes (JPEG/PNG/WEBP)
- Output: ImageClassification {kind, confidence, main_dish_ko?, detected_dishes_ko?, reason?}
- One call only — caller is responsible for calling downstream agents.
- Fail-safe default: kind="menu" (the existing flow handles edge cases best).

Why a separate classifier instead of folding into menu_reader?
- menu_reader is now ~50 lines of careful TEXT-MODE-vs-PHOTO-MODE prompt logic.
  Mixing in the new "is this a food photo?" decision would re-introduce the
  ambiguity we just engineered out of menu_reader.
- A small dedicated classifier is easier to evolve independently and easier
  to swap (e.g., to a cheaper model or a local CV model) later.

Latency budget: 1 Gemini Flash call ≈ 700ms-1.5s. Acceptable on top of the
8-12s analysis pipeline — single dispatch decision saves the user a
miss-mode-toggle round-trip (~30s if they go back, retry).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Literal, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_REPO_ROOT / "backend" / ".env")

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None  # type: ignore


ImageKind = Literal["menu", "single_dish", "table_with_dishes", "not_food"]


class ImageClassification(BaseModel):
    """Output of the Hermes router classifier."""

    kind: ImageKind
    confidence: float = Field(ge=0.0, le=1.0)
    # Only set for single_dish / table_with_dishes:
    main_dish_ko: Optional[str] = None
    detected_dishes_ko: Optional[list[str]] = None
    # Free-text rationale shown only in debug overlays / proposal evidence.
    reason: Optional[str] = None


_SYSTEM = """You are an image-kind classifier for a Korean restaurant assistant app.

Look at the image and decide ONE of these kinds:

  "menu"               — printed/handwritten menu with prices visible.
                          Includes 분식 wall menus with 60-100 items.
                          A menu board with a few decorative food photos in
                          the corner is STILL a menu.

  "single_dish"        — one cooked dish on a plate/bowl (close-up shot,
                          delivery photo, instagram food shot, restaurant
                          plating). NO prices visible, NO menu list.

  "table_with_dishes"  — multiple cooked dishes on a table (banchan spread,
                          BBQ table, group dining shot). NO prices, NO menu list.

  "not_food"           — receipt, business card, ID, sign without menu,
                          shopping list, person, scenery, blurry/black
                          beyond OCR, or otherwise not a Korean restaurant
                          menu OR food photo.

CRITICAL DECISION RULES (apply in order):

  STEP 1. Scan the WHOLE image for ANY printed text that looks like menu
          items (Korean dish names + prices like "₩8,000" or "8000원").
  STEP 2. If you find 3+ such lines anywhere on the image → kind = "menu".
          This holds EVEN IF the image also contains:
            • decorative food photos at the bottom or in panels
            • a partial photo of a real table with dishes
            • prominent food imagery used as menu decoration
          Korean 분식집 wall menus ROUTINELY combine a 60-100 item text
          list WITH 3-5 large decorative food photos. These are STILL menus.
          Do NOT classify such images as "table_with_dishes".
  STEP 3. Only if Step 2 finds NO printed price list anywhere in the image,
          decide between single_dish / table_with_dishes / not_food based
          on what's visually present.

When uncertain between menu vs anything else → prefer "menu" (the downstream
menu_reader handles edge cases best).

For single_dish / table_with_dishes only, also fill `main_dish_ko` with
the most prominent Korean dish name (e.g., "비빔밥", "삼겹살"). Use Korean
even if the photo originated outside Korea.

For table_with_dishes only, fill `detected_dishes_ko` with up to 5 names.

Confidence: 0.95+ when obvious, 0.70-0.90 when reasonable, <0.70 when
genuinely unsure. Confidence under 0.70 falls back to menu mode.

Reply with VALID JSON ONLY (no prose, no markdown fences) shape:
{
  "kind": "menu" | "single_dish" | "table_with_dishes" | "not_food",
  "confidence": 0.0..1.0,
  "main_dish_ko": "..." or null,
  "detected_dishes_ko": ["...", "..."] or null,
  "reason": "한 줄 한국어 사유"
}
""".strip()


_PROMPT = """Image attached. Apply the SYSTEM rules. Reply with valid JSON only."""


_DEFAULT = ImageClassification(
    kind="menu",
    confidence=0.0,
    reason="classifier_unavailable_or_failed",
)


async def classify_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> ImageClassification:
    """
    Hermes router classification.

    Returns kind="menu" with confidence=0.0 on any error — the dispatcher
    interprets low confidence as "fall back to existing menu_reader flow",
    so we never leave the user with a hung request just because the
    classifier had a network blip.
    """
    if genai is None:
        return _DEFAULT.model_copy(update={"reason": "google.generativeai not installed"})

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return _DEFAULT.model_copy(update={"reason": "GEMINI_API_KEY missing"})

    genai.configure(api_key=api_key)

    # gemini-2.5-flash is the smallest vision-capable model and has the
    # cheapest latency per call. Same as menu_reader uses.
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=_SYSTEM,
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.1,
            # 256 was too tight when the model occasionally enumerated
            # menu items into detected_dishes_ko (truncating to invalid JSON).
            # 512 leaves headroom; the structured response itself is small.
            "max_output_tokens": 512,
        },
    )

    try:
        resp = await model.generate_content_async(
            [
                _PROMPT,
                {"mime_type": mime_type, "data": image_bytes},
            ]
        )
        text = (resp.text or "").strip()
        if not text:
            return _DEFAULT.model_copy(update={"reason": "empty response"})
        data = json.loads(text)
        # Coerce confidence and validate kind
        kind = data.get("kind", "menu")
        if kind not in ("menu", "single_dish", "table_with_dishes", "not_food"):
            kind = "menu"
        conf = float(data.get("confidence", 0.0) or 0.0)
        conf = max(0.0, min(1.0, conf))
        main = data.get("main_dish_ko") or None
        if main is not None and not isinstance(main, str):
            main = None
        detected = data.get("detected_dishes_ko") or None
        if detected is not None and not isinstance(detected, list):
            detected = None
        elif isinstance(detected, list):
            detected = [str(d)[:60] for d in detected if d][:5]
        reason = data.get("reason") or None
        if reason is not None and not isinstance(reason, str):
            reason = None
        elif isinstance(reason, str):
            reason = reason[:200]
        return ImageClassification(
            kind=kind,  # type: ignore[arg-type]
            confidence=conf,
            main_dish_ko=main,
            detected_dishes_ko=detected,
            reason=reason,
        )
    except json.JSONDecodeError as e:
        return _DEFAULT.model_copy(update={"reason": f"json decode: {str(e)[:80]}"})
    except Exception as e:  # noqa: BLE001
        return _DEFAULT.model_copy(update={"reason": f"classifier error: {str(e)[:80]}"})


# Standalone manual canary
if __name__ == "__main__":  # pragma: no cover
    import asyncio
    import sys

    if len(sys.argv) < 2:
        print("usage: python -m backend.agents.image_classifier <image_path>")
        sys.exit(1)
    path = Path(sys.argv[1])
    img = path.read_bytes()
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    result = asyncio.run(classify_image(img, mime))
    print(result.model_dump_json(indent=2))
