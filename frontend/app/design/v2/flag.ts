// Feature flag for v2 (Friendly redesign) UI.
//
// Default OFF. Set NEXT_PUBLIC_UI_VERSION=v2 in Vercel env (or .env.local for dev)
// to ship the redesign. Per-screen rollout is tracked at the component call site:
// each screen reads `useUiV2()` and chooses its renderer.
//
// Why a runtime flag (not git branch):
// - Lets us deploy adapter + tokens immediately (zero user-visible change) and
//   flip per-screen as each lands. If any screen breaks, flag-flip back to v1
//   without a redeploy (env var update + invalidation).
// - Survives Vercel preview URLs — preview can run v2 while production runs v1.

// Trim defensive: `echo "v2" | vercel env add` stores "v2\n" — strict
// equality would fail. Strip whitespace and lowercase before comparing.
const VAL = (process.env.NEXT_PUBLIC_UI_VERSION ?? "").trim().toLowerCase();

export const UI_VERSION: "v1" | "v2" = VAL === "v2" ? "v2" : "v1";

export function useUiV2(): boolean {
  return UI_VERSION === "v2";
}
