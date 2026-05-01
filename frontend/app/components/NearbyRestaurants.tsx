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

// Geo source for the current center. Drives the secondary status line.
//   "fallback" — no cache, no GPS yet → using Seoul City Hall
//   "cache"    — using last-known coords from localStorage (≤1h old)
//   "gps"      — fresh getCurrentPosition() reading
type GeoSource = "fallback" | "cache" | "gps";

interface Center {
  lat: number;
  lon: number;
  source: GeoSource;
}

interface Props {
  language: string;
}

function formatRadius(m: number): string {
  return m >= 1000 ? `${m / 1000}km` : `${m}m`;
}

// localStorage geo cache — survives reloads, 1h TTL. Eliminates the GPS
// cold-fix wait (1~3s on phones) for repeat visits within the hour.
const GEO_CACHE_KEY = "menulens.geo.v1";
const GEO_CACHE_TTL_MS = 60 * 60 * 1000;

interface GeoCache {
  lat: number;
  lon: number;
  ts: number;
}

function loadCachedGeo(): GeoCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeoCache;
    if (Date.now() - parsed.ts > GEO_CACHE_TTL_MS) return null;
    if (typeof parsed.lat !== "number" || typeof parsed.lon !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCachedGeo(lat: number, lon: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ lat, lon, ts: Date.now() }));
  } catch {
    /* quota etc. — silent */
  }
}

// Haversine — used to decide whether a fresh GPS reading is meaningfully
// different from the cached one (refetch threshold).
function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Background GPS request. Resolves null on denial/timeout — caller already
// has a valid (cache or fallback) center, so failure is silent.
function requestFreshGeo(timeoutMs = 2500): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const v = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        saveCachedGeo(v.lat, v.lon);
        resolve(v);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(null);
      },
      { timeout: timeoutMs, enableHighAccuracy: false, maximumAge: 600_000 }
    );
  });
}

export function NearbyRestaurants({ language }: Props) {
  // INITIAL CENTER (sync) — lifts the GPS wait out of the user's wall-clock:
  //   - cached → use it immediately (status: "cache")
  //   - else  → Seoul City Hall fallback (status: "fallback")
  // Backend fetch fires off this on the first paint, so the user sees
  // results in ~1.7s instead of 5+s waiting for GPS prompt/lock.
  const [center, setCenter] = useState<Center>(() => {
    const cached = loadCachedGeo();
    if (cached) return { lat: cached.lat, lon: cached.lon, source: "cache" };
    return { ...SEOUL_CITY_HALL, source: "fallback" };
  });
  const [data, setData] = useState<NearbyResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [radius, setRadius] = useState(500);
  const [geoBusy, setGeoBusy] = useState(false);

  // Hand-rolled GPS refresh — exposed via a button so denial/timeout doesn't
  // permanently lock the user out, and so curious users can opt in.
  const tryFreshGps = async () => {
    setGeoBusy(true);
    const g = await requestFreshGeo(2500);
    setGeoBusy(false);
    if (!g) return;
    // If meaningfully different (>100m), refetch; otherwise just upgrade source.
    setCenter((prev) => {
      const d = distanceMeters(prev, g);
      if (prev.source !== "fallback" && d < 100) {
        return { ...prev, source: "gps" };
      }
      return { lat: g.lat, lon: g.lon, source: "gps" };
    });
  };

  // Background-fire fresh GPS once on mount. Silent on failure; ~2.5s timeout.
  useEffect(() => {
    let cancelled = false;
    requestFreshGeo(2500).then((g) => {
      if (cancelled || !g) return;
      setCenter((prev) => {
        const d = distanceMeters(prev, g);
        if (prev.source !== "fallback" && d < 100) {
          return { ...prev, source: "gps" };
        }
        return { lat: g.lat, lon: g.lon, source: "gps" };
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch on center / radius / language change. Center.source is excluded
  // from deps so a "cache → gps with ≤100m delta" upgrade doesn't refetch.
  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    fetchNearbyRestaurants(center.lat, center.lon, language, radius, 8).then((r) => {
      if (cancelled) return;
      setData(r);
      setBusy(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lon, language, radius]);

  const usingFallback = center.source === "fallback";
  const usingCache = center.source === "cache";
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

      <div className="flex items-center justify-between gap-2 text-xs">
        {usingFallback && (
          <span className="text-amber-700 dark:text-amber-400">
            서울시청 기준 (위치 미허용)
          </span>
        )}
        {usingCache && (
          <span className="text-zinc-500">📍 최근 위치 사용 중 · 1시간 캐시</span>
        )}
        {center.source === "gps" && (
          <span className="text-emerald-700 dark:text-emerald-400">📍 현재 위치</span>
        )}
        <button
          type="button"
          onClick={tryFreshGps}
          disabled={geoBusy}
          className="ml-auto rounded-md px-2 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 disabled:opacity-50 underline-offset-2 hover:underline"
          aria-label="현재 위치로 다시 가져오기"
        >
          {geoBusy ? "위치 확인 중…" : "📍 다시 가져오기"}
        </button>
      </div>

      {busy && <p className="text-xs text-zinc-500">불러오는 중…</p>}

      {!busy && data?.status === "missing_key" && (
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3 text-xs text-zinc-600 dark:text-zinc-400">
          🔑 TourAPI 활용신청 대기 중 — 키 등록 후 자동으로 식당이 표시됩니다.
        </div>
      )}

      {!busy && data?.status === "upstream_error" && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-200">
          🛰️ 관광 데이터 (TourAPI) 일시 응답 지연. 잠시 후 자동 재시도됩니다.
        </div>
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
