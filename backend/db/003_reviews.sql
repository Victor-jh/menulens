-- MenuLens D8+: 외국인 한식 리뷰 수집
-- Phase 1 (PoC): 익명 수집, 룰렛 보상 mock
-- Phase 2: 실제 보상 발급, Threads 연동, 분석 대시보드

CREATE TABLE IF NOT EXISTS reviews (
    id              SERIAL PRIMARY KEY,
    dish_name       TEXT NOT NULL,
    dish_name_en    TEXT,
    rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),

    -- 원문 + 자동 번역 4개
    comment         TEXT,
    comment_ko      TEXT,
    comment_en      TEXT,
    comment_ja      TEXT,
    comment_zh      TEXT,

    -- LLM 자동 분류 (data activation 핵심)
    sentiment       TEXT CHECK (sentiment IN ('positive','mixed','negative','neutral')) DEFAULT 'neutral',
    aspects         TEXT[] DEFAULT ARRAY[]::TEXT[],   -- taste, price, service, portion, spice, freshness 등
    themes          TEXT[] DEFAULT ARRAY[]::TEXT[],   -- recommend, must_try, avoid, hidden_gem, tourist_trap 등
    recommend       BOOLEAN DEFAULT FALSE,
    threads_text    TEXT,                              -- ready-to-post Threads-friendly Korean text

    language        TEXT DEFAULT 'en',
    region          TEXT,
    visit_kind      TEXT CHECK (visit_kind IN ('dine_in','takeout','unknown')) DEFAULT 'unknown',
    tags            TEXT[] DEFAULT ARRAY[]::TEXT[],
    image_b64       TEXT,
    visitor_country TEXT,
    reward_code     TEXT,

    -- Threads 연동 status (Phase 2)
    threads_post_id TEXT,
    threads_status  TEXT CHECK (threads_status IN ('pending','posted','failed','skipped')) DEFAULT 'pending',

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviews_dish_name_idx ON reviews (dish_name);
CREATE INDEX IF NOT EXISTS reviews_created_at_idx ON reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_rating_idx ON reviews (rating);
CREATE INDEX IF NOT EXISTS reviews_sentiment_idx ON reviews (sentiment);
CREATE INDEX IF NOT EXISTS reviews_aspects_idx ON reviews USING gin (aspects);
CREATE INDEX IF NOT EXISTS reviews_themes_idx ON reviews USING gin (themes);
