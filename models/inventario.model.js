// models/inventario.model.js
import { pool } from "../db/pool.js";

export async function actualizarInventario(items) {
    if (!items || !items.length) return { ok: true, message: "Nada que actualizar" };

    let query = 'UPDATE helados SET cantidad = CASE id ';
    const ids = [];

    items.forEach(item => {
        // item.cantQueda debe estar calculado por frontend o por controller antes
        query += `WHEN ${item.id} THEN ${item.cantQueda} `;
        ids.push(item.id);
    });

    query += `END WHERE id IN (${ids.join(',')})`;

    try {
        const [result] = await pool.query(query);
        return { ok: true, result };
    } catch (error) {
        console.error("Error actualizando inventario:", error);
        throw error;
    }
}
