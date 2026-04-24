import type { AnalyzeResponse, UserProfile } from "../types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as AnalyzeResponse;
}
