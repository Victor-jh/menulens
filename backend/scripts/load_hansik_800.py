"""
한식진흥원 800선 → Supabase Postgres 적재 파이프라인 (v2, 실 xlsx 반영).

Spec: docs/research/05_한식800선_정제스펙.md §6.1 (v2, 2026-04-25)
ROADMAP: D3 재개 (2026-04-25)
ADR: ADR-008 (Gemini text-embedding-004, 768 dim)

Usage:
    # 1. backend/data/hansik_800.csv 배치 (800행 13열 UTF-8-sig)
    # 2. backend/db/001_hansik_800.sql 을 Supabase SQL Editor 실행
    # 3. .env 에 GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY 설정
    # 4. python -m backend.scripts.load_hansik_800 [--csv PATH] [--limit N] [--dry-run]

Pipeline (spec §6.1):
    1. Read CSV (utf-8-sig)
    2. Normalize (§5)
    3. Stage 1 regex allergy tagging from name_ko + desc_ko (§3.2)
    4. vegan/halal/spicy classification (§3.2, 3.3)
    5. Embed: "{name_ko} {romanization} {name_en} {category_ko_only} {desc_ko[:40]}" (§4.1)
    6. Upsert to Supabase
    7. Canary: source_no=261 "김치찌개" → Kimchi Stew with tags ⊇ {pork, seafood, soy}
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
load_dotenv(REPO_ROOT / ".env")
load_dotenv(REPO_ROOT / "backend" / ".env")


def resolve_csv_path(cli_path: Optional[str]) -> tuple[Path, str]:
    if cli_path:
        return Path(cli_path), "cli"
    if PROD_CSV_PATH.exists():
        return PROD_CSV_PATH, "prod"
    if FIXTURE_CSV_PATH.exists():
        return FIXTURE_CSV_PATH, "fixture"
    return PROD_CSV_PATH, "missing"


# --- allergy 14-tag keyword map (spec v2 §3.1) -----------------------------
ALLERGY_KEYWORDS: dict[str, list[str]] = {
    "pork":      ["돼지", "삼겹", "항정", "목살", "제육", "족발", "순대", "햄", "베이컨"],
    "beef":      ["소고기", "쇠고기", "갈비", "육회", "양지", "차돌", "우둔", "한우"],
    "chicken":   ["닭", "치킨", "삼계", "영계", "백숙"],
    "seafood":   ["해물", "어패류", "문어", "낙지", "쭈꾸미", "전복", "굴", "홍합", "조개"],
    "fish":      ["생선", "고등어", "갈치", "멸치", "참치", "연어", "도미", "조기", "명태", "북어", "황태"],
    "shellfish": ["새우", "꽃게", "대게", "관자"],
    "egg":       ["계란", "달걀", "지단"],
    "dairy":     ["우유", "치즈", "버터", "요거트", "크림"],
    # NOTE: 단독 "전" 키워드는 한국어 일반명사("전통","전자")와 충돌해 false positive 폭증.
    #       spec §3.1 "전(煎)"은 부침류 음식 지칭 의도 → 구체 단어로 치환
    "gluten":    ["밀가루", "면", "국수", "빵", "부침", "빈대떡", "파전", "전병", "튀김", "만두", "칼국수", "짜장", "수제비", "라면"],
    "soy":       ["콩", "두부", "된장", "간장", "청국장", "비지", "콩나물"],
    "nuts":      ["호두", "잣", "아몬드", "피칸", "캐슈", "밤"],
    "peanut":    ["땅콩"],
    "sesame":    ["참깨", "참기름", "깨소금", "들깨"],
    "alcohol":   ["소주", "맥주", "청주", "정종", "미림", "맛술", "와인"],
}

# 매운맛 키워드 (spec §3.3)
SPICY_KEYWORDS = {
    3: ["불닭", "낙곱새", "매운탕"],
    2: ["김치", "제육볶음", "고추장찌개", "매콤한", "얼큰한", "매운맛"],
    1: ["고춧가루", "고추장"],
}

# 숨은 알코올 (halal_status=unclear 판정)
UNCLEAR_HALAL = ["미림", "맛술", "조미"]


# --- normalization (spec §5) ----------------------------------------------
def normalize_name_ko(raw: str) -> str:
    if not raw:
        return ""
    s = unicodedata.normalize("NFC", str(raw))
    s = re.sub(r"\s+", "", s)
    s = re.sub(r"[()\[\]{}\"'「」『』]", "", s)
    return s.strip()


# --- tagging (spec §3.2) ---------------------------------------------------
def extract_ingredients(desc_ko: str, name_ko: str) -> list[str]:
    """Stage 1 규칙 기반: allergy 키워드 중 desc_ko + name_ko에서 매칭된 원형 단어를 재료로 저장."""
    haystack = f"{name_ko or ''} {desc_ko or ''}"
    found: list[str] = []
    for keywords in ALLERGY_KEYWORDS.values():
        for kw in keywords:
            if kw in haystack and kw not in found:
                found.append(kw)
    return found


def tag_allergies(name_ko: str, desc_ko: str) -> list[str]:
    haystack = f"{name_ko or ''} {desc_ko or ''}"
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


def classify_halal(allergens: list[str], name_ko: str, desc_ko: str) -> str:
    if "pork" in allergens or "alcohol" in allergens:
        return "haram"
    hay = f"{name_ko or ''} {desc_ko or ''}"
    if any(kw in hay for kw in UNCLEAR_HALAL):
        return "unclear"
    return "halal_likely"


def classify_spicy(name_ko: str, desc_ko: str) -> int:
    hay = f"{name_ko or ''} {desc_ko or ''}"
    for level in (3, 2, 1):
        if any(kw in hay for kw in SPICY_KEYWORDS[level]):
            return level
    return 0


# --- category helper -------------------------------------------------------
_CATEGORY_LATIN_RE = re.compile(r"\s*\[[^\]]+\]\s*$")


def strip_category_latin(category: str) -> str:
    """'찌개 [Jjigae]' → '찌개' (임베딩 노이즈 감소, spec §4.1)."""
    if not category:
        return ""
    return _CATEGORY_LATIN_RE.sub("", category).strip()


# --- embedding text (spec §4.1, v2) ----------------------------------------
def build_embed_text(row: dict) -> str:
    parts = [
        row.get("name_ko", ""),
        row.get("romanization", ""),
        row.get("name_en", ""),
        strip_category_latin(row.get("category", "")),
        (row.get("desc_ko") or "")[:40],
    ]
    return " ".join(p for p in parts if p).strip()


# --- CSV header tolerance --------------------------------------------------
CANONICAL_COLUMNS = [
    "source_no", "category", "name_ko", "romanization",
    "desc_ko", "name_en", "desc_en",
    "name_ja", "desc_ja",
    "name_zh_simp", "desc_zh_simp",
    "name_zh_trad", "desc_zh_trad",
]


def ensure_canonical_columns(df: pd.DataFrame) -> pd.DataFrame:
    """CSV가 이미 canonical 헤더면 그대로. 아니면 column_map.json 역매핑 시도."""
    if set(CANONICAL_COLUMNS).issubset(df.columns):
        return df[CANONICAL_COLUMNS]

    col_map_path = REPO_ROOT / "backend" / "data" / "hansik_800_column_map.json"
    if not col_map_path.exists():
        print(f"❌ CSV columns ≠ canonical and no column_map.json found.", file=sys.stderr)
        print(f"   Got: {list(df.columns)}", file=sys.stderr)
        print(f"   Need: {CANONICAL_COLUMNS}", file=sys.stderr)
        sys.exit(3)

    col_map = json.loads(col_map_path.read_text(encoding="utf-8"))  # {canonical: raw}
    inverse = {raw: canon for canon, raw in col_map.items()}
    missing = [canon for canon, raw in col_map.items() if raw not in df.columns]
    if missing:
        print(f"❌ column_map.json references missing columns: {missing}", file=sys.stderr)
        print(f"   Actual CSV columns: {list(df.columns)}", file=sys.stderr)
        sys.exit(3)
    df = df.rename(columns=inverse)
    return df[CANONICAL_COLUMNS]


# --- Gemini embedding (ADR-008) -------------------------------------------
async def embed_batch_gemini(texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
    """Google text-embedding-004 (768 dim). Free tier: 1500 req/min, 15K/day."""
    import google.generativeai as genai
    out: list[list[float]] = []
    # Gemini embedding API는 request당 1 텍스트 — 동시 호출로 처리
    async def _one(t: str) -> list[float]:
        r = await asyncio.to_thread(
            genai.embed_content,
            model="models/text-embedding-004",
            content=t,
            task_type=task_type,
        )
        return r["embedding"]
    # concurrency 10 (무료 rate limit 여유)
    sem = asyncio.Semaphore(10)
    async def _guarded(t: str) -> list[float]:
        async with sem:
            return await _one(t)
    out = await asyncio.gather(*[_guarded(t) for t in texts])
    return out


# --- upsert ---------------------------------------------------------------
def upsert_rows(rows: list[dict], supabase) -> int:
    CHUNK = 50
    total = 0
    for i in range(0, len(rows), CHUNK):
        batch = rows[i : i + CHUNK]
        res = supabase.table("hansik_800").upsert(batch, on_conflict="source_no").execute()
        total += len(res.data or [])
        print(f"  upserted {total}/{len(rows)}")
    return total


# --- canary (spec §6.3, v2) -----------------------------------------------
async def canary_query(supabase) -> bool:
    print("\n🎯 Canary: '김치찌개' → Kimchi Stew (source_no=261)")
    import google.generativeai as genai
    q = "김치찌개"
    q_emb_resp = await asyncio.to_thread(
        genai.embed_content,
        model="models/text-embedding-004",
        content=q,
        task_type="RETRIEVAL_QUERY",
    )
    q_emb = q_emb_resp["embedding"]
    res = supabase.rpc(
        "match_hansik",
        {"query_embedding": q_emb, "match_threshold": 0.3, "match_count": 3},
    ).execute()
    rows = res.data or []
    if not rows:
        print("   ❌ No matches")
        return False
    for r in rows:
        print(f"   sim={r['similarity']:.3f}  #{r['source_no']} {r['name_ko']} → {r['name_en']} tags={r.get('allergy_tags')}")
    top = rows[0]
    tags_ok = {"pork", "seafood", "soy"}.issubset(set(top.get("allergy_tags") or []))
    name_ok = top.get("name_ko") == "김치찌개" and "Kimchi" in (top.get("name_en") or "")
    ok = name_ok and tags_ok and top.get("source_no") == 261
    print(f"   {'✅ PASS' if ok else '⚠  MISMATCH'}  (name_ok={name_ok}, tags_ok={tags_ok}, source_no={top.get('source_no')})")
    return ok


# --- main ------------------------------------------------------------------
async def main(csv_override: Optional[str], limit: Optional[int], dry_run: bool) -> int:
    csv_path, source = resolve_csv_path(csv_override)
    if source == "missing":
        print(f"❌ CSV not found: {csv_path}")
        print("   공공데이터포털 15129784 (fileData, 로그인 즉시 다운로드) 에서 받아 위 경로에 배치.")
        return 2
    if source == "fixture":
        print("⚠  Using synthetic fixture (tests/fixtures/hansik_800_sample.csv, 10 rows).")

    print(f"📄 Loading {csv_path}")
    df = pd.read_csv(csv_path, encoding="utf-8-sig")
    print(f"   rows={len(df)}, cols={len(df.columns)}")

    df = ensure_canonical_columns(df)
    if limit:
        df = df.head(limit)

    # Normalize + tag
    rows: list[dict] = []
    for idx, row in df.iterrows():
        name_ko = normalize_name_ko(row.get("name_ko", ""))
        desc_ko = str(row.get("desc_ko", "") or "")
        ingredients = extract_ingredients(desc_ko, name_ko)
        allergens = tag_allergies(name_ko, desc_ko)

        def _s(v) -> Optional[str]:
            if v is None or (isinstance(v, float) and pd.isna(v)):
                return None
            s = str(v).strip()
            return s or None

        rows.append({
            "source_no":             int(row["source_no"]),
            "category":              _s(row["category"]) or "",
            "name_ko":               name_ko,
            "romanization":          _s(row["romanization"]) or "",
            "name_en":               _s(row["name_en"]) or "",
            "name_ja":               _s(row.get("name_ja")),
            "name_zh_simp":          _s(row.get("name_zh_simp")),
            "name_zh_trad":          _s(row.get("name_zh_trad")),
            "desc_ko":               desc_ko or None,
            "desc_en":               _s(row.get("desc_en")),
            "desc_ja":               _s(row.get("desc_ja")),
            "desc_zh_simp":          _s(row.get("desc_zh_simp")),
            "desc_zh_trad":          _s(row.get("desc_zh_trad")),
            "ingredients_extracted": ingredients,
            "allergy_tags":          allergens,
            "vegan_status":          classify_vegan(allergens),
            "halal_status":          classify_halal(allergens, name_ko, desc_ko),
            "spicy_level":           classify_spicy(name_ko, desc_ko),
        })

    print(f"✅ Normalized {len(rows)} rows")

    if dry_run:
        # Canary row check (source_no=261)
        canary = next((r for r in rows if r["source_no"] == 261), None)
        if canary:
            print("\n🎯 Canary row 261 (expected: 김치찌개, tags ⊇ {pork, seafood, soy}, spicy=2):")
            print(json.dumps({
                k: canary[k] for k in [
                    "source_no", "category", "name_ko", "romanization", "name_en",
                    "ingredients_extracted", "allergy_tags", "vegan_status", "halal_status", "spicy_level",
                ]
            }, ensure_ascii=False, indent=2))
            tags = set(canary["allergy_tags"])
            expected = {"pork", "seafood", "soy"}
            ok = canary["name_ko"] == "김치찌개" and expected.issubset(tags) and canary["spicy_level"] == 2
            print(f"   {'✅ PASS' if ok else '❌ FAIL'}  tags={tags}, missing={expected - tags}")

        stats = {
            "vegan":        sum(1 for r in rows if r["vegan_status"] == "vegan"),
            "vegetarian":   sum(1 for r in rows if r["vegan_status"] == "vegetarian"),
            "non_veg":      sum(1 for r in rows if r["vegan_status"] == "non_veg"),
            "unknown":      sum(1 for r in rows if r["vegan_status"] == "unknown"),
            "halal_likely": sum(1 for r in rows if r["halal_status"] == "halal_likely"),
            "haram":        sum(1 for r in rows if r["halal_status"] == "haram"),
            "unclear":      sum(1 for r in rows if r["halal_status"] == "unclear"),
        }
        print(f"\n📊 Classification stats: {stats}")
        tag_counts: dict[str, int] = {}
        for r in rows:
            for t in r["allergy_tags"]:
                tag_counts[t] = tag_counts.get(t, 0) + 1
        print(f"🏷  Allergy tag distribution (found {len(tag_counts)}/14): "
              f"{dict(sorted(tag_counts.items(), key=lambda x: -x[1]))}")

        spicy_dist = {i: sum(1 for r in rows if r["spicy_level"] == i) for i in range(4)}
        print(f"🌶  Spicy level distribution: {spicy_dist}")

        # Sample embed text preview
        print("\n📝 Embedding text preview (first 3):")
        for r in rows[:3]:
            print(f"   #{r['source_no']} {r['name_ko']}: {build_embed_text(r)[:120]}")
        return 0

    # --- live mode ---
    try:
        import google.generativeai as genai
        from supabase import create_client
    except ImportError as e:
        print(f"❌ Missing deps: {e}. Run: .venv/bin/pip install -r backend/requirements.txt")
        return 3

    gemini_key = os.getenv("GEMINI_API_KEY")
    sb_url = os.getenv("SUPABASE_URL")
    sb_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not (gemini_key and sb_url and sb_key):
        print("❌ Missing env: GEMINI_API_KEY / SUPABASE_URL / SUPABASE_SERVICE_KEY")
        return 4

    genai.configure(api_key=gemini_key)
    supabase = create_client(sb_url, sb_key)

    print(f"🔗 Embedding {len(rows)} texts via Gemini text-embedding-004 (768d)")
    BATCH = 100
    for i in range(0, len(rows), BATCH):
        chunk = rows[i : i + BATCH]
        texts = [build_embed_text(r) for r in chunk]
        embs = await embed_batch_gemini(texts, task_type="RETRIEVAL_DOCUMENT")
        for r, e in zip(chunk, embs):
            r["embedding_ko"] = e
        print(f"  embedded {min(i + BATCH, len(rows))}/{len(rows)}")

    print(f"💾 Upserting to Supabase hansik_800")
    n = upsert_rows(rows, supabase)
    print(f"   ✅ {n} rows upserted")

    ok = await canary_query(supabase)
    return 0 if ok else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", type=str, default=None, help="CSV path override")
    ap.add_argument("--limit", type=int, default=None, help="limit rows (debug)")
    ap.add_argument("--dry-run", action="store_true", help="normalize only, skip embed/upsert")
    args = ap.parse_args()
    sys.exit(asyncio.run(main(args.csv, args.limit, args.dry_run)))
