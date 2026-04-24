"use client";

import { useState } from "react";
import { Onboarding } from "./components/Onboarding";
import { Upload } from "./components/Upload";
import { Results } from "./components/Results";
import { analyzeMenu } from "./lib/api";
import type { AnalyzeResponse, UserProfile } from "./types";

type Phase = "onboarding" | "upload" | "loading" | "results";

const DEFAULT_PROFILE: UserProfile = {
  language: "en",
  allergies: [],
  religion: "",
  diet: "",
};

export function MenuLensApp() {
  const [phase, setPhase] = useState<Phase>("onboarding");
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const handleAnalyze = async (file: File) => {
    setPhase("loading");
    try {
      const r = await analyzeMenu(file, profile);
      setResult(r);
      setPhase("results");
    } catch (e) {
      // Upload component already shows the error and stays put
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
        <Upload
          onAnalyze={handleAnalyze}
          onBack={() => setPhase("onboarding")}
        />
      )}
      {phase === "loading" && (
        <div className="flex flex-col items-center justify-center min-h-screen gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-50" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Reading menu… (3-5s)</p>
        </div>
      )}
      {phase === "results" && result && (
        <Results data={result} onReset={() => setPhase("upload")} />
      )}
    </main>
  );
}
