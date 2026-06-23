const express = require('express');
const router = express.Router();
const { sendServerError } = require('../utils/respond');
const { verifyToken } = require('./auth');

// Validate + normalize product input. Returns { value } or { error }.
function validateProduct(body) {
  const name = (body.name || '').trim();
  if (!name) return { error: 'Product name is required' };

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) return { error: 'Price must be a non-negative number' };

  let stock = body.stock === undefined || body.stock === null || body.stock === ''
    ? 0 : Number(body.stock);
  if (!Number.isInteger(stock) || stock < 0) return { error: 'Stock must be a non-negative integer' };

  return {
    value: {
      name,
      description: (body.description || '').toString(),
      price,
      image_url: (body.image_url || '').toString(),
      category: (body.category || '').toString(),
      stock,
    }
  };
}

// GET all products
router.get('/', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [rows] = await connection.query('SELECT * FROM products');
    connection.release();
    res.json(rows);
  } catch (error) {
    sendServerError(res, error);
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
    sendServerError(res, error);
  }
});

// POST create product (admin only)
router.post('/', verifyToken, async (req, res) => {
  const { value, error } = validateProduct(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const connection = await global.db.getConnection();
    const [result] = await connection.query(
      'INSERT INTO products (name, description, price, image_url, category, stock) VALUES (?, ?, ?, ?, ?, ?)',
      [value.name, value.description, value.price, value.image_url, value.category, value.stock]
    );
    connection.release();
    res.status(201).json({ id: result.insertId, ...value });
  } catch (error) {
    console.error('Create product error:', error.message);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT update product (admin only)
router.put('/:id', verifyToken, async (req, res) => {
  const { value, error } = validateProduct(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const connection = await global.db.getConnection();
    const [result] = await connection.query(
      'UPDATE products SET name=?, description=?, price=?, image_url=?, category=?, stock=? WHERE id=?',
      [value.name, value.description, value.price, value.image_url, value.category, value.stock, req.params.id]
    );
    connection.release();
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ id: Number(req.params.id), ...value });
  } catch (error) {
    console.error('Update product error:', error.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product (admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [result] = await connection.query('DELETE FROM products WHERE id=?', [req.params.id]);
    connection.release();
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ deleted: true });
  } catch (error) {
    console.error('Delete product error:', error.message);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
