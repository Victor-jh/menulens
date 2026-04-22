"""Test Price Sentinel agent."""
import pytest
from backend.agents.price_sentinel import judge_price, PriceVerdict, match_benchmark


@pytest.mark.asyncio
async def test_kimchi_stew_fair():
    """김치찌개 정상가는 🟢"""
    result = await judge_price("김치찌개", 9000)
    assert result.verdict == PriceVerdict.FAIR


@pytest.mark.asyncio
async def test_kimchi_stew_caution():
    """김치찌개 12000원은 🟡 (40%↑)"""
    result = await judge_price("김치찌개", 12000)
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
