// routes/ventas.routes.js
import { Router } from "express";
import cors from "cors";
import { verifyAuth, allowRoles } from "../middlewares/auth.middleware.js";
import {
  procesarCarritoController,
  ventasPorRangoController,
  editarFacturaController,
  cancelarFacturaController,
  editarItemController,
  cancelarItemController,
} from "../controllers/ventas.controller.js";

const router = Router();
console.log("🔥 ventas.routes.js cargado");

router.use(cors({ origin: "*" }));

// ─────────────────────────────────────────────
// EXISTENTES
// ─────────────────────────────────────────────

// POST /ventas/procesar
router.post(
  "/procesar",
  verifyAuth,
  allowRoles("superadmin", "vendedor"),
  procesarCarritoController
);

// GET /ventas?start=&end=
router.get(
  "/",
  verifyAuth,
  allowRoles("superadmin"),
  ventasPorRangoController
);

// ─────────────────────────────────────────────
// NUEVAS — solo superadmin
// ─────────────────────────────────────────────

// PUT /ventas/factura/:id_factura  → editar fecha o sede de una factura
router.put(
  "/factura/:id_factura",
  verifyAuth,
  allowRoles("superadmin"),
  editarFacturaController
);

// PATCH /ventas/factura/:id_factura/cancelar  → cancelar factura completa
router.patch(
  "/factura/:id_factura/cancelar",
  verifyAuth,
  allowRoles("superadmin"),
  cancelarFacturaController
);

// PUT /ventas/item/:id  → editar un ítem (producto, cantidad, motivo)
router.put(
  "/item/:id",
  verifyAuth,
  allowRoles("superadmin"),
  editarItemController
);

// PATCH /ventas/item/:id/cancelar  → cancelar un ítem individual
router.patch(
  "/item/:id/cancelar",
  verifyAuth,
  allowRoles("superadmin"),
  cancelarItemController
);

export default router;
