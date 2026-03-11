import { Router } from "express";
import cors from "cors";
import { crearCategoria, getCategorias, desactivarCategoria } from "../models/categorias.model.js";


const router = Router();

// Agregar CORS directamente
router.use(cors({ origin: "*" }));

// ➤ Crear
router.post("/create", async (req, res) => {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ ok: false, error: "Falta nombre" });

    try {
        const result = await crearCategoria(nombre);
        if (!result.ok) return res.status(409).json(result); // Ya existe
        res.status(201).json({ ok: true, mensaje: "Categoría creada" });
    } catch (error) {
        console.error("❌ Error crear categoría:", error);
        res.status(500).json({ ok: false, error: "Error interno" });
    }
});

// ➤ Listar
router.get("/all", async (req, res) => {
    try {
        const categorias = await getCategorias();
        res.json({ ok: true, categorias });
    } catch (error) {
        console.error("❌ Error obteniendo categorías:", error);
        res.status(500).json({ ok: false, error: "Error interno" });
    }
});

// ➤ Eliminar (desactivar)
router.put("/delete/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await desactivarCategoria(id);
        res.json({ ok: true, mensaje: "Categoría desactivada" });
    } catch (error) {
        console.error("❌ Error eliminando categoría:", error);
        res.status(500).json({ ok: false, error: "Error interno" });
    }
});

export default router;
