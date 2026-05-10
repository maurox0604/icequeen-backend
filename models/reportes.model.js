import { pool } from "../db/pool.js";

export const getTopSabores = async (start, end) => {
  const fechaInicio = start || "2000-01-01";
  const fechaFin = end || "2100-01-01";
  const [rows] = await pool.query(
    `
    SELECT h.sabor, SUM(v.cantidad) AS total_vendido
    FROM ventas v
    JOIN helados h ON v.id_helado = h.id
    WHERE DATE(CONVERT_TZ(v.fecha, '+00:00', '-05:00')) BETWEEN ? AND ?
      AND COALESCE(v.activo, 1) = 1
    GROUP BY h.sabor
    ORDER BY total_vendido DESC
    LIMIT 10
  `,
    [fechaInicio, fechaFin],
  );
  return rows;
};

export const getDashboardMetrics = async (start, end) => {
  const [totales] = await pool.query(
    `
    SELECT
      SUM(CASE WHEN motivo = 'venta' OR motivo IS NULL THEN venta_helado ELSE 0 END) AS totalIngresos,
      SUM(CASE WHEN motivo = 'venta' OR motivo IS NULL THEN cantidad ELSE 0 END) AS totalUnidades,
      COUNT(DISTINCT id_factura) AS totalFacturas
    FROM ventas
    WHERE DATE(CONVERT_TZ(fecha, '+00:00', '-05:00')) BETWEEN ? AND ?
      AND COALESCE(activo, 1) = 1
  `,
    [start, end],
  );

  const [topProductos] = await pool.query(
    `
    SELECT h.sabor, SUM(v.cantidad) AS cantidad
    FROM ventas v
    JOIN helados h ON v.id_helado = h.id
    WHERE DATE(CONVERT_TZ(v.fecha, '+00:00', '-05:00')) BETWEEN ? AND ?
      AND (v.motivo = 'venta' OR v.motivo IS NULL)
      AND COALESCE(v.activo, 1) = 1
    GROUP BY h.sabor
    ORDER BY cantidad DESC
    LIMIT 10
  `,
    [start, end],
  );

  const [porSede] = await pool.query(
    `
    SELECT
      s.nombre AS sede,
      SUM(CASE WHEN v.motivo = 'venta' OR v.motivo IS NULL THEN v.venta_helado ELSE 0 END) AS ingresos,
      SUM(CASE WHEN v.motivo = 'venta' OR v.motivo IS NULL THEN v.cantidad ELSE 0 END) AS unidades
    FROM ventas v
    JOIN sedes s ON v.id_sede = s.id
    WHERE DATE(CONVERT_TZ(v.fecha, '+00:00', '-05:00')) BETWEEN ? AND ?
      AND COALESCE(v.activo, 1) = 1
    GROUP BY s.nombre
    ORDER BY ingresos DESC
  `,
    [start, end],
  );

  const [porMotivo] = await pool.query(
    `
    SELECT
      COALESCE(motivo, 'venta') AS motivo,
      SUM(cantidad) AS cantidad,
      SUM(CASE WHEN motivo = 'venta' OR motivo IS NULL THEN venta_helado ELSE 0 END) AS ingresos
    FROM ventas
    WHERE DATE(CONVERT_TZ(fecha, '+00:00', '-05:00')) BETWEEN ? AND ?
      AND COALESCE(activo, 1) = 1
    GROUP BY motivo
    ORDER BY cantidad DESC
  `,
    [start, end],
  );

  return {
    totalIngresos: totales[0]?.totalIngresos ?? 0,
    totalUnidades: totales[0]?.totalUnidades ?? 0,
    totalFacturas: totales[0]?.totalFacturas ?? 0,
    topProductos,
    porSede,
    porMotivo,
  };
};
