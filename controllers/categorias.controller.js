import {
    crearCategoria,
    listarCategorias,
    desactivarCategoria,
} from "../models/categorias.model.js";

export async function httpCrearCategoria(req, res) {
    try {
        const { nombre } = req.body;
        if (!nombre) return res.status(400).json({ ok: false, error: "El nombre es obligatorio" });

        const result = await crearCategoria(nombre);
        if (!result.ok) return res.status(409).json(result);

        res.status(201).json({ ok: true, mensaje: "Categoría creada" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ ok: false, error: "Error interno" });
    }
    }

    export async function httpListarCategorias(req, res) {
    try {
        const categorias = await listarCategorias();
        res.json({ ok: true, categorias });
    } catch (err) {
        console.log(err);
        res.status(500).json({ ok: false, error: "Error interno" });
    }
    }

    export async function httpDesactivarCategoria(req, res) {
    try {
        const { id } = req.params;
        await desactivarCategoria(id);
        res.json({ ok: true, mensaje: "Categoría eliminada" });
    } catch (err) {
        res.status(500).json({ ok: false, error: "Error interno" });
    }
}
