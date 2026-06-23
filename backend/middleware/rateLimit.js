// ============================================================
// Centralized rate limiters
// Protects auth (brute-force) and public write endpoints (spam/abuse)
// without affecting normal read traffic.
// ============================================================
const rateLimit = require('express-rate-limit');

const standardOptions = {
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,  // disable X-RateLimit-* headers
};

// Strict limiter for authentication attempts (login / admin setup)
const authLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 attempts per IP per window
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

// Limiter for public form submissions (contact, checkout, orders)
const writeLimiter = rateLimit({
  ...standardOptions,
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30,                  // 30 submissions per IP per window
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

// Generic API limiter (safety net against scraping / abuse)
const apiLimiter = rateLimit({
  ...standardOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 300,            // 300 requests per IP per minute
  message: { error: 'Too many requests. Please try again later.' },
});

module.exports = { authLimiter, writeLimiter, apiLimiter };
