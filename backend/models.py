"""Pydantic / PydanticAI structured types for the Campus Customs backend."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Products (what the API and the chat send to the browser)
# ---------------------------------------------------------------------------
class SizeStock(BaseModel):
    size: str
    quantity: int
    status: Literal["in stock", "low", "sold out"]


class ProductCard(BaseModel):
    """A product card shown on the page. Always built from the database, never from model text."""

    product_id: str
    name: str
    category: str
    garment_type: str
    price: float
    short_description: str
    colors: list[str] = Field(default_factory=list)
    image_url: str
    total_stock: int
    sizes_in_stock: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Tool results (Problem 6): what the agent gets back from the database tools
# ---------------------------------------------------------------------------
class ProductBrief(BaseModel):
    """One search hit: enough to recommend an item and answer simple price/size questions."""

    product_id: str = Field(description="Exact id to pass to other tools and to show as a card")
    name: str
    category: str
    price: float = Field(description="Price in USD, straight from the catalogue")
    colors: list[str] = Field(default_factory=list)
    short_description: str
    sizes_in_stock: list[str] = Field(default_factory=list)
    sold_out_sizes: list[str] = Field(default_factory=list)
    total_stock: int


class SearchResult(BaseModel):
    query: str
    filters: dict[str, str | float] = Field(default_factory=dict)
    total_matches: int
    results: list[ProductBrief] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list, description="e.g. ignored/unknown filters")


class ProductInfo(BaseModel):
    """Everything about one product: description, price and stock by size."""

    product_id: str
    name: str
    category: str
    garment_type: str
    description: str = Field(description="Full catalogue description")
    price: float
    currency: Literal["USD"] = "USD"
    colors: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    stock: list[SizeStock] = Field(default_factory=list, description="Every size, XS to XXL")
    total_stock: int
    sizes_in_stock: list[str] = Field(default_factory=list)
    low_stock_sizes: list[str] = Field(default_factory=list, description="1-5 left")
    sold_out_sizes: list[str] = Field(default_factory=list)


class PriceInfo(BaseModel):
    product_id: str
    name: str
    price: float
    currency: Literal["USD"] = "USD"


class StockInfo(BaseModel):
    """Answer to 'is it in stock (in my size)?'. The summary is a ready, factual sentence."""

    product_id: str
    name: str
    price: float
    requested_size: str | None = Field(description="Normalized size asked about (e.g. 'L'), or null for all sizes")
    size_offered: bool = Field(description="False if the product doesn't come in the requested size")
    quantity: int | None = Field(description="Units left in the requested size, or null when no size was asked")
    status: Literal["in stock", "low", "sold out", "not offered", "see sizes"]
    in_stock: bool
    sizes_in_stock: list[str] = Field(default_factory=list)
    sold_out_sizes: list[str] = Field(default_factory=list)
    stock: list[SizeStock] = Field(default_factory=list)
    summary: str = Field(description="Plain-English stock sentence built from the database")


class SimilarItem(ProductBrief):
    why: str = Field(description="Short reason it's a good alternative, e.g. 'also a hoodie, also navy, in stock in XL, $10 less'")


class SimilarResult(BaseModel):
    """In-stock alternatives to one product (Problem 9)."""

    base_product_id: str
    base_name: str
    base_price: float
    size: str | None = Field(description="Size every result is in stock in (normalized), if one was asked")
    color: str | None = None
    results: list[SimilarItem] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class ToolError(BaseModel):
    error: str
    hint: str = ""


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------
class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class PageContext(BaseModel):
    """Where the shopper is on the site when they send a message (sent by the browser, checked by the server)."""

    path: str = Field(default="/", max_length=200)
    page_type: Literal["home", "products", "product", "about", "login", "signup", "other"] = "other"
    product_id: str | None = Field(default=None, max_length=120, description="Set on a single-product page")
    search: str | None = Field(default=None, max_length=100, description="?q= on the Products page")
    category: str | None = Field(default=None, max_length=40)
    on_page_product_ids: list[str] = Field(default_factory=list, max_length=12,
                                           description="Cards currently in the 'Assistant picks' section")


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatTurn] = Field(default_factory=list, max_length=20,
                                    description="Guests only: recent turns, oldest first. Logged-in history comes from the DB.")
    page: PageContext = Field(default_factory=PageContext)


class CustomerContext(BaseModel):
    """Who is chatting (from the session cookie, never from the browser's word). Goes into agent deps."""

    user_id: int
    first_name: str
    last_name: str
    email: str
    member_since: str | None = None
    saved_messages: int = 0


class CurrentProduct(BaseModel):
    """The product on the page the shopper is looking at, verified against the database."""

    product_id: str
    name: str
    category: str
    price: float
    colors: list[str]
    sizes_in_stock: list[str]
    sold_out_sizes: list[str]


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    products: list[ProductCard] = Field(default_factory=list)
    created_at: str


class ShopReply(BaseModel):
    """What the agent returns (its output_type). This is the agent's half of the page-update contract."""

    reply: str = Field(description="Friendly answer for the shopper, in short markdown (bold and bullets are fine)")
    product_ids: list[str] = Field(
        default_factory=list,
        max_length=12,
        description="Products to show ON THE PAGE as cards, best first (up to 12). "
                    "ONLY ids returned by a tool in this conversation. Empty list = leave the page as it is.",
    )
    results_title: str | None = Field(
        default=None,
        max_length=60,
        description="Short heading for the cards on the page, e.g. 'Hoodies', 'Navy crewnecks under $60', "
                    "'Gifts for Mom'. Required when product_ids is not empty.",
    )


class SeeAll(BaseModel):
    """The agent's last search, so the page can link to every match on /products."""

    q: str = ""
    category: str | None = None
    total_matches: int


class ChatResponse(BaseModel):
    """What /api/chat sends back to the website (the API's half of the contract).

    If `products` is not empty, the front end shows them on the page under `results_title`.
    Cards are built from the database, so name, price, image and stock are always real.
    """

    reply: str
    results_title: str | None = None
    products: list[ProductCard] = Field(default_factory=list)
    see_all: SeeAll | None = Field(default=None, description="Link to the full Products page when there are more matches")
    stub: bool = False


# ---------------------------------------------------------------------------
# Audit trail (Problem 12): output/audit_trail.json, append-only
# ---------------------------------------------------------------------------
class AuditToolCall(BaseModel):
    name: str
    args: dict = Field(default_factory=dict, description="Tool arguments, long values trimmed")
    result: str = Field(default="(pending)", description="One-line summary of what the tool returned")
    ok: bool = True


class AuditEntry(BaseModel):
    """One agent-loop step. Every chat message appends one or more of these; the file is never wiped."""

    run_id: str = Field(description="Same for every step of one chat message")
    step: int = Field(description="1, 2, 3 ... within the run")
    timestamp: str = Field(description="ISO time with timezone")
    user: str = Field(description="'user:<id>' for logged-in shoppers, 'guest' otherwise (no names/emails in logs)")
    page: str = Field(default="", description="Page path the message was sent from")
    message: str = Field(default="", description="The shopper's message, first 200 characters")
    model: str
    tool_calls: list[AuditToolCall] = Field(default_factory=list)
    retries: list[str] = Field(default_factory=list, description="Validator / fact-check rejections in this step")
    final_reply: str | None = Field(default=None, description="Reply preview (last step only)")
    product_ids: list[str] = Field(default_factory=list, description="Cards put on the page (last step only)")
    stop_reason: str | None = Field(default=None, description="Last step only: completed / usage limit / error")
    usage: dict[str, int] | None = None
