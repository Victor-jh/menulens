"""
FX rates — KRW → user's home currency.

Source: ECB via frankfurter.app (no API key, daily updates).
Cached in-process for 6 hours.
"""
from __future__ import annotations

import asyncio
import time
from typing import Optional

import httpx

# user language → preferred quote currency
LANG_TO_CCY = {
    "en": "USD",
    "ja": "JPY",
    "zh-Hans": "CNY",
    "zh-Hant": "TWD",
    "ko": "KRW",
}

# Symbols used for prefix in UI
CCY_SYMBOL = {
    "KRW": "₩",
    "USD": "$",
    "JPY": "¥",
    "CNY": "¥",
    "TWD": "NT$",
    "EUR": "€",
    "GBP": "£",
}

_TTL_SECONDS = 6 * 3600
_CACHE: dict[str, tuple[float, float]] = {}  # ccy -> (timestamp, rate-per-1-KRW)
_LOCK = asyncio.Lock()


async def _fetch_rate(target_ccy: str) -> Optional[float]:
    """
    Returns: how many `target_ccy` units equal 1 KRW (e.g. KRW→USD ≈ 0.00073).
    frankfurter.app uses ECB rates and does NOT support KRW as base.
    Strategy: fetch USD→{KRW, target} in one call, derive KRW→target via cross-rate.
    """
    target_ccy = target_ccy.upper()
    if target_ccy == "KRW":
        return 1.0
    # Use USD as the cross currency (always supported by frankfurter)
    base = "USD"
    needed = ",".join(sorted({"KRW", target_ccy}))
    url = f"https://api.frankfurter.dev/v1/latest?base={base}&symbols={needed}"
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
            rates = data.get("rates", {})
            usd_to_krw = rates.get("KRW")
            usd_to_target = rates.get(target_ccy) if target_ccy != base else 1.0
            if not usd_to_krw or not usd_to_target:
                return None
            # KRW→target = (USD→target) / (USD→KRW)
            return float(usd_to_target) / float(usd_to_krw)
    except Exception:
        return None


async def krw_to(amount_krw: int, target_ccy: str) -> Optional[dict]:
    """Convert KRW to target currency, returning {ccy, amount, rate, symbol}."""
    target_ccy = target_ccy.upper()
    if target_ccy == "KRW":
        return {
            "ccy": "KRW",
            "amount": amount_krw,
            "rate": 1.0,
            "symbol": CCY_SYMBOL["KRW"],
        }
    now = time.time()
    async with _LOCK:
        cached = _CACHE.get(target_ccy)
        if not cached or now - cached[0] > _TTL_SECONDS:
            rate = await _fetch_rate(target_ccy)
            if rate is None:
                return None
            _CACHE[target_ccy] = (now, rate)
        rate = _CACHE[target_ccy][1]
    converted = amount_krw * rate
    return {
        "ccy": target_ccy,
        "amount": round(converted, 2),
        "rate": rate,
        "symbol": CCY_SYMBOL.get(target_ccy, target_ccy + " "),
    }


def ccy_for_language(language: str) -> str:
    return LANG_TO_CCY.get(language, "USD")
