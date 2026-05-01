"use client";

// UploadV2 — Friendly capture screen.
// The design's CaptureFriendly has 3 stages (aim → scanning → parsing) with a
// step-by-step parse overlay. Backend is single-call so we synthesize the
// stages on the client: stage transitions to 'scanning' on submit, then
// 'parsing' after ~3s, then onAnalyze resolves.
//
// Preserved from v1:
//   - File compression (multi-MB phone photos → 1600px JPEG)
//   - Mode toggle (auto/text/photo) — stowed in an expandable detail
//   - Error banner with retry
//   - iOS Safari label-wrap pattern (no display:none input click)

import { useEffect, useRef, useState } from "react";
import type { UserProfile } from "../../../types";
import { strings } from "../i18n";
import { FR } from "../tokens";

type AnalyzeMode = "auto" | "text" | "photo";
type CaptureStage = "aim" | "scanning" | "parsing";

interface Props {
  onAnalyze: (file: File, mode: AnalyzeMode) => Promise<void>;
  onBack: () => void;
  language: UserProfile["language"];
}

const MAX_DIM = 1600;
const JPEG_Q = 0.85;

async function compressForUpload(file: File): Promise<File> {
  if (!/^image\//.test(file.type)) return file;
  if (file.size < 1.2 * 1024 * 1024) return file;
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
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_Q),
    );
    bitmap.close?.();
    if (!blob || blob.size === 0) return file;
    return new File(
      [blob],
      file.name.replace(/\.[^.]+$/, "") + ".jpg",
      { type: "image/jpeg", lastModified: Date.now() },
    );
  } catch {
    return file;
  }
}

export function UploadV2({ onAnalyze, onBack, language }: Props) {
  const t = strings(language);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<CaptureStage>("aim");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AnalyzeMode>("auto");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
    },
    [],
  );

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);
    setStage("aim");
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setStage("scanning");
    // Synthesize the parsing stage after ~3s so users see progress before the
    // single-call backend resolves (which can take 8–15s).
    stageTimerRef.current = setTimeout(() => setStage("parsing"), 3000);
    try {
      const optimized = await compressForUpload(file);
      await onAnalyze(optimized, mode);
    } catch (e) {
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
      setStage("aim");
      setError((e as Error).message || "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  const isParse = stage === "parsing" && busy;

  return (
    <div
      className="font-ko relative mx-auto max-w-md"
      style={{
        background: FR.cream,
        color: FR.ink,
        minHeight: "100dvh",
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
        paddingLeft: 20,
        paddingRight: 20,
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          style={{ fontSize: 13, fontWeight: 600, color: FR.ink }}
        >
          ← {language === "ko" ? "뒤로" : "Back"}
        </button>
        <span
          style={{
            fontSize: 11,
            letterSpacing: 1,
            color: FR.pickle,
            fontWeight: 700,
            padding: "5px 10px",
            background: FR.pickleSoft,
            borderRadius: 99,
          }}
        >
          02 / {language === "ko" ? "찍기" : "CAPTURE"}
        </span>
        <span style={{ width: 24 }} />
      </div>

      {/* Heading */}
      <div>
        <h1
          className="font-ko"
          style={{
            fontSize: 26,
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: -0.6,
            color: FR.ink,
          }}
        >
          {language === "ko"
            ? "메뉴판을 찍어주세요"
            : language === "ja"
              ? "メニューを撮ってください"
              : language === "zh-Hans"
                ? "请拍下菜单"
                : language === "zh-Hant"
                  ? "請拍下菜單"
                  : "Snap the menu"}
        </h1>
        <p
          className="font-ko"
          style={{
            fontSize: 13,
            color: FR.inkSoft,
            marginTop: 6,
            lineHeight: 1.5,
          }}
        >
          {language === "ko"
            ? "흐릿해도 괜찮아요. 알아서 읽어드릴게요"
            : "Slight blur is OK — we'll read it for you"}
        </p>
      </div>

      {/* Preview area */}
      <div
        className="mt-5"
        style={{
          aspectRatio: "4/3",
          borderRadius: 18,
          overflow: "hidden",
          border: `2px dashed ${preview ? "transparent" : FR.border}`,
          background: preview ? "#000" : FR.cream2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="menu preview"
            style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
          />
        ) : (
          <div style={{ textAlign: "center", color: FR.fog }}>
            <div style={{ fontSize: 36 }}>📐</div>
            <div className="font-ko" style={{ fontSize: 12, marginTop: 6 }}>
              {language === "ko"
                ? "메뉴판 사진을 올려주세요"
                : "Upload a menu photo"}
            </div>
          </div>
        )}
      </div>

      {/* Camera / Upload buttons */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label
          className="font-ko"
          style={{
            cursor: "pointer",
            textAlign: "center",
            background: FR.ink,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            borderRadius: 14,
            padding: "14px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          📷 {language === "ko" ? "카메라" : "Camera"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
        <label
          className="font-ko"
          style={{
            cursor: "pointer",
            textAlign: "center",
            background: FR.cream2,
            color: FR.ink,
            fontSize: 14,
            fontWeight: 700,
            border: `1px solid ${FR.border}`,
            borderRadius: 14,
            padding: "14px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          🖼{" "}
          {language === "ko" ? "갤러리" : "Gallery"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      </div>

      {/* Mode toggle (advanced) */}
      <details
        className="mt-3"
        open={showAdvanced}
        onToggle={(e) =>
          setShowAdvanced((e.target as HTMLDetailsElement).open)
        }
      >
        <summary
          className="font-ko"
          style={{
            fontSize: 11,
            color: FR.fog,
            cursor: "pointer",
            listStyle: "none",
          }}
        >
          ⚙ {language === "ko" ? "고급" : "Advanced"} ({mode})
        </summary>
        <div
          role="radiogroup"
          aria-label="Detection mode"
          className="mt-2 grid grid-cols-3 gap-1 text-xs p-1"
          style={{
            background: FR.cream2,
            border: `1px solid ${FR.border}`,
            borderRadius: 10,
          }}
        >
          {(
            [
              { key: "auto", label: "Auto" },
              { key: "text", label: "Menu" },
              { key: "photo", label: "Food" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={mode === opt.key}
              onClick={() => setMode(opt.key)}
              className="font-ko"
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                background: mode === opt.key ? FR.cream : "transparent",
                color: mode === opt.key ? FR.ink : FR.inkSoft,
                boxShadow:
                  mode === opt.key
                    ? "0 1px 2px rgba(0,0,0,0.06)"
                    : "none",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </details>

      {/* Analyze CTA */}
      {file && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="font-ko mt-4 w-full active:scale-[0.99]"
          style={{
            height: 54,
            borderRadius: 14,
            border: "none",
            background: busy ? FR.pickle : FR.pickle,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            opacity: busy ? 0.7 : 1,
            boxShadow: `0 6px 18px ${FR.pickle}50`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {busy
            ? language === "ko"
              ? "읽는 중… (~15s)"
              : "Reading… (~15s)"
            : language === "ko"
              ? "🔍 메뉴판 읽기"
              : "🔍 Analyze menu"}
        </button>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="font-ko mt-3 rounded-xl p-3 text-sm"
          style={{
            background: FR.blushSoft,
            color: FR.blush,
            border: `1px solid ${FR.blush}40`,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            ⚠{" "}
            {language === "ko"
              ? "분석 실패"
              : "Couldn't analyze"}
          </div>
          <div>{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-2 underline"
            style={{ fontSize: 11, opacity: 0.7 }}
          >
            {language === "ko" ? "닫기" : "Dismiss"}
          </button>
        </div>
      )}

      {/* Parse overlay (the killer cold-start UX) */}
      {busy && (
        <ParseOverlay
          stage={stage}
          isParse={isParse}
          language={language}
          t={t}
        />
      )}
    </div>
  );
}

function ParseOverlay({
  stage,
  isParse,
  language,
  t,
}: {
  stage: CaptureStage;
  isParse: boolean;
  language: UserProfile["language"];
  t: ReturnType<typeof strings>;
}) {
  // 5-step pipeline animation. backend is a single call so we drive these on a
  // timer for perceived progress (Doherty Threshold).
  const steps = [
    { label: t.stageScanning, key: "ocr" },
    {
      label:
        language === "ko" ? "한국어 → 알기 쉽게" : "Translating + romanizing",
      key: "translate",
    },
    {
      label:
        language === "ko"
          ? "재료·알레르기 확인"
          : "Checking ingredients · allergens",
      key: "ingredients",
    },
    {
      label:
        language === "ko" ? "참가격 비교" : "Comparing to consumer-price index",
      key: "price",
    },
    {
      label: language === "ko" ? "추천 정렬" : "Sorting by safety",
      key: "sort",
    },
  ];

  // Determine progress: 'scanning' → first 2 done, 'parsing' → first 3 done.
  const doneCount = isParse ? 3 : stage === "scanning" ? 2 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{
        background: `${FR.cream}f5`,
        backdropFilter: "blur(10px)",
        padding: "0 24px 56px",
        color: FR.ink,
      }}
    >
      <div style={{ fontSize: 54 }}>🥒</div>
      <div
        className="font-ko"
        style={{
          fontSize: 28,
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: -0.8,
          marginTop: 8,
        }}
      >
        {language === "ko" ? (
          <>
            잠깐만요…
            <br />
            <span style={{ color: FR.pickle }}>읽고 있어요</span>
          </>
        ) : (
          <>
            One moment…
            <br />
            <span style={{ color: FR.pickle }}>reading the menu</span>
          </>
        )}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {steps.map((s, i) => {
          const status =
            i < doneCount ? "done" : i === doneCount ? "doing" : "idle";
          return (
            <div
              key={s.key}
              className="font-ko"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 12,
                background: status === "idle" ? "transparent" : FR.cream2,
                border:
                  status === "idle"
                    ? "1px dashed rgba(31,26,20,0.12)"
                    : `1px solid ${FR.border}`,
                opacity: status === "idle" ? 0.5 : 1,
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background:
                    status === "done"
                      ? FR.pickle
                      : status === "doing"
                        ? FR.honey
                        : "transparent",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  display: "grid",
                  placeItems: "center",
                  border:
                    status === "idle" ? `1px solid ${FR.border}` : "none",
                }}
              >
                {status === "done" ? "✓" : status === "doing" ? "⏳" : "·"}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: status === "idle" ? FR.fog : FR.ink,
                }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      <p
        className="font-ko mt-6 text-center"
        style={{ fontSize: 11, color: FR.fog }}
      >
        {language === "ko"
          ? "~15초 (백엔드 깨우는 중이면 +30초)"
          : "~15s (+30s if backend is waking up)"}
      </p>
    </div>
  );
}
