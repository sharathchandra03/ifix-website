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
    const adapter = new DatabaseAdapter(global.db);
    const blogs = await adapter.getPublishedBlogs(10);
    res.json(blogs);
  } catch (error) {
    log.error('Failed to fetch published blogs', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET all blogs for admin dashboard
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    const adapter = new DatabaseAdapter(global.db);
    const blogs = await adapter.getAllBlogs();
    
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
    const blog = await adapter.getBlogBySlug(req.params.slug);
    
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

// POST create blog (admin only)
router.post('/', verifyToken, async (req, res) => {
  const { title, content, author, category, tags, featured_image, author_profile_picture, excerpt, post_date, scheduled_at, is_trending } = req.body;
  const status = req.body.status || 'draft';
  let connection;

  try {
    log.info('Creating new blog', { title, status, featured_image: featured_image ? '✅ Yes' : '❌ No' });
    
    connection = await global.db.getConnection();
    const baseSlug = buildSlugFromTitle(title);
    const slug = await generateUniqueSlug(connection, baseSlug);
    
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
  const { title, content, author, category, tags, featured_image, author_profile_picture, excerpt, post_date, scheduled_at, status, is_trending } = req.body;

  try {
    log.info('Updating blog ID:', req.params.id);
    
    const adapter = new DatabaseAdapter(global.db);
    const updated = await adapter.updateBlog(req.params.id, {
      title,
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
