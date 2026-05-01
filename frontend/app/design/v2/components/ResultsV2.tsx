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

import { useState } from "react";
import type { AnalyzedItem, AnalyzeResponse, CartItem, UserProfile } from "../../../types";
import { adaptItems, denormalize } from "../adapter";
import { strings } from "../i18n";
import { FR, FR_TONE } from "../tokens";
import { NearbyRestaurants } from "../../../components/NearbyRestaurants";
import { FriendlyCard } from "./parts/FriendlyCard";
import { RestaurantsServingThisDish } from "./parts/RestaurantsServingThisDish";
import { TrustFooter } from "./parts/TrustFooter";

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
                color: FR.muted,
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
                  <span style={{ color: FR.pickleText }}>{data.main_dish_ko}</span>,{" "}
                  당신에게 {counts.green > 0 ? "안전" : counts.red > 0 ? "주의" : "확인 필요"}해요
                </>
              ) : (
                <>
                  <span style={{ color: FR.pickleText }}>{data.main_dish_ko}</span> looks{" "}
                  {counts.green > 0 ? "safe" : counts.red > 0 ? "risky" : "uncertain"} for you
                </>
              )
            ) : language === "ko" ? (
              <>
                메뉴 {counts.all}개 중에서{" "}
                <span style={{ color: FR.pickleText }}>{counts.green}개</span>는
                바로 드실 수 있어요
              </>
            ) : (
              <>
                <span style={{ color: FR.pickleText }}>{counts.green}</span> of{" "}
                {counts.all} dishes are{" "}
                <span style={{ color: FR.pickleText }}>safe</span> for you
              </>
            )}
          </h2>
          <div
            style={{
              fontSize: 11,
              color: FR.muted,
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
              <div style={{ fontSize: 11, color: FR.muted }}>
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
                background: FR.pickleStrong,
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
        // D12 audit P1: 44px+ touch target (Apple HIG)
        minHeight: 44,
        padding: "10px 16px",
        borderRadius: 99,
        background: active ? (toneColors?.c ?? FR.ink) : FR.cream2,
        color: active ? "#fff" : FR.ink,
        border: `1px solid ${active ? "transparent" : FR.border}`,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: -0.2,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        boxShadow:
          active && toneColors ? `0 2px 8px ${toneColors.c}40` : "none",
      }}
    >
      {toneColors && <span style={{ fontSize: 12 }}>{toneColors.emoji}</span>}
      <span>{label}</span>
      <span
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
          opacity: active ? 0.85 : 0.55,
          padding: "2px 7px",
          borderRadius: 99,
          background: active ? "rgba(255,255,255,0.2)" : "rgba(31,26,20,0.06)",
        }}
      >
        {n}
      </span>
    </button>
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
      <div style={{ fontSize: 12, color: FR.muted, marginTop: 6 }}>
        {t.emptySubtitle}
      </div>
      <button
        type="button"
        onClick={onReset}
        className="font-ko mt-4"
        style={{
          padding: "11px 22px",
          borderRadius: 99,
          background: FR.pickleStrong,
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
