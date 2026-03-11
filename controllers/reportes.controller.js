import { getTopSabores } from "../models/reportes.model.js";

export const topSaboresController = async (req, res) => {
    console.log("probando gettopsabores")
    try {
        const { start, end } = req.query;

        console.log("📩 Fechas recibidas:", start, end);

        const data = await getTopSabores(start, end);

        res.json({
            ok: true,
            data,
        });
    } catch (error) {
        console.error("❌ Error en topSaboresController:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};
