# MenuLens 🍱

> **찰칵 한 번. 초록색만 주문하세요.**
> *One tap. Order what's green.*

한국 식당 앞에 선 외국인이 메뉴판 사진 한 장으로 "이 메뉴를 시켜도 될지"를 **4초 안에** 판단할 수 있도록 돕는 AI 어시스턴트.

[![Status](https://img.shields.io/badge/status-PoC-yellow)]()
[![Competition](https://img.shields.io/badge/2026_KTO-관광데이터_활용_공모전-blue)]()

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
  ┌──────────────────────┐
  │   MenuLens Backend   │
  │                      │
  │  ① Menu Reader    ──┐│
  │   (Gemini Vision)   ││
  │                     ├┼─→ 🟢🟡🔴 + TTS
  │  ② Dish Profiler   ─┤│
  │   (Claude + RAG)    ││
  │                     ││
  │  ③ Price Sentinel──┘│
  │   (Rule + Claude)   │
  └──────────────────────┘
```

## 📊 활용 공공데이터

| 데이터셋 | 역할 |
|---|---|
| **TourAPI** (필수) | 식당 기본정보, 다국어 7개, LOD SPARQL |
| **한식진흥원 길라잡이 800선** | 영·일·중 표준 메뉴 번역 |
| **한국소비자원 참가격** | 서울 8개 외식 품목 평균가 |
| **식약처 식품영양성분DB** | 알레르기 재료 검증 |
| **카카오 로컬 API** | 식당 위치·지역 보정 |

## 🛠️ 기술 스택

- **Frontend**: Next.js + PWA
- **Backend**: FastAPI (Python 3.11) on Cloud Run
- **AI**: Claude Sonnet 4.6 · Gemini 2.5 Flash · OpenAI embeddings
- **DB**: Supabase Postgres + pgvector
- **TTS**: Google Cloud TTS
- **Deploy**: Vercel (web) + Cloud Run (API)

## 🚀 시작하기

### 요구사항
- Python 3.11+
- Node.js 20+
- Supabase 계정
- API 키: Claude, Gemini, OpenAI, Google Cloud

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

## 📅 로드맵

- **v0.1 (PoC)**: 사진 모드 + 색깔 오버레이 + 탭-주문 (D1~D7)
- **v0.2**: 다국어 지원 확장, UX 개선 (D8~D16)
- **v1.0 (Post-competition)**: 라이브 AR 모드, B2B 식당 대시보드
- **v2.0**: 전국 확장, 사용자 크라우드 가격 제보

## 📚 Documentation

| Document | Purpose |
|---|---|
| [CONTEXT.md](./CONTEXT.md) | Project overview (single-page onboarding) |
| [ROADMAP.md](./ROADMAP.md) | D1~D16 daily checklist |
| [DECISIONS.md](./DECISIONS.md) | Architecture decision records (ADR-001~006) |
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
- 접수: 2026-05-06 (화) 16:00 마감
- 개발 기간: 2026-04-21 ~ 2026-09 (MVP)

## 📜 License

MIT License — Open for public benefit, as befits a project built on public data.

## 🤝 Contributing

Public data를 활용한 외국인 방한객 신뢰성 회복 프로젝트. 이슈·제안·기여 환영.

---

**Made with Claude** · 2026
