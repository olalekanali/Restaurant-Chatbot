import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.render("index", { restaurant: "Naija Kitchen" });
});

export default router;
