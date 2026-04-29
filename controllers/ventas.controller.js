import { procesarVenta, getVentasByRange } from "../models/ventas.model.js";

export async function procesarCarritoController(req, res) {
  console.log("📦 Datos recibidos del carrito:", req.body);
  console.log("🎯 Motivo del primer item:", req.body.items?.[0]?.motivo); // ✅ NUEVO
  try {
    const { items, fecha_manual, id_sede } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Carrito vacío" });
    }

    const fechaVenta = fecha_manual || null;
    const user = items[0]?.user || null;

    // ✅ motivo ya viene en cada item desde el frontend
    const resultVenta = await procesarVenta(
      items,
      user,
      fechaVenta,
      id_sede || 1,
    );

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

// Controlador para obtener ventas por rango de fechas
export const ventasPorRangoController = async (req, res) => {
  try {
    const { start, end } = req.query;

    console.log(
      "ventasPorRangoController fechas ini y fin: ",
      start,
      "  fin: ",
      end,
    );

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
