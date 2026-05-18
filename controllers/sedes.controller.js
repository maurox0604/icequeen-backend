import {
  getSedes,
  crearSede,
  actualizarSede,
  toggleSede,
} from "../models/sedes.model.js";

export const listarSedes = async (req, res) => {
  try {
    const sedes = await getSedes();
    res.json(sedes);
  } catch (error) {
    console.error("🔥 ERROR sedes:", error);
    res.status(500).json({ error: error.message });
  }
};

export const crearSedeController = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre?.trim())
      return res.status(400).json({ error: "Nombre requerido" });
    const id = await crearSede(nombre.trim());
    res.json({ ok: true, id });
  } catch (error) {
    console.error("🔥 ERROR crear sede:", error);
    res.status(500).json({ error: error.message });
  }
};

export const actualizarSedeController = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;
    if (!nombre?.trim())
      return res.status(400).json({ error: "Nombre requerido" });
    await actualizarSede(id, nombre.trim());
    res.json({ ok: true });
  } catch (error) {
    console.error("🔥 ERROR actualizar sede:", error);
    res.status(500).json({ error: error.message });
  }
};

export const toggleSedeController = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    await toggleSede(id, activo ? 1 : 0);
    res.json({ ok: true });
  } catch (error) {
    console.error("🔥 ERROR toggle sede:", error);
    res.status(500).json({ error: error.message });
  }
};
