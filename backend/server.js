require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const frontendRoot = path.join(__dirname, '..');

function buildMysqlConfig() {
  const connectionUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

  if (connectionUrl) {
    const parsed = new URL(connectionUrl);
    const sslEnabled = process.env.DB_SSL === 'true' || parsed.protocol === 'mysqls:';

    return {
      host: parsed.hostname,
      user: decodeURIComponent(parsed.username || process.env.DB_USER || 'root'),
      password: decodeURIComponent(parsed.password || process.env.DB_PASSWORD || ''),
      database: parsed.pathname.replace(/^\//, '') || process.env.DB_NAME || 'ifix_db',
      port: parsed.port ? Number(parsed.port) : 3306,
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ifix_db',
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

const mysqlConfig = buildMysqlConfig();

// Middleware
const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    // Allow same-origin and server-to-server requests.
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed by CORS'));
  }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(frontendRoot));

// MySQL Pool Configuration
const pool = mysql.createPool(mysqlConfig);

async function logDatabaseStatus() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log(`✅ Database connected`);
  } catch (error) {
    const details = error?.stack || error?.message || String(error);
    console.error('❌ Database connection failed:', details);
  } finally {
    if (connection) connection.release();
  }
}

// Make pool globally accessible
global.db = pool;

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/blog', require('./routes/blog'));
app.use('/api/youtube', require('./routes/youtube'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/auth', require('./routes/auth'));
// app.use('/api/payment', require('./routes/payment'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running', timestamp: new Date() });
});

// Frontend page routes for direct navigation on Render
const htmlRoutes = {
  '/': 'index.html',
  '/about': 'about.html',
  '/about.html': 'about.html',
  '/courses': 'courses.html',
  '/courses.html': 'courses.html',
  '/shop': 'shop.html',
  '/shop.html': 'shop.html',
  '/blog': 'blog.html',
  '/blog.html': 'blog.html',
  '/contact': 'contact.html',
  '/contact.html': 'contact.html',
  '/admin': 'admin-panel.html',
  '/admin-panel': 'admin-panel.html',
  '/admin-panel.html': 'admin-panel.html'
};

Object.entries(htmlRoutes).forEach(([route, fileName]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(frontendRoot, fileName));
  });
});

async function ensureDefaultAdmin() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    return;
  }

  const connection = await global.db.getConnection();
  try {
    const [rows] = await connection.query('SELECT COUNT(*) AS count FROM admin_users');

    if (rows[0].count === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await connection.query(
        'INSERT INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
        [adminUsername, passwordHash, '', 'admin']
      );
      console.log('✅ Default admin user created from .env');
    }
  } finally {
    connection.release();
  }
}

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// 404 Handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route not found' });
  }

  res.status(404).sendFile(path.join(frontendRoot, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 IFIX Backend running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${mysqlConfig.database || process.env.DB_NAME || 'unknown'}`);
  logDatabaseStatus().catch(error => {
    const details = error?.stack || error?.message || String(error);
    console.error('⚠️ Database status check failed:', details);
  });
  ensureDefaultAdmin().catch(error => {
    const details = error?.stack || error?.message || String(error);
    console.error('⚠️ Failed to ensure default admin user:', details);
  });
});

module.exports = app;
