"""Accounts, passwords and sessions for Campus Customs.

Passwords (matches the seeded users exactly):
    stored = "pbkdf2_sha256$<salt>$<hex hash>"
    hash   = PBKDF2-HMAC-SHA256(password, salt.encode("utf-8"), 120_000 iterations), hex-encoded
- Signup: new random salt per user, then hash.
- Login: read the salt from the stored string (never make a new one), re-hash what was typed,
  and compare with hmac.compare_digest (constant time). Hashes are never "un-hashed".

Sessions: a signed, expiring token in an HttpOnly cookie ("<user_id>.<expires>.<hmac>").
JavaScript (and anything injected into the page or the chatbot) can't read it, and it can't be forged
without SESSION_SECRET.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import threading
import time
from contextlib import contextmanager
from typing import Iterator

import db

ALGO = "pbkdf2_sha256"
ITERATIONS = 120_000
SESSION_SECONDS = 7 * 24 * 3600          # 1 week
MIN_PASSWORD, MAX_PASSWORD = 8, 128
MAX_FAILS, FAIL_WINDOW = 5, 15 * 60       # 5 wrong passwords per email+IP per 15 minutes
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class AuthError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
def _pbkdf2(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), ITERATIONS).hex()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)  # 32 random hex chars, unique per user
    return f"{ALGO}${salt}${_pbkdf2(password, salt)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, salt, expected = stored.split("$")
    except ValueError:
        return False
    if algo != ALGO:
        return False
    return hmac.compare_digest(_pbkdf2(password, salt), expected)


# Used when the email doesn't exist, so a wrong email takes as long as a wrong password
# (stops attackers from discovering which emails have accounts by timing the response).
_DUMMY_HASH = hash_password(secrets.token_hex(16))


# ---------------------------------------------------------------------------
# Users table (the only place the app writes to the database)
# ---------------------------------------------------------------------------
@contextmanager
def _write_conn() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(db.DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def public_user(row: sqlite3.Row) -> dict:
    """What leaves the server about a user. Never the password hash."""
    return {"id": row["id"], "first_name": row["first_name"] or row["name"].split(" ")[0],
            "last_name": row["last_name"] or "", "name": row["name"], "email": row["email"],
            "member_since": row["created_at"]}


def normalize_email(email: str) -> str:
    return email.strip().lower()


def create_user(first_name: str, last_name: str, email: str, password: str) -> dict:
    first, last, email = first_name.strip(), last_name.strip(), normalize_email(email)
    if not first or not last:
        raise AuthError("Please enter your first and last name.")
    if len(first) > 60 or len(last) > 60:
        raise AuthError("Names must be 60 characters or fewer.")
    if not EMAIL_RE.match(email) or len(email) > 254:
        raise AuthError("Please enter a valid email address.")
    if not (MIN_PASSWORD <= len(password) <= MAX_PASSWORD):
        raise AuthError(f"Passwords must be {MIN_PASSWORD} to {MAX_PASSWORD} characters.")
    stored = hash_password(password)
    with _write_conn() as conn:
        try:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash, first_name, last_name) VALUES (?, ?, ?, ?, ?)",
                (f"{first} {last}", email, stored, first, last),
            )
            conn.commit()
        except sqlite3.IntegrityError:  # UNIQUE(email)
            raise AuthError("An account with that email already exists. Try logging in.", 409)
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    return public_user(row)


_fails: dict[str, list[float]] = {}
_fails_lock = threading.Lock()


def _too_many(key: str) -> bool:
    now = time.time()
    with _fails_lock:
        recent = [t for t in _fails.get(key, []) if now - t < FAIL_WINDOW]
        _fails[key] = recent
        return len(recent) >= MAX_FAILS


def _record_fail(key: str) -> None:
    with _fails_lock:
        _fails.setdefault(key, []).append(time.time())


def authenticate(email: str, password: str, client: str = "") -> dict:
    email = normalize_email(email)
    key = f"{email}|{client}"
    if _too_many(key):
        raise AuthError("Too many attempts. Please wait a few minutes and try again.", 429)
    with db.connect() as conn:  # read-only connection for the lookup
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    ok = verify_password(password, row["password_hash"] if row else _DUMMY_HASH)
    if not row or not ok:
        _record_fail(key)
        raise AuthError("Email or password is incorrect.", 401)  # same message either way
    with _fails_lock:
        _fails.pop(key, None)
    return public_user(row)


def get_user(user_id: int) -> dict | None:
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return public_user(row) if row else None


# ---------------------------------------------------------------------------
# Signed session tokens
# ---------------------------------------------------------------------------
def _secret() -> bytes:
    s = os.getenv("SESSION_SECRET")
    if not s:
        # Dev fallback: random per process, so sessions just reset when the server restarts.
        s = _secret.fallback  # type: ignore[attr-defined]
    return s.encode("utf-8")


_secret.fallback = secrets.token_hex(32)  # type: ignore[attr-defined]


def make_session(user_id: int) -> str:
    expires = int(time.time()) + SESSION_SECONDS
    payload = f"{user_id}.{expires}"
    sig = hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"


def read_session(token: str | None) -> int | None:
    if not token:
        return None
    try:
        uid, expires, sig = token.split(".")
        good = hmac.new(_secret(), f"{uid}.{expires}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, good) or int(expires) < time.time():
            return None
        return int(uid)
    except (ValueError, TypeError):
        return None
