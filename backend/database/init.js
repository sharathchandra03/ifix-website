require('dotenv').config();
const mysql = require('mysql2/promise');

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
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ifix_db',
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  };
}

function getTargetDatabaseName() {
  const connectionUrl =
    process.env.DATABASE_URL ||
    process.env.MYSQL_URL ||
    process.env.MYSQL_PUBLIC_URL;
  if (connectionUrl) {
    const parsed = new URL(connectionUrl);
    const dbName = parsed.pathname.replace(/^\//, '').trim();
    if (dbName) return dbName;
  }

  return process.env.DB_NAME || 'ifix_db';
}

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [getTargetDatabaseName(), tableName, columnName]
  );

  return rows[0].count > 0;
}

async function ensureColumn(connection, tableName, columnName, definition) {
  const exists = await columnExists(connection, tableName, columnName);
  if (!exists) {
    await connection.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    ...buildMysqlConfig()
  });

  try {
    console.log('⏳ Creating tables...');

    // Products Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        image_url VARCHAR(500),
        category VARCHAR(100),
        stock INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Products table created');

    // Orders Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(100) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20),
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        razorpay_payment_id VARCHAR(100),
        razorpay_order_id VARCHAR(100),
        items JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order_id (order_id),
        INDEX idx_status (status)
      )
    `);
    console.log('✅ Orders table created');

    // Extend orders with full checkout + Razorpay fields (idempotent)
    await ensureColumn(connection, 'orders', 'customer_address', 'TEXT');
    await ensureColumn(connection, 'orders', 'customer_city', 'VARCHAR(120)');
    await ensureColumn(connection, 'orders', 'customer_state', 'VARCHAR(120)');
    await ensureColumn(connection, 'orders', 'customer_postal_code', 'VARCHAR(20)');
    await ensureColumn(connection, 'orders', 'notes', 'TEXT');
    await ensureColumn(connection, 'orders', 'quantity', 'INT DEFAULT 0');
    await ensureColumn(connection, 'orders', 'payment_status', "VARCHAR(30) DEFAULT 'pending'");
    await ensureColumn(connection, 'orders', 'razorpay_signature', 'VARCHAR(255)');
    console.log('✅ Orders table columns ensured');

    // Categories Table (product categories managed from admin)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        slug VARCHAR(120),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      )
    `);
    console.log('✅ Categories table created');

    // Form Fields Table (dynamic checkout form configuration)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS form_fields (
        id INT AUTO_INCREMENT PRIMARY KEY,
        field_key VARCHAR(80) UNIQUE NOT NULL,
        label VARCHAR(150) NOT NULL,
        field_type VARCHAR(40) DEFAULT 'text',
        placeholder VARCHAR(255),
        is_required TINYINT(1) DEFAULT 0,
        sort_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        is_system TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sort_order (sort_order)
      )
    `);
    console.log('✅ Form fields table created');

    // Seed default categories (only when empty) — merge defaults with any existing product categories
    const [catCount] = await connection.query('SELECT COUNT(*) AS count FROM categories');
    if (catCount[0].count === 0) {
      const defaultCategories = ['parts', 'screens', 'batteries', 'accessories', 'phones', 'laptops', 'tablets'];
      let existingProductCats = [];
      try {
        const [rows] = await connection.query(
          "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category <> ''"
        );
        existingProductCats = rows.map(r => String(r.category).trim()).filter(Boolean);
      } catch (e) { /* products table may be empty — ignore */ }

      const seen = new Set();
      const merged = [...defaultCategories, ...existingProductCats].filter(name => {
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      for (const name of merged) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        await connection.query('INSERT IGNORE INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
      }
      console.log(`✅ Seeded ${merged.length} default categories`);
    }

    // Seed default checkout form fields (only when empty)
    const [ffCount] = await connection.query('SELECT COUNT(*) AS count FROM form_fields');
    if (ffCount[0].count === 0) {
      const defaultFields = [
        ['full_name',   'Full Name',    'text',     'Enter your full name',  1, 1, 1],
        ['email',       'Email',        'email',    'you@example.com',       1, 2, 1],
        ['phone',       'Phone Number', 'tel',      '10-digit mobile number',1, 3, 1],
        ['address',     'Address',      'textarea', 'House no, street, area', 1, 4, 1],
        ['city',        'City',         'text',     'City',                  1, 5, 1],
        ['state',       'State',        'text',     'State',                 1, 6, 1],
        ['postal_code', 'Postal Code',  'text',     '6-digit PIN code',      1, 7, 1],
        ['notes',       'Order Notes',  'textarea', 'Any special instructions (optional)', 0, 8, 1]
      ];
      for (const [field_key, label, field_type, placeholder, is_required, sort_order, is_system] of defaultFields) {
        await connection.query(
          'INSERT IGNORE INTO form_fields (field_key, label, field_type, placeholder, is_required, sort_order, is_active, is_system) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
          [field_key, label, field_type, placeholder, is_required, sort_order, is_system]
        );
      }
      console.log(`✅ Seeded ${defaultFields.length} default form fields`);
    }

    // Blog Posts Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(500) UNIQUE NOT NULL,
        content LONGTEXT NOT NULL,
        author VARCHAR(255) NOT NULL,
        author_profile_picture VARCHAR(500),
        featured_image VARCHAR(500),
        excerpt TEXT,
        post_date DATE,
        scheduled_at DATETIME NULL,
        category VARCHAR(100),
        tags VARCHAR(500),
        is_trending BOOLEAN DEFAULT FALSE,
        views INT DEFAULT 0,
        status ENUM('draft', 'published', 'scheduled') DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        published_at TIMESTAMP NULL,
        INDEX idx_slug (slug),
        INDEX idx_status (status),
        INDEX idx_category (category)
      )
    `);
    console.log('✅ Blog posts table created');

    await ensureColumn(connection, 'blog_posts', 'author_profile_picture', 'VARCHAR(500)');
    await ensureColumn(connection, 'blog_posts', 'excerpt', 'TEXT');
    await ensureColumn(connection, 'blog_posts', 'post_date', 'DATE');
    await ensureColumn(connection, 'blog_posts', 'scheduled_at', 'DATETIME NULL');
    await ensureColumn(connection, 'blog_posts', 'is_trending', 'BOOLEAN DEFAULT FALSE');

    await connection.execute(`ALTER TABLE blog_posts MODIFY status ENUM('draft', 'published', 'scheduled') DEFAULT 'draft'`);

    // Blog Media Table (persistent image storage in DB)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS blog_media (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        original_name VARCHAR(500),
        mime_type VARCHAR(120) NOT NULL,
        file_size INT NOT NULL,
        image_data LONGBLOB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ Blog media table created');

    // Contact Forms Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        subject VARCHAR(500),
        message TEXT NOT NULL,
        sheets_row_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (email)
      )
    `);
    console.log('✅ Contacts table created');

    // Admin Users Table (for blog admin)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'editor',
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username)
      )
    `);
    console.log('✅ Admin users table created');

    // YouTube Videos Cache Table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS youtube_videos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        video_id VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        thumbnail_url VARCHAR(500),
        channel_id VARCHAR(100),
        published_at TIMESTAMP,
        view_count INT DEFAULT 0,
        cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_video_id (video_id),
        INDEX idx_channel_id (channel_id)
      )
    `);
    console.log('✅ YouTube videos table created');

    console.log('\n✅ Database initialization complete!');
    await connection.end();
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
