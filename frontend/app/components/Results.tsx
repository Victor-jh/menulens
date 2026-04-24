"use client";

import { useRef } from "react";
import type { AnalyzeResponse, AnalyzedItem, Color } from "../types";

const COLOR_BG: Record<Color, string> = {
  "🟢": "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800",
  "🟡": "bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800",
  "🔴": "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800",
  "⚪": "bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700",
};

const COLOR_LABEL: Record<Color, string> = {
  "🟢": "Safe",
  "🟡": "Caution",
  "🔴": "Avoid",
  "⚪": "Unknown",
};

interface Props {
  data: AnalyzeResponse;
  onReset: () => void;
}

export function Results({ data, onReset }: Props) {
  const sorted = [...data.items].sort((a, b) => severity(b.color) - severity(a.color));
  return (
    <div className="flex flex-col gap-3 max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Results</h1>
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          ↻ Re-shoot
        </button>
      </div>

      <div className="text-xs text-zinc-500 flex gap-3">
        <span>OCR {Math.round(data.ocr_quality * 100)}%</span>
        <span>·</span>
        <span>{data.processing_time_seconds.toFixed(1)}s</span>
        <span>·</span>
        <span>{data.items.length} items</span>
      </div>

      {data.warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-lg p-2 text-xs">
          {data.warnings.join(" · ")}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {sorted.map((item, i) => (
          <ItemCard key={`${item.name}-${i}`} item={item} />
        ))}
      </ul>
    </div>
  );
}

function severity(c: Color): number {
  return c === "🔴" ? 3 : c === "🟡" ? 2 : c === "🟢" ? 1 : 0;
}

function ItemCard({ item }: { item: AnalyzedItem }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const audioSrc = item.tts_audio_b64
    ? `data:${item.tts_audio_mime || "audio/wav"};base64,${item.tts_audio_b64}`
    : null;

  return (
    <li className={`border rounded-xl p-3 flex flex-col gap-2 ${COLOR_BG[item.color]}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl" aria-label={COLOR_LABEL[item.color]} title={COLOR_LABEL[item.color]}>
              {item.color}
            </span>
            <span className="font-semibold text-base truncate">
              {item.translated || item.name}
            </span>
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            {item.name}
            {item.romanization && <> · <em>{item.romanization}</em></>}
            {item.listed_price != null && <> · ₩{item.listed_price.toLocaleString()}</>}
          </div>
        </div>
        {audioSrc && item.order_phrase && (
          <button
            type="button"
            onClick={() => audioRef.current?.play()}
            className="shrink-0 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-full w-10 h-10 flex items-center justify-center text-lg active:scale-95"
            title={item.order_phrase}
            aria-label={`Play: ${item.order_phrase}`}
          >
            🔊
          </button>
        )}
      </div>

      {audioSrc && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio ref={audioRef} src={audioSrc} preload="none" />
      )}

      {item.reasons.length > 0 && (
        <ul className="text-sm space-y-0.5">
          {item.reasons.map((r, i) => (
            <li key={i} className="text-zinc-700 dark:text-zinc-300">• {r}</li>
          ))}
        </ul>
      )}

      {item.dish_profile?.allergens && item.dish_profile.allergens.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.dish_profile.allergens.map((a) => (
            <span
              key={a}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            >
              {a}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}
