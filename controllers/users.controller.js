// server/controllers/users.controller.js
import {
  getUserRoleDB,
  registerUserDB,
  getAllUsersDB,
  updateUserRolDB,
  deactivateUserDB,
  reactivateUserDB,
} from "../models/users.model.js";
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

export async function registerUserController(req, res) {
  try {
    const { name, email, password, rol } = req.body;

    if (!name || !email || !password || !rol) {
      return res.status(400).json({ ok: false, error: "Faltan campos: name, email, password, rol" });
    }

    const rolesValidos = ["superadmin", "admin", "vendedor"];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ ok: false, error: `Rol inválido. Debe ser uno de: ${rolesValidos.join(", ")}` });
    }

    // 1. Crear en Firebase
    const firebaseUser = await admin.auth().createUser({ email, password });

    // 2. Insertar en MySQL
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
    if (error.code === "auth/email-already-exists") {
      return res.status(400).json({ ok: false, error: "El email ya está registrado" });
    }
    res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
}

// GET /users — lista todos
export async function getAllUsersController(req, res) {
  try {
    const users = await getAllUsersDB();
    res.status(200).json({ ok: true, users });
  } catch (error) {
    console.error("Error en getAllUsers:", error);
    res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
}

// PUT /users/:id/rol — cambia rol
export async function updateUserRolController(req, res) {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    const rolesValidos = ["superadmin", "admin", "vendedor"];
    if (!rolesValidos.includes(rol)) {
      return res.status(400).json({ ok: false, error: "Rol inválido" });
    }

    // Evitar que el superadmin se baje el rol a sí mismo
    if (req.user.email) {
      const self = await getUserRoleDB(req.user.email);
      if (self && String(self.id) === String(id) && rol !== "superadmin") {
        return res.status(403).json({ ok: false, error: "No puedes cambiar tu propio rol" });
      }
    }

    await updateUserRolDB(id, rol);
    res.status(200).json({ ok: true, message: "Rol actualizado" });
  } catch (error) {
    console.error("Error en updateUserRol:", error);
    res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
}

// DELETE /users/:id — desactiva (soft delete)
export async function deactivateUserController(req, res) {
  try {
    const { id } = req.params;

    // No permitir auto-desactivación
    if (req.user.email) {
      const self = await getUserRoleDB(req.user.email);
      if (self && String(self.id) === String(id)) {
        return res.status(403).json({ ok: false, error: "No puedes desactivarte a ti mismo" });
      }
    }

    await deactivateUserDB(id);
    res.status(200).json({ ok: true, message: "Usuario desactivado" });
  } catch (error) {
    console.error("Error en deactivateUser:", error);
    res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
}

// PUT /users/:id/reactivar
export async function reactivateUserController(req, res) {
  try {
    const { id } = req.params;
    await reactivateUserDB(id);
    res.status(200).json({ ok: true, message: "Usuario reactivado" });
  } catch (error) {
    console.error("Error en reactivateUser:", error);
    res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
}
