# AI Prompts Log — HW4

## Problem 1: Create the hw4 folder

**Prompt:**
starting new work, can you make a folder called hw4? same setup as last time

## Problem 2: Analyze the database

**Prompt:**
dig into data/campus_customs.db and figure out what's in each table, at least catalogue, inventory and users. then start output/harness.md with every table and its fields, plus a quick line on why each field matters for the shop or the chatbot

**Follow-up:**
can you also check the actual data, like price range, sizes, how much is out of stock, and if any image paths are broken?

## Problem 3: Build the Campus Customs website

**Prompt:**
set up the front end with react + vite + typescript. I want a nav bar across the top with Home, Products, About Us, Log in and Create account. look at yalebulldogblue.com to get a feel for how campus customs talks about itself, but write the home and about pages in our own words, don't copy their text

**Follow-up:**
make it look like the real shop, yale blue and white, and make sure the nav works on mobile too

**Follow-up:**
now make the products page real: show every product from the database with its photo, name, price and a short description. clicking one should open its own page with a big image on one side and all the details on the other (description, price, sizes and stock). also add a chat bubble in the bottom right. it doesn't need ai yet, just a stub that hits the backend. start a small fastapi app in backend/main.py to serve the products and images

**Follow-up:**
the localhost page just keeps loading forever. backend health check works fine, can you figure out what's hanging?

## Problem 4: Create account and login

**Prompt:**
build real sign up and login. sign up needs first name, last name, email, password and confirm password, and login is just email and password. new accounts go in the users table. passwords have to be stored safely, same pbkdf2-sha256 setup with 120k iterations as the test user so both old and new accounts work. then write up in harness.md how auth works

**Follow-up:**
make sure the test user can log in and a brand-new account works too. also don't give away whether an email exists when someone types the wrong password

**Follow-up:**
I can't find the .env file and the page won't load after I restarted. npm run dev says it can't find package.json

## Problem 5: PydanticAI agent backend

**Prompt:**
time to make the chatbot real. build it as a pydantic ai agent behind fastapi and hook it up to the chat widget. keep backend/main.py as the app uvicorn runs, and split the agent into 4 files like hw3: prompts/prompt.md, agent.py, tools.py, models.py. the prompt should sound like campus customs and cover safety basics. it has to run from inside backend/ with `uvicorn main:app --reload --port 8000`. then add notes to harness.md on how the front end talks to fastapi and how the agent gets loaded

**Follow-up:**
make sure the product cards in the chat come from the database, not whatever the model says, so prices are always right

## Problem 6: Tools for product info and stock

**Prompt:**
give the agent proper tools to look up the product description, the price, and how many are in stock, by size when someone asks. it has to pull everything from the database and never make up a price or a number. if a size is sold out it should just say so clearly. update the prompt so it knows when to call each tool, add the return types to models.py, and list the tools + why we picked those fields in harness.md

**Follow-up:**
people will type "large" or "2xl" instead of L or XXL, make sure the stock check understands that

## Problem 7: Chat search that updates the page

**Prompt:**
cool feature time: when someone asks the chat something like "what hoodies do you have?", the agent should search and the matching products should pop up on the actual page as cards (image, name, price, short info). treat it like an api contract, the agent returns structured product matches and the front end renders them. those cards have to open the same product detail page as the normal ones. update the prompt and harness so it's clear how results get to the page

**Follow-up:**
there are 27 hoodies but only 12 show up, add a "see all" link that takes you to the full list on the products page

## Problem 8: Customer memory

**Prompt:**
when someone is logged in, save their chat in the database and load it back when they come back. the agent should know who it's talking to (name and email), put that in the agent deps. also send what page they're on so if they're looking at a product and ask "do you have this in pink?" it knows which item they mean. guests can still chat, their history just doesn't need to be saved. write up in harness.md how history is stored, what customer info the agent gets, and how page context is passed

**Follow-up:**
use the chat_messages table that's already in the db, and add a way for people to clear their saved chat

## Problem 9: Usability improvements

**Prompt:**
now let's make it better. pick 2 front end and 2 agent/backend improvements and build them. I'm thinking sorting and a size filter on the products page, quick question buttons in the chat, a tool that finds similar items when something is sold out, and something that double-checks the bot never says a wrong price. write output/usability.md first explaining what each one is and why it helps shoppers or the shop

**Follow-up:**
on the product page add a button that opens the chat about that item, and a link to find similar items when your size is sold out

## Problem 11: Site testing (app check)

**Prompt:**
make an output/app_check.html I can just double click, with screenshots from the live site proving three things: the chat checking an item's stock and price straight from the db, the hoodie cards showing up on the page after I ask about hoodies, and one of the usability features we added. give each one a heading, the screenshot, and a sentence or two on what it proves. screenshots go in output/app_check_images/

**Follow-up:**
put what the database actually says next to the stock screenshot so it's obvious the bot isn't making numbers up

## Problem 12: Audit trail, safety, finish harness

**Prompt:**
last backend piece: every time the agent runs, append its loop steps to output/audit_trail.json (time, tool name, short args and result, stop reason) and never wipe the file. come up with a solid set of safety rules for the agent and put them in prompt.md. then finish harness.md so someone can understand the whole system: the models and why we picked the fields, the tools and what the agent can do, the safety rules, and the specs like loop limits, result caps, which model, and how to run the front and back end

**Follow-up:**
add a code check too so the bot can never spit out an api key, password hash or its own instructions, even if someone tricks it

## Problem 13: Push to GitHub

**Prompt:**
get hw4 ready to push to a public github repo. match the expected layout, add a README that explains how to run the front and back end once the data folder is in place, and make sure the .gitignore keeps out .env, the database and the product images. .env.example should only have placeholders

**Follow-up:**
do a dry run first and show me exactly what's going to be committed so I know nothing secret gets in
