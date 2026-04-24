-- MenuLens D6: TTS 캐시 테이블
-- Phase 1: Gemini gemini-2.5-flash-preview-tts (24kHz PCM → WAV)
-- 키: sha256(text + voice + lang) → WAV base64 (평균 50KB)

CREATE TABLE IF NOT EXISTS tts_cache (
    id          SERIAL PRIMARY KEY,
    text_hash   TEXT NOT NULL UNIQUE,
    text        TEXT NOT NULL,
    voice_name  TEXT NOT NULL DEFAULT 'Kore',
    language    TEXT NOT NULL DEFAULT 'ko',
    audio_b64   TEXT NOT NULL,          -- WAV base64
    audio_mime  TEXT NOT NULL DEFAULT 'audio/wav',
    size_bytes  INTEGER,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tts_cache_last_used_idx ON tts_cache (last_used_at DESC);
