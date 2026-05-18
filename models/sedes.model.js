import { pool } from "../db/pool.js";

export const getSedes = async () => {
  const [rows] = await pool.query(
    "SELECT id, nombre, activo FROM sedes ORDER BY nombre ASC",
  );
  return rows;
};

export const crearSede = async (nombre) => {
  const [result] = await pool.query(
    "INSERT INTO sedes (nombre, activo) VALUES (?, 1)",
    [nombre],
  );
  return result.insertId;
};

export const actualizarSede = async (id, nombre) => {
  await pool.query("UPDATE sedes SET nombre = ? WHERE id = ?", [nombre, id]);
};

export const toggleSede = async (id, activo) => {
  await pool.query("UPDATE sedes SET activo = ? WHERE id = ?", [activo, id]);
};
