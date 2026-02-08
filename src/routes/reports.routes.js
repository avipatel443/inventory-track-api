const express = require("express");
const { getPool } = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

// GET /api/reports/low-stock
router.get("/low-stock", authRequired, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, sku, name, on_hand, reorder_level
       FROM products
       WHERE is_active = 1 AND on_hand <= reorder_level
       ORDER BY (reorder_level - on_hand) DESC, name ASC`
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
