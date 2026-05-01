# 다음 Claude Code 세션 핸드오프

> 5분 안에 따라잡는 단일 요약. 이거 + CONTEXT.md + FAILURES.md + ROADMAP.md만 읽으면 OK.

마지막 업데이트: **2026-05-02 (D12 end)**

---

## 📍 현재 위치

- 날짜: D12 (2026-05-02 토)
- **제출 마감 (D16, 2026-05-06 수 16:00): 4일 남음**
- 코드/배포: **사실상 동결.** v2 single path, 디자이너 P0/P1 audit 7건 모두 fix.
- 자체 평가 ~8.7/10 (Usability 9.0 / A11y 8.0 / Readability 8.5 / Maintainability 8.5 / Test 7.0)
- 사용자가 끝내야 할 것: 시연 영상, Reddit 글, HWP 변환, 제출.

## 🚀 라이브 stack

- Frontend: https://menulens-app.vercel.app (deployment `menulens-7s692qma6`)
- Backend: https://menulens-backend.onrender.com (commit `cd46bc5`)
- GitHub: https://github.com/Victor-jh/menulens (origin/main `5db8b0b`)
- Keep-alive: GH Actions cron `*/13 * * * *` (Render free tier sleep 방지)
- 4 페르소나 prod 검증: Yui (D8 36/36) · Aisha (D9 KMF) · Chen (D11 chestnut/peanut) · Mike (TrustFooter)
- 스모크 7/7 PASS on prod (`tests/test_smoke_e2e.py`)

## 🛠 오늘 (D11+D12) 작업한 것 — terse

**D11 (커밋 다수)**
- v2 디자인 적용 (Friendly/Pickle Plus 톤, mobile 4 화면)
- `flag.ts` `trim()` 버그픽스 — `vercel env add`가 `"v2\n"` 저장해서 v1 fallback
- NearbyRestaurants 4 perf fix: localStorage geo cache + parallel fire + 2.5s timeout + 수동 refresh
- LOD outage resilience: 1-retry+250ms backoff + stale-cache
- skeleton loading + 크림 테마 + 한글 헤더
- Hermes router agent (Phase 1+2): image_classifier + parallel dispatch + dish_finder LOD bestMenu reverse
- NOT-A-MENU rejection (backend system_instruction + frontend handler)
- TrustFooter on ResultsV2 (KFPI/KCA/TourAPI/Gemini 4 source 인용)
- WCAG AA color fix (4 text + pickleStrong CTA bg) + global `:focus-visible`
- proposal compression: §3.3 → `docs/proposal_appendix.md` (185L), 본문 370→312L
- E2E smoke 8 cases (`tests/test_smoke_e2e.py`)
- ResultsV2 1036→451L (parts/ 분리: FriendlyCard, RestaurantsServingThisDish, TrustFooter)
- 백엔드 agent docstrings (tour_api, dish_finder, dish_storyteller)

**D12 (`cd46bc5`, `5db8b0b`)**
- v1 컴포넌트 전부 삭제 — Onboarding 226L + Upload 230L + Results 1013L + flag.ts 19L = **1488L 제거**
- MenuLensApp v1/v2 ternary 제거 → v2 single path
- `_lod_shared.py` (121L) 신규 — tour_lod·dish_finder가 import (private import 안티패턴 해소)
- 디자인 expert audit P0×3 + P1×4 모두 fix:
  - P0-1: trigger_flags raw English leak ("Contains diet_hard_conflict")
  - P0-2: free-side false positive (김치찌개·물냉면 substring "in" → flagged Free)
  - P0-3: 짜장면 → "Stir-fried Glass Noodles · Japchae" (RAG nearest-neighbour to 잡채)
  - P0-4: Free banchan + ✋ AVOID 색 모순
  - P1: body cream bg, ShowStaff 13→15px, PillTab 44px touch
- Prod canary 통과: jajang_trans=Black Bean Noodles, free_main_falsepos=0

## 🧠 다음 세션이 처음 보면 알아야 할 것 (Top 5)

1. **v2 only.** v1 컴포넌트는 D12에 모두 삭제됐다. `flag.ts` 없음. `MenuLensApp`은 분기 없는 단일 경로. 되돌리지 말 것.
2. **prod 배포는 동결.** 코드 추가 변경은 사용자 승인 필요. 남은 4일은 **사용자가** 영상·Reddit·HWP를 처리한다.
3. **Hermes router agent** (`backend/agents/hermes_router.py`)가 image_classifier로 메뉴/요리/QR/NOT-A-MENU 분기 → parallel dispatch. dish_finder는 LOD bestMenu reverse lookup.
4. **공유 LOD util은 `backend/agents/_lod_shared.py`.** tour_lod·dish_finder 양쪽이 여기서 import. `from .tour_lod import _internal` 같은 private import 금지 (D12 정리됨).
5. **proposal 본문 312L + appendix 185L 분리.** D14 HWP 변환 시 본문만 5쪽 변환, appendix는 GitHub link.

## 🚧 절대 반복 금지 함정 (FAILURES.md 25개 중 핵심 5개)

1. **iOS Safari `display:none` input click() 차단** → 항상 `<label>` + `sr-only`.
2. **Phase 분리로 컴포넌트 unmount → state 유실** → busy overlay 패턴, "loading" phase 분리 금지.
3. **`vercel env add`가 trailing newline 저장** (`"v2\n"`) → 모든 env value에 `.trim()` 적용. (D11 20번 함정)
4. **dish_finder/tour_lod 간 private import** → 양쪽이 `_lod_shared.py`에서 import. (D12 정리)
5. **RAG nearest-neighbour 오역** (짜장면→잡채) → dish_profiler에 명시적 alias map + threshold gate. (D12 P0-3)

이전 세션에서 다룬 Hard Gate 77/80 OCR, LOD SPARQL canary 등은 **ROADMAP D8** 참조.

## 🆘 막혔을 때

1. `CONTEXT.md` — 본질 복귀
2. `FAILURES.md` (25 entries) — 같은 함정?
3. `DECISIONS.md` — 왜 이렇게?
4. Backend log: Render dashboard or `curl /health`
5. Smoke 재실행: `python -m pytest tests/test_smoke_e2e.py -v` (BASE_URL=prod 가능)
