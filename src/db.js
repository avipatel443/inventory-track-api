const mysql = require("mysql2/promise");

let pool;

async function initDb() {
  if (pool) return pool;

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Aiven often requires SSL. If your connection fails, uncomment below:
    // ssl: { rejectUnauthorized: true }
  });

  // quick test
  await pool.query("SELECT 1");
  return pool;
}

function getPool() {
  if (!pool) throw new Error("DB not initialized. Call initDb() first.");
  return pool;
}

module.exports = { initDb, getPool };
