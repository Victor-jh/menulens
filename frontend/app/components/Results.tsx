"use client";

import { useRef, useState } from "react";
import type {
  AnalyzeResponse,
  AnalyzedItem,
  CartItem,
  Color,
  DishStory,
  IngredientInfo,
} from "../types";
import { fetchStory } from "../lib/api";

// Toss principle: card body is neutral; severity expressed via a left stripe + badge.
const COLOR_STRIPE: Record<Color, string> = {
  "🟢": "before:bg-emerald-500",
  "🟡": "before:bg-amber-500",
  "🔴": "before:bg-red-500",
  "⚪": "before:bg-zinc-400",
};

const COLOR_LABEL: Record<Color, string> = {
  "🟢": "Safe",
  "🟡": "Caution",
  "🔴": "Avoid",
  "⚪": "Unknown",
};

// Icon as redundant signal alongside color (protanopia/deuteranopia distinguish shape, not hue).
const COLOR_ICON: Record<Color, string> = {
  "🟢": "✓",
  "🟡": "!",
  "🔴": "✕",
  "⚪": "?",
};

const COLOR_BADGE: Record<Color, string> = {
  "🟢": "bg-emerald-600 text-white",
  "🟡": "bg-amber-500 text-white",
  "🔴": "bg-red-600 text-white",
  "⚪": "bg-zinc-500 text-white",
};

interface Props {
  data: AnalyzeResponse;
  imageFile?: File | null;
  language: string;
  cart: CartItem[];
  onCartChange: (item: AnalyzedItem, delta: number) => void;
  onReset: () => void;
  onCheckout: () => void;
}

type SortMode = "severity" | "menu";

export function Results({
  data,
  imageFile,
  language,
  cart,
  onCartChange,
  onReset,
  onCheckout,
}: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("severity");

  const items =
    sortMode === "severity"
      ? [...data.items].sort((a, b) => severity(b.color) - severity(a.color))
      : data.items;

  const totalQty = cart.reduce((s, c) => s + c.qty, 0);
  const totalPrice = cart.reduce(
    (s, c) => s + (typeof c.listed_price === "number" ? c.listed_price * c.qty : 0),
    0
  );
  const cartByName = new Map(cart.map((c) => [c.name, c.qty]));

  return (
    <div className={`flex flex-col gap-3 max-w-md mx-auto p-4 ${totalQty > 0 ? "pb-28" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Results</h1>
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50 rounded-md px-2 py-1"
        >
          ↻ Re-shoot
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
        <div className="flex gap-2">
          <span>OCR {Math.round(data.ocr_quality * 100)}%</span>
          <span>·</span>
          <span>{data.processing_time_seconds.toFixed(1)}s</span>
          <span>·</span>
          <span>{data.items.length} items</span>
        </div>
        <div
          role="tablist"
          aria-label="Sort menu items"
          className="flex bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5"
        >
          <SortTab active={sortMode === "severity"} onClick={() => setSortMode("severity")}>
            Safety
          </SortTab>
          <SortTab active={sortMode === "menu"} onClick={() => setSortMode("menu")}>
            Menu order
          </SortTab>
        </div>
      </div>

      {data.warnings.length > 0 && (
        <div
          role="status"
          className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-sm leading-relaxed"
        >
          {data.warnings.map((w, i) => (
            <div key={i}>· {w}</div>
          ))}
        </div>
      )}

      <ContextBanner items={data.items} />

      {items.length === 0 ? (
        <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-6 text-center text-zinc-600 dark:text-zinc-400">
          <div className="text-4xl mb-2">📷</div>
          <div className="font-semibold">메뉴를 찾지 못했어요</div>
          <div className="text-sm mt-1">
            메뉴판이 평평하게 보이도록 다시 찍어보세요.
            <br />단품 음식 사진은 분석되지 않아요.
          </div>
          <button
            type="button"
            onClick={onReset}
            className="mt-4 inline-flex bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-semibold rounded-lg px-4 py-2"
          >
            다시 찍기
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, i) => (
            <ItemCard
              key={`${item.name}-${i}`}
              item={item}
              imageFile={imageFile ?? null}
              language={language}
              qty={cartByName.get(item.name) ?? 0}
              onChangeQty={(delta) => onCartChange(item, delta)}
            />
          ))}
        </ul>
      )}

      {/* Sticky cart bar (Toss BottomCTA pattern) */}
      {totalQty > 0 && (
        <div className="fixed bottom-0 inset-x-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 pb-[max(env(safe-area-inset-bottom),12px)] z-40">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-zinc-500">{totalQty} items</div>
              <div className="text-lg font-bold">
                {totalPrice > 0 ? `₩${totalPrice.toLocaleString()}` : "—"}
              </div>
            </div>
            <button
              type="button"
              onClick={onCheckout}
              className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-semibold rounded-xl px-5 py-3"
            >
              Order →
            </button>
          </div>
        </div>
      )}

      {/* Legend for first-time users */}
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-500 dark:text-zinc-500">
        <LegendChip color="🟢" /> <LegendChip color="🟡" /> <LegendChip color="🔴" /> <LegendChip color="⚪" />
      </div>
    </div>
  );
}

function SortTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
          : "text-zinc-500"
      }`}
    >
      {children}
    </button>
  );
}

function LegendChip({ color }: { color: Color }) {
  return (
    <span className="inline-flex items-center gap-1">
      <SeverityBadge color={color} />
      {COLOR_LABEL[color]}
    </span>
  );
}

function SeverityBadge({ color }: { color: Color }) {
  // Ensures severity is always communicated by icon + text + color.
  return (
    <span
      aria-label={COLOR_LABEL[color]}
      title={COLOR_LABEL[color]}
      className={`inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full font-bold text-xs ${COLOR_BADGE[color]}`}
    >
      <span aria-hidden="true" className="mr-0.5">{COLOR_ICON[color]}</span>
      <span className="uppercase tracking-wide">{COLOR_LABEL[color]}</span>
    </span>
  );
}

function severity(c: Color): number {
  return c === "🔴" ? 3 : c === "🟡" ? 2 : c === "🟢" ? 1 : 0;
}

/**
 * Single informational banner that summarises analysis caveats ONCE,
 * so individual cards don't need a confirm each time the user taps +.
 */
function ContextBanner({ items }: { items: AnalyzedItem[] }) {
  const photoIdCount = items.filter((i) => i.source === "photo_id").length;
  const freeSideCount = items.filter(
    (i) => i.free_side_likely || i.item_type === "free_side"
  ).length;
  if (photoIdCount === 0 && freeSideCount === 0) return null;

  return (
    <div className="rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 p-3 text-xs flex flex-col gap-1.5">
      {photoIdCount > 0 && (
        <div className="flex gap-2">
          <span>📸</span>
          <span className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <strong>{photoIdCount}</strong> item{photoIdCount > 1 ? "s" : ""} identified from
            the photo (no menu text). Prices not shown — confirm with the menu before ordering.
          </span>
        </div>
      )}
      {freeSideCount > 0 && (
        <div className="flex gap-2">
          <span>ℹ</span>
          <span className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
            <strong>{freeSideCount}</strong> item{freeSideCount > 1 ? "s" : ""} look like Korean
            free side dishes (banchan, side soup) — usually served without ordering.
          </span>
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  imageFile,
  language,
  qty,
  onChangeQty,
}: {
  item: AnalyzedItem;
  imageFile: File | null;
  language: string;
  qty: number;
  onChangeQty: (delta: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioState, setAudioState] = useState<"idle" | "playing" | "error">("idle");
  const [expanded, setExpanded] = useState(false);
  const [story, setStory] = useState<DishStory | null>(null);
  const [storyState, setStoryState] = useState<"idle" | "loading" | "error">("idle");
  const [storyError, setStoryError] = useState<string | null>(null);

  const audioSrc = item.tts_audio_b64
    ? `data:${item.tts_audio_mime || "audio/wav"};base64,${item.tts_audio_b64}`
    : null;

  const toggleAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    if (audioState === "playing") {
      el.pause();
      el.currentTime = 0;
      setAudioState("idle");
      return;
    }
    el.play().then(() => setAudioState("playing")).catch(() => setAudioState("error"));
  };

  // Lazy fetch the LLM story the first time the user opens details.
  const ensureStory = async () => {
    if (story || storyState === "loading") return;
    setStoryState("loading");
    setStoryError(null);
    try {
      const s = await fetchStory(item.name, language, imageFile);
      setStory(s);
      setStoryState("idle");
    } catch (e) {
      setStoryError((e as Error).message || "Failed to load story");
      setStoryState("error");
    }
  };

  // Derive visible details from dish_profile.
  const dp = item.dish_profile;
  const ingredients = dp?.ingredients ?? [];
  const allergens = dp?.allergens ?? [];
  const spicy = dp?.spicy_level ?? null;
  const category = dp?.category ?? null;
  const description = dp?.description ?? "";
  const spicyLabel =
    spicy === 3 ? "🌶🌶🌶 Very Spicy"
    : spicy === 2 ? "🌶🌶 Spicy"
    : spicy === 1 ? "🌶 Mild"
    : null;
  const hasDetails = !!(description || spicyLabel || category || ingredients.length || allergens.length);

  const isPhotoId = item.source === "photo_id";
  const isFreeSide = !!item.free_side_likely || item.item_type === "free_side";

  const FREE_SIDE_ACK_KEY = "menulens.free_side_ack.v1";

  const handleAddToOrder = () => {
    // photo_id: silent — top banner already informs the user once for the whole analysis.
    // free_side: confirm only the FIRST time per session, then trust the user.
    if (isFreeSide) {
      let acked = false;
      try {
        acked = sessionStorage.getItem(FREE_SIDE_ACK_KEY) === "1";
      } catch {
        /* ignore */
      }
      if (!acked) {
        const ok = window.confirm(
          `"${item.translated || item.name}"은 한국 식당에서 보통 — 무료로 — 제공되는 반찬·기본찬일 수 있어요. 메뉴판에 가격이 안 적혀 있다면 주문할 필요가 없어요.\n\n앞으로는 무료 사이드도 조용히 추가할게요. 추가할까요?`
        );
        if (!ok) return;
        try {
          sessionStorage.setItem(FREE_SIDE_ACK_KEY, "1");
        } catch {
          /* ignore */
        }
      }
    }
    onChangeQty(1);
  };

  return (
    <li
      className={`relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 pl-4 flex flex-col gap-2 before:content-[''] before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1 before:rounded-full ${COLOR_STRIPE[item.color]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge color={item.color} />
            <span className="font-semibold text-base truncate">
              {item.translated || item.name}
            </span>
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            <span>{item.name}</span>
            {item.romanization && <> · <em>{item.romanization}</em></>}
            {item.listed_price != null && item.listed_price > 0 ? (
              <> · ₩{item.listed_price.toLocaleString()}</>
            ) : item.price_judgment?.benchmark_price ? (
              <>
                {" "}· <span className="text-zinc-500">
                  보통 ₩{item.price_judgment.benchmark_price.toLocaleString()}
                </span>
              </>
            ) : null}
          </div>
          {isFreeSide && (
            <div className="mt-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 font-medium">
                ℹ Often free · 무료 반찬일 수 있음
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {audioSrc && item.order_phrase && (
            <button
              type="button"
              onClick={toggleAudio}
              className={`rounded-full h-11 w-11 flex items-center justify-center text-base font-bold active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-50 transition-colors ${
                audioState === "playing"
                  ? "bg-emerald-600 text-white"
                  : audioState === "error"
                  ? "bg-red-600 text-white"
                  : "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900"
              }`}
              title={item.order_phrase}
              aria-label={
                audioState === "playing"
                  ? `Stop: ${item.order_phrase}`
                  : `Play order: ${item.order_phrase}`
              }
            >
              {audioState === "playing" ? "■" : audioState === "error" ? "!" : "▶"}
            </button>
          )}
          {qty === 0 ? (
            <button
              type="button"
              onClick={handleAddToOrder}
              className={`rounded-full h-11 w-11 flex items-center justify-center text-xl font-bold border-2 active:scale-95 ${
                isFreeSide
                  ? "border-amber-500 text-amber-700 dark:text-amber-300"
                  : "border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50"
              }`}
              aria-label={`Add ${item.translated || item.name} to order`}
              title={isFreeSide ? "Free side likely — confirm before adding" : "Add to order"}
            >
              +
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5">
              <button
                type="button"
                onClick={() => onChangeQty(-1)}
                className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-200 active:scale-95"
                aria-label={`Remove one ${item.translated || item.name}`}
              >
                −
              </button>
              <span className="min-w-6 text-center font-bold tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => onChangeQty(1)}
                className="h-10 w-10 rounded-full bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 flex items-center justify-center font-bold active:scale-95"
                aria-label={`Add another ${item.translated || item.name}`}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      {audioSrc && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="auto"
          onEnded={() => setAudioState("idle")}
          onError={() => setAudioState("error")}
        />
      )}

      {item.reasons.length > 0 && (
        <ul className="text-sm space-y-0.5">
          {item.reasons.map((r, i) => (
            <li key={i} className="text-zinc-700 dark:text-zinc-300">• {r}</li>
          ))}
        </ul>
      )}

      {/* Inline tags — categorized chips, scrollable on overflow */}
      <TagStrip
        spicyLabel={spicyLabel}
        category={category}
        storyTags={story?.tags}
      />

      {/* Expandable details with inner section tabs */}
      {hasDetails && (
        <details
          open={expanded}
          onToggle={(e) => {
            const open = (e.target as HTMLDetailsElement).open;
            setExpanded(open);
            if (open) ensureStory();
          }}
          className="text-sm"
        >
          <summary className="cursor-pointer text-xs text-zinc-600 dark:text-zinc-400 select-none list-none flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-50">
            <span>{expanded ? "▾" : "▸"}</span>
            <span>{expanded ? "Hide details" : "More info — about · ingredients · regions"}</span>
          </summary>

          <div className="mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
            <DetailTabs
              dishName={item.name}
              dbDescription={description}
              dbIngredients={ingredients}
              dbAllergens={allergens}
              story={story}
              storyState={storyState}
              storyError={storyError}
            />
          </div>
        </details>
      )}
    </li>
  );
}

type Tab = "about" | "ingredients" | "regions";

function DetailTabs({
  dishName,
  dbDescription,
  dbIngredients,
  dbAllergens,
  story,
  storyState,
  storyError,
}: {
  dishName: string;
  dbDescription: string;
  dbIngredients: string[];
  dbAllergens: string[];
  story: DishStory | null;
  storyState: "idle" | "loading" | "error";
  storyError: string | null;
}) {
  const [tab, setTab] = useState<Tab>("about");
  const hasIngredientCards =
    (story?.typical_ingredients_detail?.length ?? 0) > 0 || dbIngredients.length > 0;
  const hasRegions =
    (story?.regional_variants?.length ?? 0) > 0 || !!story?.visual_match;

  return (
    <div className="flex flex-col gap-3">
      {/* Tab bar */}
      <div role="tablist" className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5 self-start">
        <TabButton active={tab === "about"} onClick={() => setTab("about")}>About</TabButton>
        <TabButton
          active={tab === "ingredients"}
          onClick={() => setTab("ingredients")}
          disabled={!hasIngredientCards}
        >
          Ingredients
        </TabButton>
        <TabButton
          active={tab === "regions"}
          onClick={() => setTab("regions")}
          disabled={!hasRegions}
        >
          Regions
        </TabButton>
      </div>

      {storyState === "loading" && !story && tab !== "about" && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <div className="animate-spin rounded-full h-3 w-3 border border-zinc-400 border-t-transparent" />
          <span>Loading…</span>
        </div>
      )}

      {tab === "about" && (
        <div className="flex flex-col gap-3">
          {storyState === "loading" && !story && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="animate-spin rounded-full h-3 w-3 border border-zinc-400 border-t-transparent" />
              <span>Loading cultural context…</span>
            </div>
          )}
          {storyState === "error" && (
            <div className="text-xs text-red-700 dark:text-red-300">
              Couldn&apos;t load extra info. {storyError}
            </div>
          )}
          {story?.short_description && (
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50 leading-snug">
              {story.short_description}
            </p>
          )}
          {story && <FactGrid story={story} />}
        </div>
      )}

      {tab === "ingredients" && (
        <IngredientGrid
          dishName={dishName}
          detailed={story?.typical_ingredients_detail ?? []}
          fallback={dbIngredients}
          dbAllergens={dbAllergens}
        />
      )}

      {tab === "regions" && (
        <div className="flex flex-col gap-2">
          {story?.regional_variants && story.regional_variants.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {story.regional_variants.map((v, i) => (
                <li
                  key={i}
                  className="text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-2"
                >
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                    📍 {v.region}
                    {v.name && (
                      <span className="ml-1 text-xs font-normal text-zinc-500">· {v.name}</span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug mt-0.5">
                    {v.distinctive}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs text-zinc-500">No notable regional variants.</div>
          )}
          {story?.visual_match &&
            (story.visual_match.likely_region || story.visual_match.reasoning) && (
              <div className="border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 rounded-lg p-2 text-xs">
                <div className="font-semibold text-amber-900 dark:text-amber-200 mb-0.5">
                  📸 Photo guess
                  {story.visual_match.likely_region && (
                    <span className="ml-1">→ {story.visual_match.likely_region}</span>
                  )}
                  <span className="ml-1 text-zinc-500 font-normal">
                    ({Math.round(story.visual_match.confidence * 100)}%)
                  </span>
                </div>
                <div className="text-zinc-700 dark:text-zinc-300 leading-snug">
                  {story.visual_match.reasoning}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
          : "text-zinc-500"
      }`}
    >
      {children}
    </button>
  );
}

/** Horizontal-scrollable, categorized tag strip — Toss-style chip row. */
function TagStrip({
  spicyLabel,
  category,
  storyTags,
}: {
  spicyLabel: string | null;
  category: string | null;
  storyTags?: import("../types").DishTags;
}) {
  const chips: { label: string; tone: "neutral" | "warm" | "spicy" | "social" }[] = [];
  if (category) chips.push({ label: category, tone: "neutral" });
  if (spicyLabel) chips.push({ label: spicyLabel, tone: "spicy" });
  storyTags?.cuisine?.forEach((c) => chips.push({ label: `# ${c}`, tone: "neutral" }));
  storyTags?.occasion?.forEach((c) => chips.push({ label: `# ${c}`, tone: "warm" }));
  storyTags?.flavor?.forEach((c) => chips.push({ label: `# ${c}`, tone: "neutral" }));
  storyTags?.social?.forEach((c) => chips.push({ label: `# ${c}`, tone: "social" }));

  if (chips.length === 0) return null;

  const tone = (t: string) =>
    t === "spicy"
      ? "bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-200"
      : t === "warm"
      ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200"
      : t === "social"
      ? "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200"
      : "bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300";

  return (
    <div className="flex gap-1 overflow-x-auto -mx-3 px-3 pb-1 scrollbar-none">
      {chips.map((c, i) => (
        <span
          key={i}
          className={`shrink-0 text-[11px] px-2 py-1 rounded-full font-medium whitespace-nowrap ${tone(c.tone)}`}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

/** 2x2 fact card grid — Toss "숫자/한 단어 위계" 스타일. */
function FactGrid({ story }: { story: DishStory }) {
  const fc = story.fact_cards;
  const cards: { icon: string; label: string; value: string | string[] | null | undefined }[] = [
    { icon: "🕐", label: "When", value: fc?.when_eaten },
    { icon: "📜", label: "Origin", value: fc?.origin },
    { icon: "🍶", label: "Pairs with", value: fc?.pairs_with },
    { icon: "💛", label: "Why locals love", value: fc?.why_locals_love_it },
    { icon: "💸", label: "Typical price", value: fc?.typical_price_range_won ? `₩${fc.typical_price_range_won}` : null },
    { icon: "🌡", label: "Served", value: fc?.serving_temp },
  ].filter((c) => {
    if (Array.isArray(c.value)) return c.value.length > 0;
    return !!c.value;
  });

  if (cards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-2.5"
        >
          <div className="flex items-center gap-1 mb-1">
            <span className="text-base leading-none" aria-hidden="true">{c.icon}</span>
            <span className="text-[10px] uppercase tracking-wide text-zinc-500 font-medium">
              {c.label}
            </span>
          </div>
          {Array.isArray(c.value) ? (
            <div className="flex flex-wrap gap-1">
              {c.value.map((v) => (
                <span
                  key={v}
                  className="text-[11px] px-1.5 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                >
                  {v}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 leading-snug">
              {c.value}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function IngredientGrid({
  dishName,
  detailed,
  fallback,
  dbAllergens,
}: {
  dishName: string;
  detailed: IngredientInfo[];
  fallback: string[];
  dbAllergens: string[];
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  // If detailed list is empty, build minimal cards from fallback names.
  const cards: IngredientInfo[] =
    detailed.length > 0
      ? detailed
      : fallback.map((name) => ({
          name_ko: name,
          name_en: null,
          icon: null,
          category: "기타",
          description: "",
          allergen_tags: [],
          diet_flags: [],
        }));

  if (cards.length === 0) {
    return (
      <div className="text-xs text-zinc-500">
        Ingredient detail will appear once loaded.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {cards.map((ing) => {
          const key = ing.name_ko;
          const isOpen = openKey === key;
          const hasAllergen = ing.allergen_tags.length > 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setOpenKey(isOpen ? null : key)}
              aria-expanded={isOpen}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition-colors ${
                isOpen
                  ? "border-zinc-900 dark:border-zinc-50 bg-zinc-50 dark:bg-zinc-900"
                  : hasAllergen
                  ? "border-red-200 dark:border-red-900 bg-red-50/40 dark:bg-red-950/30"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40"
              }`}
            >
              <span className="text-2xl leading-none" aria-hidden="true">
                {ing.icon || "🍽"}
              </span>
              <span className="text-[12px] font-medium text-zinc-900 dark:text-zinc-50 break-keep">
                {ing.name_ko}
              </span>
              {ing.name_en && (
                <span className="text-[10px] text-zinc-500 leading-tight">{ing.name_en}</span>
              )}
              {hasAllergen && (
                <span className="absolute top-1 right-1 text-[9px] font-bold uppercase text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950 rounded-full px-1">
                  ⚠
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Inline detail for selected card */}
      {openKey && (
        <div className="border border-zinc-300 dark:border-zinc-700 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-900">
          {(() => {
            const ing = cards.find((c) => c.name_ko === openKey);
            if (!ing) return null;
            return (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{ing.icon || "🍽"}</span>
                  <div>
                    <div className="font-semibold text-sm">
                      {ing.name_ko}
                      {ing.name_en && (
                        <span className="ml-1 text-xs font-normal text-zinc-500">
                          · {ing.name_en}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                      {ing.category}
                    </div>
                  </div>
                </div>
                {ing.description && (
                  <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 mt-1">
                    {ing.description}
                  </p>
                )}
                {(ing.allergen_tags.length > 0 || ing.diet_flags.length > 0) && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ing.allergen_tags.map((a) => (
                      <span
                        key={`a-${a}`}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 font-medium"
                      >
                        ⚠ {a}
                      </span>
                    ))}
                    {ing.diet_flags.map((d) => (
                      <span
                        key={`d-${d}`}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Allergens summary at bottom */}
      {dbAllergens.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
          <span className="text-[10px] uppercase tracking-wide text-zinc-500 mr-1">
            Dish allergens
          </span>
          {dbAllergens.map((a) => (
            <span
              key={a}
              className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 font-medium"
            >
              {a}
            </span>
          ))}
        </div>
      )}

      {/* unused dishName retained for future per-ingredient story fetch hook */}
      <span className="hidden">{dishName}</span>
    </div>
  );
}
