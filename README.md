# Campus Customs: Shop Website + AI Assistant (HW4)

A customer website for **Campus Customs** (home of Yale Bulldog Blue, 57 Broadway, New Haven). It has a **React + Vite + TypeScript** front end and a **FastAPI** backend, and its shop assistant is a **PydanticAI agent**. Shoppers can browse products, create an account, and chat about merch. Matching items appear on the page, and every price and stock answer comes from a local SQLite database.

> Class project inspired by Yale Bulldog Blue by Campus Customs. Not affiliated with or endorsed by the shop or Yale.

## What's inside

```
hw4/
├── AI_prompts.md          # prompts used to build this, one section per problem
├── requirements.txt       # Python dependencies (backend)
├── .env.example           # environment variables (placeholders only)
├── frontend/              # Vite + React + TypeScript site
├── backend/
│   ├── main.py            # FastAPI app: uvicorn main:app --reload --port 8000
│   ├── agent.py           # PydanticAI agent wiring (model, prompt, tools, checks)
│   ├── tools.py           # read-only database tools the agent can call
│   ├── models.py          # Pydantic / PydanticAI types
│   ├── prompts/prompt.md  # system prompt: voice, tool use, safety rules
│   ├── db.py, auth.py, chat_store.py, audit.py   # DB access, accounts, saved chats, audit log
└── output/                # harness.md, design.md, usability.md, app_check.html (+ images), audit_trail.json
```

## 1. Place the data pack (not in git)

The database and product photos are **not** in this repo. Put them here:

```
hw4/data/
├── campus_customs.db      # tables: catalogue, inventory, users, chat_messages
└── products/              # product images referenced by catalogue.image_file_path
```

## 2. Set up once

You need **Python 3.11+**, **Node 20+**, and an AI API key. The project uses OpenAI models through **Portkey**.

```bash
cd hw4

# Python backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Environment variables
cp .env.example .env
#   PORTKEY_API_KEY = your Portkey key
#   OPENAI_MODEL    = gpt-5.6-luna (or another 5.6 / 6 series model)
#   SESSION_SECRET  = a long random string, e.g. the output of:
python -c "import secrets; print(secrets.token_hex(32))"

# Front end
cd frontend
npm install
cd ..
```

## 3. Run it (two terminals)

**Terminal 1: backend** (run it **from `backend/`**)

```bash
cd hw4/backend
source ../.venv/bin/activate
uvicorn main:app --reload --port 8000
```

Check http://127.0.0.1:8000/api/health. It should show the database, the model, and `"prompt": "prompt.md"`.

**Terminal 2: front end**

```bash
cd hw4/frontend
npm run dev
```

Open the URL it prints (usually **http://localhost:5173**). Vite forwards `/api` and `/media` to the backend on port 8000.

## 4. Try it

- **Test account:** `test@campuscustoms.yale.edu` / `password`, or create your own account.
- Ask the chat (💬, bottom right):
  - *"What hoodies do you have?"*: cards appear at the top of the page.
  - On a product page: *"Do you have this in XL?"* or *"Do you have this in pink?"*
  - *"Show me similar items"* when a size is sold out.
- Products page: filter **In stock in my size**, **Budget**, and **Sort**.

## Notes

- **Prices and stock always come from the database.** A fact-checker blocks any number the tools didn't return.
- Logged-in chats are saved in `chat_messages` and reload when you return. Guests can chat, but nothing is saved.
- Every agent step is appended to `output/audit_trail.json`.
- Full details: [`output/harness.md`](output/harness.md) (architecture, tools, models, safety, limits), [`output/usability.md`](output/usability.md), [`output/design.md`](output/design.md), [`output/app_check.html`](output/app_check.html).

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm run dev` says it can't find `package.json` | `cd hw4/frontend` first |
| Page keeps loading | Make sure the backend is running, open http://127.0.0.1:8000/api/health, and hard-refresh (Cmd+Shift+R) |
| Chat says it can't reach the assistant | Check `PORTKEY_API_KEY` in `.env` and the backend terminal for errors |
| `Database not found` | Put `campus_customs.db` in `hw4/data/` |
