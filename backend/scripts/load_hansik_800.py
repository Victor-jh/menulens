"""
한식진흥원 800선 → Supabase Postgres 적재 파이프라인.

Spec: docs/research/05_한식800선_정제스펙.md §6.1
ROADMAP: D3 (2026-04-23)

Usage:
    # 1. backend/data/hansik_800.csv 수동 배치 (공공데이터포털 15129784 다운로드 후)
    #    — 실 파일 없으면 자동으로 tests/fixtures/hansik_800_sample.csv 사용 (dry-run용 10행)
    # 2. backend/db/001_hansik_800.sql 을 Supabase SQL Editor 실행
    # 3. .env 에 OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY 설정
    # 4. python -m backend.scripts.load_hansik_800 [--csv PATH] [--limit N] [--dry-run]

Runtime budget (spec §4.2): 800건 × 30토큰 ≈ $0.0005 (embeddings only)

Pipeline steps (spec §6.1):
    1. Read CSV
    2. Map raw columns → canonical schema (§1.2)
    3. Normalize (§5)
    4. Tag allergies (§3.1)
    5. Classify vegan/halal/spicy (§3.2, 3.3)
    6. Embed (§4.1)
    7. Upsert to Supabase
    8. Canary verify: "김치찌개" → Kimchi-jjigae
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from typing import Optional

import pandas as pd
from dotenv import load_dotenv

# --- paths -----------------------------------------------------------------
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PROD_CSV_PATH = REPO_ROOT / "backend" / "data" / "hansik_800.csv"
FIXTURE_CSV_PATH = REPO_ROOT / "tests" / "fixtures" / "hansik_800_sample.csv"
COLUMN_MAP_PATH = REPO_ROOT / "backend" / "data" / "hansik_800_column_map.json"
load_dotenv(REPO_ROOT / ".env")
load_dotenv(REPO_ROOT / "backend" / ".env")


def resolve_csv_path(cli_path: Optional[str]) -> tuple[Path, str]:
    """CLI 옵션 > prod CSV > fixture CSV 순."""
    if cli_path:
        return Path(cli_path), "cli"
    if PROD_CSV_PATH.exists():
        return PROD_CSV_PATH, "prod"
    if FIXTURE_CSV_PATH.exists():
        return FIXTURE_CSV_PATH, "fixture"
    return PROD_CSV_PATH, "missing"

# --- allergy 14-tag keyword map (spec §3.1) --------------------------------
ALLERGY_KEYWORDS: dict[str, list[str]] = {
    "pork":      ["돼지", "삼겹", "항정", "목살", "제육", "족발", "순대", "햄", "베이컨"],
    "beef":      ["소고기", "쇠고기", "갈비", "육회", "양지", "차돌", "우둔", "한우"],
    "chicken":   ["닭", "치킨", "삼계", "봉", "계육"],
    "seafood":   ["해물", "새우", "오징어", "문어", "낙지", "조개", "꽃게", "전복", "굴", "홍합"],
    "fish":      ["생선", "고등어", "갈치", "멸치", "참치", "연어", "도미", "조기", "명태", "동태", "북어"],
    "shellfish": ["새우", "게", "꽃게", "대게", "조개", "홍합", "전복"],
    "egg":       ["계란", "달걀", "알", "지단"],
    "dairy":     ["우유", "치즈", "버터", "요거트", "크림", "분유"],
    "gluten":    ["밀", "면", "국수", "빵", "부침", "전", "튀김옷", "만두피", "칼국수", "짜장"],
    "soy":       ["콩", "두부", "된장", "간장", "청국장", "비지"],
    "nuts":      ["호두", "잣", "아몬드", "피칸", "캐슈", "밤"],
    "peanut":    ["땅콩"],
    "sesame":    ["참깨", "참기름", "깨소금"],
    "alcohol":   ["술", "소주", "맥주", "청주", "정종", "미림", "맛술", "와인"],
}

SPICY_KEYWORDS = {
    3: ["불닭", "낙곱새", "매운탕"],
    2: ["김치", "제육", "낙지볶음", "고추장찌개"],
    1: ["고춧가루", "고추장"],
}


# --- normalization (spec §5) ----------------------------------------------
def normalize_name_ko(raw: str) -> str:
    if not raw:
        return ""
    s = unicodedata.normalize("NFC", str(raw))
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"[()\[\]{}\"'「」『』]", "", s)
    s = re.sub(r"\d+(인분|원|g|kg|ml)?", "", s)
    return s.strip()


def normalize_ingredients(raw: str) -> list[str]:
    if not raw or (isinstance(raw, float) and pd.isna(raw)):
        return []
    parts = re.split(r"[,;·/]", str(raw))
    stopwords = {"등", "기타", "약간", "소량", "적당량", ""}
    out = []
    for p in parts:
        p = re.sub(r"\s+", " ", p).strip()
        if p and p not in stopwords:
            out.append(p)
    return out


# --- tagging (spec §3) -----------------------------------------------------
def tag_allergies(ingredients: list[str], name_ko: str) -> list[str]:
    haystack = " ".join(ingredients) + " " + (name_ko or "")
    tags: list[str] = []
    for tag, keywords in ALLERGY_KEYWORDS.items():
        if any(kw in haystack for kw in keywords):
            tags.append(tag)
    return sorted(set(tags))


def classify_vegan(allergens: list[str]) -> str:
    meat_sea = {"pork", "beef", "chicken", "seafood", "fish", "shellfish"}
    if set(allergens) & meat_sea:
        return "non_veg"
    if {"egg", "dairy"} & set(allergens):
        return "vegetarian"
    if not allergens:
        return "unknown"
    return "vegan"


def classify_halal(allergens: list[str]) -> str:
    if "pork" in allergens or "alcohol" in allergens:
        return "haram"
    return "halal_likely"


def classify_spicy(name_ko: str, desc: str = "") -> int:
    hay = (name_ko or "") + " " + (desc or "")
    for level in (3, 2, 1):
        if any(kw in hay for kw in SPICY_KEYWORDS[level]):
            return level
    return 0


# --- column mapping --------------------------------------------------------
# 실제 CSV 컬럼명은 다운로드 후 갱신. 이 맵이 없으면 헤더 자동감지 시도.
DEFAULT_COLUMN_MAP = {
    "source_row_no": "연번",
    "category_major": "분류_대",
    "category_minor": "분류_중",
    "name_ko": "메뉴명_한국어",
    "name_en": "메뉴명_영문",
    "name_en_desc": "메뉴명_영문_설명",
    "name_ja": "메뉴명_일본어",
    "name_zh_simp": "메뉴명_중간체",
    "name_zh_trad": "메뉴명_중번체",
    "desc_ko": "설명_한국어",
    "desc_en": "설명_영문",
    "main_ingredients": "주재료",
    "image_path": "사진경로",
}


def load_column_map() -> dict[str, str]:
    if COLUMN_MAP_PATH.exists():
        return json.loads(COLUMN_MAP_PATH.read_text(encoding="utf-8"))
    return DEFAULT_COLUMN_MAP


def apply_column_map(df: pd.DataFrame, col_map: dict[str, str]) -> pd.DataFrame:
    inverted = {}
    missing = []
    for canon, raw in col_map.items():
        if raw in df.columns:
            inverted[raw] = canon
        else:
            missing.append((canon, raw))
    if missing:
        print(f"⚠  Column map mismatch — missing in CSV: {missing}", file=sys.stderr)
        print(f"   Actual CSV columns: {list(df.columns)}", file=sys.stderr)
        print(f"   → Edit {COLUMN_MAP_PATH} then re-run.", file=sys.stderr)
    return df.rename(columns=inverted)


# --- embedding (spec §4.1) -------------------------------------------------
async def embed_batch(texts: list[str], client) -> list[list[float]]:
    if not texts:
        return []
    resp = await asyncio.to_thread(
        client.embeddings.create,
        model="text-embedding-3-small",
        input=texts,
    )
    return [d.embedding for d in resp.data]


def build_embed_text(row: dict) -> str:
    # spec §4.1: "{name_ko} {name_en} {category_minor} {main_ingredients}"
    parts = [
        row.get("name_ko", ""),
        row.get("name_en", ""),
        row.get("category_minor", ""),
        " ".join(row.get("main_ingredients") or []),
    ]
    return " ".join(p for p in parts if p).strip()


# --- upsert ---------------------------------------------------------------
def upsert_rows(rows: list[dict], supabase) -> int:
    CHUNK = 50
    total = 0
    for i in range(0, len(rows), CHUNK):
        batch = rows[i : i + CHUNK]
        res = supabase.table("hansik_800").upsert(batch, on_conflict="source_row_no").execute()
        total += len(res.data or [])
        print(f"  upserted {total}/{len(rows)}")
    return total


# --- canary (spec §6.3) ----------------------------------------------------
async def canary_query(supabase, openai_client) -> bool:
    print("\n🎯 Canary: '김치찌개' → Kimchi-jjigae")
    q_emb = (await embed_batch(["김치찌개 김치 찌개"], openai_client))[0]
    res = supabase.rpc(
        "match_hansik",
        {"query_embedding": q_emb, "match_threshold": 0.5, "match_count": 3},
    ).execute()
    rows = res.data or []
    if not rows:
        print("   ❌ No matches")
        return False
    for r in rows:
        print(f"   sim={r['similarity']:.3f}  {r['name_ko']} → {r['name_en']} ({r.get('name_en_desc','')})")
    top = rows[0]
    ok = ("Kimchi" in (top.get("name_en") or "")) and ("김치찌개" in top.get("name_ko", ""))
    print(f"   {'✅ PASS' if ok else '⚠  MISMATCH'}")
    return ok


# --- main ------------------------------------------------------------------
async def main(csv_override: Optional[str], limit: Optional[int], dry_run: bool) -> int:
    csv_path, source = resolve_csv_path(csv_override)
    if source == "missing":
        print(f"❌ CSV not found: {csv_path}")
        print("   공공데이터포털 15129784 에서 한식 800선 CSV 다운로드 후 위 경로에 배치.")
        print("   또는 tests/fixtures/hansik_800_sample.csv 로 dry-run 가능.")
        print("   상세: docs/research/05_한식800선_정제스펙.md §1")
        return 2
    if source == "fixture":
        print("⚠  Using synthetic fixture (tests/fixtures/hansik_800_sample.csv, 10 rows).")
        print("   실 800선 투입 시 backend/data/hansik_800.csv 에 배치.")

    print(f"📄 Loading {csv_path}")
    df = pd.read_csv(csv_path, encoding="utf-8-sig")
    print(f"   rows={len(df)}, cols={list(df.columns)}")

    col_map = load_column_map()
    df = apply_column_map(df, col_map)
    if limit:
        df = df.head(limit)

    # Normalize + tag
    rows: list[dict] = []
    for idx, row in df.iterrows():
        name_ko = normalize_name_ko(row.get("name_ko", ""))
        ingredients = normalize_ingredients(row.get("main_ingredients", ""))
        allergens = tag_allergies(ingredients, name_ko)
        desc_ko = str(row.get("desc_ko", "") or "")

        rows.append({
            "source_row_no":    int(row.get("source_row_no", idx + 1) or idx + 1),
            "category_major":   str(row.get("category_major", "") or ""),
            "category_minor":   str(row.get("category_minor", "") or ""),
            "name_ko":          name_ko,
            "name_en":          str(row.get("name_en", "") or ""),
            "name_en_desc":     str(row.get("name_en_desc", "") or "") or None,
            "name_ja":          str(row.get("name_ja", "") or "") or None,
            "name_zh_simp":     str(row.get("name_zh_simp", "") or "") or None,
            "name_zh_trad":     str(row.get("name_zh_trad", "") or "") or None,
            "desc_ko":          desc_ko or None,
            "desc_en":          str(row.get("desc_en", "") or "") or None,
            "main_ingredients": ingredients,
            "allergy_tags":     allergens,
            "vegan_status":     classify_vegan(allergens),
            "halal_status":     classify_halal(allergens),
            "spicy_level":      classify_spicy(name_ko, desc_ko),
            "image_path":       str(row.get("image_path", "") or "") or None,
        })

    print(f"✅ Normalized {len(rows)} rows")

    if dry_run:
        print("\n--- DRY RUN sample (first 3) ---")
        print(json.dumps(rows[:3], ensure_ascii=False, indent=2))
        stats = {
            "vegan":        sum(1 for r in rows if r["vegan_status"] == "vegan"),
            "vegetarian":   sum(1 for r in rows if r["vegan_status"] == "vegetarian"),
            "halal_likely": sum(1 for r in rows if r["halal_status"] == "halal_likely"),
            "haram":        sum(1 for r in rows if r["halal_status"] == "haram"),
        }
        print(f"\n📊 Classification stats: {stats}")
        tag_counts: dict[str, int] = {}
        for r in rows:
            for t in r["allergy_tags"]:
                tag_counts[t] = tag_counts.get(t, 0) + 1
        print(f"🏷  Allergy tag distribution: {dict(sorted(tag_counts.items(), key=lambda x: -x[1]))}")
        return 0

    # --- live mode: requires creds ---
    try:
        from openai import OpenAI
        from supabase import create_client
    except ImportError as e:
        print(f"❌ Missing deps: {e}. Run: pip install -r backend/requirements.txt")
        return 3

    openai_key = os.getenv("OPENAI_API_KEY")
    sb_url = os.getenv("SUPABASE_URL")
    sb_key = os.getenv("SUPABASE_SERVICE_KEY")
    if not (openai_key and sb_url and sb_key):
        print("❌ Missing env: OPENAI_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_KEY")
        return 4

    openai_client = OpenAI(api_key=openai_key)
    supabase = create_client(sb_url, sb_key)

    # Embed in batches of 100
    print(f"🔗 Embedding {len(rows)} texts (text-embedding-3-small)")
    BATCH = 100
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        texts = [build_embed_text(r) for r in chunk]
        embs = await embed_batch(texts, openai_client)
        for r, e in zip(chunk, embs):
            r["embedding_ko"] = e
        print(f"  embedded {min(i + BATCH, len(rows))}/{len(rows)}")

    print(f"💾 Upserting to Supabase hansik_800")
    n = upsert_rows(rows, supabase)
    print(f"   ✅ {n} rows upserted")

    ok = await canary_query(supabase, openai_client)
    return 0 if ok else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", type=str, default=None, help="CSV path override (default: backend/data/hansik_800.csv → fixture)")
    ap.add_argument("--limit", type=int, default=None, help="limit rows (debug)")
    ap.add_argument("--dry-run", action="store_true", help="normalize only, skip embed/upsert")
    args = ap.parse_args()
    sys.exit(asyncio.run(main(args.csv, args.limit, args.dry_run)))
