// Adapter: backend AnalyzedItem (emoji color, flat reasons) → FriendlyItem
// (named-color, persona-aware triggers, structured price math) for v2 components.
//
// Why an adapter:
// - Backend already runs verdict.py which decides color server-side (we trust it).
// - The Claude.ai/design "Friendly" components were prototyped in a self-contained
//   sandbox with their own data shape (item.ko, item.color: 'green', triggers map).
// - Rather than refactor either side, we convert at the seam.

import type { AnalyzedItem, Color, UserProfile } from "../../types";
import type { SignalColor } from "./tokens";

export interface FriendlyItem {
  // Identity
  ko: string;
  en: string;
  romanized: string;

  // Signal
  color: SignalColor;

  // Price
  price: number | null;       // listed
  benchmark: number | null;   // consumer-price agency reference
  pricePctOver: number | null; // (price/benchmark - 1) * 100, rounded

  // Free side detection
  isFreeSide: boolean;

  // Persona-keyed triggers (e.g., "pork", "chicken") — reasons that the dish
  // tripped for this user. Backend returns flat strings; we surface them under
  // the active persona key for symmetry with the design prototype.
  triggers: Record<string, string[]>;

  // Optional reasons text (already human-readable from backend verdict).
  reasonsText: string[];

  // Audio carry-through (the v1 differentiator we MUST preserve)
  ttsAudioB64: string | null;
  ttsMime: string | null;
  orderPhrase: string | null;

  // Source provenance for debug / chip rendering
  source: string | undefined; // "menu_text" | "photo_id"
}

export function colorEmojiToName(c: Color): SignalColor {
  if (c === "🟢") return "green";
  if (c === "🟡") return "yellow";
  // Both 🔴 and the rare ⚪ unknown-state collapse to red for safety-first UX.
  return "red";
}

export function adaptItem(it: AnalyzedItem, persona: UserProfile): FriendlyItem {
  const color = colorEmojiToName(it.color);
  const benchmark = it.price_judgment?.benchmark_price ?? null;
  const price = it.listed_price ?? null;
  const pricePctOver =
    benchmark && price && benchmark > 0
      ? Math.round((price / benchmark - 1) * 100)
      : null;

  // free_side detection: backend sets `item_type === 'free_side'` or
  // `free_side_likely === true`; either is enough.
  const isFreeSide =
    it.item_type === "free_side" || it.free_side_likely === true;

  // Use language code as persona id (so the trigger map keys stay deterministic
  // across renders without coupling to a hardcoded persona enum).
  const personaId = persona.language;
  const triggers: Record<string, string[]> = {
    [personaId]: it.trigger_flags ?? [],
  };

  return {
    ko: it.name,
    en: it.translated ?? it.name,
    romanized: it.romanization ?? "",
    color,
    price,
    benchmark,
    pricePctOver,
    isFreeSide,
    triggers,
    reasonsText: it.reasons ?? [],
    ttsAudioB64: it.tts_audio_b64 ?? null,
    ttsMime: it.tts_audio_mime ?? null,
    orderPhrase: it.order_phrase ?? null,
    source: it.source,
  };
}

export function adaptItems(
  items: AnalyzedItem[],
  persona: UserProfile,
): FriendlyItem[] {
  return items.map((it) => adaptItem(it, persona));
}

// Reverse adapter: FriendlyItem back to AnalyzedItem-compatible shape for the
// existing Cart/Order/Review subsystems that still consume v1 types.
export function denormalize(fi: FriendlyItem): AnalyzedItem {
  const colorMap: Record<SignalColor, Color> = {
    green: "🟢",
    yellow: "🟡",
    red: "🔴",
  };
  return {
    name: fi.ko,
    translated: fi.en,
    romanization: fi.romanized || null,
    listed_price: fi.price,
    color: colorMap[fi.color],
    reasons: fi.reasonsText,
    trigger_flags: Object.values(fi.triggers).flat(),
    order_phrase: fi.orderPhrase,
    tts_audio_b64: fi.ttsAudioB64,
    tts_audio_mime: fi.ttsMime,
    tts_cached: false,
    source: fi.source,
    item_type: fi.isFreeSide ? "free_side" : "menu_item",
    free_side_likely: fi.isFreeSide,
  };
}
