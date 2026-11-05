// routes/preparaciones.routes.js
// Agregar en app.js: import prepRoutes from "./routes/preparaciones.routes.js";
//                    app.use("/api/costeo/preparaciones", prepRoutes);
// (O añadir estas rutas dentro de costeo.routes.js)
import { Router } from "express";
import { verifyAuth, allowRoles } from "../middlewares/auth.middleware.js";
import * as ctrl from "../controllers/preparaciones.controller.js";

const router = Router();
const soloAdmin = [verifyAuth, allowRoles("admin", "contador", "superadmin")];

router.get("/",         ...soloAdmin, ctrl.getAll);
router.get("/:id",      ...soloAdmin, ctrl.getOne);
router.post("/",        ...soloAdmin, ctrl.create);
router.put("/:id",      ...soloAdmin, ctrl.update);
router.delete("/:id",   ...soloAdmin, ctrl.remove);
router.get("/:id/costo",...soloAdmin, ctrl.getCosto);

export default router;
