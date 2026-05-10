import { Router } from "express";
import {
  topSaboresController,
  dashboardController,
} from "../controllers/reportes.controller.js";
import { verifyAuth, allowRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/top-sabores", topSaboresController);

router.get(
  "/dashboard",
  verifyAuth,
  allowRoles("superadmin"),
  dashboardController,
);

export default router;
