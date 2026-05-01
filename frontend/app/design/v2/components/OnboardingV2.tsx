"use client";

// OnboardingV2 — Friendly (Pickle Plus) tone. Mirrors design/handoff
// `screens-friendly-1.jsx::OnboardingFriendly` but retains:
//   - Sample-menu 1-click CTA (evaluator entry)
//   - Personalize toggle (allergies/diet/religion)  → progressive disclosure
//   - i18n strings for all 5 languages (Yui/Aisha/etc.)
// Visual difference vs v1:
//   - Cream background (#FFF8EE) + Pretendard font for KR
//   - 3-row signal preview rows (🥒/🤔/✋) with sub-labels
//   - Pickle-green primary CTA with glow shadow

import { useState } from "react";
import type { UserProfile } from "../../../types";
import { ALLERGEN_OPTIONS } from "../../../types";
import { strings } from "../i18n";
import { FR, FR_TONE } from "../tokens";
import { makePersona } from "../personas";

interface Props {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  onNext: () => void;
  onSample: () => void;
  sampleBusy: boolean;
  sampleError: string | null;
  onSkip: () => void;
}

export function OnboardingV2({
  profile,
  setProfile,
  onNext,
  onSample,
  sampleBusy,
  sampleError,
  onSkip,
}: Props) {
  const t = strings(profile.language);
  const persona = makePersona(profile);
  const [showCustomize, setShowCustomize] = useState(
    profile.allergies.length > 0 || profile.diet !== "" || profile.religion !== "",
  );
  const customized =
    profile.allergies.length > 0 || profile.diet !== "" || profile.religion !== "";

  const toggleAllergen = (key: string) => {
    const has = profile.allergies.includes(key);
    setProfile({
      ...profile,
      allergies: has
        ? profile.allergies.filter((a) => a !== key)
        : [...profile.allergies, key],
    });
  };

  return (
    <div
      className="font-ko relative overflow-hidden mx-auto max-w-md"
      style={{
        background: FR.cream,
        color: FR.ink,
        minHeight: "100dvh",
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      {/* Index label */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            letterSpacing: 1.4,
            color: FR.muted,
          }}
        >
          01 / START
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.3 }}>
          🥒 MenuLens
        </span>
      </div>

      {/* Hero */}
      <div className="mt-7">
        <div style={{ fontSize: 46, lineHeight: 1 }}>👋</div>
        <h1
          className="font-ko"
          style={{
            fontSize: 32,
            fontWeight: 800,
            lineHeight: 1.18,
            letterSpacing: -1,
            color: FR.ink,
            marginTop: 12,
          }}
        >
          {profile.language === "ko" ? (
            <>
              한글 메뉴판,<br />
              <span style={{ color: FR.pickleText }}>대신 읽어드릴게요</span>
            </>
          ) : profile.language === "ja" ? (
            <>
              ハングルのメニュー、<br />
              <span style={{ color: FR.pickleText }}>代わりに読みます</span>
            </>
          ) : profile.language === "zh-Hans" ? (
            <>
              韩文菜单,<br />
              <span style={{ color: FR.pickleText }}>我帮您读</span>
            </>
          ) : profile.language === "zh-Hant" ? (
            <>
              韓文菜單,<br />
              <span style={{ color: FR.pickleText }}>我幫您讀</span>
            </>
          ) : (
            <>
              Korean menu?<br />
              <span style={{ color: FR.pickleText }}>We&apos;ll read it for you</span>
            </>
          )}
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: FR.inkSoft,
            marginTop: 14,
            maxWidth: 280,
          }}
        >
          {profile.language === "ko"
            ? "사진만 찍으면 뭘 먹어도 되는지, 뭘 물어봐야 하는지 알려드려요"
            : profile.language === "ja"
              ? "写真を撮るだけで、食べられる/聞くべきものが分かります"
              : profile.language === "zh-Hans"
                ? "拍张照,告诉您哪些可以吃、哪些要问"
                : profile.language === "zh-Hant"
                  ? "拍張照,告訴您哪些可以吃、哪些要問"
                  : "Snap a photo. We tell you what's safe and what to ask."}
        </p>
      </div>

      {/* 3 signal preview rows */}
      <div className="mt-6 flex flex-col gap-2">
        <SignalRow color="green" label={t.signalGreen} subKo="안전한 메뉴" />
        <SignalRow color="yellow" label={t.signalYellow} subKo="확인 필요" />
        <SignalRow color="red" label={t.signalRed} subKo="피해야 할 메뉴" />
      </div>

      {/* Primary CTA: Sample (preserves D9 evaluator entry) */}
      <button
        type="button"
        onClick={onSample}
        disabled={sampleBusy}
        className="font-ko w-full mt-6 disabled:cursor-wait active:scale-[0.99]"
        style={{
          height: 54,
          borderRadius: 14,
          border: "none",
          background: FR.pickleStrong,
          color: "#fff",
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: -0.3,
          boxShadow: `0 6px 18px ${FR.pickle}50`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: sampleBusy ? 0.7 : 1,
        }}
      >
        {sampleBusy ? (
          <>
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "#fff",
                animation: "spin 1s linear infinite",
              }}
            />
            {profile.language === "ko"
              ? "샘플 분석 중…"
              : "Analyzing sample…"}
          </>
        ) : profile.language === "ko" ? (
          "▶ 샘플 메뉴판 체험"
        ) : profile.language === "ja" ? (
          "▶ サンプルを試す"
        ) : (
          "▶ Try a sample menu"
        )}
      </button>
      {sampleError && (
        <div
          role="alert"
          className="mt-2 rounded-lg p-3 text-sm"
          style={{
            background: FR.blushSoft,
            color: FR.blushText,
            border: `1px solid ${FR.blush}40`,
          }}
        >
          {sampleError}
        </div>
      )}

      {/* Secondary actions */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="font-ko active:scale-[0.99]"
          style={{
            height: 48,
            borderRadius: 14,
            border: `1px solid ${FR.border}`,
            background: FR.cream2,
            color: FR.ink,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          📷{" "}
          {profile.language === "ko"
            ? "직접 찍기"
            : profile.language === "ja"
              ? "自分で撮る"
              : "Snap my own"}
        </button>
        <button
          type="button"
          onClick={() => setShowCustomize((v) => !v)}
          aria-expanded={showCustomize}
          className="font-ko active:scale-[0.99]"
          style={{
            height: 48,
            borderRadius: 14,
            border: `1px solid ${customized ? FR.pickle : FR.border}`,
            background: customized ? FR.pickleSoft : FR.cream2,
            color: customized ? FR.pickle : FR.ink,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ⚙{" "}
          {profile.language === "ko"
            ? "내 정보"
            : profile.language === "ja"
              ? "プロフィール"
              : "Personalize"}
          {customized && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                background: FR.pickleStrong,
                color: "#fff",
                padding: "2px 6px",
                borderRadius: 99,
              }}
            >
              {profile.allergies.length +
                (profile.diet ? 1 : 0) +
                (profile.religion ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Persona summary card */}
      <div
        className="mt-4 flex items-center gap-3 px-4 py-3"
        style={{
          background: FR.cream2,
          border: `1px solid ${FR.border}`,
          borderRadius: 16,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: FR.pickleSoft,
            display: "grid",
            placeItems: "center",
            fontSize: 16,
            fontWeight: 700,
            color: FR.pickleText,
          }}
        >
          {persona.flag}
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13, color: FR.ink, fontWeight: 700 }}>
            {profile.language.toUpperCase()}
          </div>
          <div
            style={{
              fontSize: 11,
              color: FR.muted,
              marginTop: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {persona.diet}
          </div>
        </div>
      </div>

      {/* Collapsible customize form */}
      {showCustomize && (
        <div
          className="mt-4 flex flex-col gap-4 p-4"
          style={{
            background: FR.cream2,
            border: `1px solid ${FR.border}`,
            borderRadius: 16,
          }}
        >
          <Field label="Language">
            <select
              className="w-full font-ko"
              value={profile.language}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  language: e.target.value as UserProfile["language"],
                })
              }
              style={{
                background: FR.cream,
                border: `1px solid ${FR.border}`,
                borderRadius: 10,
                padding: "10px 12px",
                color: FR.ink,
                fontSize: 14,
              }}
            >
              <option value="en">English</option>
              <option value="ja">日本語</option>
              <option value="zh-Hans">中文 (简)</option>
              <option value="zh-Hant">中文 (繁)</option>
              <option value="ko">한국어</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={profile.religion}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  religion: e.target.value as UserProfile["religion"],
                })
              }
              className="font-ko"
              style={{
                background: FR.cream,
                border: `1px solid ${FR.border}`,
                borderRadius: 10,
                padding: "10px 12px",
                color: FR.ink,
                fontSize: 13,
              }}
            >
              <option value="">No religion filter</option>
              <option value="halal">Halal</option>
              <option value="kosher">Kosher (info only)</option>
            </select>
            <select
              value={profile.diet}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  diet: e.target.value as UserProfile["diet"],
                })
              }
              className="font-ko"
              style={{
                background: FR.cream,
                border: `1px solid ${FR.border}`,
                borderRadius: 10,
                padding: "10px 12px",
                color: FR.ink,
                fontSize: 13,
              }}
            >
              <option value="">No diet filter</option>
              <option value="vegan">Vegan</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="pescatarian">Pescatarian</option>
            </select>
          </div>
          <div>
            <div
              className="font-ko"
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: FR.inkSoft,
                marginBottom: 8,
              }}
            >
              Allergies
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {ALLERGEN_OPTIONS.map((a) => {
                const on = profile.allergies.includes(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => toggleAllergen(a.key)}
                    className="font-ko text-left"
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 600,
                      background: on ? FR.blushSoft : FR.cream,
                      color: on ? FR.blush : FR.inkSoft,
                      border: `1px solid ${on ? FR.blush : FR.border}`,
                    }}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={onNext}
            className="font-ko"
            style={{
              height: 48,
              borderRadius: 12,
              border: "none",
              background: FR.ink,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {t.btnAnotherPhoto.replace("📷 ", "📷 ")}{" "}
            {profile.language === "ko"
              ? "메뉴판 찍으러 가기"
              : profile.language === "ja"
                ? "メニューを撮りに"
                : "Take a menu photo"}
          </button>
        </div>
      )}

      {/* Footer credit */}
      <p
        className="font-ko"
        style={{
          fontSize: 11,
          color: FR.muted,
          textAlign: "center",
          marginTop: 18,
        }}
      >
        2026 한국관광공사 관광데이터 활용 공모전 · 시연용 PoC
      </p>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

function SignalRow({
  color,
  label,
  subKo,
}: {
  color: "green" | "yellow" | "red";
  label: string;
  subKo: string;
}) {
  const tone = FR_TONE[color];
  return (
    <div
      style={{
        background: FR.cream2,
        border: `1px solid ${FR.border}`,
        borderRadius: 14,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: tone.soft,
          display: "grid",
          placeItems: "center",
          fontSize: 18,
        }}
      >
        {tone.emoji}
      </div>
      <div className="flex-1">
        <div
          className="font-ko"
          style={{ fontSize: 14, fontWeight: 700, color: FR.ink }}
        >
          {label}
        </div>
        <div
          className="font-ko"
          style={{ fontSize: 11, color: FR.muted, marginTop: 1 }}
        >
          {subKo}
        </div>
      </div>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: tone.c,
        }}
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: FR.inkSoft,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
