// models/ventas.model.js
import { pool } from "../db/pool.js";


/**
 * Procesar venta con transacción segura
 * Compatible con Clever + Vercel
 */
export async function procesarVenta(items, id_user, fechaVenta, id_sede) {

  if (!items || !items.length) {
    throw new Error("No items en compra");
  }

  let connection;

  try {
    // 🔐 Obtener conexión segura
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1️⃣ Crear factura
    const [facturaResult] = await connection.query(
      "INSERT INTO facturas () VALUES ()"
    );
    const idFactura = facturaResult.insertId;

    // 2️⃣ Insertar ventas
    const values = items.map(item => [
      idFactura,
      item.id,
      item.cantCompra,
      item.precio,
      item.totVentaXhelado,
      item.user || id_user || null,
      fechaVenta,
      id_sede || 1
    ]);

    await connection.query(
      `
      INSERT INTO ventas (
        id_factura,
        id_helado,
        cantidad,
        precio_helado,
        venta_helado,
        email,
        fecha,
        id_sede
      ) VALUES ?
      `,
      [values]
    );

    // 3️⃣ Actualizar inventario (CASE WHEN)
    // let updateQuery = "UPDATE helados SET cantidad = CASE id ";
    // const ids = [];

    // for (const item of items) {
    //   updateQuery += `WHEN ${item.id} THEN ${item.cantQueda} `;
    //   ids.push(item.id);
    // }

    // updateQuery += `END WHERE id IN (${ids.join(",")})`;
    // await connection.query(updateQuery);

    // 3️⃣ Descontar inventario correctamente
    for (const item of items) {

      const [result] = await connection.query(
        `
        UPDATE helados
        SET cantidad = cantidad - ?
        WHERE id = ? AND cantidad >= ?
        `,
        [item.cantCompra, item.id, item.cantCompra]
      );

      if (result.affectedRows === 0) {
        throw new Error(`Stock insuficiente para producto ${item.id}`);
      }
    }

    await connection.commit();

    return { ok: true, idFactura };

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("❌ Error procesando venta:", error);
    throw error;

  } finally {
    if (connection) {
      connection.release(); // 🔴 LIBERA SIEMPRE
    }
  }
}

/**
 * Obtener ventas por rango de fechas
 * start y end deben venir en formato:
 * YYYY-MM-DD HH:mm:ss (UTC)
 */
export async function getVentasByRange(start, end) {
  console.log("Ventas rango: ", start, end);

  const [rows] = await pool.query(
    `SELECT 
        v.*,
        h.sabor,
        h.icon,
        s.nombre AS nombre_sede,
        v.fecha AS fecha_local
        FROM ventas v
        LEFT JOIN helados h ON v.id_helado = h.id
        LEFT JOIN sedes s ON v.id_sede = s.id
        WHERE DATE(v.fecha) BETWEEN ? AND ?
        ORDER BY v.fecha DESC`,
    [start, end]
  );

  return rows;
}
