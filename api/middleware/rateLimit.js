// Rate limiting middleware for API endpoints
// Prevents abuse and DDoS attacks
//
// ⚠️ PRODUCTION NOTE: This in-memory implementation won't scale across multiple
// server instances. For production with multiple instances, use Redis-backed
// rate limiting:
//   - express-rate-limit with rate-limit-redis
//   - ioredis-based custom implementation
//   - API Gateway rate limiting (AWS, Cloudflare, etc.)

// Simple in-memory rate limiter (suitable for single-instance deployments)
const requestCounts = new Map();

function simpleRateLimiter(options = {}) {
  const {
    windowMs = 60000, // 1 minute
    max = 100, // 100 requests per window
    keyGenerator = (req) => req.headers['x-forwarded-for'] || req.ip || 'unknown'
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Get or create entry for this key
    let entry = requestCounts.get(key);
    
    if (!entry || now - entry.resetTime > windowMs) {
      // New window
      entry = {
        count: 0,
        resetTime: now
      };
      requestCounts.set(key, entry);
      
      // Lazy cleanup: Remove this entry's old data
      // More efficient than iterating all entries
      if (requestCounts.size > 10000) { // Safety limit
        const keysToDelete = [];
        for (const [k, e] of requestCounts.entries()) {
          if (now - e.resetTime > windowMs * 2) {
            keysToDelete.push(k);
          }
          // Only check first 100 entries to avoid performance hit
          if (keysToDelete.length >= 100) break;
        }
        keysToDelete.forEach(k => requestCounts.delete(k));
      }
    }

    entry.count++;

    if (entry.count > max) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${Math.ceil((entry.resetTime + windowMs - now) / 1000)} seconds.`,
        retryAfter: Math.ceil((entry.resetTime + windowMs - now) / 1000)
      });
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime + windowMs).toISOString());

    next();
  };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCounts.entries()) {
    if (now - entry.resetTime > 300000) { // 5 minutes
      requestCounts.delete(key);
    }
  }
}, 60000); // Run every minute

// Different rate limiters for different endpoints
const rateLimiters = {
  // Mining endpoint - more permissive (user taps frequently)
  mining: simpleRateLimiter({
    windowMs: 60000, // 1 minute
    max: 200, // 200 requests per minute
    keyGenerator: (req) => `mining:${req.body.userId || req.ip}`
  }),

  // Claim endpoint - strict (prevents abuse)
  claim: simpleRateLimiter({
    windowMs: 60000, // 1 minute
    max: 10, // 10 requests per minute
    keyGenerator: (req) => `claim:${req.body.userId || req.query.userId || req.ip}`
  }),

  // Auth/Access endpoints - moderate
  auth: simpleRateLimiter({
    windowMs: 300000, // 5 minutes
    max: 20, // 20 requests per 5 minutes
    keyGenerator: (req) => `auth:${req.body.userId || req.query.userId || req.ip}`
  }),

  // General API - moderate
  api: simpleRateLimiter({
    windowMs: 60000, // 1 minute
    max: 60, // 60 requests per minute
    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip || 'unknown'
  }),

  // Stats endpoint - very permissive (read-only, cacheable)
  stats: simpleRateLimiter({
    windowMs: 10000, // 10 seconds
    max: 100, // 100 requests per 10 seconds
    keyGenerator: (req) => req.ip || 'unknown'
  })
};

module.exports = rateLimiters;
