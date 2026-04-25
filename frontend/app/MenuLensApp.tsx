"use client";

import { useEffect, useState } from "react";
import { Onboarding } from "./components/Onboarding";
import { Upload } from "./components/Upload";
import { Results } from "./components/Results";
import { analyzeMenu } from "./lib/api";
import type { AnalyzeResponse, UserProfile } from "./types";

type Phase = "onboarding" | "upload" | "loading" | "results";

const PROFILE_KEY = "menulens.profile.v1";

const DEFAULT_PROFILE: UserProfile = {
  language: "en",
  allergies: [],
  religion: "",
  diet: "",
};

// Map navigator.language → our supported language keys.
function detectLanguage(): UserProfile["language"] {
  if (typeof navigator === "undefined") return "en";
  const raw = (navigator.language || "en").toLowerCase();
  if (raw.startsWith("ko")) return "ko";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("zh-tw") || raw.startsWith("zh-hk") || raw.startsWith("zh-hant"))
    return "zh-Hant";
  if (raw.startsWith("zh")) return "zh-Hans";
  return "en";
}

function loadProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile;
      // basic shape validation
      if (Array.isArray(parsed.allergies)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PROFILE, language: detectLanguage() };
}

export function MenuLensApp() {
  const [phase, setPhase] = useState<Phase>("onboarding");
  const [profile, setProfileState] = useState<UserProfile>(DEFAULT_PROFILE);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  // Hydrate profile after mount (avoid SSR hydration mismatch).
  useEffect(() => {
    setProfileState(loadProfile());
  }, []);

  const setProfile = (p: UserProfile) => {
    setProfileState(p);
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch {
      /* ignore quota errors */
    }
  };

  const handleAnalyze = async (file: File) => {
    setPhase("loading");
    try {
      const r = await analyzeMenu(file, profile);
      setResult(r);
      setPhase("results");
    } catch (e) {
      setPhase("upload");
      throw e;
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {phase === "onboarding" && (
        <Onboarding
          profile={profile}
          setProfile={setProfile}
          onNext={() => setPhase("upload")}
        />
      )}
      {phase === "upload" && (
        <Upload onAnalyze={handleAnalyze} onBack={() => setPhase("onboarding")} />
      )}
      {phase === "loading" && (
        <div className="flex flex-col items-center justify-center min-h-screen gap-3 p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-50" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Reading the menu… may take up to 10 s
          </p>
        </div>
      )}
      {phase === "results" && result && (
        <Results data={result} onReset={() => setPhase("upload")} />
      )}
    </main>
  );
}
