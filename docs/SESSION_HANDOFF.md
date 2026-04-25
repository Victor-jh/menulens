# 다음 Claude Code 세션 핸드오프

> **이 문서는 5분 안에 다음 세션이 따라잡기 위한 단일 요약.**
> 이거 + AGENTS.md + CONTEXT.md + DECISIONS.md + FAILURES.md + ROADMAP.md만 읽으면 OK.

마지막 업데이트: 2026-04-26 (D9 — D8 전 작업 완료, 배포 단계 진입)

---

## 🎯 본질 (한 줄)

> 외국인이 한국 식당 앞에서 멈추는 30초의 망설임을 없애고, 그 망설임이 풀리는 경험을 다시 한국으로 돌려보내는 양방향 신뢰 인프라.

3-3-3 폐회로: **DECIDE 3초** → **ORDER 3초** → **REVIEW 3초**.

---

## 📍 현재 위치

- 날짜: D9 (2026-04-26 일)
- **D7 Hard Gate**: ✅ PASS (2026-04-25 싸다김밥 77/80 메뉴, 36/36 conflict)
- 제출 마감 (2026-05-06 수 16:00): **10일 남음**

### 작동하는 것 (전체)
- 백엔드 에이전트: menu_reader(dual-mode) / dish_profiler(RAG) / price_sentinel(cascade) / verdict(severity tree) / tts(Edge+Gemini) / dish_storyteller / reviews(enrich+roulette) / tour_lod(SPARQL) / tour_api(OpenAPI fallback)
- 프론트 4 phase: onboarding → upload → results(NearbyRestaurants 포함) → order → review
- `/reviews` thread 페이지 + 다국어 토글 + sentiment 필터
- E2E PASS: 싸다김밥 77/80, OCR 95%, 42.2s, Pescatarian 39🟢/2🟡/36🔴, free_side 14건
- LOD SPARQL nearby: 서울시청 5건 <800ms (대상해·마이시크릿덴·루이·광화문국밥·만족오향족발)
- proposal.md 4 sections 완성 (D8 evidence-based 강화, 출처 7개)
- pitch_deck.md D8 실측 데이터 반영, user_stories.md Yui 페르소나 정합

### 배포 URL
- **Frontend (Vercel)**: https://menulens-app.vercel.app ✅ LIVE
  - 프로젝트명: `menulens` (victor-jhs-projects 스코프)
  - NEXT_PUBLIC_API_URL=https://menulens-backend.onrender.com 설정 완료
  - SSO Protection 해제 완료 (공개 접근 가능)
- **Backend (Render)**: https://menulens-backend.onrender.com ⚠️ no-server
  - render.yaml blueprint 연결 완료, 도메인 할당됨
  - 컨테이너 미구동 — Render 대시보드에서 환경변수 5개 입력 + Manual Deploy 필요

### 미완 (P0, 오늘~D14)
1. **Render 백엔드 배포 완료** — 대시보드에서 GEMINI_API_KEY / ANTHROPIC_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_KEY / SUPABASE_ANON_KEY 5개 입력 후 Manual Deploy (아래 §사용자 액션 참조)
2. 시연 영상 1분 30초 (D9, 4/29 일정)
3. proposal.md — 시연 영상 YouTube 링크 추가 (D9 후), GitHub public 링크 (D14)
4. HWP 변환 → PDF 제출 (D11~D13)

### ✅ 완료된 것 (이전 세션)
- D1~D8 전 코드 완료·검증·push (ea9b777까지 origin/main에 있음)
- 18번 함정 기록 완료 (pescatarian ALLOWED_DIETS 누락 → 추가됨)
- ADR-014 확정 (LOD SPARQL 우선, OpenAPI fallback)

---

## 🗝 환경

### `.env` (backend/.env에 위치)
```
GEMINI_API_KEY=<set>
ANTHROPIC_API_KEY=<set>
SUPABASE_URL=https://lsvwboqkfmqgtcgqyuxw.supabase.co
SUPABASE_ANON_KEY=sb_publishable_*
SUPABASE_SERVICE_KEY=sb_secret_*
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://172.30.1.53:3000,...
# 추후:
# THREADS_ACCESS_TOKEN=<for live posting>
# THREADS_USER_ID=<numeric>
# TOUR_API_SERVICE_KEY=<공공데이터포털 발급>
```

### Supabase 수동 SQL 실행 필요 (graceful degrade이라 안 해도 작동)
- `backend/db/001_hansik_800.sql` ✅ 실행됨 (800건 적재)
- `backend/db/002_tts_cache.sql` ⏳ 미실행 (캐시만 미작동)
- `backend/db/003_reviews.sql` ⏳ 미실행 (리뷰 영구저장만 미작동)

### 서버 시작 (`.claude/launch.json` 등록됨)
```
preview_start name=backend-fastapi
preview_start name=frontend-nextjs-prod    # 프로덕션
# 또는 dev:
preview_start name=frontend-nextjs
```

---

## 🚧 절대 반복 금지 함정 (FAILURES.md 17개 중 핵심 5개)

1. **iOS Safari `display:none` input click() 차단** → 항상 `<label>` 감싸기 패턴 + `sr-only`.
2. **Phase 분리로 컴포넌트 unmount → 사진 state 유실** → busy overlay 패턴, phase에서 "loading" 분리하지 말 것.
3. **Gemini TTS quota 도달** → ADR-010: Edge TTS primary, Gemini fallback. `edge-tts` 패키지 활용.
4. **Supabase 새 키 포맷** → `supabase==2.29.0` 이상.
5. **dish_profiler RLS 빈 결과** → backend는 `SUPABASE_SERVICE_KEY` 우선.

---

## 🎬 다음 즉시 작업 (TourAPI 4.0)

### 사용자가 먼저 해야 할 1단계
- 공공데이터포털(data.go.kr) 로그인
- "한국관광공사_국문 관광정보 서비스 GW" (15101578) 활용신청 ✅ 즉시 승인
- 발급된 ServiceKey를 `backend/.env`에 `TOUR_API_SERVICE_KEY=...` 추가

### Claude가 진행할 코드 작업
1. `backend/agents/tour_api.py` — 신규 모듈
   - `search_nearby_restaurants(lat, lon, radius=500)` → `areaBasedList2` API
   - `restaurant_detail(content_id)` → `detailIntro2`
   - 캐시: in-memory 1h LRU
2. `backend/api/main.py` — `/restaurants/nearby` 엔드포인트
3. `frontend/app/components/Results.tsx` — "📍 근처 식당" 섹션 추가 (Phase 1: mock 좌표 또는 사용자 GPS)
4. 제안서 §3.1·§3.2 — TourAPI 활용 방안 강조

### 검증 기준
- 서울시청 (37.5665, 126.9780) 근처 식당 5개 반환
- 각 식당에 "관광지 카테고리"·"주차 가능"·"영업시간" 메타
- 응답 < 2초

---

## 💼 사업 포지셔닝 (검토 결과, ADR-013)

- **공모전 단계**: "도구 + 진흥원 협상권"
- SNS 채널 본격 운영은 **보류** (5대 함정: cold-start·기존 경쟁자·수익<비용·1인 명예훼손 리스크 등)
- review·threads·룰렛 코드는 유지 → "Phase 2 발전 방향"으로만 제안서에 언급
- 시연 영상은 **decide → order 30초 폐회로 + 리뷰는 마지막 0.5초 cameo**

---

## ⚠️ 미푸시 commits (사용자 명시 승인 필요)

이 세션에서 만든 변경 commit 다수가 origin/main 미푸시 상태일 수 있음. 새 세션 시작 시 `git log origin/main..HEAD --oneline` 확인 후 사용자에게 푸시 승인 요청.

---

## 🆘 막혔을 때 순서

1. `CONTEXT.md` 다시 읽기 — 본질로 돌아가기
2. `FAILURES.md` 검색 — 같은 함정인지 확인
3. `DECISIONS.md` — 왜 이렇게 했는지 ADR 확인
4. `docs/research/05_한식800선_정제스펙.md` — 데이터 모델 ground truth
5. 백엔드 로그: `Bash` tail
6. 프론트 prod 빌드: `cd frontend && npm run build`

---

## 핵심 명령어

```bash
# 백엔드 헬스
curl http://172.30.1.53:8000/health

# E2E 합성 메뉴판
curl -X POST http://172.30.1.53:8000/analyze \
  -F "image=@tests/fixtures/synthetic_menu.png" \
  -F "language=en" -F "allergies=pork"

# 리뷰 enrichment 검증
curl -X POST http://172.30.1.53:8000/reviews \
  -H "Content-Type: application/json" \
  -d '{"dish_name":"김치찌개","rating":5,"comment":"Good","language":"en"}'

# FX 환산
curl "http://172.30.1.53:8000/fx?krw=42000&language=ja"

# 프론트 prod 재빌드
cd frontend && npm run build && preview_start name=frontend-nextjs-prod
```
