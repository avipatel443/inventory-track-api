const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false } // Aiven MySQL
});

// Add this function
async function initDb() {
  try {
    const connection = await pool.getConnection();
    console.log("MySQL Database connected");
    connection.release();
  } catch (err) {
    console.error("Database connection failed:", err.message);
    throw err;
  }
}

//  Export both
module.exports = { pool, initDb };