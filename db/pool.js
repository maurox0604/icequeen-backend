import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

// export const pool = mysql
//     .createPool({
//         host: process.env.MYSQL_HOST,
//         user: process.env.MYSQL_USER,
//         password: process.env.MYSQL_PASSWORD,
//         database: process.env.MYSQL_DATABASE,
//         timezone: '-05:00', // Configura el offset para Colombia

//         waitForConnections: true,
//         connectionLimit: 3,        // 👈 CLAVE (menor a 5)
//         queueLimit: 0
//     })

export const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    timezone: 'Z',          // UTC REAL
    waitForConnections: true,
    connectionLimit: 1,     // 🔴 CLAVE PARA CLEVER
    queueLimit: 0
});
