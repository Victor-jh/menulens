"""Test Price Sentinel agent.

D12 follow-up: `match_benchmark` symbol was renamed `_exact_or_alias_match`
in earlier refactor. The legacy unit test wraps it as `match_benchmark`
adapter so the tests' intent (key + price returned together) still reads.
"""
import pytest
from backend.agents.price_sentinel import (
    judge_price,
    PriceVerdict,
    _exact_or_alias_match,
    _benchmark_for,
)


def match_benchmark(dish_name: str):
    """Adapter: wrap split helpers (key/method + benchmark) into the original
    (key, price) tuple shape this test was written against."""
    key, _method = _exact_or_alias_match(dish_name)
    price = _benchmark_for(key) if key else None
    return key, price


@pytest.mark.asyncio
async def test_kimchi_stew_fair():
    """김치찌개 정상가는 🟢"""
    result = await judge_price("김치찌개", 9000)
    assert result.verdict == PriceVerdict.FAIR


@pytest.mark.asyncio
async def test_kimchi_stew_caution():
    """김치찌개 ~11000원은 🟡 CAUTION (110~130% 구간, ADR-007).

    벤치마크 8,577원. 11000/8577 = 1.282 → CAUTION. 12000원(1.40)은
    >130%라 SUSPECT(🔴) 임계 통과.
    """
    result = await judge_price("김치찌개", 11000)
    assert result.verdict == PriceVerdict.CAUTION


@pytest.mark.asyncio
async def test_kimchi_stew_suspect():
    """김치찌개 15000원 이상은 🔴"""
    result = await judge_price("김치찌개", 15000)
    assert result.verdict == PriceVerdict.SUSPECT


@pytest.mark.asyncio
async def test_unknown_dish():
    """벤치마크 없는 메뉴는 ⚪"""
    result = await judge_price("매운떡볶이특대", 5000)
    assert result.verdict == PriceVerdict.UNKNOWN


def test_benchmark_matching():
    """매칭 로직 테스트"""
    key, price = match_benchmark("김치찌개")
    assert key == "김치찌개"
    assert price == 8577
    
    key, price = match_benchmark("얼큰한 김치찌개")
    assert key == "김치찌개"
    
    key, price = match_benchmark("파스타")
    assert key is None
