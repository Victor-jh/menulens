# Reddit r/koreatravel — 1차 배포 포스트 초안

> 게시 권장 일정: D13~D14 (2026-05-03 토 ~ 05-04 일) 한국 시간 오전 9시 = US 동부 전일 저녁 8시 = 유럽 오후 2시.
> 위 시간대가 r/koreatravel 활성 traffic 피크. 마감(D16, 2026-05-06 16:00) 36~60시간 전 게시로 외부 검증 시간 확보.
>
> 사용자 본인이 자신의 Reddit 계정으로 직접 게시 (자동 봇 게시는 룰 위반).

---

## Subreddit 선택

| Sub | Members | 톤 | 게시 우선순위 |
|---|---|---|---|
| r/koreatravel | 96k | 실용 질문·후기 | **★ 1순위** |
| r/seoul | 170k | 일상·식당·이벤트 | 1순위 |
| r/koreanfood | 150k | 음식 토론 | 2순위 (덜 적합 — 우리는 도구) |
| r/expats (Korea flair) | — | 거주 외국인 | 2순위 |
| r/travel — Korea megathread | 4M | 광범위 | 3순위 |

**규칙 점검 필수**:
- r/koreatravel — Self-promotion 금지 룰 있음. "show & tell" 형식·툴 무료·비영리·feedback 요청 톤이면 통과 가능. 모더레이터 사전 DM 권장.
- r/seoul — promotion에 더 엄격. 사진+한 가지 질문 형식이 안전.

---

## 게시 본문 — Version A (r/koreatravel · feedback 톤)

**Title**: I built a free tool to read Korean menus in 4 seconds — looking for testers before submission deadline

**Body**:

Hey r/koreatravel,

I'm a developer in Korea building **MenuLens** — a small free web app for the moment you stand in front of a Korean menu and have no idea what's safe to order.

**The 4-second problem**: 4 things at once. What is this dish? Is the price fair? Can I eat this with my allergies / halal / vegan diet? How do I order it? Most apps solve one. MenuLens tries to solve all four with one photo.

**How it works**: Snap the menu → 6~80 dishes get a 🟢🟡🔴 color in 10~40 seconds. Tap a 🟢 dish → it shows the Korean text in big font + plays the natural Korean phrase so you can show your phone to the waiter.

**Try it (no signup, no app install)**: https://menulens-app.vercel.app

There's a "Try a sample menu" button on the home page if you don't want to take a photo right now.

**Why I'm posting**: This is a contest submission for the 2026 Korea Tourism Organization data competition (deadline May 6). I want feedback from real travelers before I submit. Specifically:

1. Did it work on your phone?
2. Was the color decision instantly readable, or confusing?
3. Anything obviously wrong with the translation / allergy detection?
4. Would you actually pull this out at a restaurant in Seoul?

**What's under the hood (for the curious)**: Korea Tourism Organization's TourAPI 4.0 + the official Korean Food Promotion Institute's 800-dish dictionary + the Consumer Affairs Agency's price benchmark + Gemini Vision for OCR. All public Korean government data — first public app to combine all four.

Honest disclosure: it's a one-person project, the backend is on Render free tier so the first request might take 30 seconds while it wakes up. Subsequent requests are <10s. I'll be reading every comment.

Thanks 🙏

— [Your name / handle]

---

## 게시 본문 — Version B (r/seoul · 사진 중심 · 짧음)

**Title**: Made a free menu reader for Korean restaurants — testing in real spots before May 6

**Body** (with screenshot):

Built a small free web app that reads Korean menus and tells you 🟢🟡🔴 per dish (allergies / halal / vegan + bargain price check).

[screenshot: Results page with 🟢🟡🔴 cards]

Site (no signup): https://menulens-app.vercel.app — there's a "Try sample menu" button to test instantly.

If you've got a screenshot of a Korean menu you've struggled with, drop it in comments and I'll run it through and post results. Looking for edge cases before contest deadline.

—

## 답변 템플릿 (예상 댓글 대비)

**Q: Why not just use Papago?**
> Papago translates the text but doesn't tell you "you can't eat this because of pork" or "this is 35% above average price." It's a translator, not a decision tool. MenuLens runs the translation through Korea's official 800-dish standard + the Korea Consumer Agency's price benchmark.

**Q: Is my data safe?**
> Photos are sent to the backend, run through Gemini for OCR, and the response is returned — no photo storage, no account, no email collected. Source code is on GitHub (link), so anyone can audit.

**Q: It said something wrong**
> Thanks — please drop the photo + your profile (language / allergies) and I'll trace what happened. We're 96% accurate on a stress test of 80 dishes but real menus vary.

**Q: How do you make money?**
> No money model right now — this is a contest submission. If selected (5월 말 결과), I'll explore B2B for restaurants (a dashboard so they can publish their own translated menu). Always free for travelers.

---

## 측정 (제안서 §4 evidence 보강용)

게시 후 모니터링:
- 첫 24h: upvotes, comments 수
- 트래픽: Vercel Analytics에서 r/koreatravel referrer 카운트
- 정성 피드백: "actually used in restaurant" 사례 캡처 → §3.3.x 추가

목표 (소박):
- ≥ 30 upvotes (소셜 증명)
- ≥ 5 사용자 본인 사진 시도
- ≥ 1 "이거 진짜 식당에서 써봤다" 실 사용 사례

---

## 절대 하지 말 것

- 봇 자동 게시 — 영구 ban
- 같은 글을 여러 sub에 동시 — cross-posting limit
- 내가 1인이면서 "we" 표현 — 발각시 신뢰 0
- "vote my submission" 노골적 부탁 — 평가위원 선거 아님, contest는 별도
- 디스클레이머 빼기 — "free tier 30s cold start" 같은 limitation 솔직히
