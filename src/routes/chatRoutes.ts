import { Router } from "express";
import { initChat, postMessage } from "../controllers/chatController";

const router = Router();

router.get("/init", initChat);
router.post("/message", postMessage);

export default router;
