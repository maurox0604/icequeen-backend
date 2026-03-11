import { Router } from "express";
import cors from "cors";
import {
    crearProductoController,
    listarProductosController,
    actualizarProductoController,
    desactivarProductoController,
    getProductoByIdController,
    getProductosPorCategoriaController,
    activarProductoController,
    listarProductosAdminController
} from "../controllers/productos.controller.js";





const router = Router();

// Agregar CORS directamente
router.use(cors({ origin: "*" }));


// ➤ Crear producto
router.post("/create", crearProductoController);

// ➤ Obtener todos Activos
router.get("/all", listarProductosController);

// ➤ Obtener todos Activos e Inactivos
router.get("/admin", listarProductosAdminController);

// ➤ Obtener por ID
router.get("/:id", getProductoByIdController);

// ➤ Actualizar producto
router.put("/update/:id", actualizarProductoController);

// ➤ Activar producto
router.put("/:id/activar", activarProductoController);

// ➤ Desactivar producto
router.put("/:id/desactivar", desactivarProductoController);

// ➤ Obtener productos por categoría
router.get("/categoria/:id", getProductosPorCategoriaController);


export default router;
