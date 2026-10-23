"""Tools the Campus Customs agent can call: real product info, prices and stock from campus_customs.db.

Two layers:
  * lookup_* functions do the work with plain dicts (easy to test: `python tools.py`)
  * the public tool functions wrap those dicts in typed models from models.py
Every number (price, quantity) comes from the database at call time. The model never makes them up.
"""
from __future__ import annotations

import re

import db

MAX_RESULTS = 12

# Shoppers say "large", "2XL", "extra small"... normalize to the catalogue's sizes.
SIZE_WORDS = {
    "XS": ["xs", "x-small", "xsmall", "extra small", "extra-small"],
    "S": ["s", "small", "sm"],
    "M": ["m", "medium", "med"],
    "L": ["l", "large", "lg"],
    "XL": ["xl", "x-large", "xlarge", "extra large", "extra-large"],
    "XXL": ["xxl", "2xl", "xx-large", "xxlarge", "2x", "double xl", "extra extra large"],
}


def normalize_size(size: str | None) -> str | None:
    if not size:
        return None
    s = re.sub(r"\s+", " ", size.strip().lower())
    for code, words in SIZE_WORDS.items():
        if s in words:
            return code
    return size.strip().upper()  # unknown; caller reports it isn't offered


def _split_stock(inv: list[dict]) -> tuple[list[str], list[str], list[str]]:
    in_stock = [r["size"] for r in inv if r["quantity"] > 0]
    low = [r["size"] for r in inv if 0 < r["quantity"] <= db.LOW_STOCK]
    sold_out = [r["size"] for r in inv if r["quantity"] == 0]
    return in_stock, low, sold_out


# ---------------------------------------------------------------------------
# Lookups (dicts)
# ---------------------------------------------------------------------------
def lookup_search(query: str = "", category: str | None = None, max_price: float | None = None,
                  color: str | None = None, size: str | None = None, limit: int = 8) -> dict:
    cat = category if category in db.CATEGORIES else None
    notes: list[str] = []
    if category and not cat:
        notes.append(f"Unknown category '{category}', ignored. Categories: {', '.join(db.CATEGORIES)}.")
    items = db.list_products(q=query or None, category=cat)
    filters: dict = {}
    if cat:
        filters["category"] = cat
    if max_price is not None:
        items = [p for p in items if p["price"] <= max_price]
        filters["max_price"] = float(max_price)
    if color:
        items = [p for p in items if any(color.lower() in c.lower() for c in p["colors"])]
        filters["color"] = color
    if size:
        code = normalize_size(size)
        if code in db.SIZE_ORDER:
            items = [p for p in items if code in p["sizes_in_stock"]]
            filters["size_in_stock"] = code
        else:
            notes.append(f"Unknown size '{size}', ignored. Sizes: {', '.join(db.SIZE_ORDER)}.")
    limit = max(1, min(int(limit or 8), MAX_RESULTS))
    results = []
    for p in items[:limit]:
        sold_out = [s for s in db.SIZE_ORDER if s not in p["sizes_in_stock"]]
        results.append({
            "product_id": p["product_id"], "name": p["name"], "category": p["category"], "price": p["price"],
            "colors": p["colors"], "short_description": p["short_description"],
            "sizes_in_stock": p["sizes_in_stock"], "sold_out_sizes": sold_out, "total_stock": p["total_stock"],
        })
    if not items:
        notes.append("No matches. Try fewer or different words, or drop a filter.")
    return {"query": query, "filters": filters, "total_matches": len(items), "results": results, "notes": notes}


def lookup_product(product_id: str) -> dict | None:
    p = db.get_product(product_id)
    if p is None:
        return None
    in_stock, low, sold_out = _split_stock(p["inventory"])
    return {
        "product_id": p["product_id"], "name": p["name"], "category": p["category"],
        "garment_type": p["garment_type"], "description": p["description"], "price": p["price"],
        "currency": "USD", "colors": p["colors"], "tags": p["search_tags"], "stock": p["inventory"],
        "total_stock": p["total_stock"], "sizes_in_stock": in_stock, "low_stock_sizes": low,
        "sold_out_sizes": sold_out,
    }


def lookup_stock(product_id: str, size: str | None = None) -> dict | None:
    p = lookup_product(product_id)
    if p is None:
        return None
    code = normalize_size(size)
    base = {"product_id": p["product_id"], "name": p["name"], "price": p["price"],
            "sizes_in_stock": p["sizes_in_stock"], "sold_out_sizes": p["sold_out_sizes"], "stock": p["stock"]}
    others = ", ".join(p["sizes_in_stock"]) or "no sizes"
    if code is None:
        if p["total_stock"] == 0:
            summary = f"{p['name']} is sold out in every size."
        else:
            parts = [f"{r['size']}: {r['quantity']}" for r in p["stock"]]
            summary = f"{p['name']} stock by size: " + ", ".join(parts) + "."
            if p["sold_out_sizes"]:
                summary += f" Sold out in {', '.join(p['sold_out_sizes'])}."
        return {**base, "requested_size": None, "size_offered": True, "quantity": None,
                "status": "see sizes", "in_stock": p["total_stock"] > 0, "summary": summary}
    row = next((r for r in p["stock"] if r["size"] == code), None)
    if row is None:
        return {**base, "requested_size": code, "size_offered": False, "quantity": None, "status": "not offered",
                "in_stock": False,
                "summary": f"{p['name']} doesn't come in size {code}. It's offered in {', '.join(db.SIZE_ORDER)}; "
                           f"in stock now in {others}."}
    q = row["quantity"]
    if q == 0:
        summary = f"{p['name']} is SOLD OUT in {code}. Still in stock in: {others}."
    elif q <= db.LOW_STOCK:
        summary = f"{p['name']} is in stock in {code}, but only {q} left."
    else:
        summary = f"{p['name']} is in stock in {code} ({q} available)."
    return {**base, "requested_size": code, "size_offered": True, "quantity": q, "status": row["status"],
            "in_stock": q > 0, "summary": summary}


def lookup_similar(product_id: str, size: str | None = None, color: str | None = None,
                   max_price: float | None = None, limit: int = 4) -> dict | None:
    """In-stock alternatives to one product, ranked by category, colors, tags and price closeness."""
    base = db.get_product(product_id)
    if base is None:
        return None
    code = normalize_size(size)
    if code is not None and code not in db.SIZE_ORDER:
        code = None
    base_colors = {c.lower() for c in base["colors"]}
    base_tags = {t.lower() for t in base["search_tags"]}
    scored = []
    for p in db.list_products():
        if p["product_id"] == product_id or p["total_stock"] == 0:
            continue
        if code and code not in p["sizes_in_stock"]:
            continue
        if color and not any(color.lower() in c.lower() for c in p["colors"]):
            continue
        if max_price is not None and p["price"] > max_price:
            continue
        full = db.get_product(p["product_id"]) or {}
        why, score = [], 0.0
        if p["category"] == base["category"]:
            score += 3; why.append(f"same category ({p['category']})")
        shared_c = base_colors & {c.lower() for c in p["colors"]}
        if shared_c:
            score += min(len(shared_c), 2); why.append("also " + "/".join(sorted(shared_c)[:2]))
        shared_t = base_tags & {t.lower() for t in full.get("search_tags", [])}
        score += 0.5 * min(len(shared_t), 4)
        diff = p["price"] - base["price"]
        score -= abs(diff) / 20
        if code:
            why.append(f"in stock in {code}")
        if abs(diff) >= 1:
            why.append(f"${abs(diff):.0f} {'less' if diff < 0 else 'more'}")
        else:
            why.append("same price")
        scored.append((score, p, ", ".join(why)))
    scored.sort(key=lambda x: (-x[0], x[1]["price"]))
    limit = max(1, min(int(limit or 4), 8))
    results = []
    for _, p, why in scored[:limit]:
        results.append({
            "product_id": p["product_id"], "name": p["name"], "category": p["category"], "price": p["price"],
            "colors": p["colors"], "short_description": p["short_description"],
            "sizes_in_stock": p["sizes_in_stock"],
            "sold_out_sizes": [s for s in db.SIZE_ORDER if s not in p["sizes_in_stock"]],
            "total_stock": p["total_stock"], "why": why,
        })
    return {"base_product_id": base["product_id"], "base_name": base["name"], "base_price": base["price"],
            "size": code, "color": color, "results": results,
            "notes": [] if results else ["No in-stock alternatives match those filters. Try dropping a filter."]}


def lookup_categories() -> dict:
    all_items = db.list_products()
    return {c: sum(p["category"] == c for p in all_items) for c in db.CATEGORIES}


# ---------------------------------------------------------------------------
# Typed tool results (what the agent receives)
# ---------------------------------------------------------------------------
def _not_found(product_id: str):
    from models import ToolError
    return ToolError(error=f"No product with id '{product_id}'.",
                     hint="Use search_products with the product's name to find its exact product_id.")


def search_products(query: str = "", category: str | None = None, max_price: float | None = None,
                    color: str | None = None, size: str | None = None, limit: int = 8):
    from models import SearchResult
    return SearchResult(**lookup_search(query, category, max_price, color, size, limit))


def get_product_details(product_id: str):
    from models import ProductInfo
    d = lookup_product(product_id)
    return ProductInfo(**d) if d else _not_found(product_id)


def get_price(product_id: str):
    from models import PriceInfo
    d = lookup_product(product_id)
    return PriceInfo(product_id=d["product_id"], name=d["name"], price=d["price"]) if d else _not_found(product_id)


def check_stock(product_id: str, size: str | None = None):
    from models import StockInfo
    d = lookup_stock(product_id, size)
    return StockInfo(**d) if d else _not_found(product_id)


def find_similar_products(product_id: str, size: str | None = None, color: str | None = None,
                          max_price: float | None = None, limit: int = 4):
    from models import SimilarResult
    d = lookup_similar(product_id, size, color, max_price, limit)
    return SimilarResult(**d) if d else _not_found(product_id)


def list_categories() -> dict[str, int]:
    return lookup_categories()


def product_cards(product_ids: list[str]) -> list[dict]:
    """Product cards for the browser, built straight from the database. Unknown ids are dropped."""
    cards = []
    for pid in product_ids:
        p = db.get_product(pid)
        if p:
            cards.append({k: p[k] for k in ("product_id", "name", "category", "garment_type", "price",
                                            "short_description", "colors", "image_url", "total_stock",
                                            "sizes_in_stock")})
    return cards


if __name__ == "__main__":
    r = lookup_search("navy hoodie", max_price=70, size="extra large", limit=2)
    print(r["filters"], r["total_matches"], [x["product_id"] for x in r["results"]])
    pid = "basic-hoodie-big-yale"
    print(lookup_stock(pid, "medium")["summary"])
    print(lookup_stock(pid, "3XL")["summary"])
    print(lookup_stock(pid)["summary"])
    sold = next(r for r in db.list_products() if r["total_stock"] and len(r["sizes_in_stock"]) < 6)
    s0 = [x for x in db.SIZE_ORDER if x not in sold["sizes_in_stock"]][0]
    print(lookup_stock(sold["product_id"], s0.lower())["summary"])
    print(lookup_product("nope"), lookup_categories())
    sim = lookup_similar("baseball-left-chest-crewneck", size="XS", limit=3)
    print("similar to", sim["base_name"], "in", sim["size"], "->", [(r["name"], r["price"], r["why"]) for r in sim["results"]])
    sim = lookup_similar("basic-hoodie-big-yale", color="pink")
    print("pink alternatives:", sim["results"], sim["notes"])
