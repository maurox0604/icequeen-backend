import { getUserRoleDB, registerUserDB } from "../models/users.model.js";
import admin from "firebase-admin";

export async function getUserRoleController(req, res) {
    try {
        const email = req.user.email;
        const user = await getUserRoleDB(email);
        if (!user) return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
        res.status(200).json({ ok: true, rol: user.rol, name: user.name, email: user.email });
    } catch (error) {
        console.error("Error en getUserRole:", error);
        res.status(500).json({ ok: false, error: "Error interno del servidor" });
    }
}

// ✅ NUEVO: crea usuario en Firebase Admin + inserta en tabla users
export async function registerUserController(req, res) {
    try {
        const { name, email, password, rol } = req.body;

        if (!name || !email || !password || !rol) {
            return res.status(400).json({ ok: false, error: "Faltan campos requeridos: name, email, password, rol" });
        }

        if (!["superadmin", "vendedor"].includes(rol)) {
            return res.status(400).json({ ok: false, error: "Rol inválido. Debe ser superadmin o vendedor" });
        }

        // 1️⃣ Crear usuario en Firebase Admin
        const firebaseUser = await admin.auth().createUser({ email, password });

        // 2️⃣ Insertar en tabla users de MySQL
        await registerUserDB({ name, email, rol });

        res.status(201).json({
            ok: true,
            message: "Usuario creado correctamente",
            uid: firebaseUser.uid,
            email,
            rol,
        });

    } catch (error) {
        console.error("Error en registerUserController:", error);

        // Si Firebase ya creó el usuario pero falló MySQL, lo eliminamos de Firebase
        if (error.code === "auth/email-already-exists") {
            return res.status(400).json({ ok: false, error: "El email ya está registrado en Firebase" });
        }

        res.status(500).json({ ok: false, error: "Error interno del servidor" });
    }
}
