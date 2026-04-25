"use client";

import { useState } from "react";
import { ALLERGEN_OPTIONS, UserProfile } from "../types";

interface Props {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  onNext: () => void;
  onSample: () => void;
  sampleBusy: boolean;
  sampleError: string | null;
  onSkip: () => void;
}

export function Onboarding({
  profile,
  setProfile,
  onNext,
  onSample,
  sampleBusy,
  sampleError,
  onSkip,
}: Props) {
  const [showCustomize, setShowCustomize] = useState(
    profile.allergies.length > 0 || profile.diet !== "" || profile.religion !== ""
  );
  const customized =
    profile.allergies.length > 0 || profile.diet !== "" || profile.religion !== "";

  const toggleAllergen = (key: string) => {
    const has = profile.allergies.includes(key);
    setProfile({
      ...profile,
      allergies: has
        ? profile.allergies.filter((a) => a !== key)
        : [...profile.allergies, key],
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      {/* Hero */}
      <header className="pt-2">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 ml-1">
            MenuLens
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-zinc-900 dark:text-zinc-50">
          Don&apos;t read the menu.
          <br />
          <span className="text-emerald-600 dark:text-emerald-400">
            Just order what&apos;s green.
          </span>
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Snap a Korean menu, see <span className="whitespace-nowrap">🟢🟡🔴</span> per dish.
          Allergens, halal/vegan, and price benchmark in one tap.
        </p>
      </header>

      {/* Primary CTA: instant sample (highest-ROI for evaluators / first-time visitors) */}
      <button
        type="button"
        onClick={onSample}
        disabled={sampleBusy}
        className="group relative w-full overflow-hidden rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-700/70 disabled:cursor-wait text-white font-semibold py-4 px-5 text-left transition-colors active:scale-[0.99]"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-base flex items-center gap-2">
              {sampleBusy && (
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              )}
              {sampleBusy ? "Analyzing sample menu…" : "▶ Try a sample menu"}
            </span>
            <span className="text-xs font-normal text-emerald-50/90">
              {sampleBusy
                ? "First request wakes the backend (~30s)…"
                : "Yui · Pescatarian · synthetic 6-item menu"}
            </span>
          </span>
          {!sampleBusy && (
            <span className="opacity-70 group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          )}
        </span>
      </button>
      {sampleError && (
        <div
          role="alert"
          className="-mt-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 rounded-lg p-3 text-sm"
        >
          {sampleError}
        </div>
      )}

      {/* Secondary path: take own photo */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="rounded-xl border border-zinc-300 dark:border-zinc-700 py-3 px-4 text-sm font-medium text-zinc-800 dark:text-zinc-200 active:scale-[0.99] transition-transform"
        >
          📷 Snap my own
          <span className="block text-[11px] font-normal text-zinc-500 dark:text-zinc-400 mt-0.5">
            No setup
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowCustomize((v) => !v)}
          className={`rounded-xl border py-3 px-4 text-sm font-medium active:scale-[0.99] transition-transform ${
            customized
              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200"
              : "border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
          }`}
          aria-expanded={showCustomize}
        >
          ⚙ Personalize
          <span className="block text-[11px] font-normal text-zinc-500 dark:text-zinc-400 mt-0.5">
            {customized
              ? `${profile.allergies.length + (profile.diet ? 1 : 0) + (profile.religion ? 1 : 0)} active`
              : "Allergies / diet"}
          </span>
        </button>
      </div>

      {/* Collapsible profile form (was the entire onboarding page before) */}
      {showCustomize && (
        <div className="flex flex-col gap-5 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/60 dark:bg-zinc-900/40">
          <section>
            <label className="block text-sm font-medium mb-2">Language</label>
            <select
              className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900"
              value={profile.language}
              onChange={(e) =>
                setProfile({ ...profile, language: e.target.value as UserProfile["language"] })
              }
            >
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="zh-Hans">中文 (简)</option>
              <option value="zh-Hant">中文 (繁)</option>
              <option value="ko">한국어</option>
            </select>
          </section>

          <section>
            <label className="block text-sm font-medium mb-2">Religion / Diet</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900"
                value={profile.religion}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    religion: e.target.value as UserProfile["religion"],
                  })
                }
              >
                <option value="">Religion: none</option>
                <option value="halal">Halal</option>
                <option value="kosher">Kosher (info only)</option>
              </select>
              <select
                className="border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 bg-white dark:bg-zinc-900"
                value={profile.diet}
                onChange={(e) =>
                  setProfile({ ...profile, diet: e.target.value as UserProfile["diet"] })
                }
              >
                <option value="">Diet: none</option>
                <option value="vegan">Vegan</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="pescatarian">Pescatarian</option>
              </select>
            </div>
          </section>

          <section>
            <label className="block text-sm font-medium mb-2">
              Allergies (tap to toggle)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALLERGEN_OPTIONS.map((a) => {
                const on = profile.allergies.includes(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => toggleAllergen(a.key)}
                    className={`text-left rounded-lg px-3 py-2 border transition-colors ${
                      on
                        ? "border-red-500 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-200"
                        : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </section>

          <button
            type="button"
            onClick={onNext}
            className="w-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-semibold rounded-lg py-3 active:scale-[0.99] transition-transform"
          >
            Save preferences & continue →
          </button>
        </div>
      )}

      <p className="text-[11px] text-zinc-400 text-center">
        2026 한국관광공사 관광데이터 활용 공모전 · 도구 시연용 PoC
      </p>
    </div>
  );
}
