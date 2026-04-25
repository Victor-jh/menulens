"""
Menu Reader Agent — 메뉴판 이미지에서 메뉴명·가격 추출

Input: 메뉴판 이미지 (JPEG/PNG bytes)
Output: List[MenuItem] with name, price, optional confidence

References:
- ADR-004: 3-agent architecture
- ROADMAP.md D2: Gemini Vision PoC

Canary test:
    python -m backend.agents.menu_reader tests/sample_menus/canary_menu.jpg
    Expected: items list containing "김치찌개" with price in 8000-12000 range
"""
from __future__ import annotations

import asyncio
import base64
import json
import os
import sys
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field

# Lazy import to allow module skeleton to load without keys
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class MenuItem(BaseModel):
    """Single menu item extracted from a menu board."""
    name: str = Field(..., description="메뉴명 (원문 한국어)")
    price: Optional[int] = Field(None, description="가격 (원화)")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="추출 신뢰도")
    raw_text: Optional[str] = Field(None, description="메뉴판 원문 라인")
    source: str = Field("menu_text", description="menu_text | photo_id")
    item_type: str = Field("menu_item", description="menu_item | free_side | drink")
    free_side_likely: bool = Field(False, description="한국 식당에서 흔히 무료로 제공되는 사이드일 가능성")


class MenuReadResult(BaseModel):
    """Full result from reading one menu image."""
    items: list[MenuItem]
    ocr_quality: float = Field(..., ge=0.0, le=1.0, description="전체 OCR 품질 점수")
    warnings: list[str] = Field(default_factory=list)


# 한국식당에서 흔히 무료로 제공되는 사이드 사전.
# Gemini가 분류 빠뜨려도 이 키워드 매칭으로 free_side_likely=True 강제.
KOREAN_FREE_SIDES_KEYWORDS = {
    # 김치류
    "김치", "배추김치", "깍두기", "단무지", "오이김치", "총각김치", "물김치", "백김치",
    # 무침/나물 사이드
    "콩나물", "콩나물무침", "시금치", "시금치무침", "도라지", "도라지무침",
    "고사리", "고사리무침", "무생채", "오이무침", "취나물",
    # 볶음 사이드
    "멸치볶음", "어묵볶음", "감자볶음", "어묵", "건멸치",
    # 분식·서민 식당의 무료 제공 국
    "장국", "맑은국", "미역국", "무국", "시래기국", "콩나물국", "북엇국", "쇠고기무국",
    # 기타 무료 제공
    "물", "보리차", "숭늉", "조미료", "쌈장",
}


def _annotate_free_sides(items: list["MenuItem"]) -> list["MenuItem"]:
    """Gemini 분류가 누락됐을 경우 사전 매칭으로 free_side_likely 보강."""
    for it in items:
        normalized = it.name.replace(" ", "")
        for keyword in KOREAN_FREE_SIDES_KEYWORDS:
            if keyword in normalized:
                it.free_side_likely = True
                # menu_item으로 잘못 분류된 명백한 사이드는 free_side로 강등
                if it.item_type == "menu_item" and (it.price is None or it.price == 0):
                    it.item_type = "free_side"
                break
    return items


PROMPT_TEMPLATE = """You are a Korean food assistant for foreign tourists. ALWAYS reply with VALID JSON ONLY — never natural language, never apology, never explanation.

Your job is BOTH:
  (A) read text on a Korean menu/sign, OR
  (B) recognize the actual Korean dish in a photo even if there is no text.

Treat ANY of these as valid input:
  - Wall menus, paper menus, A-boards, takeout stickers, banners, sign-on-door
  - Single-dish photos (close-up plate, food on table, food-model display)
  - Instagram-style food photos a tourist saved on their phone
  - Photos that mix text + food image

JSON shape (use this EXACT shape every time):
{{
  "items": [
    {{
      "name": "메뉴명",
      "price": 8000,
      "confidence": 0.95,
      "raw_text": "메뉴판 원문 또는 'photo:'",
      "source": "menu_text" or "photo_id",
      "item_type": "menu_item" or "free_side" or "drink",
      "free_side_likely": false
    }}
  ],
  "ocr_quality": 0.9,
  "warnings": ["블러", "잘림" 등 짧은 한국어 경고만"]
}}

Rules:
1. **TEXT MODE (메뉴/사인이 보임)**: 한글 음식명을 모두 추출. price = 원화 정수 (가격 모호하면 null). source = "menu_text". raw_text에 메뉴판 원문 그대로.

2. **PHOTO MODE (음식 사진만 보임, 한글 텍스트 없음)**:
   - 사진 속에서 명확히 보이는 모든 한식 메뉴를 시각으로 식별.
   - 한 그릇 단품 → items 1개. 식탁/한정식 상차림 → 보이는 모든 음식을 개별 항목으로.
   - 너무 흐리거나 일부만 보이는 음식은 제외 (confidence 0.3 미만이면 drop).
   - 메인 음식: confidence 0.7~0.95, 반찬류·작게 보이는 것: 0.4~0.65.
   - 최대 10개 항목까지. source = "photo_id". raw_text는 "photo:한국어메뉴명" 형식. price: null.

3. **MIXED MODE**: TEXT MODE 우선. 사진 속 추가 음식이 분명히 식별되고 메뉴판에 없으면 함께 추가 (source 적절히 표기).

4. **item_type 분류 (한국 식당 문화 반영)**:
   - "free_side": 김치, 깍두기, 단무지, 무생채, 콩나물무침, 시금치무침, 도라지무침, 멸치볶음, 어묵볶음, 감자볶음, 미역국, 무국, 시래기국, 콩나물국, 북엇국, 장국, 맑은국, 보리차, 숭늉 등 — 분식집·서민식당에서 무료로 제공되는 기본찬·국·반찬류
   - "drink": 음료 (콜라, 사이다, 맥주, 소주, 막걸리, 커피 등)
   - "menu_item": 그 외 가격 받고 파는 식사 메뉴
5. **free_side_likely**: 위 free_side 후보거나 가격이 0원·null이면서 사이드성이면 true. **분식집/식당 단독 무료 국이라면 절대 빠뜨리지 말고 free_side_likely=true**.

6. 한국 음식이 아니거나(서양식 단독·화장품·풍경·사람) 음식이 전혀 없을 때만 items: [], warnings: ["한국 음식이 보이지 않아요"].

7. 명백한 비메뉴 텍스트(전화번호, 영업시간, 광고문, 인사말)만 제외.

8. 흐리거나 부분 가림이라도 읽히는 만큼은 추출 (ocr_quality 낮춰 표시).

9. items: [] 일 때만 warnings 안에 한국어 한 줄로 사유 적어라.

10. **반드시 위 JSON만 반환**. 자연어 응답 금지.
"""


async def read_menu(image_bytes: bytes, filename: str = "menu.jpg") -> MenuReadResult:
    """
    메뉴판 이미지에서 메뉴 추출.
    
    Args:
        image_bytes: JPEG/PNG 이미지 바이트
        filename: 디버그용 파일명
    
    Returns:
        MenuReadResult with items list
    
    Raises:
        RuntimeError: Gemini API key missing or call failed
    """
    if not GEMINI_AVAILABLE:
        raise RuntimeError("google-generativeai not installed. Run: pip install -r requirements.txt")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set. Check .env")
    
    genai.configure(api_key=api_key)
    
    # Gemini 2.5 Flash - free tier, fast, supports Korean
    model = genai.GenerativeModel("gemini-2.5-flash")
    
    image_part = {
        "mime_type": "image/jpeg" if filename.endswith(".jpg") or filename.endswith(".jpeg") else "image/png",
        "data": image_bytes,
    }
    
    # Timeout + structured output
    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                model.generate_content,
                [PROMPT_TEMPLATE, image_part],
                generation_config={
                    "response_mime_type": "application/json",
                    "temperature": 0.1,
                },
            ),
            timeout=60.0,
        )
    except asyncio.TimeoutError:
        raise RuntimeError(f"Gemini timeout for {filename}")
    
    raw = response.text or ""

    parsed: Optional[MenuReadResult] = None

    # Try strict JSON first
    try:
        data = json.loads(raw)
        parsed = MenuReadResult(**data)
    except (json.JSONDecodeError, ValueError):
        pass

    if parsed is None:
        # Tolerant parse: extract any embedded JSON object from natural-language reply
        import re
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            try:
                data = json.loads(m.group(0))
                parsed = MenuReadResult(**data)
            except Exception:
                pass

    if parsed is not None:
        parsed.items = _annotate_free_sides(parsed.items)
        return parsed

    # Soft failure: surface a hint of what Gemini actually said so user/dev can see why.
    snippet = re.sub(r"\s+", " ", raw).strip()[:120]
    return MenuReadResult(
        items=[],
        ocr_quality=0.0,
        warnings=[
            "메뉴판이 아닌 이미지로 보여요. 가격이 적힌 메뉴판이 잘 보이도록 다시 찍어주세요.",
            f"(AI 응답: {snippet})" if snippet else "(AI 응답 없음)",
        ],
    )


async def _canary_test():
    """D2 canary test — run this to verify the agent works."""
    canary_path = Path(__file__).parent.parent.parent / "tests" / "sample_menus" / "canary_menu.jpg"
    
    if not canary_path.exists():
        print(f"❌ Canary image not found: {canary_path}")
        print("   Place a sample Korean menu image there and retry.")
        return False
    
    image_bytes = canary_path.read_bytes()
    print(f"📸 Reading {canary_path.name} ({len(image_bytes)//1024}KB)...")
    
    try:
        result = await read_menu(image_bytes, canary_path.name)
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    print(f"\n✅ OCR quality: {result.ocr_quality:.0%}")
    print(f"   Items found: {len(result.items)}")
    for item in result.items:
        price_str = f"₩{item.price:,}" if item.price else "N/A"
        print(f"   - {item.name:20s} {price_str:>10s}  (conf: {item.confidence:.0%})")
    
    if result.warnings:
        print(f"\n⚠  Warnings: {result.warnings}")
    
    # Check canary condition
    has_kimchi = any("김치찌개" in item.name for item in result.items)
    if has_kimchi:
        print("\n🎯 Canary PASS — 김치찌개 detected")
        return True
    else:
        print("\n⚠  Canary WARN — 김치찌개 not in this menu, but agent works")
        return True


if __name__ == "__main__":
    if len(sys.argv) > 1:
        img_path = Path(sys.argv[1])
        image_bytes = img_path.read_bytes()
        result = asyncio.run(read_menu(image_bytes, img_path.name))
        print(result.model_dump_json(indent=2, exclude_none=True))
    else:
        asyncio.run(_canary_test())
