// // import express from "express";
// // import cors from "cors";
// import { getUserRoleController } from "../controllers/users.controller.js";
// import { verifyFirebaseToken } from "../middlewares/verifyFirebaseToken.js";

// router.get(
//     "/me/role",
//     verifyFirebaseToken,
//     getUserRoleController
// );

// // const router = express.Router();
// // // Agregar CORS directamente
// // router.use(cors({ origin: "*" }));

// // // Ruta usada por el frontend actual
// // router.post("/getUserRole", getUserRoleController);

// // export default router;


// import { verifyAuth, allowRoles } from "../middlewares/auth.middleware.js";

// router.get(
//   "/",
//   verifyAuth,
//   allowRoles("superadmin"),
//   getReportes
// );



import express from "express";
import { getUserRoleController, registerUserController } from "../controllers/users.controller.js";
import { verifyAuth, allowRoles  } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/me/role", verifyAuth, getUserRoleController);

// ✅ NUEVA: solo superadmin puede crear usuarios
router.post("/register", verifyAuth, allowRoles("superadmin"), registerUserController);

export default router;

