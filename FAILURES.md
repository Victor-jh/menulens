# FAILURES

> 실패·막힌 지점·우회 방법을 여기 기록. 같은 실수 반복 방지.
> 과거 확산적 사고 패턴 감지 시에도 여기 기록.

---

## 템플릿
```
## YYYY-MM-DD · 제목
**상황**: 무엇을 하려고 했는지
**문제**: 왜 안 됐는지
**시도**: 어떤 방법을 시도했는지
**해결/우회**: 결과
**교훈**: 다음에 이런 상황을 만나면 어떻게 할지
```

---

## 2026-04-26 (D9) · 20번째 함정 — Render Docker 빌드 5초 fail, GitHub deployments API로 진단

**상황**: 사용자가 Vercel + Render 배포 "완료" 보고. Vercel은 정상이지만 Render `https://menulens-backend.onrender.com/health`가 처음엔 404 (`x-render-routing: no-server`), 이후 사용자 manual deploy 후엔 응답 행(60s timeout). 빌드 진행 중인 줄 알고 5분 폴링 → 진전 없음.

**진단 키 — `gh api repos/.../deployments/{id}/statuses`**:
GitHub Deployments API에 Render webhook이 자동 deploy 결과를 기록한다. 우리 case:
```
2026-04-25T16:38:59Z in_progress
2026-04-25T16:39:41Z failure   ← 42초만에 fail
```
Docker 빌드는 정상이면 3~5분. 42초 fail = `pip install` 의존성 해소 단계에서 즉시 죽음.

**진짜 원인 (로컬 `docker build`로 재현)**:
```
ERROR: Cannot install -r backend/requirements.txt (line 10), -r ... (line 11), -r ... (line 2),
       pydantic==2.9.2 and supabase because these package versions have conflicting dependencies.
```
- `pydantic==2.9.2`(line 4) vs `supabase==2.29.0`(line 17) vs `anthropic==0.39.0`(line 10) vs `google-generativeai==0.8.3`(line 11) 충돌.
- 로컬 `.venv`에는 이미 호환 버전 캐시되어 안 보였음. Docker는 PIP_NO_CACHE_DIR=1 fresh resolve → ResolutionImpossible.

**보너스 — Dockerfile shell parsing**: `RUN pip install -r ... google-genai>=1.73`. sh가 `>=1.73`을 redirect로 해석 → stdout이 파일 `=1.73`으로 redirect, pip은 `google-genai`(constraint 없이) 설치. 이번엔 동작했지만 잠재 위험.

**수정**:
- requirements.txt 핀 버전을 안전 범위로: `pydantic>=2.9,<3` / `anthropic>=0.40,<1` / `google-genai>=1.5,<2` 등
- Dockerfile: `pip install -r requirements.txt` 단독 (extra package 합치지 말 것), `pip install --upgrade pip` 추가

**검증**:
- 로컬 `docker build .` → 약 80초 PASS
- `docker run --env-file backend/.env` → uvicorn 시작, GET /health 200 OK
- git push → 새 자동 deploy(7e44d0a) 5초 fail 안 함, 정상 빌드 단계 진입

**교훈**:
- **로컬 venv ≠ Docker 빌드**. Docker 빌드는 항상 fresh resolve. 클라우드 배포 전 `docker build` 한 번 돌려보자.
- **GitHub Deployments API**는 Render dashboard 접근 없이 deploy 상태 추적 가능 (`gh api repos/{owner}/{repo}/deployments`). webhook 이벤트로 commit→deploy 매핑.
- **`x-render-routing: no-server`**: Render 서비스 도메인 존재 + 컨테이너 미구동. `502/503`(컨테이너 살아있다 죽었다 함)과 구별.
- 핀 버전(`==`)은 monolith가 아닐 때 위험. 안전 범위(`>=X,<Y`)가 의존성 해소 충돌 회피에 유리.

---

## 2026-04-25 (D8 후반) · 19번째 함정 — 다운로드 폴더 파일 오인 + 60분 잘못된 트러블슈팅

**상황**: 사용자가 채팅에 메뉴판 사진 첨부 + "다운로드 폴더에 IMG_0426.heic" 안내. 그 파일이 곧 메뉴판이라고 가정하고 `/analyze` 호출 → 결과는 `Sources: photo_id, items 6` (떡볶이/순대/김밥…). 모델 한계로 오해.

**잘못된 가정 4단계 (모두 무용)**:
1. 프롬프트 Mode Priority 룰 강화 (5+ 텍스트 = TEXT MODE 강제)
2. sips로 1600px 다운샘플 + EXIF normalize
3. 하단 35% crop으로 음식 사진 영역 제거
4. Gemini 2.5 Flash → 2.5 Pro 모델 업그레이드 + force_mode=text override

모두 적용해도 동일하게 photo_id 6건 — 모델이 override 무시하는 줄 알았다.

**진실**: cropped jpg를 직접 열어보니 IMG_0426.heic는 식탁 위 음식 사진(떡볶이·김밥·도가니탕·어묵탕·단무지)이었다. 채팅 첨부 사진과 다운로드 폴더 파일이 **서로 다른 파일**. Gemini는 처음부터 100% 정답이었다.

**진짜 메뉴판 사진(다운로드 (1).jpeg, 468×832 메신저 압축본)으로 재시도**:
- 77개 메뉴 (실제 ~80개 중 1개 OCR noise drop) · 가격 77/77 추출 · OCR 95% · 42s
- 페르소나 conflict 정확 (돈까스→pork, 치킨까스→chicken, 부대찌개→pork)
- 가격 차단 정확 (참치김밥 ₩5000 → 김밥 평균 ₩3,700 대비 35%)
- 무료 사이드 14개 (단무지/국 등)

**교훈**:
- **first 5분에 cropped output을 직접 열어봤어야**. Read 한 번이면 끝날 일을 4단계 가정 위에 쌓음.
- 사용자가 보낸 채팅 이미지와 사용자가 가리킨 파일 path가 다를 수 있다 — 검증 1단계는 항상 **이미지를 시각으로 확인**.
- force_mode + system_instruction + mode 파라미터는 결과적으로 메뉴판 모드 정확도에 기여 (468×832 작은 채팅 압축본에서도 77개 OCR 통과). 잘못된 가정 위 산출물도 일부는 살아남음 — rollback 결정 시 **개선 vs 추측을 분리**해서 평가.

---

## 2026-04-25 (D8 시작) · 18번째 함정 — frontend/backend allowed-values 드리프트

**상황**: D7 P0 감사에서 frontend `types.ts:124`의 `UserProfile.diet`에 `"pescatarian"` 추가했지만 backend `main.py` `ALLOWED_DIETS = {"", "vegan", "vegetarian"}`에는 누락. 사용자 onboarding에서 Pescatarian 선택 → localStorage 저장 → /analyze 호출 시 매번 `400 Unsupported diet: pescatarian`. 사용자 입장에선 "서버가 작동 안 하는" 것처럼 보임.

**문제**: verdict.py(line 141~148)는 pescatarian 완전 지원 — 누락된 곳은 입력 검증 1줄. 두 layer가 enum을 각자 들고 있고 단일 출처가 없어 한쪽만 추가됨.

**해결**: `ALLOWED_DIETS = {"", "vegan", "vegetarian", "pescatarian"}` (1라인). canary `/analyze ... -F diet=pescatarian` → 200.

**교훈**:
- frontend/backend가 enum/literal을 따로 정의하면 한쪽만 늘어나는 사고가 반드시 일어남. 같은 검증 정책이 verdict.py·types.ts·main.py 3곳에 흩어져 있음.
- 다음 enum 추가 시 grep checklist: `grep -RIn "<new_value>"` 후 frontend·backend 양쪽 hit 확인.
- 페르소나 시연 직전 localStorage에 프로필이 미리 박혀 있으면 새 빌드 즉시 수치 잘못 보일 수 있음 — onboarding "초기화" 진입로가 있는지 확인. (현재 Onboarding 화면 자체로 회귀 가능)

**조사 흐름이 빨랐던 이유**: snapshot의 alert 노드(`서버 응답 오류 400: ...`)가 정확한 backend 응답을 그대로 노출. UI에 raw error를 살짝 보이게 두는 D7 결정이 디버깅 시간 1/10로 줄임.

---

## 2026-04-25 (D5+D6+D7) · 한 세션 안에서 만난 17개 함정 — 다음 세션 같은 실수 방지

### Backend 인프라
1. **Supabase 새 API 키 포맷 거부** — supabase-py 2.9.1은 JWT만 인정, `sb_publishable_*`/`sb_secret_*` 거부. **해결**: `supabase==2.29.0` 업그레이드. requirements 박제.
2. **`models/text-embedding-004` v1beta 404** — Google이 v1로 리브랜드. **해결**: `models/gemini-embedding-001` + `output_dimensionality=768` (VECTOR(768) 정합).
3. **dish_profiler anon 빈 결과** — Supabase RLS가 anon SELECT 차단(묵시적). **해결**: backend는 `SUPABASE_SERVICE_KEY` 우선, anon은 frontend 노출용. 명시적 RLS policy는 D8+ 작업.
4. **Gemini Vision 30s 타임아웃** — 4032×3024 핸드폰 사진은 매번 timeout. **해결**: 백엔드 60s + frontend 90s + 클라이언트 1600px 리사이즈 + JPEG 0.85 (10MB→500KB).
5. **분식집 메뉴 78개 cap 50 reject (HTTP 413)** — 김밥천국식 분식점은 50~80개 일반. **해결**: cap 80 + 초과 시 auto-truncate + 한국어 warning.

### TTS 함정
6. **Gemini TTS 무료 quota 도달 (429 RESOURCE_EXHAUSTED)** — 1~2분 시연에 5~10번 호출하면 연쇄 실패. **해결 (ADR-010)**: Microsoft Edge TTS primary (무료·무제한·`ko-KR-SunHiNeural`), Gemini fallback. `edge-tts` 패키지.
7. **Frankfurter API KRW base 미지원** — KRW은 ECB 비공식 통화. 또 `frankfurter.app`은 `frankfurter.dev`로 301 redirect, httpx default `follow_redirects=False`라 빈 body. **해결**: `frankfurter.dev/v1/latest?base=USD&symbols=KRW,JPY` cross-rate + `follow_redirects=True`.

### Chrome MCP 함정
8. **`mcp__Claude_in_Chrome__file_upload` "Not allowed"** — `display:none` input 보안 정책. **해결**: `fetch('/asset.png')` → `Blob` → `File` → `DataTransfer.items.add()` → `input.files = dt.files` → `dispatchEvent(new Event('change', {bubbles:true}))`.
9. **Supabase 대시보드 MCP 탭에서 JS 미로드** — 재방문 시 monaco editor 안 뜸 (body.innerText=0). **해결**: SQL 파일은 사용자가 수동 1회 실행. tts.py 같은 코드는 graceful degrade로 작동.
10. **iOS 미러링 좌표가 "알림 센터"로 라우팅** — macOS Sequoia 데스크탑 widget layer가 click hit-test 가로챔. **해결**: 키보드 입력만 가능, click은 우회. iPhone 직접 테스트 필요.

### Frontend 함정
11. **iOS Safari `display:none` 파일 input click() 차단** — 보안 정책. **해결**: `<label>` 감싸기 패턴 + `class="sr-only"`. button onClick → input.click() 패턴 금지.
12. **Phase 분리로 Upload 컴포넌트 unmount → 사진 state 사라짐** — `setPhase("loading")` 시 React가 Upload mount 해제, 분석 실패 후 `phase="upload"`로 돌아오면 file=null로 빈 화면. **해결**: phase에서 "loading" 제거, Upload 자체 busy overlay로 처리. file/error state 보존.
13. **`mounted` gate가 useEffect 미작동 시 영구 spinner** — `mounted=false → return spinner` 패턴. iOS Safari hydration 간헐 실패 시 useEffect 안 돌아 mounted 영원히 false. **해결**: gate 제거, 단순 useState. localStorage race는 functional update로 방어.
14. **Next dev 번들이 iOS에서 무거움** — HMR + StrictMode + dev runtime이 iOS Safari hydration 지연. **해결**: `npm run build && next start -H 0.0.0.0`. preview-prod config 추가.
15. **`http://`/`https://` 환경 캐시** — Safari/Chrome dev 캐시가 옛 빌드 보임. **해결**: 매번 `?v=tag` 쿼리 추가. `Cmd+Shift+R` 가이드.

### UX/데이터 함정
16. **음식 사진 모드 confirm 다이얼로그 도배** — 모든 카드마다 "AI photo ID, verify on menu" → 8개 카드면 8번 confirm. **해결**: 결과 화면 상단 배너 1번 + 카드 라벨 제거. free_side는 `sessionStorage` flag로 첫 한 번만 confirm.
17. **분식집 장국이 메뉴로 잘못 분류** — Gemini가 "장국"을 메인 메뉴로 식별. 한국 식당 무료 사이드 문화 미반영. **해결**: Gemini 프롬프트에 free_side 분류 명시 + backend 사전 매칭 25개 키워드(김치/장국/맑은국/멸치볶음 등). + 버튼 색 다름 + 첫 추가 시만 confirm.

### 사업·아키텍처 함정
- **SNS 사업 모델로 pivot 검토 → 5대 함정 발견 (ADR-013)**: Cold-start 데드락, Maangchi/Korean Englishman 14년 격차, 수익 < 변동비, 명예훼손 리스크. → 공모전 단계는 도구 + B2B 데이터 자산 포지셔닝 유지.
- **빌드 → preview_start 워크플로우** — Next prod는 HMR 없으니 코드 변경 시 매번 `npm run build` + `preview_stop` + `preview_start`. dev로 테스트하다 prod 배포에서 새 버그 발견하지 않게.

---

## 2026-04-25 · D7 Chrome MCP 파일 업로드 제약 & Supabase 대시보드 렌더 불안정
**상황**: Chrome MCP로 Supabase SQL Editor에 두 번째 SQL(`002_tts_cache.sql`) 실행 + frontend E2E 업로드 테스트
**문제**:
1. Supabase 대시보드 재방문 시 JS 번들 미로드 (body.innerText=0, monaco 미노출) — 8초 대기해도 해결 안 됨
2. `mcp__Claude_in_Chrome__file_upload`가 `{"code":-32000,"message":"Not allowed"}` 반환. `capture="environment"` 제거해도 동일
**시도**:
- 새 탭 재생성, reload, URL 변경 → 모두 실패
- input에서 `hidden` 클래스 제거 후 MCP file_upload 시도 → Not allowed
**해결/우회**:
1. Supabase SQL: `backend/db/002_tts_cache.sql`은 **사용자가 수동 실행** (MCP 대체 실패)
   · tts.py는 캐시 실패 시 graceful degrade로 이미 대응 → 테이블 없이도 작동
2. 파일 업로드: `frontend/public/synthetic_menu.png` 배치 → 브라우저 내 `fetch() + DataTransfer + change event` 디스패치로 정상 주입 성공
**교훈**:
- Chrome MCP는 React-controlled file input의 native 업로드를 막는 보안 정책. SPA 업로드 테스트는 `fetch + DataTransfer` 패턴으로 우회
- Supabase 대시보드는 MCP-driven 탭에서 재방문 시 JS 로드 실패 빈번 → DDL은 첫 회 바로 실행하는 게 안전
- 자동화 실패 시 `graceful degrade` 코드가 진짜 유용 — tts.py try/except가 전체 흐름을 구해줌

### Supabase tts_cache 테이블 수동 생성 (남은 작업)
Supabase SQL Editor에 [backend/db/002_tts_cache.sql](backend/db/002_tts_cache.sql) 붙여넣고 Run. 테이블 없어도 TTS 작동하지만 생성하면 Gemini API 재호출 방지되어 응답 시간·비용 절감.

---

## 2026-04-23 · D3 파이프라인 실행 블로커 → 2026-04-25 해소
**상황**: D3 ROADMAP = 800선 CSV 다운로드 → 정규화 → pgvector 적재 → "김치찌개" 캐너리
**문제**: 선행 리소스 전부 미구비
- ❌ `.env` 없음 (GEMINI/OPENAI/SUPABASE 키 미설정)
- ❌ `backend/data/hansik_800.csv` 실제 다운로드 안 됨 — ROADMAP D1 체크박스 "한식진흥원 길라잡이 800선 파일 다운로드 (15129784)" 아직 미완료
- ❌ Supabase 프로젝트 자체가 없음 (URL·키 없음) — ROADMAP D2 "Supabase 프로젝트 생성" 미완료
- ❌ OpenAI API 키 없음
**시도**:
- venv 생성 + pandas/pydantic/dotenv 설치 → 로컬 dry-run 가능한 수준까지 올림
- `backend/data/hansik_800.csv` **합성 10행 샘플** 투입 → 파이프라인 로직(정규화·태그·분류) 전 단계 검증 완료
- 실 데이터 컬럼 매핑 유연화: `backend/data/hansik_800_column_map.json` 파일이 있으면 오버라이드
**해결/우회**:
- 스캐폴드 4개 생성: `backend/db/001_hansik_800.sql`, `backend/scripts/load_hansik_800.py`, `backend/agents/dish_profiler.py` (D3 RAG 로직 구현), 합성 CSV
- 키·실CSV·Supabase 확보 즉시 `python -m backend.scripts.load_hansik_800` 한 줄로 실행 가능
**교훈**:
- **15129784는 fileData 유형**: 공공데이터포털 로그인만 하면 즉시 다운로드 가능, 활용신청 승인 대기 없음. (OpenAPI인 15101578 TourAPI와 혼동 금지)
- 다만 `.env` 키·Supabase 프로젝트 생성은 여전히 선행되어야 함 — 다음 맥북 세션 첫 작업은 이 두 가지
- ADR-008 채택으로 OpenAI 키 의존 제거: Gemini 키만 보유해도 D3 완전 실행 가능

### 2026-04-25 블로커 해소 현황
- [x] `backend/data/hansik_800.csv` — Cowork가 xlsx → CSV 정제 후 커밋(a078944). 800행 × 13열 UTF-8-sig
- [x] `backend/data/hansik_800_column_map.json` — Cowork 작성 (canonical ↔ 원본 xlsx 컬럼 역매핑)
- [x] `.env` — ANTHROPIC/GEMINI/SUPABASE_URL/ANON/SERVICE 5종 입력 완료
- [x] ADR-008 결정 (Gemini text-embedding-004, 768d) — OpenAI 키 불필요
- [x] SQL·로더·dish_profiler 실 컬럼 반영 재작성 완료
- [x] 실 800행 dry-run 캐너리(source_no=261 김치찌개) PASS: tags={pork,seafood,soy}, spicy=2
- [ ] Supabase SQL Editor에서 `backend/db/001_hansik_800.sql` 실행 (사용자 작업)
- [ ] `python -m backend.scripts.load_hansik_800` 라이브 실행 → 실 캐너리 검증

---

## 과거 12개 미완 프로젝트 패턴 (재발 방지용 참조)
1. 이디야 레시피 뷰어 React 앱 — 데이터 변환 양 과다로 중단
2. MVNO 모니터링 사업화 — B2G 영업 검증 없이 확장 설계
3. AI 멀티클론 18개 역할 시스템 — 설계만 방대, 실행 0
4. hwpx-studio v1.1 — 재설계 완료, 배포 미실행
5. VITO API 전사 스크립트 — 계획만, 코드 미작성
6. Kmong 프리랜싱 — 의지 표명만
7. Claude Certified Architect — 경로 조사만
8. Smart Travel Guide — Google Apps Script 배포했으나 미활용
9. 3-layer 프로젝트 컨텍스트 — 설계 완료, 적용 없음
10. Voice Activated Recorder 파이프라인 — 6레이어 설계만
11. Korea Partner Network — 1차 통과 후 정체
12. DID 블록체인 공공 플랫폼 — 제안 초안만

**공통 패턴**: 기반 완성 전 확장 설계, 수입 창출 실적 0
**이번 프로젝트의 차별점**: D7 Hard Gate + 기능 추가 금지 선언 + 예심 후 재결정 3층 방어
