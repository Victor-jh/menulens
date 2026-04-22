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


class MenuReadResult(BaseModel):
    """Full result from reading one menu image."""
    items: list[MenuItem]
    ocr_quality: float = Field(..., ge=0.0, le=1.0, description="전체 OCR 품질 점수")
    warnings: list[str] = Field(default_factory=list)


PROMPT_TEMPLATE = """너는 한국 식당 메뉴판 이미지를 읽어 메뉴명과 가격을 추출하는 전문가다.

다음 이미지를 분석해 JSON으로 응답해:

{{
  "items": [
    {{"name": "메뉴명", "price": 8000, "confidence": 0.95, "raw_text": "메뉴판 원문"}},
    ...
  ],
  "ocr_quality": 0.9,
  "warnings": ["흐릿한 부분이 있음" 같은 경고]
}}

규칙:
1. name은 반드시 원문 한국어 그대로 (번역 금지)
2. price는 원화 정수 (₩, 원 기호 제거)
3. 세트 메뉴는 개별 항목으로 분리
4. 가격이 불분명하면 price는 null, confidence는 0.5 이하
5. 메뉴가 아닌 것(공지, 영업시간 등)은 제외
6. JSON만 반환. 설명 금지.
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
            timeout=30.0,
        )
    except asyncio.TimeoutError:
        raise RuntimeError(f"Gemini timeout for {filename}")
    
    try:
        data = json.loads(response.text)
        return MenuReadResult(**data)
    except (json.JSONDecodeError, Exception) as e:
        raise RuntimeError(f"Failed to parse Gemini response: {e}\nRaw: {response.text[:500]}")


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
