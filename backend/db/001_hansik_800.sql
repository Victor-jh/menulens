-- MenuLens D3: hansik_800 table + pgvector setup (v2, 실 xlsx 반영)
-- Source spec: docs/research/05_한식800선_정제스펙.md §2.1
-- Embedding: Gemini text-embedding-004 (768 dim) — ADR-008
-- Execute on: Supabase SQL Editor (once per project)

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS hansik_800 (
    id                      SERIAL PRIMARY KEY,
    source_no               INTEGER NOT NULL UNIQUE,   -- 원본 요리번호 1~800
    category                TEXT NOT NULL,             -- "찌개 [Jjigae]" 형식
    name_ko                 TEXT NOT NULL,             -- 김치찌개
    romanization            TEXT NOT NULL,             -- Kimchijjigae (공식 라틴 발음)
    name_en                 TEXT NOT NULL,             -- Kimchi Stew
    name_ja                 TEXT,
    name_zh_simp            TEXT,
    name_zh_trad            TEXT,
    desc_ko                 TEXT,
    desc_en                 TEXT,
    desc_ja                 TEXT,
    desc_zh_simp            TEXT,
    desc_zh_trad            TEXT,

    -- 후처리 필드 (로더가 desc_ko·name_ko 파싱으로 생성)
    ingredients_extracted   TEXT[],
    allergy_tags            TEXT[],
    vegan_status            TEXT CHECK (vegan_status IN ('vegan','vegetarian','non_veg','unknown')),
    halal_status            TEXT CHECK (halal_status IN ('halal_likely','haram','unclear')),
    spicy_level             INTEGER CHECK (spicy_level BETWEEN 0 AND 3),

    embedding_ko            VECTOR(768),               -- Gemini text-embedding-004

    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW vector index (pgvector >= 0.5)
CREATE INDEX IF NOT EXISTS hansik_800_embedding_ko_hnsw_idx
    ON hansik_800 USING hnsw (embedding_ko vector_cosine_ops);

-- Trigram index for fuzzy Korean name match (fallback)
CREATE INDEX IF NOT EXISTS hansik_800_name_ko_trgm_idx
    ON hansik_800 USING gin (name_ko gin_trgm_ops);

CREATE INDEX IF NOT EXISTS hansik_800_allergy_tags_idx
    ON hansik_800 USING gin (allergy_tags);

-- Similarity search RPC (called from Python via supabase-py)
-- NOTE: match_threshold is on cosine SIMILARITY (1 - distance), not distance
CREATE OR REPLACE FUNCTION match_hansik(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.50,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id INT,
    source_no INT,
    category TEXT,
    name_ko TEXT,
    romanization TEXT,
    name_en TEXT,
    desc_ko TEXT,
    desc_en TEXT,
    ingredients_extracted TEXT[],
    allergy_tags TEXT[],
    vegan_status TEXT,
    halal_status TEXT,
    spicy_level INT,
    similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        id,
        source_no,
        category,
        name_ko,
        romanization,
        name_en,
        desc_ko,
        desc_en,
        ingredients_extracted,
        allergy_tags,
        vegan_status,
        halal_status,
        spicy_level,
        1 - (embedding_ko <=> query_embedding) AS similarity
    FROM hansik_800
    WHERE 1 - (embedding_ko <=> query_embedding) > match_threshold
    ORDER BY embedding_ko <=> query_embedding
    LIMIT match_count;
$$;
