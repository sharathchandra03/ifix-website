const express = require('express');
const router = express.Router();

const ALLOWED_TYPES = ['text', 'email', 'tel', 'number', 'textarea', 'select'];

function slugifyKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// GET active form fields (public — used by shop checkout)
router.get('/', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM form_fields WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all fields incl. inactive (admin)
router.get('/all', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM form_fields ORDER BY sort_order ASC, id ASC'
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT replace the full form configuration (admin)
router.put('/', async (req, res) => {
  const fields = Array.isArray(req.body.fields) ? req.body.fields : null;
  if (!fields) {
    return res.status(400).json({ error: 'Expected { fields: [...] }' });
  }

  // Validate + normalize
  const normalized = [];
  const seenKeys = new Set();
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i] || {};
    const label = (f.label || '').trim();
    if (!label) {
      return res.status(400).json({ error: `Field #${i + 1} is missing a label` });
    }
    let key = (f.field_key || '').trim() || slugifyKey(label);
    key = slugifyKey(key);
    if (!key) {
      return res.status(400).json({ error: `Field "${label}" has an invalid key` });
    }
    // Ensure unique keys
    let uniqueKey = key;
    let n = 2;
    while (seenKeys.has(uniqueKey)) { uniqueKey = `${key}_${n++}`; }
    seenKeys.add(uniqueKey);

    const type = ALLOWED_TYPES.includes(f.field_type) ? f.field_type : 'text';
    normalized.push({
      field_key: uniqueKey,
      label,
      field_type: type,
      placeholder: (f.placeholder || '').trim(),
      is_required: f.is_required ? 1 : 0,
      sort_order: i + 1,
      is_active: f.is_active === undefined ? 1 : (f.is_active ? 1 : 0),
      is_system: f.is_system ? 1 : 0
    });
  }

  const connection = await global.db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM form_fields');
    for (const f of normalized) {
      await connection.query(
        `INSERT INTO form_fields
          (field_key, label, field_type, placeholder, is_required, sort_order, is_active, is_system)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [f.field_key, f.label, f.field_type, f.placeholder, f.is_required, f.sort_order, f.is_active, f.is_system]
      );
    }
    await connection.commit();
    res.json({ success: true, count: normalized.length });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
