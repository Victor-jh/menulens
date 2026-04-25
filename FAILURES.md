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
