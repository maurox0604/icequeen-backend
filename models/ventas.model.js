// models/ventas.model.js
import { pool } from "../db/pool.js";

/**
 * ─────────────────────────────────────────────
 * MIGRACIONES — correr UNA sola vez en la BD
 * ─────────────────────────────────────────────
 * ALTER TABLE facturas ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;
 * ALTER TABLE ventas   ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;
 */

// ─────────────────────────────────────────────
// EXISTENTE: Procesar venta
// ─────────────────────────────────────────────
export async function procesarVenta(items, id_user, fechaVenta, id_sede) {
  if (!items || !items.length) throw new Error("No items en compra");

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [facturaResult] = await connection.query(
      "INSERT INTO facturas () VALUES ()"
    );
    const idFactura = facturaResult.insertId;

    const values = items.map((item) => [
      idFactura,
      item.id,
      item.cantCompra,
      item.precio,
      item.totVentaXhelado,
      item.user || id_user || null,
      fechaVenta,
      id_sede || 1,
      item.motivo || "venta",
    ]);

    await connection.query(
      `INSERT INTO ventas (
        id_factura, id_helado, cantidad, precio_helado,
        venta_helado, email, fecha, id_sede, motivo
      ) VALUES ?`,
      [values]
    );

    for (const item of items) {
      const [result] = await connection.query(
        `UPDATE helados SET cantidad = cantidad - ?
         WHERE id = ? AND cantidad >= ?`,
        [item.cantCompra, item.id, item.cantCompra]
      );
      if (result.affectedRows === 0) {
        throw new Error(`Stock insuficiente para producto ${item.id}`);
      }
    }

    await connection.commit();
    return { ok: true, idFactura };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// ─────────────────────────────────────────────
// EXISTENTE: Ventas por rango de fechas
// ─────────────────────────────────────────────
export async function getVentasByRange(start, end) {
  const [rows] = await pool.query(
    `SELECT
        v.*,
        h.sabor,
        v.motivo,
        h.icon,
        s.nombre AS nombre_sede,
        v.fecha AS fecha_local
     FROM ventas v
     LEFT JOIN helados h ON v.id_helado = h.id
     LEFT JOIN sedes s ON v.id_sede = s.id
     WHERE DATE(v.fecha) BETWEEN ? AND ?
       AND COALESCE(v.activo, 1) = 1
     ORDER BY v.fecha DESC`,
    [start, end]
  );
  return rows;
}

// ─────────────────────────────────────────────
// NUEVO: Editar cabecera de factura (fecha, sede)
// ─────────────────────────────────────────────
export async function editarFactura(id_factura, { fecha, id_sede }) {
  // Construir SET dinámico solo con los campos que lleguen
  const campos = [];
  const valores = [];

  if (fecha !== undefined) {
    campos.push("fecha = ?");
    valores.push(fecha);
  }
  if (id_sede !== undefined) {
    campos.push("id_sede = ?");
    valores.push(id_sede);
  }

  if (campos.length === 0) throw new Error("Nada que actualizar en factura");

  // Actualizar ventas de esa factura (fecha y sede viven en ventas, no en facturas)
  valores.push(id_factura);
  const [result] = await pool.query(
    `UPDATE ventas SET ${campos.join(", ")}
     WHERE id_factura = ? AND COALESCE(activo, 1) = 1`,
    valores
  );

  if (result.affectedRows === 0)
    throw new Error("Factura no encontrada o ya cancelada");

  return { ok: true, filas: result.affectedRows };
}

// ─────────────────────────────────────────────
// NUEVO: Cancelar factura completa (soft delete)
// Devuelve inventario de TODOS los ítems activos
// ─────────────────────────────────────────────
export async function cancelarFactura(id_factura) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Obtener ítems activos de la factura
    const [items] = await connection.query(
      `SELECT id, id_helado, cantidad
       FROM ventas
       WHERE id_factura = ? AND COALESCE(activo, 1) = 1`,
      [id_factura]
    );

    if (items.length === 0)
      throw new Error("Factura no encontrada o ya cancelada");

    // 2. Devolver inventario por cada ítem
    for (const item of items) {
      await connection.query(
        `UPDATE helados SET cantidad = cantidad + ? WHERE id = ?`,
        [item.cantidad, item.id_helado]
      );
    }

    // 3. Soft delete de todos los ítems
    await connection.query(
      `UPDATE ventas SET activo = 0 WHERE id_factura = ?`,
      [id_factura]
    );

    // 4. Soft delete de la factura
    await connection.query(
      `UPDATE facturas SET activo = 0 WHERE id = ?`,
      [id_factura]
    );

    await connection.commit();
    return { ok: true, itemsCancelados: items.length };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// ─────────────────────────────────────────────
// NUEVO: Editar un ítem de venta
// Soporta cambiar: id_helado, cantidad, motivo
// Ajusta inventario automáticamente
// ─────────────────────────────────────────────
export async function editarItem(id_item, { id_helado, cantidad, motivo }) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Obtener estado actual del ítem
    const [rows] = await connection.query(
      `SELECT id, id_helado, cantidad, precio_helado
       FROM ventas WHERE id = ? AND COALESCE(activo, 1) = 1`,
      [id_item]
    );
    if (rows.length === 0)
      throw new Error("Ítem no encontrado o ya cancelado");

    const actual = rows[0];
    const nuevoHeladoId = id_helado ?? actual.id_helado;
    const nuevaCantidad = cantidad ?? actual.cantidad;

    // 2. Ajuste de inventario
    const cambioProducto = id_helado && id_helado !== actual.id_helado;
    const cambioCantidad = cantidad !== undefined && cantidad !== actual.cantidad;

    if (cambioProducto) {
      // Devolver inventario del producto anterior
      await connection.query(
        `UPDATE helados SET cantidad = cantidad + ? WHERE id = ?`,
        [actual.cantidad, actual.id_helado]
      );
      // Verificar y descontar stock del producto nuevo
      const [stockResult] = await connection.query(
        `UPDATE helados SET cantidad = cantidad - ?
         WHERE id = ? AND cantidad >= ?`,
        [nuevaCantidad, nuevoHeladoId, nuevaCantidad]
      );
      if (stockResult.affectedRows === 0)
        throw new Error("Stock insuficiente para el nuevo producto");

    } else if (cambioCantidad) {
      const diff = nuevaCantidad - actual.cantidad;

      if (diff > 0) {
        // Aumenta cantidad → descontar más del inventario
        const [stockResult] = await connection.query(
          `UPDATE helados SET cantidad = cantidad - ?
           WHERE id = ? AND cantidad >= ?`,
          [diff, actual.id_helado, diff]
        );
        if (stockResult.affectedRows === 0)
          throw new Error("Stock insuficiente para aumentar la cantidad");
      } else {
        // Reduce cantidad → devolver al inventario
        await connection.query(
          `UPDATE helados SET cantidad = cantidad + ? WHERE id = ?`,
          [Math.abs(diff), actual.id_helado]
        );
      }
    }

    // 3. Obtener precio del helado nuevo (si cambió producto)
    let nuevoPrecio = actual.precio_helado;
    if (cambioProducto) {
      const [heladoRows] = await connection.query(
        `SELECT precio FROM helados WHERE id = ?`,
        [nuevoHeladoId]
      );
      if (heladoRows.length === 0)
        throw new Error("Producto nuevo no encontrado");
      nuevoPrecio = heladoRows[0].precio;
    }

    // 4. Construir SET dinámico
    const campos = [];
    const valores = [];

    if (cambioProducto) {
      campos.push("id_helado = ?", "precio_helado = ?", "venta_helado = ?");
      valores.push(nuevoHeladoId, nuevoPrecio, nuevoPrecio * nuevaCantidad);
    }
    if (cambioCantidad || cambioProducto) {
      // Recalcular venta_helado siempre que cambien cantidad o producto
      if (!cambioProducto) {
        campos.push("venta_helado = ?");
        valores.push(nuevoPrecio * nuevaCantidad);
      }
      campos.push("cantidad = ?");
      valores.push(nuevaCantidad);
    }
    if (motivo !== undefined) {
      campos.push("motivo = ?");
      valores.push(motivo);
    }

    if (campos.length === 0) throw new Error("Nada que actualizar en ítem");

    valores.push(id_item);
    await connection.query(
      `UPDATE ventas SET ${campos.join(", ")} WHERE id = ?`,
      valores
    );

    await connection.commit();
    return { ok: true };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

// ─────────────────────────────────────────────
// NUEVO: Cancelar un ítem individual (soft delete)
// Devuelve su cantidad al inventario
// ─────────────────────────────────────────────
export async function cancelarItem(id_item) {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Obtener ítem activo
    const [rows] = await connection.query(
      `SELECT id, id_helado, cantidad, id_factura
       FROM ventas WHERE id = ? AND COALESCE(activo, 1) = 1`,
      [id_item]
    );
    if (rows.length === 0)
      throw new Error("Ítem no encontrado o ya cancelado");

    const item = rows[0];

    // 2. Devolver inventario
    await connection.query(
      `UPDATE helados SET cantidad = cantidad + ? WHERE id = ?`,
      [item.cantidad, item.id_helado]
    );

    // 3. Soft delete del ítem
    await connection.query(
      `UPDATE ventas SET activo = 0 WHERE id = ?`,
      [id_item]
    );

    // 4. Si todos los ítems de la factura están cancelados → cancelar factura también
    const [activos] = await connection.query(
      `SELECT COUNT(*) AS total FROM ventas
       WHERE id_factura = ? AND COALESCE(activo, 1) = 1`,
      [item.id_factura]
    );
    if (activos[0].total === 0) {
      await connection.query(
        `UPDATE facturas SET activo = 0 WHERE id = ?`,
        [item.id_factura]
      );
    }

    await connection.commit();
    return { ok: true };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}
