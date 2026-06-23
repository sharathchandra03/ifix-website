/**
 * Reset (or create) the admin login from environment variables.
 *
 * Reads ADMIN_USERNAME and ADMIN_PASSWORD from the environment and writes a
 * fresh bcrypt hash to the admin_users table. Use this to rotate the admin
 * password on the live server, since ensureDefaultAdmin() in server.js only
 * creates an admin when none exist and never updates an existing one.
 *
 * Usage (on a host that can reach the database):
 *   npm run admin:reset
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

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
      ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
    };
  }

  return {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  };
}

async function main() {
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!username || !password) {
    console.error('❌ ADMIN_USERNAME and ADMIN_PASSWORD must be set in the environment.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('❌ ADMIN_PASSWORD is too weak (min 8 characters).');
    process.exit(1);
  }

  const connection = await mysql.createConnection(buildMysqlConfig());
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [existing] = await connection.query(
      'SELECT id FROM admin_users WHERE username = ? LIMIT 1',
      [username]
    );

    if (existing.length > 0) {
      await connection.query(
        'UPDATE admin_users SET password_hash = ?, is_active = TRUE WHERE username = ?',
        [passwordHash, username]
      );
      console.log(`✅ Password reset for existing admin "${username}".`);
    } else {
      await connection.query(
        'INSERT INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
        [username, passwordHash, '', 'admin']
      );
      console.log(`✅ Created new admin "${username}".`);
    }
    console.log('🔐 Existing sessions are unaffected, but the old password no longer works.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('❌ Failed to reset admin password:', err.message);
  process.exit(1);
});
