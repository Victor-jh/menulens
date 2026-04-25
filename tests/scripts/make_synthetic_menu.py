"""
합성 메뉴판 PNG 생성기 — 실 메뉴판 사진 미수급 시 E2E 검증용.

출력: tests/sample_menus/synthetic_menu.png
각 메뉴 가격은 color verdict 다양성 확보용으로 설계:
  - 김치찌개 12,000원 → 🔴 (참가격 8,577 대비 140%, ADR-007 canary)
  - 삼계탕 18,000원 → 🟢 (참가격 18,000 대비 100%)
  - 돌솥비빔밥 15,000원 → 🔴 (참가격 11,200 대비 134%, alias 매칭)
  - 된장찌개 8,000원 → 🟢 (8품목 외 but dish_profiler로 매칭)
  - 물냉면 14,000원 → 🟡 (참가격 12,100 대비 116%)
  - 짜장면 7,000원 → 🟢 (참가격 7,692 대비 91%, alias→자장면)
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "sample_menus" / "synthetic_menu.png"
OUT.parent.mkdir(parents=True, exist_ok=True)

KOREAN_FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"

W, H = 900, 1200
MARGIN = 60

ITEMS = [
    ("김치찌개",   12000),
    ("삼계탕",     18000),
    ("돌솥비빔밥", 15000),
    ("된장찌개",    8000),
    ("물냉면",     14000),
    ("짜장면",      7000),
]


def main() -> None:
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)

    title_font = ImageFont.truetype(KOREAN_FONT, 56, index=2)  # Bold
    item_font  = ImageFont.truetype(KOREAN_FONT, 44, index=0)
    price_font = ImageFont.truetype(KOREAN_FONT, 44, index=2)  # Bold
    sub_font   = ImageFont.truetype(KOREAN_FONT, 28, index=0)

    title = "오늘의 메뉴"
    d.text((W // 2, 80), title, font=title_font, fill="black", anchor="mm")
    d.text((W // 2, 140), "Today's Menu · 今日のメニュー", font=sub_font, fill="gray", anchor="mm")
    d.line([(MARGIN, 180), (W - MARGIN, 180)], fill="black", width=3)

    y = 240
    for name, price in ITEMS:
        d.text((MARGIN, y), name, font=item_font, fill="black")
        price_str = f"{price:,}원"
        d.text((W - MARGIN, y), price_str, font=price_font, fill="black", anchor="rt")
        y += 100
        d.line([(MARGIN, y - 15), (W - MARGIN, y - 15)], fill="#ddd", width=1)

    d.text((W // 2, H - 80), "세금 포함 · Tax included",
           font=sub_font, fill="gray", anchor="mm")

    img.save(OUT, optimize=True)
    print(f"✅ saved: {OUT}")
    print(f"   size: {OUT.stat().st_size // 1024}KB, dims: {img.size}")
    print(f"   items: {len(ITEMS)}")


if __name__ == "__main__":
    main()
