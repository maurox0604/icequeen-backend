// server/models/users.model.js
import { pool } from "../db/pool.js";

export async function getUserRoleDB(email) {
  const [rows] = await pool.query(
    "SELECT rol FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
}
