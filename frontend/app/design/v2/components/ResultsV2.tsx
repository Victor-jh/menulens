"use client";

// ResultsV2 — Friendly card grid + pill-tab filter.
//
// Preserved from v1 (the 6 critical assets):
//   ✓ TTS playback button (per safe/yellow card → quick replay; safest path)
//   ✓ NearbyRestaurants section (LOD SPARQL — proposal §3.1 differentiator)
//   ✓ Multilingual: every label routed through i18n strings()
//   ✓ Price % evidence (item.pricePctOver — surfaced in card body)
//   ✓ Cart sticky bar — kept; tap a green/yellow card → +1 to cart
//   ✓ "New menu" header action (Sample preserves entry)

import { useEffect, useRef, useState } from "react";
import type { AnalyzedItem, AnalyzeResponse, CartItem, UserProfile } from "../../../types";
import { adaptItems, type FriendlyItem, denormalize } from "../adapter";
import { strings } from "../i18n";
import { FR, FR_TONE } from "../tokens";
import { NearbyRestaurants } from "../../../components/NearbyRestaurants";
import {
  fetchRestaurantsByDish,
  type DishFinderResponse,
} from "../../../lib/api";

interface Props {
  data: AnalyzeResponse;
  imageFile: File | null;
  language: UserProfile["language"];
  profile: UserProfile;
  cart: CartItem[];
  onCartChange: (item: AnalyzedItem, delta: number) => void;
  onReset: () => void;
  onCheckout: () => void;
  onShowStaff: (item: AnalyzedItem) => void;
}

type Filter = "all" | "green" | "yellow" | "red";

export function ResultsV2({
  data,
  language,
  profile,
  cart,
  onCartChange,
  onReset,
  onCheckout,
  onShowStaff,
}: Props) {
  const t = strings(language);
  const [filter, setFilter] = useState<Filter>("all");

  const items = adaptItems(data.items, profile);
  const order: Record<string, number> = { green: 0, yellow: 1, red: 2 };
  items.sort((a, b) => order[a.color] - order[b.color]);

  const counts = {
    all: items.length,
    green: items.filter((i) => i.color === "green").length,
    yellow: items.filter((i) => i.color === "yellow").length,
    red: items.filter((i) => i.color === "red").length,
  };

  const visible = filter === "all" ? items : items.filter((i) => i.color === filter);

  const totalQty = cart.reduce((s, c) => s + c.qty, 0);
  const totalPrice = cart.reduce(
    (s, c) => s + (c.listed_price ?? 0) * c.qty,
    0,
  );
  const cartByName = new Map(cart.map((c) => [c.name, c.qty]));

  const onShare = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`
        : "https://menulens-app.vercel.app";
    const text = `MenuLens · ${counts.green} ${t.signalGreen} · ${counts.yellow} ${t.signalYellow} · ${counts.red} ${t.signalRed}`;
    try {
      const nav = navigator as Navigator & {
        share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
      };
      if (nav.share) await nav.share({ title: "MenuLens", text, url });
      else if (navigator.clipboard) await navigator.clipboard.writeText(`${text} — ${url}`);
    } catch {
      /* user dismissed */
    }
  };

  return (
    <div
      className="font-ko relative mx-auto max-w-md"
      style={{
        background: FR.cream,
        color: FR.ink,
        minHeight: "100dvh",
        paddingTop: "max(0.5rem, env(safe-area-inset-top))",
        paddingBottom: totalQty > 0 ? "calc(7rem + env(safe-area-inset-bottom))" : "max(2rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10"
        style={{
          background: `${FR.cream}f0`,
          backdropFilter: "blur(14px)",
          borderBottom: `1px solid ${FR.border}`,
        }}
      >
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>👋</span>
            <span style={{ fontSize: 13, color: FR.inkSoft, fontWeight: 500 }}>
              {language === "ko" ? "안녕하세요!" : "Hi there!"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onShare}
              style={{ fontSize: 12, color: FR.inkSoft, padding: "4px 8px" }}
            >
              ↗ {language === "ko" ? "공유" : "Share"}
            </button>
            <button
              type="button"
              onClick={onReset}
              style={{ fontSize: 12, color: FR.inkSoft, padding: "4px 8px" }}
            >
              ↻ {language === "ko" ? "새 메뉴" : "New"}
            </button>
          </div>
        </div>

        <div className="px-5 pb-3">
          {/* Hermes router indicator: tells the user which kind of image
              the AI detected, so a single-dish photo doesn't get the
              confusing "1 of 1 dishes are safe" copy. */}
          {data.image_kind && data.image_kind !== "menu" && (
            <div
              className="font-ko mb-1"
              style={{
                fontSize: 11,
                color: FR.fog,
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              {data.image_kind === "single_dish"
                ? language === "ko"
                  ? `🍽 음식 사진 인식${data.main_dish_ko ? ` · ${data.main_dish_ko}` : ""}`
                  : `🍽 single dish detected${data.main_dish_ko ? ` · ${data.main_dish_ko}` : ""}`
                : language === "ko"
                  ? `🍽 식탁 사진 인식 (${(data.detected_dishes_ko ?? []).length}개 음식)`
                  : `🍽 table photo detected · ${(data.detected_dishes_ko ?? []).length} dishes`}
            </div>
          )}
          <h2
            className="font-ko"
            style={{
              fontSize: 21,
              fontWeight: 700,
              color: FR.ink,
              lineHeight: 1.3,
              letterSpacing: -0.5,
            }}
          >
            {data.image_kind === "single_dish" && data.main_dish_ko ? (
              language === "ko" ? (
                <>
                  <span style={{ color: FR.pickle }}>{data.main_dish_ko}</span>,{" "}
                  당신에게 {counts.green > 0 ? "안전" : counts.red > 0 ? "주의" : "확인 필요"}해요
                </>
              ) : (
                <>
                  <span style={{ color: FR.pickle }}>{data.main_dish_ko}</span> looks{" "}
                  {counts.green > 0 ? "safe" : counts.red > 0 ? "risky" : "uncertain"} for you
                </>
              )
            ) : language === "ko" ? (
              <>
                메뉴 {counts.all}개 중에서{" "}
                <span style={{ color: FR.pickle }}>{counts.green}개</span>는
                바로 드실 수 있어요
              </>
            ) : (
              <>
                <span style={{ color: FR.pickle }}>{counts.green}</span> of{" "}
                {counts.all} dishes are{" "}
                <span style={{ color: FR.pickle }}>safe</span> for you
              </>
            )}
          </h2>
          <div
            style={{
              fontSize: 11,
              color: FR.fog,
              marginTop: 6,
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            OCR {Math.round(data.ocr_quality * 100)}% ·{" "}
            {data.processing_time_seconds.toFixed(1)}s · {data.items.length}{" "}
            items
          </div>
        </div>

        {/* Pill tabs */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto" role="tablist">
          <PillTab
            label={t.tabAll}
            n={counts.all}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <PillTab
            label={t.tabGreen}
            n={counts.green}
            tone="green"
            active={filter === "green"}
            onClick={() => setFilter("green")}
          />
          <PillTab
            label={t.tabYellow}
            n={counts.yellow}
            tone="yellow"
            active={filter === "yellow"}
            onClick={() => setFilter("yellow")}
          />
          <PillTab
            label={t.tabRed}
            n={counts.red}
            tone="red"
            active={filter === "red"}
            onClick={() => setFilter("red")}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 flex flex-col gap-2.5">
        {data.warnings.length > 0 && (
          <div
            className="font-ko"
            role="status"
            style={{
              background: FR.honeySoft,
              border: `1px solid ${FR.honey}33`,
              color: FR.ink,
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {data.warnings.map((w, i) => (
              <div key={i}>· {w}</div>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <FriendlyEmpty
            t={t}
            onReset={() => setFilter("all")}
          />
        ) : (
          visible.map((it, i) => (
            <FriendlyCard
              key={`${it.ko}-${i}`}
              item={it}
              qty={cartByName.get(it.ko) ?? 0}
              language={language}
              t={t}
              onAdd={() => onCartChange(denormalize(it), 1)}
              onShowStaff={() => onShowStaff(denormalize(it))}
            />
          ))
        )}
      </div>

      {/* Hermes Phase 2 — for single_dish kind, find restaurants that
          registered this dish as their signature menu (LOD bestMenu reverse).
          Renders BEFORE the location-based NearbyRestaurants so the
          dish-specific suggestion is the primary CTA. */}
      {data.image_kind === "single_dish" && data.main_dish_ko && (
        <RestaurantsServingThisDish
          dishKo={data.main_dish_ko}
          language={language}
        />
      )}

      {/* Nearby restaurants — preserved */}
      <NearbyRestaurants language={language} />

      {/* Trust footer — every claim cites the public data source.
          Skeptical evaluators (= "Mike" persona) want to know "근거 뭐야?"
          before trusting a 🔴/🟡 verdict. Inline citations beat a hidden About page. */}
      <TrustFooter language={language} />

      {/* Sticky cart bar — preserved */}
      {totalQty > 0 && (
        <div
          className="fixed inset-x-0 z-20"
          style={{
            bottom: 0,
            paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 12,
            background: `${FR.cream}f0`,
            backdropFilter: "blur(14px)",
            borderTop: `1px solid ${FR.border}`,
          }}
        >
          <div className="mx-auto max-w-md flex items-center gap-3">
            <div className="flex-1">
              <div style={{ fontSize: 11, color: FR.fog }}>
                {totalQty} {language === "ko" ? "개" : "items"}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                {totalPrice > 0 ? `₩${totalPrice.toLocaleString()}` : "—"}
              </div>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="font-ko"
              style={{
                background: FR.pickle,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 14,
                padding: "12px 22px",
                boxShadow: `0 6px 18px ${FR.pickle}50`,
              }}
            >
              {language === "ko" ? "주문 →" : "Order →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RestaurantsServingThisDish({
  dishKo,
  language,
}: {
  dishKo: string;
  language: string;
}) {
  const [data, setData] = useState<DishFinderResponse | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    fetchRestaurantsByDish(dishKo, language, 8).then((r) => {
      if (cancelled) return;
      setData(r);
      setBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [dishKo, language]);

  const items = data?.items ?? [];
  const headerKo = `🍽 "${dishKo}"을(를) 시그니처로 등록한 식당`;
  const headerEn = `🍽 Restaurants that serve "${dishKo}" as a signature dish`;

  return (
    <section
      aria-label={language === "ko" ? "이 음식 파는 식당" : "Where to eat this dish"}
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{
        background: FR.cream2,
        border: `1px solid ${FR.border}`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          className="font-ko"
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: FR.ink,
            letterSpacing: -0.3,
            lineHeight: 1.4,
          }}
        >
          {language === "ko" ? headerKo : headerEn}
        </h2>
      </div>

      <div
        className="font-ko"
        style={{
          fontSize: 10,
          color: FR.fog,
          fontFamily: '"JetBrains Mono", monospace',
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {language === "ko"
          ? "Hermes Phase 2 · LOD ktop:bestMenu 역방향 쿼리"
          : "Hermes Phase 2 · LOD ktop:bestMenu reverse query"}
      </div>

      {busy && (
        <ul
          aria-label={language === "ko" ? "식당 검색 중" : "Loading restaurants"}
          className="-mx-4 px-4 flex gap-3 overflow-x-hidden"
          role="list"
        >
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="snap-start shrink-0 w-56 rounded-xl overflow-hidden animate-pulse"
              style={{
                background: FR.cream,
                border: `1px solid ${FR.border}`,
              }}
            >
              <div
                className="w-full h-28"
                style={{ background: "rgba(31,26,20,0.06)" }}
              />
              <div className="p-3 flex flex-col gap-2">
                <div
                  className="h-3 w-3/4 rounded"
                  style={{ background: "rgba(31,26,20,0.08)" }}
                />
                <div
                  className="h-2 w-1/2 rounded"
                  style={{ background: "rgba(31,26,20,0.06)" }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!busy && data?.status === "upstream_error" && (
        <div
          className="font-ko rounded-xl p-3"
          style={{
            background: "rgba(244,198,116,0.18)",
            border: `1px solid rgba(244,198,116,0.5)`,
            color: "#7A4F11",
            fontSize: 12,
          }}
        >
          {language === "ko"
            ? "🛰️ 관광 데이터 (TourAPI LOD) 일시 응답 지연. 잠시 후 다시 시도해주세요."
            : "🛰️ TourAPI LOD service is briefly unavailable. Please try again shortly."}
        </div>
      )}

      {!busy && data?.status === "no_results" && (
        <p
          className="font-ko"
          style={{ fontSize: 12, color: FR.fog }}
        >
          {language === "ko"
            ? `'${dishKo}'을(를) 시그니처로 등록한 식당이 LOD에 없어요.`
            : `No restaurant has registered '${dishKo}' as a signature dish in LOD yet.`}
        </p>
      )}

      {items.length > 0 && (
        <ul
          className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1"
          role="list"
        >
          {items.map((r) => (
            <li
              key={r.content_id}
              className="snap-start shrink-0 w-56 rounded-xl overflow-hidden flex flex-col"
              style={{
                background: FR.cream,
                border: `1px solid ${FR.border}`,
              }}
            >
              {r.first_image_thumbnail || r.first_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.first_image_thumbnail || r.first_image || ""}
                  alt=""
                  loading="lazy"
                  className="w-full h-28 object-cover"
                  style={{ background: "rgba(31,26,20,0.04)" }}
                />
              ) : (
                <div
                  className="w-full h-28 flex items-center justify-center"
                  style={{ background: "rgba(31,26,20,0.04)", fontSize: 28 }}
                >
                  🍽️
                </div>
              )}
              <div className="p-3 flex flex-col gap-1 flex-1">
                <h3
                  className="font-ko"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: FR.ink,
                    lineHeight: 1.3,
                  }}
                >
                  {r.title}
                </h3>
                {r.best_menu && (
                  <span
                    className="font-ko"
                    style={{
                      fontSize: 10,
                      color: FR.pickle,
                      fontWeight: 600,
                    }}
                  >
                    ⭐ {r.best_menu.slice(0, 30)}
                  </span>
                )}
                <p
                  className="font-ko"
                  style={{
                    fontSize: 11,
                    color: FR.fog,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.addr || ""}
                </p>
                {r.distance_m != null && (
                  <span
                    className="font-ko mt-auto"
                    style={{
                      fontSize: 10,
                      color: FR.inkSoft,
                      fontFamily: '"JetBrains Mono", monospace',
                    }}
                  >
                    {r.distance_m >= 1000
                      ? `${(r.distance_m / 1000).toFixed(1)}km`
                      : `${r.distance_m}m`}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TrustFooter({ language }: { language: string }) {
  // Every public dataset behind a verdict — provider · usage · last-known freshness.
  // Format: 4 short lines. No "About" modal — visible at a glance.
  const sources = [
    {
      icon: "📚",
      title: language === "ko" ? "메뉴 표기·재료" : "Translation & ingredients",
      provider:
        language === "ko"
          ? "한식진흥원 「길라잡이 800선」"
          : "Korean Food Promotion Institute · 800-Dish Standard",
      meta: language === "ko" ? "공공데이터포털 15129784" : "data.go.kr / 15129784",
    },
    {
      icon: "💸",
      title: language === "ko" ? "가격 적정성" : "Price benchmark",
      provider:
        language === "ko"
          ? "한국소비자원 「참가격」 외식 8개 품목"
          : "Korea Consumer Agency · 8-item dining price index",
      meta: language === "ko" ? "price.go.kr · 서울 2025-12" : "price.go.kr · Seoul, Dec 2025",
    },
    {
      icon: "📍",
      title: language === "ko" ? "주변 식당" : "Nearby restaurants",
      provider:
        language === "ko"
          ? "한국관광공사 TourAPI 4.0 (LOD SPARQL)"
          : "Korea Tourism Organization · TourAPI 4.0 (LOD SPARQL)",
      meta: language === "ko" ? "1,472,381 entities · CC BY-SA 3.0" : "1.47M entities · CC BY-SA 3.0",
    },
    {
      icon: "🤖",
      title: language === "ko" ? "사진 분석" : "Image analysis",
      provider: "Gemini 2.5 Flash Vision",
      meta: language === "ko" ? "OCR 95%+ 검증 (D8 80개 메뉴)" : "OCR 95%+ verified (D8 80-item stress test)",
    },
  ];
  return (
    <section
      aria-label={language === "ko" ? "근거 데이터" : "Data sources"}
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{
        background: FR.cream2,
        border: `1px solid ${FR.border}`,
      }}
    >
      <div
        className="font-ko"
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: FR.fog,
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
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: FR.ink,
                  letterSpacing: -0.2,
                }}
                className="font-ko"
              >
                {s.title}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: FR.inkSoft,
                  letterSpacing: -0.2,
                  marginTop: 1,
                }}
                className="font-ko"
              >
                {s.provider}
              </div>
              <div
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 9,
                  color: FR.fog,
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
        style={{
          fontSize: 10,
          color: FR.fog,
          marginTop: 4,
          paddingTop: 6,
          borderTop: `1px dashed ${FR.border}`,
        }}
        className="font-ko"
      >
        {language === "ko"
          ? "모든 색깔 판정은 위 4개 공공데이터 + AI 검증의 결합 결과입니다."
          : "Every verdict combines the 4 public datasets above with AI verification."}
      </div>
    </section>
  );
}

function PillTab({
  label,
  n,
  tone,
  active,
  onClick,
}: {
  label: string;
  n: number;
  tone?: "green" | "yellow" | "red";
  active: boolean;
  onClick: () => void;
}) {
  const toneColors = tone ? FR_TONE[tone] : null;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="font-ko whitespace-nowrap"
      style={{
        padding: "8px 14px",
        borderRadius: 99,
        background: active ? (toneColors?.c ?? FR.ink) : FR.cream2,
        color: active ? "#fff" : FR.ink,
        border: `1px solid ${active ? "transparent" : FR.border}`,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: -0.2,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        boxShadow:
          active && toneColors ? `0 2px 8px ${toneColors.c}40` : "none",
      }}
    >
      {toneColors && <span style={{ fontSize: 11 }}>{toneColors.emoji}</span>}
      <span>{label}</span>
      <span
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          opacity: active ? 0.85 : 0.55,
          padding: "1px 6px",
          borderRadius: 99,
          background: active ? "rgba(255,255,255,0.2)" : "rgba(31,26,20,0.06)",
        }}
      >
        {n}
      </span>
    </button>
  );
}

function FriendlyCard({
  item,
  qty,
  language,
  t,
  onAdd,
  onShowStaff,
}: {
  item: FriendlyItem;
  qty: number;
  language: UserProfile["language"];
  t: ReturnType<typeof strings>;
  onAdd: () => void;
  onShowStaff: () => void;
}) {
  const tone = FR_TONE[item.color];
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioState, setAudioState] = useState<"idle" | "playing">("idle");

  let message: string;
  if (item.isFreeSide) message = t.msgFreeSide;
  else if (item.color === "red") {
    const triggers = Object.values(item.triggers).flat();
    message =
      triggers.length > 0
        ? t.msgRedWithTriggers(triggers)
        : t.msgRedNoTriggers;
  } else if (item.color === "yellow") {
    const triggers = Object.values(item.triggers).flat();
    if (triggers.length > 0) message = t.msgYellowWithTrigger(triggers[0]);
    else if (item.pricePctOver !== null && item.pricePctOver > 0)
      message = t.msgYellowPriceOnly(item.pricePctOver);
    else message = t.msgYellowPriceOnly(0);
  } else message = t.msgGreen;

  const audioSrc = item.ttsAudioB64
    ? `data:${item.ttsMime ?? "audio/mp3"};base64,${item.ttsAudioB64}`
    : null;

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (audioState === "playing") {
      a.pause();
      a.currentTime = 0;
      setAudioState("idle");
    } else {
      a.play().catch(() => setAudioState("idle"));
      setAudioState("playing");
    }
  };

  return (
    <article
      style={{
        background: FR.cream2,
        border: `1px solid ${FR.border}`,
        borderRadius: 18,
        padding: "14px 14px 14px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div className="flex gap-3">
        {/* Initial badge with signal dot */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            flexShrink: 0,
            background: tone.soft,
            display: "grid",
            placeItems: "center",
            fontSize: 22,
            fontWeight: 700,
            color: tone.c,
            position: "relative",
          }}
          className="font-ko"
        >
          {item.ko.slice(0, 1)}
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: tone.c,
              border: `2px solid ${FR.cream2}`,
              fontSize: 9,
              display: "grid",
              placeItems: "center",
            }}
          >
            {tone.emoji}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <div
              className="font-ko"
              style={{
                fontSize: 16,
                color: FR.ink,
                fontWeight: 700,
                letterSpacing: -0.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.ko}
            </div>
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 13,
                color: FR.ink,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {item.isFreeSide
                ? language === "ko"
                  ? "무료"
                  : "Free"
                : item.price
                  ? `₩${item.price.toLocaleString()}`
                  : "—"}
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              color: FR.fog,
              marginTop: 2,
              fontStyle: "italic",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.en}
            {item.romanized && ` · ${item.romanized}`}
          </div>
          {/* Friendly message tonic */}
          <div
            className="font-ko"
            style={{
              marginTop: 8,
              padding: "7px 10px",
              borderRadius: 9,
              background: tone.soft,
              color: tone.c,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: -0.2,
              lineHeight: 1.4,
            }}
          >
            {message}
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex gap-2 pt-1">
        {audioSrc && (
          <button
            type="button"
            onClick={togglePlay}
            className="font-ko"
            aria-label="Play Korean audio"
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 10,
              border: `1px solid ${FR.border}`,
              background: FR.cream,
              color: FR.ink,
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            {audioState === "playing" ? "■" : "▶"}{" "}
            {language === "ko" ? "한국어" : "Korean"}
          </button>
        )}
        {item.color !== "red" && !item.isFreeSide && (
          <button
            type="button"
            onClick={onShowStaff}
            className="font-ko"
            style={{
              flex: 1.4,
              padding: "8px 10px",
              borderRadius: 10,
              border: "none",
              background: FR.ink,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            📝 {language === "ko" ? "직원에게" : "Show staff"}
          </button>
        )}
        {item.color !== "red" && !item.isFreeSide && (
          <button
            type="button"
            onClick={onAdd}
            className="font-ko"
            aria-label="Add to cart"
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: `1px solid ${FR.pickle}`,
              background: qty > 0 ? FR.pickle : FR.pickleSoft,
              color: qty > 0 ? "#fff" : FR.pickle,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {qty > 0 ? `+${qty}` : "+"}
          </button>
        )}
      </div>

      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onEnded={() => setAudioState("idle")}
          onError={() => setAudioState("idle")}
        />
      )}
    </article>
  );
}

function FriendlyEmpty({
  t,
  onReset,
}: {
  t: ReturnType<typeof strings>;
  onReset: () => void;
}) {
  return (
    <div className="font-ko" style={{ padding: "60px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 42 }}>🥒</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginTop: 14,
          color: FR.ink,
        }}
      >
        {t.emptyTitle}
      </div>
      <div style={{ fontSize: 12, color: FR.fog, marginTop: 6 }}>
        {t.emptySubtitle}
      </div>
      <button
        type="button"
        onClick={onReset}
        className="font-ko mt-4"
        style={{
          padding: "11px 22px",
          borderRadius: 99,
          background: FR.pickle,
          color: "#fff",
          border: "none",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {t.emptyAction}
      </button>
    </div>
  );
}
