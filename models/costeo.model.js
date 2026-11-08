import { pool } from "../db/pool.js";

// ═══════════════════════════════════════════════════════════════
// INGREDIENTES
// ═══════════════════════════════════════════════════════════════
export const getIngredientes = async () => {
  const [rows] = await pool.query(
    "SELECT * FROM ingredientes WHERE activo = 1 ORDER BY nombre",
  );
  return rows;
};

export const createIngrediente = async ({
  nombre,
  unidad,
  precio_compra,
  cantidad_compra,
  proveedor,
}) => {
  // precio_unidad = precio por 1 gr/ml, calculado del total comprado
  const precio_unidad =
    cantidad_compra > 0 ? Number(precio_compra) / Number(cantidad_compra) : 0;
  const [result] = await pool.query(
    `INSERT INTO ingredientes (nombre, unidad, precio_unidad, precio_compra, cantidad_compra, proveedor)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      nombre,
      unidad,
      precio_unidad,
      precio_compra ?? null,
      cantidad_compra ?? null,
      proveedor ?? null,
    ],
  );
  return result.insertId;
};

export const updateIngrediente = async (
  id,
  { nombre, unidad, precio_compra, cantidad_compra, proveedor },
) => {
  const precio_unidad =
    cantidad_compra > 0 ? Number(precio_compra) / Number(cantidad_compra) : 0;
  await pool.query(
    `UPDATE ingredientes
     SET nombre=?, unidad=?, precio_unidad=?, precio_compra=?, cantidad_compra=?, proveedor=?
     WHERE id=?`,
    [
      nombre,
      unidad,
      precio_unidad,
      precio_compra ?? null,
      cantidad_compra ?? null,
      proveedor ?? null,
      id,
    ],
  );
};

export const deleteIngrediente = async (id) => {
  await pool.query("UPDATE ingredientes SET activo = 0 WHERE id = ?", [id]);
};

// ═══════════════════════════════════════════════════════════════
// PACKAGING
// ═══════════════════════════════════════════════════════════════
export const getPackaging = async () => {
  const [rows] = await pool.query(
    "SELECT * FROM packaging WHERE activo = 1 ORDER BY tipo, nombre",
  );
  return rows;
};

export const createPackaging = async ({
  nombre,
  tipo,
  precio_compra,
  cantidad_compra,
}) => {
  const precio_unidad =
    cantidad_compra > 0 ? Number(precio_compra) / Number(cantidad_compra) : 0;
  const [result] = await pool.query(
    `INSERT INTO packaging (nombre, tipo, precio_unidad, precio_compra, cantidad_compra)
     VALUES (?, ?, ?, ?, ?)`,
    [
      nombre,
      tipo,
      precio_unidad,
      precio_compra ?? null,
      cantidad_compra ?? null,
    ],
  );
  return result.insertId;
};

export const updatePackaging = async (
  id,
  { nombre, tipo, precio_compra, cantidad_compra },
) => {
  const precio_unidad =
    cantidad_compra > 0 ? Number(precio_compra) / Number(cantidad_compra) : 0;
  await pool.query(
    `UPDATE packaging
     SET nombre=?, tipo=?, precio_unidad=?, precio_compra=?, cantidad_compra=?
     WHERE id=?`,
    [
      nombre,
      tipo,
      precio_unidad,
      precio_compra ?? null,
      cantidad_compra ?? null,
      id,
    ],
  );
};

export const deletePackaging = async (id) => {
  await pool.query("UPDATE packaging SET activo = 0 WHERE id = ?", [id]);
};

// ═══════════════════════════════════════════════════════════════
// BASES
// ═══════════════════════════════════════════════════════════════
export const getBases = async () => {
  const [bases] = await pool.query(
    "SELECT * FROM bases WHERE activo = 1 ORDER BY nombre",
  );
  for (const base of bases) {
    const [items] = await pool.query(
      `SELECT bi.*, i.nombre AS ingr_nombre, i.unidad, i.precio_unidad
       FROM base_ingredientes bi
       JOIN ingredientes i ON i.id = bi.ingrediente_id
       WHERE bi.base_id = ?`,
      [base.id],
    );
    base.ingredientes = items;
    base.costo_tanda = items.reduce(
      (sum, row) => sum + Number(row.cantidad) * Number(row.precio_unidad),
      0,
    );
  }
  return bases;
};

// BasesTab envía: { nombre, descripcion, ingredientes: [{ingrediente_id, cantidad}] }
export const createBase = async ({ nombre, descripcion }) => {
  const [result] = await pool.query(
    "INSERT INTO bases (nombre, descripcion) VALUES (?, ?)",
    [nombre, descripcion ?? null],
  );
  return result.insertId;
};

export const updateBase = async (id, { nombre, descripcion }) => {
  await pool.query("UPDATE bases SET nombre=?, descripcion=? WHERE id=?", [
    nombre,
    descripcion ?? null,
    id,
  ]);
};

export const deleteBase = async (id) => {
  await pool.query("UPDATE bases SET activo = 0 WHERE id = ?", [id]);
};

export const upsertBaseIngredientes = async (base_id, ingredientes) => {
  // ingredientes = [{ ingrediente_id, cantidad }]
  await pool.query("DELETE FROM base_ingredientes WHERE base_id = ?", [
    base_id,
  ]);
  if (!ingredientes || ingredientes.length === 0) return;
  const values = ingredientes.map((i) => [
    base_id,
    i.ingrediente_id,
    i.cantidad,
  ]);
  await pool.query(
    "INSERT INTO base_ingredientes (base_id, ingrediente_id, cantidad) VALUES ?",
    [values],
  );
};

// ═══════════════════════════════════════════════════════════════
// COSTOS FIJOS
// ═══════════════════════════════════════════════════════════════
export const getCostosFijos = async () => {
  const [rows] = await pool.query(
    "SELECT * FROM costos_fijos WHERE activo = 1 ORDER BY nombre",
  );
  const [config] = await pool.query(
    "SELECT unidades_mes FROM config_produccion WHERE id = 1",
  );
  const unidades_mes = config[0]?.unidades_mes ?? 1000;
  const total_mensual = rows.reduce((s, r) => s + Number(r.valor_mensual), 0);
  return {
    items: rows,
    total_mensual,
    unidades_mes,
    costo_fijo_por_unidad: unidades_mes > 0 ? total_mensual / unidades_mes : 0,
  };
};

export const createCostoFijo = async ({ nombre, valor_mensual }) => {
  const [result] = await pool.query(
    "INSERT INTO costos_fijos (nombre, valor_mensual) VALUES (?, ?)",
    [nombre, valor_mensual],
  );
  return result.insertId;
};

export const updateCostoFijo = async (id, { nombre, valor_mensual }) => {
  await pool.query(
    "UPDATE costos_fijos SET nombre=?, valor_mensual=? WHERE id=?",
    [nombre, valor_mensual, id],
  );
};

export const deleteCostoFijo = async (id) => {
  await pool.query("UPDATE costos_fijos SET activo = 0 WHERE id = ?", [id]);
};

export const updateUnidadesMes = async (unidades_mes) => {
  await pool.query(
    "UPDATE config_produccion SET unidades_mes = ? WHERE id = 1",
    [unidades_mes],
  );
};

// ═══════════════════════════════════════════════════════════════
// RECETAS
// ═══════════════════════════════════════════════════════════════

export const getRecetas = async () => {
  const [rows] = await pool.query(
    `SELECT h.id, h.sabor AS helado_nombre, h.precio AS precio_venta,
            r.id AS receta_id, r.base_id, r.costo_total,
            b.nombre AS base_nombre
     FROM helados h
     LEFT JOIN recetas r ON r.helado_id = h.id
     LEFT JOIN bases b   ON b.id = r.base_id
     ORDER BY h.sabor`,
  );
  return rows;
};

export const getRecetaDetalle = async (helado_id) => {
  const [rows] = await pool.query(
    `SELECT r.*, h.sabor AS helado_nombre, h.precio AS precio_venta,
            b.nombre AS base_nombre
     FROM recetas r
     LEFT JOIN helados h ON h.id = r.helado_id
     LEFT JOIN bases b   ON b.id = r.base_id
     WHERE r.helado_id = ?`,
    [helado_id],
  );
  if (!rows.length) return null;

  const receta = rows[0];

  // Ingredientes de la receta
  const [ingredientes] = await pool.query(
    `SELECT ri.*, i.nombre, i.unidad, i.precio_unidad
     FROM receta_ingredientes ri
     JOIN ingredientes i ON i.id = ri.ingrediente_id
     WHERE ri.receta_id = ?`,
    [receta.id],
  );
  receta.ingredientes = ingredientes;

  // Preparaciones de la receta
  const [preparaciones] = await pool.query(
    `SELECT rp.*, cp.nombre, cp.unidad, cp.rendimiento_gr
     FROM receta_preparaciones rp
     JOIN costeo_preparaciones cp ON cp.id = rp.prep_id
     WHERE rp.receta_id = ?`,
    [receta.id],
  );
  // Calcular costo_por_gr de cada preparación
  for (const p of preparaciones) {
    const [items] = await pool.query(
      `SELECT cpi.cantidad, i.precio_unidad
       FROM costeo_preparacion_ingredientes cpi
       JOIN ingredientes i ON i.id = cpi.ingrediente_id
       WHERE cpi.preparacion_id = ? AND cpi.ingrediente_id IS NOT NULL`,
      [p.prep_id],
    );
    const costo_tanda = items.reduce(
      (s, it) => s + Number(it.cantidad) * Number(it.precio_unidad),
      0,
    );
    p.costo_por_gr = p.rendimiento_gr > 0 ? costo_tanda / p.rendimiento_gr : 0;
  }
  receta.preparaciones = preparaciones;

  // Packaging de la receta
  const [pkgs] = await pool.query(
    `SELECT rp.*, p.nombre, p.tipo, p.precio_unidad
     FROM receta_packaging rp
     JOIN packaging p ON p.id = rp.packaging_id
     WHERE rp.receta_id = ?`,
    [receta.id],
  );
  receta.packaging = pkgs;

  // Ingredientes de la base
  let base_ingredientes = [];
  let costo_base_tanda = 0;
  if (receta.base_id) {
    const [bi] = await pool.query(
      `SELECT bi.*, i.nombre, i.unidad, i.precio_unidad
       FROM base_ingredientes bi
       JOIN ingredientes i ON i.id = bi.ingrediente_id
       WHERE bi.base_id = ?`,
      [receta.base_id],
    );
    base_ingredientes = bi;
    costo_base_tanda = bi.reduce(
      (s, i) => s + Number(i.cantidad) * Number(i.precio_unidad),
      0,
    );
  }
  receta.base_ingredientes = base_ingredientes;

  // ─── CÁLCULO DE COSTOS ───────────────────────────────────────
  // La base se mide en gr (volumen_base_ml guardado = gramos reales)
  const total_gr_base = base_ingredientes.reduce(
    (s, i) => s + Number(i.cantidad),
    0,
  );
  const costo_base_por_gr =
    total_gr_base > 0 ? costo_base_tanda / total_gr_base : 0;
  const costo_base = costo_base_por_gr * Number(receta.volumen_base_ml ?? 0);

  const costo_ingredientes = ingredientes.reduce(
    (s, i) => s + Number(i.cantidad) * Number(i.precio_unidad),
    0,
  );

  const costo_preparaciones = preparaciones.reduce(
    (s, p) => s + Number(p.cantidad) * Number(p.costo_por_gr),
    0,
  );

  const costo_packaging = pkgs.reduce(
    (s, p) => s + Number(p.cantidad) * Number(p.precio_unidad),
    0,
  );

  const [cf] = await pool.query(
    "SELECT SUM(valor_mensual) AS total FROM costos_fijos WHERE activo = 1",
  );
  const [config] = await pool.query(
    "SELECT unidades_mes FROM config_produccion WHERE id = 1",
  );
  const total_fijos = Number(cf[0]?.total ?? 0);
  const unidades_mes = config[0]?.unidades_mes ?? 1000;
  const costo_fijo_unit = unidades_mes > 0 ? total_fijos / unidades_mes : 0;

  const costo_mdo = Number(receta.mano_de_obra ?? 0);

  const costo_total =
    costo_base +
    costo_ingredientes +
    costo_preparaciones +
    costo_packaging +
    costo_fijo_unit +
    costo_mdo;
  const precio_sugerido = costo_total * Number(receta.margen_ganancia ?? 2.5);

  receta.desglose = {
    costo_base: Math.round(costo_base),
    costo_ingredientes: Math.round(costo_ingredientes),
    costo_preparaciones: Math.round(costo_preparaciones),
    costo_packaging: Math.round(costo_packaging),
    costo_fijo_unit: Math.round(costo_fijo_unit),
    costo_mdo: Math.round(costo_mdo),
    costo_total: Math.round(costo_total),
    precio_sugerido: Math.round(precio_sugerido),
    precio_venta_actual: Number(receta.precio_venta ?? 0),
    margen_real_pct:
      receta.precio_venta > 0
        ? (
            ((receta.precio_venta - costo_total) / receta.precio_venta) *
            100
          ).toFixed(1)
        : null,
  };

  return receta;
};

export const upsertReceta = async (
  helado_id,
  {
    base_id,
    volumen_base_ml,
    mano_de_obra,
    margen_ganancia,
    notas,
    ingredientes = [],
    preparaciones = [],
    packaging = [],
  },
) => {
  const [existing] = await pool.query(
    "SELECT id FROM recetas WHERE helado_id = ?",
    [helado_id],
  );

  let receta_id;
  if (existing.length) {
    receta_id = existing[0].id;
    await pool.query(
      `UPDATE recetas SET base_id=?, volumen_base_ml=?, mano_de_obra=?,
       margen_ganancia=?, notas=? WHERE id=?`,
      [
        base_id ?? null,
        volumen_base_ml ?? 0,
        mano_de_obra ?? 0,
        margen_ganancia ?? 2.5,
        notas ?? null,
        receta_id,
      ],
    );
  } else {
    const [result] = await pool.query(
      `INSERT INTO recetas (helado_id, base_id, volumen_base_ml, mano_de_obra, margen_ganancia, notas)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        helado_id,
        base_id ?? null,
        volumen_base_ml ?? 0,
        mano_de_obra ?? 0,
        margen_ganancia ?? 2.5,
        notas ?? null,
      ],
    );
    receta_id = result.insertId;
  }

  // Ingredientes
  await pool.query("DELETE FROM receta_ingredientes WHERE receta_id = ?", [
    receta_id,
  ]);
  if (ingredientes.length) {
    const vals = ingredientes.map((i) => [
      receta_id,
      i.ingrediente_id,
      i.cantidad,
    ]);
    await pool.query(
      "INSERT INTO receta_ingredientes (receta_id, ingrediente_id, cantidad) VALUES ?",
      [vals],
    );
  }

  // Preparaciones
  await pool.query("DELETE FROM receta_preparaciones WHERE receta_id = ?", [
    receta_id,
  ]);
  if (preparaciones && preparaciones.length) {
    const vals = preparaciones.map((p) => [receta_id, p.prep_id, p.cantidad]);
    await pool.query(
      "INSERT INTO receta_preparaciones (receta_id, prep_id, cantidad) VALUES ?",
      [vals],
    );
  }

  // Packaging
  await pool.query("DELETE FROM receta_packaging WHERE receta_id = ?", [
    receta_id,
  ]);
  if (packaging.length) {
    const vals = packaging.map((p) => [receta_id, p.packaging_id, p.cantidad]);
    await pool.query(
      "INSERT INTO receta_packaging (receta_id, packaging_id, cantidad) VALUES ?",
      [vals],
    );
  }

  return receta_id;
};
