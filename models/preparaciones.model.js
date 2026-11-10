import { pool } from "../db/pool.js";

// Error con status HTTP: el controller responde 400/404/409 en vez de 500.
const httpError = (status, message) =>
  Object.assign(new Error(message), { status });

const UNIDADES = ["gr", "ml", "unidad"];

// ═══════════════════════════════════════════════════════════════
// COSTOS
// Costo de TODAS las preparaciones activas en 2 consultas (soporta
// preparaciones dentro de preparaciones, con protección contra ciclos).
// `db` puede ser el pool o una conexión de una transacción abierta.
// → Map(id → { costo_total, costo_por_gr })
// ═══════════════════════════════════════════════════════════════
export const calcularCostosPreparaciones = async (db = pool) => {
  const [preps] = await db.query(
    "SELECT id, rendimiento_gr FROM costeo_preparaciones WHERE activo = 1",
  );
  const [items] = await db.query(
    `SELECT cpi.preparacion_id, cpi.ingrediente_id, cpi.prep_ingrediente_id,
            cpi.cantidad, i.precio_unidad
     FROM costeo_preparacion_ingredientes cpi
     LEFT JOIN ingredientes i ON i.id = cpi.ingrediente_id`,
  );

  const rendimiento = new Map(
    preps.map((p) => [p.id, Number(p.rendimiento_gr)]),
  );
  const porPrep = new Map();
  for (const it of items) {
    if (!porPrep.has(it.preparacion_id)) porPrep.set(it.preparacion_id, []);
    porPrep.get(it.preparacion_id).push(it);
  }

  const memo = new Map();
  const visitando = new Set();

  const costoTotal = (id) => {
    if (memo.has(id)) return memo.get(id);
    if (visitando.has(id)) return 0; // ciclo: se corta (se valida al guardar)
    visitando.add(id);
    let total = 0;
    for (const it of porPrep.get(id) ?? []) {
      const cant = Number(it.cantidad);
      if (it.ingrediente_id) {
        total += cant * Number(it.precio_unidad ?? 0);
      } else if (
        it.prep_ingrediente_id &&
        rendimiento.has(it.prep_ingrediente_id)
      ) {
        total += cant * costoPorGr(it.prep_ingrediente_id);
      }
    }
    visitando.delete(id);
    memo.set(id, total);
    return total;
  };

  const costoPorGr = (id) => {
    const r = rendimiento.get(id);
    return r > 0 ? costoTotal(id) / r : 0;
  };

  const out = new Map();
  for (const id of rendimiento.keys()) {
    out.set(id, { costo_total: costoTotal(id), costo_por_gr: costoPorGr(id) });
  }
  return out;
};

// Agrega a cada línea nombre/unidad/costo unitario/costo de la línea.
// `nombre`, `unidad_item`, `costo_unitario`, `costo_linea` son los campos
// que usa la pantalla; el resto se conserva por compatibilidad.
const enriquecerItems = (items, costos) =>
  items.map((it) => {
    const esPrep = !it.ingrediente_id && !!it.prep_ingrediente_id;
    const costo_unitario = esPrep
      ? Number(costos.get(it.prep_ingrediente_id)?.costo_por_gr ?? 0)
      : Number(it.precio_unidad ?? 0);
    return {
      ...it,
      tipo_item: esPrep ? "preparacion" : "ingrediente",
      nombre: esPrep ? it.prep_nombre : it.ingr_nombre,
      unidad_item: esPrep ? (it.prep_unidad ?? "gr") : it.unidad,
      costo_unitario,
      costo_linea: Number(it.cantidad) * costo_unitario,
    };
  });

const SELECT_ITEMS = `
  SELECT cpi.id, cpi.preparacion_id, cpi.ingrediente_id, cpi.prep_ingrediente_id, cpi.cantidad,
         i.nombre  AS ingr_nombre, i.unidad, i.precio_unidad,
         pr.nombre AS prep_nombre, pr.rendimiento_gr, pr.unidad AS prep_unidad
  FROM costeo_preparacion_ingredientes cpi
  LEFT JOIN ingredientes i          ON i.id  = cpi.ingrediente_id
  LEFT JOIN costeo_preparaciones pr ON pr.id = cpi.prep_ingrediente_id`;

// Lista (3 consultas en total, sin importar cuántas preparaciones haya)
export const listarPreparaciones = async () => {
  const [preps] = await pool.query(
    "SELECT * FROM costeo_preparaciones WHERE activo = 1 ORDER BY nombre",
  );
  const [items] = await pool.query(`${SELECT_ITEMS} ORDER BY cpi.id`);
  const costos = await calcularCostosPreparaciones();

  const porPrep = new Map();
  for (const it of enriquecerItems(items, costos)) {
    if (!porPrep.has(it.preparacion_id)) porPrep.set(it.preparacion_id, []);
    porPrep.get(it.preparacion_id).push(it);
  }
  for (const p of preps) {
    p.rendimiento_gr = Number(p.rendimiento_gr);
    p.costo_total = costos.get(p.id)?.costo_total ?? 0;
    p.costo_por_gr = costos.get(p.id)?.costo_por_gr ?? 0;
    p.ingredientes = porPrep.get(p.id) ?? [];
  }
  return preps;
};

export const obtenerPreparacion = async (id) => {
  const [rows] = await pool.query(
    "SELECT * FROM costeo_preparaciones WHERE id = ? AND activo = 1",
    [id],
  );
  if (!rows.length) return null;
  const p = rows[0];
  const [items] = await pool.query(
    `${SELECT_ITEMS} WHERE cpi.preparacion_id = ? ORDER BY cpi.id`,
    [id],
  );
  const costos = await calcularCostosPreparaciones();
  p.rendimiento_gr = Number(p.rendimiento_gr);
  p.costo_total = costos.get(p.id)?.costo_total ?? 0;
  p.costo_por_gr = costos.get(p.id)?.costo_por_gr ?? 0;
  p.ingredientes = enriquecerItems(items, costos);
  return p;
};

export const obtenerCostoPorGr = async (id) => obtenerPreparacion(id);

// ═══════════════════════════════════════════════════════════════
// GUARDAR (crear / editar) — transacción con UNA sola conexión
// (connectionLimit = 1: un pool.query dentro de la transacción
// dejaría la petición colgada).
// Contrato: { nombre, descripcion, rendimiento_gr, unidad,
//   ingredientes: [{ ingrediente_id | prep_ingrediente_id, cantidad }] }
// `ingredientes` undefined = no tocar las líneas existentes.
// ═══════════════════════════════════════════════════════════════
const normalizarLineasPrep = (arr) => {
  if (arr == null) return [];
  if (!Array.isArray(arr))
    throw httpError(400, "Ingredientes: formato inválido");
  const out = new Map();
  for (const raw of arr) {
    const ingId = raw?.ingrediente_id ? Number(raw.ingrediente_id) : null;
    const prepId = raw?.prep_ingrediente_id
      ? Number(raw.prep_ingrediente_id)
      : null;
    if ((ingId && prepId) || (!ingId && !prepId))
      throw httpError(
        400,
        "Cada línea debe ser un ingrediente o una preparación",
      );
    const id = ingId ?? prepId;
    if (!Number.isInteger(id) || id <= 0)
      throw httpError(400, "Falta seleccionar el elemento de una línea");
    const cantidad = Number(raw.cantidad);
    if (!(cantidad > 0))
      throw httpError(400, "La cantidad de cada línea debe ser mayor a 0");
    const key = `${ingId ? "i" : "p"}${id}`;
    const previa = out.get(key);
    if (previa) previa.cantidad += cantidad;
    else
      out.set(key, {
        ingrediente_id: ingId,
        prep_ingrediente_id: prepId,
        cantidad,
      });
  }
  return [...out.values()];
};

// ¿Se puede llegar a `prep_id` siguiendo las preparaciones de `origenIds`?
const validarSinCiclos = async (db, prep_id, origenIds) => {
  const [edges] = await db.query(
    `SELECT preparacion_id, prep_ingrediente_id
     FROM costeo_preparacion_ingredientes
     WHERE prep_ingrediente_id IS NOT NULL AND preparacion_id <> ?`,
    [prep_id],
  );
  const hijos = new Map();
  for (const e of edges) {
    if (!hijos.has(e.preparacion_id)) hijos.set(e.preparacion_id, []);
    hijos.get(e.preparacion_id).push(e.prep_ingrediente_id);
  }
  const pila = [...origenIds];
  const vistos = new Set();
  while (pila.length) {
    const n = pila.pop();
    if (n === prep_id)
      throw httpError(
        400,
        "Una preparación no puede contener a otra que ya la contiene (sería circular)",
      );
    if (vistos.has(n)) continue;
    vistos.add(n);
    pila.push(...(hijos.get(n) ?? []));
  }
};

const guardarPreparacion = async (id, data = {}) => {
  const esNueva = id == null;
  const nombre = String(data.nombre ?? "").trim();
  if (!nombre)
    throw httpError(400, "El nombre de la preparación es obligatorio");

  const rendimiento_gr = Number(data.rendimiento_gr);
  if (!(rendimiento_gr > 0))
    throw httpError(400, "El rendimiento debe ser mayor a 0");

  const unidad = data.unidad ?? "gr";
  if (!UNIDADES.includes(unidad)) throw httpError(400, "Unidad inválida");

  const lineas =
    data.ingredientes === undefined
      ? null
      : normalizarLineasPrep(data.ingredientes);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let prep_id = id;
    if (!esNueva) {
      prep_id = Number(id);
      const [existe] = await conn.query(
        "SELECT id FROM costeo_preparaciones WHERE id = ? AND activo = 1",
        [prep_id],
      );
      if (!existe.length) throw httpError(404, "Preparación no encontrada");
    }

    const [dup] = await conn.query(
      "SELECT id FROM costeo_preparaciones WHERE nombre = ? AND activo = 1 AND id <> ?",
      [nombre, prep_id ?? 0],
    );
    if (dup.length)
      throw httpError(409, `Ya existe una preparación llamada "${nombre}"`);

    if (esNueva) {
      const [r] = await conn.query(
        `INSERT INTO costeo_preparaciones (nombre, descripcion, rendimiento_gr, unidad)
         VALUES (?, ?, ?, ?)`,
        [nombre, data.descripcion ?? null, rendimiento_gr, unidad],
      );
      prep_id = r.insertId;
    } else {
      await conn.query(
        `UPDATE costeo_preparaciones
         SET nombre = ?, descripcion = ?, rendimiento_gr = ?, unidad = ?
         WHERE id = ?`,
        [nombre, data.descripcion ?? null, rendimiento_gr, unidad, prep_id],
      );
    }

    if (lineas) {
      const ingIds = lineas
        .filter((l) => l.ingrediente_id)
        .map((l) => l.ingrediente_id);
      const prepIds = lineas
        .filter((l) => l.prep_ingrediente_id)
        .map((l) => l.prep_ingrediente_id);

      if (ingIds.length) {
        const [ok] = await conn.query(
          "SELECT id FROM ingredientes WHERE activo = 1 AND id IN (?)",
          [ingIds],
        );
        if (ok.length !== ingIds.length)
          throw httpError(
            400,
            "Uno de los ingredientes seleccionados ya no existe",
          );
      }
      if (prepIds.length) {
        if (prepIds.includes(prep_id))
          throw httpError(400, "Una preparación no puede usarse a sí misma");
        const [ok] = await conn.query(
          "SELECT id FROM costeo_preparaciones WHERE activo = 1 AND id IN (?)",
          [prepIds],
        );
        if (ok.length !== prepIds.length)
          throw httpError(
            400,
            "Una de las preparaciones seleccionadas ya no existe",
          );
        if (!esNueva) await validarSinCiclos(conn, prep_id, prepIds);
      }

      await conn.query(
        "DELETE FROM costeo_preparacion_ingredientes WHERE preparacion_id = ?",
        [prep_id],
      );
      if (lineas.length) {
        await conn.query(
          `INSERT INTO costeo_preparacion_ingredientes
             (preparacion_id, ingrediente_id, prep_ingrediente_id, cantidad) VALUES ?`,
          [
            lineas.map((l) => [
              prep_id,
              l.ingrediente_id,
              l.prep_ingrediente_id,
              l.cantidad,
            ]),
          ],
        );
      }
    }

    await conn.commit();
    return prep_id;
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

// Devuelven la preparación ya con costos (la conexión de la transacción
// se libera antes de volver a consultar con el pool).
export const crearPreparacion = async (data) => {
  const id = await guardarPreparacion(null, data);
  return obtenerPreparacion(id);
};

export const actualizarPreparacion = async (id, data) => {
  const pid = await guardarPreparacion(Number(id), data);
  return obtenerPreparacion(pid);
};

// Soft delete. No se permite si otra preparación, una base o una receta
// la usan: su costo quedaría en 0 sin avisar (y las FK lo impedirían igual).
export const eliminarPreparacion = async (id) => {
  const [enPreps] = await pool.query(
    `SELECT DISTINCT p.nombre
     FROM costeo_preparacion_ingredientes cpi
     JOIN costeo_preparaciones p ON p.id = cpi.preparacion_id AND p.activo = 1
     WHERE cpi.prep_ingrediente_id = ?`,
    [id],
  );
  if (enPreps.length)
    throw httpError(
      409,
      `No se puede eliminar: la usan las preparaciones ${enPreps.map((r) => r.nombre).join(", ")}`,
    );

  const [enBases] = await pool.query(
    `SELECT DISTINCT b.nombre
     FROM base_preparaciones bp
     JOIN bases b ON b.id = bp.base_id AND b.activo = 1
     WHERE bp.prep_id = ?`,
    [id],
  );
  if (enBases.length)
    throw httpError(
      409,
      `No se puede eliminar: la usan las bases ${enBases.map((r) => r.nombre).join(", ")}`,
    );

  const [enRecetas] = await pool.query(
    "SELECT COUNT(DISTINCT receta_id) AS n FROM receta_preparaciones WHERE prep_id = ?",
    [id],
  );
  if (Number(enRecetas[0].n) > 0)
    throw httpError(
      409,
      `No se puede eliminar: la usan ${enRecetas[0].n} receta(s) de helado`,
    );

  const [r] = await pool.query(
    "UPDATE costeo_preparaciones SET activo = 0 WHERE id = ? AND activo = 1",
    [id],
  );
  if (!r.affectedRows) throw httpError(404, "Preparación no encontrada");
};
