"""
Verdict Agent — DishProfile × UserProfile × PriceJudgment → 최종 색깔 판정.

References:
- ADR-002 · ADR-007: 가격 임계값
- ROADMAP D5: 사용자 프로필 × 알레르기 × 가격 → 🟢🟡🔴
- docs/research/05_한식800선_정제스펙.md §3.2 halal_likely 주의사항

결정 트리 우선순위 (higher = more severe):
  4. 🔴 allergen_conflict      — 사용자 알레르기 ∩ 메뉴 알레르기
  3. 🔴 religion_conflict      — 무슬림 × haram | 코셔 × 비-코셔 미구현
  3. 🔴 diet_hard_conflict     — vegan × non_veg (고기·해물 포함)
  2. 🟡 diet_soft_conflict     — vegan × vegetarian (계란·유제품 포함)
  2. 🟡 price_caution          — 110~130% (ADR-007)
  2. 🔴 price_suspect          — >130% (ADR-007)
  1. 🟢 all clear
  0. ⚪ unknown                 — hansik_800 미매칭 + 가격 벤치마크 없음

여러 사유 중 가장 높은 severity 채택. reasons 리스트로 전부 보고.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from backend.agents.dish_profiler import DishProfile
from backend.agents.price_sentinel import PriceJudgment, PriceVerdict


class FinalColor(str, Enum):
    GREEN = "🟢"
    YELLOW = "🟡"
    RED = "🔴"
    UNKNOWN = "⚪"


_SEVERITY = {
    FinalColor.UNKNOWN: 0,
    FinalColor.GREEN: 1,
    FinalColor.YELLOW: 2,
    FinalColor.RED: 3,
}


class UserProfile(BaseModel):
    """온보딩 1회로 수집되는 사용자 선호."""
    language: str = Field("en", description="UI 언어 ko/en/ja/zh-Hans/zh-Hant")
    allergies: list[str] = Field(default_factory=list, description="14종 중 피하는 것: pork/beef/chicken/... ")
    religion: Optional[str] = Field(None, description="halal | kosher | none")
    diet: Optional[str] = Field(None, description="vegan | vegetarian | pescatarian | none")


class VerdictResult(BaseModel):
    color: FinalColor
    reasons: list[str] = Field(default_factory=list, description="사용자용 사유 (가장 severe 순)")
    trigger_flags: list[str] = Field(default_factory=list, description="프로그램 분류용: allergen_conflict 등")


def _color_for_price(pj: Optional[PriceJudgment]) -> tuple[FinalColor, Optional[str], Optional[str]]:
    """PriceJudgment → (color, reason_ko, flag) 변환."""
    if pj is None:
        return FinalColor.UNKNOWN, None, None
    map_ = {
        PriceVerdict.FAIR:    (FinalColor.GREEN,  None,            None),
        PriceVerdict.CAUTION: (FinalColor.YELLOW, pj.explanation,  "price_caution"),
        PriceVerdict.SUSPECT: (FinalColor.RED,    pj.explanation,  "price_suspect"),
        PriceVerdict.UNKNOWN: (FinalColor.UNKNOWN, None,           None),
    }
    return map_[pj.verdict]


def decide(
    dish: DishProfile,
    price: Optional[PriceJudgment],
    profile: UserProfile,
) -> VerdictResult:
    """
    최종 색깔 결정. 여러 사유 중 가장 severe 한 색을 채택.
    reasons 리스트에는 발견된 모든 이슈를 severity 내림차순으로 담는다.
    """
    results: list[tuple[FinalColor, str, str]] = []  # (color, reason, flag)

    # 1. 알레르기 교집합 (🔴)
    user_set = set(profile.allergies or [])
    dish_set = set(dish.allergens or [])
    conflict = sorted(user_set & dish_set)
    if conflict:
        results.append((
            FinalColor.RED,
            f"알레르기 충돌: {', '.join(conflict)}",
            "allergen_conflict",
        ))

    # 2. 종교 (🔴) — halal 우선 구현, 구체 재료 명시 (Ahmed 페르소나 대응)
    if profile.religion == "halal" and not dish.halal_safe:
        # dish.allergens 에서 haram 트리거 재료만 나열
        haram_trigger = sorted({a for a in (dish.allergens or []) if a in {"pork", "alcohol"}})
        trigger_str = "/".join(haram_trigger) if haram_trigger else "unclear ingredients"
        results.append((
            FinalColor.RED,
            f"Not halal — contains {trigger_str}. KMF certification required for full assurance.",
            "religion_conflict",
        ))
    elif profile.religion == "kosher":
        # D5 Phase 1 미구현 — 프로필만 받고 색 영향 없음
        pass

    # 3. 식단 (🔴/🟡) — vegan / vegetarian / pescatarian
    _MEAT = {"pork", "beef", "chicken"}
    _SEA = {"seafood", "fish", "shellfish"}
    dish_has_meat = bool(dish_set & _MEAT)
    dish_has_sea = bool(dish_set & _SEA)

    if profile.diet == "vegan":
        if not dish.vegan_safe:
            if dish.vegetarian_safe:
                # vegan 유저인데 메뉴는 lacto-ovo — 🟡 경고
                blocker = sorted({a for a in dish_set if a in {"egg", "dairy"}}) or ["egg/dairy"]
                results.append((
                    FinalColor.YELLOW,
                    f"Not vegan — contains {', '.join(blocker)}",
                    "diet_soft_conflict",
                ))
            else:
                blocker = sorted(dish_set & (_MEAT | _SEA)) or ["animal ingredients"]
                results.append((
                    FinalColor.RED,
                    f"Not vegan — contains {', '.join(blocker)}",
                    "diet_hard_conflict",
                ))
    elif profile.diet == "vegetarian":
        if not dish.vegetarian_safe:
            blocker = sorted(dish_set & (_MEAT | _SEA)) or ["meat/seafood"]
            results.append((
                FinalColor.RED,
                f"Not vegetarian — contains {', '.join(blocker)}",
                "diet_hard_conflict",
            ))
    elif profile.diet == "pescatarian":
        # pescatarian: seafood/fish OK, meat 불가
        if dish_has_meat:
            blocker = sorted(dish_set & _MEAT)
            results.append((
                FinalColor.RED,
                f"Not pescatarian — contains {', '.join(blocker)}",
                "diet_hard_conflict",
            ))

    # 4. 가격
    price_color, price_reason, price_flag = _color_for_price(price)
    if price_reason:
        results.append((price_color, price_reason, price_flag))
    elif price_color is FinalColor.GREEN:
        # 정상가지만 reason 안 담음 (사용자에게 노이즈)
        pass

    # 결정: severity 최대
    if not results:
        # dish 자체가 unknown (hansik_800 미매칭) 이고 가격도 unknown
        if dish.source == "unknown" and (price is None or price.verdict == PriceVerdict.UNKNOWN):
            return VerdictResult(color=FinalColor.UNKNOWN, reasons=["정보 부족"], trigger_flags=["no_data"])
        return VerdictResult(color=FinalColor.GREEN, reasons=[], trigger_flags=[])

    results.sort(key=lambda t: -_SEVERITY[t[0]])
    top_color = results[0][0]
    return VerdictResult(
        color=top_color,
        reasons=[r for _, r, _ in results],
        trigger_flags=[f for _, _, f in results],
    )


if __name__ == "__main__":
    # D5 canary 테스트 (dish_profiler 없이 모형 DishProfile로 독립 검증)
    from backend.agents.price_sentinel import PriceJudgment, PriceVerdict

    def make_dish(name, allergens, halal, vegan, vegetarian, source="official_db"):
        return DishProfile(
            name_ko=name, name_translated=name, description="",
            allergens=allergens, halal_safe=halal,
            vegan_safe=vegan, vegetarian_safe=vegetarian,
            source=source,
        )

    def make_price(verdict, listed, benchmark=10000):
        return PriceJudgment(
            dish_name="", listed_price=listed, benchmark_price=benchmark,
            benchmark_source="참가격", ratio=listed/benchmark,
            verdict=verdict, explanation=f"ratio={listed/benchmark:.2f}",
            match_method="exact", match_confidence=0.95,
        )

    samurian = UserProfile(allergies=[], religion="halal", diet=None)
    vegan_user = UserProfile(allergies=[], diet="vegan")
    peanut_user = UserProfile(allergies=["peanut"], diet=None)
    normal = UserProfile()

    samgye = make_dish("삼계탕", ["chicken", "nuts"], halal=True, vegan=False, vegetarian=False)
    kimchi = make_dish("김치찌개", ["pork", "seafood", "soy"], halal=False, vegan=False, vegetarian=False)
    doenjang = make_dish("된장찌개", ["seafood", "soy"], halal=True, vegan=False, vegetarian=False)

    cases = [
        ("무슬림 + 김치찌개(돼지)", samurian, kimchi, make_price(PriceVerdict.FAIR, 9000, 8577),
         FinalColor.RED, "religion_conflict"),
        ("무슬림 + 삼계탕(할랄)", samurian, samgye, make_price(PriceVerdict.FAIR, 18000, 18000),
         FinalColor.GREEN, None),
        ("비건 + 김치찌개", vegan_user, kimchi, make_price(PriceVerdict.FAIR, 9000, 8577),
         FinalColor.RED, "diet_hard_conflict"),
        ("비건 + 된장찌개(seafood)", vegan_user, doenjang, make_price(PriceVerdict.FAIR, 8000, 8000),
         FinalColor.RED, "diet_hard_conflict"),
        ("땅콩 알레르기 + 삼계탕(nuts)", peanut_user, samgye, make_price(PriceVerdict.FAIR, 18000, 18000),
         FinalColor.GREEN, None),  # peanut ≠ nuts (표준 분리)
        ("일반인 + 김치찌개 12000원", normal, kimchi, make_price(PriceVerdict.SUSPECT, 12000, 8577),
         FinalColor.RED, "price_suspect"),
        ("일반인 + 김치찌개 10500원", normal, kimchi, make_price(PriceVerdict.CAUTION, 10500, 8577),
         FinalColor.YELLOW, "price_caution"),
    ]
    print(f"{'케이스':40s} {'기대':4s} {'실제':4s} {'트리거':30s} 사유")
    print("-" * 120)
    all_pass = True
    for desc, prof, dish, price, exp_color, exp_flag in cases:
        r = decide(dish, price, prof)
        ok = r.color == exp_color and (exp_flag is None or exp_flag in r.trigger_flags)
        all_pass &= ok
        mark = "✅" if ok else "❌"
        flags = ",".join(r.trigger_flags) or "—"
        reason = r.reasons[0] if r.reasons else ""
        print(f"{mark} {desc:38s} {exp_color.value:4s} {r.color.value:4s} {flags:30s} {reason}")
    print("-" * 120)
    print("🎯 D5 Canary:", "PASS" if all_pass else "FAIL")
