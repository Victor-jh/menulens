-- MenuLens D3: hansik_800 table + pgvector setup
-- Source spec: docs/research/05_한식800선_정제스펙.md §2.1
-- Execute on: Supabase SQL Editor (once per project)
-- ADR-002, ADR-004 참조

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS hansik_800 (
    id                  SERIAL PRIMARY KEY,
    source_row_no       INTEGER NOT NULL,
    category_major      TEXT NOT NULL,
    category_minor      TEXT NOT NULL,
    name_ko             TEXT NOT NULL,
    name_en             TEXT NOT NULL,
    name_en_desc        TEXT,
    name_ja             TEXT,
    name_zh_simp        TEXT,
    name_zh_trad        TEXT,
    desc_ko             TEXT,
    desc_en             TEXT,
    main_ingredients    TEXT[],
    allergy_tags        TEXT[],
    vegan_status        TEXT CHECK (vegan_status IN ('vegan','vegetarian','non_veg','unknown')),
    halal_status        TEXT CHECK (halal_status IN ('halal_likely','haram','unclear')),
    spicy_level         INTEGER CHECK (spicy_level BETWEEN 0 AND 3),
    image_path          TEXT,
    embedding_ko        VECTOR(1536),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_row_no)
);

CREATE INDEX IF NOT EXISTS hansik_800_embedding_ko_hnsw_idx
    ON hansik_800 USING hnsw (embedding_ko vector_cosine_ops);

CREATE INDEX IF NOT EXISTS hansik_800_name_ko_trgm_idx
    ON hansik_800 USING gin (name_ko gin_trgm_ops);

CREATE INDEX IF NOT EXISTS hansik_800_allergy_tags_idx
    ON hansik_800 USING gin (allergy_tags);

-- Similarity search RPC (called from Python via supabase-py)
CREATE OR REPLACE FUNCTION match_hansik(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.65,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id INT,
    name_ko TEXT,
    name_en TEXT,
    name_en_desc TEXT,
    desc_en TEXT,
    main_ingredients TEXT[],
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
        name_ko,
        name_en,
        name_en_desc,
        desc_en,
        main_ingredients,
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
