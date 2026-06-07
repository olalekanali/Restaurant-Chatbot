import axios from "axios";

const PAYSTACK_BASE = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export interface InitResult {
  authorizationUrl: string;
  reference: string;
}

/**
 * Initialize a Paystack transaction.
 * @param email     customer email (Paystack requires this)
 * @param amount    amount in Naira (converted to kobo here)
 * @param reference our order reference (also used as Paystack reference)
 * @param callbackUrl where Paystack sends the user after payment
 */
export async function initializeTransaction(
  email: string,
  amount: number,
  reference: string,
  callbackUrl: string
): Promise<InitResult> {
  const res = await axios.post(
    `${PAYSTACK_BASE}/transaction/initialize`,
    {
      email,
      amount: Math.round(amount * 100), // Naira -> kobo
      reference,
      callback_url: callbackUrl,
      currency: "NGN",
    },
    {
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = res.data?.data;
  return {
    authorizationUrl: data.authorization_url,
    reference: data.reference,
  };
}

/** Verify a transaction by reference. Returns true when payment succeeded. */
export async function verifyTransaction(reference: string): Promise<boolean> {
  const res = await axios.get(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secretKey()}` },
    }
  );
  return res.data?.data?.status === "success";
}
