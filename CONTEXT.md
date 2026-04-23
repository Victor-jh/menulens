# MenuLens — Project Context

> 모든 새 Claude 세션의 첫 참조 문서. 여기만 읽으면 즉시 온보딩된다.
> 마지막 업데이트: 2026-04-23 (D3, Cowork)

---

## 한 줄 요약
**찰칵 한 번. 초록색만 주문하세요.** 방한 외국인을 위한 메뉴판 AI 어시스턴트.

## 핵심 명제
- **문제**: 방한 외국인은 한국 식당 앞에서 4가지(메뉴 번역·가격 적정성·알레르기·주문법)를 동시에 몰라 등 돌린다
- **해결**: 사진 1장 → AI 3개 에이전트 → 색깔 3종(🟢🟡🔴) 오버레이 + 탭-주문 TTS
- **근거**: 2026년, 멀티모달 AI·한식 공공DB·바가지 국가 어젠다가 처음 한 지점에서 만났다

## 타깃 공모전
- 2026 관광데이터 활용 공모전 ① 웹·앱 개발 부문 (한국관광공사)
- 접수 마감: **2026-05-06 (수) 16:00** (기한엄수)
- TourAPI 필수 활용, 개인 참가(팀당 최대 5명), 국내 거주자
- 심사 3단계: 예비심사(5월, 서류 적격) → 서비스 개발(5~9월, 교육·컨설팅) → 1차 심사(10월, 서면+기능 100점, 상위 5팀) → 최종심사(10월, PT 100점) → 시상식(11월)
- 시상: 대상 1(1,000만) + 최우수 5×300만 + 우수 10×100만 + 장려 15×50만 + 특별상 (총 31팀, 4,250만원)
- 공식 원본: `docs/submission/official/2026_공고문.pdf` · `docs/submission/official/제안서_양식_원본.hwp`

## 3개 에이전트 아키텍처
1. **Menu Reader** (Gemini 2.5 Flash Vision) — 메뉴판 이미지 → 메뉴명·가격 리스트 JSON
2. **Dish Profiler** (Claude Sonnet 4.6 + pgvector RAG) — 메뉴 → 재료·알레르기·비건·할랄·문화 한 줄
3. **Price Sentinel** (Rule + Claude) — 메뉴·가격 → 한국소비자원 참가격 8품목 대조 → 🟢🟡🔴 판정

## 공공데이터 스택 (TourAPI 필수 + 5개 교차)
- **TourAPI** (필수) — `areaBasedList2`, `detailIntro2`, 다국어 7개 서비스, LOD SPARQL (역대 수상작 최초 활용)
- **한식진흥원 길라잡이 800선** (공공데이터포털 15129784) — 영·일·중 표준 번역 DB
- **한국소비자원 참가격** (price.go.kr) — 서울 8개 외식 품목 월별 평균가
- **식약처 식품영양성분DB** (15127578) — 알레르기 재료 보조 검증
- **카카오 로컬 API** — 식당 위치·지역 보정
- **공공데이터포털 15101578** — 한국관광공사 국문 관광정보 서비스

## 기술 스택 (과잉 제거 버전)
| 층 | 선택 |
|---|---|
| Frontend | Next.js (웹앱) — 설치 장벽 0, 시연에 유리 |
| Backend | FastAPI (Python 3.11) on Cloud Run |
| DB | Supabase Postgres + pgvector |
| AI | Claude Sonnet 4.6 + Gemini 2.5 Flash + OpenAI embedding |
| TTS | Google Cloud TTS 무료 티어 |
| 오케스트 | 직접 함수 체인 (LangGraph 과잉, 3노드면 asyncio.gather 충분) |
| 배포 | Vercel (프론트) + Cloud Run (백엔드) |
| 관측 | LangSmith 무료 + Sentry |

## 비용 구조 (공모전 PoC 기간)
- Gemini Flash 무료 티어 (1,000 RPD) → D1~D14 PoC 충분
- Claude Partner Network 크레딧 활용
- Supabase 무료 티어 (500MB)
- Vercel Hobby 무료
- **예상 총 지출: $0 ~ 최대 5만원**

## 타임라인 현재 위치
- **현재**: D3 (2026-04-23 목)
  - Cowork: Week 2 준비 docs 6건 완성 + 공식 양식·공고문 정합 완료
  - 맥북: D3 RAG 골격(SQL·로더·profiler) + dry-run 검증 완료 — **실행은 API 키 3종 + 실 CSV + Supabase 프로젝트 블로커**
- **Hard Gate**: D7 (2026-04-27 월) — PoC 작동 여부로 Go/No-Go (**4일 남음**)
- **제출 마감**: D16 (2026-05-06 수) 16:00
- **블로커 처리 책임**: JH 본인 — 공공데이터포털 15129784 활용신청 / Gemini·OpenAI·Anthropic API 키 / Supabase 프로젝트 생성 (상세: `FAILURES.md` D3 재개 체크리스트)

## 핵심 금지 사항 (확산 방지)
- ❌ 에이전트 추가 (3개로 고정)
- ❌ 실시간 AR 라이브 모드 (Phase 2)
- ❌ K-Scene, Taste DNA, Voice Bridge 등 추가 기능
- ❌ 부산 RTO 특별상 (현장 답사 불가)
- ❌ Neo4j, LangGraph 이중화, Flutter 등 오버엔지니어링
- ❌ 7개 에이전트 원안 재검토

## 의사결정 맥락
과거 대화 세션에서:
1. 초기안(KOMPASS 7-agent) → 과잉 판정 → MenuLens(3-agent)로 축소
2. Papago 정면 대결 불가 → "번역 + 4개 레이어(공식표준·가격·알레르기·문화)"로 포지셔닝
3. 라이브 AR 모드 → 2주 PoC 무리 → "찰칵 한 번 + 색깔 3종" 확정
4. 수상 목적 → 포트폴리오·학습 목적으로 재정의

## 참조 문서
- `ROADMAP.md` — D1~D16 일일 체크리스트
- `DECISIONS.md` — 의사결정 로그 (ADR-001~006)
- `FAILURES.md` — 실패·시행착오 기록
- `AGENTS.md` — Claude Code용 마스터 지시서 (코드 작업 시 필독)
- `docs/proposal.md` — 공모전 제안서 5p 본문
- `docs/user_stories.md` — 페르소나 4인 (Chen·Yui·Malik·John)
- `docs/pitch_deck.md` — 시연 영상 1분 30초 샷리스트
- `docs/review_proposal_scorecard.md` — 제안서 자체 채점 (D3: 77/100 baseline)
- `docs/submission/checklist.md` — 공모전 접수 체크리스트
- `docs/submission/hwp_conversion_plan.md` — D11 MD→PDF/HWP 변환 플랜
- `docs/research/00_Cowork_온보딩.md` — 대화 이력 요약 (신규 세션 첫 읽기)
- `docs/research/01_다각도_심층검토.md` — 30개 시선 비판·지지·전문가 검토
- `docs/research/02_기술검증.md` — 9개 기술 주장 검증 (6통과·2재설계·1폐기)
- `docs/research/03_시장_배경_리서치.md` — 2,000만 방한·바가지 사태 데이터
- `docs/research/04_공공데이터_접근법.md` — 6개 공공 API 실무 접근법
- `docs/research/05_한식800선_정제스펙.md` — Supabase 적재 스키마·알레르기 매핑

## 응답 스타일
- userPreferences 준수 (심층·체계적·길이 제한 없음)
- 심사 100점 배점(기획력 30 + 완성도 30 + 데이터 20 + 발전성 20) 항상 염두
- "확산적 사고" 패턴 감지 시 즉시 경고
