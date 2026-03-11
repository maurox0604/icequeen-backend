// import pool from "../db/pool.js";
import { pool } from "../db/pool.js";


// 🔹 Crear producto

//  nombre,
//             precio,
//             cantidad,
//             id_categoria: idCategoria,
//     icon: imageURL,
                
        
export async function crearProducto(nombre, precio, imagen, cantidad, id_categoria) {
    console.log("productos model: ",nombre, precio, imagen, cantidad, id_categoria)
    const [result] = await pool.query(
        `INSERT INTO helados (sabor, precio, icon, cantidad, id_categoria, activo) 
        VALUES (?, ?, ?, ?, ?, 1)`,
        [nombre, precio, imagen, cantidad, id_categoria]
    );
    return { ok: true, id: result.insertId };
}

// 🔹 Obtener producto por ID
export async function getProductoByID(id) {
    const [rows] = await pool.query(`SELECT * FROM helados WHERE id = ? AND activo = 1`, [id]);
    return rows[0] || null;
}

// 🔹 Listar todos ACTIVOS E INACTIVOS
export async function getProductosAdmin() {
    const [rows] = await pool.query(
        `SELECT h.*,
        COALESCE(SUM(v.cantidad), 0) AS ventas_7dias
        FROM helados h
        LEFT JOIN ventas v 
        ON h.id = v.id_helado
        AND v.fecha >= (
            UTC_TIMESTAMP() - INTERVAL 7 DAY
        )
        GROUP BY h.id
        ORDER BY ventas_7dias DESC, h.sabor ASC;`
    );
    return rows;
}

// 🔹 Listar por categoría
export async function getProductosPorCategoria(id_categoria) {
    const [rows] = await pool.query(
        `SELECT *
        FROM helados
        WHERE id_categoria = ? AND activo = 1
        ORDER BY sabor ASC`,
        [id_categoria]
    );
    return rows;
}

// 🔹 Actualizar producto (con o sin nueva imagen)
export async function actualizarProducto(id, nombre, precio, imagen, cantidad, id_categoria) {
    if (id_categoria === null) {
        throw new Error("id_categoria inválido");
    }
    await pool.query(
        `UPDATE helados
        SET sabor = ?, precio = ?, icon = ?, cantidad = ?, id_categoria = ?
        WHERE id = ?`,
        [nombre, precio, imagen, cantidad, id_categoria, id]
    );
    return { ok: true };
}

// 🔹 Eliminar (desactivar)
export async function desactivarProducto(id) {
    await pool.query(`UPDATE helados SET activo = 0 WHERE id = ?`, [id]);
    return { ok: true };
}

// 🔹 Activar 
export const activarProducto = async (id) => {
    await pool.query(`UPDATE helados SET activo = 1 WHERE id = ?`, [id]);
    return { ok: true };
};


// 🔹 Obtener productos ordenados por popularidad (ventas últimos 7 días) solo ACTIVOS
export const getProductosOrdenadosPorPopularidad = async () => {
    const [rows] = await pool.query(`
        SELECT h.*,
        COALESCE(SUM(v.cantidad), 0) AS ventas_7dias
        FROM helados h
        LEFT JOIN ventas v 
        ON h.id = v.id_helado
        AND v.fecha >= (
            UTC_TIMESTAMP() - INTERVAL 7 DAY
        )
        WHERE h.activo = 1 
        GROUP BY h.id
        ORDER BY ventas_7dias DESC, h.sabor ASC;
    `);
    

    console.log("🔎 Popularidad últimos 7 días:");
    rows.forEach(r => console.log(r.sabor, "→", r.ventas_7dias));
        return rows;
};


