# Changelog

> All notable changes to MenuLens.
> Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · semver-ish (D-day = sprint day).

---

## [D12] — 2026-05-02

### Added
- **GitHub Actions CI workflow** (`.github/workflows/ci.yml`) — pytest 28/28 + `next build` on every push/PR.
- **3 backend unit-test files** (181+147+96 = 424 lines) — `test_verdict.py` (9 cases), `test_image_classifier.py` (7 cases, mock Gemini), `test_dish_profiler.py` (7 cases, override map).
- **`docs/proposal_appendix.md`** (185 lines) — D8/D9/D11 페르소나 캐너리 상세, Hermes 라우터, dish_finder, WCAG 측정. Main proposal 5쪽 fit 위해 분리.
- **`docs/submission/checklist.md`** — D13~D16 일자별 step-by-step (제출 30분 전 5분 smoke 포함).
- **`docs/demo_smoke_test.md`** — 시연 영상 촬영 30분 전 점검 5단계.
- **`docs/review_proposal_scorecard.md` §0** — D12 자체 평가 90/100 (D3 → D12 +13).
- **3 신규 ADR** (DECISIONS.md): ADR-015 Hermes 라우터, ADR-016 `_lod_shared.py` shared module, ADR-017 v1 deprecation.
- **README badges 8개** — CI · Live · Hard Gate · pytest · WCAG · Competition · TourAPI · Personas.
- **`docs/proposal.md` §4.3** — 4-trail 수익 모델 (Free / 외국인 7-day Premium $4.99 / B2B 식당 ₩9.9k~29.9k / KTO 라이선스), Year-1 보수 ARR ₩2~3천만 + Year-3 ₩1억 시나리오, 비용 표.
- **ReviewSheet `Copy to Threads` clipboard helper** + `@menulens` 링크.

### Changed
- **v2 가 유일한 production path**. `MenuLensApp.tsx` v1/v2 ternary 9건 제거.
- **ResultsV2** sub-components `parts/{FriendlyCard, RestaurantsServingThisDish, TrustFooter}.tsx` 분리 (1036→451 lines).
- **`backend/agents/{tour_lod,dish_finder}.py`** → `_lod_shared.py` (121L) 신규에서 SPARQL 상수·`run_sparql`·geo helpers import. Private import 안티패턴 해소.
- **`SESSION_HANDOFF.md` + `CONTEXT.md`** D12 end 상태 반영.
- **`pitch_deck.md` §8/§9/§10** Live demo cast + 5-min pre-shoot smoke + D12 P0 fix table.

### Fixed
- **P0-1 trigger flag English leak** — "Contains diet_hard_conflict" → reasonsText 친화 텍스트 우선.
- **P0-2 free-side substring 오타깃팅** — `_MAIN_DISH_SUFFIXES` (찌개·탕·국밥·면 등) + price>0 가드. 김치찌개·물냉면 더 이상 Free 표시 안 함.
- **P0-3 짜장면 → "Stir-fried Glass Noodles · Japchae" 오번역** — `_DISH_OVERRIDES` 매뉴얼 매핑 5건 (짜장면·자장면·짬뽕·탕수육·군만두).
- **P0-4 Free banchan + ✋ AVOID 색깔 모순** — `effectiveColor` green override (visual만, 데이터는 보존).
- **P1 body bg cream** — desktop viewport >448px gutter dark leak 제거.
- **P1 ShowStaff 영문 라인 13→15px** + ink color (사용자 holding-phone 가독성).
- **P1 PillTab + Nearby radius chip 44×44 minHeight** (Apple HIG 터치 타깃).
- **`test_price_sentinel.py` `match_benchmark` import 깨짐** → `_exact_or_alias_match` adapter wrapper. 12000원 CAUTION 임계값 검증 → 11000원 (ADR-007).

### Removed
- **`frontend/app/components/{Onboarding,Upload,Results}.tsx`** v1 (1469 lines).
- **`frontend/app/design/v2/flag.ts`** (19 lines) — useUiV2() 게이트 dead code.
- 누계 **1488 lines + ~3000 lines 감소** (D11 ResultsV2 + D12 v1 cleanup).

### Performance (D12 측정)
- Vercel TTFB warm: ~270ms / cold: ~880ms
- Render `/health` TTFB: ~144ms warm / 360ms first
- HTML payload: 12.2KB
- Largest JS chunk: 227KB (turbopack-bundled)

---

## [D11] — 2026-05-01

### Added
- **v2 디자인 핸드오프 적용** — Friendly/Pickle Plus 톤, mobile 4 화면 (Onboarding/Upload/Results/ShowStaff).
- **Hermes 라우터 Phase 1**: `image_classifier.py` (Gemini Vision JSON, 4 kind), `/analyze` parallel dispatch.
- **Hermes 라우터 Phase 2**: `dish_finder.py` (LOD `ktop:bestMenu` 역방향 SPARQL), `/restaurants/by_dish` 엔드포인트, `RestaurantsServingThisDish` 컴포넌트.
- **TrustFooter** ResultsV2 영구 가시 (KFPI 800선 · KCA 참가격 · TourAPI 4.0 LOD · Gemini 4 출처 인용).
- **NOT-A-MENU rejection** (backend system_instruction + frontend handler).
- **NearbyRestaurants 4 perf fix**: localStorage geo cache (1h TTL) + parallel-fire fallback + 2.5s timeout + 수동 refresh button.
- **LOD outage stale-cache 패턴**: 1-retry + 250ms backoff + last-success cache 무기한 fallback.
- **`tests/test_smoke_e2e.py` E2E 8 cases** (httpx + synthetic_menu fixture).
- **WCAG AA 색 변형** (pickleStrong/pickleText/honeyText/blushText/muted) + global `:focus-visible` outline.
- **Sample 1-click button** (Yui Pescatarian + synthetic_menu.png) on Onboarding.
- **Cold-start ping** on app mount (Render free tier 30s sleep 회피).
- **Chen 페르소나 (peanut/sesame/nuts) prod canary** documented in proposal §3.3.2.
- **Hermes 라우터 evidence** in proposal §2.2/§2.3/§3.1/§3.3.4 + pitch_deck Use Case 2.

### Changed
- **proposal compression**: §3.3 details → `docs/proposal_appendix.md` (185L), 본문 370→312L (5쪽 fit).
- **ResultsV2** 1036→451 lines (sub-component 분리).
- **Backend agent docstrings** — tour_api, dish_finder, dish_storyteller.
- **menu_reader system_instruction**: NOT-A-MENU REJECTION 규칙 추가.

### Fixed
- **`flag.ts` trim()** — `vercel env add`가 stdin newline 저장해서 `"v2\n" === "v2"` false → v1 fallback. `(VAL ?? "").trim().toLowerCase()` 방어 + `printf 'v2' | vercel env add` 사용 권장.
- **NearbyRestaurants 위치 응답 5~7s → ~1.7s** (parallel-fire + cache).

---

## [D9] — 2026-04-26 (Vercel/Render 첫 배포)

### Added
- **Vercel + Render 양쪽 prod 배포** — `menulens-app.vercel.app` + `menulens-backend.onrender.com`.
- **GitHub Actions keep-alive cron** `*/13 * * * *` (Render free tier sleep 회피).

### Fixed
- **Render Docker 빌드 5초 fail (D9 함정 20번)** — `pydantic==2.9.2` vs `supabase==2.29.0` vs `anthropic==0.39.0` ResolutionImpossible. requirements.txt를 안전 범위(`>=X,<Y`)로 완화 + Dockerfile에서 `>=1.73` shell parsing 위험 제거.

---

## [D8] — 2026-04-25 — Hard Gate PASS

### Added
- **TourAPI 4.0 LOD SPARQL 1순위 채택** (ADR-014) — `/restaurants/nearby?source=auto`, 인증키 0.
- **menu_reader system_instruction + force_mode** — 분식 80개 stress 케이스 OCR 95%, 77/80 메뉴 추출, 36/36 페르소나 conflict 정확.

### Achieved
- **🚨 Hard Gate PASS** — 싸다김밥 분식점 80개 메뉴 stress 케이스. 7시간 외 6 use case 통합 검증.

---

## [D1~D7] — 2026-04-21 ~ 2026-04-25

전체 백엔드/프론트 PoC 구현. 자세한 commit history는 `git log --oneline` 참조.
- D1: 프로젝트 초기 scaffold
- D3: 한식 800선 RAG (Gemini 임베딩 768d + pgvector HNSW)
- D4: price_sentinel cascade 매칭 (참가격 8품목)
- D5: verdict 결정 트리 (religion + diet + allergens + price)
- D6: TTS dual-engine (Edge primary + Gemini fallback) + dish_storyteller + reviews + cart
- D7: Next.js 16 + Tailwind 4 + 4-phase frontend

---

## 형식 가이드

- 새 D-day 추가 시: 맨 위 prepend
- Section: `Added` / `Changed` / `Fixed` / `Removed` / `Deprecated` / `Security` / `Performance`
- 각 bullet은 commit-traceable (가능한 SHA 또는 PR 인용)
- 평가 외부 공유 가능한 문서 — 제출 전 D14 한 번 더 검수
