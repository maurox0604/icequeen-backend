// controllers/preparaciones.controller.js
import * as model from "../models/preparaciones.model.js";

// Los errores del modelo traen .status (400 validación · 404 no existe ·
// 409 en uso). Se responde con { ok:false, message } (y `error` por
// compatibilidad con código anterior).
const fail = (res, e, donde) => {
  const status = e.status ?? 500;
  if (status >= 500) console.error(`ERROR preparaciones.${donde}:`, e);
  res.status(status).json({ ok: false, message: e.message, error: e.message });
};

export async function getAll(req, res) {
  try {
    res.json(await model.listarPreparaciones());
  } catch (e) {
    fail(res, e, "getAll");
  }
}

export async function getOne(req, res) {
  try {
    const item = await model.obtenerPreparacion(req.params.id);
    if (!item)
      return res
        .status(404)
        .json({ ok: false, message: "No encontrada", error: "No encontrada" });
    res.json(item);
  } catch (e) {
    fail(res, e, "getOne");
  }
}

export async function create(req, res) {
  try {
    res.status(201).json(await model.crearPreparacion(req.body));
  } catch (e) {
    fail(res, e, "create");
  }
}

export async function update(req, res) {
  try {
    res.json(await model.actualizarPreparacion(req.params.id, req.body));
  } catch (e) {
    fail(res, e, "update");
  }
}

export async function remove(req, res) {
  try {
    await model.eliminarPreparacion(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    fail(res, e, "remove");
  }
}

export async function getCosto(req, res) {
  try {
    const costo = await model.obtenerCostoPorGr(req.params.id);
    if (!costo)
      return res
        .status(404)
        .json({ ok: false, message: "No encontrada", error: "No encontrada" });
    res.json(costo);
  } catch (e) {
    fail(res, e, "getCosto");
  }
}
