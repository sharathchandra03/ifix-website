const express = require('express');
const router = express.Router();

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
    res.status(500).json({ error: error.message });
  }
});

// POST create category (validates non-empty + case-insensitive duplicate)
router.post('/', async (req, res) => {
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
    res.status(500).json({ error: error.message });
  }
});

// DELETE category
router.delete('/:id', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [result] = await connection.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    connection.release();
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
