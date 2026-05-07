// controllers/ventas.controller.js
import {
  procesarVenta,
  getVentasByRange,
  editarFactura,
  cancelarFactura,
  editarItem,
  cancelarItem,
} from "../models/ventas.model.js";

// ─────────────────────────────────────────────
// EXISTENTE: Procesar carrito
// ─────────────────────────────────────────────
export async function procesarCarritoController(req, res) {
  console.log("📦 Datos recibidos del carrito:", req.body);
  console.log("🎯 Motivo del primer item:", req.body.items?.[0]?.motivo);
  try {
    const { items, fecha_manual, id_sede } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Carrito vacío" });
    }

    const fechaVenta = fecha_manual || null;
    const user = items[0]?.user || null;

    const resultVenta = await procesarVenta(items, user, fechaVenta, id_sede || 1);

    return res.status(200).json({
      ok: true,
      message: "Venta registrada correctamente",
      ventaId: resultVenta.idFactura,
    });
  } catch (error) {
    console.error("❌ Error en procesarCarritoController:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
}

// ─────────────────────────────────────────────
// EXISTENTE: Ventas por rango de fechas
// ─────────────────────────────────────────────
export const ventasPorRangoController = async (req, res) => {
  try {
    const { start, end } = req.query;
    console.log("ventasPorRangoController fechas ini y fin: ", start, "  fin: ", end);

    if (!start || !end) {
      return res.status(400).json({ message: "Faltan parámetros start y end" });
    }

    const ventas = await getVentasByRange(start, end);
    return res.json({ ventas });
  } catch (error) {
    console.error("Error obteniendo ventas:", error);
    return res.status(500).json({ message: "Error en servidor", error });
  }
};

// ─────────────────────────────────────────────
// NUEVO: Editar cabecera de factura (fecha, sede)
// PUT /ventas/factura/:id_factura
// Body: { fecha?, id_sede? }
// ─────────────────────────────────────────────
export async function editarFacturaController(req, res) {
  try {
    const { id_factura } = req.params;
    const { fecha, id_sede } = req.body;

    if (!fecha && !id_sede) {
      return res.status(400).json({ message: "Envía al menos fecha o id_sede" });
    }

    const result = await editarFactura(Number(id_factura), { fecha, id_sede });
    return res.json(result);
  } catch (error) {
    console.error("❌ editarFacturaController:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
}

// ─────────────────────────────────────────────
// NUEVO: Cancelar factura completa (soft delete)
// PATCH /ventas/factura/:id_factura/cancelar
// ─────────────────────────────────────────────
export async function cancelarFacturaController(req, res) {
  try {
    const { id_factura } = req.params;
    const result = await cancelarFactura(Number(id_factura));
    return res.json(result);
  } catch (error) {
    console.error("❌ cancelarFacturaController:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
}

// ─────────────────────────────────────────────
// NUEVO: Editar un ítem de venta
// PUT /ventas/item/:id
// Body: { id_helado?, cantidad?, motivo? }
// ─────────────────────────────────────────────
export async function editarItemController(req, res) {
  try {
    const { id } = req.params;
    const { id_helado, cantidad, motivo } = req.body;

    if (id_helado === undefined && cantidad === undefined && motivo === undefined) {
      return res.status(400).json({ message: "Envía al menos un campo a editar" });
    }

    const result = await editarItem(Number(id), { id_helado, cantidad, motivo });
    return res.json(result);
  } catch (error) {
    console.error("❌ editarItemController:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
}

// ─────────────────────────────────────────────
// NUEVO: Cancelar ítem individual (soft delete)
// PATCH /ventas/item/:id/cancelar
// ─────────────────────────────────────────────
export async function cancelarItemController(req, res) {
  try {
    const { id } = req.params;
    const result = await cancelarItem(Number(id));
    return res.json(result);
  } catch (error) {
    console.error("❌ cancelarItemController:", error);
    return res.status(500).json({ ok: false, message: error.message });
  }
}
