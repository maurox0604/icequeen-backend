import { getUserRoleDB } from "../models/users.model.js";

export async function getUserRoleController(req, res) {
  try {
    const email = req.user.email; // viene del token verificado

    const user = await getUserRoleDB(email);

    if (!user) {
      return res.status(404).json({ ok: false, error: "Usuario no encontrado" });
    }

    res.status(200).json({
      ok: true,
      role: user.rol,
      name: user.name,
      email: user.email
    });

  } catch (error) {
    console.error("Error en getUserRole:", error);
    res.status(500).json({ ok: false, error: "Error interno del servidor" });
  }
}

