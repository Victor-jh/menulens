// Persona context for v2 Friendly UI.
// The design prototype hardcoded 4 personas (Yui, Malik, Chen, John). We don't
// need that — our backend takes a real UserProfile and the persona is just used
// for greeting copy + trigger labeling. We synthesize a thin "PersonaContext"
// from the actual profile.

import type { UserProfile } from "../../types";

export interface PersonaContext {
  id: string;            // language code, used as a stable trigger key
  flag: string;          // for the persona-pill chip in the canvas (decorative)
  greetingLang: UserProfile["language"];
  diet: string;          // human-readable summary, e.g. "Pescatarian · no pork"
  // Convenience flags for component logic (mirrors persona.diet/persona.religion)
  isHalal: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
  isPescatarian: boolean;
  allergies: string[];   // raw allergen keys
}

const FLAG: Record<UserProfile["language"], string> = {
  en: "🌐",
  ja: "🇯🇵",
  "zh-Hans": "🇨🇳",
  "zh-Hant": "🇹🇼",
  ko: "🇰🇷",
};

export function makePersona(profile: UserProfile): PersonaContext {
  const labels: string[] = [];
  if (profile.diet) labels.push(profile.diet);
  if (profile.religion) labels.push(profile.religion);
  if (profile.allergies.length > 0)
    labels.push(`${profile.allergies.length} allergy`);
  if (labels.length === 0) labels.push("no restrictions");

  return {
    id: profile.language,
    flag: FLAG[profile.language] ?? "🌐",
    greetingLang: profile.language,
    diet: labels.join(" · "),
    isHalal: profile.religion === "halal",
    isVegan: profile.diet === "vegan",
    isVegetarian: profile.diet === "vegetarian",
    isPescatarian: profile.diet === "pescatarian",
    allergies: profile.allergies ?? [],
  };
}

// Sample persona used by the "Try sample menu" demo flow.
// Matches the existing SAMPLE_PROFILE in MenuLensApp.tsx (Yui · Pescatarian)
// for evidence consistency with proposal §3.3 and §1.2.
export const SAMPLE_PERSONA_DISPLAY_NAME = "Yui";
