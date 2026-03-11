import {
    crearProducto,
    getProductosAdmin,
    actualizarProducto,
    activarProducto,
    desactivarProducto,
    getProductoByID,
    getProductosOrdenadosPorPopularidad,
    getProductosPorCategoria
} from "../models/productos.model.js";


export async function crearProductoController(req, res) {
    try {
        const { nombre, precio, icon, cantidad, id_categoria } = req.body;
        console.log("controller: ",nombre, precio, icon, cantidad, id_categoria)

        if (!nombre || !precio || !cantidad || !id_categoria) {
        return res.status(400).json({ ok: false, error: "Datos incompletos" });
        }

        await crearProducto(nombre, precio, icon, cantidad, id_categoria);
        res.status(201).json({ ok: true, message: "Producto creado correctamente" });
    } catch (error) {
        console.error("Error en crearProductoController:", error);
        res.status(500).json({ ok: false, error: "Error interno" });
    }
}
    


// export async function listarProductosController(req, res) {
//     try {
//         const productos = await getProductos();
//         res.json({ ok: true, productos });
//     } catch (error) {
//         console.error("Error listando productos:", error);
//         res.status(500).json({ ok: false, error: "Error al obtener productos" });
//     }
// }



export const listarProductosController = async (req, res) => {
    try {
        const productos = await getProductosOrdenadosPorPopularidad();
        res.status(200).json({ ok: true, productos });
    } catch (error) {
        console.error("Error obteniendo productos:", error);
        res.status(500).json({ ok: false, error: "Error en el servidor" });
    }
    
};


export async function actualizarProductoController(req, res) {
    
    try {
        const { id } = req.params;
        const { nombre, precio, icon, cantidad, id_categoria } = req.body;
        console.log("id categoria en controller: ", id_categoria)

        await actualizarProducto(id, nombre, precio, icon, cantidad, id_categoria);
        res.json({ ok: true });
    } catch (error) {
        console.error("Error actualizando producto:", error);
        res.status(500).json({ ok: false, error: "Error al actualizar producto" });
    }
}

// Controlador para desactivar producto
export async function desactivarProductoController(req, res) {
    try {
        const { id } = req.params;
        await desactivarProducto(id);
        res.json({ ok: true });
    } catch (error) {
        console.error("Error eliminando producto:", error);
        res.status(500).json({ ok: false, error: "Error al eliminar producto" });
    }
}

// Controlador para activar producto
export async function activarProductoController(req, res) {
    try {
        const { id } = req.params;
        await activarProducto(id);
        res.json({ ok: true });
    } catch (error) {
        console.error("Error activando producto:", error);
        res.status(500).json({ ok: false, error: "Error activando producto" });
    }
}


export async function getProductoByIdController(req, res) {
    try {
        const { id } = req.params;
        const producto = await getProductoByID(id);

        if (!producto) return res.status(404).json({ ok: false, error: "Producto no encontrado" });

        res.json({ ok: true, producto });
    } catch (error) {
        console.error("Error obteniendo producto:", error);
        res.status(500).json({ ok: false, error: "Error al obtener producto" });
    }
}

export async function getProductosPorCategoriaController(req, res) {
    try {
        const { id } = req.params;
        const productos = await getProductosPorCategoria(id);
        res.json({ ok: true, productos });
    } catch (error) {
        console.error("🔥 ERROR productos/all:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
}

// Controlador para obtener todos los productos (activos e inactivos)
export const listarProductosAdminController = async (req, res) => {
    try {
        const productos = await getProductosAdmin();
        res.status(200).json({ ok: true, productos });
    } catch (error) {
        console.error("Error obteniendo productos admin:", error);
        res.status(500).json({ ok: false, error: "Error en el servidor" });
    }
};

