const express = require('express');
const router = express.Router();

const ALLOWED_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const ALLOWED_PAYMENT_STATUSES = ['pending', 'paid', 'failed'];

function generateOrderId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `IFX-${Date.now()}-${rand}`;
}

function normalizeItems(items) {
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try { return JSON.parse(items); } catch (e) { return []; }
  }
  return [];
}

// POST place order (public — from shop checkout)
router.post('/', async (req, res) => {
  const {
    customer_name, customer_email, customer_phone,
    customer_address, customer_city, customer_state, customer_postal_code,
    notes, items
  } = req.body;

  const name = (customer_name || '').trim();
  const email = (customer_email || '').trim();
  const phone = (customer_phone || '').trim();
  const address = (customer_address || '').trim();

  if (!name || !email || !phone || !address) {
    return res.status(400).json({ error: 'Name, email, phone and address are required' });
  }

  const itemList = normalizeItems(items);
  if (!itemList.length) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const totalAmount = itemList.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0
  );
  const totalQuantity = itemList.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
  const orderId = generateOrderId();

  try {
    const connection = await global.db.getConnection();
    try {
      await connection.query(
        `INSERT INTO orders
          (order_id, customer_name, customer_email, customer_phone,
           customer_address, customer_city, customer_state, customer_postal_code,
           notes, total_amount, quantity, items, status, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
        [
          orderId, name, email, phone,
          address, (customer_city || '').trim(), (customer_state || '').trim(),
          (customer_postal_code || '').trim(), (notes || '').trim(),
          totalAmount, totalQuantity, JSON.stringify(itemList)
        ]
      );
      res.status(201).json({ success: true, order_id: orderId, total_amount: totalAmount });
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all orders (admin)
router.get('/', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [rows] = await connection.query('SELECT * FROM orders ORDER BY created_at DESC');
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single order (admin)
router.get('/:id', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [rows] = await connection.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    connection.release();
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update fulfillment status (admin)
router.put('/:id/status', async (req, res) => {
  const status = (req.body.status || '').toLowerCase();
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
  }
  try {
    const connection = await global.db.getConnection();
    const [result] = await connection.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id]
    );
    connection.release();
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update payment status + razorpay fields (admin / Razorpay hook)
router.put('/:id/payment', async (req, res) => {
  const payment_status = (req.body.payment_status || '').toLowerCase();
  if (!ALLOWED_PAYMENT_STATUSES.includes(payment_status)) {
    return res.status(400).json({ error: `Payment status must be one of: ${ALLOWED_PAYMENT_STATUSES.join(', ')}` });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  try {
    const connection = await global.db.getConnection();
    const [result] = await connection.query(
      `UPDATE orders
       SET payment_status = ?,
           razorpay_order_id = COALESCE(?, razorpay_order_id),
           razorpay_payment_id = COALESCE(?, razorpay_payment_id),
           razorpay_signature = COALESCE(?, razorpay_signature)
       WHERE id = ?`,
      [payment_status, razorpay_order_id || null, razorpay_payment_id || null, razorpay_signature || null, req.params.id]
    );
    connection.release();
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, payment_status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE order (admin)
router.delete('/:id', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [result] = await connection.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    connection.release();
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
