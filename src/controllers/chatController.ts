import { Request, Response } from "express";
import { buildGreeting, processMessage, ChatResponse } from "../services/chatService";

/** Returns the opening greeting + any one-shot notice (e.g. payment success). */
export async function initChat(req: Request, res: Response): Promise<void> {
  const response: ChatResponse = buildGreeting(req.session);

  // Surface a pending notice (set by the payment callback) as the first bubble.
  if (req.session.notice) {
    response.replies = [req.session.notice, ...response.replies];
    req.session.notice = undefined;
  }

  res.json(response);
}

/** Processes one user message and returns the bot's reply. */
export async function postMessage(req: Request, res: Response): Promise<void> {
  const text = typeof req.body?.message === "string" ? req.body.message : "";
  if (!text.trim()) {
    res.status(400).json({ replies: ["Please type a message."] });
    return;
  }
  if (text.length > 200) {
    res.json({ replies: ["That message is too long. Please keep it short 🙂"] });
    return;
  }

  try {
    const response = await processMessage(req.session, req.sessionID, text);
    res.json(response);
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ replies: ["⚠️ Something went wrong on my end. Please try again."] });
  }
}
