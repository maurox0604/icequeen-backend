import admin from "firebase-admin";
import { getUserRoleDB } from "../models/users.model.js";

if (!admin.apps.length) {
  console.log(
    "🔑 PK primeros 50 chars:",
    process.env.FIREBASE_PRIVATE_KEY?.slice(0, 50),
  );
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

// ─────────────────────────────────────────────
// Caché de roles en memoria — evita golpear MySQL
// en cada request autenticado.
// TTL: 5 minutos por usuario.
// ─────────────────────────────────────────────
const roleCache = new Map(); // email → { role, expiresAt }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getRoleWithCache(email) {
  const cached = roleCache.get(email);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.role; // ✅ sin tocar MySQL
  }

  // Consultar BD y guardar en caché
  const userDB = await getUserRoleDB(email);
  if (!userDB) return null;

  roleCache.set(email, {
    role: userDB.rol,
    expiresAt: now + CACHE_TTL,
  });

  return userDB.rol;
}

// Limpiar entradas expiradas cada 10 minutos
// (evita que el Map crezca indefinidamente)
setInterval(
  () => {
    const now = Date.now();
    for (const [email, entry] of roleCache.entries()) {
      if (entry.expiresAt <= now) roleCache.delete(email);
    }
  },
  10 * 60 * 1000,
);

// ─────────────────────────────────────────────
// verifyAuth
// ─────────────────────────────────────────────
export async function verifyAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, message: "Token requerido" });
    }

    const token = header.split(" ")[1];

    // 1️⃣ Verificar token Firebase (no toca MySQL)
    const decoded = await admin.auth().verifyIdToken(token);

    // 2️⃣ Obtener rol — desde caché o BD
    const role = await getRoleWithCache(decoded.email);

    if (!role) {
      return res
        .status(403)
        .json({ ok: false, message: "Usuario no registrado en sistema" });
    }

    // 3️⃣ Adjuntar usuario completo
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role,
    };

    next();
  } catch (error) {
    console.error("Error en verifyAuth:", error.message);
    return res.status(401).json({ ok: false, message: "Token inválido" });
  }
}

// ─────────────────────────────────────────────
// allowRoles
// ─────────────────────────────────────────────
export function allowRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ ok: false, message: "No tienes permisos para esta acción" });
    }
    next();
  };
}

// ─────────────────────────────────────────────
// invalidarCacheRol — llamar cuando cambias el rol
// de un usuario desde el panel de administración
// ─────────────────────────────────────────────
export function invalidarCacheRol(email) {
  roleCache.delete(email);
}
