import { Router } from "express";
import cors from "cors";
import { procesarCarritoController } from "../controllers/ventas.controller.js";
import { ventasPorRangoController } from "../controllers/ventas.controller.js";
import { verifyAuth, allowRoles } from "../middlewares/auth.middleware.js";// Importa el middleware de autenticación

const router = Router();
console.log("🔥 ventas.routes.js cargado");

// Agregar CORS directamente
router.use(cors({ origin: "*" }));

// Ruta usada por el frontend actual para procesar el carrito
router.post(
    "/procesar",
    verifyAuth,
    allowRoles("superadmin", "vendedor"),
    procesarCarritoController
);


// Ruta usada por el frontend actual para obtener las ventas
router.get(
    "/",
    verifyAuth,
    allowRoles("superadmin"),
    ventasPorRangoController // Reemplaza con la función que obtiene las ventas
);


// GET ventas por rango de fechas
// router.get("/", ventasPorRangoController);


export default router;



