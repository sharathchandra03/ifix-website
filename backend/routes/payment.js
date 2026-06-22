const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// ============================================================
// Lazy Razorpay initialization
// Only construct the client when both keys are present, so the
// route loads safely even before Razorpay is configured.
// ============================================================
let razorpayInstance = null;

function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function getRazorpay() {
  if (!isRazorpayConfigured()) return null;
  if (!razorpayInstance) {
    const Razorpay = require('razorpay');
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayInstance;
}

function generateOrderId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `IFX-${Date.now()}-${rand}`;
}

// ============================================================
// GET payment config — lets the shop feature-detect Razorpay
// ============================================================
router.get('/config', (req, res) => {
  res.json({
    enabled: isRazorpayConfigured(),
    key_id: isRazorpayConfigured() ? process.env.RAZORPAY_KEY_ID : null,
    currency: 'INR'
  });
});

// ============================================================
// POST create-order — creates a Razorpay order + stores the
// pending order with full customer details.
// ============================================================
router.post('/create-order', async (req, res) => {
  const {
    amount,
    customer_name, customer_email, customer_phone,
    customer_address, customer_city, customer_state, customer_postal_code,
    notes, items
  } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const razorpay = getRazorpay();
  if (!razorpay) {
    return res.status(503).json({
      error: 'Razorpay is not configured',
      message: 'Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the backend .env to enable online payments.'
    });
  }

  try {
    const itemList = Array.isArray(items) ? items : [];
    const totalQuantity = itemList.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
    const orderId = generateOrderId();

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: orderId,
      notes: { customer_name, customer_email, customer_phone }
    });

    const connection = await global.db.getConnection();
    try {
      await connection.query(
        `INSERT INTO orders
          (order_id, customer_name, customer_email, customer_phone,
           customer_address, customer_city, customer_state, customer_postal_code,
           notes, total_amount, quantity, razorpay_order_id, items, status, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
        [
          orderId,
          customer_name || '', customer_email || '', customer_phone || '',
          customer_address || '', customer_city || '', customer_state || '', customer_postal_code || '',
          notes || '', amount, totalQuantity, razorpayOrder.id, JSON.stringify(itemList)
        ]
      );
    } finally {
      connection.release();
    }

    res.json({
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        receipt: orderId
      }
    });
  } catch (error) {
    console.error('Razorpay error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ============================================================
// POST verify-payment — verifies the signature and marks paid.
// ============================================================
router.post('/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!isRazorpayConfigured()) {
    return res.status(503).json({ error: 'Razorpay is not configured' });
  }

  try {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const connection = await global.db.getConnection();
    try {
      await connection.query(
        `UPDATE orders
         SET payment_status = 'paid', status = 'processing',
             razorpay_payment_id = ?, razorpay_signature = ?
         WHERE razorpay_order_id = ?`,
        [razorpay_payment_id, razorpay_signature, razorpay_order_id]
      );
    } finally {
      connection.release();
    }

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET order-status by order_id
// ============================================================
router.get('/order-status/:orderId', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM orders WHERE order_id = ?',
      [req.params.orderId]
    );
    connection.release();
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
