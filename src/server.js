require("dotenv").config();
const app = require("./app");
const { initDb } = require("./db");

const PORT = Number(process.env.PORT || 5000);

async function start() {
  try {
    await initDb();
    app.listen(PORT, () => console.log(`API running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
