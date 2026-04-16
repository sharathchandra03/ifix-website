/**
 * Database Adapter Layer
 * Abstracts database operations to support multiple database types
 * Supports: MySQL, PostgreSQL, MongoDB
 */

class DatabaseAdapter {
  constructor(db) {
    this.db = db;
    this.type = this.detectType();
  }

  detectType() {
    if (this.db._pool) return 'mysql'; // mysql2/promise
    if (this.db.query && typeof this.db.query === 'function') return 'mysql'; // fallback
    throw new Error('Unknown database type');
  }

  /**
   * Get all blogs (for admin dashboard)
   */
  async getAllBlogs() {
    console.log('[DB Adapter] Fetching all blogs');
    
    if (this.type === 'mysql') {
      const connection = await this.db.getConnection();
      try {
        const query = `
          SELECT id, title, slug, content, author, author_profile_picture, featured_image, 
                 excerpt, post_date, scheduled_at, category, tags, views, status, published_at, is_trending 
          FROM blog_posts 
          ORDER BY created_at DESC
        `;
        const [rows] = await connection.query(query);
        return rows;
      } finally {
        connection.release();
      }
    }
    
    throw new Error(`Unsupported database type: ${this.type}`);
  }

  /**
   * Get published blogs (for public website)
   */
  async getPublishedBlogs(limit = 10) {
    console.log('[DB Adapter] Fetching published blogs, limit:', limit);
    
    if (this.type === 'mysql') {
      const connection = await this.db.getConnection();
      try {
        const query = `
          SELECT id, title, slug, content, author, author_profile_picture, featured_image, 
                 excerpt, post_date, scheduled_at, category, tags, views, published_at, is_trending 
          FROM blog_posts 
          WHERE status = 'published' 
             OR (status = 'scheduled' AND scheduled_at <= NOW())
          ORDER BY COALESCE(post_date, published_at, scheduled_at, created_at) DESC 
          LIMIT ?
        `;
        const [rows] = await connection.query(query, [limit]);
        return rows;
      } finally {
        connection.release();
      }
    }
    
    throw new Error(`Unsupported database type: ${this.type}`);
  }

  /**
   * Get single blog by slug
   */
  async getBlogBySlug(slug) {
    console.log('[DB Adapter] Fetching blog by slug:', slug);
    
    if (this.type === 'mysql') {
      const connection = await this.db.getConnection();
      try {
        const [rows] = await connection.query(
          `SELECT * FROM blog_posts WHERE slug = ? AND (status = 'published' OR (status = 'scheduled' AND scheduled_at <= NOW()))`,
          [slug]
        );
        return rows.length > 0 ? rows[0] : null;
      } finally {
        connection.release();
      }
    }
    
    throw new Error(`Unsupported database type: ${this.type}`);
  }

  /**
   * Get blog by ID (admin)
   */
  async getBlogById(id) {
    console.log('[DB Adapter] Fetching blog by ID:', id);
    
    if (this.type === 'mysql') {
      const connection = await this.db.getConnection();
      try {
        const [rows] = await connection.query(
          `SELECT * FROM blog_posts WHERE id = ?`,
          [id]
        );
        return rows.length > 0 ? rows[0] : null;
      } finally {
        connection.release();
      }
    }
    
    throw new Error(`Unsupported database type: ${this.type}`);
  }

  /**
   * Create new blog
   */
  async createBlog(data) {
    console.log('[DB Adapter] Creating blog:', data.title);
    
    if (this.type === 'mysql') {
      const connection = await this.db.getConnection();
      try {
        const publishedAt = data.status === 'published' ? new Date() : null;
        const scheduledAtValue = data.status === 'scheduled' ? (data.scheduled_at || null) : null;

        const [result] = await connection.query(
          `INSERT INTO blog_posts (title, slug, content, author, author_profile_picture, category, tags, featured_image, excerpt, post_date, scheduled_at, is_trending, status, published_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            data.title,
            data.slug,
            data.content,
            data.author,
            data.author_profile_picture || '',
            data.category || '',
            data.tags || '',
            data.featured_image || '',
            data.excerpt || '',
            data.post_date || null,
            scheduledAtValue,
            data.is_trending ? 1 : 0,
            data.status || 'draft',
            publishedAt
          ]
        );

        return { id: result.insertId, slug: data.slug };
      } finally {
        connection.release();
      }
    }
    
    throw new Error(`Unsupported database type: ${this.type}`);
  }

  /**
   * Update blog
   */
  async updateBlog(id, data) {
    console.log('[DB Adapter] Updating blog ID:', id);
    
    if (this.type === 'mysql') {
      const connection = await this.db.getConnection();
      try {
        const publishedAt = data.status === 'published' ? new Date() : null;
        const scheduledAtValue = data.status === 'scheduled' ? (data.scheduled_at || null) : null;

        const [result] = await connection.query(
          `UPDATE blog_posts 
           SET title = ?, content = ?, author = ?, author_profile_picture = ?, category = ?, tags = ?, featured_image = ?, excerpt = ?, post_date = ?, scheduled_at = ?, is_trending = ?, status = ?, published_at = ?
           WHERE id = ?`,
          [
            data.title,
            data.content,
            data.author,
            data.author_profile_picture || '',
            data.category || '',
            data.tags || '',
            data.featured_image || '',
            data.excerpt || '',
            data.post_date || null,
            scheduledAtValue,
            data.is_trending ? 1 : 0,
            data.status || 'draft',
            publishedAt,
            id
          ]
        );

        return result.affectedRows > 0;
      } finally {
        connection.release();
      }
    }
    
    throw new Error(`Unsupported database type: ${this.type}`);
  }

  /**
   * Delete blog
   */
  async deleteBlog(id) {
    console.log('[DB Adapter] Deleting blog ID:', id);
    
    if (this.type === 'mysql') {
      const connection = await this.db.getConnection();
      try {
        const [result] = await connection.query(
          `DELETE FROM blog_posts WHERE id = ?`,
          [id]
        );
        return result.affectedRows > 0;
      } finally {
        connection.release();
      }
    }
    
    throw new Error(`Unsupported database type: ${this.type}`);
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id) {
    console.log('[DB Adapter] Incrementing view count for blog ID:', id);
    
    if (this.type === 'mysql') {
      const connection = await this.db.getConnection();
      try {
        await connection.query(
          `UPDATE blog_posts SET views = views + 1 WHERE id = ?`,
          [id]
        );
      } finally {
        connection.release();
      }
    }
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug) {
    console.log('[DB Adapter] Checking slug exists:', slug);
    
    if (this.type === 'mysql') {
      const connection = await this.db.getConnection();
      try {
        const [rows] = await connection.query(
          `SELECT id FROM blog_posts WHERE slug = ? LIMIT 1`,
          [slug]
        );
        return rows.length > 0;
      } finally {
        connection.release();
      }
    }
    
    throw new Error(`Unsupported database type: ${this.type}`);
  }
}

module.exports = DatabaseAdapter;
