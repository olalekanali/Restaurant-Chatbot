import { Session, SessionData } from "express-session";
import { MenuItem } from "../models/MenuItem";
import { Order } from "../models/Order";
import { OrderLine } from "../types/session";
import { initializeTransaction } from "./paystackService";

const RESTAURANT = "Naija Kitchen";

export interface ChatResponse {
  replies: string[];
  quickReplies?: string[];
  paymentUrl?: string;
}

/* ----------------------------- formatting ----------------------------- */

function naira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function mainMenu(): string {
  return [
    "Please pick an option by replying with its number:",
    "",
    "1  — 🛒 Place an order",
    "99 — ✅ Checkout order",
    "98 — 📜 See order history",
    "97 — 🧾 See current order",
    "0  — ❌ Cancel order",
  ].join("\n");
}

function greeting(): string {
  return `👋 Welcome to *${RESTAURANT}*! I'm your ordering assistant.`;
}

function orderSummary(lines: OrderLine[]): string {
  const body = lines
    .map((l, i) => `${i + 1}. ${l.name}${l.option ? ` (${l.option})` : ""} — ${naira(l.price)}`)
    .join("\n");
  const total = lines.reduce((s, l) => s + l.price, 0);
  return `${body}\n\nTotal: ${naira(total)}`;
}

function genReference(): string {
  return `NK${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)}`;
}

/* --------------------------- menu rendering --------------------------- */

async function renderMenuList(): Promise<string> {
  const items = await MenuItem.find().sort({ sortIndex: 1 });
  const lines = items.map((it, i) => {
    const prices = it.options.map((o) => naira(o.price));
    const priceLabel =
      it.options.length === 1 ? prices[0] : `${naira(Math.min(...it.options.map((o) => o.price)))}+`;
    return `${i + 1}. ${it.emoji} ${it.name} — ${priceLabel}`;
  });
  return [
    "🍴 Here is our menu — reply with the item number to add it:",
    "",
    ...lines,
    "",
    "Reply 97 to view your order, 99 to checkout, or 0 to cancel.",
  ].join("\n");
}

/* ----------------------------- greeting ------------------------------- */

export function buildGreeting(session: Session & Partial<SessionData>): ChatResponse {
  session.chatState = "MAIN_MENU";
  session.greeted = true;
  if (!session.currentOrder) session.currentOrder = [];
  return {
    replies: [greeting(), mainMenu()],
    quickReplies: ["1", "97", "98"],
  };
}

/* --------------------------- main processor --------------------------- */

const RESERVED = ["0", "97", "98", "99"];

export async function processMessage(
  session: Session & Partial<SessionData>,
  sessionId: string,
  rawInput: string
): Promise<ChatResponse> {
  const input = (rawInput || "").trim();
  if (!input) {
    return { replies: ["Please type something 🙂"], quickReplies: ["1", "97"] };
  }

  if (!session.chatState) session.chatState = "MAIN_MENU";
  if (!session.currentOrder) session.currentOrder = [];

  const lower = input.toLowerCase();
  const state = session.chatState;

  // ----- Free-text states: only "0" is a reserved escape -----
  if (state === "AWAITING_EMAIL") {
    if (input === "0") return cancelToMenu(session);
    return await handleEmail(session, input);
  }
  if (state === "AWAITING_SCHEDULE") {
    if (input === "0") return cancelToMenu(session);
    return await handleSchedule(session, input);
  }

  // ----- Keyword commands available outside free-text states -----
  if (lower === "pay") return await handlePay(session, sessionId);
  if (lower === "schedule") return handleScheduleStart(session);
  if (lower === "menu" || lower === "help") {
    session.chatState = "MAIN_MENU";
    return { replies: [mainMenu()], quickReplies: ["1", "97", "98"] };
  }

  // ----- Reserved global numeric commands -----
  if (RESERVED.includes(input)) {
    switch (input) {
      case "99":
        return await handleCheckout(session, sessionId);
      case "98":
        return await handleHistory(session, sessionId);
      case "97":
        return handleCurrentOrder(session);
      case "0":
        return handleCancel(session);
    }
  }

  // ----- State-specific numeric handling -----
  switch (state) {
    case "MAIN_MENU":
      if (input === "1") return await startOrder(session);
      return invalid(session);

    case "BROWSING_MENU":
      return await selectItem(session, input);

    case "SELECTING_OPTION":
      return await selectOption(session, input);

    default:
      return invalid(session);
  }
}

/* ----------------------------- handlers ------------------------------- */

async function startOrder(session: Session & Partial<SessionData>): Promise<ChatResponse> {
  session.chatState = "BROWSING_MENU";
  return { replies: [await renderMenuList()], quickReplies: ["1", "2", "99"] };
}

async function selectItem(
  session: Session & Partial<SessionData>,
  input: string
): Promise<ChatResponse> {
  const index = parseInt(input, 10);
  if (isNaN(index)) return invalid(session);

  const items = await MenuItem.find().sort({ sortIndex: 1 });
  if (index < 1 || index > items.length) {
    return {
      replies: [`That item number isn't on the menu. Pick a number between 1 and ${items.length}.`],
    };
  }

  const item = items[index - 1];

  // Single option -> add immediately.
  if (item.options.length === 1) {
    const opt = item.options[0];
    session.currentOrder!.push({
      itemId: item._id.toString(),
      name: item.name,
      option: opt.label,
      price: opt.price,
    });
    session.chatState = "BROWSING_MENU";
    return {
      replies: [
        `✅ Added ${item.emoji} ${item.name} — ${naira(opt.price)} to your order.`,
        "Reply with another item number, 97 to view your order, or 99 to checkout.",
      ],
      quickReplies: ["97", "99", "0"],
    };
  }

  // Multiple options -> ask which one.
  session.pendingItemId = item._id.toString();
  session.chatState = "SELECTING_OPTION";
  const optLines = item.options.map((o, i) => `${i + 1}. ${o.label} — ${naira(o.price)}`);
  return {
    replies: [`You picked ${item.emoji} ${item.name}. Choose an option:`, optLines.join("\n")],
    quickReplies: item.options.map((_, i) => String(i + 1)),
  };
}

async function selectOption(
  session: Session & Partial<SessionData>,
  input: string
): Promise<ChatResponse> {
  const idx = parseInt(input, 10);
  if (isNaN(idx)) return invalid(session);

  const item = await MenuItem.findById(session.pendingItemId);
  if (!item) {
    session.chatState = "BROWSING_MENU";
    return { replies: ["Something went wrong picking that item. Please choose again."] };
  }
  if (idx < 1 || idx > item.options.length) {
    return { replies: [`Please choose an option between 1 and ${item.options.length}.`] };
  }

  const opt = item.options[idx - 1];
  session.currentOrder!.push({
    itemId: item._id.toString(),
    name: item.name,
    option: opt.label,
    price: opt.price,
  });
  session.pendingItemId = undefined;
  session.chatState = "BROWSING_MENU";

  return {
    replies: [
      `✅ Added ${item.emoji} ${item.name} (${opt.label}) — ${naira(opt.price)} to your order.`,
      "Reply with another item number, 97 to view your order, or 99 to checkout.",
    ],
    quickReplies: ["97", "99", "0"],
  };
}

async function handleCheckout(
  session: Session & Partial<SessionData>,
  sessionId: string
): Promise<ChatResponse> {
  const lines = session.currentOrder || [];
  if (lines.length === 0) {
    session.chatState = "MAIN_MENU";
    return {
      replies: ["🛒 No order to place.", "Reply 1 to start a new order."],
      quickReplies: ["1"],
    };
  }

  const total = lines.reduce((s, l) => s + l.price, 0);
  const order = await Order.create({
    sessionId,
    reference: genReference(),
    lines: lines.map((l) => ({ name: l.name, option: l.option, price: l.price })),
    total,
    status: "placed",
  });

  session.currentOrder = [];
  session.unpaidOrderId = order._id.toString();
  session.chatState = "MAIN_MENU";

  return {
    replies: [
      "✅ Order placed!",
      `Order #${order.reference}\n${orderSummary(lines)}`,
      "Reply *pay* to pay now 💳, *schedule* to schedule it 🗓️, or 1 to start a new order.",
    ],
    quickReplies: ["pay", "schedule", "1"],
  };
}

async function handleHistory(
  session: Session & Partial<SessionData>,
  sessionId: string
): Promise<ChatResponse> {
  const orders = await Order.find({
    sessionId,
    status: { $in: ["placed", "paid"] },
  })
    .sort({ createdAt: -1 })
    .limit(10);

  session.chatState = "MAIN_MENU";

  if (orders.length === 0) {
    return { replies: ["📜 You have no orders yet.", "Reply 1 to place one."], quickReplies: ["1"] };
  }

  const lines = orders.map((o) => {
    const when = o.createdAt.toLocaleString("en-NG", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const sched = o.scheduledFor
      ? ` (scheduled ${o.scheduledFor.toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })})`
      : "";
    const badge = o.status === "paid" ? "🟢 PAID" : "🟡 PLACED";
    return `#${o.reference} — ${naira(o.total)} — ${badge}${sched}\n   ${when}`;
  });

  return {
    replies: ["📜 Your order history:", lines.join("\n\n")],
    quickReplies: ["1", "97"],
  };
}

function handleCurrentOrder(session: Session & Partial<SessionData>): ChatResponse {
  const lines = session.currentOrder || [];
  if (lines.length === 0) {
    return {
      replies: ["🧾 You have no active order.", "Reply 1 to start one."],
      quickReplies: ["1"],
    };
  }
  return {
    replies: ["🧾 Your current order:", orderSummary(lines), "Reply 99 to checkout or 0 to cancel."],
    quickReplies: ["99", "0", "1"],
  };
}

function handleCancel(session: Session & Partial<SessionData>): ChatResponse {
  session.chatState = "MAIN_MENU";
  const had = (session.currentOrder || []).length > 0;
  session.currentOrder = [];
  session.pendingItemId = undefined;
  if (had) {
    return {
      replies: ["❌ Your current order has been cancelled.", "Reply 1 to start a new order."],
      quickReplies: ["1"],
    };
  }
  return {
    replies: ["There's no active order to cancel.", "Reply 1 to start one."],
    quickReplies: ["1"],
  };
}

async function handlePay(
  session: Session & Partial<SessionData>,
  _sessionId: string
): Promise<ChatResponse> {
  if (!session.unpaidOrderId) {
    return {
      replies: ["There's no placed order to pay for.", "Reply 99 to checkout a current order first."],
      quickReplies: ["97", "99"],
    };
  }
  const order = await Order.findById(session.unpaidOrderId);
  if (!order || order.status === "paid") {
    session.unpaidOrderId = undefined;
    return { replies: ["That order is already settled. Reply 1 to start a new order."], quickReplies: ["1"] };
  }

  // Reuse a stored email if we have one, otherwise ask for it.
  if (!session.paymentEmail) {
    session.chatState = "AWAITING_EMAIL";
    return { replies: ["💳 Please enter your email address for the payment receipt:"] };
  }

  return await startPayment(session, order.reference, order.total);
}

async function handleEmail(
  session: Session & Partial<SessionData>,
  input: string
): Promise<ChatResponse> {
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(input)) {
    return { replies: ["That doesn't look like a valid email. Please try again (or reply 0 to cancel):"] };
  }
  session.paymentEmail = input;

  if (!session.unpaidOrderId) {
    session.chatState = "MAIN_MENU";
    return { replies: ["There's no order awaiting payment. Reply 1 to start a new order."], quickReplies: ["1"] };
  }
  const order = await Order.findById(session.unpaidOrderId);
  if (!order) {
    session.chatState = "MAIN_MENU";
    return { replies: ["Couldn't find that order. Reply 1 to start a new order."], quickReplies: ["1"] };
  }
  return await startPayment(session, order.reference, order.total);
}

async function startPayment(
  session: Session & Partial<SessionData>,
  reference: string,
  total: number
): Promise<ChatResponse> {
  session.chatState = "MAIN_MENU";
  const base = process.env.BASE_URL || "http://localhost:3000";
  try {
    const { authorizationUrl } = await initializeTransaction(
      session.paymentEmail!,
      total,
      reference,
      `${base}/payment/callback`
    );
    return {
      replies: [
        `Great! Tap the button below to pay ${naira(total)} securely with Paystack 💳`,
        "You'll be brought right back here once payment completes.",
      ],
      paymentUrl: authorizationUrl,
    };
  } catch (err) {
    console.error("Paystack init failed:", err);
    return {
      replies: [
        "⚠️ I couldn't reach the payment provider. Please make sure the Paystack test key is configured, then reply *pay* to try again.",
      ],
      quickReplies: ["pay"],
    };
  }
}

function handleScheduleStart(session: Session & Partial<SessionData>): ChatResponse {
  if (!session.unpaidOrderId) {
    return { replies: ["There's no placed order to schedule. Checkout an order first (99)."], quickReplies: ["97", "99"] };
  }
  session.chatState = "AWAITING_SCHEDULE";
  return {
    replies: [
      "🗓️ When should we prepare your order?",
      "Reply with a date & time like: 2026-06-10 18:30 (or reply 0 to cancel).",
    ],
  };
}

async function handleSchedule(
  session: Session & Partial<SessionData>,
  input: string
): Promise<ChatResponse> {
  const when = new Date(input.replace(" ", "T"));
  if (isNaN(when.getTime())) {
    return { replies: ["I couldn't read that date. Use the format 2026-06-10 18:30 (or 0 to cancel):"] };
  }
  if (when.getTime() < Date.now()) {
    return { replies: ["That time is in the past. Please pick a future date & time:"] };
  }
  const order = await Order.findById(session.unpaidOrderId);
  if (!order) {
    session.chatState = "MAIN_MENU";
    return { replies: ["Couldn't find the order to schedule. Reply 1 to start over."], quickReplies: ["1"] };
  }
  order.scheduledFor = when;
  await order.save();
  session.chatState = "MAIN_MENU";
  const pretty = when.toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return {
    replies: [
      `🗓️ Done! Order #${order.reference} is scheduled for ${pretty}.`,
      "Reply *pay* to pay now, or 1 to start a new order.",
    ],
    quickReplies: ["pay", "1"],
  };
}

/* ----------------------------- fallbacks ------------------------------ */

function cancelToMenu(session: Session & Partial<SessionData>): ChatResponse {
  session.chatState = "MAIN_MENU";
  return { replies: ["Okay, cancelled that.", mainMenu()], quickReplies: ["1", "97", "98"] };
}

function invalid(session: Session & Partial<SessionData>): ChatResponse {
  return {
    replies: ["🤔 I didn't understand that.", mainMenu()],
    quickReplies: ["1", "97", "98"],
  };
}
