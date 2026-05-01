"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CartItem } from "../types";
import { fetchFx, fetchTTS, type FxResult } from "../lib/api";

interface Props {
  cart: CartItem[];
  language: string;
  onChangeQty: (name: string, delta: number) => void;
  onClear: () => void;
  onBack: () => void;
  onReview?: () => void;
}

type DiningMode = "dine_in" | "takeout";

/** Build the Korean order phrase, with dine-in / takeout suffix. */
function buildKoreanPhrase(cart: CartItem[], mode: DiningMode): string {
  if (cart.length === 0) return "";
  const parts = cart.map((c) => `${c.name} ${c.qty}개`);
  if (mode === "takeout") return parts.join(", ") + " 포장해 주세요.";
  return parts.join(", ") + " 주세요. 여기서 먹을게요.";
}

/** Friendly English label for the staff hand-off card. */
function buildEnglishLabel(cart: CartItem[], mode: DiningMode): string {
  if (cart.length === 0) return "";
  const parts = cart.map((c) => `${c.translated || c.name} × ${c.qty}`);
  const suffix = mode === "takeout" ? "  ·  To go" : "  ·  Dine in";
  return parts.join(",  ") + suffix;
}

export function OrderSheet({ cart, language, onChangeQty, onClear, onBack, onReview }: Props) {
  const [mode, setMode] = useState<DiningMode>("dine_in");
  const phraseKo = useMemo(() => buildKoreanPhrase(cart, mode), [cart, mode]);
  const phraseEn = useMemo(() => buildEnglishLabel(cart, mode), [cart, mode]);
  const total = useMemo(
    () =>
      cart.reduce(
        (sum, c) => sum + (typeof c.listed_price === "number" ? c.listed_price * c.qty : 0),
        0
      ),
    [cart]
  );
  const totalCount = useMemo(() => cart.reduce((s, c) => s + c.qty, 0), [cart]);

  // FX conversion to user's home currency
  const [fx, setFx] = useState<FxResult | null>(null);
  useEffect(() => {
    if (total <= 0 || language === "ko") {
      setFx(null);
      return;
    }
    let cancelled = false;
    fetchFx(total, language).then((r) => {
      if (!cancelled) setFx(r);
    });
    return () => {
      cancelled = true;
    };
  }, [total, language]);

  // TTS state
  const [audioB64, setAudioB64] = useState<string | null>(null);
  const [audioMime, setAudioMime] = useState<string>("audio/wav");
  const [ttsState, setTtsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-fetch TTS when cart phrase changes (debounced).
  useEffect(() => {
    setAudioB64(null);
    setTtsState("idle");
    setPlaying(false);
    if (!phraseKo) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setTtsState("loading");
      try {
        const r = await fetchTTS(phraseKo, "ko");
        if (cancelled) return;
        setAudioB64(r.audio_b64);
        setAudioMime(r.audio_mime);
        setTtsState("ready");
      } catch (e) {
        if (cancelled) return;
        setTtsError((e as Error).message || "TTS failed");
        setTtsState("error");
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [phraseKo]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
      return;
    }
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const audioSrc = audioB64 ? `data:${audioMime};base64,${audioB64}` : null;

  if (cart.length === 0) {
    return (
      <div className="flex flex-col gap-4 max-w-md mx-auto p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Your order</h1>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300"
          >
            ← Menu
          </button>
        </div>
        <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 text-center text-zinc-600 dark:text-zinc-400">
          <div className="text-4xl mb-2">🛒</div>
          <div className="font-semibold">Cart is empty</div>
          <div className="text-sm mt-1">Tap the + on a menu item to add it.</div>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 inline-flex bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-semibold rounded-lg px-4 py-2"
          >
            Browse menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto p-4 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Your order</h1>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300"
        >
          ← Menu
        </button>
      </div>

      {/* Dine-in / Takeout toggle (Toss segment-control style) */}
      <div role="tablist" aria-label="Dining mode" className="flex bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5 self-stretch">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "dine_in"}
          onClick={() => setMode("dine_in")}
          className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${
            mode === "dine_in"
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
              : "text-zinc-500"
          }`}
        >
          🍽 Dine in · 매장
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "takeout"}
          onClick={() => setMode("takeout")}
          className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${
            mode === "takeout"
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
              : "text-zinc-500"
          }`}
        >
          🥡 Takeout · 포장
        </button>
      </div>

      {/* Hero hand-off card — what the user shows the staff */}
      <section className="rounded-2xl border-2 border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-950 p-4 flex flex-col gap-3">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">
          Show this to the staff · 직원에게 보여주세요
        </div>
        <p className="text-xl font-bold leading-snug text-zinc-900 dark:text-zinc-50 break-keep">
          {phraseKo}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed break-keep">
          {phraseEn}
        </p>

        <div className="flex items-center gap-2">
          {ttsState === "error" ? (
            <div className="flex-1 inline-flex flex-col items-center justify-center gap-1 rounded-xl py-3 px-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-center">
              <span className="text-sm font-semibold">📋 Show this screen to the staff</span>
              <span className="text-[11px] text-zinc-500">
                (Audio temporarily unavailable — the text above works on its own)
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={togglePlay}
              disabled={ttsState !== "ready"}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold transition-colors ${
                playing
                  ? "bg-emerald-600 text-white"
                  : ttsState === "ready"
                  ? "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
              }`}
            >
              {ttsState === "loading" && (
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              )}
              <span>
                {ttsState === "loading"
                  ? "Preparing audio…"
                  : playing
                  ? "■ Stop"
                  : "▶ Speak in Korean"}
              </span>
            </button>
          )}
        </div>
        {audioSrc && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio
            ref={audioRef}
            src={audioSrc}
            preload="auto"
            onEnded={() => setPlaying(false)}
            onError={() => setPlaying(false)}
          />
        )}
      </section>

      {/* Editable line items */}
      <ul className="flex flex-col gap-2">
        {cart.map((c) => (
          <li
            key={c.name}
            className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                {c.translated || c.name}
              </div>
              <div className="text-xs text-zinc-500">
                {c.name}
                {c.romanization && <> · <em>{c.romanization}</em></>}
                {typeof c.listed_price === "number" && c.listed_price > 0 && (
                  <> · ₩{(c.listed_price * c.qty).toLocaleString()}</>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onChangeQty(c.name, -1)}
                className="h-8 w-8 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold flex items-center justify-center"
                aria-label={`Decrease ${c.name}`}
              >
                −
              </button>
              <span className="w-6 text-center font-semibold tabular-nums">{c.qty}</span>
              <button
                type="button"
                onClick={() => onChangeQty(c.name, 1)}
                className="h-8 w-8 rounded-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-bold flex items-center justify-center"
                aria-label={`Increase ${c.name}`}
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Sticky summary footer */}
      <div className="fixed bottom-0 inset-x-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-500">{totalCount} items · {mode === "takeout" ? "Takeout" : "Dine in"}</div>
            <div className="text-lg font-bold">
              {total > 0 ? `₩${total.toLocaleString()}` : "—"}
            </div>
            {fx && total > 0 && (
              <div className="text-xs text-zinc-500">
                ≈ {fx.symbol}{fx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {fx.ccy}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClear}
              className="px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={togglePlay}
              disabled={ttsState !== "ready"}
              className="bg-emerald-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white font-semibold rounded-xl px-4 py-2"
            >
              {playing ? "■" : "▶"} Speak
            </button>
          </div>
        </div>
        {onReview && (
          <div className="max-w-md mx-auto mt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onReview}
              className="flex-1 text-sm font-medium text-zinc-600 dark:text-zinc-400 underline-offset-2 hover:underline text-left"
            >
              I&apos;ve eaten this — Review &amp; spin a prize 🎰
            </button>
            <a
              href="/reviews"
              className="text-xs text-zinc-500 underline underline-offset-2"
            >
              See all reviews →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
