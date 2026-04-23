# HWP 변환 플랜 — MenuLens 제안서

> **실행일**: D11 (2026-05-01, 목)
> **입력**: `docs/proposal.md` (Markdown, 최종 퇴고본)
> **출력**: `MenuLens_제안서_최종.pdf` (필수) + `MenuLens_제안서_최종.hwp` (선택)
> **담당**: Cowork
> **목표 소요**: 1.5~2시간

---

## 0. 왜 HWP인가

한국 정부 공모전에서 한글(HWP)은 여전히 **기본 포맷 중 하나**. 공식 가이드가 PDF만 명시해도, HWP를 함께 제출하면:
- 심사위원이 한글 환경에서 즉시 열람 가능 (과거 심사 관행)
- 편집 가능 파일 제공 → "협업 의지" 인상 효과
- 예심 통과 후 본심 PT 자료와 포맷 통일 가능

**단**: 공식 가이드에서 PDF만 요구하면 HWP는 생략 가능 (시간 우선).

---

## 1. 변환 파이프라인 (3단계)

```
[docs/proposal.md]
      │
      ▼  (Step 1: Pandoc)
[docs/submission/build/proposal.docx]
      │
      ▼  (Step 2: Word → HWP 변환)
[docs/submission/build/proposal.hwp]
      │
      ▼  (Step 3: 출력물 분기)
   ┌──┴──┐
   ▼     ▼
 [PDF]  [HWP 최종]
```

### Step 1: Markdown → DOCX (Pandoc)

**명령어**:
```bash
cd /Users/bjh/Projects/menulens
mkdir -p docs/submission/build
pandoc docs/proposal.md \
  -o docs/submission/build/proposal.docx \
  --reference-doc=docs/submission/reference.docx \
  --toc=false \
  --standalone
```

**`reference.docx` 생성 방법** (최초 1회만):
```bash
pandoc -o docs/submission/reference.docx --print-default-data-file=reference.docx
# 이후 Word로 열어서 스타일 조정:
# - 본문: 맑은 고딕 12pt, 줄간격 1.3
# - 제목 1: 18pt Bold
# - 제목 2: 14pt Bold
# - 표 스타일: "격자 표"
# - 여백: 상하 25mm, 좌우 30mm (심사 규정 일반값)
```

**주의사항**:
- Pandoc 2.19+ 필요 (Homebrew `brew install pandoc`)
- 테이블은 GFM(GitHub-Flavored Markdown)으로 작성되어 있어 Pandoc 자동 인식됨
- 이미지 경로는 상대경로 유지 (`docs/proposal.md` 기준)

### Step 2: DOCX → HWP 변환

**경로 A (권장): 한컴오피스 NEO/2020 직접 변환**
1. Word에서 `proposal.docx` 열기
2. 한컴오피스에서 파일 → 열기 → `.docx` 선택
3. 파일 → 다른 이름으로 저장 → `한글 문서(*.hwp)` 선택
4. 저장 후 서식 손상 점검 (아래 5. 체크리스트)

**경로 B: LibreOffice를 통한 간접 변환** (한컴오피스 없을 때)
```bash
# LibreOffice 설치 필요
brew install --cask libreoffice

# DOCX → HWP는 LibreOffice로 직접 불가
# 우회: DOCX → ODT → HWP (한컴오피스 NEO+ 필요)
```
→ **실제로는 한컴오피스 필수**. 경로 B는 권장하지 않음.

**경로 C: hwpx-studio 활용** (JH 기존 개발 도구)
- JH 과거 프로젝트 `hwpx-studio v1.1`이 DOCX→HWPX 변환 지원
- 실제 동작 상태 D11에 재검증 필요 (`FAILURES.md`에 "배포 미실행" 기록됨)
- 우선순위: 경로 A > 경로 C > 경로 B

**경로 D: 온라인 변환 서비스** (최후 수단)
- https://anyconv.com/docx-to-hwp-converter/ (품질 불안정, 주의)
- 개인정보/공모전 자료이므로 **권장 안 함** (유출 리스크)

### Step 3: PDF 생성 (필수)

**Word에서 Export**:
```
파일 → 다른 이름으로 저장 → PDF (*.pdf)
옵션: ISO 19005-1 (PDF/A) 체크 → 폰트 임베드 보장
```

**한컴오피스에서 Export**:
```
파일 → PDF로 저장 → 품질: 고품질
폰트 임베드 옵션 반드시 체크
```

**크기 압축 (10MB 초과 시)**:
```bash
# macOS Preview.app
# 파일 → 내보내기 → Quartz 필터 → "Reduce File Size"

# 또는 CLI (ghostscript)
brew install ghostscript
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 \
   -dPDFSETTINGS=/printer \
   -dNOPAUSE -dQUIET -dBATCH \
   -sOutputFile=proposal_compressed.pdf \
   proposal.pdf
```

---

## 2. 폰트·여백·이미지 기준

### 2.1 폰트
- [ ] 본문: **맑은 고딕 12pt** (또는 나눔고딕 12pt)
- [ ] 제목 1: 맑은 고딕 Bold 18pt
- [ ] 제목 2: 맑은 고딕 Bold 14pt
- [ ] 표 내부: 맑은 고딕 11pt 허용 (공식 가이드가 "본문 12pt"만 명시하는 경우)
- [ ] 영문은 한 번 더 검토: Arial 또는 Helvetica 12pt
- [ ] **모든 폰트 임베드 확인** (PDF 생성 후 속성에서 확인)

### 2.2 여백
- [ ] 상하 여백: 25mm (공식 가이드 확인 필요)
- [ ] 좌우 여백: 30mm
- [ ] 머리글/바닥글: 페이지 번호 삽입 (1/5 형식)

### 2.3 이미지
- [ ] 해상도 **최소 150dpi, 권장 300dpi**
- [ ] 포맷: PNG (다이어그램) / JPG (사진)
- [ ] 파일 크기: 개별 500KB 이내 (전체 10MB 제한 대응)
- [ ] 색상 프로파일: sRGB
- [ ] 다이어그램 텍스트는 **벡터 폰트 임베드** 또는 **충분히 큰 비트맵**

### 2.4 표
- [ ] 표 스타일 통일 (회색 헤더, 흰 본문)
- [ ] 표 제목(캡션) 형식: `<표 1> 제목`
- [ ] 숫자는 오른쪽 정렬, 텍스트는 왼쪽 정렬

---

## 3. 공식 가이드 재확인 체크리스트 (D14)

D14에 접수 페이지·공고 PDF 재확인 후 아래 항목 확정:

- [ ] 제출 포맷: PDF만 필수 vs PDF+HWP 병행 가능 vs HWP 권장
- [ ] 5페이지 제한: 표지 포함인가 본문만인가
- [ ] 글자 크기: 본문 12pt가 각주·표에도 적용되는가
- [ ] 이미지 포함 여부: "이미지·표 포함 가능"인가 "본문 기준"인가
- [ ] 파일명 규칙 (한글 허용 여부, 공백 허용 여부)
- [ ] 첨부파일 최대 크기 (10MB인지 20MB인지)

---

## 4. 변환 전 최종 퇴고 체크리스트 (D10~D11)

`docs/proposal.md` 최종본이 다음을 만족해야 변환 시작:

- [ ] `docs/review_proposal_scorecard.md` 상위 6개 보완 포인트 모두 반영
- [ ] 출처 각주 7개 삽입 완료
- [ ] Phase 2 KPI 3개 숫자 삽입
- [ ] 안정성 단락 삽입
- [ ] 각 공공데이터 갱신 주기 1줄씩
- [ ] 시연 영상 YouTube URL + QR 페이지 마지막에 삽입
- [ ] GitHub URL 명시
- [ ] 페르소나 2명 인용 1줄씩
- [ ] 자체 채점 85점 이상 예상
- [ ] 맥북 Claude Code에서 최종 커밋 완료 (`git log -1` 확인)

---

## 5. 변환 후 품질 검증 체크리스트

변환 파일 열람 후 아래 항목 전체 확인:

### 5.1 PDF
- [ ] 5페이지 이내
- [ ] 파일 크기 10MB 이하
- [ ] 모든 페이지 폰트 깨짐 없음
- [ ] 이미지 선명도 유지 (확대해서 깨진 글자 없는지)
- [ ] 표 레이아웃 깨짐 없음
- [ ] 링크(YouTube, GitHub) 클릭 가능
- [ ] PDF/A 호환 저장 (장기보존용)
- [ ] 폰트 임베드 확인 (Adobe Reader 속성 > 폰트)
- [ ] 맥북·Windows·iPhone 3기기에서 모두 열어보기

### 5.2 HWP (선택 제출 시)
- [ ] 한컴오피스 2020/NEO에서 정상 열람
- [ ] 구버전(한컴오피스 2014) 호환성 — 저장 시 "이전 버전" 옵션 고려
- [ ] 표 셀 병합·분할이 DOCX와 동일하게 유지
- [ ] 한글 줄바꿈 자연스러움
- [ ] 이미지 캡션 위치 정확
- [ ] 목차 자동 생성 정상 (있을 경우)

### 5.3 Word 원본 (DOCX)
- [ ] 맥북 Word · Windows Word · Google Docs 3곳에서 정상 열람
- [ ] 스타일 자동 적용 확인
- [ ] 비교용 백업 저장

---

## 6. 자주 발생하는 문제 & 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| PDF에서 한글 깨짐 | 폰트 미임베드 | Word `저장` 옵션에서 "파일에 폰트 포함" 체크 |
| HWP에서 표 깨짐 | DOCX 변환 한계 | 한컴오피스에서 표 수동 재정렬 |
| 이미지 저해상도 | Pandoc 기본 150dpi | `--dpi=300` 옵션 추가 |
| 파일 크기 10MB 초과 | 이미지 과다 | ghostscript `/printer` 설정으로 재압축 |
| 목차 자동생성 실패 | 제목 스타일 미적용 | Word에서 각 제목에 "제목 1/2" 스타일 수동 적용 |
| 각주가 엉뚱한 위치 | Markdown 각주 Pandoc 처리 | 각주를 본문 참조 스타일(예: [^1])로 변경 |
| URL 링크가 작동 안 함 | 하이퍼링크 미설정 | Word에서 Ctrl+K로 수동 링크 재설정 |

---

## 7. 최종 산출물 디렉토리 구조

변환 완료 후 `docs/submission/` 구조:

```
docs/submission/
├── checklist.md                    # 접수 체크리스트
├── hwp_conversion_plan.md          # 이 문서
├── reference.docx                  # Pandoc 스타일 참조 (최초 1회 생성)
├── build/                          # 중간 산출물 (gitignore 고려)
│   ├── proposal.docx
│   ├── proposal.hwp
│   └── proposal.pdf
├── final/
│   ├── MenuLens_제안서_최종.pdf       # 제출용 메인
│   ├── MenuLens_제안서_최종.hwp       # 선택 제출
│   └── CHANGELOG.md                # 버전 이력
└── receipt/                        # 제출 후 생성
    ├── receipt_screenshot.png
    └── confirmation_email.pdf
```

---

## 8. `.gitignore` 추가 (필요 시)

중간 산출물은 저장소에 커밋할지 여부 결정:
- **커밋 권장**: `final/` — 제출 증거
- **커밋 권장 안 함**: `build/` — 재생성 가능

`.gitignore`에 추가:
```gitignore
# HWP/DOCX 중간 산출물 (재생성 가능)
docs/submission/build/
```

단 `final/`은 저장소에 커밋해 백업.

---

## 9. D11 실행 순서 (2~3시간)

- **0:00~0:30** — `docs/proposal.md` 최종 퇴고 (스코어카드 보완 반영)
- **0:30~0:45** — Pandoc 설치 확인 + `reference.docx` 스타일 확정
- **0:45~1:00** — `pandoc` 실행, DOCX 생성 + Word에서 검수
- **1:00~1:30** — 한컴오피스에서 DOCX 열어 HWP 저장 + 수동 정렬
- **1:30~1:45** — PDF 생성 + 크기·폰트 검증
- **1:45~2:00** — 3기기에서 열어 최종 확인 + `final/` 폴더로 복사

---

## 10. 이 문서의 오너십

- **작성**: Cowork (2026-04-23, D3, 사전 플랜)
- **실행**: D11 (2026-05-01, 목) — Cowork 단독 실행
- **갱신**: D11 완료 후 실제 소요 시간·발견한 이슈를 "§6 자주 발생하는 문제" 섹션에 반영
- **상태**: 🟡 **초안 (D11 실행 후 최종화)**
