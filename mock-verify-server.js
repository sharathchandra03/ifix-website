// THROWAWAY verification server — mirrors the real API contract with in-memory
// data so the frontend wiring can be tested without the remote MySQL DB.
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());

let categories = [
  { id: 1, name: 'parts' }, { id: 2, name: 'screens' }, { id: 3, name: 'batteries' }
];
let orders = [];
let formFields = [
  { id: 1, field_key: 'full_name', label: 'Full Name', field_type: 'text', placeholder: 'Enter your full name', is_required: 1, is_active: 1, sort_order: 1 },
  { id: 2, field_key: 'email', label: 'Email', field_type: 'email', placeholder: 'you@example.com', is_required: 1, is_active: 1, sort_order: 2 },
  { id: 3, field_key: 'phone', label: 'Phone Number', field_type: 'tel', placeholder: '10-digit mobile', is_required: 1, is_active: 1, sort_order: 3 },
  { id: 4, field_key: 'address', label: 'Address', field_type: 'textarea', placeholder: 'Street, area', is_required: 1, is_active: 1, sort_order: 4 },
  { id: 5, field_key: 'city', label: 'City', field_type: 'text', placeholder: 'City', is_required: 1, is_active: 1, sort_order: 5 },
  { id: 6, field_key: 'notes', label: 'Order Notes', field_type: 'textarea', placeholder: 'Optional', is_required: 0, is_active: 1, sort_order: 6 }
];
let catId = 4, orderSeq = 1;

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/auth/verify', (req, res) => res.json({ valid: true, user: { username: 'mock' } }));
app.post('/api/auth/login', (req, res) => res.json({ success: true, token: 'mock-token', user: { username: 'mock' } }));
app.get('/api/blog/admin/all', (req, res) => res.json([]));
app.get('/api/products', (req, res) => res.json([]));
app.get('/api/youtube/videos', (req, res) => res.json([]));

app.get('/api/categories', (req, res) => res.json(categories));
app.post('/api/categories', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  if (categories.some(c => c.name.toLowerCase() === name.toLowerCase()))
    return res.status(409).json({ error: 'Category already exists' });
  const c = { id: catId++, name };
  categories.push(c);
  res.status(201).json(c);
});
app.delete('/api/categories/:id', (req, res) => {
  categories = categories.filter(c => c.id != req.params.id);
  res.json({ deleted: true });
});

app.get('/api/form-config', (req, res) => res.json(formFields.filter(f => f.is_active)));
app.get('/api/form-config/all', (req, res) => res.json(formFields));
app.put('/api/form-config', (req, res) => {
  formFields = (req.body.fields || []).map((f, i) => ({ ...f, id: i + 1, sort_order: i + 1 }));
  res.json({ success: true, count: formFields.length });
});

app.get('/api/payment/config', (req, res) => res.json({ enabled: false, key_id: null }));

app.post('/api/orders', (req, res) => {
  const b = req.body;
  if (!b.customer_name || !b.customer_email || !b.customer_phone || !b.customer_address)
    return res.status(400).json({ error: 'Required fields missing' });
  const items = Array.isArray(b.items) ? b.items : [];
  const order = {
    id: orderSeq, order_id: `IFX-MOCK-${orderSeq}`,
    customer_name: b.customer_name, customer_email: b.customer_email, customer_phone: b.customer_phone,
    customer_address: b.customer_address, customer_city: b.customer_city || '', customer_state: b.customer_state || '',
    customer_postal_code: b.customer_postal_code || '', notes: b.notes || '',
    total_amount: items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0),
    quantity: items.reduce((s, i) => s + (i.quantity || 1), 0),
    items: JSON.stringify(items), status: 'pending', payment_status: 'pending',
    created_at: new Date().toISOString()
  };
  orders.unshift(order);
  orderSeq++;
  res.status(201).json({ success: true, order_id: order.order_id, total_amount: order.total_amount });
});
app.get('/api/orders', (req, res) => res.json(orders));
app.put('/api/orders/:id/status', (req, res) => {
  const o = orders.find(x => x.id == req.params.id);
  if (!o) return res.status(404).json({ error: 'not found' });
  o.status = req.body.status;
  res.json({ success: true, status: o.status });
});
app.delete('/api/orders/:id', (req, res) => {
  orders = orders.filter(x => x.id != req.params.id);
  res.json({ deleted: true });
});

app.use(express.static(path.join(__dirname)));
app.listen(5000, () => console.log('Mock verify server on http://localhost:5000'));
