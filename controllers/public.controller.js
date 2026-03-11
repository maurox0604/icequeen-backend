import { getHeladosPublicos } from "../models/public.model.js";

export const getProductosPublicos = async (req, res) => {
  try {
    const helados = await getHeladosPublicos();
    res.json(helados);
  } catch (error) {
    console.error("ERROR PUBLIC PRODUCTOS:", error);
    res.status(500).json({
      message: "Error obteniendo productos públicos",
    });
  }
};
