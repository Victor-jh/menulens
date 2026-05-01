# MenuLens 제출 체크리스트 — 2026-05-06 (수) 16:00 KST 마감

> 본 체크리스트는 D13~D16에 사용자(JH, 단독 운영)가 따라 실행한다.
> 각 단계 [ ]를 [x]로 직접 체크하며 진행. 시간은 24h KST.
>
> **공식 원본**: `docs/submission/official/2026_공고문.pdf` · `docs/submission/official/제안서_양식_원본.hwp`
> **접수처**: 한국관광콘텐츠랩 (URL은 D14 로그인 시 정확 경로 확정 — 공고문 p.7 기준 `api.visitkorea.or.kr` 추정, **[D14에 확정]**)
> **사무국 문의**: gongmo@stunning.kr
> **상위 심사 배점·접수 양식**: `docs/submission/hwp_conversion_plan.md` 및 본 디렉토리 이전 버전 git history 참조

---

## D13 (2026-05-03 토) — 외부 리뷰 + 콘텐츠 동결

### 오전 (09:00~12:00)
- [ ] 09:00 한컴오피스 설치 PC에서 `docs/submission/build/MenuLens_제안서_v1.hwp` 생성 (양식 원본 복사)
- [ ] 10:00 proposal.md §1.1 → HWP 표 3 "기획 배경" 셀 붙여넣기 (Ctrl+Shift+V, 서식 제거)
- [ ] 11:00 proposal.md §1.2 → HWP 표 3 "필요성" 셀 붙여넣기
- [ ] 11:30 proposal.md §2.1~2.3 → HWP 표 4 "서비스 개요" 셀 붙여넣기
- [ ] 12:00 1차 페이지 카운트 확인 (12pt 한컴 기본 폰트, 5p 이내)

### 오후 (13:00~18:00)
- [ ] 13:00 proposal.md §3.1~3.2 → HWP 표 5 "데이터 활용" 셀 붙여넣기
- [ ] 14:00 proposal.md §4.1~4.3 → HWP 표 6 "발전 방향" 셀 붙여넣기
- [ ] 14:30 §3.3.4 Hermes 섹션 본문 수용 안 되면 **appendix GitHub URL 1줄 링크**로 대체
- [ ] 15:00 5p fit 강제 — 초과 시 §1.1·§4.3 2~3문장 축약
- [ ] 15:30 표 경계선·여백 양식 원본 그대로 유지 확인
- [ ] 16:00 시연 영상 1차 촬영 (90초 ±3초, iPhone 1080p 가로)
- [ ] 17:00 영상 자막 1차 (영문 SRT) 작성 — pitch_deck.md 스크립트 참조
- [ ] 17:30 BGM 저작권 무료 트랙 1개 선정 (YouTube Audio Library 또는 Pixabay Music)
- [ ] 18:00 BGM 출처 메모 (영상 설명란용 텍스트로 별도 저장)

### 저녁 (19:00~22:00)
- [ ] 19:00 파트너/지인 1명에게 시연 영상 + HWP 미리보기 보여주기
- [ ] 19:30 피드백 노트 작성 — "어디서 멈추는지, 무슨 말이 안 통하는지" 정확 기록
- [ ] 20:00 치명적 피드백 1~2개만 D13 내 반영, 나머지는 백로그
- [ ] 21:00 proposal.md → HWP 변환 v1 → v2 저장 (`build/MenuLens_제안서_v2.hwp`)
- [ ] 21:30 git commit "D13: 제안서 HWP v2 + 외부 리뷰 1차 반영"
- [ ] 22:00 D14 작업 분량 확인, 취침

---

## D14 (2026-05-04 일) — HWP 최종 + GitHub Public + 영상 업로드

### 오전 (09:00~12:00)
- [ ] 09:00 HWP v2 → 한컴오피스 열기, 영상 자막 2차 (국문) 추가 작업 병행
- [ ] 09:30 페이지 끊김 위치 자연스럽게 재조정 (섹션 중간 절단 금지)
- [ ] 10:00 이미지 4장 삽입 — 메인 스크린샷, Hermes Phase 2 화면, TrustFooter, persona canary 결과
- [ ] 10:30 이미지 해상도 150dpi 이상 확인 (한컴 이미지 속성)
- [ ] 11:00 시연 영상 마지막 페이지 QR 삽입 (URL은 D14 17:00 업로드 후 확정)
- [ ] 11:30 GitHub URL `github.com/Victor-jh/menulens` 본문 1곳 명시
- [ ] 12:00 HWP 최종 저장 → `build/MenuLens_제안서_최종.hwp`

### 오후 (13:00~18:00)
- [ ] 13:00 한컴 → 파일 → PDF로 저장 (고품질, 글꼴 포함 옵션 체크)
- [ ] 13:30 PDF 출력 → `final/MenuLens_제안서_최종.pdf`
- [ ] 13:45 파일 크기 확인 (10MB 미만), 초과 시 ghostscript `/printer` 압축 (hwp_conversion_plan.md §3.2)
- [ ] 14:00 페이지 카운트 5p 이내 최종 확인
- [ ] 14:15 맥북 Preview에서 폰트 깨짐 없음 확인
- [ ] 14:30 iPhone 메일에 PDF 첨부 → 본인에게 전송 → iOS Mail에서 폰트·이미지 정상 렌더 확인
- [ ] 15:00 GitHub repo `github.com/Victor-jh/menulens` Settings → Visibility → **Public** 전환
- [ ] 15:15 README 정비 — 제안서 1줄 요약 + 시연 영상 URL placeholder + 라이선스 (MIT)
- [ ] 15:30 `.env` 파일 git history에 절대 없음 재확인 (`git log --all --full-history -- .env`)
- [ ] 16:00 비로그인 브라우저 시크릿 모드로 GitHub repo 접속 → 정상 노출 확인
- [ ] 16:30 시연 영상 최종 인코딩 (1080p mp4, H.264, BGM 확정)
- [ ] 17:00 YouTube 업로드 → **Unlisted** 설정 → 영상 설명란 BGM 출처 + GitHub URL 명시
- [ ] 17:15 YouTube URL 복사 → HWP 마지막 페이지 QR + URL 텍스트 모두 갱신
- [ ] 17:30 HWP 재PDF 출력 → `final/MenuLens_제안서_최종.pdf` 덮어쓰기
- [ ] 17:45 PDF 마지막 페이지 QR 스캔 테스트 (iPhone 카메라로 직접 스캔 → YouTube 정상 이동)
- [ ] 18:00 git commit "D14: 제안서 PDF 최종 + GitHub Public + 영상 업로드"

### 저녁 (19:00~22:00)
- [ ] 19:00 한국관광콘텐츠랩 (`api.visitkorea.or.kr` 또는 공고문 p.7 명시 URL **[D14 18:00 확정]**) 접속
- [ ] 19:15 회원가입 상태 확인 (D3 시점 미완료 시 즉시 가입)
- [ ] 19:30 접수 페이지 진입 → 양식 필드 전부 캡처 (`docs/submission/official/입력양식_캡처.png`)
- [ ] 20:00 필수 필드 답변 텍스트 미리 작성 (팀명, 한 줄 소개, 활용 OpenAPI 목록, 시연 URL)
- [ ] 20:30 "임시 저장" 기능 존재 여부 확인 + 테스트
- [ ] 21:00 동의 항목 4종 사전 검토 (개인정보·저작권·규정 준수·3자 침해 없음)
- [ ] 22:00 D15 작업 분량 확인, 취침

---

## D15 (2026-05-05 월) — 리허설 + 백업 + Plan B 준비

### 오전 (09:00~12:00)
- [ ] 09:00 한국관광콘텐츠랩 로그인 정상 확인
- [ ] 09:30 접수 페이지 전 필드 입력 → 임시 저장 → 로그아웃
- [ ] 10:00 다시 로그인 → 임시 저장된 필드 복원 확인
- [ ] 10:30 PDF 업로드 시도 (임시 저장 상태에서) → 파일 크기·형식 사전 검증
- [ ] 11:00 업로드 실패 시 파일명 영문화 (`MenuLens_proposal_final.pdf`) → 재시도
- [ ] 11:30 모든 필드·파일 정상 → "제출" 버튼만 누르면 되는 상태로 두고 로그아웃
- [ ] 12:00 백업 1회차: `final/` 폴더를 USB에 복사

### 오후 (13:00~18:00)
- [ ] 13:00 백업 2회차: Google Drive `공모전/MenuLens/final_2026-05-05/` 폴더 업로드
- [ ] 13:30 백업 3회차: 본인 Gmail에 PDF 첨부해 자기 자신에게 전송
- [ ] 14:00 시연 영상 mp4 원본도 위 3곳에 동일 백업
- [ ] 14:30 출처 자료 (proposal 각주 7개 URL 스크린샷) PDF 1개로 묶어 백업
- [ ] 15:00 E2E smoke 1회: `MENULENS_API=https://menulens-backend.onrender.com pytest tests/test_smoke_e2e.py -v` → 8/8 PASS
- [ ] 15:30 iPhone Safari `https://menulens-app.vercel.app` 접속 (cold start 30s 대기) → 정상 렌더
- [ ] 16:00 4 페르소나 sample 1회씩 수동 시연 (Yui Pescatarian, Aisha Halal, Chen nuts, Mike skeptical)
- [ ] 16:30 Hermes 라우터 자동 분기 확인 — 메뉴판 사진 + 음식 사진 각 1회
- [ ] 17:00 시연 영상 YouTube Unlisted 링크 정상 작동 + 자막 표시 확인
- [ ] 17:30 GitHub repo Public 상태 + README 시연 URL 작동 확인
- [ ] 18:00 D16 제출 시각·순서 최종 리허설 (시간표 출력 1장)

### 저녁 (19:00~22:00)
- [ ] 19:00 Plan B 시나리오 3개 정독 (본 문서 §비상시)
- [ ] 19:30 한컴오피스 설치 PC 1대 추가 가용처 확인 (지인·고시원·일자리 사이트·PC방)
- [ ] 20:00 D16 제출 동선 — 09:00 시작, 11:00 완료 목표, 16:00은 절대 회피
- [ ] 21:00 git commit "D15: 백업 3중화 + smoke 통과 + 리허설 완료"
- [ ] 22:00 일찍 취침 (D16 09:00 시작)

---

## D16 (2026-05-06 수) — 제출 day

### 제출 전 (06:30~09:00)
- [ ] 06:30 기상, 컨디션 점검
- [ ] 07:00 한국관광콘텐츠랩 서버 상태 사전 확인 (로그인만)
- [ ] 07:30 USB · Google Drive · Gmail 3중 백업 파일 모두 접근 가능 재확인
- [ ] 08:00 아침 식사 (제출 도중 끊기 방지)
- [ ] 08:30 노트북 1대 + 백업 노트북/iPad 1대 준비 (네트워크 이중화)
- [ ] 08:45 휴대폰 핫스팟 가능 상태 확인 (집 와이파이 다운 시 폴백)

### 제출 직전 5분 smoke (09:00~09:05)
- [ ] 09:00 `MENULENS_API=https://menulens-backend.onrender.com pytest tests/test_smoke_e2e.py -v` → 8/8 PASS
- [ ] 09:02 iPhone Safari `https://menulens-app.vercel.app` 사이트 정상 렌더 (cold start 30s 대기)
- [ ] 09:03 시연 영상 YouTube Unlisted 링크 작동 확인
- [ ] 09:04 GitHub repo Public 여부 시크릿 모드로 재확인
- [ ] 09:05 PDF 파일 5p · 10MB · 12pt 모두 OK 재확인

### 정식 제출 (09:30~11:00)
- [ ] 09:30 한국관광콘텐츠랩 로그인
- [ ] 09:35 접수 페이지 진입 → 임시 저장된 필드 복원
- [ ] 09:40 PDF 업로드 → 미리보기 1회 더 확인
- [ ] 09:45 시연 URL · 영상 URL · GitHub URL 3개 필드 재확인
- [ ] 09:50 동의 체크박스 4개 모두 체크
- [ ] 09:55 제출 버튼 누르기 직전 화면 스크린샷 1장 (증거)
- [ ] 10:00 **"제출" 버튼 클릭**
- [ ] 10:01 제출 완료 화면 스크린샷 (접수번호 보이게)
- [ ] 10:05 자동 발송 확인 이메일 수신 → PDF로 저장
- [ ] 10:30 `docs/submission/receipt/` 폴더에 스크린샷 + 이메일 PDF 저장
- [ ] 11:00 git commit "D16: 제출 완료 — 접수번호 [번호]"

### 제출 후 (12:00~18:00)
- [ ] 12:00 한국관광콘텐츠랩 마이페이지에서 접수 상태 "접수완료" 확인
- [ ] 14:00 한 번 더 접수 상태 재확인 (시스템 처리 지연 대비)
- [ ] 16:00 마감 시점 통과 확인 — **이미 6시간 전 제출 완료 상태**
- [ ] 17:00 SESSION_HANDOFF.md에 제출 완료 + 접수번호 기록
- [ ] 18:00 자축

---

## 비상시 (Plan B)

| 상황 | 1차 대응 | 2차 대응 (1차 실패 시) |
|---|---|---|
| 한국관광콘텐츠랩 접속 불가 | 5분 대기 후 재시도 (브라우저 변경) | 1시간 대기 → 사무국 gongmo@stunning.kr 전화·메일 (서버 장애 공식 확인) |
| PDF 업로드 실패 | 파일명 영문화 + 5MB 이하 재압축 (ghostscript `/ebook`) | 다른 브라우저 (Chrome→Edge→Safari) → 핫스팟 회선 변경 |
| HWP 양식 깨짐 (D13~D14) | 양식 원본 다시 복사 → v0부터 재시작 | 한글 PC 추가 1대 확보 (지인·고시원·PC방) |
| Render 백엔드 다운 (시연 시점) | Render 대시보드 → Manual Deploy 트리거 (~2분) | stale-cache로 자동 폴백, "🛰️ 일시 응답 지연" 메시지 정상 — 심사위원 확인 가능 |
| Vercel 프론트 다운 | Vercel 대시보드 → Redeploy (~1분) | menulens.app DNS 우회 → vercel preview URL 직접 안내 |
| LOD outage | stale-cache 자동 처리 (D11 `089bf3f`), 별도 조치 불필요 | — |
| 영상 업로드 실패 (D14) | YouTube 다른 계정 시도 | drive.google.com Unlisted 백업 링크 (영상 mp4 직접 공유) |
| 가족 비상·본인 사고 | 백업 노트북 + 휴대폰만으로 모바일 제출 가능 (D15 리허설 시 모바일 제출 동선 1회 점검) | 사무국에 사정 설명 + 메일 접수 가능 여부 문의 (공식 인정 여부 불확실) |
| GitHub Public 전환 누락 발견 | 즉시 Settings → Visibility → Public | 5분 후 시크릿 모드로 재확인 |
| 마감 1시간 전 (15:00) 제출 미완료 | 즉시 USB의 PDF로 직접 업로드 (임시 저장 무시) | 사무국 전화 — 시스템 장애 시 메일 접수 가능 여부 확인 |

---

## 참고 — 본 체크리스트가 가정하는 사전 완료 사항

- ✅ proposal.md D11 퇴고본 (§3.3 → §3.3.4 Hermes 섹션 + appendix 분리, `7b66186`)
- ✅ proposal_appendix.md 작성 + GitHub에서 직접 열람 가능
- ✅ pitch_deck.md 90초 영상 스크립트 (`1d12b04`)
- ✅ 시연 페르소나 4개 prod 검증 (Yui, Aisha, Chen, Mike)
- ✅ 8 E2E smoke + GH Actions cron keep-alive
- ✅ Vercel/Render LIVE + WCAG AA 색 대비
- ✅ v2 단일 production path (v1 1488 lines 삭제)
- ✅ 한국관광콘텐츠랩 회원가입 (D14에 한 번 더 검증)

미완료 항목 발견 시 본 체크리스트 D13 작업 시작 전에 우선 처리.
