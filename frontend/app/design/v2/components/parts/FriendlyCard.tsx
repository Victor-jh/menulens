"use client";

// FriendlyCard — single dish card in Results.
// Largest sub-component of ResultsV2 (~250 lines). Extracted for readability;
// shape unchanged. Renders Korean badge + tonic message + Korean TTS audio +
// Show staff CTA + add-to-cart button. Trigger labels come from i18n strings.
import { useRef, useState } from "react";

import type { UserProfile } from "../../../../types";
import type { FriendlyItem } from "../../adapter";
import { strings } from "../../i18n";
import { FR, FR_TONE } from "../../tokens";

export function FriendlyCard({
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
  // Free banchan override: a free side dish is by definition opt-in (it
  // arrives with the meal, you don't have to eat it). Coloring it red would
  // contradict the "Free, comes without ordering" message — design audit P0.
  // We coerce the visual state to green for free items regardless of what
  // verdict.py decided, but keep the original color in `item.color` for
  // analytics. Conflict reasons (e.g., pork in 김치찌개 for a Pescatarian)
  // still surface in the message body so the user knows what to skip.
  const effectiveColor = item.isFreeSide ? "green" : item.color;
  const tone = FR_TONE[effectiveColor];
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioState, setAudioState] = useState<"idle" | "playing">("idle");

  // Backend ships two trigger fields:
  //   - reasonsText  → human-readable lines from verdict.py (preferred)
  //   - triggers     → categorical flags ('diet_hard_conflict', 'price_suspect')
  //                    These are useful for filtering but MUST NOT leak into
  //                    user UI as English. They did, in v1 — design audit P0.
  // We always prefer reasonsText; fall back to a safe generic only when empty.
  const reasons = item.reasonsText.filter((r) => r && r.trim().length > 0);

  let message: string;
  if (item.isFreeSide) message = t.msgFreeSide;
  else if (item.color === "red") {
    message = reasons[0] ?? t.msgRedNoTriggers;
  } else if (item.color === "yellow") {
    if (reasons[0]) message = reasons[0];
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
          className="font-ko"
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
              color: FR.muted,
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
              color: qty > 0 ? "#fff" : FR.pickleText,
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
