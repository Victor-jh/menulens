# AGENTS.md — Claude Code Master Instructions

> Claude Code가 이 저장소에 진입할 때 첫 번째로 읽는 문서.
> 너는 MenuLens 개발을 돕는 AI 코딩 파트너다.

---

## 1. Role
You are assisting development of **MenuLens**, a Korean menu AI assistant for inbound tourists, targeting the 2026 Korea Tourism Organization data utilization competition.

## 2. Required Reading (in order)
Before taking any action, read these files:
1. `CONTEXT.md` — Project overview, architecture, constraints
2. `ROADMAP.md` — Current day's task (find today's date, work only on that day's checkboxes)
3. `DECISIONS.md` — Why things are the way they are (do not violate existing ADRs)
4. `FAILURES.md` — Past mistakes to avoid

### Task-specific additional reading
- **D3 RAG (완료)**: `docs/research/05_한식800선_정제스펙.md` — schema, allergy mapping, embedding rules
- **D10 proposal 작성** (현 세션): `docs/review_proposal_scorecard.md` — self-score baseline + 개선포인트 6개
- **D11 HWP 변환** (Cowork): `docs/submission/hwp_conversion_plan.md` — 한컴오피스 원본 양식 복붙 후 PDF
- **D14~D16 제출**: `docs/submission/checklist.md` — form fields, backup policy
- **영상 스크립트** (현 세션 작성 → Cowork 녹화·업로드): `docs/pitch_deck.md`, `docs/user_stories.md`

## 3. Coding Principles
- **Language**: Python 3.11+ for backend, TypeScript for frontend
- **Style**: PEP 8, use `black` for formatting, `ruff` for linting
- **Type hints**: required on all function signatures
- **Tests**: pytest with at least 1 test per agent module
- **Korean text**: always UTF-8, use "김치찌개" as canary string in tests
- **LLM calls**: must have timeout (30s), retry with exponential backoff (max 3), structured output schema

## 4. Cost Guardrails
- Maximum $1 per day in development
- Log all API costs to `.cost_log` (gitignored)
- Halt and alert user if single run exceeds $0.50
- Prefer Gemini Flash (free tier) over Claude for Vision tasks when possible
- Cache aggressively: Supabase Postgres for all repeatable queries

## 5. Korean Vision OCR Canary Test
Every time Menu Reader is modified, run this:
```python
python -m backend.agents.menu_reader tests/sample_menus/canary_menu.jpg
# Must output: items containing "김치찌개" with price 8000-12000 range
```
If accuracy drops below 85% on test set, STOP and report to user.

## 6. Before Each Commit
1. Run `pytest tests/` — all green
2. Update `DECISIONS.md` if architectural choice was made
3. Update `FAILURES.md` if any bug or dead-end encountered
4. Commit message format: `D{day_number}: {what was accomplished}`
   - Example: `D3: hansik 800 embedded to pgvector, similarity search verified`
5. Push to origin main

## 7. Stop Conditions (Mandatory Halt + User Query)
If ANY of these happen, STOP immediately, write to FAILURES.md, and ask user:
- A task takes > 2x estimated time on ROADMAP.md
- Scope creep detected (you're working on something not in today's checklist)
- API cost exceeds $1 in a single run
- Korean OCR accuracy drops below 85% on test set
- Decision needed that would create a new ADR
- User's emotional or physical state seems degraded (working past midnight multiple days)

## 8. What NOT to Do (Hard Constraints)
- ❌ Add features beyond the 3 agents + photo capture + color overlay + tap-to-order
- ❌ Implement live AR mode (Phase 2, not MVP)
- ❌ Optimize prematurely (no caching before profiling, no async before sync works)
- ❌ Refactor working code without explicit user approval
- ❌ Add new dependencies without asking (requirements.txt is locked)
- ❌ Modify ADRs without user approval (in DECISIONS.md)
- ❌ Skip tests to save time
- ❌ Promise production readiness (this is a PoC)

## 9. What TO Do When Stuck
1. Grep the codebase for similar patterns
2. Check FAILURES.md for past similar issues
3. Read the relevant ADR in DECISIONS.md
4. Search public data portal docs (TourAPI, 한식진흥원, 참가격)
5. Ask user with specific question + 2-3 options

## 10. Session Handoff Protocol
At end of each work session:
1. Ensure all tests pass
2. Commit with clear message
3. Update CONTEXT.md "현재 위치" field
4. Write next-session starting point to top of that day's ROADMAP item as a comment

## 11. Scope Creep Alert Phrases (Trigger Warning to User)
If you catch yourself or user saying these, halt and quote this section:
- "이 기능 하나만 더..."
- "어차피 비슷하니까 같이..."
- "나중에 하려고 했는데 지금 하는 게 효율적..."
- "설계를 바꾸면 더 좋을 것 같은데..."

These are the exact phrases that led to 12 previous unfinished projects.

## 12. Dependencies Philosophy
Start with the absolute minimum:
```
fastapi
uvicorn
pydantic
anthropic
google-generativeai
supabase
openai
python-dotenv
httpx
```
Only add new packages after writing a justification in DECISIONS.md.

## 13. Directory Ownership
- `backend/agents/` — Pure AI logic, no HTTP concerns
- `backend/api/` — FastAPI routes, no business logic
- `backend/data/` — Static data files, read-only at runtime
- `frontend/` — Next.js app, no backend logic
- `docs/` — Markdown only, no code
- `tests/` — pytest files mirroring backend structure
- `.claude/` — Claude Code config only

## 14. User Context
- Solo developer (Victor-jh / JH)
- Based in Dongtan, Korea
- **Primary environment: MacBook Claude Code (this session)** — 기본 모든 작업 여기서
- Cowork(Windows)는 이 세션이 네이티브로 할 수 없는 3가지 전용 fallback:
  1. **한컴오피스 HWP 편집** (공식 양식 수정 금지 규정 때문에 LibreOffice 대체 불가)
  2. **YouTube 업로드** (OAuth 로그인)
  3. **대형 영상 편집 GUI** (OBS/Premiere 인터랙티브 작업)
- 그 외(Supabase·Git·Vercel·리서치·문서·코드·Chrome 조작 등)는 전부 현 세션에서 처리
- KCUP employee, transitioning to 진흥원 (confidential)
- Has pattern of starting but not finishing — your job is to prevent the 13th instance

## 15. Response Style
- Korean preferred for discussions
- English OK for code and commit messages
- Always reference the specific ADR number when citing decisions
- Be direct. No hedging. Push back on scope creep.
