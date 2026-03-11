import { pool } from "../db/pool.js";

export const getSedes = async () => {
  const [rows] = await pool.query(
    "SELECT id, nombre FROM sedes WHERE activo = 1"
    );
    console.log("sedes: ", rows)
  return rows;
};
// console.log("sedes ♥☻: ", getSedes())