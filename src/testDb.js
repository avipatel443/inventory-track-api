require("dotenv").config();
const pool = require("./db");

(async () => {
  try {
    const [rows] = await pool.execute("SELECT 1 AS ok");
    console.log(" Database connected successfully:", rows[0]);
    process.exit(0);
  } catch (err) {
    console.error(" Database connection failed:", err.message);
    process.exit(1);
  }
})();