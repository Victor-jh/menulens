"use client";

import { ALLERGEN_OPTIONS, UserProfile } from "../types";

interface Props {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  onNext: () => void;
}

export function Onboarding({ profile, setProfile, onNext }: Props) {
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
    <div className="flex flex-col gap-6 max-w-md mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          MenuLens
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Tell us about you (one time only)
        </p>
      </div>

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
              setProfile({ ...profile, religion: e.target.value as UserProfile["religion"] })
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
          </select>
        </div>
      </section>

      <section>
        <label className="block text-sm font-medium mb-2">Allergies (tap to toggle)</label>
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
        className="w-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-semibold rounded-lg py-3 mt-2 active:scale-[0.99] transition-transform"
      >
        Continue →
      </button>
    </div>
  );
}
