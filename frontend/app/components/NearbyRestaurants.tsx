"use client";

import { useEffect, useState } from "react";
import type {
  NearbyResponse,
  NearbyRestaurant,
  RestaurantDetail,
} from "../types";
import { fetchNearbyRestaurants, fetchRestaurantDetail } from "../lib/api";

// Seoul City Hall — used when geolocation is unavailable / denied.
// Falls inside the backend's Korea bounding box check.
const SEOUL_CITY_HALL = { lat: 37.5665, lon: 126.978 };

const RADIUS_PRESETS = [300, 500, 1000, 2000];

// KTO category code → human-readable cuisine label (Korean).
const CAT3_LABEL: Record<string, string> = {
  A05020100: "한식",
  A05020200: "양식",
  A05020300: "일식",
  A05020400: "중식",
  A05020700: "이색음식점",
  A05020900: "카페·전통찻집",
};

type GeoState =
  | { kind: "loading" }
  | { kind: "gps"; lat: number; lon: number }
  | { kind: "fallback"; lat: number; lon: number; reason: "no-api" | "denied" | "timeout" };

interface Props {
  language: string;
}

function formatRadius(m: number): string {
  return m >= 1000 ? `${m / 1000}km` : `${m}m`;
}

function resolveGeo(): Promise<GeoState> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ kind: "fallback", ...SEOUL_CITY_HALL, reason: "no-api" });
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ kind: "fallback", ...SEOUL_CITY_HALL, reason: "timeout" });
    }, 5000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          kind: "gps",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ kind: "fallback", ...SEOUL_CITY_HALL, reason: "denied" });
      },
      { timeout: 5000, enableHighAccuracy: false, maximumAge: 60_000 }
    );
  });
}

export function NearbyRestaurants({ language }: Props) {
  const [geo, setGeo] = useState<GeoState>({ kind: "loading" });
  const [data, setData] = useState<NearbyResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [radius, setRadius] = useState(500);

  useEffect(() => {
    let cancelled = false;
    resolveGeo().then((g) => {
      if (!cancelled) setGeo(g);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (geo.kind === "loading") return;
    let cancelled = false;
    setBusy(true);
    fetchNearbyRestaurants(geo.lat, geo.lon, language, radius, 8).then((r) => {
      if (cancelled) return;
      setData(r);
      setBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [geo, language, radius]);

  const usingFallback = geo.kind === "fallback";
  const items = data?.items ?? [];

  return (
    <section
      aria-label="Nearby restaurants"
      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-base flex items-center gap-1">
          <span aria-hidden="true">📍</span>
          <span>Nearby restaurants</span>
          <span className="text-xs font-normal text-zinc-500 ml-1">
            · {formatRadius(radius)}
          </span>
        </h2>
        <div className="flex gap-1 text-[11px]">
          {RADIUS_PRESETS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadius(r)}
              aria-pressed={r === radius}
              className={
                r === radius
                  ? "rounded-md px-2 py-1 bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900 font-medium"
                  : "rounded-md px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }
            >
              {formatRadius(r)}
            </button>
          ))}
        </div>
      </div>

      {geo.kind === "loading" && (
        <p className="text-xs text-zinc-500">위치 확인 중…</p>
      )}

      {usingFallback && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {geo.reason === "denied"
            ? "위치 권한 미허용 · 서울시청 기준"
            : geo.reason === "timeout"
            ? "위치 응답 지연 · 서울시청 기준"
            : "위치 API 미지원 · 서울시청 기준"}
        </p>
      )}

      {busy && <p className="text-xs text-zinc-500">불러오는 중…</p>}

      {!busy && data?.status === "missing_key" && (
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3 text-xs text-zinc-600 dark:text-zinc-400">
          🔑 TourAPI 활용신청 대기 중 — 키 등록 후 자동으로 식당이 표시됩니다.
        </div>
      )}

      {!busy && data?.status === "upstream_error" && (
        <p className="text-xs text-red-600 dark:text-red-400">
          관광 데이터 일시 오류
          {data.message ? ` · ${data.message.slice(0, 80)}` : ""}
        </p>
      )}

      {!busy && data?.status === "no_results" && (
        <p className="text-xs text-zinc-500">
          반경 내 등록된 식당이 없습니다. 반경을 넓혀보세요.
        </p>
      )}

      {items.length > 0 && (
        <ul
          className="-mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1"
          role="list"
        >
          {items.map((r) => (
            <RestaurantCard key={r.content_id} r={r} language={language} />
          ))}
        </ul>
      )}

      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
        Source: 한국관광공사 TourAPI 4.0 ·{" "}
        <span className="font-medium">
          {data?.source === "lod" ? "LOD SPARQL" : data?.source === "openapi" ? "OpenAPI" : "—"}
        </span>{" "}
        · {data?.total_count ?? 0} found
      </p>
    </section>
  );
}

function RestaurantCard({
  r,
  language,
}: {
  r: NearbyRestaurant;
  language: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<RestaurantDetail | null>(null);
  const [loaded, setLoaded] = useState(false);

  const onToggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) {
      const d = await fetchRestaurantDetail(r.content_id, language);
      setDetail(d);
      setLoaded(true);
    }
  };

  const thumb = r.first_image_thumbnail || r.first_image;

  return (
    <li className="snap-start shrink-0 w-56 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 flex flex-col">
      {thumb ? (
        // TourAPI delivers absolute https URLs; backend doesn't proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt=""
          className="w-full h-28 object-cover bg-zinc-100 dark:bg-zinc-800"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-28 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-3xl">
          🍽️
        </div>
      )}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-zinc-900 dark:text-zinc-50">
          {r.title}
        </h3>
        {r.cat3 && CAT3_LABEL[r.cat3] && (
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">
            {CAT3_LABEL[r.cat3]}
          </span>
        )}
        <p className="text-xs text-zinc-500 line-clamp-1">{r.addr}</p>
        <div className="flex justify-between items-center pt-1 mt-auto">
          <span className="text-[11px] rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-zinc-700 dark:text-zinc-300">
            {r.distance_m != null ? `${r.distance_m}m` : "—"}
          </span>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="text-xs text-zinc-700 dark:text-zinc-300 hover:underline focus-visible:underline"
          >
            {expanded ? "접기" : "Details"}
          </button>
        </div>
        {expanded && (
          <div className="pt-2 mt-1 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 flex flex-col gap-0.5">
            {!loaded && <span>로드 중…</span>}
            {loaded && !detail && <span>상세 정보 없음</span>}
            {detail?.operating_hours && (
              <div>⏰ {detail.operating_hours}</div>
            )}
            {detail?.info_center && <div>📞 {detail.info_center}</div>}
            {detail?.parking && <div>🅿️ {detail.parking}</div>}
            {detail?.signature_menu && <div>⭐ {detail.signature_menu}</div>}
            {detail?.rest_date && <div>휴무 · {detail.rest_date}</div>}
          </div>
        )}
      </div>
    </li>
  );
}
