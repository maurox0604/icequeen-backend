// server/models/users.model.js
import { pool } from "../db/pool.js";

export async function getUserRoleDB(email) {
  const [rows] = await pool.query(
    "SELECT rol FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
}


// ✅ NUEVO: inserta usuario en tabla users
export async function registerUserDB({ name, email, rol }) {
    const [result] = await pool.query(
        "INSERT INTO users (name, email, rol) VALUES (?, ?, ?)",
        [name, email, rol]
    );
    return result;
}
