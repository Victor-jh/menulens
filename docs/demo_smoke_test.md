# Demo Smoke Test — 시연 영상 촬영 직전 5분 점검

> D12 시연 영상 (2026-05-02 D12 또는 D13) 촬영 30분 전 실행 권장.
> 모든 단계 PASS면 촬영 green light. 실패 단계는 § "비상" 절로.
> 실행 위치: `/Users/bjh/Projects/menulens` (cwd)

## 도구
- 터미널 + `curl` + `pytest` (uv 환경: `uv run pytest ...`)
- iPhone Safari (시연용 동일 폰)
- (선택) Instagram에 비빔밥 사진 1장 미리 저장 (Use Case 2 mock 진입용)

---

## 1. Backend wake-up + cache prime (30초)

Render free tier는 15분 idle시 sleep. 첫 호출은 cold start 30s 가능 → 미리 깨워둔다.

```bash
# 1-1. Health probe (Render wake-up)
curl -s --max-time 30 -w "\nHTTP %{http_code} | %{time_total}s\n" \
  https://menulens-backend.onrender.com/health

# 1-2. LOD by_dish prime (Phase 2 dish_finder cache 워밍)
curl -s --max-time 30 \
  'https://menulens-backend.onrender.com/restaurants/by_dish?dish_ko=비빔밥&language=en&limit=8' \
  > /tmp/lod_cache_check.json

python3 -c "
import json
d = json.load(open('/tmp/lod_cache_check.json'))
print('LOD status:', d.get('status'))
print('items returned:', len(d.get('items', [])))
print('first item name:', (d.get('items') or [{}])[0].get('name', 'N/A'))
"
```

**PASS**: 1-1이 `HTTP 200` + 1-2 출력이 `LOD status: ok` & `items returned >= 3`.
**FAIL**: 1-1 timeout → Render 대시보드 → Manual Deploy. 1-2 `status: upstream_error` → § 비상 LOD 항목.

---

## 2. E2E smoke 8 cases (30~60초)

```bash
MENULENS_API=https://menulens-backend.onrender.com \
  uv run pytest tests/test_smoke_e2e.py -v -k "not warm" --tb=short
```

**PASS**: `8 passed` (또는 환경에 따라 `7 passed, 1 skipped` — warm-only는 명시적으로 제외했음).
**FAIL**: 실패한 첫 케이스 이름을 보고 `pytest tests/test_smoke_e2e.py::<failing_test_name> -v --tb=long` 단독 재실행 → 로그에 `dish_finder`·`menu_processor`·`tts` 중 어느 router가 fail인지 식별.

---

## 3. iPhone visual sanity (1분)

촬영용 iPhone Safari에서 https://menulens-app.vercel.app 접속 후 체크.

- [ ] 첫 페인트 ≤ 5초 (Render wake-up 후이므로 cold start 영향 없음)
- [ ] Hero "한글 메뉴판, 대신 읽어드릴게요" 보임 (브라우저 locale en이면 "Korean menu? We'll read it for you")
- [ ] ▶ 샘플 메뉴판 체험 (또는 ▶ Try a sample menu) 버튼 pickleStrong 진한 녹색
- [ ] 버튼 탭 → 결과 페이지 도달 ≤ 15s
- [ ] 김치찌개 카드: "Not pescatarian — contains pork" 친화 메시지 (raw `diet_hard_conflict` 토큰 노출 ❌)
- [ ] 짜장면 카드: "Black Bean Noodles · Jajangmyeon" subtitle (구버전 "Japchae" 오역 ❌)
- [ ] 김치찌개·물냉면 "Free" 표시 ❌ (가격 ₩ 표기 정상)
- [ ] 단무지·맑은국 Free 카드는 ✋ AVOID 빨간색 ❌ (중립 회색/녹색 — effectiveColor override 적용)
- [ ] 📝 Show staff 탭 → 한국어 phrase 28px Pretendard 보임
- [ ] 영문 라인 15px ink 색상 (D12 P1 fix — 회색 X, 진한 회색 O)

**PASS**: 위 10개 모두 ✅.
**FAIL**: 어느 하나라도 v1 디자인 또는 raw 토큰 노출 → § 비상 NEXT_PUBLIC_UI_VERSION 항목.

---

## 4. LOD Phase 2 verify (단독 라이브 확인)

step 1-2와 별도로, 시연 D-day에 LOD가 라이브인지 다른 dish로 한 번 더 cross-verify.

```bash
# 4-1. 다른 dish로 by_dish 호출 (cache 단일 키만 hit하지 않도록)
for dish in 김치찌개 떡볶이 잡채; do
  echo "=== $dish ==="
  curl -s --max-time 15 \
    "https://menulens-backend.onrender.com/restaurants/by_dish?dish_ko=$dish&language=en&limit=5" \
    | python3 -c "
import json, sys
d = json.load(sys.stdin)
print('  status:', d.get('status'), '| items:', len(d.get('items', [])))
"
done
```

**PASS**: 3개 dish 모두 `status: ok` & `items >= 1`.
**Soft FAIL (1~2개 outage)**: 시연 카루셀이 일부 dish에서만 빈 화면 — 영상에서 비빔밥만 사용하면 OK.
**Hard FAIL (3개 모두 outage)**: § 비상 LOD 항목 — Plan B B-roll mock 사용.

---

## 5. Green light 결정

| Step | PASS 조건 | 영상 영향 |
|---|---|---|
| 1 | `HTTP 200` + `status: ok` & items≥3 | Backend live + Phase 2 작동 |
| 2 | `8 passed` | E2E 회귀 0건 |
| 3 | iPhone 10/10 ✅ | UI v2 + D12 P0 fix 노출 |
| 4 | 3 dish 모두 ok | LOD Phase 2 다중 dish 안전 |

**ALL PASS** → 촬영 green light. CapCut 프로젝트 열고 §1 샷리스트 시작.
**Step 1·2 fail** → 촬영 연기 권장 (backend 미준비). Render 대시보드 dispatch 후 30분 대기.
**Step 3·4 partial** → 촬영 진행 가능, Plan B 적용 (LOD outage = honesty marker).

---

## 비상 (단계별 실패시)

### `/health` 실패 (step 1)
1. https://dashboard.render.com → menulens-backend → "Manual Deploy" → `Deploy latest commit`
2. 로그 tail에서 `Application startup complete` 확인
3. 다시 step 1 실행

### E2E 실패 (step 2)
1. 실패한 테스트 이름만 단독 실행: `uv run pytest tests/test_smoke_e2e.py::<test_name> -v --tb=long`
2. `dish_finder` fail → step 4로 LOD 상태 직접 확인
3. `menu_processor` fail → Anthropic API key 만료 가능, Render env 확인
4. `tts` fail → Google TTS quota — 소거 가능 (시연에 TTS 1회만 사용)

### iPhone v1 옛 디자인 보임 (step 3)
1. `vercel env ls --environment=production` 으로 `NEXT_PUBLIC_UI_VERSION` 확인
2. 값이 `v2`가 아니면 `vercel env add NEXT_PUBLIC_UI_VERSION production` → `v2` 입력
3. `vercel --prod` 재배포 → 5분 후 Safari hard reload (cmd-shift-R 모바일에선 사이트 데이터 삭제)

### LOD outage (step 1-2 또는 step 4)
1. 30초 대기 후 cache prime 1회 재시도 (TourAPI LOD endpoint flap 잦음)
2. 그래도 outage면:
   - **Plan B option A**: Phase 2 carousel "🛰️ 일시 응답 지연" 메시지를 그대로 촬영 (honesty marker — "외부 데이터 일시 지연도 graceful degrade하는 production")
   - **Plan B option B**: 사전 stash B-roll mock (식당 카드 5장 정적 PNG, `tests/fixtures/lod_broll_5cards.png` 등) 을 CapCut 편집 단계에서 overlay 합성

### Vercel app 자체가 fail (step 3 첫 페인트도 안 됨)
1. `vercel ls` 로 latest production deploy 상태 확인
2. `vercel inspect <url>` 로 빌드 로그 확인
3. 직전 커밋이 origin 시점 `git log --oneline -5` → revert 가능 (확인 후 사용자 승인)
