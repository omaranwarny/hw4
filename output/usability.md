# Usability Improvements

I made four improvements: two to the website and two to the agent and backend. Each section says **what I added**, **why it helps** a Campus Customs shopper or the business, and **where to see it** in the running app.

---

## Front end 1: Smarter Products page (sort, size, budget, size availability on cards)

**What I added**

- A **Sort** menu on `/products`: Featured, Price low to high, Price high to low, and Name A–Z.
- An **"In stock in my size"** filter (XS–XXL chips). It hides anything sold out in that size.
- A **Budget** filter: any, under $40, under $60, or under $80.
- Every product card now shows a **size row** (XS S M L XL XXL), with sold-out sizes crossed out. Cards with only a few sizes left show a small **"Few sizes left"** badge.
- All filters live in the URL (for example `/products?category=Hoodies&size=XL&max=60&sort=price-asc`), so results can be shared and the Back button works. A **Clear filters** link resets everything.

**Why it helps**

- Most shoppers know their size and budget before they browse. Before, they had to open each product to find out it was sold out in XL. Now they see only what they can actually buy, at a glance, so there's less frustration and fewer dead ends.
- For the business, fewer "is this in my size?" trips mean more add-to-bag moments. It also cuts questions to staff and the chatbot.
- Sorting by price helps budget-minded students (and gift-buying parents) find options fast.

**Where to see it:** the Products page, above the grid. Look at the size row on any card.

---

## Front end 2: One-tap chat (suggestion chips and "Ask about this item")

**What I added**

- **Suggestion chips** above the chat input that change with the page:
  - **Home:** "What hoodies do you have?", "Gift for Mom under $60", "Show me Saybrook gear"
  - **Products page:** "What's under $40?", "Crewnecks in XL", "Best gift for Dad?"
  - **A product page:** "Is this in stock in M?", "What colors does this come in?", "Show me similar items"

  One tap sends the question.
- An **"💬 Ask about this item"** button on every product page. It opens the chat with product-specific suggestions ready.
- Chips hide while the assistant is answering, and come back after each reply.
- On a product that's sold out in some sizes, a **"Sold out in your size? Find similar items in stock →"** link opens the chat and asks for in-stock alternatives in those sizes automatically. It connects to Agent improvement 1.

**Why it helps**

- Many shoppers don't know what the assistant can do, or don't want to type on a phone. Chips show the best questions and answer them in one tap.
- The product-page button connects the two halves of the site: when someone is unsure about an item (size, color, alternatives), help is one click away instead of hidden in a corner.
- For the business, it means more chatbot use where buying decisions happen.

**Where to see it:** open the chat on Home, Products, or any product page. On a product page, click "💬 Ask about this item" next to the price, or the "Find similar items" link under the stock table.

---

## Agent / backend 1: `find_similar_products` tool (real alternatives)

**What I added**

- A new agent tool, **`find_similar_products(product_id, size?, color?, max_price?)`**. Given a product, it ranks the rest of the catalogue by:
  - same category
  - shared colors
  - shared tags (college, sport, family)
  - closeness in price

  It **only returns items that are actually in stock** (in the requested size, if one is given). Each result includes a short **`why`** ("same category, also navy, in stock in XL, $10 less").
- It returns a typed `SimilarResult` (in `models.py`). The prompt tells the agent to use it whenever an item is sold out in the shopper's size, doesn't come in their color, or they ask for "something like this".

**Why it helps**

- "Sold out in XL" used to be a dead end. Now the agent can immediately say "this one's sold out in XL, but here are 3 similar navy hoodies in XL", and they appear as cards on the page.
- That saves the sale instead of losing the shopper, and the alternatives are real and in stock, not guesses.
- It's faster and cheaper too: one tool call replaces several trial-and-error searches.

**Where to see it:** on a product page, ask "Show me similar items", or ask about a sold-out size (for example the Baseball Left Chest Crewneck in XS).

---

## Agent / backend 2: Price and stock fact-checker

**What I added**

- An **output validator** that runs on every reply **before the shopper sees it**:
  - It finds every **dollar amount** ("$68.00", "$45–$98") and every **stock count** ("only 3 left", "5 available") in the reply text.
  - It checks each one against the numbers the **database tools returned in this conversation**: prices and quantities of products the agent looked up, the product on screen, and products shown earlier. Budgets the shopper typed ("under $60") are allowed too.
  - If a number doesn't match, the reply is **sent back to the model** with a note ("You wrote $65 but no product you looked up costs $65 — call get_price…"), and the model fixes it. Everything happens on the server before anything is shown.
- Each check is logged (`fact-check: rejected $65`), so mistakes can be counted over time.

**Why it helps**

- A wrong price or a made-up "only 2 left" is the worst thing a shop chatbot can say. It breaks trust, and it can be a real problem at the register. The prompt already says "use the tools", but this check **enforces** it in code.
- Shoppers can trust the numbers in the chat, and the business is protected from the bot promising prices or stock it doesn't have.

**Where to see it:** ask for prices or stock in the chat. Every number matches the product page. Rejections show up in the backend terminal as `fact-check:` lines.

---

## Where each improvement lives in the code

| Improvement | Files |
|---|---|
| FE1: Smarter Products page | `frontend/src/pages/Products.tsx` (toolbar, URL filters), `components/ProductCard.tsx` (size row, "Few sizes left" badge), `index.css` |
| FE2: One-tap chat | `frontend/src/components/ChatWidget.tsx` (`suggestionsFor`, `openChat`), `pages/ProductDetail.tsx` (Ask button, "Find similar" link) |
| Agent 1: `find_similar_products` | `backend/tools.py` (`lookup_similar`, `find_similar_products`), `backend/models.py` (`SimilarItem`, `SimilarResult`), `backend/agent.py` (tool), `prompts/prompt.md` |
| Agent 2: Fact-checker | `backend/agent.py` (`note_facts`, `fact_check`, `check_output` validator, `retries=3`), `prompts/prompt.md` |

**Tested here:**

- `lookup_similar("baseball-left-chest-crewneck", size="XS")` returns 3 same-price crewnecks in stock in XS. A pink request on a product with no pink returns none, with a note.
- The fact-checker accepts "$68.00 … only 5 left in M" and a shopper's "under $60". It rejects a made-up "$65" and "only 3 left" when the database says 2.
