import { Router } from "express";
import cors from "cors";
import {
  listarSedes,
  crearSedeController,
  actualizarSedeController,
  toggleSedeController,
} from "../controllers/sedes.controller.js";

const router = Router();
router.use(cors({ origin: "*" }));

router.get("/", listarSedes);
router.post("/", crearSedeController);
router.put("/:id", actualizarSedeController);
router.put("/:id/toggle", toggleSedeController);

export default router;
