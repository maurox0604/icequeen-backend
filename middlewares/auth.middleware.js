import admin from "firebase-admin";
import { getUserRoleDB } from "../models/users.model.js";

/**
 * Inicializa Firebase Admin usando variables de entorno.
 * Nunca usar service-account.json en frontend.
 */
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

/**
 * Middleware que:
 * 1. Verifica token Firebase
 * 2. Consulta usuario en DB
 * 3. Adjunta datos completos en req.user
 */
export async function verifyAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        message: "Token requerido",
      });
    }

    const token = header.split(" ")[1];

    // 1️⃣ Verificar token
    const decoded = await admin.auth().verifyIdToken(token);

    // 2️⃣ Buscar usuario en tu base de datos
    const userDB = await getUserRoleDB(decoded.email);

    if (!userDB) {
        return res.status(403).json({
            ok: false,
            message: "Usuario no registrado en sistema",
        });
        }

        // 3️⃣ Adjuntar usuario completo
        req.user = {
        uid: decoded.uid,
        email: decoded.email,
        role: userDB.rol,
        };

        next();
    } catch (error) {
        console.error("Error en verifyAuth:", error);
        return res.status(401).json({
        ok: false,
        message: "Token inválido",
        });
    }
}

/**
 * Middleware para restringir acceso por rol
 * @param  {...string} allowedRoles
 */
export function allowRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            ok: false,
            message: "No tienes permisos para esta acción",
        });
        }
        next();
    };
}
