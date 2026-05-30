const express = require('express');
const router = express.Router();

// GET all products
router.get('/', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [rows] = await connection.query('SELECT * FROM products');
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [rows] = await connection.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    connection.release();
    res.json(rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create product (admin only)
router.post('/', async (req, res) => {
  const { name, description, price, image_url, category, stock } = req.body;
  try {
    const connection = await global.db.getConnection();
    const [result] = await connection.query(
      'INSERT INTO products (name, description, price, image_url, category, stock) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, price, image_url, category, stock]
    );
    connection.release();
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update product (admin only)
router.put('/:id', async (req, res) => {
  const { name, description, price, image_url, category, stock } = req.body;
  try {
    const connection = await global.db.getConnection();
    const [result] = await connection.query(
      'UPDATE products SET name=?, description=?, price=?, image_url=?, category=?, stock=? WHERE id=?',
      [name, description, price, image_url, category, stock, req.params.id]
    );
    connection.release();
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ id: Number(req.params.id), ...req.body });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE product (admin only)
router.delete('/:id', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [result] = await connection.query('DELETE FROM products WHERE id=?', [req.params.id]);
    connection.release();
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
