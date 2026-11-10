import * as model from "../models/costeo.model.js";

// Los errores del modelo traen .status (400 validación · 404 no existe ·
// 409 conflicto/en uso); cualquier otro es un 500 y queda en el log del servidor.
const fail = (res, e, donde) => {
  const status = e.status ?? 500;
  if (status >= 500) console.error(`ERROR ${donde}:`, e.message);
  res.status(status).json({ ok: false, message: e.message });
};

// handler(req) → cuerpo de la respuesta. `created` → 201.
const wrap =
  (donde, handler, { created = false } = {}) =>
  async (req, res) => {
    try {
      const body = await handler(req);
      res.status(created ? 201 : 200).json(body);
    } catch (e) {
      fail(res, e, donde);
    }
  };

// ── INGREDIENTES ──────────────────────────────────────────────
export const listarIngredientes = wrap("listarIngredientes", () =>
  model.getIngredientes(),
);
export const crearIngrediente = wrap(
  "crearIngrediente",
  async (req) => ({ ok: true, id: await model.createIngrediente(req.body) }),
  { created: true },
);
export const editarIngrediente = wrap("editarIngrediente", async (req) => {
  await model.updateIngrediente(req.params.id, req.body);
  return { ok: true };
});
export const eliminarIngrediente = wrap("eliminarIngrediente", async (req) => {
  await model.deleteIngrediente(req.params.id);
  return { ok: true };
});

// ── PACKAGING ─────────────────────────────────────────────────
export const listarPackaging = wrap("listarPackaging", () =>
  model.getPackaging(),
);
export const crearPackaging = wrap(
  "crearPackaging",
  async (req) => ({ ok: true, id: await model.createPackaging(req.body) }),
  { created: true },
);
export const editarPackaging = wrap("editarPackaging", async (req) => {
  await model.updatePackaging(req.params.id, req.body);
  return { ok: true };
});
export const eliminarPackaging = wrap("eliminarPackaging", async (req) => {
  await model.deletePackaging(req.params.id);
  return { ok: true };
});

// ── BASES ─────────────────────────────────────────────────────
export const listarBases = wrap("listarBases", () => model.getBases());
export const crearBase = wrap(
  "crearBase",
  async (req) => ({ ok: true, id: await model.createBase(req.body) }),
  { created: true },
);
export const editarBase = wrap("editarBase", async (req) => {
  await model.updateBase(req.params.id, req.body);
  return { ok: true };
});
export const eliminarBase = wrap("eliminarBase", async (req) => {
  await model.deleteBase(req.params.id);
  return { ok: true };
});

// ── COSTOS FIJOS ──────────────────────────────────────────────
export const listarCostosFijos = wrap("listarCostosFijos", () =>
  model.getCostosFijos(),
);
export const crearCostoFijo = wrap(
  "crearCostoFijo",
  async (req) => ({ ok: true, id: await model.createCostoFijo(req.body) }),
  { created: true },
);
export const editarCostoFijo = wrap("editarCostoFijo", async (req) => {
  await model.updateCostoFijo(req.params.id, req.body);
  return { ok: true };
});
export const eliminarCostoFijo = wrap("eliminarCostoFijo", async (req) => {
  await model.deleteCostoFijo(req.params.id);
  return { ok: true };
});
export const actualizarUnidadesMes = wrap(
  "actualizarUnidadesMes",
  async (req) => {
    await model.updateUnidadesMes(req.body?.unidades_mes);
    return { ok: true };
  },
);

// ── RECETAS ───────────────────────────────────────────────────
export const listarRecetas = wrap("listarRecetas", () => model.getRecetas());

export const verReceta = async (req, res) => {
  try {
    const data = await model.getRecetaDetalle(req.params.helado_id);
    if (!data)
      return res
        .status(404)
        .json({ ok: false, message: "Receta no encontrada" });
    res.json(data);
  } catch (e) {
    fail(res, e, "verReceta");
  }
};

export const guardarReceta = wrap("guardarReceta", async (req) => {
  const { receta_id, costo_total } = await model.upsertReceta(
    req.params.helado_id,
    req.body,
  );
  return { ok: true, receta_id, costo_total };
});
