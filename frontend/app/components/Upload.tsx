"use client";

import { useRef, useState } from "react";

type AnalyzeMode = "auto" | "text" | "photo";

interface Props {
  onAnalyze: (file: File, mode: AnalyzeMode) => Promise<void>;
  onBack: () => void;
}

const MAX_DIM = 1600;
const JPEG_Q = 0.85;

/**
 * Downscale & re-encode to JPEG so multi-MB phone photos don't time-out Gemini.
 * Falls back to the original file on failure.
 */
async function compressForUpload(file: File): Promise<File> {
  if (!/^image\//.test(file.type)) return file;
  if (file.size < 1.2 * 1024 * 1024) return file; // already small enough

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 3 * 1024 * 1024) return file;

    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_Q)
    );
    bitmap.close?.();
    if (!blob || blob.size === 0) return file;
    return new File(
      [blob],
      file.name.replace(/\.[^.]+$/, "") + ".jpg",
      { type: "image/jpeg", lastModified: Date.now() }
    );
  } catch {
    return file;
  }
}

export function Upload({ onAnalyze, onBack }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AnalyzeMode>("auto");

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const optimized = await compressForUpload(file);
      await onAnalyze(optimized, mode);
    } catch (e) {
      setError((e as Error).message || "Analysis failed");
      setTimeout(() => {
        document.querySelector("[data-error-banner]")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex flex-col gap-6 max-w-md mx-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Take a photo</h1>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Profile
        </button>
      </div>
      <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
        Snap the menu in front of you. Each item is color-coded
        <span className="whitespace-nowrap"> (✓ Safe · ! Caution · ✕ Avoid)</span> using
        your profile + Korean consumer price index.
      </p>
      <p className="text-xs text-zinc-500">
        Tip: flat menu, even lighting, crop out the table. JPG/PNG up to 10MB.
      </p>

      <div
        className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl aspect-[4/3] flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 overflow-hidden"
      >
        {preview ? (
          // Preview is a blob URL from user input — using <img> is correct here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="menu preview" className="object-contain max-h-full" />
        ) : (
          <span className="text-zinc-400">No photo yet</span>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Detection mode"
        className="grid grid-cols-3 gap-1 text-xs bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1"
      >
        {(
          [
            { key: "auto", label: "Auto", hint: "AI decides" },
            { key: "text", label: "Menu board", hint: "메뉴판" },
            { key: "photo", label: "Food photo", hint: "음식 사진" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={mode === opt.key}
            onClick={() => setMode(opt.key)}
            className={
              mode === opt.key
                ? "rounded-md py-2 bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-50 font-medium"
                : "rounded-md py-2 text-zinc-600 dark:text-zinc-400"
            }
          >
            <span className="block">{opt.label}</span>
            <span className="block text-[10px] opacity-70">{opt.hint}</span>
          </button>
        ))}
      </div>

      {/*
        iOS Safari refuses to trigger file inputs with display:none.
        Label-wrap pattern: tap on the label visually triggers the hidden input
        natively, which works on all iOS versions.
      */}
      <div className="grid grid-cols-2 gap-3">
        <label
          className="cursor-pointer text-center bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-semibold rounded-lg py-3 active:scale-[0.99] select-none"
        >
          📷 Camera
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Take a photo of the menu"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
        <label
          className="cursor-pointer text-center border border-zinc-300 dark:border-zinc-700 rounded-lg py-3 font-semibold active:scale-[0.99] select-none"
        >
          🖼 Upload
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Upload a menu image from gallery"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      </div>

      {file && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg py-3 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {busy && (
            <span className="inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          )}
          {busy ? "Reading the menu… up to 30s" : "Analyze menu →"}
        </button>
      )}

      {error && (
        <div
          data-error-banner
          role="alert"
          className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 rounded-lg p-3 text-sm whitespace-pre-line"
        >
          <div className="font-semibold mb-1">⚠ Couldn&apos;t analyze this photo</div>
          <div className="leading-relaxed">{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-2 text-xs underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Full-card busy overlay so the photo + button stay visible underneath */}
      {busy && (
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-white/40 dark:bg-zinc-950/40 flex items-start justify-center pt-32">
          <div className="flex flex-col items-center gap-2 pointer-events-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg px-5 py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-50" />
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Reading the menu… up to 30s
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
