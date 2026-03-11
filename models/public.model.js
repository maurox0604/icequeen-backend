import { pool } from "../db/pool.js";

export const getHeladosPublicos = async () => {
    // const connection = await pool();

    const [rows] = await pool.query(`
        SELECT 
            h.id,
            h.sabor AS nombre,  -- Renombra sabor a nombre
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
        WHERE h.activo = 1 and h.cantidad > 0  -- Solo activos y con stock
        GROUP BY h.id
        ORDER BY ventas_7dias DESC, nombre ASC;  -- ✅ Usa "nombre" (el alias)
    `);

    return rows;
};


