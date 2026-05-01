"use client";

// TrustFooter — every public dataset behind a verdict cited at a glance.
// Mike (skeptical evaluator) persona: "근거 뭐야?" answered without modal.
// Sources are static (no fetch); language switches the labels.
import { FR } from "../../tokens";

export function TrustFooter({ language }: { language: string }) {
  const sources = [
    {
      icon: "📚",
      title: language === "ko" ? "메뉴 표기·재료" : "Translation & ingredients",
      provider:
        language === "ko"
          ? "한식진흥원 「길라잡이 800선」"
          : "Korean Food Promotion Institute · 800-Dish Standard",
      meta:
        language === "ko" ? "공공데이터포털 15129784" : "data.go.kr / 15129784",
    },
    {
      icon: "💸",
      title: language === "ko" ? "가격 적정성" : "Price benchmark",
      provider:
        language === "ko"
          ? "한국소비자원 「참가격」 외식 8개 품목"
          : "Korea Consumer Agency · 8-item dining price index",
      meta:
        language === "ko"
          ? "price.go.kr · 서울 2025-12"
          : "price.go.kr · Seoul, Dec 2025",
    },
    {
      icon: "📍",
      title: language === "ko" ? "주변 식당" : "Nearby restaurants",
      provider:
        language === "ko"
          ? "한국관광공사 TourAPI 4.0 (LOD SPARQL)"
          : "Korea Tourism Organization · TourAPI 4.0 (LOD SPARQL)",
      meta:
        language === "ko"
          ? "1,472,381 entities · CC BY-SA 3.0"
          : "1.47M entities · CC BY-SA 3.0",
    },
    {
      icon: "🤖",
      title: language === "ko" ? "사진 분석" : "Image analysis",
      provider: "Gemini 2.5 Flash Vision",
      meta:
        language === "ko"
          ? "OCR 95%+ 검증 (D8 80개 메뉴)"
          : "OCR 95%+ verified (D8 80-item stress test)",
    },
  ];

  return (
    <section
      aria-label={language === "ko" ? "근거 데이터" : "Data sources"}
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: FR.cream2, border: `1px solid ${FR.border}` }}
    >
      <div
        className="font-ko"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: FR.muted,
        }}
      >
        {language === "ko" ? "근거 · Sources" : "Sources"}
      </div>
      <ul className="flex flex-col gap-2">
        {sources.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1.4 }}>
              {s.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div
                className="font-ko"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: FR.ink,
                  letterSpacing: -0.2,
                }}
              >
                {s.title}
              </div>
              <div
                className="font-ko"
                style={{
                  fontSize: 11,
                  color: FR.inkSoft,
                  letterSpacing: -0.2,
                  marginTop: 1,
                }}
              >
                {s.provider}
              </div>
              <div
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 9,
                  color: FR.muted,
                  marginTop: 1,
                  letterSpacing: 0.2,
                }}
              >
                {s.meta}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div
        className="font-ko"
        style={{
          fontSize: 10,
          color: FR.muted,
          marginTop: 4,
          paddingTop: 6,
          borderTop: `1px dashed ${FR.border}`,
        }}
      >
        {language === "ko"
          ? "모든 색깔 판정은 위 4개 공공데이터 + AI 검증의 결합 결과입니다."
          : "Every verdict combines the 4 public datasets above with AI verification."}
      </div>
    </section>
  );
}
