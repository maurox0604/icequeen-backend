// controllers/preparaciones.controller.js
import * as model from "../models/preparaciones.model.js";

export async function getAll(req, res) {
  try {
    const data = await model.listarPreparaciones();
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

export async function getOne(req, res) {
  try {
    const item = await model.obtenerPreparacion(req.params.id);
    if (!item) return res.status(404).json({ error: "No encontrada" });
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

export async function create(req, res) {
  try {
    const item = await model.crearPreparacion(req.body);
    res.status(201).json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

export async function update(req, res) {
  try {
    const item = await model.actualizarPreparacion(req.params.id, req.body);
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

export async function remove(req, res) {
  try {
    await model.eliminarPreparacion(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

export async function getCosto(req, res) {
  try {
    const costo = await model.obtenerCostoPorGr(req.params.id);
    res.json(costo);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
