"use client";

import { useRef, useState } from "react";

interface Props {
  onAnalyze: (file: File) => Promise<void>;
  onBack: () => void;
}

export function Upload({ onAnalyze, onBack }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await onAnalyze(file);
    } catch (e) {
      setError((e as Error).message || "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto p-6">
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

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-semibold rounded-lg py-3 active:scale-[0.99]"
        >
          📷 Camera
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="border border-zinc-300 dark:border-zinc-700 rounded-lg py-3 font-semibold active:scale-[0.99]"
        >
          🖼 Upload
        </button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {file && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Analyzing... (3-5s)" : "Analyze menu →"}
        </button>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 rounded-lg p-3 text-sm">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
