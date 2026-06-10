import { pool } from "../db/pool.js";

/**
 * GET /bootstrap
 * Devuelve productos activos, categorías activas y sedes en una sola
 * ronda de queries. Usa Promise.all para correrlas en paralelo sobre
 * la MISMA conexión extraída del pool → solo consume 1 slot.
 */
export async function bootstrapController(req, res) {
  let conn;
  try {
    conn = await pool.getConnection();

    const [productos, categorias, sedes] = await Promise.all([
      // ✅ Idéntica a getProductosOrdenadosPorPopularidad() en productos.model.js
      conn.query(`
        SELECT h.*,
          COALESCE(SUM(v.cantidad), 0) AS ventas_7dias
        FROM helados h
        LEFT JOIN ventas v
          ON h.id = v.id_helado
          AND v.fecha >= (UTC_TIMESTAMP() - INTERVAL 7 DAY)
        WHERE h.activo = 1
        GROUP BY h.id
        ORDER BY ventas_7dias DESC, h.sabor ASC
      `),
      // ✅ Idéntica a getCategorias() en categorias.model.js
      conn.query(`
        SELECT id, nombre FROM categorias
        WHERE activo = 1
        ORDER BY nombre ASC
      `),
      // ✅ Idéntica a getSedes() en sedes.model.js
      conn.query(`
        SELECT id, nombre, activo FROM sedes
        ORDER BY nombre ASC
      `),
    ]);

    res.json({
      ok: true,
      productos: productos[0],
      categorias: categorias[0],
      sedes: sedes[0],
    });
  } catch (error) {
    console.error("❌ bootstrapController error:", error);
    res.status(500).json({ ok: false, error: "Error en bootstrap" });
  } finally {
    if (conn) conn.release(); // siempre liberar
  }
}
