// Design v2 tokens (Friendly / Pickle Plus tone).
// Mirrors values declared in app/globals.css @theme + atoms.jsx ML editorial-dark
// from the claude.ai/design handoff. Use these in JS contexts that can't read
// CSS variables (canvas, inline-only props), preferring Tailwind classes elsewhere.

// Two-track palette (D11 a11y pass):
//   *Visual* tokens (pickle, honey, blush, fog) — for backgrounds, signal
//     dots, decorative chips. Reads brand-correct.
//   *Text* tokens (pickleText, honeyText, blushText, mutedText) — darker
//     variants that pass WCAG AA (≥4.5:1) on the cream background. Use
//     these for any text rendered DIRECTLY on cream.
//   *Strong* tokens (pickleStrong) — for CTA buttons where white sits on
//     a colored fill (white on #3CA86A is only 3.00:1 = fail).
export const FR = {
  cream: "#FFF8EE",
  cream2: "#FFFDF7",
  ink: "#1F1A14",
  inkSoft: "#5C5347",          // 7.15:1 — AAA on cream
  // muted: replaces former `fog` for *text* uses (fog kept as decorative bg)
  muted: "#7A716A",            // 4.53:1 — AA on cream
  fog: "#9A9388",              // visual only (dots, decorations) — fails AA
  // green
  pickle: "#3CA86A",           // visual: bg, dots
  pickleStrong: "#226A3F",     // 6.56:1 white-on-pickle CTA bg
  pickleText: "#1F6E40",       // 5.92:1 pickle-text on cream
  pickleSoft: "#E8F5EC",
  // yellow
  honey: "#F2A93B",            // visual: bg, dots
  honeyText: "#7A4F11",        // 6.74:1 honey-text on cream
  honeySoft: "#FDF1DC",
  // red
  blush: "#E66B5B",            // visual: bg, dots
  blushText: "#A03A2A",        // 6.36:1 blush-text on cream
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
