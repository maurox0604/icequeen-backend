import { pool } from "../db/pool.js";

export const getHeladosPublicos = async () => {
  const [rows] = await pool.query(`
    SELECT 
      h.id,
      h.sabor AS nombre,
      h.precio,
      h.icon,
      h.cantidad,
      h.activo,
      h.id_categoria,
      COALESCE(SUM(v.cantidad), 0) AS ventas_7dias
    FROM helados h
    LEFT JOIN ventas v 
      ON h.id = v.id_helado
      AND v.fecha >= NOW() - INTERVAL 7 DAY
      AND COALESCE(v.activo, 1) = 1
    WHERE h.activo = 1 AND h.cantidad > 0
    GROUP BY h.id, h.sabor, h.precio, h.icon, h.cantidad, h.activo, h.id_categoria
    ORDER BY ventas_7dias DESC, nombre ASC;
  `);

  return rows;
};
