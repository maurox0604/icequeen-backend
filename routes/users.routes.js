// server/routes/users.routes.js
import express from "express";
import {
  getUserRoleController,
  registerUserController,
  getAllUsersController,
  updateUserRolController,
  deactivateUserController,
  reactivateUserController,
} from "../controllers/users.controller.js";
import { verifyAuth, allowRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Ruta pública autenticada — cualquier usuario logueado
router.get("/me/role", verifyAuth, getUserRoleController);

// Rutas solo superadmin
router.post("/register",        verifyAuth, allowRoles("superadmin"), registerUserController);
router.get("/",                 verifyAuth, allowRoles("superadmin"), getAllUsersController);
router.put("/:id/rol",          verifyAuth, allowRoles("superadmin"), updateUserRolController);
router.delete("/:id",           verifyAuth, allowRoles("superadmin"), deactivateUserController);
router.put("/:id/reactivar",    verifyAuth, allowRoles("superadmin"), reactivateUserController);

export default router;
