# 🍲 Naija Kitchen — Restaurant Ordering Chatbot

A chat-based restaurant ordering assistant. Customers browse the menu, build an
order, check out, view history, and pay with **Paystack** — all through a
number-driven chat interface. No login required; each device keeps its own
session.

Built with **TypeScript · Express · EJS · MongoDB (Mongoose) · nodemon** and
**Paystack** test payments.

---

## Features

| Reply | Action |
|------|--------|
| `1`  | Place an order (browse the menu) |
| `99` | Checkout the current order |
| `98` | See order history |
| `97` | See current order |
| `0`  | Cancel current order |
| `pay` | Pay for the last placed order via Paystack |
| `schedule` | Schedule the last placed order for later |

- Menu items support **multiple options** (e.g. Regular / Large) selected by number.
- **Input validation** everywhere (numbers, email, dates, message length).
- **Device-based sessions** persisted in MongoDB (`connect-mongo`), so a returning
  device keeps its order history without any login.
- **Paystack test integration**: initialize → pay → verify → redirect back → the
  bot confirms success in chat.
- **Optional scheduling** of an order for a future date/time.
- Polished, mobile-first chat UI.

---

## Prerequisites

- Node.js 18+
- A MongoDB instance (local `mongodb://127.0.0.1:27017` or MongoDB Atlas)
- A free Paystack account for **test** API keys
  (https://dashboard.paystack.com/#/settings/developers)

## Setup

```bash
# 1. install dependencies
npm install

# 2. create your env file
cp .env.example .env
#    then edit .env and fill in:
#      MONGODB_URI, SESSION_SECRET, PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY

# 3. (optional) seed / reset the menu — it also auto-seeds on first boot
npm run seed

# 4. run in development (auto-reload via nodemon)
npm run dev
```

Then open **http://localhost:3000**.

### Production build

```bash
npm run build   # compiles TypeScript to dist/
npm start       # runs node dist/index.js
```

---

## How payment works

1. Place an order with `99`, then reply `pay`.
2. The bot asks for an email (for the Paystack receipt) and validates it.
3. It calls Paystack `transaction/initialize` and returns a **Pay** button.
4. After paying on Paystack's test page, you're redirected to
   `/payment/callback`, which calls `transaction/verify`, marks the order
   **paid**, and sends you back to the chat where the bot confirms success.

> **Test card (Paystack):** `4084 0840 8408 4081`, any future expiry, CVV `408`,
> OTP `123456`. (See Paystack docs for the current list of test cards.)

> **Note on the callback URL:** Paystack must be able to redirect the browser to
> `BASE_URL/payment/callback`. For local testing `http://localhost:3000` works
> because the redirect happens in *your* browser. If you deploy, set `BASE_URL`
> to your public URL.

---

## Project structure

```
src/
├── index.ts                 # server bootstrap
├── app.ts                   # express + session + routes
├── config/db.ts             # mongoose connection
├── models/                  # MenuItem, Order schemas
├── data/                    # menu definition + seed script
├── services/
│   ├── chatService.ts       # the conversation state machine (the "bot brain")
│   └── paystackService.ts   # Paystack initialize + verify
├── controllers/             # chat + payment controllers
├── routes/                  # index, chat API, payment callback
├── types/session.d.ts       # session shape augmentation
└── views/index.ejs          # chat page
public/
├── css/style.css
└── js/chat.js
```

## Editing the menu

Edit `src/data/menu.ts` and run `npm run seed` to reload it.
