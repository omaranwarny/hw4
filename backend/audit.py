"""Append-only audit trail of agent-loop activity -> hw4/output/audit_trail.json.

One AuditEntry per agent step (a model response + the tool results that came back), plus the
stop reason on the last step. Never wiped: each write reads the list, appends, and atomically
replaces the file. A lock keeps concurrent chats from clobbering each other. Logs contain
user ids (not names/emails), short message previews and one-line tool summaries only.
"""
from __future__ import annotations

import json
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path

from pydantic_ai.messages import ModelRequest, ModelResponse, RetryPromptPart, ToolCallPart, ToolReturnPart

from models import AuditEntry, AuditToolCall

AUDIT_PATH = Path(__file__).resolve().parent.parent / "output" / "audit_trail.json"
_lock = threading.Lock()


def _now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def _short(x: object, n: int = 160) -> str:
    s = " ".join(str(x).split())
    return s if len(s) <= n else s[: n - 1] + "…"


def _trim_args(args: dict) -> dict:
    return {k: (_short(v, 80) if isinstance(v, str) else v) for k, v in (args or {}).items()}


def summarize(content: object) -> tuple[str, bool]:
    """One-line summary of a tool result (typed model or dict)."""
    d = content.model_dump() if hasattr(content, "model_dump") else content
    if isinstance(d, dict):
        if "error" in d:
            return f"error: {_short(d['error'], 120)}", False
        if "summary" in d:                                   # StockInfo
            return _short(d["summary"]), True
        if "results" in d and isinstance(d["results"], list):  # SearchResult / SimilarResult
            ids = [r.get("product_id") for r in d["results"]][:5]
            total = d.get("total_matches", len(d["results"]))
            return f"{len(d['results'])} shown of {total}: {', '.join(i for i in ids if i)}", True
        if "price" in d and "name" in d:                     # PriceInfo / ProductInfo
            extra = f", stock {d['total_stock']}" if "total_stock" in d else ""
            return f"{d['name']}: ${float(d['price']):.2f}{extra}", True
        if "logged_in" in d:
            return f"logged_in={d['logged_in']}", True
        return _short(json.dumps(d, default=str)), True
    return _short(d), True


def append(entry: AuditEntry) -> None:
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _lock:
        try:
            data = json.loads(AUDIT_PATH.read_text(encoding="utf-8")) if AUDIT_PATH.exists() else []
            if not isinstance(data, list):
                data = [data]
        except json.JSONDecodeError:
            # Never destroy history: keep the unreadable file aside and start a new list.
            AUDIT_PATH.rename(AUDIT_PATH.with_name(f"audit_trail.broken-{int(time.time())}.json"))
            data = []
        data.append(entry.model_dump())
        tmp = AUDIT_PATH.with_suffix(".tmp")
        tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(AUDIT_PATH)


class AuditRun:
    """Collects one chat message's agent loop and appends a step per model response."""

    def __init__(self, user: str, page: str, message: str, model: str):
        self.base = dict(run_id=uuid.uuid4().hex[:8], user=user, page=page, message=_short(message, 200), model=model)
        self.step = 0
        self.pending: AuditEntry | None = None
        self.ids: list[str] = []

    def on_response(self, resp: ModelResponse) -> None:
        self._flush()
        self.step += 1
        calls, ids = [], []
        for part in resp.parts:
            if isinstance(part, ToolCallPart):
                calls.append(AuditToolCall(name=part.tool_name, args=_trim_args(part.args_as_dict())))
                ids.append(part.tool_call_id)
        self.pending = AuditEntry(step=self.step, timestamp=_now(), tool_calls=calls, **self.base)
        self.ids = ids

    def on_request(self, req: ModelRequest) -> None:
        if not self.pending:
            return
        for part in req.parts:
            if isinstance(part, ToolReturnPart) and part.tool_call_id in self.ids:
                call = self.pending.tool_calls[self.ids.index(part.tool_call_id)]
                call.result, call.ok = summarize(part.content)
            elif isinstance(part, RetryPromptPart):
                msg = _short(part.content if isinstance(part.content, str) else json.dumps(part.content, default=str), 220)
                self.pending.retries.append(msg)
                if part.tool_call_id in self.ids:
                    call = self.pending.tool_calls[self.ids.index(part.tool_call_id)]
                    call.result, call.ok = "rejected, retry requested", False
        self._flush()

    def finish(self, stop_reason: str, reply: str | None = None, product_ids: list[str] | None = None,
               usage: object | None = None) -> None:
        entry = self.pending or AuditEntry(step=self.step + 1, timestamp=_now(), **self.base)
        entry.stop_reason = stop_reason
        entry.final_reply = _short(reply, 300) if reply else None
        entry.product_ids = list(product_ids or [])
        if usage is not None:
            entry.usage = {k: int(getattr(usage, k)) for k in ("requests", "tool_calls", "input_tokens", "output_tokens")
                           if isinstance(getattr(usage, k, None), int)}
        append(entry)
        self.pending = None

    def _flush(self) -> None:
        if self.pending and self.pending.tool_calls:
            append(self.pending)
            self.pending = None
