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

## 2026-04-23 · D3 파이프라인 실행 블로커 (진짜 800선 미수급)
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
**교훈**: D1·D2 선행 조건(계정·키·CSV) 전제 체크 없이 D3 실행 코드부터 짜면 dry-run에서 멈춤. 공공데이터포털 활용신청은 승인까지 시간차가 있으므로 D0에 제출해야 한다. 다음 맥북 세션 첫 작업: **키 3개 + CSV + Supabase 프로젝트 생성 먼저**.

### D3 재개 조건 체크리스트 (맥북이 다음에 볼 것)
- [ ] 공공데이터포털 15129784 활용신청 승인 → CSV 다운로드 → `backend/data/hansik_800.csv` 덮어쓰기
- [ ] 실 CSV `head -1` 결과 확인 → 컬럼명이 spec §1.2와 다르면 `backend/data/hansik_800_column_map.json` 작성
- [ ] Supabase 프로젝트 생성 → `backend/db/001_hansik_800.sql` SQL Editor 실행
- [ ] `.env` 에 `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` 기입
- [ ] `.venv/bin/pip install -r backend/requirements.txt`
- [ ] `python -m backend.scripts.load_hansik_800 --dry-run` → 정상
- [ ] `python -m backend.scripts.load_hansik_800` → 캐너리 PASS
- [ ] 실 컬럼명으로 `docs/research/05_한식800선_정제스펙.md §1.2` Cowork에게 갱신 요청

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
