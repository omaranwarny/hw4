"""Read-only access to data/campus_customs.db for the Campus Customs site.

Plain sqlite3, no web framework, so it can be tested on its own:
    python db.py        (from hw4/backend/)
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

HW4_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", HW4_DIR / "data")).resolve()
DB_PATH = Path(os.getenv("DB_PATH", DATA_DIR / "campus_customs.db")).resolve()
PRODUCTS_DIR = DATA_DIR / "products"

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]
LOW_STOCK = 5  # "only a few left" threshold
STOPWORDS = {"a", "an", "the", "for", "in", "of", "and", "or", "with", "do", "you", "have", "any", "me", "show", "some", "i", "want", "need", "looking", "is", "are", "it", "this", "that", "what"}

# The catalogue has 22 spellings of garment_type; shoppers need a handful of clean categories.
CATEGORY_RULES = [
    ("Quarter-Zips", ["quarter-zip", "1/4 zip", "quarter zip"]),
    ("Jackets & Fleece", ["jacket", "fleece"]),
    ("Hoodies", ["hood"]),
    ("Long Sleeve", ["long-sleeve", "long sleeve"]),
    ("T-Shirts", ["t-shirt", "tee"]),
    ("Crewnecks", ["crewneck", "crew", "mockneck", "sweatshirt"]),
]
CATEGORIES = [c for c, _ in CATEGORY_RULES]


def category_of(garment_type: str) -> str:
    g = garment_type.lower()
    for cat, keys in CATEGORY_RULES:
        if any(k in g for k in keys):
            return cat
    return "Other"


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """Read-only connection: the website can never change the catalogue or stock by accident."""
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database not found at {DB_PATH}. Put campus_customs.db in hw4/data/.")
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def _json_list(text: str | None) -> list[str]:
    try:
        v = json.loads(text or "[]")
        return [str(x) for x in v] if isinstance(v, list) else []
    except json.JSONDecodeError:
        return []


def image_url(image_file_path: str) -> str:
    # DB stores 'products/<file>.jpg' (relative to data/); the API serves data/ at /media.
    return "/media/" + image_file_path.lstrip("/")


def short_text(text: str, limit: int = 110) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(",.;:")
    return cut + "…"


def _stock_by_product(conn: sqlite3.Connection, ids: list[str] | None = None) -> dict[str, list[dict]]:
    sql = "SELECT product_id, size, quantity FROM inventory"
    params: list = []
    if ids is not None:
        sql += f" WHERE product_id IN ({','.join('?' * len(ids))})"
        params = ids
    out: dict[str, list[dict]] = {}
    for r in conn.execute(sql, params):
        out.setdefault(r["product_id"], []).append({"size": r["size"], "quantity": int(r["quantity"])})
    for rows in out.values():
        rows.sort(key=lambda x: SIZE_ORDER.index(x["size"]) if x["size"] in SIZE_ORDER else 99)
    return out


def _summary(row: sqlite3.Row, stock: list[dict]) -> dict:
    total = sum(s["quantity"] for s in stock)
    return {
        "product_id": row["product_id"],
        "name": row["name"],
        "category": category_of(row["garment_type"]),
        "garment_type": row["garment_type"],
        "price": float(row["price"]),
        "short_description": short_text(row["description"]),
        "colors": _json_list(row["colors"]),
        "image_url": image_url(row["image_file_path"]),
        "total_stock": total,
        "sizes_in_stock": [s["size"] for s in stock if s["quantity"] > 0],
    }


SYNONYMS = {"grey": "gray", "sweatshirt": "crewneck", "tee": "t-shirt", "hoody": "hoodie", }


def _stem(w: str) -> str:
    # "hoodies" -> "hoodie", "shirts" -> "shirt" (simple plural handling), plus a few synonyms
    w = w[:-1] if len(w) > 3 and w.endswith("s") and not w.endswith("ss") else w
    return SYNONYMS.get(w, w)


def _matches(row: sqlite3.Row, words: list[str]) -> tuple[int, int]:
    """(score, how many search words matched) over name, type, description, colors and tags."""
    hay = " ".join([row["name"], row["garment_type"], row["description"],
                    " ".join(_json_list(row["colors"])), " ".join(_json_list(row["search_tags"]))]).lower()
    name = row["name"].lower()
    hits = [w for w in words if w in hay]
    return sum(3 if w in name else 1 for w in hits), len(hits)


def list_products(q: str | None = None, category: str | None = None) -> list[dict]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM catalogue ORDER BY name").fetchall()
        stock = _stock_by_product(conn)
    words = [_stem(w) for w in re.findall(r"[a-z0-9]+", (q or "").lower()) if len(w) > 1 and w not in STOPWORDS]
    out = []
    for r in rows:
        if category and category != "All" and category_of(r["garment_type"]) != category:
            continue
        score, n_hit = _matches(r, words) if words else (1, 0)
        if score:
            out.append((score, n_hit, _summary(r, stock.get(r["product_id"], []))))
    # Short searches ("navy hoodie"): if some products match every word, show only those.
    # Long word lists (e.g. all college names) stay "any word" searches.
    if words and len(words) <= 3 and any(n == len(words) for _, n, _ in out):
        out = [x for x in out if x[1] == len(words)]
    out.sort(key=lambda x: (-x[0], x[2]["name"]))
    return [p for _, _, p in out]


def get_product(product_id: str) -> dict | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM catalogue WHERE product_id = ?", (product_id,)).fetchone()
        if row is None:
            return None
        stock = _stock_by_product(conn, [product_id]).get(product_id, [])
    detail = _summary(row, stock)
    detail.update({
        "description": row["description"],
        "search_tags": _json_list(row["search_tags"]),
        "inventory": [
            {**s, "status": "sold out" if s["quantity"] == 0 else "low" if s["quantity"] <= LOW_STOCK else "in stock"}
            for s in stock
        ],
    })
    return detail


if __name__ == "__main__":
    ps = list_products()
    print(len(ps), "products;", "categories:", {c: sum(p["category"] == c for p in ps) for c in CATEGORIES + ["Other"]})
    print("search 'navy hoodie':", [p["product_id"] for p in list_products("navy hoodie")[:5]])
    d = get_product("basic-hoodie-big-yale")
    print(d["name"], d["price"], d["image_url"], d["inventory"])
    print("missing:", get_product("nope"))
