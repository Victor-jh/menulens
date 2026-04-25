"use client";

import { useEffect, useRef, useState } from "react";
import { Onboarding } from "./components/Onboarding";
import { Upload } from "./components/Upload";
import { Results } from "./components/Results";
import { OrderSheet } from "./components/OrderSheet";
import { ReviewSheet } from "./components/ReviewSheet";
import { analyzeMenu, API_BASE_URL } from "./lib/api";
import type { AnalyzeResponse, AnalyzedItem, CartItem, UserProfile } from "./types";

// Yui — D8 사 시연 기준 페르소나 (Pescatarian 일본인). Sample 버튼이 사용.
const SAMPLE_PROFILE: UserProfile = {
  language: "en",
  allergies: [],
  religion: "",
  diet: "pescatarian",
};
const SAMPLE_IMAGE_URL = "/synthetic_menu.png";

async function loadSampleMenuFile(): Promise<File> {
  const resp = await fetch(SAMPLE_IMAGE_URL, { cache: "force-cache" });
  if (!resp.ok) throw new Error(`Sample menu fetch failed (${resp.status})`);
  const blob = await resp.blob();
  return new File([blob], "sample_menu.png", {
    type: blob.type || "image/png",
    lastModified: Date.now(),
  });
}

// Visible on-device diagnostics for iPhone testing (no Web Inspector needed).
// Toggle by appending ?debug=1 to the URL.
function DebugOverlay() {
  const [logs, setLogs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const mountTimeRef = useRef<number>(0);

  useEffect(() => {
    mountTimeRef.current = Date.now();
    setHydrated(true);
    setLogs((L) => [...L, `hydrated@${Date.now() - mountTimeRef.current}ms`]);

    const pushLog = (msg: string) =>
      setLogs((L) => [...L, `${new Date().toLocaleTimeString()} ${msg}`].slice(-10));

    const onErr = (e: ErrorEvent) => pushLog(`ERR: ${e.message}`);
    const onRej = (e: PromiseRejectionEvent) => pushLog(`REJ: ${String(e.reason).slice(0, 100)}`);
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const label = t?.closest("button")?.textContent?.trim().slice(0, 30) || t?.tagName || "?";
      pushLog(`CLICK ${label}`);
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        color: "#0f0",
        fontFamily: "monospace",
        fontSize: 11,
        padding: 6,
        maxHeight: 180,
        overflow: "auto",
      }}
    >
      <div>🩺 MenuLens Diag · hydrated={hydrated ? "✅" : "❌"} · logs:{logs.length}</div>
      {logs.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

type Phase = "onboarding" | "upload" | "results" | "order" | "review";

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
  const [analyzedFile, setAnalyzedFile] = useState<File | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const updateCart = (item: AnalyzedItem, delta: number) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.name === item.name);
      if (idx === -1) {
        if (delta <= 0) return prev;
        return [
          ...prev,
          {
            name: item.name,
            translated: item.translated,
            romanization: item.romanization,
            listed_price: item.listed_price,
            color: item.color as CartItem["color"],
            qty: delta,
          },
        ];
      }
      const next = [...prev];
      const newQty = next[idx].qty + delta;
      if (newQty <= 0) next.splice(idx, 1);
      else next[idx] = { ...next[idx], qty: newQty };
      return next;
    });
  };
  const clearCart = () => setCart([]);

  // Load persisted profile once after mount. If it races with a user tap,
  // we prefer the user's tap (see setProfile — uses functional update below).
  useEffect(() => {
    const loaded = loadProfile();
    setProfileState((current) => {
      // Keep any in-flight user changes that happened before this effect.
      if (current !== DEFAULT_PROFILE) return current;
      return loaded;
    });

    // Cold-start ping: Render free tier sleeps after 15min idle and takes
    // ~30s to wake. Fire a fire-and-forget /health on app load so the backend
    // is hot by the time the user taps "Analyze". Failures ignored.
    if (API_BASE_URL && !API_BASE_URL.includes("localhost")) {
      fetch(`${API_BASE_URL}/health`, { method: "GET", cache: "no-store" })
        .catch(() => {});
    }
  }, []);

  // Sample-menu shortcut: lets evaluators (and curious visitors) skip the
  // photo step and see the full pipeline with the synthetic Pescatarian fixture.
  const [sampleBusy, setSampleBusy] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const handleSample = async () => {
    if (sampleBusy) return;
    setSampleBusy(true);
    setSampleError(null);
    try {
      const file = await loadSampleMenuFile();
      setProfile(SAMPLE_PROFILE);
      setAnalyzedFile(file);
      const r = await analyzeMenu(file, SAMPLE_PROFILE, "auto");
      setResult(r);
      setPhase("results");
    } catch (e) {
      setSampleError((e as Error).message || "Sample analysis failed");
    } finally {
      setSampleBusy(false);
    }
  };

  const setProfile = (p: UserProfile) => {
    setProfileState(p);
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch {
      /* ignore quota errors */
    }
  };

  const handleAnalyze = async (file: File, mode: "auto" | "text" | "photo" = "auto") => {
    // Keep Upload mounted during the request so the user keeps seeing their photo
    // and any error reported in-place. The Upload component manages its own busy spinner.
    setAnalyzedFile(file);
    const r = await analyzeMenu(file, profile, mode);
    setResult(r);
    setPhase("results");
  };

  const debugOn =
    typeof window !== "undefined" && /[?&]debug=1\b/.test(window.location.search);

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {debugOn && <DebugOverlay />}
      {phase === "onboarding" && (
        <Onboarding
          profile={profile}
          setProfile={setProfile}
          onNext={() => setPhase("upload")}
          onSample={handleSample}
          sampleBusy={sampleBusy}
          sampleError={sampleError}
          onSkip={() => setPhase("upload")}
        />
      )}
      {phase === "upload" && (
        <Upload onAnalyze={handleAnalyze} onBack={() => setPhase("onboarding")} />
      )}
      {phase === "results" && result && (
        <Results
          data={result}
          imageFile={analyzedFile}
          language={profile.language}
          cart={cart}
          onCartChange={updateCart}
          onReset={() => setPhase("upload")}
          onCheckout={() => setPhase("order")}
        />
      )}
      {phase === "order" && (
        <OrderSheet
          cart={cart}
          language={profile.language}
          onChangeQty={(name, delta) => {
            const existing = cart.find((c) => c.name === name);
            if (!existing) return;
            updateCart(
              {
                name,
                translated: existing.translated ?? null,
                romanization: existing.romanization ?? null,
                listed_price: existing.listed_price ?? null,
                color: existing.color,
                reasons: [],
                trigger_flags: [],
                tts_cached: false,
              },
              delta
            );
          }}
          onClear={clearCart}
          onBack={() => setPhase("results")}
          onReview={() => setPhase("review")}
        />
      )}
      {phase === "review" && (
        <ReviewSheet
          cart={cart}
          language={profile.language}
          onBack={() => setPhase("order")}
          onDone={() => {
            clearCart();
            setPhase("upload");
          }}
        />
      )}
    </main>
  );
}
