"use client";

// RestaurantsServingThisDish — Hermes Phase 2 carousel.
// When image_classifier detects single_dish + main_dish_ko, this section
// queries LOD `?s ktop:bestMenu ?dish` (reverse) and shows up to 8 restaurants
// that registered the dish as their signature menu. Closes the food-photo
// → restaurant decision loop.
import { useEffect, useState } from "react";

import {
  fetchRestaurantsByDish,
  type DishFinderResponse,
} from "../../../../lib/api";
import { FR } from "../../tokens";

export function RestaurantsServingThisDish({
  dishKo,
  language,
}: {
  dishKo: string;
  language: string;
}) {
  const [data, setData] = useState<DishFinderResponse | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    fetchRestaurantsByDish(dishKo, language, 8).then((r) => {
      if (cancelled) return;
      setData(r);
      setBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [dishKo, language]);

  const items = data?.items ?? [];
  const headerKo = `🍽 "${dishKo}"을(를) 시그니처로 등록한 식당`;
  const headerEn = `🍽 Restaurants that serve "${dishKo}" as a signature dish`;

  return (
    <section
      aria-label={
        language === "ko" ? "이 음식 파는 식당" : "Where to eat this dish"
      }
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: FR.cream2, border: `1px solid ${FR.border}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          className="font-ko"
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: FR.ink,
            letterSpacing: -0.3,
            lineHeight: 1.4,
          }}
        >
          {language === "ko" ? headerKo : headerEn}
        </h2>
      </div>

      <div
        className="font-ko"
        style={{
          fontSize: 10,
          color: FR.muted,
          fontFamily: '"JetBrains Mono", monospace',
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {language === "ko"
          ? "Hermes Phase 2 · LOD ktop:bestMenu 역방향 쿼리"
          : "Hermes Phase 2 · LOD ktop:bestMenu reverse query"}
      </div>

      {busy && (
        <ul
          aria-label={language === "ko" ? "식당 검색 중" : "Loading restaurants"}
          className="-mx-4 px-4 flex gap-3 overflow-x-hidden"
          role="list"
        >
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="snap-start shrink-0 w-56 rounded-xl overflow-hidden animate-pulse"
              style={{
                background: FR.cream,
                border: `1px solid ${FR.border}`,
              }}
            >
              <div
                className="w-full h-28"
                style={{ background: "rgba(31,26,20,0.06)" }}
              />
              <div className="p-3 flex flex-col gap-2">
                <div
                  className="h-3 w-3/4 rounded"
                  style={{ background: "rgba(31,26,20,0.08)" }}
                />
                <div
                  className="h-2 w-1/2 rounded"
                  style={{ background: "rgba(31,26,20,0.06)" }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!busy && data?.status === "upstream_error" && (
        <div
          className="font-ko rounded-xl p-3"
          style={{
            background: "rgba(244,198,116,0.18)",
            border: `1px solid rgba(244,198,116,0.5)`,
            color: "#7A4F11",
            fontSize: 12,
          }}
        >
          {language === "ko"
            ? "🛰️ 관광 데이터 (TourAPI LOD) 일시 응답 지연. 잠시 후 다시 시도해주세요."
            : "🛰️ TourAPI LOD service is briefly unavailable. Please try again shortly."}
        </div>
      )}

      {!busy && data?.status === "no_results" && (
        <p
          className="font-ko"
          style={{ fontSize: 12, color: FR.muted }}
        >
          {language === "ko"
            ? `'${dishKo}'을(를) 시그니처로 등록한 식당이 LOD에 없어요.`
            : `No restaurant has registered '${dishKo}' as a signature dish in LOD yet.`}
        </p>
      )}

      {items.length > 0 && (
        <ul
          className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1"
          role="list"
        >
          {items.map((r) => (
            <li
              key={r.content_id}
              className="snap-start shrink-0 w-56 rounded-xl overflow-hidden flex flex-col"
              style={{
                background: FR.cream,
                border: `1px solid ${FR.border}`,
              }}
            >
              {r.first_image_thumbnail || r.first_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.first_image_thumbnail || r.first_image || ""}
                  alt=""
                  loading="lazy"
                  className="w-full h-28 object-cover"
                  style={{ background: "rgba(31,26,20,0.04)" }}
                />
              ) : (
                <div
                  className="w-full h-28 flex items-center justify-center"
                  style={{ background: "rgba(31,26,20,0.04)", fontSize: 28 }}
                >
                  🍽️
                </div>
              )}
              <div className="p-3 flex flex-col gap-1 flex-1">
                <h3
                  className="font-ko"
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: FR.ink,
                    lineHeight: 1.3,
                  }}
                >
                  {r.title}
                </h3>
                {r.best_menu && (
                  <span
                    className="font-ko"
                    style={{
                      fontSize: 10,
                      color: FR.pickleText,
                      fontWeight: 600,
                    }}
                  >
                    ⭐ {r.best_menu.slice(0, 30)}
                  </span>
                )}
                <p
                  className="font-ko"
                  style={{
                    fontSize: 11,
                    color: FR.muted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.addr || ""}
                </p>
                {r.distance_m != null && (
                  <span
                    className="font-ko mt-auto"
                    style={{
                      fontSize: 10,
                      color: FR.inkSoft,
                      fontFamily: '"JetBrains Mono", monospace',
                    }}
                  >
                    {r.distance_m >= 1000
                      ? `${(r.distance_m / 1000).toFixed(1)}km`
                      : `${r.distance_m}m`}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
