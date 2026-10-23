"""Campus Customs API (FastAPI): products, images, accounts, and the PydanticAI shop assistant.

Run from hw4/backend/:
    uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

import logging
from pathlib import Path

from dotenv import load_dotenv

_HW4 = Path(__file__).resolve().parent.parent
load_dotenv(_HW4 / ".env")          # hw4/.env (SESSION_SECRET, PORTKEY_API_KEY, ...)
load_dotenv(_HW4.parent / ".env")   # fallback: the AI Class/.env

from fastapi import Cookie, FastAPI, HTTPException, Query, Request, Response  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

import agent  # noqa: E402
import auth  # noqa: E402
import chat_store  # noqa: E402
import db  # noqa: E402
from models import ChatRequest, ChatResponse, ChatTurn, CustomerContext, HistoryMessage  # noqa: E402

log = logging.getLogger("campus_customs")

SESSION_COOKIE = "cc_session"

app = FastAPI(title="Campus Customs API", version="0.2.0")

# The Vite dev server proxies /api and /media, but allow direct calls from it too.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):51[0-9]{2}",
    allow_methods=["GET", "POST", "DELETE"],
    allow_credentials=True,
    allow_headers=["*"],
)

# Product photos: data/products/<file>.jpg is served at /media/products/<file>.jpg
# (matches catalogue.image_file_path = 'products/<file>.jpg').
app.mount("/media/products", StaticFiles(directory=db.PRODUCTS_DIR), name="product-images")


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "database": db.DB_PATH.name, "model": agent.model_name(),
            "prompt": agent.PROMPT_PATH.name if agent.PROMPT_PATH.exists() else "MISSING"}


@app.get("/api/categories")
def categories() -> list[str]:
    return db.CATEGORIES


@app.get("/api/products")
def products(
    q: str | None = Query(default=None, max_length=100, description="Search words"),
    category: str | None = Query(default=None, max_length=40),
) -> list[dict]:
    return db.list_products(q=q, category=category)


@app.get("/api/products/{product_id}")
def product(product_id: str) -> dict:
    p = db.get_product(product_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


# ---------------------------------------------------------------------------
# Accounts (Problem 4)
# ---------------------------------------------------------------------------
class SignupIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=auth.MIN_PASSWORD, max_length=auth.MAX_PASSWORD)


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=auth.MAX_PASSWORD)


def _start_session(response: Response, user: dict) -> dict:
    response.set_cookie(
        SESSION_COOKIE, auth.make_session(user["id"]),
        max_age=auth.SESSION_SECONDS, httponly=True, samesite="lax",
        secure=False,  # set True when served over HTTPS
        path="/",
    )
    return {"user": user}


def current_user(cc_session: str | None) -> dict | None:
    uid = auth.read_session(cc_session)
    return auth.get_user(uid) if uid else None


@app.post("/api/auth/signup", status_code=201)
def signup(body: SignupIn, response: Response) -> dict:
    try:
        user = auth.create_user(body.first_name, body.last_name, body.email, body.password)
    except auth.AuthError as e:
        raise HTTPException(status_code=e.status, detail=str(e))
    return _start_session(response, user)  # signed in right after creating the account


@app.post("/api/auth/login")
def login(body: LoginIn, request: Request, response: Response) -> dict:
    client = request.client.host if request.client else ""
    try:
        user = auth.authenticate(body.email, body.password, client)
    except auth.AuthError as e:
        raise HTTPException(status_code=e.status, detail=str(e))
    return _start_session(response, user)


@app.post("/api/auth/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@app.get("/api/auth/me")
def me(cc_session: str | None = Cookie(default=None)) -> dict:
    return {"user": current_user(cc_session)}


# ---------------------------------------------------------------------------
# Chat (Problems 5, 7, 8): the PydanticAI agent + saved history for logged-in shoppers
# ---------------------------------------------------------------------------
def customer_context(user: dict) -> CustomerContext:
    return CustomerContext(
        user_id=user["id"], first_name=user["first_name"], last_name=user["last_name"], email=user["email"],
        member_since=(user.get("member_since") or "")[:10] or None,
        saved_messages=chat_store.stats(user["id"])["saved_messages"],
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, cc_session: str | None = Cookie(default=None)) -> ChatResponse:
    user = current_user(cc_session)
    if user:
        # Logged in: trust the database, not the browser, for who they are and what was said.
        customer = customer_context(user)
        history = [ChatTurn(**t) for t in chat_store.turns_for_agent(user["id"])]
        allowed = chat_store.shown_ids(user["id"])
    else:
        customer, history, allowed = None, body.history, set()
    try:
        resp = await agent.run_chat(body.message, history, customer, body.page, allowed)
    except Exception as e:  # model/API errors: log type only (no secrets), reply politely
        log.warning("chat failed: %s: %s", type(e).__name__, str(e)[:200])
        return ChatResponse(
            reply="Sorry, I'm having trouble reaching our assistant right now. Please try again in a moment, "
                  "or stop by the shop at 57 Broadway.",
            products=[],
        )
    if user:
        try:
            chat_store.save_exchange(user["id"], body.message, resp.reply, [c.model_dump() for c in resp.products])
        except Exception as e:  # never lose the reply just because saving failed
            log.warning("could not save chat: %s", type(e).__name__)
    return resp


@app.get("/api/chat/history", response_model=list[HistoryMessage])
def chat_history(cc_session: str | None = Cookie(default=None)) -> list[dict]:
    user = current_user(cc_session)
    if not user:
        raise HTTPException(status_code=401, detail="Log in to see your saved chat.")
    return chat_store.history_for_browser(user["id"])


@app.delete("/api/chat/history")
def clear_chat_history(cc_session: str | None = Cookie(default=None)) -> dict:
    user = current_user(cc_session)
    if not user:
        raise HTTPException(status_code=401, detail="Log in first.")
    return {"deleted": chat_store.clear(user["id"])}
