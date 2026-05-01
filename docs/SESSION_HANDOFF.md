# 다음 Claude Code 세션 핸드오프

> 5분 안에 따라잡는 단일 요약. 이거 + CONTEXT.md + FAILURES.md + ROADMAP.md만 읽으면 OK.

마지막 업데이트: **2026-05-02 (D12 end · 25:04 KST)**

---

## ⚡ 다음 세션 즉시 실행 (3 commands)

```bash
# 1. 라이브 stack health
curl -sf --max-time 10 https://menulens-app.vercel.app -o /dev/null -w "Vercel %{http_code} TTFB=%{time_starttransfer}s\n"
curl -sf --max-time 10 https://menulens-backend.onrender.com/health

# 2. CI status
gh run list --workflow ci --repo Victor-jh/menulens --limit 1

# 3. Prod E2E smoke (32s)
MENULENS_API=https://menulens-backend.onrender.com python3 -m pytest tests/test_smoke_e2e.py -v -k "not warm"
```

세 가지 모두 green이면 stack 안전. 사용자에게 "오늘 무엇을 진행할까요?" 물어보면 됨.

---

## 📍 현재 위치

- 날짜: **D12 end (2026-05-02 토 25:04)**
- **제출 마감 (D16, 2026-05-06 수 16:00): 약 87 시간 남음**
- 코드/배포: **사실상 동결.** v2 single path, 디자이너 P0/P1 audit 7건 모두 fix, CI 28/28 green.
- **자체 평가 90/100** (D3 67 → D11 80 → D12 84 → D12 final 90, +6 by D12 polish)
- 사용자가 끝내야 할 것: 시연 영상, Reddit 글, HWP 변환, 제출 (`docs/submission/checklist.md` D13~D16 일자별)

## 🚀 라이브 stack (`76b173b` head)

- Frontend: https://menulens-app.vercel.app (deployment `menulens-7s692qma6`)
- Backend:  https://menulens-backend.onrender.com (commit `cd46bc5`, latest backend code)
- GitHub:   https://github.com/Victor-jh/menulens (origin/main `76b173b`)
- CI:       GitHub Actions ci.yml — 첫 run SUCCESS (28/28 unit + frontend build)
- Keep-alive: GH Actions cron `*/13 * * * *` (Render free tier sleep 방지)
- 4 페르소나 prod 검증: Yui (D8 36/36) · Aisha (D9 KMF) · Chen (D11 chestnut/nuts) · Mike (TrustFooter)
- 스모크 7/7 PASS on prod (`tests/test_smoke_e2e.py`)
- Perf D12 측정: Vercel TTFB 76ms warm (방금 측정) / Render `/health` 144ms / HTML 12.2KB

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

**D12 (`a8469f4` → `76b173b`, 6 commits)**
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
- **CI + 23 unit tests** (verdict 9 + classifier 7 + profiler 7) — first run SUCCESS
- **proposal_appendix.md (185L)** + main 5쪽 fit, **submission/checklist.md** D13~D16, **demo_smoke_test.md**
- **3 신규 ADR** (Hermes 015, _lod_shared 016, v1 deprecation 017) + ADR-009 중복 → ADR-007 정정
- **CHANGELOG.md** Keep a Changelog 형식
- **README 8 badges** (CI · Live · Tests · WCAG · Personas 등)
- **proposal §4.3 4-trail 수익 모델** (Free / 외국인 $4.99 / B2B 월 ₩9.9k~29.9k / KTO 라이선스) — Year-1 ARR ₩2~3천만 시나리오
- **proposal §1.2 외국인 quote 2건** (r/koreatravel + KTO 인니방한단)
- **docs/diagrams/hermes_router.svg** (920×600, Friendly 팔레트)
- **proposal §3.3 perf metric** 추가 (TTFB·HTML·CI 28/28)

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
3. `DECISIONS.md` (17 ADRs) — 왜 이렇게?
4. Backend log: Render dashboard or `curl /health`
5. Smoke 재실행: `python -m pytest tests/test_smoke_e2e.py -v` (BASE_URL=prod 가능)

---

## 📅 다음 세션이 만날 가능성 높은 3가지 시나리오

### 시나리오 A — 사용자가 D13/D14 작업 중 도움 요청
- **사용자 작업 진행도 먼저 확인**: 시연 영상 촬영 완료? Reddit 게시했나? HWP 변환 시작?
- **체크리스트 참조**: `docs/submission/checklist.md` — D13~D16 일자별 step
- **Pre-shoot smoke**: `docs/demo_smoke_test.md` — 영상 촬영 직전 5분 점검
- **HWP 변환**: `docs/submission/hwp_conversion_plan.md` (existing) — 한글 PC 작업 절차

### 시나리오 B — prod 이슈 (LOD outage 등)
- **stale-cache 자동 작동** 중일 가능성 높음 — 친화 메시지 노출 OK
- **cache prime**: `curl 'https://menulens-backend.onrender.com/restaurants/by_dish?dish_ko=비빔밥'` 1회 실행
- **Render 재시작**: 대시보드 → Manual Deploy
- **CI fail 알림**: `gh run list --workflow ci --limit 1` → fail 보면 commit + 로컬 reproduce

### 시나리오 C — 추가 polish 또는 새 기능 요청
- **자체 평가 90/100**의 약점 = 발전성 14/20·완성도 25/30 (`docs/review_proposal_scorecard.md`)
- **남은 후보** (사용자 요청 시):
  - pitch_deck에 SVG embed (현재 ASCII)
  - `tests/test_smoke_e2e.py`에 Hermes router 자동 분류 테스트 추가
  - `proposal §1.1` LSTM 예측 그래프 SVG화
  - Detail 페이즈 신규 (Hermes single_dish UX 풍부한 메타)
  - v1 OrderSheet/ReviewSheet → v2화 (현재 v2 cream과 시각 정합 안 됨)

---

## 🚦 의사결정 가이드 (next-session Claude를 위한)

- **사용자 명시 승인 필요**: push to main, OAuth, 결제, 외부 API 키 추가, 파일 영구 삭제 (git rm), proposal 5쪽 한도 초과 변경
- **자동 진행 OK**: 추가 docstring, 테스트 추가, README 정정, comment 보강, lint fix
- **모르겠으면 물어봐**: 평가 직결 변경(문장 수정·SVG 색·표 구조)은 사용자 의도 확인 후
- **반드시 거부**: D14 이후 코드 변경 (제출 안정성 우선), v1 fallback 복구, 디자인 톤 전면 변경 (해도 1줄 폴리시 수준)
