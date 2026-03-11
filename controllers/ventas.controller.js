
import { procesarVenta, getVentasByRange } from "../models/ventas.model.js";



export async function procesarCarritoController(req, res) {
  console.log("🔥 CONTROLLER ALCANZADO");

//   console.log("📅 fecha recibida raw:", fecha);
// console.log("📅 new Date(fecha):", new Date(fecha));
// console.log("📅 ISO:", new Date(fecha).toISOString());

  try {
    console.log("📦 Datos recibidos del carrito:", req.body);

    const { items, fecha_manual, id_sede } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Carrito vacío" });
    }

    // 🔹 Fecha de venta
    // const fechaVenta = fecha_manual
    //   ? new Date(fecha_manual)
    //   : new Date();

    const fechaVenta = fecha_manual || null;
    console.log("📅 fechaVenta procesada en controller:", fechaVenta);


    // 🔹 Usuario: lo tomamos del primer item
    const user = items[0]?.user || null;

    const resultVenta = await procesarVenta(
      items,
      user,
      fechaVenta,
      id_sede || 1
    );

    return res.status(200).json({
      ok: true,
      message: "Venta registrada correctamente",
      ventaId: resultVenta.idFactura
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
      
      console.log("ventasPorRangoController fechas ini y fin: ", start, "  fin: ",end)

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


