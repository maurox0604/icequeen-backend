import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    timezone: '-05:00' // Configura el offset para Colombia
  })
  // .promise();



  
  

// export async function getHeladosByID(id) {
//   const [rows] = await pool.query(
//     `
//     SELECT helados.*, shared_helados.shared_with_id
//     FROM helados
//     LEFT JOIN shared_helados ON helados.id = shared_helados.todo_id
//     WHERE helados.user_id = ? OR shared_helados.shared_with_id = ?
//   `,
//     [id, id]
//   );
//   console.log(rows)
//   return rows;
// }

export async function getUserRoll(email) {
  const [rows] = await pool.query(`SELECT rol FROM users WHERE email = ?`, [email]);
console.log("------------- role: ",rows[0].rol)
  return rows[0] || null;
}
// getUserRoll("xpresar@gmail.com");



export async function getHeladosAll() {
  const [rows] = await pool.query(
    `
    SELECT * FROM helados WHERE activo = 1
  `
  // `SELECT * FROM helados WHERE id = ?`, [id]
  );
  console.log("-------------------//---------------")
  console.log(rows)
  return rows;
}


export async function getHeladosByID(id) {
  const [rows] = await pool.query(
    `
    SELECT helados.*
    FROM helados
    WHERE helados.id = ? 
  `,
    [id, id]
  );
  console.log(rows)
  return rows;
}
getHeladosByID(1)

// export async function getTodo(id) {
//   const [rows] = await pool.query(`SELECT * FROM helados WHERE id = ?`, [id]);
//   return rows[0];
// }

export async function getSharedTodoByID(id) {
  const [rows] = await pool.query(
    `SELECT * FROM shared_helados WHERE todo_id = ?`,
    [id]
  );
  return rows[0];
}


export async function getUserByID(id) {
  const [rows] = await pool.query(`SELECT * FROM users WHERE id = ?`, [id]);
  return rows[0];
}

export async function getUserByEmail(email) {
  const [rows] = await pool.query(`SELECT * FROM users WHERE email = ?`, [
    email,
  ]);
  // console.log(rows[0]);
  return rows[0];
}

//OJO no OLVIDAR los marcadore de posicion ?, por cada dato haber un marcador de posicion en VALUES
// export async function createTodo(sabor, precio, icon, cantidad) {
//   console.log("lo que llego fue:",sabor," - ",precio," - ",cantidad," - ",icon)
//   const [result] = await pool.query(
//     `
//     INSERT INTO helados (sabor, precio, icon, cantidad)
//     VALUES (?, ?, ?, ?)
//   `,
//     [sabor, precio, icon, cantidad ]
//   );
//   const todoID = result.insertId;
//   return getTodo(todoID);
// }


export async function getHeladoPorSabor(sabor) {
  const [rows] = await pool.query(
    `SELECT * FROM helados WHERE sabor = ?`,
    [sabor]
  );
  return rows[0]; // Devuelve el primer resultado si existe, de lo contrario undefined
}

// export async function createHelado(sabor, precio, icon, cantidad) {
//   console.log("lo que llego fue:", sabor, " - ", precio, " - ", cantidad, " - ", icon);
//   // await pool.query("SET time_zone = '+00:00';");
//   const [result] = await pool.query(
//     `
//     INSERT INTO helados (sabor, precio, icon, cantidad)
//     VALUES (?, ?, ?, ?)
//   `,
//     [sabor, precio, icon, cantidad]
//   );
//   const heladoID = result.insertId;
//   return getHeladoPorSaborByID(heladoID);
// }

export async function createHelado(sabor, precio, icon, cantidad, id_categoria) {
  const [result] = await pool.query(
    "INSERT INTO helados (sabor, precio, icon, cantidad, id_categoria) VALUES (?, ?, ?, ?, ?)",
    [sabor, precio, icon, cantidad, id_categoria]
  );
  return result;
}


export async function getHeladoPorSaborByID(id) {
  const [rows] = await pool.query(
    `SELECT * FROM helados WHERE id = ? AND activo = 1`,
    [id]
  );
  return rows[0];
}



export async function deleteTodo(id) {
  const [result] = await pool.query(
    `
    DELETE FROM helados WHERE id = ?;
    `,
    [id]
  );
  return result;
}

export async function disableHelado(id) { 
  const [result] = await pool.query(
  `
    UPDATE helados SET activo = 0 WHERE id = ?;
  `, [id]);
  console.log("se boorro el helado: ", id)
  return result;
}


export async function updateItem(id, sabor, precio, icon, cantidad) {
  console.log("Actualizando helado con ID:", id, "Sabor: ",sabor);
  const [result] = await pool.query(
    `
    UPDATE helados
    SET sabor = ?, precio = ?, icon = ?, cantidad = ?
    WHERE id = ?
    `,
    [sabor, precio, icon, cantidad, id]
  );
  return result;
}

export async function actualizarInventario(items) {
  console.log("Items db sql: ", items[0])

  let query = 'UPDATE helados SET cantidad = CASE id ';
  const ids = [];
  
    items.forEach(item => {
      console.log("item query:",item)
      // console.log("item query:",item)
        query += `WHEN ${item.id} THEN ${item.cantQueda} `;
        ids.push(item.id);
    });
    query += `END WHERE id IN (${ids.join(',')})`;

    console.log("Query: :: : ",query)
    const [result] = await pool.query(query)
    return result;
}


//********************************** CATEGORIAS    ********************************* */

// 🔹 Función — crear categoría evitando duplicación
export async function crearCategoriaDB(nombre) {
  // Normalizamos (HELADOS / helados / HeLadOs → Helados)
  const nombreNormalizado = nombre.trim().toUpperCase();

  // Verificar si ya existe
  const [existe] = await pool.query(
    "SELECT id FROM categorias WHERE UPPER(nombre) = ? AND activo = 1",
    [nombreNormalizado]
  );

  if (existe.length > 0) {
    return { ok: false, error: "La categoría ya existe" };
  }

  // Insertar
  await pool.query(
    "INSERT INTO categorias (nombre, activo) VALUES (?, 1)",
    [nombreNormalizado]
  );

  return { ok: true };
}


//********************************** VENTAS    ********************************* */


export async function getVentasAll(startDate, endDate) {
    console.log("Database Dentro de getVentasAll()... startDate: ", startDate, "endDate: ", endDate);

    try {
        // Si no se proporcionan fechas, calcular la última semana
        if (!startDate || !endDate) {
            const today = new Date();
            const lastWeek = new Date(today);
            lastWeek.setDate(today.getDate() - 7); // Restar 7 días

          startDate = lastWeek.toISOString().split('T')[0]; // Formato YYYY-MM-DD
          endDate = today.toISOString().split('T')[0];      // Formato YYYY-MM-DD
          console.log("rango fechas Fecha inicial: ", startDate, "fecha final: ", endDate)
        }
        await pool.query("SET time_zone = '-05:00';");// Configura el offset para Colombia durante la sección de consulta
        // Consulta con rango de fechas
        const [rows] = await pool.query(
          `SELECT 
              ventas.*, 
              helados.sabor
              FROM ventas
              INNER JOIN helados ON ventas.id_helado = helados.id
              WHERE ventas.fecha >= ? AND ventas.fecha < DATE_ADD(?, INTERVAL 1 DAY)
              ORDER BY ventas.fecha DESC;`, // Agregamos ORDER BY ventas.fecha DESC
            [startDate, endDate]
        );

        console.log("Server Ventas obtenidas:", rows);
        return rows;
    } catch (error) {
        console.error("Error obteniendo las ventas:", error);
        throw error;
    }
}

// CONVERT_TZ(ventas.fecha, '+00:00', 'America/Bogota') AS fecha_local


// export async function guardarVentas(items, id_user) {
//   console.log("-------------------------------------- /// ---------------")
//   console.log("Items: ", items);

//   if (!items || !items.length) {
//     throw new Error("No items en compra");
//   }

//   let query = 'INSERT INTO ventas (id_helado, cantidad, precio_helado, venta_helado, email) VALUES ?';
//   const values = items.map(item => [item.id, item.cantCompra, item.precio, item.totVentaXhelado, item.user]);
//   console.log("[    values   ]: ",values)

//   try {
//     const [result] = await pool.query(query, [values]);
//     return result;
//   } catch (error) {
//     console.error('Error ejecutando la consulta SQL:', error);
//     throw error;
//   }
// }

export async function guardarVentas(items, id_user) {
  console.log("-------------------------------------- /// ---------------");
  console.log("Items: ", items);

  if (!items || !items.length) {
    throw new Error("No items en compra");
  }

  // Generar un ID único para la factura (puedes usar un UUID u otra estrategia)
  const idFactura = await generarIdFactura(); // Esto asegura que cada venta tenga un único ID de factura.

  let query = 'INSERT INTO ventas (id_factura, id_helado, cantidad, precio_helado, venta_helado, email) VALUES ?';
  const values = items.map(item => [
    idFactura, // Se añade el ID de la factura a cada fila
    item.id,
    item.cantCompra,
    item.precio,
    item.totVentaXhelado,
    item.user
  ]);

  console.log("[    values   ]: ", values);

  try {
    const [result] = await pool.query(query, [values]);
    return result;
  } catch (error) {
    console.error("Error ejecutando la consulta SQL:", error);
    throw error;
  }
}

// Función para generar un ID único para la factura
async function generarIdFactura() {
  try {
    // Usamos una consulta que inserta una fila con valores por defecto (solo para MariaDB).
    const query = 'INSERT INTO facturas () VALUES ()'; // Crear una nueva factura
    const [result] = await pool.query(query);
    return result.insertId; // Devuelve el ID generado para la factura
  } catch (error) {
    console.error("Error generando ID de factura:", error);
    throw error;
  }
}


