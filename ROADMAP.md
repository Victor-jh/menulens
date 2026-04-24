# MenuLens ROADMAP

> 16일 간 일일 체크리스트. Hard Gate: D7(4/27).
> 매일 저녁 체크박스 업데이트 후 git commit.

---

## Week 1: PoC 스프린트 (Hard Gate 포함)

### D1 — 2026-04-21 (월) · 셋업
- [x] GitHub 저장소 생성 (`Victor-jh/menulens`) — private, 2026-04-22 푸시 완료
- [x] 이 프로젝트 구조를 맥북에 푸시 — 첫 커밋 `729914d D1: initial project scaffold`
- [ ] 공공데이터포털 계정 확인, TourAPI 활용신청 (15101578)
- [ ] 한식진흥원 길라잡이 800선 파일 다운로드 (15129784)
- [ ] 한국관광콘텐츠랩 (api.visitkorea.or.kr) 회원가입
- [ ] Claude Project "MenuLens" 생성 + Knowledge 업로드
- [ ] 실제 메뉴판 사진 수집 계획 수립 (안동 카페 주변/동탄 한식당 5장)
- **완료 기준**: 이 저장소가 GitHub에 존재하고, 800선 CSV가 `backend/data/`에 있다
- **실 소요 예상**: 1시간
- **D3 추가 비고(Cowork)**: 800선 적재용 스펙 `docs/research/05_한식800선_정제스펙.md` 선제 작성 완료 → 맥북 작업 시 참조

### D2 — 2026-04-22 (화) · Gemini Vision PoC
- [ ] Gemini API 키 발급 (AI Studio)
- [ ] Anthropic API 크레딧 상태 확인 (Partner Network)
- [ ] Supabase 프로젝트 생성 (무료 티어)
- [ ] Python 가상환경 `.venv` 셋업, `requirements.txt` 작성
- [ ] `backend/agents/menu_reader.py` 최소 구현
- [ ] 실제 메뉴판 1장 → Gemini Flash → JSON 추출 성공
- **완료 기준**: `python -m backend.agents.menu_reader tests/sample_menus/menu1.jpg` 실행 시 메뉴명·가격 리스트 출력
- **실 소요 예상**: 2~3시간

### D3 — 2026-04-23~25 (수~금) · 한식진흥원 RAG ✅ 완료
- [x] 한식진흥원 800선 CSV → 정제 → Supabase Postgres 적재 (800건)
- [x] Gemini gemini-embedding-001 (768d)로 각 메뉴명 임베딩 — ADR-008
- [x] pgvector 확장 활성화, HNSW·trgm 인덱스 + match_hansik RPC
- [x] `backend/agents/dish_profiler.py` 뼈대 — spec §4.3 임계값 0.65/0.50
- [x] Cowork 정제 스펙 작성 — `docs/research/05_한식800선_정제스펙.md` (v2)
- [x] 백엔드 스캐폴드 — `backend/db/001_hansik_800.sql`, `backend/scripts/load_hansik_800.py`
- [x] Dry-run 검증 + 실 800행 적재 검증
- [x] **"김치찌개" → Kimchi Stew 실 캐너리 확인** (sim=0.762, tags={pork,seafood,soy})
- [x] 시연 메뉴판 06 전체 매칭: 김치찌개·된장찌개·물냉면·삼계탕 4종 모두 sim≥0.76으로 official_db 반환
- **완료 기준**: 쿼리 메뉴명 입력 시 표준 번역 + romanization + 재료·알레르기·할랄·매운맛 반환 ✅
- **실 소요**: 2026-04-23 스캐폴드 + dry-run, 2026-04-25 라이브 적재·캐너리

### D4 — 2026-04-25 (토, 당겨서 D3 연속 진행) · 가격 Sentinel ✅ 완료
- [x] 한국소비자원 참가격 8품목 (서울 2025-12 스냅샷) — `backend/data/consumer_price.json`
- [x] `backend/data/consumer_price.json` 생성 (items + aliases + thresholds + source 메타)
- [x] `backend/agents/price_sentinel.py` 구현 (JSON 기반, ADR-007 임계값)
- [x] 매칭 cascade: exact → alias → rapidfuzz(token_set_ratio ≥80) → hansik_800 embedding fallback
- [x] 🟢 <110%, 🟡 110~130%, 🔴 >130% 판정 로직 (ADR-002 / ADR-007)
- **완료 기준**: "김치찌개 12000원" → 🔴 PASS (140% 참가격 8,577원 대비)
- **변형 캐너리**: 김치찌개백반/물냉면/돌솥비빔밥/짜장면 모두 올바른 8품목으로 매칭
- **실 소요**: D3와 당일 병합 진행 — 1시간

### D5 — 2026-04-25 (금) · 알레르기·할랄·비건 분류
- [ ] 재료 사전 구축 (돼지·소·닭·해물·계란·유제품·글루텐·견과 등 14종)
- [ ] Dish Profiler에 분류 프롬프트 추가 (Claude structured output)
- [ ] 사용자 프로필 설정 로직 (JSON 기반, 온보딩 1회)
- [ ] 색깔 결정 트리: 프로필 × 알레르기 × 가격 → 🟢🟡🔴
- **완료 기준**: 무슬림 프로필 + 돼지고기 메뉴 → 🔴 자동 판정
- **실 소요 예상**: 2시간

### D6 — 2026-04-26 (토) · 통합 백엔드 + TTS
- [ ] FastAPI `main.py` 작성, 3개 에이전트 오케스트레이션
- [ ] `POST /analyze` 엔드포인트 (이미지 업로드 + 프로필)
- [ ] Google Cloud TTS 연동, 한국어 주문 음성 생성
- [ ] 응답 캐싱 (같은 메뉴 재요청 시 TTS 재생성 방지)
- [ ] Postman으로 end-to-end 테스트
- **완료 기준**: 이미지 업로드 → 5초 이내 JSON 응답 (메뉴 리스트 + 색깔 + TTS URL)
- **실 소요 예상**: 3~4시간

### D7 — 2026-04-27 (일) · 🚨 HARD GATE + 프론트엔드 1차
- [ ] Next.js 프로젝트 셋업 (`frontend/`)
- [ ] 최소 UI: 사진 업로드 → 결과 화면 (색깔 박스 오버레이)
- [ ] 탭 한 번 → TTS 오디오 재생
- [ ] 온보딩 화면 (알레르기·언어 설정)
- [ ] Vercel에 임시 배포, 모바일 브라우저 테스트
- **🚨 Hard Gate 판정**: "실제 메뉴판 사진 → 색깔 3종 표시 + TTS 재생"이 작동하는가?
  - ✅ 작동 → Week 2 계속
  - ❌ 미작동 → **이 자리에서 포기 결정**. 제안서만 제출하거나 불참.
- **실 소요 예상**: 4~5시간

---

## Week 2: 제안서·시연 영상·퇴고

### D8 — 2026-04-28 (월) · UX 개선
- [ ] 색깔 오버레이 UX 다듬기 (색맹 고려, 아이콘 보조)
- [ ] 로딩 애니메이션
- [ ] 오류 처리 (메뉴판 인식 실패 시 "다시 찍어주세요")
- [ ] 5개 이상 메뉴판 사진으로 실측, 정확도 기록

### D9 — 2026-04-29 (화) · 시연 영상 1차 촬영
- [ ] 시연 시나리오 스크립트 (`docs/pitch_deck.md`)
- [ ] 실제 식당 방문 or 메뉴판 인쇄본으로 촬영
- [ ] 1분 30초 영상 초안 (OBS 또는 iPhone 화면 녹화)

### D10 — 2026-04-30 (수) · 제안서 1차 작성
- [ ] 제안서 5페이지 초안 (`docs/proposal.md`)
  - 1) 서비스 기획배경 및 필요성
  - 2) 서비스 개요 (주요 기능 + 차별성)
  - 3) 데이터 활용 방안 (TourAPI + 5개 교차)
  - 4) 서비스 발전 방향 (Phase 2 Dashboard 포함)

### D11 — 2026-05-01 (목) · 제안서 퇴고
- [ ] 심사 배점(100점) 체크리스트로 자체 채점 — 초안 채점 완료 (`docs/review_proposal_scorecard.md`, D3 기준 77/100)
- [ ] 보완 포인트 6개 반영 (출처 각주·작동 증거·안정성·데이터 갱신주기·Phase 2 KPI·페르소나)
- [ ] 문장 리듬, 페이지 레이아웃, 이미지 배치
- [ ] Cowork에서 HWP/PDF 변환 (플랜 `docs/submission/hwp_conversion_plan.md`)

### D12 — 2026-05-02 (금) · 시연 영상 최종
- [ ] 자막(영어/한국어 병기)
- [ ] BGM 저작권 확인
- [ ] YouTube Unlisted 업로드, 링크 확보

### D13 — 2026-05-03 (토) · 외부 리뷰
- [ ] 파트너(여자친구) 또는 지인 1명에게 제안서·영상 리뷰 요청
- [ ] 피드백 반영
- [ ] GitHub README 정비 (공모전 접속자 대상)

### D14 — 2026-05-04 (일) · 최종 검토
- [ ] 제안서 PDF 10MB 이하 압축 (절차 `docs/submission/hwp_conversion_plan.md` §1 Step 3)
- [ ] 접수 페이지 로그인 → 실제 양식 필드 검증 → `docs/submission/checklist.md` §2 갱신
- [ ] 접수 양식 모든 필드 작성 준비
- [ ] 팀원 정보 기입 (1인 참가, 본인만)
- [ ] GitHub 저장소 Private → Public 전환 + README 정비

### D15 — 2026-05-05 (월) · 제출 리허설
- [ ] 한국관광콘텐츠랩 로그인 확인
- [ ] 접수 양식 테스트 입력 (임시 저장 가능한지)
- [ ] 백업 파일 준비 (USB + 클라우드)

### D16 — 2026-05-06 (수) 16:00 · 제출
- [ ] 오전 10시 이전 제출 (서버 과부하 회피)
- [ ] 제출 완료 스크린샷 보관
- [ ] 예심 결과 대기 (5월 말 예상)
- [ ] **축하**하고 잠깐 쉰다

---

## 예비심사 통과 후 (5월 말) — 공식 일정 반영

**공식 공고문 기준 심사 3단계 구조**:
1. **예비심사(서류심사, 5월)**: 적격/부적격 판정. 제출서류 구비여부·작성 가이드 준수·누락 점검
2. **서비스 개발 기간(5~9월)**: 예비심사 통과팀 대상 **교육·컨설팅 지원**
3. **1차 심사(서면+기능, 10월)**: 공사 OpenAPI 필수 활용한 **완성 서비스** 기능심사 + 서면 100점 채점 → 상위 **5팀** 진출
4. **최종심사(PT 발표, 10월)**: 상위 5팀 ①·②-2 부문 통합 심사 100점 → 훈격 확정
5. **시상식(11월)**

**여기서 다시 앉아서 결정한다.** 자동으로 6~9월 개발 시작 X.
- 진흥원 전환 일정 확인
- 본업 업무 강도 재평가
- 파트너와 주말 시간 배분 재협의
- 결정 3택:
  1. **Full Go**: 6~9월 MVP 개발 + 10월 1차심사(기능) + 최종심사(PT)
  2. **Light**: 예비심사 통과 상태 유지, 웹 데모만 운영, 1차심사 전 자진 철회
  3. **Stop**: 포트폴리오로만 보존

---

## 진행 규칙
- 매일 저녁 이 파일의 체크박스 업데이트
- 각 체크박스 미완료 시 FAILURES.md에 사유 기록
- 연속 2일 지연 시 Claude에게 경보 요청 ("확산적 사고 감지 프롬프트")
- Git commit 하루 최소 3회
