import { pool } from "../db/pool.js";


// 🔹 Crear categoría evitando duplicados
export async function crearCategoria(nombre) {
    const nombreNormalizado = nombre.trim().toUpperCase();

    const [existe] = await pool.query(
        "SELECT id FROM categorias WHERE UPPER(nombre) = ? AND activo = 1",
        [nombreNormalizado]
    );

    if (existe.length > 0) {
        return { ok: false, error: "La categoría ya existe" };
    }

    await pool.query(
        "INSERT INTO categorias (nombre, activo) VALUES (?, 1)",
        [nombreNormalizado]
    );

    return { ok: true };
}

// 🔹 Obtener todas las categorías activas
export async function getCategorias() {
    const [rows] = await pool.query(
        "SELECT id, nombre FROM categorias WHERE activo = 1 ORDER BY nombre ASC"
    );
    return rows;
}

// 🔹 Eliminar → desactivar
export async function desactivarCategoria(id) {
    await pool.query(
        "UPDATE categorias SET activo = 0 WHERE id = ?",
        [id]
    );
    return { ok: true };
}
