// Mirrors backend/api/main.py response shapes
export type Color = "🟢" | "🟡" | "🔴" | "⚪";

export interface DishProfile {
  name_ko: string;
  name_official?: string | null;
  name_translated: string;
  romanization?: string | null;
  description: string;
  ingredients: string[];
  allergens: string[];
  halal_safe: boolean;
  vegan_safe: boolean;
  vegetarian_safe: boolean;
  match_similarity?: number | null;
  source: string;
}

export interface PriceJudgment {
  dish_name: string;
  listed_price: number;
  benchmark_key?: string | null;
  benchmark_price?: number | null;
  benchmark_source: string;
  match_method: string;
  match_confidence: number;
  ratio?: number | null;
  verdict: Color;
  explanation: string;
}

export interface AnalyzedItem {
  name: string;
  translated?: string | null;
  romanization?: string | null;
  listed_price?: number | null;
  color: Color;
  reasons: string[];
  trigger_flags: string[];
  order_phrase?: string | null;
  tts_audio_b64?: string | null;
  tts_audio_mime?: string | null;
  tts_cached: boolean;
  dish_profile?: DishProfile | null;
  price_judgment?: PriceJudgment | null;
}

export interface AnalyzeResponse {
  items: AnalyzedItem[];
  ocr_quality: number;
  warnings: string[];
  processing_time_seconds: number;
}

export interface UserProfile {
  language: "en" | "ko" | "ja" | "zh-Hans" | "zh-Hant";
  allergies: string[];
  religion: "" | "halal" | "kosher";
  diet: "" | "vegan" | "vegetarian";
}

export const ALLERGEN_OPTIONS: { key: string; label: string }[] = [
  { key: "pork",      label: "🐖 Pork" },
  { key: "beef",      label: "🐄 Beef" },
  { key: "chicken",   label: "🐔 Chicken" },
  { key: "seafood",   label: "🦑 Seafood" },
  { key: "fish",      label: "🐟 Fish" },
  { key: "shellfish", label: "🦐 Shellfish" },
  { key: "egg",       label: "🥚 Egg" },
  { key: "dairy",     label: "🥛 Dairy" },
  { key: "gluten",    label: "🌾 Gluten" },
  { key: "soy",       label: "🌱 Soy" },
  { key: "nuts",      label: "🌰 Tree Nuts" },
  { key: "peanut",    label: "🥜 Peanut" },
  { key: "sesame",    label: "Sesame" },
  { key: "alcohol",   label: "🍷 Alcohol" },
];
