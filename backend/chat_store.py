"""Saved chat history for logged-in shoppers (table: chat_messages).

Schema (already in campus_customs.db):
    chat_messages(id, user_id -> users.id, role 'user'|'assistant', content, products_json, created_at)
- products_json holds the product cards shown with an assistant reply (a JSON list, same format the seed rows use).
- On reload we only trust the product_ids from it and rebuild cards from the live catalogue,
  so old chats never show stale prices or stock.
"""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from typing import Iterator

import db
import tools

MAX_STORED_CHARS = 4000
HISTORY_LIMIT = 50          # messages returned to the browser
CONTEXT_TURNS = 10          # messages replayed to the agent


@contextmanager
def _conn(write: bool = False) -> Iterator[sqlite3.Connection]:
    if write:
        conn = sqlite3.connect(db.DB_PATH)
    else:
        conn = sqlite3.connect(f"file:{db.DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def save_exchange(user_id: int, user_text: str, reply: str, cards: list[dict]) -> None:
    """Save one user message + the assistant's reply together (one transaction)."""
    with _conn(write=True) as conn:
        conn.execute("INSERT INTO chat_messages (user_id, role, content, products_json) VALUES (?, 'user', ?, NULL)",
                     (user_id, user_text[:MAX_STORED_CHARS]))
        conn.execute("INSERT INTO chat_messages (user_id, role, content, products_json) VALUES (?, 'assistant', ?, ?)",
                     (user_id, reply[:MAX_STORED_CHARS], json.dumps(cards) if cards else None))
        conn.commit()


def _ids(products_json: str | None) -> list[str]:
    try:
        items = json.loads(products_json or "[]")
        return [str(p["product_id"]) for p in items if isinstance(p, dict) and p.get("product_id")]
    except (json.JSONDecodeError, TypeError):
        return []


def recent(user_id: int, limit: int) -> list[sqlite3.Row]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT id, role, content, products_json, created_at FROM chat_messages "
            "WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit)).fetchall()
    return list(reversed(rows))


def history_for_browser(user_id: int) -> list[dict]:
    """Last messages for the chat panel, with product cards rebuilt from the live catalogue."""
    out = []
    for r in recent(user_id, HISTORY_LIMIT):
        cards = tools.product_cards(_ids(r["products_json"])) if r["role"] == "assistant" else []
        out.append({"role": r["role"], "content": r["content"], "products": cards, "created_at": r["created_at"]})
    return out


def turns_for_agent(user_id: int) -> list[dict]:
    """Recent turns as plain text for the agent; product ids shown are noted so follow-ups make sense."""
    turns = []
    for r in recent(user_id, CONTEXT_TURNS):
        text = r["content"][:3500]
        ids = _ids(r["products_json"]) if r["role"] == "assistant" else []
        if ids:
            text += f"\n[Products shown with this reply: {', '.join(ids[:12])}]"
        turns.append({"role": r["role"], "content": text})
    return turns


def shown_ids(user_id: int) -> set[str]:
    """Product ids the assistant showed in recent turns (allowed to be shown again without a new search)."""
    ids: set[str] = set()
    for r in recent(user_id, CONTEXT_TURNS):
        ids.update(_ids(r["products_json"]))
    return ids


def stats(user_id: int) -> dict:
    with _conn() as conn:
        n, first = conn.execute("SELECT COUNT(*), MIN(created_at) FROM chat_messages WHERE user_id = ?",
                                (user_id,)).fetchone()
    return {"saved_messages": n, "chatting_since": first}


def clear(user_id: int) -> int:
    with _conn(write=True) as conn:
        cur = conn.execute("DELETE FROM chat_messages WHERE user_id = ?", (user_id,))
        conn.commit()
        return cur.rowcount
