const express = require('express');
const router = express.Router();
const { sendServerError } = require('../utils/respond');
const { verifyToken } = require('./auth');

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// GET all categories
router.get('/', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [rows] = await connection.query('SELECT * FROM categories ORDER BY name ASC');
    connection.release();
    res.json(rows);
  } catch (error) {
    sendServerError(res, error);
  }
});

// POST create category (admin only — validates non-empty + case-insensitive duplicate)
router.post('/', verifyToken, async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  try {
    const connection = await global.db.getConnection();
    try {
      const [existing] = await connection.query(
        'SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1',
        [name]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Category already exists' });
      }

      const [result] = await connection.query(
        'INSERT INTO categories (name, slug) VALUES (?, ?)',
        [name, slugify(name)]
      );
      res.status(201).json({ id: result.insertId, name, slug: slugify(name) });
    } finally {
      connection.release();
    }
  } catch (error) {
    // Handle race-condition duplicates from the UNIQUE constraint
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Category already exists' });
    }
    sendServerError(res, error);
  }
});

// DELETE category (admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [result] = await connection.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    connection.release();
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ deleted: true });
  } catch (error) {
    sendServerError(res, error);
  }
});

module.exports = router;
