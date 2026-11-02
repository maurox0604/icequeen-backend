import { Router } from "express";
// import { verifyAuth, allowRoles } from "../middleware/auth.middleware.js";
import { verifyAuth, allowRoles } from "../middlewares/auth.middleware.js";
import * as ctrl from "../controllers/costeo.controller.js";

const router = Router();

// Todas las rutas requieren autenticación y rol admin o contador
const soloAdmin = [verifyAuth, allowRoles("superadmin", "contador")];

// ── Ingredientes ──────────────────────────────────────────────
router.get("/ingredientes", ...soloAdmin, ctrl.listarIngredientes);
router.post("/ingredientes", ...soloAdmin, ctrl.crearIngrediente);
router.put("/ingredientes/:id", ...soloAdmin, ctrl.editarIngrediente);
router.delete("/ingredientes/:id", ...soloAdmin, ctrl.eliminarIngrediente);

// ── Packaging ─────────────────────────────────────────────────
router.get("/packaging", ...soloAdmin, ctrl.listarPackaging);
router.post("/packaging", ...soloAdmin, ctrl.crearPackaging);
router.put("/packaging/:id", ...soloAdmin, ctrl.editarPackaging);
router.delete("/packaging/:id", ...soloAdmin, ctrl.eliminarPackaging);

// ── Bases ─────────────────────────────────────────────────────
router.get("/bases", ...soloAdmin, ctrl.listarBases);
router.post("/bases", ...soloAdmin, ctrl.crearBase);
router.put("/bases/:id", ...soloAdmin, ctrl.editarBase);
router.delete("/bases/:id", ...soloAdmin, ctrl.eliminarBase);

// ── Costos fijos ──────────────────────────────────────────────
router.get("/costos-fijos", ...soloAdmin, ctrl.listarCostosFijos);
router.post("/costos-fijos", ...soloAdmin, ctrl.crearCostoFijo);
router.put("/costos-fijos/:id", ...soloAdmin, ctrl.editarCostoFijo);
router.delete("/costos-fijos/:id", ...soloAdmin, ctrl.eliminarCostoFijo);
router.put(
  "/costos-fijos/config/unidades-mes",
  ...soloAdmin,
  ctrl.actualizarUnidadesMes,
);

// ── Recetas / costeo ──────────────────────────────────────────
router.get("/recetas", ...soloAdmin, ctrl.listarRecetas);
router.get("/recetas/:helado_id", ...soloAdmin, ctrl.verReceta);
router.post("/recetas/:helado_id", ...soloAdmin, ctrl.guardarReceta);

export default router;

// ── Registrar en app.js ───────────────────────────────────────
// import costeoRoutes from "./routes/costeo.routes.js";
// app.use("/api/costeo", costeoRoutes);
