import {
  getTopSabores,
  getDashboardMetrics,
} from "../models/reportes.model.js";

export const topSaboresController = async (req, res) => {
  try {
    const { start, end } = req.query;
    const data = await getTopSabores(start ?? null, end ?? null);
    res.json(data);
  } catch (error) {
    console.error("Error en topSaboresController:", error);
    res.status(500).json({ message: "Error obteniendo top sabores" });
  }
};

export const dashboardController = async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ message: "Faltan parámetros start y end" });
    }
    const data = await getDashboardMetrics(start, end);
    res.json(data);
  } catch (error) {
    console.error("Error en dashboardController:", error);
    res
      .status(500)
      .json({ message: "Error obteniendo métricas del dashboard" });
  }
};
