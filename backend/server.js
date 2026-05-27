// ============================================================
// CRASH SAFETY NET — must be FIRST, before anything else
// ============================================================
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err.stack || err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 UNHANDLED REJECTION:', reason);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const frontendRoot = path.join(__dirname, '..');

// Respect reverse-proxy headers (Hostinger uses a proxy)
app.set('trust proxy', 1);

// ============================================================
// HEALTH CHECK — registered FIRST so it always responds
// even if routes below fail to load
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running', timestamp: new Date() });
});

// ============================================================
// MySQL config builder
// ============================================================
function buildMysqlConfig() {
  const connectionUrl =
    process.env.DATABASE_URL ||
    process.env.MYSQL_URL ||
    process.env.MYSQL_PUBLIC_URL;

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
    port: Number(process.env.DB_PORT) || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
}

const mysqlConfig = buildMysqlConfig();

// ============================================================
// CORS — strip trailing slash from FRONTEND_URL to avoid mismatch
// ============================================================
const rawOrigin = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
const allowedOrigins = rawOrigin ? [rawOrigin] : [];

app.use(cors({
  origin(origin, callback) {
    // Allow same-origin and server-to-server (no origin header)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`⚠️ CORS blocked origin: ${origin}`);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(frontendRoot));

// ============================================================
// MySQL Pool
// ============================================================
const pool = mysql.createPool(mysqlConfig);
global.db = pool;

async function logDatabaseStatus() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error?.message || String(error));
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================
// ROUTES — each wrapped in try/catch so one bad file
// doesn't crash the entire server
// ============================================================
const routesToLoad = [
  ['/api/products', './routes/products'],
  ['/api/blog',     './routes/blog'],
  ['/api/youtube',  './routes/youtube'],
  ['/api/contact',  './routes/contact'],
  ['/api/auth',     './routes/auth'],
  // ['/api/payment',  './routes/payment'],
];

for (const [routePath, filePath] of routesToLoad) {
  try {
    app.use(routePath, require(filePath));
    console.log(`✅ Route loaded: ${routePath}`);
  } catch (err) {
    console.error(`❌ Route FAILED to load: ${routePath}`);
    console.error(`   Reason: ${err.message}`);
    console.error(`   Stack:  ${err.stack}`);
    // Server keeps running — broken route just won't respond
  }
}

// ============================================================
// Frontend HTML routes (direct URL navigation)
// ============================================================
const htmlRoutes = {
  '/':                'index.html',
  '/about':           'Our Story.html',
  '/about.html':      'Our Story.html',
  '/our-story':       'Our Story.html',
  '/Our Story.html':  'Our Story.html',
  '/courses':         'courses.html',
  '/courses.html':    'courses.html',
  '/shop':            'shop.html',
  '/shop.html':       'shop.html',
  '/blog':            'blog.html',
  '/blog.html':       'blog.html',
  '/contact':         'contact.html',
  '/contact.html':    'contact.html',
  '/admin':           'admin-panel.html',
  '/admin-panel':     'admin-panel.html',
  '/admin-panel.html':'admin-panel.html'
};

Object.entries(htmlRoutes).forEach(([route, fileName]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(frontendRoot, fileName));
  });
});

// SEO-friendly blog slug URLs
app.get('/blog/:slug', (req, res) => {
  res.sendFile(path.join(frontendRoot, 'blog.html'));
});

// ============================================================
// Ensure default admin exists in DB
// ============================================================
async function ensureDefaultAdmin() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminUsername || !adminPassword) return;

  let connection;
  try {
    connection = await global.db.getConnection();
    const [rows] = await connection.query('SELECT COUNT(*) AS count FROM admin_users');
    if (rows[0].count === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await connection.query(
        'INSERT INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
        [adminUsername, passwordHash, '', 'admin']
      );
      console.log('✅ Default admin user created from .env');
    }
  } catch (err) {
    // Log but never crash the server over this
    console.error('⚠️ ensureDefaultAdmin failed:', err.message);
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================
// Error handling middleware
// ============================================================
app.use((err, req, res, next) => {
  console.error('Express error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// 404 fallback
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  res.status(404).sendFile(path.join(frontendRoot, 'index.html'));
});

// ============================================================
// Start server
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 IFIX Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${mysqlConfig.database}`);
  console.log(`🔗 Allowed origin: ${allowedOrigins[0] || 'ALL (no FRONTEND_URL set)'}`);

  logDatabaseStatus().catch(err =>
    console.error('⚠️ DB status check failed:', err.message)
  );
  ensureDefaultAdmin().catch(err =>
    console.error('⚠️ ensureDefaultAdmin failed:', err.message)
  );
});

module.exports = app;