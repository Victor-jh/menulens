"use client";

import { useRef, useState } from "react";
import type { AnalyzeResponse, AnalyzedItem, Color } from "../types";

// Color + shape + text — triple-encode severity for colorblind users (WCAG 1.4.1).
const COLOR_BG: Record<Color, string> = {
  "🟢": "bg-emerald-50 dark:bg-emerald-950 border-emerald-400 dark:border-emerald-700",
  "🟡": "bg-amber-50 dark:bg-amber-950 border-amber-400 dark:border-amber-700",
  "🔴": "bg-red-50 dark:bg-red-950 border-red-400 dark:border-red-700",
  "⚪": "bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700",
};

const COLOR_LABEL: Record<Color, string> = {
  "🟢": "Safe",
  "🟡": "Caution",
  "🔴": "Avoid",
  "⚪": "Unknown",
};

// Icon as redundant signal alongside color (protanopia/deuteranopia distinguish shape, not hue).
const COLOR_ICON: Record<Color, string> = {
  "🟢": "✓",
  "🟡": "!",
  "🔴": "✕",
  "⚪": "?",
};

const COLOR_BADGE: Record<Color, string> = {
  "🟢": "bg-emerald-600 text-white",
  "🟡": "bg-amber-500 text-white",
  "🔴": "bg-red-600 text-white",
  "⚪": "bg-zinc-500 text-white",
};

interface Props {
  data: AnalyzeResponse;
  onReset: () => void;
}

type SortMode = "severity" | "menu";

export function Results({ data, onReset }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("severity");

  const items =
    sortMode === "severity"
      ? [...data.items].sort((a, b) => severity(b.color) - severity(a.color))
      : data.items;

  return (
    <div className="flex flex-col gap-3 max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Results</h1>
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50 rounded-md px-2 py-1"
        >
          ↻ Re-shoot
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
        <div className="flex gap-2">
          <span>OCR {Math.round(data.ocr_quality * 100)}%</span>
          <span>·</span>
          <span>{data.processing_time_seconds.toFixed(1)}s</span>
          <span>·</span>
          <span>{data.items.length} items</span>
        </div>
        <div
          role="tablist"
          aria-label="Sort menu items"
          className="flex bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5"
        >
          <SortTab active={sortMode === "severity"} onClick={() => setSortMode("severity")}>
            Safety
          </SortTab>
          <SortTab active={sortMode === "menu"} onClick={() => setSortMode("menu")}>
            Menu order
          </SortTab>
        </div>
      </div>

      {data.warnings.length > 0 && (
        <div
          role="status"
          className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-lg p-2 text-xs"
        >
          {data.warnings.join(" · ")}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <ItemCard key={`${item.name}-${i}`} item={item} />
        ))}
      </ul>

      {/* Legend for first-time users */}
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-500 dark:text-zinc-500">
        <LegendChip color="🟢" /> <LegendChip color="🟡" /> <LegendChip color="🔴" /> <LegendChip color="⚪" />
      </div>
    </div>
  );
}

function SortTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
          : "text-zinc-500"
      }`}
    >
      {children}
    </button>
  );
}

function LegendChip({ color }: { color: Color }) {
  return (
    <span className="inline-flex items-center gap-1">
      <SeverityBadge color={color} />
      {COLOR_LABEL[color]}
    </span>
  );
}

function SeverityBadge({ color }: { color: Color }) {
  // Ensures severity is always communicated by icon + text + color.
  return (
    <span
      aria-label={COLOR_LABEL[color]}
      title={COLOR_LABEL[color]}
      className={`inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full font-bold text-xs ${COLOR_BADGE[color]}`}
    >
      <span aria-hidden="true" className="mr-0.5">{COLOR_ICON[color]}</span>
      <span className="uppercase tracking-wide">{COLOR_LABEL[color]}</span>
    </span>
  );
}

function severity(c: Color): number {
  return c === "🔴" ? 3 : c === "🟡" ? 2 : c === "🟢" ? 1 : 0;
}

function ItemCard({ item }: { item: AnalyzedItem }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioState, setAudioState] = useState<"idle" | "playing" | "error">("idle");

  const audioSrc = item.tts_audio_b64
    ? `data:${item.tts_audio_mime || "audio/wav"};base64,${item.tts_audio_b64}`
    : null;

  const toggleAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    if (audioState === "playing") {
      el.pause();
      el.currentTime = 0;
      setAudioState("idle");
      return;
    }
    el.play().then(() => setAudioState("playing")).catch(() => setAudioState("error"));
  };

  // Derive visible details from dish_profile (audit P0: surface ingredients for Marco-like users).
  const ingredients = item.dish_profile?.ingredients ?? [];
  const allergens = item.dish_profile?.allergens ?? [];

  return (
    <li className={`border-2 rounded-xl p-3 flex flex-col gap-2 ${COLOR_BG[item.color]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge color={item.color} />
            <span className="font-semibold text-base truncate">
              {item.translated || item.name}
            </span>
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            <span>{item.name}</span>
            {item.romanization && <> · <em>{item.romanization}</em></>}
            {item.listed_price != null && <> · ₩{item.listed_price.toLocaleString()}</>}
          </div>
        </div>
        {audioSrc && item.order_phrase && (
          <button
            type="button"
            onClick={toggleAudio}
            className={`shrink-0 rounded-full h-11 w-11 flex items-center justify-center text-base font-bold active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50 transition-colors ${
              audioState === "playing"
                ? "bg-emerald-600 text-white"
                : audioState === "error"
                ? "bg-red-600 text-white"
                : "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
            }`}
            title={item.order_phrase}
            aria-label={
              audioState === "playing"
                ? `Stop: ${item.order_phrase}`
                : `Play order: ${item.order_phrase}`
            }
          >
            {audioState === "playing" ? "■" : audioState === "error" ? "!" : "▶"}
          </button>
        )}
      </div>

      {audioSrc && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="auto"
          onEnded={() => setAudioState("idle")}
          onError={() => setAudioState("error")}
        />
      )}

      {item.reasons.length > 0 && (
        <ul className="text-sm space-y-0.5">
          {item.reasons.map((r, i) => (
            <li key={i} className="text-zinc-700 dark:text-zinc-300">• {r}</li>
          ))}
        </ul>
      )}

      {(ingredients.length > 0 || allergens.length > 0) && (
        <div className="flex flex-col gap-1 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
          {ingredients.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[10px] uppercase tracking-wide text-zinc-500 mr-1">
                Ingredients
              </span>
              {ingredients.slice(0, 8).map((ing) => (
                <span
                  key={ing}
                  className="text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                >
                  {ing}
                </span>
              ))}
              {ingredients.length > 8 && (
                <span className="text-[11px] text-zinc-500">+{ingredients.length - 8}</span>
              )}
            </div>
          )}
          {allergens.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[10px] uppercase tracking-wide text-zinc-500 mr-1">
                Allergens
              </span>
              {allergens.map((a) => (
                <span
                  key={a}
                  className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 font-medium"
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
