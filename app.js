import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import productosRoutes from "./routes/productos.routes.js";
import categoriasRoutes from "./routes/categorias.routes.js";
import ventasRoutes from "./routes/ventas.routes.js";

import reportesRoutes from "./routes/reportes.routes.js";
import sedesRoutes from "./routes/sedes.routes.js";
import publicRoutes from "./routes/public.routes.js";
import usersRoutes from "./routes/users.routes.js";

const app = express();

// 👇 MUY IMPORTANTE
app.options("*", cors({ origin: "*" }));

app.use(cors({ origin: "*" }));
app.use(bodyParser.json());
app.use(express.json());

// app.use("/users", usersRoutes);

app.use("/productos", productosRoutes);
app.use("/categorias", categoriasRoutes);
app.use("/ventas", ventasRoutes);
app.use("/reportes", reportesRoutes);
app.use("/sedes", sedesRoutes);
app.use("/api/public", publicRoutes);

app.use("/users", usersRoutes);

app.get("/", (req, res) => {
    res.send("🔥 API Ice Queen funcionando");
});

export default app; // 🔴 CLAVE



