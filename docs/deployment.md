# MenuLens Deployment Plan

> **작성일**: 2026-04-25 (D7)
> **목표**: Hard Gate 모바일 브라우저 실측 + D14 제출 전 안정적인 데모 URL 확보
> **구조**: 프론트(Vercel) + 백엔드(Render) 분리 배포. DB는 Supabase 매니지드.

---

## 1. 아키텍처

```
┌──────────────┐     POST /analyze       ┌─────────────────┐      ┌───────────┐
│ Next.js 16   │ ──────────────────────> │ FastAPI         │ ──>  │ Supabase  │
│ (Vercel)     │ <────────────────────── │ (Render Docker) │ ──>  │ hansik_800│
│ preview URL  │        JSON + WAV b64    │ :8000           │      │ tts_cache │
└──────────────┘                          └─────────────────┘      └───────────┘
                                            │
                                            ├─ Gemini (Vision/Embed/TTS)
                                            └─ Anthropic (D5+ structured)
```

- **프론트엔드**: Next 16 App Router → Vercel Hobby (무료). 자동 GitHub 연동.
- **백엔드**: FastAPI on Docker → Render Free 티어 (15분 idle → sleep, cold start ~30초).
- **DB**: Supabase 프로젝트 `lsvwboqkfmqgtcgqyuxw` (이미 프로비저닝).
- **비용**: D14 제출까지 $0 목표 (Gemini 무료 티어 + Render/Vercel 무료).

---

## 2. 백엔드 (Render)

### 2.1 최초 배포

1. Render 대시보드 로그인 (GitHub 계정)
2. **New → Blueprint** → 저장소 `Victor-jh/menulens` 연결
3. Render가 `render.yaml`을 감지 → `menulens-backend` 서비스 생성
4. 환경변수 등록 (Blueprint는 `sync: false`로 대화형 입력 요구):
   - `GEMINI_API_KEY`
   - `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` / `SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` (D5 확장 시)
5. Deploy → 빌드 약 3~5분 → `https://menulens-backend.onrender.com/health` 확인

### 2.2 재배포
- `main` 브랜치 push → 자동 트리거 (Blueprint autoDeploy)
- 수동 재시작: Render 대시보드 → Manual Deploy

### 2.3 Dockerfile 구조
- 루트 `Dockerfile` 사용 (single-stage, python:3.13-slim)
- `HEALTHCHECK`로 `/health` 폴링
- `PORT` 환경변수(Render 주입) 우선, 미지정 시 8000

### 2.4 로컬에서 동일 컨테이너 시뮬레이션
```bash
docker build -t menulens-backend .
docker run --rm -p 8000:8000 \
  --env-file backend/.env \
  menulens-backend
```

### 2.5 대안 (Render 외)
- **Fly.io**: `fly launch` → 같은 Dockerfile 재사용. 무료 compute 3대, 글로벌 배포.
- **Railway**: Dockerfile 자동 감지. $5 크레딧/월.
- **Vercel Functions (Python)**: 가능하지만 pandas/supabase가 cold start 느리게 만듦 (PoC 비권장).

---

## 3. 프론트엔드 (Vercel)

### 3.1 최초 배포

1. Vercel 대시보드 로그인 (GitHub)
2. **Add New → Project** → `Victor-jh/menulens` 선택
3. **Root Directory** → `frontend/` 지정 (모노레포 구조이므로 중요)
4. Framework Preset: Next.js (자동 감지)
5. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` = `https://menulens-backend.onrender.com`
6. Deploy → 1~2분 → `https://menulens-xxx.vercel.app`

### 3.2 Production 도메인 (선택)
- 공모전 제출 페이지에 링크 걸 때 안정적 URL이 유리
- Vercel → Domains → `menulens.vercel.app` 또는 커스텀 도메인

### 3.3 CLI 배포 (선택)
```bash
cd frontend
npx vercel --yes            # 첫 회 프로젝트 링크
npx vercel env add NEXT_PUBLIC_API_URL
npx vercel --prod           # 프로덕션
```

### 3.4 Preview 배포
- PR마다 자동 preview URL 생성 → 시연 영상 촬영에 유용
- `frontend/vercel.json`에 `"github": { "silent": true }` 설정 → PR 코멘트 자동 생성 억제

---

## 4. CORS 설정

`backend/api/main.py`의 CORS는 `CORS_ORIGINS` 환경변수 기반 화이트리스트 + glob wildcard 지원 (D8 적용):

```
CORS_ORIGINS=http://localhost:3000,
             https://menulens.vercel.app,
             https://menulens-*.vercel.app,
             https://menulens-*-victor-jh.vercel.app,
             https://menulens-*-victor-jh-projects.vercel.app
```

- `*`이 포함된 항목은 `allow_origin_regex`로 컴파일됨 (각 `*`는 `[^.]+`로 한 segment만 매칭).
- 정확 일치 origin은 `allow_origins` 리스트로, glob은 `allow_origin_regex`로 분리되어 처리.
- `*` 단독("*")은 별도로 인식하지 않으며, credentials 허용 토글에만 영향.

검증 (D8 canary):
```
http://localhost:3000                                   → 200
https://menulens.vercel.app                             → 200
https://menulens-abc123.vercel.app                      → 200
https://menulens-git-main-victor-jh.vercel.app          → 200
https://evil.com                                        → 400 (block)
```

Render 배포 후 실제 Vercel preview URL 패턴이 위 4개 외라면 .env에 추가 후 Render 환경변수 갱신.

---

## 5. 환경변수 맵

| 변수 | Vercel | Render | 로컬 `.env` | 비고 |
|---|:-:|:-:|:-:|---|
| `GEMINI_API_KEY` | — | ✅ | ✅ | Vision/Embed/TTS |
| `ANTHROPIC_API_KEY` | — | ✅ | ✅ | D5 확장 예비 |
| `SUPABASE_URL` | — | ✅ | ✅ | |
| `SUPABASE_SERVICE_KEY` | — | ✅ | ✅ | RLS 우회 (백엔드 전용, 프론트 노출 금지) |
| `SUPABASE_ANON_KEY` | — | ✅ | ✅ | (백엔드 fallback용) |
| `NEXT_PUBLIC_API_URL` | ✅ | — | ✅ | 프론트가 백엔드 가리키는 URL |
| `APP_ENV` | — | ✅ | ✅ | `production`/`development` |

---

## 6. 배포 검증 체크리스트 (D7 Hard Gate)

### 6.1 백엔드
- [ ] `GET /health` → `{"status":"ok", gemini_key:true, supabase_url:true}`
- [ ] `POST /analyze` with `tests/sample_menus/synthetic_menu.png` → 6 items, OCR ≥95%, 색깔 3종 포함
- [ ] Cold start 후 첫 요청 < 60초
- [ ] 두번째 요청 (warm) < 10초

### 6.2 프론트엔드
- [ ] 온보딩 → 업로드 → 결과 화면 전환 3개 모두 렌더링
- [ ] 모바일 Safari (iPhone) + Chrome Android 양쪽 테스트
- [ ] TTS 재생 버튼 → 오디오 실제 들림
- [ ] 카메라 촬영 (capture="environment") 동작

### 6.3 E2E
- [ ] Vercel URL에서 실제 메뉴판 사진 업로드 → Render 백엔드 경유 → 결과 표시
- [ ] 네트워크 탭: `fetch /analyze` 200 응답

---

## 7. 로컬 개발 (Cowork/다음 세션)

```bash
# Claude Code의 preview_start로 두 서버 동시 부팅
# (.claude/launch.json에 이미 등록됨)

# 수동 실행 (대체):
.venv/bin/python -m uvicorn backend.api.main:app --reload --port 8000 &
cd frontend && npm run dev
```

---

## 8. 롤백 전략

- **Vercel**: 대시보드 → Deployments → 이전 배포 "Promote to Production"
- **Render**: Deploys → 이전 빌드 "Rollback"
- **Supabase**: 스키마 변경 시 `backend/db/00N_*.sql`을 SQL Editor에 역순으로 (다만 데이터 손실 주의)
