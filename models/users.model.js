// server/models/users.model.js
import { pool } from "../db/pool.js";

export async function getUserRoleDB(email) {
  const [rows] = await pool.query(
    "SELECT id, rol, name, email FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

export async function registerUserDB({ name, email, rol }) {
  const [result] = await pool.query(
    "INSERT INTO users (name, email, rol, activo) VALUES (?, ?, ?, 1)",
    [name, email, rol]
  );
  return result;
}

// Lista todos los usuarios activos (y opcionalmente inactivos)
export async function getAllUsersDB() {
  const [rows] = await pool.query(
    "SELECT id, name, email, rol, activo FROM users ORDER BY id ASC"
  );
  return rows;
}

// Cambia el rol de un usuario por id
export async function updateUserRolDB(id, rol) {
  const [result] = await pool.query(
    "UPDATE users SET rol = ? WHERE id = ?",
    [rol, id]
  );
  return result;
}

// Soft delete: marca activo = 0
export async function deactivateUserDB(id) {
  const [result] = await pool.query(
    "UPDATE users SET activo = 0 WHERE id = ?",
    [id]
  );
  return result;
}

// Reactiva un usuario
export async function reactivateUserDB(id) {
  const [result] = await pool.query(
    "UPDATE users SET activo = 1 WHERE id = ?",
    [id]
  );
  return result;
}
