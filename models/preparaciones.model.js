import { pool } from "../db/pool.js";

// Costo de TODAS las preparaciones activas en 2 consultas (soporta
// preparaciones dentro de preparaciones, con protección contra ciclos).
// `db` puede ser el pool o una conexión de una transacción abierta.
// → Map(id → { costo_total, costo_por_gr })
export const calcularCostosPreparaciones = async (db = pool) => {
  const [preps] = await db.query(
    "SELECT id, rendimiento_gr FROM costeo_preparaciones WHERE activo = 1",
  );
  const [items] = await db.query(
    `SELECT cpi.preparacion_id, cpi.ingrediente_id, cpi.prep_ingrediente_id,
            cpi.cantidad, i.precio_unidad
     FROM costeo_preparacion_ingredientes cpi
     LEFT JOIN ingredientes i ON i.id = cpi.ingrediente_id`,
  );

  const rendimiento = new Map(
    preps.map((p) => [p.id, Number(p.rendimiento_gr)]),
  );
  const porPrep = new Map();
  for (const it of items) {
    if (!porPrep.has(it.preparacion_id)) porPrep.set(it.preparacion_id, []);
    porPrep.get(it.preparacion_id).push(it);
  }

  const memo = new Map();
  const visitando = new Set();

  const costoTotal = (id) => {
    if (memo.has(id)) return memo.get(id);
    if (visitando.has(id)) return 0; // ciclo: se corta
    visitando.add(id);
    let total = 0;
    for (const it of porPrep.get(id) ?? []) {
      const cant = Number(it.cantidad);
      if (it.ingrediente_id) {
        total += cant * Number(it.precio_unidad ?? 0);
      } else if (
        it.prep_ingrediente_id &&
        rendimiento.has(it.prep_ingrediente_id)
      ) {
        total += cant * costoPorGr(it.prep_ingrediente_id);
      }
    }
    visitando.delete(id);
    memo.set(id, total);
    return total;
  };

  const costoPorGr = (id) => {
    const r = rendimiento.get(id);
    return r > 0 ? costoTotal(id) / r : 0;
  };

  const out = new Map();
  for (const id of rendimiento.keys()) {
    out.set(id, { costo_total: costoTotal(id), costo_por_gr: costoPorGr(id) });
  }
  return out;
};

export const listarPreparaciones = async () => {
  const [preps] = await pool.query(
    "SELECT * FROM costeo_preparaciones WHERE activo = 1 ORDER BY nombre",
  );
  const costos = await calcularCostosPreparaciones();
  for (const p of preps) {
    p.costo_total = costos.get(p.id)?.costo_total ?? 0;
    p.costo_por_gr = costos.get(p.id)?.costo_por_gr ?? 0;
    const [items] = await pool.query(
      `SELECT cpi.*,
              i.nombre  AS ingr_nombre,  i.unidad,          i.precio_unidad,
              pr.nombre AS prep_nombre,  pr.rendimiento_gr, pr.unidad AS prep_unidad
       FROM costeo_preparacion_ingredientes cpi
       LEFT JOIN ingredientes i          ON i.id  = cpi.ingrediente_id
       LEFT JOIN costeo_preparaciones pr ON pr.id = cpi.prep_ingrediente_id
       WHERE cpi.preparacion_id = ?`,
      [p.id],
    );
    p.ingredientes = items;
  }
  return preps;
};

export const obtenerPreparacion = async (id) => {
  const [rows] = await pool.query(
    "SELECT * FROM costeo_preparaciones WHERE id = ? AND activo = 1",
    [id],
  );
  if (!rows.length) return null;
  const p = rows[0];
  const [items] = await pool.query(
    `SELECT cpi.*,
            i.nombre  AS ingr_nombre,  i.unidad,          i.precio_unidad,
            pr.nombre AS prep_nombre,  pr.rendimiento_gr, pr.unidad AS prep_unidad
     FROM costeo_preparacion_ingredientes cpi
     LEFT JOIN ingredientes i          ON i.id  = cpi.ingrediente_id
     LEFT JOIN costeo_preparaciones pr ON pr.id = cpi.prep_ingrediente_id
     WHERE cpi.preparacion_id = ?`,
    [id],
  );
  p.ingredientes = items;
  return p;
};

export const crearPreparacion = async ({
  nombre,
  descripcion,
  rendimiento_gr,
  unidad,
  ingredientes = [],
}) => {
  const [r] = await pool.query(
    "INSERT INTO costeo_preparaciones (nombre, descripcion, rendimiento_gr, unidad) VALUES (?, ?, ?, ?)",
    [nombre, descripcion ?? null, rendimiento_gr, unidad ?? "gr"],
  );
  const id = r.insertId;
  if (ingredientes.length) {
    await _upsertIngredientes(id, ingredientes);
  }
  return obtenerPreparacion(id);
};

export const actualizarPreparacion = async (
  id,
  { nombre, descripcion, rendimiento_gr, unidad, ingredientes },
) => {
  await pool.query(
    "UPDATE costeo_preparaciones SET nombre=?, descripcion=?, rendimiento_gr=?, unidad=? WHERE id=?",
    [nombre, descripcion ?? null, rendimiento_gr, unidad ?? "gr", id],
  );
  if (ingredientes !== undefined) {
    await _upsertIngredientes(id, ingredientes);
  }
  return obtenerPreparacion(id);
};

export const eliminarPreparacion = async (id) => {
  await pool.query("UPDATE costeo_preparaciones SET activo = 0 WHERE id = ?", [
    id,
  ]);
};

export const obtenerCostoPorGr = async (id) => {
  const prep = await obtenerPreparacion(id);
  if (!prep) return null;
  let costo_total = 0;
  for (const item of prep.ingredientes) {
    if (item.ingrediente_id) {
      costo_total += Number(item.cantidad) * Number(item.precio_unidad ?? 0);
    } else if (item.prep_ingrediente_id) {
      const sub = await obtenerCostoPorGr(item.prep_ingrediente_id);
      const costo_por_gr =
        sub && sub.rendimiento_gr > 0
          ? sub.costo_total / sub.rendimiento_gr
          : 0;
      costo_total += Number(item.cantidad) * costo_por_gr;
    }
  }
  return {
    ...prep,
    costo_total,
    costo_por_gr:
      prep.rendimiento_gr > 0 ? costo_total / prep.rendimiento_gr : 0,
  };
};

// helper interno
const _upsertIngredientes = async (preparacion_id, ingredientes) => {
  await pool.query(
    "DELETE FROM costeo_preparacion_ingredientes WHERE preparacion_id = ?",
    [preparacion_id],
  );
  if (!ingredientes.length) return;
  const values = ingredientes.map((i) => [
    preparacion_id,
    i.ingrediente_id ?? null,
    i.prep_ingrediente_id ?? null,
    i.cantidad,
  ]);
  await pool.query(
    "INSERT INTO costeo_preparacion_ingredientes (preparacion_id, ingrediente_id, prep_ingrediente_id, cantidad) VALUES ?",
    [values],
  );
};
