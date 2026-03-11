import { Router } from "express";
import { topSaboresController } from "../controllers/reportes.controller.js";

const router = Router();

router.get("/top-sabores", topSaboresController);

export default router;
