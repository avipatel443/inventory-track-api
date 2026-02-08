const express = require("express");
const { getPool } = require("../db");
const { authRequired } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

/**
 * Creates a movement and updates product.on_hand in a transaction.
 * - IN: on_hand += quantity
 * - OUT: on_hand -= quantity (reject if would go negative)
 * - ADJUST: on_hand = quantity  (treat quantity as the NEW on_hand)
 */

// GET /api/movements
router.get("/", authRequired, async (req, res) => {
  try {
    const pool = getPool();
    const { product_id, type } = req.query;

    let sql = `
      SELECT sm.*, p.sku, p.name AS product_name, u.name AS user_name
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      JOIN users u ON u.id = sm.user_id
      WHERE 1=1
    `;
    const params = [];

    if (product_id) {
      sql += " AND sm.product_id = ?";
      params.push(product_id);
    }
    if (type) {
      sql += " AND sm.type = ?";
      params.push(type);
    }

    sql += " ORDER BY sm.created_at DESC LIMIT 500";
    const [rows] = await pool.query(sql, params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST /api/movements
router.post("/", authRequired, async (req, res) => {
  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const { product_id, type, quantity, note } = req.body;

    if (!product_id || !type || quantity === undefined) {
      return res.status(400).json({ message: "product_id, type, quantity are required" });
    }

    const t = String(type).toUpperCase();
    if (!["IN", "OUT", "ADJUST"].includes(t)) {
      return res.status(400).json({ message: "type must be IN, OUT, or ADJUST" });
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty < 0) {
      return res.status(400).json({ message: "quantity must be a non-negative integer" });
    }

    await conn.beginTransaction();

    const [prodRows] = await conn.query("SELECT id, on_hand FROM products WHERE id = ? FOR UPDATE", [product_id]);
    if (!prodRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    const current = Number(prodRows[0].on_hand);
    let newOnHand = current;

    if (t === "IN") newOnHand = current + qty;
    if (t === "OUT") {
      newOnHand = current - qty;
      if (newOnHand < 0) {
        await conn.rollback();
        return res.status(400).json({ message: "Insufficient stock (cannot go negative)" });
      }
    }
    if (t === "ADJUST") newOnHand = qty; // treat qty as the new stock level

    const [ins] = await conn.query(
      "INSERT INTO stock_movements (product_id, user_id, type, quantity, note) VALUES (?, ?, ?, ?, ?)",
      [product_id, req.user.id, t, qty, note ?? null]
    );

    await conn.query("UPDATE products SET on_hand = ? WHERE id = ?", [newOnHand, product_id]);

    await conn.commit();

    const [rows] = await pool.query("SELECT * FROM stock_movements WHERE id = ?", [ins.insertId]);
    return res.status(201).json({ movement: rows[0], new_on_hand: newOnHand });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    return res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    conn.release();
  }
});

// PUT /api/movements/:id (admin-only, optional use)
router.put("/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const pool = getPool();
    const { note } = req.body;
    const [result] = await pool.query("UPDATE stock_movements SET note = ? WHERE id = ?", [note ?? null, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Movement not found" });
    const [rows] = await pool.query("SELECT * FROM stock_movements WHERE id = ?", [req.params.id]);
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE /api/movements/:id (admin-only)
router.delete("/:id", authRequired, requireRole("admin"), async (req, res) => {
  try {
    const pool = getPool();
    const [result] = await pool.query("DELETE FROM stock_movements WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Movement not found" });
    return res.json({ message: "Movement deleted (note: product stock not recalculated)" });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
