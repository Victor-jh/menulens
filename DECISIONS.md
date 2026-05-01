# DECISIONS

> 모든 주요 의사결정을 여기 기록. "왜 이렇게 했는지"를 미래의 내가 알 수 있도록.
> 새 결정 시: 맨 위에 추가 (역순).

---

## ADR-017: 2026-05-02 (D12) · v1 컴포넌트 deprecation + 단일 production path

**결정**: `frontend/app/components/{Onboarding,Upload,Results}.tsx` v1 + `flag.ts` feature gate 모두 삭제 (1488 lines deleted). `MenuLensApp.tsx`의 v1/v2 ternary 9건 제거. **v2가 유일한 production path**.

**배경**:
- D11 v2 라이브 후 24시간 prod 검증 (8 E2E + 4 페르소나 + 모바일 시각 confirm)
- v1과 v2 dual-track 유지 = 변경 시 매번 2배 작업, 평가자 코드 리뷰에서 dead code 의심
- `flag.ts` `useUiV2()` 게이트는 `vercel env add`의 trailing newline bug (D11 함정 21번)으로 한 번 깨짐 — 게이트 자체가 추가 위험 surface

**대안 검토**:
- (a) 유지하고 v1을 fallback으로 둠 → 영구 dead code 유지비용 ↑
- (b) v1을 `legacy/` 디렉터리로 이동 → 여전히 import 가능, dual-track 미해결
- (c) **삭제** ← 채택. git 이력에서 언제든 복원 가능, 단일 path는 평가/디버그/유지보수 모두 단순.

**결과**:
- ResultsV2 1036→451 라인 (D11 parts/ 분리 후), v1 Results.tsx 삭제로 누적 ~3000 라인 감소
- 평가 점수: 코드 가독성 7→8.5, 유지보수성 6.5→8.5

**관련**: ADR-014 (LOD), commit `a8469f4`.

---

## ADR-016: 2026-05-02 (D12) · `_lod_shared.py` — agent 간 cross-cutting utility 추출

**결정**: `tour_lod`와 `dish_finder`가 공유하던 SPARQL endpoint 상수·`run_sparql`·geo helpers를 `backend/agents/_lod_shared.py` (121 lines) 신규 모듈로 추출. 양쪽 agent는 이 모듈에서 import.

**배경**:
- `dish_finder`(D11 Phase 2) 작성 시 `tour_lod`의 `_SPARQL_ENDPOINT`, `_haversine_m`, `_run_sparql` 등 8개 private 식별자를 직접 import (`from backend.agents.tour_lod import _SPARQL_ENDPOINT, _haversine_m, ...`)
- 안티패턴: private API 의존 → `tour_lod` 리팩터 시 `dish_finder` 조용히 깨짐
- D12 audit에서 이 의존성을 정리 대상으로 식별

**대안 검토**:
- (a) `tour_lod`의 private 함수를 public으로 승격 (`_haversine_m` → `haversine_m`) → `tour_lod`이 cross-cutting hub가 되어 의도와 어긋남
- (b) **`_lod_shared.py` 신규 모듈** ← 채택. 두 agent 모두 동등하게 import, ownership clear
- (c) `backend/lib/` 디렉터리 신설 → 13개 agent 1개 모듈만 옮기는 건 over-architect

**결과**:
- `dish_finder.py`: 281→242 lines (run_sparql 중복 정의 제거)
- `tour_lod.py`: 343→287 lines (_haversine_m 등 5개 helper 제거)
- private import 안티패턴 0건

**관련**: ADR-014 (LOD), commit `a8469f4`.

---

## ADR-015: 2026-05-02 (D11/D12) · Hermes 라우터 패턴 — 단일 업로드, 자동 분기

**결정**: `backend/agents/image_classifier.py` 신규 (Gemini Vision JSON 분류, 4 kind: menu/single_dish/table_with_dishes/not_food). `/analyze` 엔드포인트가 classifier + menu_reader를 **parallel** (asyncio.create_task) 실행 후 결합 판정으로 dispatch. **Phase 2**: classifier가 single_dish 검출 시 `dish_finder` (LOD ktop:bestMenu reverse SPARQL) 호출.

**배경**:
- 사용자가 "메뉴판이세요? 음식 사진이세요?" 모드 토글을 직접 선택 = 외국인 30초 결정 게임의 불필요한 인지 부담
- TourAPI 4.0 LOD `ktop:bestMenu`는 통상 식당 상세 페이지 표시용 데이터 — 이를 dish↔식당 양방향 인덱스로 invert하는 활용은 LOD RDF 그래프 강점을 가장 잘 살림
- "지인 인스타그램에서 본 음식 → 그 음식 파는 식당 5곳" decision loop closing이 외국인 use case 2배 확장

**대안 검토**:
- (a) menu_reader에 분류 책임 통합 → 50줄짜리 prompt가 더 복잡해져 단일 책임 원칙 위반. RAG 의미 검색 수정 시 분류 로직도 같이 깨질 위험
- (b) 사용자 모드 토글 유지 → 인지 부담 + 첫 사용자 오선택 시 round-trip 30s
- (c) **별도 Hermes classifier + parallel dispatch** ← 채택. classifier 1회 호출 ~500ms-1s 추가지만 menu_reader와 동시 실행으로 wall-clock 영향 거의 0 (단일 호출 10.65s vs 라우터 11.64s)

**결합 판정 규칙** (`/analyze`):
- `items >= 3` → "menu" (classifier 무관, menu_reader 신뢰)
- `items == 0 + classifier conf >= 0.85 + not_food` → 친화 거절 (`warnings:["not_a_menu"]`)
- `items == 0 + classifier conf >= 0.7` → classifier kind 채택
- `items 1-2 + classifier strong (>=0.85)` → classifier kind
- 그 외 → "menu" 안전 fallback

**Phase 2 dish_finder**:
- SPARQL: `?s ktop:bestMenu ?bestMenu FILTER(CONTAINS(LCASE(?bestMenu), LCASE("비빔밥")))`
- 1회 retry + stale-cache (LOD outage 회복력)
- ResultsV2 RestaurantsServingThisDish 컴포넌트로 카루셀 표시

**결과**:
- 모드 토글 UI 삭제 → 단일 업로드 UX
- proposal §2.2 "3 에이전트" → "4 에이전트 (Hermes 라우터 + 3 분석)"
- 역대 13회 수상작 0건의 LOD bestMenu 양방향 인덱스 → 14회차 first-mover

**관련**: ADR-014 (LOD), ADR-016 (shared util), commits `62c49ad` (Phase 1), `42963c1` (Phase 2).

---

## ADR-009: 2026-04-25 · TTS 프로바이더 — Gemini gemini-2.5-flash-preview-tts
**결정**: D6 한국어 주문 음성 생성에 **Gemini TTS 모델** 사용. Google Cloud Text-to-Speech 서비스계정 사용 안 함.
**배경**: D6 진입 시 `.env`에 `GOOGLE_APPLICATION_CREDENTIALS=./gcloud-key.json` 설정되어 있으나 파일 부재. Google Cloud TTS 사용하려면 GCP 프로젝트 생성·결제수단 등록·서비스계정 키 발급 필요 (ADR-008과 동일 회피 사유).
**선택 모델**: `gemini-2.5-flash-preview-tts` (24kHz PCM L16 출력, prebuilt voice "Kore" 한국어 톤).
**이유**:
- JH 보유 GEMINI_API_KEY 그대로 활용, 추가 자격증명 불필요
- 무료 티어 quota 안에서 PoC 운영 가능
- prebuilt voice "Kore"가 자연스러운 한국어 발화 — 기존 GCP TTS의 ko-KR-Wavenet 대비 품질 비교 보류 (체감 충분)
- audio/L16;codec=pcm;rate=24000 → 44바이트 WAV 헤더 prepend로 브라우저 재생 호환
**구현**:
- `backend/agents/tts.py`: `synthesize(text)` → WAV base64
- 캐시: Supabase `tts_cache` 테이블 (sha256 키, audio_b64). 테이블 미생성 시 graceful degrade
- `/analyze` 응답에 `tts_audio_b64` 인라인 포함 (PoC 단순화, 별도 Storage 버킷 추후)
- 신규 의존성: `google-genai>=1.73` (legacy `google-generativeai`는 audio 미지원)
**취소 가능성**: 시연 중 음질 이슈 / quota 한계 / 다국어 voice 부족 시 Google Cloud TTS 전환. 코드는 `_generate_tts_*()` 1곳 교체.

---

## ADR-008: 2026-04-25 · 임베딩 프로바이더 — Gemini text-embedding-004 (768차원)
**결정**: D3 한식 800선 임베딩은 Google **`text-embedding-004` (768차원)** 사용. OpenAI `text-embedding-3-small` (1536) 채택 안 함.
**배경**: D3 재개 시 JH는 ANTHROPIC·GEMINI·SUPABASE 키만 보유, OpenAI 미가입. 기존 스캐폴드(`9303d65`)는 OpenAI 1536차원 전제.
**이유**:
- JH가 이미 GEMINI 키 보유 → 신규 OpenAI 가입·$5 선결제·카드 등록 회피
- 800건 규모에서 768 vs 1536 차원 HNSW 검색 latency 차이 무시 가능(<50ms 양쪽 모두)
- Gemini 임베딩 무료 할당(일 15K req, 분당 1,500 req) → 800건 8배치 1분 이내 완료
- `task_type` 파라미터 지원: 적재는 `RETRIEVAL_DOCUMENT`, 쿼리는 `RETRIEVAL_QUERY`로 분리 → 동일 텍스트라도 용도별 최적화 임베딩
- MTEB 한국어 벤치 격차 근소(62.3 vs 66.3), 공식 번역 DB 800건 검색 정확도에서 체감 무의미
**취소 가능성**: Phase 2 scale-up(사용자 크라우드 제보로 메뉴 DB 확장) 시 OpenAI 또는 `text-embedding-3-large` 재평가. 전환 비용:
- 스키마: `embedding_ko VECTOR(768)` → `VECTOR(1536)` ALTER + HNSW 재빌드
- 재임베딩: 800건 $0.0005, 확장 후 규모에 따라 상향
- 코드: `embed_text()` 함수 1곳 교체
**스키마 영향**: `backend/db/001_hansik_800.sql` `VECTOR(1536)` → `VECTOR(768)` 수정 필수 (D3 첫 Supabase 생성 전이라 마이그레이션 없음).

---

## ADR-014: 2026-04-25 (D8) · TourAPI 4.0 — LOD SPARQL 우선 + OpenAPI fallback

**결정**: `/restaurants/nearby` 1순위 데이터 소스를 **한국관광공사 LOD SPARQL endpoint** (`http://data.visitkorea.or.kr/sparql`)로 채택. KorService2 OpenAPI는 키 발급 후 보강용 (`source=openapi` 또는 `source=auto`에서 LOD miss 시 fallback).

**배경**: D7~D8 진입 시 OpenAPI(15101578) 활용신청은 사용자 미발급 상태. LOD endpoint를 점검한 결과:
- 인증키 불필요, CC BY-SA 3.0 (상업적 이용 OK)
- 3,280,524 triples / 1,472,381 entities — 그중 `kto:Gastro` 인스턴스 15,531개 (subclass: KoreanRestaurant 9,712 / Western 875 / Chinese 692 / Japanese 613 / Unique 250 / FoodAndBeverage 51)
- 한 식당당 메타가 OpenAPI보다 풍부: `rdfs:label` / `wgs:lat`·`long` / `dc:description` / `foaf:depiction`(사진 다중) / `ktop:tel`·`openTime`·`restDate`·`bestMenu`·`parking`·`creditCard`·`smokingSectionAvailable`·`category`
- 응답 < 800ms (BBOX FILTER → top-N)

**선택 기술**:
- saltlux 확장 `geo:nearby(lat lon r)`는 우리 endpoint에서 빈 결과 → 표준 `FILTER` BBOX + 후처리 Haversine 거리 정렬 (portable, 의존 0)
- BBOX 반경 m → degrees 변환은 local-flat-Earth 근사: Δlat ≈ r/111320, Δlng ≈ r/(111320·cos(lat))

**이유**:
1. **즉시 작동**: 키 발급 lag 0. D7 Hard Gate 가시화 즉시.
2. **풍부 메타 + 사진 인라인**: 시연 영상에서 nearby 카드에 thumbnail 즉시 노출 — OpenAPI는 firstimage가 절반 이상 누락.
3. **차별화**: SESSION_HANDOFF.md "LOD SPARQL · 역대 수상작 최초 활용" 자산을 코드로 실현. 데이터 활용도(20점) + 발전성(20점) 동시 가산.
4. **graceful chain**: `source=auto`(default) → LOD 우선, miss + key 보유 시 OpenAPI fallback. 사용자가 키 발급해도 동일 코드 경로 재사용.

**한계**:
- LOD 라벨이 한국어 위주(다국어 분포 검증 timeout) — 외국인 시연에 영향. 대안: dish_storyteller 패턴으로 표시 직전 즉석 다국어 변환 (Phase 2). 시연 영상 1분 30초 시나리오에는 한국어 식당명이 오히려 "현지" 임팩트 ↑.
- LOD 쿼리 결과가 SPARQL LIMIT의 비결정성으로 호출마다 candidate 셋이 미세 변동 가능 — 안정 정렬 위해 BBOX candidate 수를 num_of_rows×5(min 30)로 받고 Haversine 정렬 후 top-N.

**취소 가능성**: OpenAPI 키 발급 + 다국어 7개 서비스(Eng/Jpn/Chs/Cht) 확보 후 외국인 시연 영문 라벨이 결정적이면 `source=auto` 정책에서 `language≠ko` 시 OpenAPI 우선으로 토글 검토.

**구현**:
- `backend/agents/tour_lod.py` (신규): `search_nearby_via_lod()` / `restaurant_detail_via_lod()`. NearbyResult / Restaurant / RestaurantDetail dataclass는 `tour_api.py`에서 import해 swap-able.
- `backend/api/main.py`: `/restaurants/nearby?source=auto|lod|openapi`, `/restaurants/{content_id}?source=...`. NearbyResponse에 `source` 필드 추가.
- `frontend/app/components/NearbyRestaurants.tsx`: 결과 footer에 "LOD SPARQL" / "OpenAPI" 배지로 출처 명시 (심사자에게 데이터 활용도 가시화). cat3 코드 → "한식/양식/일식/중식/이색음식점/카페·전통찻집" 매핑.

---

## ADR-013: 2026-04-25 · 사업 포지셔닝 — "도구 + 진흥원 협상권" 단계 확정
**결정**: 공모전 단계는 **B2C SNS 사업 모델 보류**, "도구로서 출품작 + JH 진흥원 협상권 자산"으로 포지셔닝.
**비판적 검토 결과**: SNS 채널 사업 5대 함정 — Cold-start 데드락, Maangchi/Korean Englishman 등 기존 경쟁자 14년 격차, 수익 모델 약함(C2C 광고 미만), Gemini 변동비 적자 구조, 1인 부정 후기 명예훼손 리스크.
**1년 후 자립 확률**: SNS 사업 5% / 진흥원 협업 35% / 진흥원 입사 internal tool 70%.
**적용**: review·threads·룰렛 코드는 유지(Phase 2 자산), 시연·제안서 메시지는 30초 폐회로 도구에 집중. 평가자가 데모 만지다 발견하면 발전성 가산점만 확보.

---

## ADR-012: 2026-04-25 · 분식집 무료 사이드 자동 인식
**결정**: 한국식당 무료 반찬·국·기본찬(김치, 깍두기, 장국, 맑은국 등 25개 키워드) 자동 감지 → free_side_likely 라벨 + + 버튼 마찰(첫 추가 시 confirm).
**이유**: 음식 사진 모드에서 장국·반찬을 메뉴로 잘못 잡아 주문 카드에 추가하는 사고. 한국 식당 문화(서비스 사이드) 이해가 차별 포인트.
**구현**: menu_reader Gemini 프롬프트 + backend 사후 사전 매칭 + sessionStorage 한 번만 confirm.

---

## ADR-011: 2026-04-25 · 음식 사진 dual-mode OCR
**결정**: menu_reader가 (A) 메뉴판 텍스트 + (B) 음식 사진 시각 식별 둘 다 지원. source = menu_text | photo_id 명시.
**이유**: 외국인은 메뉴판이 없는 환경(식당 입구 음식 모형, 인스타 음식 사진, 식탁 차린 사진)에서도 도구 필요. listed_price 없으면 참가격 8품목 평균(`lookup_benchmark`)을 fallback.
**구현**: PHOTO MODE 시 raw_text="photo:..." prefix, 다중 음식 식탁 사진은 N개 항목 분리.

---

## ADR-010: 2026-04-25 · TTS Engine Cascade — Edge TTS primary + Gemini fallback
**결정**: TTS 1순위 Microsoft Edge TTS (무료, 무제한, key 불필요), 2순위 Gemini TTS(quota 한정).
**이유**: Gemini TTS 무료 quota 분당·일별 제한 도달로 시연 중 502 발생. Edge TTS는 `ko-KR-SunHiNeural` 한국어 자연스러움 우수. ADR-009에서 Gemini만 쓰던 결정 일부 오버라이드.
**구현**: backend/agents/tts.py `synthesize()` cascade. Supabase tts_cache 그대로 활용.

---

## ADR-007: 2026-04-25 · 가격 임계값 130% 유지 — ROADMAP/ADR-002 정합 정정
**결정**: ROADMAP D4 완료기준 "김치찌개 12000원 → 🟡"을 **🔴로 수정**. ADR-002 임계값(🟢<110%, 🟡 110~130%, 🔴>130%)은 그대로 유지.
**배경**: Cowork D3 세션에서 ROADMAP.md:47과 ADR-002 임계값 간 모순 발견. 참가격(price.go.kr 2025-12) 김치찌개 평균 8,577원 기준, 12,000원 = 139.9% → 130% 초과 → 🔴가 정합.
**이유**:
- `backend/agents/price_sentinel.py` 실로직 이미 `ratio > 1.30 → SUSPECT(🔴)` 구현, 벤치마크 8,577원 하드코딩 — 로직/데이터가 일관됨
- 130% 임계값을 완화(예: 140%)하면 안동·동탄 실 관광지 바가지(1.5~2배)를 🟡로 약화 → 제품 핵심 가치(바가지 경보) 훼손
- ADR-002가 "관광지 가격 의심"을 명시적 목적으로 삼고 있어 130% 유지가 ADR 취지에 부합
**적용 변경**:
- ROADMAP.md:47 "🟡 판정" → "🔴 판정 + 근거 출력 (참가격 8,577원 대비 140%)"
- `price_sentinel.py:120` 주석 `# caution` → `# suspect` + 110~130% 경계 테스트 케이스(10500원) 추가
**취소 가능성**: D4 실작업 시 참가격 평균값을 최신 스냅샷으로 갱신하면 비율이 미세 변동 가능 — 단, 임계값 자체는 변경 안 함

---

## ADR-006: 2026-04-21 · Next.js vs Flutter
**결정**: Next.js (웹앱)
**이유**:
- 외국인은 앱 설치 저항이 큼 (Papago·Naver Map 이미 설치 요구)
- 공모전 시연 시 QR 코드로 즉시 접속 가능
- PWA로 설치 옵션도 제공 가능
- Flutter는 iOS 개발자 계정($99) 필요, 배포 복잡
- Vercel Hobby 무료 배포
**취소 가능성**: Phase 2에서 React Native로 전환 가능

---

## ADR-005: 2026-04-21 · 라이브 AR 모드 제거
**결정**: "찰칵 한 번" 사진 모드만 MVP, 라이브 AR은 Phase 2
**이유**:
- 실시간 Vision 호출 비용 50배 (하루 2000프레임 vs 40사진)
- 2주 PoC에 무리, 떨림·좌표 추적 구현 부담
- 사용자 액션 차이는 "대기 0회" vs "탭 1회"로 실질 동일
- 핵심 가치(읽지 않는 UX)는 100% 보존
**대안**: 제안서 "발전 방향"에 Phase 2 로드맵으로 명기

---

## ADR-004: 2026-04-21 · 3 에이전트로 축소 (원안 7 → 3)
**결정**: Menu Reader, Dish Profiler, Price Sentinel 3개만
**이유**:
- 원안(Orchestrator + 6 전문 에이전트)은 PoC에 과잉
- Anthropic 멀티에이전트 +90% 성능은 리서치 태스크 한정
- 관광 QA처럼 정형화된 도메인은 단순 함수 체인 + RAG가 더 빠르고 정확
- 토큰 비용 15배 감소
**취소 가능성**: Phase 3에서 오케스트레이션 계층 추가 가능

---

## ADR-003: 2026-04-21 · Papago 정면 대결 포기
**결정**: "번역 + 4개 레이어(공식표준·가격·알레르기·문화)" 포지셔닝
**이유**:
- Papago의 10년 한국어 카메라 번역 정확도 따라잡기 불가
- Papago가 못하는 4개 공백이 명확히 존재
- "결정 시간 3초" 메시지로 Papago를 "전 단계 도구"로 포지셔닝
**검증**: 심사 기획력 항목(+독창성) 대응 근거

---

## ADR-002: 2026-04-21 · 가격 적정성, 한국소비자원 참가격 8품목으로 한정
**결정**: MVP는 김밥·칼국수·김치찌개·삼계탕·냉면·삼겹살·비빔밥·자장면 8개만 바가지 판정
**이유**:
- 카카오/네이버 API는 메뉴별 가격 미제공
- 참가격(price.go.kr)이 유일한 공공 신뢰 소스
- 외국인 최다 주문 메뉴와 정확히 겹침
- 8개로 시작 → 사용자 크라우드 제보로 확장 (Phase 2)
**리스크**: 제안서에 "8개 한정"이 소극적으로 보일 수 있음 → "확실한 검증 기반부터 시작, 크라우드로 확장"으로 프레이밍

---

## ADR-001: 2026-04-21 · 공모전 참가 결정
**결정**: 2026 관광데이터 활용 공모전 ① 웹·앱 개발 부문 출품
**이유**:
- 개인 참가 가능 (겸업 제약 없음)
- 2주 제안서 + PoC로 예심 통과 가능성 현실적
- 수상과 무관하게 포트폴리오·AI 실전 경험·진흥원 레퍼런스 확보
**3가지 조건**:
1. D7(4/27) Hard Gate — PoC 미작동 시 포기
2. 기능 추가 금지 (3 에이전트 + 찰칵 + 색깔 3종만)
3. 5월 예심 통과 후 6~9월 개발 Go/No-Go 재결정
