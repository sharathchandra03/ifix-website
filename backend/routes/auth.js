const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const connection = await global.db.getConnection();
    const [rows] = await connection.query(
      'SELECT id, username, password_hash, role FROM admin_users WHERE username = ? AND is_active = TRUE',
      [username]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'ifix_secret_key',
      { expiresIn: '24h' }
    );

    // Update last login
    const updateConnection = await global.db.getConnection();
    await updateConnection.query('UPDATE admin_users SET last_login = NOW() WHERE id = ?', [user.id]);
    updateConnection.release();

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST register (first admin setup only)
router.post('/register-admin', async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const connection = await global.db.getConnection();
    
    // Check if any admin exists
    const [existing] = await connection.query('SELECT COUNT(*) as count FROM admin_users');
    
    if (existing[0].count > 0) {
      connection.release();
      return res.status(403).json({ error: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await connection.query(
      'INSERT INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, email || '', 'admin']
    );
    connection.release();

    const token = jwt.sign(
      { userId: result.insertId, username, role: 'admin' },
      process.env.JWT_SECRET || 'ifix_secret_key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      userId: result.insertId,
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ifix_secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// GET verify token
router.get('/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

module.exports = router;
module.exports.verifyToken = verifyToken;
