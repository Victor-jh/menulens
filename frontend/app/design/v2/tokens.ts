// Design v2 tokens (Friendly / Pickle Plus tone).
// Mirrors values declared in app/globals.css @theme + atoms.jsx ML editorial-dark
// from the claude.ai/design handoff. Use these in JS contexts that can't read
// CSS variables (canvas, inline-only props), preferring Tailwind classes elsewhere.

export const FR = {
  cream: "#FFF8EE",
  cream2: "#FFFDF7",
  ink: "#1F1A14",
  inkSoft: "#5C5347",
  fog: "#9A9388",
  pickle: "#3CA86A",
  pickleSoft: "#E8F5EC",
  honey: "#F2A93B",
  honeySoft: "#FDF1DC",
  blush: "#E66B5B",
  blushSoft: "#FCE4DF",
  border: "rgba(31,26,20,0.08)",
} as const;

// Editorial dark (appendix — used for the "show staff" full-screen mode where
// a high-contrast black canvas reads better in restaurant lighting).
export const ML = {
  ink: "#0E1116",
  paper: "#F4ECDF",
  warmInk: "#1A1410",
  green: "#7DDC8A",
  yellow: "#F4C674",
  red: "#FF6A5A",
  fog: "#9AA3AE",
  mute: "#5A6470",
  hairline: "rgba(255,255,255,0.08)",
} as const;

export type SignalColor = "green" | "yellow" | "red";

export const FR_TONE: Record<
  SignalColor,
  { c: string; soft: string; emoji: string }
> = {
  green: { c: FR.pickle, soft: FR.pickleSoft, emoji: "🥒" },
  yellow: { c: FR.honey, soft: FR.honeySoft, emoji: "🤔" },
  red: { c: FR.blush, soft: FR.blushSoft, emoji: "✋" },
};

export const FONT = {
  ui: '"Inter Tight", -apple-system, system-ui, sans-serif',
  ko: '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif',
  display: '"Instrument Serif", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
} as const;
