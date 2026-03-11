import { Router } from "express";
import cors from "cors";
import { listarSedes } from "../controllers/sedes.controller.js";


const router = Router();
// Agregar CORS directamente
router.use(cors({ origin: "*" }));

router.get("/", listarSedes);

export default router;
