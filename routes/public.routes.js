// routes/public.routes.js
import { Router } from "express";
import { getProductosPublicos } from "../controllers/public.controller.js";

const router = Router();

router.get("/productos", getProductosPublicos);

router.get("/ping", (req, res) => {
  res.json({ ok: true });
});

export default router;
