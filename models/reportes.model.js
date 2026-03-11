import { pool } from "../db/pool.js";

export const getTopSabores = async (start, end) => {

    console.log("🟦 Ejecutando modelo getTopSabores con:", start, end);

    // Si no vienen fechas, usar últimas 2 semanas como respaldo
    const fechaInicio = start || "2000-01-01";
    const fechaFin    = end   || "2100-01-01";

    const query = `
        SELECT 
            h.sabor,
            SUM(v.cantidad) AS total
        FROM ventas v
        INNER JOIN helados h ON h.id = v.id_helado
        WHERE DATE(v.fecha) BETWEEN ? AND ?
        GROUP BY v.id_helado
        ORDER BY total DESC
        LIMIT 10
    `;

    console.log("🟨 SQL ejecutado:", query);
    console.log("🟨 Params:", [fechaInicio, fechaFin]);

    const [rows] = await pool.query(query, [fechaInicio, fechaFin]);

    return rows;
};
