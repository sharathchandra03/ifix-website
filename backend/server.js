// ============================================================
// CRASH SAFETY NET — must be FIRST, before anything else
// ============================================================
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err.stack || err.message);
  // An uncaught exception leaves the process in an undefined state.
  // Log, then exit so the process manager (pm2 / systemd / Render) restarts
  // a clean instance. Give logs a moment to flush first.
  setTimeout(() => process.exit(1), 100);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 UNHANDLED REJECTION:', reason);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');
const { authLimiter, writeLimiter, apiLimiter } = require('./middleware/rateLimit');

const app = express();
const frontendRoot = path.join(__dirname, '..');
const initializeDatabase = require('./database/init');

const isProduction = process.env.NODE_ENV === 'production';

// ============================================================
// Fail fast on insecure configuration in production.
// A missing/weak JWT secret means tokens are forgeable.
// ============================================================
if (isProduction) {
  const weakSecret = !process.env.JWT_SECRET || process.env.JWT_SECRET === 'ifix_secret_key';
  if (weakSecret) {
    console.error('❌ FATAL: JWT_SECRET is missing or insecure. Set a strong JWT_SECRET in the environment.');
    process.exit(1);
  }
  if (!process.env.FRONTEND_URL) {
    console.warn('⚠️ FRONTEND_URL is not set — CORS will block browser requests in production.');
  }
}

// Respect reverse-proxy headers (Hostinger / Render use a proxy)
app.set('trust proxy', 1);

// Do not advertise the framework
app.disable('x-powered-by');

// ============================================================
// Security headers (Helmet)
// CSP is intentionally disabled here because the existing HTML
// pages rely on large inline <script>/<style> blocks; enabling a
// strict CSP would break them. All other hardening headers are on.
// ============================================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  // Allow images/media (e.g. Cloudinary, YouTube thumbnails) to load cross-origin
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
}));

// Permissions-Policy is not set by Helmet by default — add a sensible default
// that disables powerful features this site does not use.
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(self)');
  next();
});

// ============================================================
// HEALTH CHECK — registered FIRST so it always responds
// even if routes below fail to load
// ============================================================
app.get('/api/health', async (req, res) => {
  const health = { status: 'Backend is running', timestamp: new Date(), database: 'unknown' };
  try {
    if (global.db) {
      const connection = await global.db.getConnection();
      try { await connection.ping(); health.database = 'connected'; }
      finally { connection.release(); }
    }
    res.json(health);
  } catch (err) {
    health.database = 'disconnected';
    res.status(503).json(health);
  }
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
// CORS — accepts a comma-separated FRONTEND_URL list, trailing
// slashes stripped. In production an unknown origin is rejected
// rather than silently allowed.
// ============================================================
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Same-origin / server-to-server / curl requests have no Origin header.
    if (!origin) return callback(null, true);

    const normalized = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalized)) {
      return callback(null, true);
    }

    // Outside production, allow any origin to ease local development.
    if (!isProduction) return callback(null, true);

    console.warn(`⚠️ CORS blocked origin: ${origin}`);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));

// Cap request body size to prevent memory-exhaustion DoS.
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// Generic API rate limit (read + write). Stricter limiters are applied
// per-route on auth and public form submissions.
app.use('/api', apiLimiter);

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
// Stricter limits on abuse-prone endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register-admin', authLimiter);
app.use('/api/contact', writeLimiter);
app.use('/api/orders', writeLimiter);
app.use('/api/payment', writeLimiter);

const routesToLoad = [
  ['/api/products',    './routes/products'],
  ['/api/categories',  './routes/categories'],
  ['/api/orders',      './routes/orders'],
  ['/api/form-config', './routes/form-config'],
  ['/api/blog',        './routes/blog'],
  ['/api/youtube',     './routes/youtube'],
  ['/api/contact',     './routes/contact'],
  ['/api/auth',        './routes/auth'],
  ['/api/payment',     './routes/payment'],
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
// Logs full detail server-side; never leaks stack/internals to clients.
// ============================================================
app.use((err, req, res, next) => {
  console.error('Express error:', err.stack || err.message);

  // CORS rejections should be a clear 403, not a generic 500.
  if (err && err.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  // Body-parser size/parse failures.
  if (err && (err.type === 'entity.too.large')) {
    return res.status(413).json({ error: 'Payload too large' });
  }

  const body = { error: 'Something went wrong!' };
  if (!isProduction) body.details = err.message; // detail only outside production
  res.status(err.status || 500).json(body);
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
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 IFIX Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${mysqlConfig.database}`);
  console.log(`🔗 Allowed origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : (isProduction ? 'NONE (set FRONTEND_URL!)' : 'ALL (dev)')}`);

  initializeDatabase().catch(err =>
    console.error('⚠️ DB init failed:', err.message)
  );
  logDatabaseStatus().catch(err =>
    console.error('⚠️ DB status check failed:', err.message)
  );
  ensureDefaultAdmin().catch(err =>
    console.error('⚠️ ensureDefaultAdmin failed:', err.message)
  );
});

// ============================================================
// Graceful shutdown — drain HTTP connections and close the DB pool
// so deploys/restarts don't drop in-flight requests or leak sockets.
// ============================================================
function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(async () => {
    try {
      if (global.db && global.db.end) await global.db.end();
      console.log('✅ Closed HTTP server and database pool');
    } catch (err) {
      console.error('⚠️ Error during shutdown:', err.message);
    } finally {
      process.exit(0);
    }
  });
  // Force-exit if connections don't drain in time.
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;