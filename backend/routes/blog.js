const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

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
if (!useCloudinary) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

function imageFileFilter(req, file, cb) {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed'));
    return;
  }
  cb(null, true);
}

const storage = useCloudinary
  ? multer.memoryStorage()
  : multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }
);

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
    const connection = await global.db.getConnection();
    const query = `
      SELECT id, title, slug, content, author, author_profile_picture, featured_image, excerpt, post_date, scheduled_at, category, tags, views, published_at, is_trending 
      FROM blog_posts 
      WHERE ${isPublishedFilter()}
      ORDER BY COALESCE(post_date, published_at, scheduled_at, created_at) DESC 
      LIMIT 10
    `;
    const [rows] = await connection.query(query);
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all blogs for admin dashboard
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const query = `
      SELECT id, title, slug, content, author, author_profile_picture, featured_image, excerpt, post_date, scheduled_at, category, tags, views, status, published_at, is_trending 
      FROM blog_posts 
      ORDER BY created_at DESC
    `;
    const [rows] = await connection.query(query);
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single blog by slug
router.get('/post/:slug', async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [rows] = await connection.query(
      `SELECT * FROM blog_posts WHERE slug = ? AND ${isPublishedFilter()}`,
      [req.params.slug]
    );
    
    if (rows.length > 0) {
      // Increment view count
      await connection.query(
        'UPDATE blog_posts SET views = views + 1 WHERE id = ?',
        [rows[0].id]
      );
    }
    
    connection.release();
    res.json(rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create blog (admin only)
router.post('/', verifyToken, async (req, res) => {
  const { title, content, author, category, tags, featured_image, author_profile_picture, excerpt, post_date, scheduled_at, is_trending } = req.body;
  const status = req.body.status || 'draft';
  const publishedAt = status === 'published' ? new Date() : null;
  const scheduledAtValue = status === 'scheduled' ? (scheduled_at || null) : null;
  let connection;

  try {
    connection = await global.db.getConnection();
    const baseSlug = buildSlugFromTitle(title);
    const slug = await generateUniqueSlug(connection, baseSlug);
    const [result] = await connection.query(
      `INSERT INTO blog_posts (title, slug, content, author, author_profile_picture, category, tags, featured_image, excerpt, post_date, scheduled_at, is_trending, status, published_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        title,
        slug,
        content,
        author,
        author_profile_picture || '',
        category,
        tags || '',
        featured_image || '',
        excerpt || '',
        post_date || null,
        scheduledAtValue,
        is_trending ? 1 : 0,
        status,
        publishedAt
      ]
    );
    res.status(201).json({ id: result.insertId, slug });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A blog with this title already exists. Try a different title.' });
    }
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// PUT update blog (admin only)
router.put('/:id', verifyToken, async (req, res) => {
  const { title, content, author, category, tags, featured_image, author_profile_picture, excerpt, post_date, scheduled_at, status, is_trending } = req.body;
  let connection;

  try {
    connection = await global.db.getConnection();
    const published_at = status === 'published' ? new Date() : null;
    const scheduledAtValue = status === 'scheduled' ? (scheduled_at || null) : null;
    const [result] = await connection.query(
      `UPDATE blog_posts 
       SET title = ?, content = ?, author = ?, author_profile_picture = ?, category = ?, tags = ?, featured_image = ?, excerpt = ?, post_date = ?, scheduled_at = ?, is_trending = ?, status = ?, published_at = ?
       WHERE id = ?`,
      [
        title,
        content,
        author,
        author_profile_picture || '',
        category,
        tags || '',
        featured_image || '',
        excerpt || '',
        post_date || null,
        scheduledAtValue,
        is_trending ? 1 : 0,
        status,
        published_at,
        req.params.id
      ]
    );
    res.json({ updated: result.affectedRows > 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// POST upload blog image
router.post('/upload-image', verifyToken, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  if (isProduction && !useCloudinary) {
    return res.status(503).json({
      error: 'Image uploads require Cloudinary in production. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Render.'
    });
  }

  if (useCloudinary) {
    try {
      const uploaded = await uploadToCloudinary(req.file.buffer, req.file.mimetype || 'image/jpeg');
      return res.json({
        success: true,
        url: uploaded.secure_url,
        storage: 'cloudinary'
      });
    } catch (error) {
      return res.status(500).json({ error: `Cloudinary upload failed: ${error.message}` });
    }
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    success: true,
    url: `${baseUrl}/uploads/blogs/${req.file.filename}`,
    storage: 'local'
  });
});

// DELETE blog (admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const connection = await global.db.getConnection();
    const [result] = await connection.query('DELETE FROM blog_posts WHERE id = ?', [req.params.id]);
    connection.release();
    res.json({ deleted: result.affectedRows > 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
