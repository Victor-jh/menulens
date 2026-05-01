# MenuLens — Project Context

> 모든 새 Claude 세션의 첫 참조 문서. 여기만 읽으면 즉시 온보딩된다.
> 마지막 업데이트: **2026-05-02 (D12 end, 코드 동결, 제출 4일 전)**

---

## 🎯 한 줄 본질 (확정)

> **외국인이 한국 식당 앞에서 멈추는 30초의 망설임을 없애고, 그 망설임이 풀리는 경험을 다시 한국으로 돌려보내는 양방향 신뢰 인프라.**

3-3-3 폐회로:
- **DECIDE 3초**: 메뉴판/사진 → 색깔 + 사유
- **ORDER 3초**: 장바구니 → 한국어 TTS → 직원 전달
- **REVIEW 3초**: 별점 + 코멘트 → 다국어 + 데이터 자산

## 한 줄 요약
**찰칵 한 번. 초록색만 주문하세요.** 방한 외국인을 위한 메뉴판 AI 어시스턴트.

## 사업 포지셔닝
- 공모전 단계: **"도구 + 진흥원 협상권"**, SNS 사업 모델 보류
- 코드는 review·threads·룰렛 작동하나 **시연 메시지는 도구 본질에 집중**
- 본업 진로: JH 진흥원 입사 후 internal tool로 발전 (B/C/E 시나리오)

## 핵심 명제
- **문제**: 방한 외국인은 식당 앞에서 4가지(메뉴 번역·가격 적정성·알레르기·주문법)를 동시에 몰라 등 돌린다
- **해결**: 사진 1장 → AI 에이전트 → 색깔 3종(🟢🟡🔴) 오버레이 + 탭-주문 TTS
- **근거**: 2026년, 멀티모달 AI·한식 공공DB·바가지 국가 어젠다가 처음 한 지점에서 만났다

## 타깃 공모전
- 2026 관광데이터 활용 공모전 ① 웹·앱 개발 부문 (한국관광공사)
- 접수 마감: **2026-05-06 (수) 16:00** (기한엄수)
- TourAPI 필수 활용, 개인 참가, 국내 거주자
- 시상: 대상 1(1,000만) + 최우수 5×300만 + 우수 10×100만 + 장려 15×50만 (총 31팀, 4,250만원)
- 공식 원본: `docs/submission/official/2026_공고문.pdf` · `제안서_양식_원본.hwp`

## 에이전트 아키텍처 (D11 Hermes 추가)
1. **Hermes Router** (D11) — image_classifier로 메뉴/dish/QR/NOT-A-MENU 분기, parallel dispatch
2. **Menu Reader** (Gemini 2.5 Flash Vision) — 메뉴판 → 메뉴명·가격 JSON
3. **Dish Profiler** (Claude Sonnet 4.6 + pgvector RAG) — 메뉴 → 재료·알레르기·비건·할랄·문화
4. **Dish Finder** (D11) — 단일 dish 사진 → LOD bestMenu reverse lookup
5. **Price Sentinel** (Rule + Claude) — 한국소비자원 참가격 8품목 대조 → 🟢🟡🔴
6. **Verdict / TTS / Storyteller / Reviews / Tour LOD / Tour API** — 보조

## 공공데이터 스택 (TourAPI 필수 + 5개 교차)
- **TourAPI** — `areaBasedList2`, `detailIntro2`, LOD SPARQL (역대 수상작 최초)
- **한식진흥원 길라잡이 800선** (KFPI 15129784) — 영·일·중 표준 번역
- **한국소비자원 참가격** (KCA price.go.kr) — 외식 8품목 월별 평균
- **식약처 식품영양성분DB** (15127578) — 알레르기 보조
- **카카오 로컬 API** — 위치
- **공공데이터포털 15101578** — 한국관광공사 국문

## 기술 스택
| 층 | 선택 |
|---|---|
| Frontend | Next.js (Vercel) — v2 single path (D12 v1 삭제) |
| Backend | FastAPI (Python 3.11) on Render Docker free tier |
| DB | Supabase Postgres + pgvector |
| AI | Claude Sonnet 4.6 + Gemini 2.5 Flash + Gemini embedding |
| TTS | Edge TTS primary + Gemini fallback (ADR-010) |
| 오케스트 | asyncio.gather + Hermes router |
| 관측 | LangSmith 무료 + Sentry |

## 비용 구조
- Gemini Flash 무료 티어 + Claude Partner Network 크레딧 + Supabase 무료 + Vercel Hobby + Render free
- **총 지출 $0 ~ 5만원**

## 타임라인 현재 위치
- **현재**: D12 (2026-05-02 토) — **코드 동결**
- D7 Hard Gate ✅ PASS (싸다김밥 77/80, 36/36 conflict — ROADMAP D8 참조)
- D9 양쪽 stack LIVE (Vercel + Render)
- D11: v2 디자인 적용, Hermes router, perf fix, NearbyRestaurants 안정화, A11y AA, smoke 8건, ResultsV2 1036→451L
- D12: v1 1488L 삭제 (single path), `_lod_shared.py` 분리, 디자이너 audit P0×3+P1×4 fix, prod canary 통과
- **제출 마감 (D16, 2026-05-06 수 16:00): 4일 남음**

### 🔥 D12 시점 우선순위 (사용자 주도)
1. **시연 영상 1분 30초 촬영** — 외국인 cameo + 식당 location 섭외 (D12~D13)
2. **Reddit r/koreatravel 글 게시** — draft `docs/distribution/reddit_koreatravel_post.md`
3. **HWP 변환** (D14) — 본문 5쪽 + appendix는 GitHub link
4. **D16 16:00 제출**

## 추가 D11+D12 변경 (코드)
- **Hermes router** (`backend/agents/hermes_router.py`) — image_classifier + parallel dispatch + dish_finder LOD reverse
- **`_lod_shared.py`** (D12 121L) — tour_lod·dish_finder가 공유 (private import 안티패턴 해소)
- **v1 전체 삭제** (D12 1488L) — Onboarding/Upload/Results/flag.ts, MenuLensApp ternary 제거 → single path
- **ResultsV2 분리** (D11 1036→451L) — `parts/FriendlyCard`, `parts/RestaurantsServingThisDish`, `parts/TrustFooter`
- **NearbyRestaurants 안정화** (D11) — geo cache + parallel + 2.5s timeout + LOD 1-retry stale-cache
- **proposal compression** (D11) — 본문 370→312L, §3.3 → `docs/proposal_appendix.md` 185L

## 자체 평가 (D12)
| 지표 | 점수 | 근거 |
|---|---|---|
| Usability | 9.0 | v2 4 화면, NOT-A-MENU 처리, skeleton |
| Accessibility | 8.0 | WCAG AA 색 + 44px touch + `:focus-visible` |
| Code readability | 8.5 | single path, dead code 0 |
| Maintainability | 8.5 | sub-components + `_lod_shared` |
| Test reliability | 7.0 | smoke 8건 + GH Actions cron |
| **가중 평균** | **~8.7** | |

## 핵심 금지 사항
- ❌ 에이전트 7개 원안 재검토 (현 6개로 충분)
- ❌ v1 컴포넌트 복구 (D12 삭제됨)
- ❌ 실시간 AR 라이브 모드 (Phase 2)
- ❌ Neo4j, LangGraph 이중화, Flutter
- ❌ env value `.trim()` 누락 (FAILURES 20번)
- ❌ private cross-agent import (`_lod_shared.py` 사용)

## 참조 문서
- `docs/SESSION_HANDOFF.md` — 다음 세션 핸드오프 (terse)
- `ROADMAP.md` — D1~D16 일일 체크리스트
- `DECISIONS.md` — 의사결정 로그 (ADR-001~014+)
- `FAILURES.md` — 실패 기록 (현 25개)
- `AGENTS.md` — Claude Code 마스터 지시서
- `docs/proposal.md` — 본문 312L (D14 HWP 변환 대상)
- `docs/proposal_appendix.md` — §3.3 details 185L (GitHub link)
- `docs/pitch_deck.md` — 시연 영상 90s 샷리스트 (Hermes Phase 2 포함)
- `docs/user_stories.md` — 페르소나 4인 (Yui·Aisha·Chen·Mike)
- `docs/distribution/reddit_koreatravel_post.md` — Reddit draft
- `tests/test_smoke_e2e.py` — prod smoke 8 cases
- `docs/research/05_한식800선_정제스펙.md` — 데이터 모델 ground truth

## 응답 스타일
- userPreferences 준수 (심층·체계적)
- 심사 100점 배점(기획력 30 + 완성도 30 + 데이터 20 + 발전성 20) 항상 염두
- "확산적 사고" 패턴 감지 시 즉시 경고
