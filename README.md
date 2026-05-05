# MenuLens 🍱

> **찰칵 한 번. 초록색만 주문하세요.**
> *One tap. Order what's green.*

한국 식당 앞에 선 외국인이 메뉴판 사진 한 장으로 "이 메뉴를 시켜도 될지"를 **4초 안에** 판단할 수 있도록 돕는 AI 어시스턴트.

[![CI](https://github.com/Victor-jh/menulens/actions/workflows/ci.yml/badge.svg)](https://github.com/Victor-jh/menulens/actions/workflows/ci.yml)
[![Live](https://img.shields.io/badge/live-menulens--app.vercel.app-3CA86A?logo=vercel&logoColor=white)](https://menulens-app.vercel.app)
[![Status](https://img.shields.io/badge/status-Hard_Gate_PASS-brightgreen)]()
[![Tests](https://img.shields.io/badge/pytest-28%2F28%20passing-brightgreen)]()
[![A11y](https://img.shields.io/badge/WCAG-2.1_AA-1F6E40)]()
[![Competition](https://img.shields.io/badge/2026_KTO-관광데이터_활용_공모전-blue)]()
[![Data](https://img.shields.io/badge/TourAPI_4.0-LOD_SPARQL_+_KorService2-purple)]()
[![Persona](https://img.shields.io/badge/personas_verified-Yui%20%C2%B7%20Aisha%20%C2%B7%20Chen%20%C2%B7%20Mike-7A4F11)]()

---

## 🎯 문제

2026년, 방한 외국인 2,000만 명 시대. 그런데 식당 앞에서 막힌다.

외국인은 메뉴판 앞에서 동시에 4가지를 모른다:
1. **뭐라고 쓰여있는지** — 메뉴 이름과 정체
2. **얼마나 적정한 가격인지** — 바가지인지 정상가인지
3. **먹을 수 있는 재료인지** — 알레르기·종교·비건 여부
4. **주문을 어떻게 하는지** — 한국어 발음

기존 도구는 각자 ①만 해결:
- Papago, Google Lens: 번역만
- 맛집 앱: 메뉴 레벨 정보 없음
- Visit Korea 공식앱: 메뉴 레벨 0

## 💡 해결

**사진 1장 → AI 3개 에이전트 → 색깔 3종(🟢🟡🔴) 오버레이 + 탭-주문 TTS**

글자를 읽을 필요 없이, 메뉴판에 카메라를 대고 탭하면 **먹을 수 있는 것은 초록색**으로 빛난다.

## 🏗️ 아키텍처

```
사용자 (카메라 📸)
         │
         ▼  [사진 1장]
  ┌──────────────────────────────┐
  │   MenuLens Backend           │
  │                              │
  │  ⓪ Hermes Router            │  ← Gemini Vision 분류
  │   (menu / single_dish /      │     parallel dispatch
  │    not_food)                 │
  │           │                  │
  │     ┌─────┴─────┐            │
  │     ▼           ▼            │
  │  [menu]   [single_dish]      │
  │     │           │            │
  │  ① Menu Reader  ④ Dish      │
  │   (Gemini Vis)  Finder       │
  │     │          (LOD bestMenu │
  │  ② Dish        역방향)       │
  │   Profiler                   │
  │   (Claude+RAG)               │
  │     │                        │
  │  ③ Price                    │
  │   Sentinel                   │
  │     │                        │
  │     ▼                        │
  │  🟢🟡🔴 + TTS               │
  └──────────────────────────────┘
```

## 📊 활용 공공데이터

| 데이터셋 | 역할 |
|---|---|
| **TourAPI 4.0 LOD SPARQL** ⭐ | 식당 1.47M entities · `kto:Gastro` 15.5K — **역대 13회 수상작 최초 활용** ([ADR-014](DECISIONS.md)) |
| **TourAPI 4.0 KorService2** | 다국어 5종(Eng/Jpn/Chs/Cht) 라벨 보강 |
| **한식진흥원 길라잡이 800선** | 영·일·중 표준 메뉴 번역 (Gemini text-embedding-004 RAG) |
| **한국소비자원 참가격** | 서울 8개 외식 품목 평균가 |
| **식약처 식품영양성분DB** | 알레르기 재료 검증 |
| **카카오 로컬 API** | 식당 위치·지역 보정 |

## 🛠️ 기술 스택

- **Frontend**: Next.js 16 (App Router, Turbopack) + Tailwind 4
- **Backend**: FastAPI (Python 3.11) on Render (Docker)
- **AI**: Claude Sonnet 4.6 · Gemini 2.5 Flash Vision · Gemini text-embedding-004 (768d)
- **DB**: Supabase Postgres + pgvector + HNSW
- **TTS**: Microsoft Edge TTS (primary, free 무제한) + Gemini TTS fallback ([ADR-010](DECISIONS.md))
- **Deploy**: Vercel (frontend) + Render Docker (backend)

## 🚀 시작하기

### 요구사항
- Python 3.11+
- Node.js 20+
- Supabase 계정
- API 키: Claude (Anthropic), Gemini (Google AI), Supabase, TourAPI (한국관광공사) — OpenAI 키 불필요 ([ADR-008](DECISIONS.md))

### 설치
```bash
# 백엔드
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 환경 변수
cp .env.example .env
# .env 파일에 API 키 입력

# 실행
uvicorn api.main:app --reload
```

### 프론트엔드
```bash
cd frontend
npm install
npm run dev
```

### E2E Smoke Test (촬영/제출 직전 5분 점검)

```bash
# 로컬 backend
pytest tests/test_smoke_e2e.py -v

# 프로덕션 (Render)
MENULENS_API=https://menulens-backend.onrender.com pytest tests/test_smoke_e2e.py -v
```

8개 테스트: /health, Hermes 라우터, Chen nuts 알러지, LOD nearby graceful, dish_finder, FX, CORS, latency. 8/8 PASS = stack 정상.

## ✅ Hard Gate 검증 결과 (D8, 2026-04-25)

서울 연신내역 분식점 메뉴판 80개 메뉴 stress 케이스:

| 항목 | 측정값 |
|---|---|
| 메뉴 OCR | **77/80** (96%, OCR 95%) |
| 가격 자동 추출 | **77/77** (100%) |
| 페르소나 conflict 차단 정확도 (Pescatarian) | **36/36** |
| 무료 사이드 자동 인식 | 14건 (단무지·맑은국 등) |
| LOD nearby 응답 (서울시청 5건) | **<800ms** · 사진 5/5 인라인 |
| 처리 시간 (cap 80개 + RAG·TTS 병렬) | 42.2초 |

상세: [docs/proposal.md §3.3](docs/proposal.md), [docs/pitch_deck.md §7](docs/pitch_deck.md)

## 📅 로드맵

- **v0.1 (PoC)**: 사진 모드 + 색깔 오버레이 + 탭-주문 (D1~D7) ✅
- **v0.2 (D8~D9)**: TourAPI LOD/OpenAPI 이중 채널, Yui·Aisha 페르소나 검증, Vercel+Render 배포 ✅
- **v0.3 (D10~D12, 코드 동결)**: Hermes 라우터 + dish_finder + v2 single path, Chen·Mike 검증, CI 28/28 ✅
- **v1.0 (Post-competition)**: 라이브 AR 모드, B2B 식당 대시보드
- **v2.0**: 전국 확장, 사용자 크라우드 가격 제보

## 📚 Documentation

| Document | Purpose |
|---|---|
| [CONTEXT.md](./CONTEXT.md) | Project overview (single-page onboarding) |
| [ROADMAP.md](./ROADMAP.md) | D1~D16 daily checklist |
| [DECISIONS.md](./DECISIONS.md) | Architecture decision records (ADR-001~017) |
| [FAILURES.md](./FAILURES.md) | 25개 함정 기록 (재발 방지) |
| [docs/proposal.md](./docs/proposal.md) | Competition submission proposal (5p) |
| [docs/pitch_deck.md](./docs/pitch_deck.md) | 90s demo video shot list |
| [docs/user_stories.md](./docs/user_stories.md) | 4 user personas |
| [docs/review_proposal_scorecard.md](./docs/review_proposal_scorecard.md) | Self-scoring against 100pt rubric |
| [docs/submission/checklist.md](./docs/submission/checklist.md) | Submission form fields & deadlines |
| [docs/submission/hwp_conversion_plan.md](./docs/submission/hwp_conversion_plan.md) | MD→DOCX→HWP/PDF pipeline |
| [docs/research/](./docs/research/) | 6 research reports (market, tech, data, spec) |

## 🎖️ Competition

2026 관광데이터 활용 공모전 ① 웹·앱 개발 부문 제출 프로젝트

- 주최: 한국관광공사
- 접수: 2026-05-06 (수) 16:00 마감
- 개발 기간: 2026-04-21 ~ 2026-09 (MVP)

## 📜 License

MIT License — Open for public benefit, as befits a project built on public data.

## 🤝 Contributing

Public data를 활용한 외국인 방한객 신뢰성 회복 프로젝트. 이슈·제안·기여 환영.

---

**Made with Claude** · 2026
