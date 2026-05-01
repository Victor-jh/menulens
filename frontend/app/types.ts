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
  spicy_level?: number | null;
  category?: string | null;
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
  // From menu_reader source classification
  source?: string;            // "menu_text" | "photo_id"
  item_type?: string;         // "menu_item" | "free_side" | "drink"
  free_side_likely?: boolean;
}

export type ImageKind = "menu" | "single_dish" | "table_with_dishes" | "not_food";

export interface AnalyzeResponse {
  items: AnalyzedItem[];
  ocr_quality: number;
  warnings: string[];
  processing_time_seconds: number;
  // Hermes router (D11): backend classifies image and dispatches accordingly.
  image_kind?: ImageKind;
  image_kind_confidence?: number;
  main_dish_ko?: string | null;
  detected_dishes_ko?: string[] | null;
}

export interface ReviewIn {
  dish_name: string;
  dish_name_en?: string | null;
  rating: number;
  comment?: string | null;
  language: string;
  visit_kind: "dine_in" | "takeout" | "unknown";
  tags?: string[];
  visitor_country?: string | null;
}

export interface ReviewOut {
  id: number;
  dish_name: string;
  dish_name_en?: string | null;
  rating: number;
  comment?: string | null;
  comment_ko?: string | null;
  comment_en?: string | null;
  comment_ja?: string | null;
  comment_zh?: string | null;
  sentiment?: "positive" | "mixed" | "negative" | "neutral";
  aspects?: string[];
  themes?: string[];
  recommend?: boolean;
  threads_text?: string | null;
  threads_post_id?: string | null;
  threads_status?: "pending" | "posted" | "failed" | "skipped";
  language: string;
  visit_kind: string;
  tags: string[];
  visitor_country?: string | null;
  reward_code?: string | null;
  created_at: string;
}

export interface RewardResult {
  code: string;
  label: string;
  label_ko: string;
  description: string;
  won: boolean;
  rarity: "common" | "rare" | "jackpot";
}

export interface ReviewSubmitResponse {
  review: ReviewOut;
  reward: RewardResult;
}

export interface CartItem {
  name: string;          // original Korean name (used as id)
  translated?: string | null;
  romanization?: string | null;
  listed_price?: number | null;
  color: Color;
  qty: number;
}

export interface UserProfile {
  language: "en" | "ko" | "ja" | "zh-Hans" | "zh-Hant";
  allergies: string[];
  religion: "" | "halal" | "kosher";
  diet: "" | "vegan" | "vegetarian" | "pescatarian";
}

export interface RegionalVariant {
  region: string;
  name?: string | null;
  distinctive: string;
}

export interface VisualMatch {
  likely_region?: string | null;
  confidence: number;
  reasoning: string;
}

export interface IngredientInfo {
  name_ko: string;
  name_en?: string | null;
  icon?: string | null;
  category: string;
  description: string;
  allergen_tags: string[];
  diet_flags: string[];
}

export interface DishTags {
  cuisine: string[];
  occasion: string[];
  flavor: string[];
  social: string[];
}

export interface FactCards {
  when_eaten: string;
  origin: string;
  pairs_with: string[];
  why_locals_love_it: string;
  typical_price_range_won?: string | null;
  serving_temp: string;
}

export interface DishStory {
  name_ko: string;
  name_en: string;
  short_description: string;
  cultural_context: string;
  typical_ingredients: string[];
  typical_ingredients_detail: IngredientInfo[];
  how_to_eat: string;
  regional_variants: RegionalVariant[];
  visual_match?: VisualMatch | null;
  tags: DishTags;
  fact_cards: FactCards;
}

export interface NearbyRestaurant {
  content_id: string;
  title: string;
  addr: string;
  addr_detail?: string | null;
  mapx?: number | null;   // longitude
  mapy?: number | null;   // latitude
  distance_m?: number | null;
  first_image?: string | null;
  first_image_thumbnail?: string | null;
  tel?: string | null;
  cat3?: string | null;
}

export type NearbyStatus = "ok" | "missing_key" | "upstream_error" | "no_results";

export interface NearbyResponse {
  status: NearbyStatus;
  source: "lod" | "openapi";
  items: NearbyRestaurant[];
  total_count: number;
  message?: string | null;
  language_used: string;
  radius_m: number;
  center_lat: number;
  center_lon: number;
}

export interface RestaurantDetail {
  content_id: string;
  operating_hours?: string | null;
  rest_date?: string | null;
  info_center?: string | null;
  parking?: string | null;
  seat?: string | null;
  first_menu?: string | null;
  signature_menu?: string | null;
  smoking?: string | null;
  reservation?: string | null;
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
