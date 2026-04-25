# Toss 디자인 원칙 → MenuLens 적용 체크리스트

> **출처**: toss.tech (8 writing principles, TDS color system update, error message system, Simplicity24) + 모비인사이드 UX 법칙 10가지
> **적용 시점**: D8 (UX 개선 스프린트)
> **상태**: Quick wins 9개 중 P0 핵심 3개는 D7에서 선반영 (severity badge, sort toggle, ingredients 노출), 나머지는 D8 이월

---

## 핵심 방향

> **1 화면 1 질문 · 1 Primary 컬러 · 나머지는 회색 · 문장은 입으로 말하듯**

## 체크리스트 — Onboarding (`frontend/app/components/Onboarding.tsx`)

- [ ] **Step 분할**: 4개 질문(언어·종교·식단·알레르기) 한 화면 → 4단계. 상단 얇은 progress dots (Hick·Postel's Law)
- [ ] **언어 선택을 0단계로**: 국기 + 언어명 큰 카드. 외국인 UX 핵심
- [ ] **질문형 헤드라인**: "사용자 설정" → "어떤 음식을 피해야 해요?" (Easy to Speak)
- [ ] **알레르기 = 큰 Chip 카드**: `min-h-14 rounded-2xl`, 선택 시만 Primary 외곽선 (Fitts's Law 10~14mm)
- [ ] **BottomCTA 고정**: 화면 하단 1개 Primary 버튼, `safe-area-inset-bottom`, 미선택 시 disabled 회색

## 체크리스트 — Upload (`frontend/app/components/Upload.tsx`)

- [ ] **Camera를 Primary Blue 큰 버튼 단독**: 갤러리는 하단 Ghost 텍스트 링크 (Hick's Law)
- [ ] **헤드라인 구어체화**: "메뉴판을 찍어주세요" + 서브 "흐릿해도 괜찮아요, 알아서 읽어드릴게요"
- [x] **업로드 팁 강조**: "flat menu, even lighting…" (D7 반영 완료)
- [ ] **업로드 후 확인 단계**: 큰 Thumbnail + "이 사진으로 분석할까요?" + [다시 찍기 Ghost][분석 Primary] (강요 대신 제안)
- [ ] **단계별 로딩**: "글자 읽는 중 → 메뉴 찾는 중 → 재료 확인 중", 각 400~800ms + mascot (Doherty Threshold)
- [x] **업로드 실패 복구 문구**: "사진이 안 보여요. 다시 찍어볼까요?" (D7 부분 적용, 추가 다듬기 필요)

## 체크리스트 — Results (`frontend/app/components/Results.tsx`)

- [ ] **카드 무채색 + 좌측 4px 컬러 스트라이프**: 현재 전체 배경 컬러 → 절제. Von Restorff는 드물 때만 효과
- [ ] **타이포 위계**: 메뉴명 20pt Bold, 한글 원문 15pt Regular 옅은 회색, 경고 15pt Medium
- [x] **Severity 배지 (텍스트+아이콘+색)**: ✓/!/✕ + "Safe/Caution/Avoid" (D7 완료)
- [x] **Sort toggle (Safety / Menu order)**: (D7 완료)
- [x] **재료 + 알레르기 칩**: (D7 완료)
- [ ] **경고 문구 완결 문장**: "Contains pork" → "돼지고기가 들어 있어요. 주문하지 않는 게 좋겠어요." (숨은 감정)
- [ ] **상단 요약 배너**: "20개 메뉴 중 14개는 드실 수 있어요" (Peak-End Rule)
- [ ] **BottomCTA**: "새로운 메뉴판 분석하기" 고정 Primary
- [ ] **세그먼트 필터**: [전체 / 먹을 수 있는 / 피해야 할] Phase 2 (Miller's Law)

## 체크리스트 — Globals (`frontend/app/globals.css`)

- [ ] **색 토큰 통일**: `--brand-primary #3182F6` (Toss Blue) + `--neutral-*` + `--semantic-{critical,warning,success}` 3개만. emerald/amber/red 직접 사용 금지.
- [ ] **타이포 토큰**: `--text-display(28/34 Bold)`, `--text-title(22/28)`, `--text-body(15/22)`, `--text-caption(13/18)`. Pretendard 권장.
- [ ] **스페이싱 스케일**: 4·8·12·16·24·32·48만 사용
- [ ] **탭 타겟 최소**: `min-h-[44px]` 인터랙티브 요소 전부
- [ ] **Button variant 컴포넌트화**: `<Button variant="primary|secondary|ghost" size="lg|md">` 3종

## 라이팅 원칙 (토스 8원칙 축약)

1. **잡초 뽑기** — "앞으로", "이제부터" 같은 의미 없는 부사 삭제
2. **숨은 감정 찾기** — 트랜잭션에도 감정 언어
3. **강요 대신 제안** — "~하세요" → "~해볼까요?"
4. **보편 단어** — 외국인·어르신도 이해
5. **Easy to Speak** — 입으로 말할 수 있는 문장만
6. **Navigating Error** — 에러는 반드시 "다음에 뭘 해야 하는지"
7. **능동형 짧게** — 수동형 회피
8. **숫자는 스타** — 중요 수치는 헤드라인급 크기

## 출처

- https://toss.tech/article/8-writing-principles-of-toss
- https://toss.tech/article/tds-color-system-update
- https://toss.tech/article/introducing-toss-error-message-system
- https://toss.tech/article/simplicity24
- https://www.mobiinside.co.kr/2023/03/29/toss-ux-2/
- https://developers-apps-in-toss.toss.im/design/components.html

## 영향 점수 (D8 계획 가중치)

| Quick win | 제안서 심사배점 영향 | 소요 |
|---|:-:|:-:|
| Onboarding step 분할 + 질문형 헤드라인 | 사용자 친화성 +3pt | 1.5h |
| Upload Primary CTA + 확인 단계 | 사용자 친화성 +2pt | 1h |
| Results 카드 무채색화 + 좌측 스트라이프 | 심미성 +2pt | 1.5h |
| 요약 배너 + BottomCTA | 완결성 +1pt | 1h |
| 색·타이포 토큰화 | 심사위원 인상 +1pt | 1h |

총 예상 D8 시간 **6시간**. D8(2026-04-28)에 전체 UI 리팩토링 1회로 처리.
