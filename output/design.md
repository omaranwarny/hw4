# Design: "Heritage Varsity Storefront"

**Goal:** make the site feel like walking into a Yale shop on Broadway (felt pennants, a chenille letter, hang tags on the merch, a friendly bulldog behind the counter), not a generic template. Every change below either keeps shoppers looking longer or moves them toward a product.

| What I changed | Why it helps customers stay and buy |
|---|---|
| **Type system:** *Fraunces* (heavy editorial serif) for headings, *DM Sans* for body text, *Graduate* (a varsity block font) for labels, sizes, and eyebrows | Instantly reads "collegiate heritage". Clear hierarchy: shoppers scan headline → category → price without effort. |
| **Palette and texture:** Yale blue `#00356b` + white, a sky-blue accent, a **gold** highlight for prices and active states, and a warm paper background with a faint grain | Feels like a real shop, not a web app. Gold draws the eye to prices and calls to action. |
| **Shop-window ticker:** a scrolling strip ("★ Officially licensed… ★ 57 Broadway… ★ Ask our assistant…") that pauses on hover | Shows trust signals and the assistant without taking space, like a storefront marquee |
| **Hero:** a big **chenille "Y" varsity patch** (stitched border, fuzzy texture) with **real products floating around it** (pulled from the database, gently bobbing, each with a gold price tag). Headline: "Wear the *Blue.* Bring the **Bulldog.**" Stats: 102 styles · XS–XXL · from $32. | Products are visible in the first second, and every floating card is clickable. Price and range up front reduce hesitation. |
| **Pennant navigation:** "Pick your pennant": Colleges / Sports / Family / Grad Schools as felt pennants that swing on hover | A playful, on-brand way into the four main buying reasons. More fun to click than plain tiles. |
| **Product cards:** cream "shelf" backdrop, image zooms on hover, and the price sits on a **clothing hang tag** (with a punched hole) that tips when you hover | Feels like browsing a rack, and the price is the most visible thing on the card |
| **Product page:** a shop-shelf backdrop with **hover-to-zoom** that follows the cursor (see the crest and stitching), varsity-font size buttons, and a heavy serif price | Shoppers can inspect quality like in the store, which builds confidence to buy |
| **Chat as a counter clerk:** an original **bulldog-badge avatar** on the launcher ("Ask the shop") and next to every reply, a letterman-stripe header, chat-style bubbles with tails, **paw-print typing dots**, and a pop-in panel | Gives the assistant a friendly face and makes it inviting to use, and the assistant is what shows stock and products |
| **"Fully stocked favorites" and a letterman band:** a home row of real in-stock items, plus a striped band that offers one-tap questions ("Gift for Mom under $60") | Turns browsers into product views and chats |
| **Ticket-style visit card + campus skyline footer:** a dashed "Admit one · Bulldog" card for 57 Broadway, and an original gothic-skyline silhouette on the footer | Ties the website to the physical shop and New Haven, which nudges in-store visits |
| **Motion:** sections fade up as you scroll, cards and pennants respond to hover, and chat bubbles slide in. **All of it turns off for `prefers-reduced-motion`.** | Makes the shop feel alive without slowing anyone down, and stays accessible |
| **Mobile:** the hero stacks, the patch and cards shrink, and the chat launcher becomes a bulldog-only button | The same look works on phones, where students actually shop |

**Files:**

- `frontend/index.html` (fonts)
- `src/index.css` (the "Problem 10" design layer)
- `src/pages/Home.tsx` (hero, pennants, favorites, band, ticket)
- `src/components/NavBar.tsx` (ticker, stitched logo)
- `src/components/ProductCard.tsx` (hang tag)
- `src/pages/ProductDetail.tsx` (zoom)
- `src/components/ChatWidget.tsx` + `Bulldog.tsx` (chat look)
- `src/components/Skyline.tsx` + `Footer.tsx` (skyline)
- `src/hooks/useReveal.ts` (scroll reveal)

All illustrations (the bulldog, the skyline, the "Y" patch) are original drawings made with code. No logos or images were copied from Yale or the shop.
