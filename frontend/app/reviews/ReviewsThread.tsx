"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchRecentReviews } from "../lib/api";
import type { ReviewOut } from "../types";

const SENTIMENT_BG: Record<string, string> = {
  positive: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200",
  mixed: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200",
  negative: "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200",
  neutral: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
};

const LANG_LABELS: Record<string, string> = {
  ko: "한국어",
  en: "EN",
  ja: "日本語",
  "zh-Hans": "简",
  "zh-Hant": "繁",
};

type LangView = "auto" | "ko" | "en" | "ja" | "zh-Hans";

export function ReviewsThread() {
  const [reviews, setReviews] = useState<ReviewOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "recommend" | "positive" | "mixed" | "negative">(
    "all"
  );
  const [langView, setLangView] = useState<LangView>("auto");

  useEffect(() => {
    let cancelled = false;
    fetchRecentReviews(50)
      .then((rs) => {
        if (cancelled) return;
        setReviews(rs);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return reviews;
    if (filter === "recommend") return reviews.filter((r) => r.recommend);
    return reviews.filter((r) => r.sentiment === filter);
  }, [reviews, filter]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg =
      total === 0
        ? 0
        : reviews.reduce((s, r) => s + r.rating, 0) / total;
    const recommend = reviews.filter((r) => r.recommend).length;
    const aspectCounts = new Map<string, number>();
    for (const r of reviews) {
      for (const a of r.aspects ?? []) {
        aspectCounts.set(a, (aspectCounts.get(a) ?? 0) + 1);
      }
    }
    const topAspects = [...aspectCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { total, avg, recommend, topAspects };
  }, [reviews]);

  const showTextFor = (r: ReviewOut): string => {
    const map: Record<LangView, string | null | undefined> = {
      auto: r.threads_text || r.comment_ko || r.comment,
      ko: r.threads_text || r.comment_ko,
      en: r.comment_en,
      ja: r.comment_ja,
      "zh-Hans": r.comment_zh,
    };
    return (map[langView] || r.comment_ko || r.comment || "").trim();
  };

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <div className="max-w-md mx-auto p-4 flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">📣 Reviews</h1>
          <a
            href="/"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300"
          >
            ← Back
          </a>
        </header>

        {/* Stats banner */}
        <section className="grid grid-cols-3 gap-2">
          <Stat label="Total" value={stats.total.toString()} />
          <Stat label="Avg ★" value={stats.avg ? stats.avg.toFixed(1) : "—"} />
          <Stat
            label="Recommend"
            value={stats.total ? `${Math.round((stats.recommend / stats.total) * 100)}%` : "—"}
          />
        </section>

        {stats.topAspects.length > 0 && (
          <section className="flex flex-wrap gap-1 items-center">
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">
              Top aspects
            </span>
            {stats.topAspects.map(([a, n]) => (
              <span
                key={a}
                className="text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
              >
                {a} · {n}
              </span>
            ))}
          </section>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <SegmentBar
            options={[
              { v: "all", label: "All" },
              { v: "recommend", label: "👍 Recommend" },
              { v: "positive", label: "🙂" },
              { v: "mixed", label: "😐" },
              { v: "negative", label: "🙁" },
            ]}
            value={filter}
            onChange={(v) => setFilter(v as typeof filter)}
          />
          <SegmentBar
            options={[
              { v: "auto", label: "Auto" },
              { v: "ko", label: "한" },
              { v: "en", label: "EN" },
              { v: "ja", label: "日" },
              { v: "zh-Hans", label: "中" },
            ]}
            value={langView}
            onChange={(v) => setLangView(v as LangView)}
          />
        </div>

        {/* List */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <div className="animate-spin rounded-full h-3 w-3 border border-zinc-400 border-t-transparent" />
            Loading reviews…
          </div>
        )}
        {error && <div className="text-sm text-red-700 dark:text-red-300">⚠ {error}</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-sm text-zinc-500 text-center py-8">
            No reviews yet. Be the first one — go scan a menu and order!
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {filtered.map((r) => {
            const text = showTextFor(r);
            return (
              <li
                key={r.id || `${r.dish_name}-${r.created_at}`}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    {r.dish_name_en || r.dish_name}{" "}
                    <span className="text-xs text-zinc-500 font-normal">{r.dish_name}</span>
                  </div>
                  <div className="text-amber-500" aria-label={`${r.rating} stars`}>
                    {"★".repeat(r.rating)}
                    <span className="text-zinc-300 dark:text-zinc-700">
                      {"★".repeat(5 - r.rating)}
                    </span>
                  </div>
                </div>

                {text && (
                  <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 break-keep">
                    {text}
                  </p>
                )}

                <div className="flex flex-wrap gap-1 items-center">
                  <span
                    className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full font-medium ${
                      SENTIMENT_BG[r.sentiment ?? "neutral"]
                    }`}
                  >
                    {r.sentiment ?? "neutral"}
                  </span>
                  {r.aspects?.map((a) => (
                    <span
                      key={a}
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    >
                      {a}
                    </span>
                  ))}
                  {r.themes?.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>
                    {r.visitor_country ? `${countryFlag(r.visitor_country)} ` : "🌏 "}
                    {LANG_LABELS[r.language] ?? r.language} · {r.visit_kind}
                  </span>
                  <span>{shortDate(r.created_at)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-2.5 text-center">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-medium">
        {label}
      </div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}

function SegmentBar({
  options,
  value,
  onChange,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
            value === o.v
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
              : "text-zinc-500"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function countryFlag(iso: string): string {
  if (!iso || iso.length !== 2) return "🌏";
  const A = 0x1f1e6;
  return (
    String.fromCodePoint(A + (iso.toUpperCase().charCodeAt(0) - 65)) +
    String.fromCodePoint(A + (iso.toUpperCase().charCodeAt(1) - 65))
  );
}

function shortDate(s: string): string {
  if (!s) return "";
  try {
    const d = new Date(s);
    return d.toLocaleDateString();
  } catch {
    return s.slice(0, 10);
  }
}
