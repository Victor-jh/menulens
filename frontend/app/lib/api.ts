import type {
  AnalyzeResponse,
  DishStory,
  ReviewIn,
  ReviewOut,
  ReviewSubmitResponse,
  UserProfile,
} from "../types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TIMEOUT_MS = 90_000; // backend Gemini timeout = 60s, allow margin for network

export async function analyzeMenu(
  imageFile: File,
  profile: UserProfile
): Promise<AnalyzeResponse> {
  const fd = new FormData();
  fd.append("image", imageFile);
  fd.append("language", profile.language);
  fd.append("allergies", profile.allergies.join(","));
  if (profile.religion) fd.append("religion", profile.religion);
  if (profile.diet) fd.append("diet", profile.diet);

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      body: fd,
      signal: ctl.signal,
      // Don't try to be clever with credentials/cache on multipart.
      cache: "no-store",
    });
  } catch (e) {
    clearTimeout(timer);
    const err = e as { name?: string; message?: string };
    if (err.name === "AbortError") {
      throw new Error("분석이 너무 오래 걸려요. Wi-Fi 연결을 확인하고 다시 시도해주세요.");
    }
    // TypeError on iOS Safari = network unreachable / CORS / DNS / cert.
    throw new Error(
      `네트워크 오류: ${err.message || "fetch 실패"}\n` +
      `백엔드(${API_BASE})에 연결할 수 없어요. 같은 Wi-Fi인지 확인해주세요.`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`서버 응답 오류 ${res.status}: ${text.slice(0, 200) || res.statusText}`);
  }
  return (await res.json()) as AnalyzeResponse;
}

export interface TTSResp {
  text: string;
  audio_b64: string;
  audio_mime: string;
  cached: boolean;
}

export interface FxResult {
  ccy: string;
  amount: number;
  rate: number;
  symbol: string;
}

export async function fetchFx(krw: number, language: string): Promise<FxResult | null> {
  if (krw <= 0) return null;
  try {
    const url = `${API_BASE}/fx?krw=${krw}&language=${encodeURIComponent(language)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as FxResult;
  } catch {
    return null;
  }
}

export async function fetchTTS(
  text: string,
  language = "ko"
): Promise<TTSResp> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 30_000);
  try {
    const res = await fetch(`${API_BASE}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
      signal: ctl.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`TTS ${res.status}: ${t.slice(0, 160) || res.statusText}`);
    }
    return (await res.json()) as TTSResp;
  } finally {
    clearTimeout(timer);
  }
}

export async function submitReview(payload: ReviewIn): Promise<ReviewSubmitResponse> {
  const res = await fetch(`${API_BASE}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Review ${res.status}: ${t.slice(0, 160) || res.statusText}`);
  }
  return (await res.json()) as ReviewSubmitResponse;
}

export async function fetchRecentReviews(limit = 10): Promise<ReviewOut[]> {
  const res = await fetch(`${API_BASE}/reviews/recent?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()) as ReviewOut[];
}

export async function fetchStory(
  nameKo: string,
  language: string,
  imageFile?: File | null
): Promise<DishStory> {
  const fd = new FormData();
  fd.append("name_ko", nameKo);
  fd.append("language", language);
  if (imageFile) fd.append("image", imageFile);

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 30_000);
  try {
    const res = await fetch(`${API_BASE}/story`, {
      method: "POST",
      body: fd,
      signal: ctl.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Story ${res.status}: ${text.slice(0, 160) || res.statusText}`);
    }
    return (await res.json()) as DishStory;
  } finally {
    clearTimeout(timer);
  }
}
