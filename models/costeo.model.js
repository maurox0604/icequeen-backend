import { pool } from "../db/pool.js";
import { calcularCostosPreparaciones } from "./preparaciones.model.js";

// Error con status HTTP: el controller lo usa para responder 400/404/409
// en vez de un 500 genérico.
const httpError = (status, message) =>
  Object.assign(new Error(message), { status });

// Normaliza una lista [{ <idKey>, <cantKey> }]: valida, y si un id viene
// repetido suma las cantidades.
const normalizarLineas = (arr, idKey, etiqueta, cantKey = "cantidad") => {
  if (arr == null) return [];
  if (!Array.isArray(arr))
    throw httpError(400, `${etiqueta}: formato inválido`);
  const out = new Map();
  for (const raw of arr) {
    const id = Number(raw?.[idKey]);
    const cantidad = Number(raw?.[cantKey]);
    if (!Number.isInteger(id) || id <= 0)
      throw httpError(400, `${etiqueta}: falta seleccionar el elemento`);
    if (!(cantidad > 0))
      throw httpError(400, `${etiqueta}: la cantidad debe ser mayor a 0`);
    const previa = out.get(id);
    if (previa) previa[cantKey] += cantidad;
    else out.set(id, { ...raw, [idKey]: id, [cantKey]: cantidad });
  }
  return [...out.values()];
};

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
// Una base = lote con ingredientes (gr/ml/unidad) + otras bases (ml).
// costo_tanda  = Σ ingredientes + Σ (ml de sub-base × costo_por_ml de esa base)
// costo_por_ml = costo_tanda / rendimiento_ml
// `db` puede ser el pool o una conexión de una transacción abierta.
// ═══════════════════════════════════════════════════════════════
const calcularBases = async (db = pool) => {
  const [bases] = await db.query(
    "SELECT * FROM bases WHERE activo = 1 ORDER BY nombre",
  );
  const [ings] = await db.query(
    `SELECT bi.id, bi.base_id, bi.ingrediente_id, bi.cantidad,
            i.nombre AS ingr_nombre, i.unidad, i.precio_unidad
     FROM base_ingredientes bi
     JOIN ingredientes i ON i.id = bi.ingrediente_id`,
  );
  const [subs] = await db.query(
    `SELECT bs.id, bs.base_id, bs.base_origen_id, bs.cantidad_ml,
            b.nombre AS origen_nombre
     FROM base_sub_bases bs
     JOIN bases b ON b.id = bs.base_origen_id AND b.activo = 1`,
  );

  const porId = new Map(bases.map((b) => [b.id, b]));
  const ingsPorBase = new Map();
  const subsPorBase = new Map();
  for (const r of ings) {
    if (!ingsPorBase.has(r.base_id)) ingsPorBase.set(r.base_id, []);
    ingsPorBase.get(r.base_id).push(r);
  }
  for (const r of subs) {
    if (!subsPorBase.has(r.base_id)) subsPorBase.set(r.base_id, []);
    subsPorBase.get(r.base_id).push(r);
  }

  const memo = new Map();
  const visitando = new Set();

  const costoTanda = (id) => {
    if (memo.has(id)) return memo.get(id);
    if (visitando.has(id)) return 0; // ciclo: no debería existir (se valida al guardar)
    visitando.add(id);
    let total = 0;
    for (const r of ingsPorBase.get(id) ?? []) {
      total += Number(r.cantidad) * Number(r.precio_unidad);
    }
    for (const r of subsPorBase.get(id) ?? []) {
      if (porId.has(r.base_origen_id)) {
        total += Number(r.cantidad_ml) * costoPorMl(r.base_origen_id);
      }
    }
    visitando.delete(id);
    memo.set(id, total);
    return total;
  };

  const costoPorMl = (id) => {
    const rend = Number(porId.get(id)?.rendimiento_ml);
    return rend > 0 ? costoTanda(id) / rend : 0;
  };

  for (const base of bases) {
    base.rendimiento_ml = Number(base.rendimiento_ml);
    base.costo_tanda = costoTanda(base.id);
    base.costo_por_ml = costoPorMl(base.id);
    base.ingredientes = ingsPorBase.get(base.id) ?? [];
    base.sub_bases = (subsPorBase.get(base.id) ?? []).map((r) => ({
      ...r,
      costo_por_ml: costoPorMl(r.base_origen_id),
    }));
  }
  return bases;
};

export const getBases = async () => calcularBases(pool);

// ¿Se puede llegar a `base_id` siguiendo las sub-bases de `origenIds`?
// (si sí, agregarlas a base_id crearía un ciclo)
const validarSinCiclos = async (db, base_id, origenIds) => {
  const [edges] = await db.query(
    "SELECT base_id, base_origen_id FROM base_sub_bases WHERE base_id <> ?",
    [base_id],
  );
  const hijos = new Map();
  for (const e of edges) {
    if (!hijos.has(e.base_id)) hijos.set(e.base_id, []);
    hijos.get(e.base_id).push(e.base_origen_id);
  }
  const pila = [...origenIds];
  const vistos = new Set();
  while (pila.length) {
    const n = pila.pop();
    if (n === base_id)
      throw httpError(
        400,
        "Una base no puede contener a otra que ya la contiene (sería circular)",
      );
    if (vistos.has(n)) continue;
    vistos.add(n);
    pila.push(...(hijos.get(n) ?? []));
  }
};

// Crea (id null) o actualiza una base con sus ingredientes y sub-bases,
// todo en una transacción y con UNA sola conexión (connectionLimit = 1:
// un pool.query dentro de la transacción dejaría la petición colgada).
// `ingredientes` / `sub_bases` en undefined = no tocar los existentes.
const guardarBase = async (id, data = {}) => {
  const esNueva = id == null;
  const nombre = String(data.nombre ?? "").trim();
  if (!nombre) throw httpError(400, "El nombre de la base es obligatorio");

  let rendimiento_ml = null;
  if (
    data.rendimiento_ml !== undefined &&
    data.rendimiento_ml !== null &&
    data.rendimiento_ml !== ""
  ) {
    rendimiento_ml = Number(data.rendimiento_ml);
    if (!(rendimiento_ml > 0))
      throw httpError(400, "El rendimiento (ml) debe ser mayor a 0");
  } else if (esNueva) {
    rendimiento_ml = 1000; // mismo default de la tabla
  }

  const ingredientes =
    data.ingredientes === undefined
      ? null
      : normalizarLineas(data.ingredientes, "ingrediente_id", "Ingredientes");
  const sub_bases =
    data.sub_bases === undefined
      ? null
      : normalizarLineas(
          data.sub_bases,
          "base_origen_id",
          "Bases",
          "cantidad_ml",
        );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let base_id = id;
    if (esNueva) {
      const [r] = await conn.query(
        "INSERT INTO bases (nombre, descripcion, rendimiento_ml) VALUES (?, ?, ?)",
        [nombre, data.descripcion ?? null, rendimiento_ml],
      );
      base_id = r.insertId;
    } else {
      base_id = Number(id);
      const [existe] = await conn.query(
        "SELECT id FROM bases WHERE id = ? AND activo = 1",
        [base_id],
      );
      if (!existe.length) throw httpError(404, "Base no encontrada");
      await conn.query(
        `UPDATE bases SET nombre = ?, descripcion = ?,
                rendimiento_ml = COALESCE(?, rendimiento_ml)
         WHERE id = ?`,
        [nombre, data.descripcion ?? null, rendimiento_ml, base_id],
      );
    }

    if (ingredientes) {
      await conn.query("DELETE FROM base_ingredientes WHERE base_id = ?", [
        base_id,
      ]);
      if (ingredientes.length) {
        await conn.query(
          "INSERT INTO base_ingredientes (base_id, ingrediente_id, cantidad) VALUES ?",
          [ingredientes.map((i) => [base_id, i.ingrediente_id, i.cantidad])],
        );
      }
    }

    if (sub_bases) {
      const ids = sub_bases.map((s) => s.base_origen_id);
      if (ids.includes(base_id))
        throw httpError(
          400,
          "Una base no puede usarse a sí misma como ingrediente",
        );
      if (ids.length) {
        const [ok] = await conn.query(
          "SELECT id FROM bases WHERE activo = 1 AND id IN (?)",
          [ids],
        );
        if (ok.length !== ids.length)
          throw httpError(400, "Una de las bases seleccionadas ya no existe");
        if (!esNueva) await validarSinCiclos(conn, base_id, ids);
      }
      await conn.query("DELETE FROM base_sub_bases WHERE base_id = ?", [
        base_id,
      ]);
      if (sub_bases.length) {
        await conn.query(
          "INSERT INTO base_sub_bases (base_id, base_origen_id, cantidad_ml) VALUES ?",
          [sub_bases.map((s) => [base_id, s.base_origen_id, s.cantidad_ml])],
        );
      }
    }

    await conn.commit();
    return base_id;
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_) {
      /* la conexión ya se perdió */
    }
    throw e;
  } finally {
    conn.release();
  }
};

// BasesTab envía: { nombre, descripcion, rendimiento_ml,
//   ingredientes: [{ingrediente_id, cantidad}],
//   sub_bases:    [{base_origen_id, cantidad_ml}] }
export const createBase = async (data) => guardarBase(null, data);
export const updateBase = async (id, data) => {
  await guardarBase(Number(id), data);
};

// Soft delete. No se permite si la base la usa otra base o alguna receta:
// el costo de esas quedaría en 0 sin avisar.
export const deleteBase = async (id) => {
  const [enBases] = await pool.query(
    `SELECT b.nombre FROM base_sub_bases bs
     JOIN bases b ON b.id = bs.base_id AND b.activo = 1
     WHERE bs.base_origen_id = ?`,
    [id],
  );
  if (enBases.length)
    throw httpError(
      409,
      `No se puede eliminar: la usan las bases ${enBases.map((r) => r.nombre).join(", ")}`,
    );
  const [enRecetas] = await pool.query(
    "SELECT COUNT(*) AS n FROM recetas WHERE base_id = ?",
    [id],
  );
  if (Number(enRecetas[0].n) > 0)
    throw httpError(
      409,
      `No se puede eliminar: la usan ${enRecetas[0].n} receta(s) de helado`,
    );
  await pool.query("UPDATE bases SET activo = 0 WHERE id = ?", [id]);
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
// Una receta de helado = base (ml) + ingredientes (principal/topping)
//   + preparaciones + packaging + costos fijos prorrateados.
// Margen: precio sugerido = costo_total / (1 − margen_pct/100)
// ═══════════════════════════════════════════════════════════════
const TIPOS_ING = ["principal", "topping", "otro"];
const redondear2 = (n) => Math.round(Number(n) * 100) / 100;

// Todos los helados activos, con o sin receta (LEFT JOIN desde helados).
// `id` es el id del HELADO; `receta_id` es null si aún no tiene receta.
export const getRecetas = async () => {
  const [rows] = await pool.query(
    `SELECT h.id, h.sabor AS helado_nombre, h.precio AS precio_venta,
            r.id AS receta_id, r.base_id, r.costo_total, r.margen_pct,
            b.nombre AS base_nombre
     FROM helados h
     LEFT JOIN recetas r ON r.helado_id = h.id
     LEFT JOIN bases b   ON b.id = r.base_id
     WHERE COALESCE(h.activo, 1) = 1
     ORDER BY h.sabor`,
  );
  return rows;
};

const costoFijoPorUnidad = async (db) => {
  const [cf] = await db.query(
    "SELECT COALESCE(SUM(valor_mensual), 0) AS total FROM costos_fijos WHERE activo = 1",
  );
  const [config] = await db.query(
    "SELECT unidades_mes FROM config_produccion WHERE id = 1",
  );
  const total_mensual = Number(cf[0]?.total ?? 0);
  const unidades_mes = Number(config[0]?.unidades_mes ?? 1000);
  return {
    total_mensual,
    unidades_mes,
    costo_por_unidad: unidades_mes > 0 ? total_mensual / unidades_mes : 0,
  };
};

// Receta completa + costos. Todo por `db` (pool o la conexión de una
// transacción): nunca abre otra conexión.
const cargarReceta = async (db, helado_id) => {
  const [rows] = await db.query(
    `SELECT r.id, r.helado_id, r.base_id, r.volumen_base_ml, r.margen_pct, r.notas,
            h.sabor AS helado_nombre, h.precio AS precio_venta,
            b.nombre AS base_nombre
     FROM recetas r
     LEFT JOIN helados h ON h.id = r.helado_id
     LEFT JOIN bases b   ON b.id = r.base_id
     WHERE r.helado_id = ?`,
    [helado_id],
  );
  if (!rows.length) return null;
  const r = rows[0];

  const [ingredientes] = await db.query(
    `SELECT ri.ingrediente_id, ri.cantidad, ri.tipo,
            i.nombre, i.unidad, i.precio_unidad
     FROM receta_ingredientes ri
     JOIN ingredientes i ON i.id = ri.ingrediente_id
     WHERE ri.receta_id = ?
     ORDER BY ri.id`,
    [r.id],
  );

  const [preps] = await db.query(
    `SELECT rp.prep_id, rp.cantidad, cp.nombre, cp.unidad
     FROM receta_preparaciones rp
     JOIN costeo_preparaciones cp ON cp.id = rp.prep_id
     WHERE rp.receta_id = ?
     ORDER BY rp.id`,
    [r.id],
  );
  const costosPreps = await calcularCostosPreparaciones(db);
  const preparaciones = preps.map((p) => ({
    ...p,
    costo_por_gr: costosPreps.get(p.prep_id)?.costo_por_gr ?? 0,
  }));

  const [packaging] = await db.query(
    `SELECT rk.packaging_id, rk.cantidad, p.nombre, p.tipo, p.precio_unidad
     FROM receta_packaging rk
     JOIN packaging p ON p.id = rk.packaging_id
     WHERE rk.receta_id = ?
     ORDER BY rk.id`,
    [r.id],
  );

  // Base: costo por ml × ml que lleva este helado
  const base_ml = Number(r.volumen_base_ml ?? 0);
  let costo_base_por_ml = 0;
  if (r.base_id) {
    const bases = await calcularBases(db);
    costo_base_por_ml =
      bases.find((b) => b.id === r.base_id)?.costo_por_ml ?? 0;
  }

  const fijos = await costoFijoPorUnidad(db);

  const costo_base = costo_base_por_ml * base_ml;
  const costo_ingredientes = ingredientes.reduce(
    (s, i) => s + Number(i.cantidad) * Number(i.precio_unidad),
    0,
  );
  const costo_preparaciones = preparaciones.reduce(
    (s, p) => s + Number(p.cantidad) * Number(p.costo_por_gr),
    0,
  );
  const costo_packaging = packaging.reduce(
    (s, p) => s + Number(p.cantidad) * Number(p.precio_unidad),
    0,
  );
  const costo_total =
    costo_base +
    costo_ingredientes +
    costo_preparaciones +
    costo_packaging +
    fijos.costo_por_unidad;

  const margen_pct = Number(r.margen_pct ?? 60);
  const precio_venta = Number(r.precio_venta ?? 0);

  return {
    id: r.id,
    helado_id: r.helado_id,
    helado_nombre: r.helado_nombre,
    precio_venta,
    base_id: r.base_id,
    base_nombre: r.base_nombre,
    base_ml,
    margen_pct,
    notas: r.notas,
    ingredientes,
    preparaciones,
    packaging,
    desglose: {
      costo_base: redondear2(costo_base),
      costo_ingredientes: redondear2(costo_ingredientes),
      costo_preparaciones: redondear2(costo_preparaciones),
      costo_packaging: redondear2(costo_packaging),
      costo_fijo_unit: redondear2(fijos.costo_por_unidad),
      costo_total: redondear2(costo_total),
      precio_sugerido:
        margen_pct < 100
          ? redondear2(costo_total / (1 - margen_pct / 100))
          : null,
      precio_venta_actual: precio_venta,
      margen_real_pct:
        precio_venta > 0
          ? Math.round(((precio_venta - costo_total) / precio_venta) * 1000) /
            10
          : null,
    },
  };
};

export const getRecetaDetalle = async (helado_id) =>
  cargarReceta(pool, Number(helado_id));

// Contrato (lo que envía RecetasTab):
// { base_id, base_ml, margen_pct, notas?,
//   ingredientes:  [{ ingrediente_id, cantidad, tipo: 'principal'|'topping'|'otro' }],
//   preparaciones: [{ prep_id, cantidad }],
//   packaging_ids: [id, ...] }
// Reemplaza por completo los hijos de la receta. Devuelve { receta_id, costo_total }.
export const upsertReceta = async (helado_id, data = {}) => {
  helado_id = Number(helado_id);
  if (!Number.isInteger(helado_id) || helado_id <= 0)
    throw httpError(400, "Helado inválido");

  const base_id = data.base_id ? Number(data.base_id) : null;
  const base_ml = base_id ? Number(data.base_ml ?? 0) : 0;
  if (!(base_ml >= 0)) throw httpError(400, "Los ml de base no son válidos");
  if (base_id && !(base_ml > 0))
    throw httpError(400, "Indica cuántos ml de base lleva el helado");

  const margen_pct =
    data.margen_pct === undefined ? 60 : Number(data.margen_pct);
  if (!(margen_pct >= 0 && margen_pct < 100))
    throw httpError(400, "El margen debe estar entre 0 y 99,99 %");

  const ingredientes = normalizarLineas(
    data.ingredientes,
    "ingrediente_id",
    "Ingredientes",
  ).map((i) => ({
    ...i,
    tipo: TIPOS_ING.includes(i.tipo) ? i.tipo : "principal",
  }));
  const preparaciones = normalizarLineas(
    data.preparaciones,
    "prep_id",
    "Preparaciones",
  );
  const packagingIds = [
    ...new Set((data.packaging_ids ?? []).map((x) => Number(x))),
  ];
  if (packagingIds.some((x) => !Number.isInteger(x) || x <= 0))
    throw httpError(400, "Packaging inválido");

  const notas = data.notas === undefined ? null : String(data.notas);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [helado] = await conn.query("SELECT id FROM helados WHERE id = ?", [
      helado_id,
    ]);
    if (!helado.length) throw httpError(404, "Helado no encontrado");

    if (base_id) {
      const [b] = await conn.query(
        "SELECT id FROM bases WHERE id = ? AND activo = 1",
        [base_id],
      );
      if (!b.length) throw httpError(400, "La base seleccionada ya no existe");
    }

    const [existing] = await conn.query(
      "SELECT id FROM recetas WHERE helado_id = ?",
      [helado_id],
    );
    let receta_id;
    if (existing.length) {
      receta_id = existing[0].id;
      await conn.query(
        `UPDATE recetas SET base_id = ?, volumen_base_ml = ?, margen_pct = ?,
                notas = COALESCE(?, notas)
         WHERE id = ?`,
        [base_id, base_ml, margen_pct, notas, receta_id],
      );
    } else {
      const [ins] = await conn.query(
        `INSERT INTO recetas (helado_id, base_id, volumen_base_ml, margen_pct, notas)
         VALUES (?, ?, ?, ?, ?)`,
        [helado_id, base_id, base_ml, margen_pct, notas],
      );
      receta_id = ins.insertId;
    }

    await conn.query("DELETE FROM receta_ingredientes WHERE receta_id = ?", [
      receta_id,
    ]);
    if (ingredientes.length) {
      await conn.query(
        "INSERT INTO receta_ingredientes (receta_id, ingrediente_id, cantidad, tipo) VALUES ?",
        [
          ingredientes.map((i) => [
            receta_id,
            i.ingrediente_id,
            i.cantidad,
            i.tipo,
          ]),
        ],
      );
    }

    await conn.query("DELETE FROM receta_preparaciones WHERE receta_id = ?", [
      receta_id,
    ]);
    if (preparaciones.length) {
      await conn.query(
        "INSERT INTO receta_preparaciones (receta_id, prep_id, cantidad) VALUES ?",
        [preparaciones.map((p) => [receta_id, p.prep_id, p.cantidad])],
      );
    }

    await conn.query("DELETE FROM receta_packaging WHERE receta_id = ?", [
      receta_id,
    ]);
    if (packagingIds.length) {
      await conn.query(
        "INSERT INTO receta_packaging (receta_id, packaging_id, cantidad) VALUES ?",
        [packagingIds.map((pid) => [receta_id, pid, 1])],
      );
    }

    // Foto del costo al momento de guardar (la lista de helados la muestra
    // sin recalcular N recetas en cada carga).
    const detalle = await cargarReceta(conn, helado_id);
    const costo_total = detalle.desglose.costo_total;
    await conn.query("UPDATE recetas SET costo_total = ? WHERE id = ?", [
      costo_total,
      receta_id,
    ]);

    await conn.commit();
    return { receta_id, costo_total };
  } catch (e) {
    try {
      await conn.rollback();
    } catch (_) {
      /* la conexión ya se perdió */
    }
    throw e;
  } finally {
    conn.release();
  }
};
