"use client";

// ShowStaffV2 — full-screen handoff card the user holds out to restaurant staff.
// Mirrors design/handoff `screens-friendly-2.jsx::ShowStaffFriendly`.
//
// Why this screen exists (it's NEW vs v1):
//   - The 4-second decision ends in an order. v1 stopped at the cart and
//     played TTS through the phone speaker. v2 adds a Korean-text-first card
//     designed to be physically shown to staff — better for noisy rooms,
//     hard-of-hearing staff, and language-shy travelers.
//   - The card includes the order phrase + a Korean note about the user's
//     dietary restriction so staff can answer follow-up questions.
//
// Auto-TTS preserved: the Play button is large and primary; if the item has
// pre-rendered audio (from /analyze), we play it on click.

import { useEffect, useRef, useState } from "react";
import type { AnalyzedItem, UserProfile } from "../../../types";
import { strings } from "../i18n";
import { FR } from "../tokens";

interface Props {
  item: AnalyzedItem;
  profile: UserProfile;
  onBack: () => void;
}

// Localized "what to tell the staff" — based on the user's profile.
function dietaryNote(
  profile: UserProfile,
): { ko: string; en: string } {
  const parts: string[] = [];
  const partsKo: string[] = [];
  if (profile.religion === "halal") {
    parts.push("Halal only — no pork, no alcohol");
    partsKo.push("할랄 음식만 먹어요. 돼지고기·술 안 돼요");
  }
  if (profile.diet === "vegan") {
    parts.push("Vegan — no meat, dairy, egg, fish");
    partsKo.push("비건이에요. 고기·유제품·계란·생선 안 돼요");
  }
  if (profile.diet === "vegetarian") {
    parts.push("Vegetarian — no meat or fish");
    partsKo.push("채식이에요. 고기·생선 안 돼요");
  }
  if (profile.diet === "pescatarian") {
    parts.push("Pescatarian — fish OK, no other meat");
    partsKo.push("어식주의예요. 생선은 OK, 다른 고기는 안 돼요");
  }
  if (profile.allergies.length > 0) {
    parts.push(`Allergic to: ${profile.allergies.join(", ")}`);
    partsKo.push(`알레르기: ${profile.allergies.join(", ")}`);
  }
  if (parts.length === 0) {
    return {
      ko: "특별한 식이 제한 없어요. 추천 부탁드려요!",
      en: "No restrictions. A local recommendation, please!",
    };
  }
  return { ko: partsKo.join(". "), en: parts.join(". ") };
}

export function ShowStaffV2({ item, profile, onBack }: Props) {
  const t = strings(profile.language);
  const note = dietaryNote(profile);
  const phrase = item.order_phrase ?? `${item.name} 하나 주세요`;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioState, setAudioState] = useState<"idle" | "playing">("idle");

  const audioSrc = item.tts_audio_b64
    ? `data:${item.tts_audio_mime ?? "audio/mp3"};base64,${item.tts_audio_b64}`
    : null;

  // Auto-play once on mount if TTS is available (the spec says "Play Korean
  // audio is large and primary"). Mobile browsers may block this without user
  // gesture; if so, the play button is still visible and tappable.
  useEffect(() => {
    if (!audioSrc) return;
    const a = audioRef.current;
    if (!a) return;
    a.play()
      .then(() => setAudioState("playing"))
      .catch(() => {
        /* gesture-blocked; user can still tap the button */
      });
  }, [audioSrc]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (audioState === "playing") {
      a.pause();
      a.currentTime = 0;
      setAudioState("idle");
    } else {
      a.play().then(() => setAudioState("playing")).catch(() => setAudioState("idle"));
    }
  };

  return (
    <div
      className="font-ko relative mx-auto max-w-md"
      style={{
        background: FR.cream,
        color: FR.ink,
        minHeight: "100dvh",
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
        paddingLeft: 18,
        paddingRight: 18,
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onBack}
          className="font-ko"
          style={{ fontSize: 13, fontWeight: 600, color: FR.ink }}
        >
          ← {t.showStaffBack}
        </button>
        <span
          className="font-ko"
          style={{
            fontSize: 11,
            letterSpacing: 1,
            color: FR.pickleText,
            fontWeight: 700,
            padding: "5px 10px",
            background: FR.pickleSoft,
            borderRadius: 99,
          }}
        >
          📝{" "}
          {profile.language === "ko" ? "직원에게" : "FOR STAFF"}
        </span>
        <span style={{ width: 24 }} />
      </div>

      {/* Heading (in user's language) */}
      <div>
        <h1
          className="font-ko"
          style={{
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: -0.5,
            color: FR.ink,
          }}
        >
          {t.showStaffTitle}
        </h1>
        <p
          className="font-ko"
          style={{
            fontSize: 12,
            color: FR.inkSoft,
            marginTop: 6,
          }}
        >
          {profile.language === "ko"
            ? "한 번에 알아보실 거예요"
            : "They'll understand right away"}
        </p>
      </div>

      {/* The handoff card — paper texture, Korean primary, optical rotation */}
      <div
        className="mt-5"
        style={{
          background: "#FFFCF2",
          borderRadius: 18,
          padding: "20px 20px 18px",
          boxShadow:
            "0 20px 40px rgba(0,0,0,0.10), 0 0 0 1px rgba(31,26,20,0.04)",
          transform: "rotate(-1deg)",
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent, transparent 27px, rgba(31,26,20,0.04) 27px, rgba(31,26,20,0.04) 28px)",
        }}
      >
        <div
          className="flex justify-between items-center"
          style={{
            paddingBottom: 8,
            marginBottom: 12,
            borderBottom: `1px dashed ${FR.border}`,
          }}
        >
          <span
            className="font-ko"
            style={{ fontSize: 11, color: FR.muted, fontWeight: 600 }}
          >
            📝 직원분께
          </span>
          <span
            className="font-ko"
            style={{
              padding: "3px 9px",
              borderRadius: 99,
              background: FR.pickleSoft,
              fontSize: 10,
              color: FR.pickleText,
              fontWeight: 700,
            }}
          >
            🥒 안전 메뉴
          </span>
        </div>

        {/* PRIMARY: Korean phrase, large */}
        <div
          className="font-ko"
          style={{
            fontSize: 28,
            lineHeight: 1.25,
            color: FR.ink,
            fontWeight: 800,
            letterSpacing: -0.5,
          }}
        >
          {phrase}
        </div>
        {item.translated && (
          <div
            className="font-ko"
            style={{
              fontSize: 13,
              color: FR.inkSoft,
              marginTop: 6,
              fontStyle: "italic",
            }}
          >
            “{item.translated}{" "}
            {profile.language === "ko" ? "하나 주세요" : "please"}”
          </div>
        )}

        {/* Important note about dietary restrictions */}
        <div
          className="mt-4"
          style={{
            padding: "12px 14px",
            background: FR.honeySoft,
            borderRadius: 12,
            border: `1px solid ${FR.honey}33`,
          }}
        >
          <div
            className="font-ko"
            style={{
              fontSize: 11,
              color: FR.honeyText,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            ⚠️ 꼭 알려주세요
          </div>
          <div
            className="font-ko"
            style={{
              fontSize: 15,
              lineHeight: 1.4,
              color: FR.ink,
              fontWeight: 600,
              letterSpacing: -0.3,
            }}
          >
            {note.ko}
          </div>
          <div
            className="font-ko"
            style={{
              fontSize: 11,
              color: FR.inkSoft,
              marginTop: 6,
              fontStyle: "italic",
            }}
          >
            {note.en}
          </div>
        </div>

        {/* Footer credit */}
        <div
          className="flex justify-between mt-4"
          style={{
            paddingTop: 10,
            borderTop: `1px dashed ${FR.border}`,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            color: FR.muted,
            letterSpacing: 0.5,
          }}
        >
          <span>via MenuLens</span>
          <span>{item.romanization || ""}</span>
        </div>
      </div>

      {/* TTS primary action */}
      {audioSrc && (
        <button
          type="button"
          onClick={togglePlay}
          className="font-ko mt-6 w-full active:scale-[0.99]"
          style={{
            height: 56,
            borderRadius: 14,
            border: "none",
            background: FR.pickleStrong,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            boxShadow: `0 6px 18px ${FR.pickle}50`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {audioState === "playing"
            ? `🔊 ${profile.language === "ko" ? "재생 중…" : "Playing…"}`
            : t.showStaffPlay}
        </button>
      )}

      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onEnded={() => setAudioState("idle")}
          onError={() => setAudioState("idle")}
        />
      )}
    </div>
  );
}
