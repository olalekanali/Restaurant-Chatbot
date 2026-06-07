import { Router } from "express";
import { paymentCallback } from "../controllers/paymentController";

const router = Router();

router.get("/callback", paymentCallback);

export default router;
