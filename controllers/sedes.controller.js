import { getSedes } from "../models/sedes.model.js";

export const listarSedes = async (req, res) => {
    try {
        const sedes = await getSedes();
        console.log("listarSedes sedes: ", sedes)
        res.json(sedes);
    } catch (error) {
    console.error("🔥 ERROR sedes:", error);
    res.status(500).json({ error: error.message });
}

};
