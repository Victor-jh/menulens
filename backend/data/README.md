# backend/data/ — 한식 800선 및 기타 데이터

## 한식진흥원 한식메뉴 외국어표기 길라잡이 800선

**파일**:
- `hansik_800.csv` (**커밋 포함**, UTF-8-sig, 800행 × 13열, ~873KB) — 로더가 사용하는 정제본
- `hansik_800.xlsx` (**.gitignore**, 로컬 보관) — 원본 xlsx 백업
- `hansik_800_column_map.json` (커밋 포함) — 원본 헤더 ↔ 표준 키 매핑

**출처**:
- 제공: 한식진흥원 (Korean Food Promotion Institute)
- 공공데이터포털 ID: `15129784`
- 원본 파일명: `한식메뉴 외국어표기 길라잡이 800선_20230601.xlsx`
- 다운로드 URL: https://www.data.go.kr/data/15129784/fileData.do
- 유형: 파일데이터(fileData) — 로그인 후 즉시 다운로드
- 취득일: 2026-04-23 (D3)

**라이선스**: **공공누리 제1유형 (출처표시)** — 상업·비상업 자유 이용, 변형 허용, **출처 표시 의무**.

출처 표시 문구(제안서·UI·영상 설명란에 필수):
> 한식메뉴 외국어표기 길라잡이 800선 (한식진흥원, 공공데이터포털 15129784, 공공누리 제1유형)

**컬럼 정의**: `docs/research/05_한식800선_정제스펙.md` §1.2 참조.

**사용 예시**:
```python
import pandas as pd
df = pd.read_csv('backend/data/hansik_800.csv', encoding='utf-8-sig')
print(df.shape)  # (800, 13)
print(df[df['name_ko'] == '김치찌개'].iloc[0].to_dict())
```

---

## 향후 추가 예정

- `consumer_price.json` — 한국소비자원 참가격 외식비 8품목 (D4에 생성)
- `kmf_halal.json` — KMF 할랄 인증 식당 (Phase 2)
- `food_nutrition.*` — 식약처 식품영양성분DB 일부 (D5 보조)

각 데이터셋 사용 시 본 README에 출처·라이선스·취득일을 추가한다.
