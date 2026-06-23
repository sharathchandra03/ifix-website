const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ============================================================
// Resolve the JWT secret ONCE. In production a missing secret is
// fatal (server.js already exits). Outside production we fall back
// to an ephemeral random secret — tokens won't survive a restart,
// which is fine for local dev and far safer than a shared constant.
// ============================================================
const JWT_SECRET =
  process.env.JWT_SECRET ||
  require('crypto').randomBytes(32).toString('hex');

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET not set — using an ephemeral dev secret. Set JWT_SECRET for stable sessions.');
}

const TOKEN_TTL = process.env.JWT_EXPIRES_IN || '24h';

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
      JWT_SECRET,
      { expiresIn: TOKEN_TTL }
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
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST register (first admin setup only)
router.post('/register-admin', async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  const email = (req.body.email || '').trim();

  if (!username || username.length < 3) {
    return res.status(400).json({ error: 'Username is required (min 3 characters)' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password is required (min 8 characters)' });
  }

  try {
    const connection = await global.db.getConnection();
    try {
      // Check if any admin exists — registration is first-setup only.
      const [existing] = await connection.query('SELECT COUNT(*) as count FROM admin_users');

      if (existing[0].count > 0) {
        return res.status(403).json({ error: 'Admin already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const [result] = await connection.query(
        'INSERT INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
        [username, hashedPassword, email, 'admin']
      );

      const token = jwt.sign(
        { userId: result.insertId, username, role: 'admin' },
        JWT_SECRET,
        { expiresIn: TOKEN_TTL }
      );

      res.status(201).json({
        success: true,
        message: 'Admin user created successfully',
        userId: result.insertId,
        token
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Register-admin error:', error.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to require an admin role (defence-in-depth for role-gated routes)
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// GET verify token
router.get('/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// PUT change own credentials (logged-in admin: username and/or password)
router.put('/credentials', verifyToken, async (req, res) => {
  const currentPassword = req.body.currentPassword || '';
  const newUsername = (req.body.newUsername || '').trim();
  const newPassword = req.body.newPassword || '';

  if (!currentPassword) {
    return res.status(400).json({ error: 'Current password is required' });
  }
  if (!newUsername && !newPassword) {
    return res.status(400).json({ error: 'Provide a new username and/or a new password' });
  }
  if (newUsername && newUsername.length < 3) {
    return res.status(400).json({ error: 'New username must be at least 3 characters' });
  }
  if (newPassword && newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const connection = await global.db.getConnection();
  try {
    const [rows] = await connection.query(
      'SELECT id, username, password_hash, role FROM admin_users WHERE id = ? LIMIT 1',
      [req.user.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Ensure the new username is not taken by another admin
    if (newUsername && newUsername !== user.username) {
      const [dupe] = await connection.query(
        'SELECT id FROM admin_users WHERE username = ? AND id <> ? LIMIT 1',
        [newUsername, user.id]
      );
      if (dupe.length > 0) {
        return res.status(409).json({ error: 'That username is already taken' });
      }
    }

    const updates = [];
    const params = [];
    if (newUsername) { updates.push('username = ?'); params.push(newUsername); }
    if (newPassword) { updates.push('password_hash = ?'); params.push(await bcrypt.hash(newPassword, 12)); }
    params.push(user.id);

    await connection.query(`UPDATE admin_users SET ${updates.join(', ')} WHERE id = ?`, params);

    const finalUsername = newUsername || user.username;
    // Issue a fresh token so the session reflects the new username immediately.
    const token = jwt.sign(
      { userId: user.id, username: finalUsername, role: user.role },
      JWT_SECRET,
      { expiresIn: TOKEN_TTL }
    );

    res.json({
      success: true,
      message: 'Credentials updated successfully',
      token,
      user: { id: user.id, username: finalUsername, role: user.role }
    });
  } catch (error) {
    console.error('Change credentials error:', error.message);
    res.status(500).json({ error: 'Failed to update credentials' });
  } finally {
    connection.release();
  }
});

module.exports = router;
module.exports.verifyToken = verifyToken;
module.exports.requireAdmin = requireAdmin;
