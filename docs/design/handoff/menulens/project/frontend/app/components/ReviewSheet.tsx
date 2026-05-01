"use client";

import { useEffect, useState } from "react";
import { submitReview } from "../lib/api";
import type { CartItem, ReviewOut, RewardResult } from "../types";

interface Props {
  cart: CartItem[];
  language: string;
  onDone: () => void;
  onBack: () => void;
}

type ItemReview = {
  rating: number;          // 0 = not yet rated
  comment: string;
};

type Phase = "form" | "submitting" | "spin" | "reward" | "done";

const RARITY_BG: Record<RewardResult["rarity"], string> = {
  common: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  rare: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  jackpot: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200",
};

export function ReviewSheet({ cart, language, onDone, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>("form");
  const [reviewByName, setReviewByName] = useState<Record<string, ItemReview>>(
    () =>
      Object.fromEntries(
        cart.map((c) => [c.name, { rating: 0, comment: "" } as ItemReview])
      )
  );
  const [error, setError] = useState<string | null>(null);
  const [rewards, setRewards] = useState<RewardResult[]>([]);
  const [submittedReviews, setSubmittedReviews] = useState<ReviewOut[]>([]);
  const [spinIndex, setSpinIndex] = useState<number>(0); // animation tick

  const hasAnyRating = Object.values(reviewByName).some((r) => r.rating > 0);

  const setRating = (name: string, rating: number) =>
    setReviewByName((prev) => ({
      ...prev,
      [name]: { ...(prev[name] ?? { rating: 0, comment: "" }), rating },
    }));
  const setComment = (name: string, comment: string) =>
    setReviewByName((prev) => ({
      ...prev,
      [name]: { ...(prev[name] ?? { rating: 0, comment: "" }), comment },
    }));

  const handleSubmit = async () => {
    if (!hasAnyRating) {
      setError("별점을 1개 이상 매겨주세요. (Rate at least one dish)");
      return;
    }
    setError(null);
    setPhase("submitting");
    try {
      const results = await Promise.all(
        cart
          .filter((c) => (reviewByName[c.name]?.rating ?? 0) > 0)
          .map((c) =>
            submitReview({
              dish_name: c.name,
              dish_name_en: c.translated ?? null,
              rating: reviewByName[c.name].rating,
              comment: reviewByName[c.name].comment || null,
              language,
              visit_kind: "unknown",
              tags: [],
            })
          )
      );
      setRewards(results.map((r) => r.reward));
      setSubmittedReviews(results.map((r) => r.review));
      setPhase("spin");
    } catch (e) {
      setError((e as Error).message || "Failed to submit reviews");
      setPhase("form");
    }
  };

  // Spin animation: cycle every 80ms for 1.6s, then settle
  useEffect(() => {
    if (phase !== "spin") return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const elapsed = t - start;
      setSpinIndex(Math.floor(elapsed / 80));
      if (elapsed < 1600) {
        raf = requestAnimationFrame(tick);
      } else {
        setPhase("reward");
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tell us how it was</h1>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300"
        >
          ← Order
        </button>
      </div>

      {phase === "form" && (
        <>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Your review helps Korean restaurants serve foreign visitors better — and you get
            an instant prize 🎁 (limited time offers, since you&apos;re only in Korea for a few days).
          </p>

          <ul className="flex flex-col gap-3">
            {cart.map((c) => {
              const r = reviewByName[c.name] ?? { rating: 0, comment: "" };
              return (
                <li
                  key={c.name}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex flex-col gap-2"
                >
                  <div>
                    <div className="font-semibold">{c.translated || c.name}</div>
                    <div className="text-xs text-zinc-500">{c.name}</div>
                  </div>
                  <div className="flex gap-1" role="radiogroup" aria-label={`Rate ${c.name}`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={r.rating === n}
                        onClick={() => setRating(c.name, n)}
                        className={`text-2xl leading-none w-9 h-9 flex items-center justify-center transition-colors ${
                          r.rating >= n
                            ? "text-amber-500"
                            : "text-zinc-300 dark:text-zinc-700"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={r.comment}
                    onChange={(e) => setComment(c.name, e.target.value)}
                    placeholder="One line about how it tasted… (optional)"
                    rows={2}
                    className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2"
                  />
                </li>
              );
            })}
          </ul>

          {error && (
            <div className="text-sm text-red-700 dark:text-red-300">⚠ {error}</div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-semibold rounded-xl py-3 active:scale-[0.99]"
          >
            Submit & Spin 🎰
          </button>

          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Reviews are stored anonymously and used by Korea Tourism &amp; Korean Food
            Promotion Institute to improve foreigner-friendly menus. No personal data.
          </p>
        </>
      )}

      {phase === "submitting" && (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-50" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Saving your review…</p>
        </div>
      )}

      {phase === "spin" && (
        <div className="flex flex-col items-center justify-center gap-4 py-10">
          <div className="text-4xl font-bold animate-pulse">🎰</div>
          <div className="text-3xl font-bold tabular-nums">
            {/* slot-machine ticker */}
            {(() => {
              const labels = rewards.map((r) => r.label);
              if (labels.length === 0) return "...";
              return labels[spinIndex % labels.length];
            })()}
          </div>
          <p className="text-sm text-zinc-500">Spinning your reward…</p>
        </div>
      )}

      {phase === "reward" && (
        <div className="flex flex-col gap-3 py-6">
          <h2 className="text-xl font-bold text-center">🎁 Your prize!</h2>
          <ul className="flex flex-col gap-2">
            {rewards.map((r, i) => (
              <li
                key={i}
                className={`rounded-xl border-2 ${
                  r.won ? "border-zinc-900 dark:border-zinc-50" : "border-zinc-300 dark:border-zinc-700"
                } p-3 flex items-center justify-between gap-2`}
              >
                <div>
                  <div className="font-bold">{r.label}</div>
                  <div className="text-xs text-zinc-500">{r.description}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    {r.label_ko}
                  </div>
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-1 rounded-full ${RARITY_BG[r.rarity]}`}
                >
                  {r.rarity}
                </span>
              </li>
            ))}
          </ul>
          {/* Threads-ready preview cards */}
          {submittedReviews.some((r) => !!r.threads_text) && (
            <section className="mt-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">📣 Shared as anonymized post</h3>
                <span className="text-[10px] text-zinc-500">
                  Visible at /reviews · Threads (Phase 2)
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {submittedReviews
                  .filter((r) => r.threads_text)
                  .map((r) => (
                    <li
                      key={r.id || r.dish_name}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-zinc-500">@menulens · 방금</div>
                        <span
                          className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                            r.threads_status === "posted"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200"
                              : r.threads_status === "skipped"
                              ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                              : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200"
                          }`}
                        >
                          {r.threads_status === "posted"
                            ? "Posted"
                            : r.threads_status === "skipped"
                            ? "Preview only"
                            : r.threads_status}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-zinc-900 dark:text-zinc-50 break-keep">
                        {r.threads_text}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {r.aspects?.slice(0, 4).map((a) => (
                          <span
                            key={a}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          >
                            {a}
                          </span>
                        ))}
                        {r.themes?.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
              </ul>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Your review is published anonymously to MenuLens Threads — Korean diners can
                react and leave tips. Phase 2 will surface those replies back to you.
              </p>
            </section>
          )}

          <button
            type="button"
            onClick={onDone}
            className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-semibold rounded-xl py-3 mt-2"
          >
            Done
          </button>
          <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
            Show this screen at a partner restaurant to claim. Rewards expire when you leave Korea.
          </p>
        </div>
      )}
    </div>
  );
}
