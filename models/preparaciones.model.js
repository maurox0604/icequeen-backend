// models/preparaciones.model.js
// Sub-recetas (preparaciones caseras): leche condensada, mermeladas, caramelo, etc.
// Soporta 2 niveles: una preparación puede usar otra preparación como ingrediente.
import db from "../db/pool.js";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Calcula el costo de una preparación de forma recursiva (máx. 2 niveles).
 * Retorna: { costo_total, costo_por_gr }
 */
async function calcularCosto(preparacion_id, conn) {
  const c = conn || db;

  // Líneas de ingredientes de esta preparación
  const [lineas] = await c.query(
    `SELECT pi.*,
            i.precio_unidad   AS ing_precio_unidad,
            i.unidad          AS ing_unidad,
            p.rendimiento_gr  AS sub_rendimiento
       FROM costeo_preparacion_ingredientes pi
  LEFT JOIN ingredientes          i ON i.id = pi.ingrediente_id
  LEFT JOIN costeo_preparaciones  p ON p.id = pi.prep_ingrediente_id
      WHERE pi.preparacion_id = ?`,
    [preparacion_id],
  );

  let costo_total = 0;
  for (const l of lineas) {
    if (l.ingrediente_id) {
      // Ingrediente base: precio_unidad ya es $/gr (calculado al guardar)
      costo_total += Number(l.cantidad) * Number(l.ing_precio_unidad ?? 0);
    } else if (l.prep_ingrediente_id) {
      // Sub-preparación: calcular su costo y obtener precio por gr
      const sub = await calcularCosto(l.prep_ingrediente_id, c);
      const precio_por_gr = sub.costo_por_gr;
      costo_total += Number(l.cantidad) * precio_por_gr;
    }
  }

  // Obtener rendimiento de esta preparación
  const [[prep]] = await c.query(
    "SELECT rendimiento_gr FROM costeo_preparaciones WHERE id = ?",
    [preparacion_id],
  );
  const rendimiento = Number(prep?.rendimiento_gr ?? 1);
  const costo_por_gr = rendimiento > 0 ? costo_total / rendimiento : 0;

  return { costo_total, costo_por_gr };
}

// ─────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────

export async function listarPreparaciones() {
  const [rows] = await db.query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM costeo_preparacion_ingredientes WHERE preparacion_id = p.id) AS num_ingredientes
       FROM costeo_preparaciones p
      WHERE p.activo = 1
      ORDER BY p.nombre`,
  );
  return rows;
}

export async function obtenerPreparacion(id) {
  const [[prep]] = await db.query(
    "SELECT * FROM costeo_preparaciones WHERE id = ?",
    [id],
  );
  if (!prep) return null;

  // Cargar líneas de ingredientes con detalle
  const [lineas] = await db.query(
    `SELECT pi.*,
            i.nombre   AS ing_nombre,
            i.unidad   AS ing_unidad,
            p.nombre   AS sub_nombre,
            p.unidad   AS sub_unidad
       FROM costeo_preparacion_ingredientes pi
  LEFT JOIN ingredientes          i ON i.id = pi.ingrediente_id
  LEFT JOIN costeo_preparaciones  p ON p.id = pi.prep_ingrediente_id
      WHERE pi.preparacion_id = ?`,
    [id],
  );

  const { costo_total, costo_por_gr } = await calcularCosto(id);

  return {
    ...prep,
    ingredientes: lineas,
    costo_total,
    costo_por_gr,
  };
}

export async function crearPreparacion(data) {
  const {
    nombre,
    descripcion,
    rendimiento_gr,
    unidad,
    ingredientes = [],
  } = data;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [r] = await conn.query(
      `INSERT INTO costeo_preparaciones (nombre, descripcion, rendimiento_gr, unidad)
       VALUES (?, ?, ?, ?)`,
      [nombre, descripcion ?? null, rendimiento_gr, unidad ?? "gr"],
    );
    const preparacion_id = r.insertId;

    for (const ing of ingredientes) {
      await conn.query(
        `INSERT INTO costeo_preparacion_ingredientes
           (preparacion_id, ingrediente_id, prep_ingrediente_id, cantidad)
         VALUES (?, ?, ?, ?)`,
        [
          preparacion_id,
          ing.ingrediente_id ?? null,
          ing.prep_ingrediente_id ?? null,
          ing.cantidad,
        ],
      );
    }

    await conn.commit();
    return obtenerPreparacion(preparacion_id);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function actualizarPreparacion(id, data) {
  const { nombre, descripcion, rendimiento_gr, unidad, ingredientes } = data;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE costeo_preparaciones
          SET nombre = ?, descripcion = ?, rendimiento_gr = ?, unidad = ?
        WHERE id = ?`,
      [nombre, descripcion ?? null, rendimiento_gr, unidad ?? "gr", id],
    );

    if (Array.isArray(ingredientes)) {
      // Reemplazar líneas
      await conn.query(
        "DELETE FROM costeo_preparacion_ingredientes WHERE preparacion_id = ?",
        [id],
      );
      for (const ing of ingredientes) {
        await conn.query(
          `INSERT INTO costeo_preparacion_ingredientes
             (preparacion_id, ingrediente_id, prep_ingrediente_id, cantidad)
           VALUES (?, ?, ?, ?)`,
          [
            id,
            ing.ingrediente_id ?? null,
            ing.prep_ingrediente_id ?? null,
            ing.cantidad,
          ],
        );
      }
    }

    await conn.commit();
    return obtenerPreparacion(id);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export async function eliminarPreparacion(id) {
  await db.query("UPDATE costeo_preparaciones SET activo = 0 WHERE id = ?", [
    id,
  ]);
}

export async function obtenerCostoPorGr(id) {
  return calcularCosto(id);
}
