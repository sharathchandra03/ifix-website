const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// POST create order
router.post('/create-order', async (req, res) => {
  const { amount, customer_name, customer_email, customer_phone, items } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      notes: {
        customer_name,
        customer_email,
        customer_phone
      }
    });

    // Save to database
    const connection = await global.db.getConnection();
    const [result] = await connection.query(
      `INSERT INTO orders 
       (order_id, customer_name, customer_email, customer_phone, total_amount, razorpay_order_id, items, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        `order_${Date.now()}`,
        customer_name || '',
        customer_email || '',
        customer_phone || '',
        amount,
        razorpayOrder.id,
        JSON.stringify(items || [])
      ]
    );
    connection.release();

    res.json({
      success: true,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Razorpay error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// POST verify payment
router.post('/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Update order status
    const connection = await global.db.getConnection();
    await connection.query(
      `UPDATE orders 
       SET status = 'completed', razorpay_payment_id = ? 
       WHERE razorpay_order_id = ?`,
      [razorpay_payment_id, razorpay_order_id]
    );
    connection.release();

    res.json({
      success: true,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET order status
router.get('/order-status/:orderId', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM orders WHERE order_id = ?',
      [req.params.orderId]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
