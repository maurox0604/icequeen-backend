import { pool } from "../db/pool.js";

export const getAll = async () => {
  const [preps] = await pool.query(
    "SELECT * FROM costeo_preparaciones WHERE activo = 1 ORDER BY nombre",
  );
  for (const p of preps) {
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

export const getOne = async (id) => {
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

export const create = async ({
  nombre,
  descripcion,
  rendimiento_gr,
  unidad,
}) => {
  const [r] = await pool.query(
    "INSERT INTO costeo_preparaciones (nombre, descripcion, rendimiento_gr, unidad) VALUES (?, ?, ?, ?)",
    [nombre, descripcion ?? null, rendimiento_gr, unidad ?? "gr"],
  );
  return r.insertId;
};

export const update = async (
  id,
  { nombre, descripcion, rendimiento_gr, unidad },
) => {
  await pool.query(
    "UPDATE costeo_preparaciones SET nombre=?, descripcion=?, rendimiento_gr=?, unidad=? WHERE id=?",
    [nombre, descripcion ?? null, rendimiento_gr, unidad ?? "gr", id],
  );
};

export const remove = async (id) => {
  await pool.query("UPDATE costeo_preparaciones SET activo = 0 WHERE id = ?", [
    id,
  ]);
};

export const upsertIngredientes = async (preparacion_id, ingredientes) => {
  await pool.query(
    "DELETE FROM costeo_preparacion_ingredientes WHERE preparacion_id = ?",
    [preparacion_id],
  );
  if (!ingredientes || ingredientes.length === 0) return;
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

export const calcCosto = async (id) => {
  const prep = await getOne(id);
  if (!prep) return null;
  let costo_total = 0;
  for (const item of prep.ingredientes) {
    if (item.ingrediente_id) {
      costo_total += Number(item.cantidad) * Number(item.precio_unidad ?? 0);
    } else if (item.prep_ingrediente_id) {
      const sub = await calcCosto(item.prep_ingrediente_id);
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
