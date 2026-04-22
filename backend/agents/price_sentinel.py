"""
Price Sentinel Agent — 메뉴·가격에서 바가지 판정

References:
- ADR-002: 한국소비자원 참가격 8품목 한정
- ROADMAP.md D4: price benchmark

Data: 한국소비자원 참가격 외식비 (price.go.kr)
      서울 8개 품목 월별 평균가 (2025-12 기준 스냅샷)
"""
from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class PriceVerdict(str, Enum):
    FAIR = "🟢"      # <= 110% of benchmark
    CAUTION = "🟡"   # 110% < x <= 130%
    SUSPECT = "🔴"   # > 130%
    UNKNOWN = "⚪"   # no benchmark available


class PriceJudgment(BaseModel):
    """Price fairness judgment for a single menu item."""
    dish_name: str
    listed_price: int
    benchmark_price: Optional[int] = Field(None, description="참가격 기준")
    benchmark_source: str = Field("none", description="참가격 | llm_estimate | none")
    ratio: Optional[float] = Field(None, description="listed / benchmark")
    verdict: PriceVerdict
    explanation: str = Field(..., description="사용자용 한 줄 설명")
    confidence: float = Field(0.0, ge=0.0, le=1.0)


# 한국소비자원 참가격 - 서울 평균 (2025-12 기준, 원)
# Source: https://www.price.go.kr/tprice/portal/servicepriceinfo/dineoutprice/
CONSUMER_PRICE_SEOUL_2025 = {
    "김밥": 3700,
    "칼국수": 9846,
    "김치찌개": 8577,      # "김치찌개백반" 기준
    "삼계탕": 18000,
    "냉면": 12100,
    "삼겹살": 21500,        # 200g 기준
    "비빔밥": 11200,
    "자장면": 7692,
}


def match_benchmark(dish_name: str) -> tuple[Optional[str], Optional[int]]:
    """
    메뉴명을 참가격 8품목에 매칭.
    
    Strategy:
    1. Exact substring match
    2. (TODO D4) Fuzzy match with levenshtein
    3. (TODO D4) Embedding similarity fallback
    """
    for key, price in CONSUMER_PRICE_SEOUL_2025.items():
        if key in dish_name:
            return key, price
    return None, None


async def judge_price(dish_name: str, listed_price: int) -> PriceJudgment:
    """
    바가지 판정.
    
    Args:
        dish_name: 메뉴명 (원문)
        listed_price: 메뉴판에 쓰인 가격 (원)
    
    Returns:
        PriceJudgment with verdict color
    """
    matched_key, benchmark = match_benchmark(dish_name)
    
    if benchmark is None:
        return PriceJudgment(
            dish_name=dish_name,
            listed_price=listed_price,
            benchmark_price=None,
            benchmark_source="none",
            ratio=None,
            verdict=PriceVerdict.UNKNOWN,
            explanation="벤치마크 데이터 없음",
            confidence=0.0,
        )
    
    ratio = listed_price / benchmark
    
    if ratio <= 1.10:
        verdict = PriceVerdict.FAIR
        explanation = f"서울 평균 ₩{benchmark:,} 대비 정상가"
    elif ratio <= 1.30:
        verdict = PriceVerdict.CAUTION
        explanation = f"서울 평균 ₩{benchmark:,} 대비 {int((ratio - 1) * 100)}% 비쌈"
    else:
        verdict = PriceVerdict.SUSPECT
        explanation = f"서울 평균 ₩{benchmark:,} 대비 {int((ratio - 1) * 100)}% 높음 — 관광지 가격 의심"
    
    return PriceJudgment(
        dish_name=dish_name,
        listed_price=listed_price,
        benchmark_price=benchmark,
        benchmark_source="참가격",
        ratio=ratio,
        verdict=verdict,
        explanation=explanation,
        confidence=0.85 if matched_key == dish_name else 0.70,
    )


if __name__ == "__main__":
    import asyncio
    # Quick sanity test
    test_cases = [
        ("김치찌개", 9000),     # fair
        ("김치찌개", 12000),    # caution
        ("김치찌개", 15000),    # suspect
        ("떡볶이", 5000),       # unknown (not in 8품목)
    ]
    for name, price in test_cases:
        result = asyncio.run(judge_price(name, price))
        print(f"{result.verdict.value} {name} ₩{price:,}: {result.explanation}")
