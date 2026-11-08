import * as model from "../models/costeo.model.js";

// Los errores del modelo traen .status (400/404/409); el resto es 500.
const fail = (res, e) =>
  res.status(e.status ?? 500).json({ ok: false, message: e.message });

// ── INGREDIENTES ──────────────────────────────────────────────
export const listarIngredientes = async (req, res) => {
  try {
    const data = await model.getIngredientes();
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

export const crearIngrediente = async (req, res) => {
  try {
    const id = await model.createIngrediente(req.body);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

export const editarIngrediente = async (req, res) => {
  try {
    await model.updateIngrediente(req.params.id, req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

export const eliminarIngrediente = async (req, res) => {
  try {
    await model.deleteIngrediente(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

// ── PACKAGING ─────────────────────────────────────────────────
export const listarPackaging = async (req, res) => {
  try {
    const data = await model.getPackaging();
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

export const crearPackaging = async (req, res) => {
  try {
    const id = await model.createPackaging(req.body);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

export const editarPackaging = async (req, res) => {
  try {
    await model.updatePackaging(req.params.id, req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

export const eliminarPackaging = async (req, res) => {
  try {
    await model.deletePackaging(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

// ── BASES ─────────────────────────────────────────────────────
export const listarBases = async (req, res) => {
  try {
    const data = await model.getBases();
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

export const crearBase = async (req, res) => {
  try {
    const id = await model.createBase(req.body);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    fail(res, e);
  }
};

export const editarBase = async (req, res) => {
  try {
    await model.updateBase(req.params.id, req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error("ERROR editarBase:", e.message);
    fail(res, e);
  }
};

export const eliminarBase = async (req, res) => {
  try {
    await model.deleteBase(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    fail(res, e);
  }
};

// ── COSTOS FIJOS ──────────────────────────────────────────────
export const listarCostosFijos = async (req, res) => {
  try {
    const data = await model.getCostosFijos();
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

export const crearCostoFijo = async (req, res) => {
  try {
    const id = await model.createCostoFijo(req.body);
    res.status(201).json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

export const editarCostoFijo = async (req, res) => {
  try {
    await model.updateCostoFijo(req.params.id, req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

export const eliminarCostoFijo = async (req, res) => {
  try {
    await model.deleteCostoFijo(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

export const actualizarUnidadesMes = async (req, res) => {
  try {
    await model.updateUnidadesMes(req.body.unidades_mes);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};

// ── RECETAS ───────────────────────────────────────────────────
export const listarRecetas = async (req, res) => {
  try {
    const data = await model.getRecetas();
    res.json(data);
  } catch (e) {
    console.error("ERROR getRecetas:", e.message);
    fail(res, e);
  }
};

export const verReceta = async (req, res) => {
  try {
    const data = await model.getRecetaDetalle(req.params.helado_id);
    if (!data)
      return res
        .status(404)
        .json({ ok: false, message: "Receta no encontrada" });
    res.json(data);
  } catch (e) {
    fail(res, e);
  }
};

export const guardarReceta = async (req, res) => {
  try {
    const { receta_id, costo_total } = await model.upsertReceta(
      req.params.helado_id,
      req.body,
    );
    res.json({ ok: true, receta_id, costo_total });
  } catch (e) {
    console.error("ERROR guardarReceta:", e.message);
    fail(res, e);
  }
};
