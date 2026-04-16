const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const DatabaseAdapter = require('../database/adapter');

// Simple logging helper
const log = {
  info: (msg, data) => console.log(`[BLOG] ✅ ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[BLOG] ⚠️ ${msg}`, data || ''),
  error: (msg, data) => console.error(`[BLOG] ❌ ${msg}`, data || '')
};

const useCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

const isProduction = process.env.NODE_ENV === 'production';

if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

const uploadDir = path.join(__dirname, '..', 'uploads', 'blogs');
fs.mkdirSync(uploadDir, { recursive: true });

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

function imageFileFilter(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed'));
    return;
  }
  cb(null, true);
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: imageFileFilter
});

async function uploadToCloudinary(fileBuffer, mimeType) {
  const folder = process.env.CLOUDINARY_FOLDER || 'ifix/blogs';
  const dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  return cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image',
    overwrite: false
  });
}

async function ensureBlogMediaTable(connection) {
  await connection.query(`
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
}

async function saveImageToDatabase(req, file) {
  const connection = await global.db.getConnection();
  try {
    await ensureBlogMediaTable(connection);
    const [result] = await connection.query(
      `INSERT INTO blog_media (original_name, mime_type, file_size, image_data) VALUES (?, ?, ?, ?)`,
      [file.originalname || '', file.mimetype || 'image/jpeg', file.size || (file.buffer ? file.buffer.length : 0), file.buffer]
    );

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return {
      url: `${baseUrl}/api/blog/media/${result.insertId}`,
      storage: 'database'
    };
  } finally {
    connection.release();
  }
}

function effectiveDateColumn() {
  return `COALESCE(post_date, DATE(created_at))`;
}

function buildSlugFromTitle(title) {
  const base = String(title || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');

  return base || `post-${Date.now()}`;
}

function normalizeSlugInput(slugInput) {
  return String(slugInput || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeUrlForHost(rawUrl, req) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';

  const hostBase = `${req.protocol}://${req.get('host')}`;

  if (value.startsWith('/')) {
    return `${hostBase}${value}`;
  }

  if (/^https?:\/\/localhost(?::\d+)?\//i.test(value) || /^https?:\/\/127\.0\.0\.1(?::\d+)?\//i.test(value)) {
    try {
      const parsed = new URL(value);
      return `${hostBase}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return value;
    }
  }

  return value;
}

function normalizeBlogImageFields(blog, req) {
  if (!blog || typeof blog !== 'object') return blog;
  return {
    ...blog,
    featured_image: normalizeUrlForHost(blog.featured_image, req),
    author_profile_picture: normalizeUrlForHost(blog.author_profile_picture, req)
  };
}

async function generateUniqueSlug(connection, initialSlug) {
  let slug = initialSlug;
  let suffix = 2;

  while (true) {
    const [rows] = await connection.query('SELECT id FROM blog_posts WHERE slug = ? LIMIT 1', [slug]);
    if (rows.length === 0) return slug;
    slug = `${initialSlug}-${suffix}`;
    suffix += 1;
  }
}

function isPublishedFilter() {
  return `(
    status = 'published'
    OR (status = 'scheduled' AND scheduled_at <= NOW())
  )`;
}

// GET all published blogs
router.get('/', async (req, res) => {
  try {
    const adapter = new DatabaseAdapter(global.db);
    const blogs = await adapter.getPublishedBlogs(10);
    res.json(blogs.map(blog => normalizeBlogImageFields(blog, req)));
  } catch (error) {
    log.error('Failed to fetch published blogs', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET all blogs for admin dashboard
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    const adapter = new DatabaseAdapter(global.db);
    const blogs = (await adapter.getAllBlogs()).map(blog => normalizeBlogImageFields(blog, req));
    
    log.info(`Found ${blogs.length} blogs in database`);
    
    if (blogs.length > 0) {
      log.info('Sample blog:', {
        id: blogs[0].id,
        title: blogs[0].title,
        status: blogs[0].status,
        featured_image: blogs[0].featured_image ? '✅ Yes' : '❌ No'
      });
    }
    
    res.json(blogs);
  } catch (error) {
    log.error('Failed to fetch blogs', error.message);
    res.status(500).json({ 
      error: error.message,
      details: error.stack 
    });
  }
});

// GET single blog by slug
router.get('/post/:slug', async (req, res) => {
  try {
    const adapter = new DatabaseAdapter(global.db);
    const blog = normalizeBlogImageFields(await adapter.getBlogBySlug(req.params.slug), req);
    
    if (blog) {
      // Increment view count
      await adapter.incrementViewCount(blog.id);
    }
    
    res.json(blog || {});
  } catch (error) {
    log.error('Failed to fetch blog', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET blog media by ID (stored in DB)
router.get('/media/:id', async (req, res) => {
  let connection;
  try {
    connection = await global.db.getConnection();
    await ensureBlogMediaTable(connection);
    const [rows] = await connection.query(
      'SELECT mime_type, image_data FROM blog_media WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.setHeader('Content-Type', rows[0].mime_type || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(rows[0].image_data);
  } catch (error) {
    log.error('Failed to fetch media', error.message);
    return res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// POST create blog (admin only)
router.post('/', verifyToken, async (req, res) => {
  const { title, slug: customSlugRaw, content, author, category, tags, featured_image, author_profile_picture, excerpt, post_date, scheduled_at, is_trending } = req.body;
  const status = req.body.status || 'draft';
  let connection;

  if (status === 'scheduled' && !scheduled_at) {
    return res.status(400).json({ error: 'scheduled_at is required when status is scheduled' });
  }

  try {
    log.info('Creating new blog', { title, status, featured_image: featured_image ? '✅ Yes' : '❌ No' });
    
    connection = await global.db.getConnection();
    const customSlug = normalizeSlugInput(customSlugRaw);
    let slug;

    if (customSlug) {
      const [existingSlug] = await connection.query('SELECT id FROM blog_posts WHERE slug = ? LIMIT 1', [customSlug]);
      if (existingSlug.length > 0) {
        return res.status(409).json({ error: 'This custom slug is already in use. Please choose another.' });
      }
      slug = customSlug;
    } else {
      const baseSlug = buildSlugFromTitle(title);
      slug = await generateUniqueSlug(connection, baseSlug);
    }
    
    log.info('Generated slug:', slug);
    
    const adapter = new DatabaseAdapter(global.db);
    const result = await adapter.createBlog({
      title,
      slug,
      content,
      author,
      author_profile_picture,
      category,
      tags,
      featured_image,
      excerpt,
      post_date,
      scheduled_at,
      is_trending,
      status
    });
    
    log.info('Blog created successfully', { id: result.id, slug, featured_image: featured_image ? '✅ Yes' : '❌ No' });
    
    res.status(201).json(result);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      log.warn('Duplicate blog title');
      return res.status(409).json({ error: 'A blog with this title already exists. Try a different title.' });
    }
    log.error('Failed to create blog', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// PUT update blog (admin only)
router.put('/:id', verifyToken, async (req, res) => {
  const { title, slug: customSlugRaw, content, author, category, tags, featured_image, author_profile_picture, excerpt, post_date, scheduled_at, status, is_trending } = req.body;

  if (status === 'scheduled' && !scheduled_at) {
    return res.status(400).json({ error: 'scheduled_at is required when status is scheduled' });
  }

  try {
    log.info('Updating blog ID:', req.params.id);

    const adapter = new DatabaseAdapter(global.db);
    const current = await adapter.getBlogById(req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    let nextSlug = current.slug;
    const customSlug = normalizeSlugInput(customSlugRaw);
    if (customSlug) {
      const connection = await global.db.getConnection();
      try {
        const [rows] = await connection.query('SELECT id FROM blog_posts WHERE slug = ? AND id <> ? LIMIT 1', [customSlug, req.params.id]);
        if (rows.length > 0) {
          return res.status(409).json({ error: 'This custom slug is already in use. Please choose another.' });
        }
        nextSlug = customSlug;
      } finally {
        connection.release();
      }
    } else if (!current.slug) {
      nextSlug = buildSlugFromTitle(title);
    }
    
    const updated = await adapter.updateBlog(req.params.id, {
      title,
      slug: nextSlug,
      content,
      author,
      author_profile_picture,
      category,
      tags,
      featured_image,
      excerpt,
      post_date,
      scheduled_at,
      is_trending,
      status
    });
    
    log.info('Blog updated:', { id: req.params.id, success: updated });
    res.json({ updated });
  } catch (error) {
    log.error('Failed to update blog', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST upload blog image
router.post('/upload-image', verifyToken, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  try {
    const uploaded = await saveImageToDatabase(req, req.file);
    return res.json({ success: true, url: uploaded.url, storage: uploaded.storage });
  } catch (error) {
    log.error('Database image upload failed', error.message);
    if (useCloudinary) {
      try {
        const uploaded = await uploadToCloudinary(req.file.buffer, req.file.mimetype || 'image/jpeg');
        return res.json({ success: true, url: uploaded.secure_url, storage: 'cloudinary' });
      } catch (cloudError) {
        return res.status(500).json({ error: `Database upload failed: ${error.message}. Cloudinary fallback failed: ${cloudError.message}` });
      }
    }
    return res.status(500).json({ error: `Database upload failed: ${error.message}` });
  }
});

// DELETE blog (admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    log.info('Deleting blog ID:', req.params.id);
    
    const adapter = new DatabaseAdapter(global.db);
    const deleted = await adapter.deleteBlog(req.params.id);
    
    log.info('Blog deleted:', { id: req.params.id, success: deleted });
    res.json({ deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
