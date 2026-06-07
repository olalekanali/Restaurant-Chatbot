import { Request, Response } from "express";
import { verifyTransaction } from "../services/paystackService";
import { Order } from "../models/Order";

/**
 * Paystack redirects the user here after payment.
 * We verify the transaction, mark the order paid, stash a notice in the
 * session, then redirect back to the chat where the notice is shown.
 */
export async function paymentCallback(req: Request, res: Response): Promise<void> {
  const reference = (req.query.reference || req.query.trxref) as string | undefined;

  if (!reference) {
    req.session.notice = "⚠️ Payment could not be verified (missing reference).";
    res.redirect("/");
    return;
  }

  try {
    const ok = await verifyTransaction(reference);
    const order = await Order.findOne({ reference });

    if (ok && order) {
      order.status = "paid";
      order.paymentReference = reference;
      await order.save();
      if (req.session.unpaidOrderId === order._id.toString()) {
        req.session.unpaidOrderId = undefined;
      }
      req.session.notice = `🎉 Payment successful! Order #${order.reference} is confirmed. Thank you!`;
    } else {
      req.session.notice = "⚠️ Your payment was not successful. Reply *pay* to try again.";
    }
  } catch (err) {
    console.error("Verify error:", err);
    req.session.notice = "⚠️ We couldn't verify your payment. If you were charged, contact support.";
  }

  res.redirect("/");
}
