# 부록 — MenuLens 프로덕션 캐너리 + 패턴 evidence

> 이 문서는 본 제안서(`proposal.md`)의 §3.3 작동 검증을 보조하는 evidence 모음이다.
> 5쪽 본문 한도 안에서 핵심 수치만 보여주고, 상세 표·로그·코드 다이어그램은 본 부록에 정리한다.
> GitHub: <https://github.com/Victor-jh/menulens> · Live: <https://menulens-app.vercel.app>

---

## A. 페르소나 캐너리 — 4명 (Yui · Aisha · Chen · Mike)

본 제안서가 채택한 4 페르소나는 외국인 방한 시장의 인구 비중·식단 제약 강도·결정 톨러런스를 모두 cover하기 위한 의도적 분포다.

| | **Yui** | **Aisha** | **Chen** | **Mike** |
|---|---|---|---|---|
| 국적 | JP 30대 솔로 | ID 30대 4인 가족 | CN 30대 솔로 | US 30대 backpacker |
| 시장 | 방한 2위 277만 | 인니 무슬림 잠재 2.7M+ (성장률 1위) | 단체 방한 다수 | 가장 작은 시장 |
| 결정 기준 | Pescatarian (어/조개 OK) | Halal (돼지 절대) | 견과·참기름 알러지 (생명 위협) | 제약 없음, 회의적 |
| 검증 일자 | 2026-04-25 D8 | 2026-04-26 D9 | 2026-05-01 D11 | (UX 신뢰 보강 — TrustFooter, ↓§D) |

### A.1 Yui — D8 분식 80개 stress (서울 연신내역, 메신저 압축본 468×832)

| 검증 항목 | 측정값 |
|---|---|
| 메뉴 추출 정확도 | **77/80** (96%, OCR 95%) |
| 가격 자동 인식 | 77/77 (100%) |
| 페르소나 색깔 판정 | 39🟢 / 2🟡 / **36🔴** |
| **conflict 정확도** | **36/36** (돼지·소·닭 전건) |
| 무료 사이드 인식 | 14건 (단무지·맑은국 등) |
| 가격 벤치마크 | 참치김밥 ₩5,000 → 김밥 평균 ₩3,700 대비 **35% 🔴** |
| 처리 시간 | 42.2s (cap 80개·RAG 병렬) |
| LOD nearby 응답 | 800ms 이하 |

### A.2 Aisha (Halal·Muslim) — D9 prod canary (synthetic 6 메뉴)

| 검증 항목 | 측정값 |
|---|---|
| 메뉴 추출 | 6/6 (OCR 99%) |
| 처리 시간 | **11.88s** warm / 15s cold |
| 색깔 분포 | 3🟢 / 1🟡 / **2🔴** |
| **김치찌개** (돼지) | 🔴 "Not halal — contains pork. KMF certification required for full assurance." ✓ |
| **돌솥비빔밥** (가격) | 🔴 "서울 평균 ₩11,200 대비 34% 높음 — 관광지 가격 의심" ✓ |
| **삼계탕** (할랄 호환 닭) | 🟢 (단 KMF 인증 식당 cross-check Phase 2) |
| **물냉면** (가격 borderline) | 🟡 "₩12,100 대비 16% 비쌈 — 주의" ✓ |

증명: ① 종교적 식단 제약을 영문 평이체로 즉답 (현존 경쟁자 0). ② 할랄 차단(돼지)과 가격 차단(34%)이 서로 다른 메뉴에서 독립 동작 — verdict 결정 트리가 종교·가격 두 차원을 동시에 평가.

### A.3 Chen (peanut/sesame/nuts) — D11 prod canary

| 메뉴 | 색깔 | 차단 사유 | 검출 ingredient | 평가 |
|---|---|---|---|---|
| 김치찌개 | 🔴 | 가격 (40%) | 돼지·어패류·두부 | OK — 알러지 채널 외 차단 |
| **삼계탕** | 🔴 | **알러지: nuts** | 닭·삼계·**밤** | **✓ 정확** — 견과(밤) 차단 |
| 돌솥비빔밥 | 🔴 | 가격 (34%) | (allergens 미검출) | ⚠️ Phase 2 — 비빔밥의 참기름이 800선 RAG에 미태깅 |
| 된장찌개 | 🟢 | 통과 | 조개·두부·된장 | OK |
| 물냉면 | 🟡 | 가격 16% | 소고기·면 | OK |
| 짜장면 | 🟢 | 통과 | 면·간장 | OK |

증명: 한식진흥원 800선 RAG의 임베딩 검색이 명시적 'nuts' 태그 없이도 '밤'을 견과로 매핑. **알려진 갭은 솔직히 명시**(비빔밥 sesame oil) — *알려진 갭은 신뢰의 근거*.

### A.4 Mike (회의적 사용자) — UX 신뢰 보강

평가 대상이 외국인이지만 평가자 또한 도구를 처음 보는 회의적 사용자(평균 5분 이내 판단). MenuLens는 Results 페이지 하단에 **TrustFooter** 영구 표시:

| 데이터 | 제공기관 | freshness |
|---|---|---|
| 📚 메뉴 표기·재료 | 한식진흥원 800선 | data.go.kr 15129784 |
| 💸 가격 적정성 | 한국소비자원 참가격 8품목 | price.go.kr · Seoul Dec 2025 |
| 📍 주변 식당 | 한국관광공사 TourAPI 4.0 LOD | 1.47M entities · CC BY-SA 3.0 |
| 🤖 사진 분석 | Gemini 2.5 Flash Vision | OCR 95%+ verified |

본문 카피: *"Every verdict combines the 4 public datasets above with AI verification."* — 6 페르소나 인터뷰에서 "근거 명시"가 외국인 신뢰 1순위로 보고됐다.

---

## B. Hermes 라우터 패턴 (D11, Phase 1)

기존 도구는 사용자에게 "메뉴판이세요? 음식 사진이세요?" 모드를 묻는다 — 외국인 30초 결정 게임의 **불필요한 인지 부담**. 그리스 신화의 사자(messenger) Hermes 패턴을 도입해 이 결정을 백엔드로 위임.

### B.1 아키텍처

```
[image upload]
       ↓
   ┌──────────────────────────────────┐
   │ Hermes Classifier (Gemini Vision) │  ← JSON 1회 호출
   │ kind ∈ {menu, single_dish,        │     menu_reader와 PARALLEL 실행
   │ table_with_dishes, not_food}      │     (asyncio.create_task)
   │ + main_dish_ko, confidence        │
   └──────────────────────────────────┘
       ↓ 결합 판정 (items≥3=menu / 0=classifier / 1-2=hybrid)
   ┌─────────┬─────────────┬──────────┐
   │  menu   │ single_dish │ not_food │
   │  ↓      │      ↓      │    ↓     │
   │ 색깔    │ 단일 dish + │ 친화      │
   │ 카드    │ "이 음식    │ 거절      │
   │ 리스트  │ 파는 식당"  │ 메시지   │
   │         │ (LOD 역방향) │          │
   └─────────┴─────────────┴──────────┘
```

### B.2 Latency 측정

| 케이스 | 단일 호출(전) | 라우터 적용(후) | 차이 |
|---|---:|---:|---|
| synthetic 6 메뉴 (Yui) | 10.65s | 11.64s | +0.99s (parallel 효과) |
| synthetic 6 메뉴 (Aisha Halal) | 11.88s | 11.88s | 0 (cache hit) |
| 분식 80 메뉴 (D8 stress) | 42.2s | ~43s 추정 | +0.8s |

parallel 실행으로 추가 비용 사실상 0. 사용자가 모드 잘못 선택해 round-trip(평균 30s)하는 비용을 영구 제거.

### B.3 비-메뉴 이미지 거절

영수증·간판·shopping list 오업로드 대비. menu_reader system prompt에 "NOT-A-MENU REJECTION" 규칙: `{"items":[], "warnings":["not_a_menu"]}` 반환. 프론트는 결과 페이즈 차단 + 친화 메시지: *"메뉴판으로 보이지 않아요. 메뉴 이름과 가격이 보이는 사진으로 다시 찍어주세요."*

원칙: **AI 환각으로 가짜 메뉴 제공보다 명시적 거부가 안전**.

---

## C. dish_finder — LOD ktop:bestMenu 역방향 (D11, Phase 2)

### C.1 활용 의의

LOD `ktop:bestMenu`는 통상 식당 상세 페이지의 **표시용 데이터**(예: 대성집 → bestMenu="쟁반짜장")이다. MenuLens는 이를 **dish 검색 인덱스로 invert**한다.

```sparql
PREFIX ktop: <http://data.visitkorea.or.kr/property/>
SELECT ?s ?name ?bestMenu ?lat ?lng ?image WHERE {
  ?s a kto:Gastro ;
     rdfs:label ?name ;
     ktop:bestMenu ?bestMenu .
  FILTER(CONTAINS(LCASE(STR(?bestMenu)), LCASE("비빔밥")))
  OPTIONAL { ?s wgs:lat ?lat ; wgs:long ?lng . }
  OPTIONAL { ?s foaf:depiction ?image . }
}
LIMIT 30
```

→ 그 음식을 시그니처로 등록한 식당 list 응답.

### C.2 use case (decision loop closed)

> 외국인이 친구 인스타그램에서 본 음식 사진 1장 → MenuLens 업로드 → Hermes Classifier가 `single_dish + main_dish_ko=비빔밥` 검출 → ResultsV2가 "Bibimbap, halal cross-check OK" + dish_finder가 "그 음식을 시그니처로 파는 식당 5곳 좌표 + Korean order phrase"

**역대 13회 관광데이터 공모전 수상작 0건** — bestMenu 양방향 인덱싱은 14회차 first-mover 사례.

### C.3 graceful degrade

LOD endpoint는 외부 인프라 한계로 간헐 outage(D11 일자 측정 시점 ~3시간 404). MenuLens는 **stale-cache 패턴**으로 사용자 영향 격리:

- 1회 retry + 250ms backoff
- 마지막 성공 응답을 age 무관 반환 + "⏳ N분 전 캐시" 라벨
- cache 비어있으면 "🛰️ 일시 응답 지연" 친화 메시지 + 현재 위치 fallback (NearbyRestaurants)
- LOD 복구 시 자동 작동 (코드 ready)

---

## D. 접근성 (WCAG 2.1 AA · D11)

| Pair | Contrast | 등급 |
|---|---:|---|
| FR.ink #1F1A14 on cream #FFF8EE | 16.37 | AAA |
| FR.inkSoft #5C5347 on cream | 7.15 | AAA |
| **pickleText #1F6E40 on cream** | 5.92 | AA ✓ (D11 fix) |
| **honeyText #7A4F11 on cream** | 6.74 | AA ✓ (D11 fix) |
| **blushText #A03A2A on cream** | 6.36 | AA ✓ (D11 fix) |
| **muted #7A716A on cream** | 4.53 | AA ✓ (D11 fix) |
| white on **pickleStrong #226A3F** | 6.56 | AA ✓ (D11 fix) |

추가 a11y:
- ✓!✕ + SAFE/CAUTION/AVOID 텍스트 + 좌측 4px 컬러 stripe (색맹 8% 대응)
- 글로벌 `:focus-visible` 2px outline (키보드 nav)
- iPhone safe-area-inset-{top,bottom} 적용 (notch 회피)
- 5개 언어 i18n (en/ko/ja/zh-Hans/zh-Hant)

---

## E. 출처 (Sources)

본 부록의 모든 측정값은 다음 자산의 응답에서 직접 발췌됐다 (가공 데이터 없음):

- 백엔드: `https://menulens-backend.onrender.com` (Render free tier · keep-alive cron 13분)
- 프론트엔드: `https://menulens-app.vercel.app`
- 코드: `https://github.com/Victor-jh/menulens` (D14 public 전환 예정)
- 시연 영상: D9 촬영 (2026-04-29) → YouTube Unlisted 링크 본문 §체크리스트 참조
- D8/D9/D11 캐너리 raw JSON: `tests/fixtures/` + `docs/research/06_샘플메뉴판_시연용.md`
