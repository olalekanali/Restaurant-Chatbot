import "express-session";

/** A single line in a draft (current) order. */
export interface OrderLine {
  itemId: string;
  name: string;
  option: string;
  price: number;
}

/** Conversation finite-state-machine states. */
export type ChatState =
  | "MAIN_MENU"
  | "BROWSING_MENU"
  | "SELECTING_OPTION"
  | "AWAITING_EMAIL"
  | "AWAITING_SCHEDULE";

declare module "express-session" {
  interface SessionData {
    /** Where the user currently is in the conversation. */
    chatState: ChatState;
    /** The order currently being built (not yet placed). */
    currentOrder: OrderLine[];
    /** When picking an option, the item the option belongs to. */
    pendingItemId?: string;
    /** The most recent placed-but-unpaid order, used by the PAY flow. */
    unpaidOrderId?: string;
    /** Email collected for the Paystack receipt. */
    paymentEmail?: string;
    /** A one-shot notice (e.g. "payment successful") to show on next load. */
    notice?: string;
    /** Whether the greeting/menu has already been shown this session. */
    greeted?: boolean;
  }
}
