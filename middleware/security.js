/**
 * SECURITY MIDDLEWARE - Enterprise Production Ready
 * Rate limiting, CSRF protection, security headers
 */

const logger = require('../utils/logger').loggers.security;

// Rate limiting storage (in-memory, consider Redis for production cluster)
const rateLimitStore = new Map();
const cleanupInterval = 60000; // Clean up every minute

// Clean up old entries
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.lastReset > data.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}, cleanupInterval);

/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per time window
 */
function rateLimit(options = {}) {
  const {
    windowMs = 60000, // 1 minute
    max = 100, // 100 requests per window
    keyGenerator = (req) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    handler = null
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let limitData = rateLimitStore.get(key);

    if (!limitData || now - limitData.lastReset > windowMs) {
      limitData = {
        count: 0,
        lastReset: now,
        windowMs
      };
    }

    limitData.count++;
    rateLimitStore.set(key, limitData);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - limitData.count));
    res.setHeader('X-RateLimit-Reset', new Date(limitData.lastReset + windowMs).toISOString());

    if (limitData.count > max) {
      logger.warn('Rate limit exceeded', {
        key,
        count: limitData.count,
        max,
        path: req.path,
        method: req.method
      });

      if (handler) {
        return handler(req, res);
      }

      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil((limitData.lastReset + windowMs - now) / 1000)
      });
    }

    // Hook into response to track success/failure
    if (!skipSuccessfulRequests || !skipFailedRequests) {
      const originalSend = res.send;
      res.send = function(data) {
        const statusCode = res.statusCode;

        // Decrement counter for skipped requests
        if ((skipSuccessfulRequests && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400)) {
          limitData.count = Math.max(0, limitData.count - 1);
          rateLimitStore.set(key, limitData);
        }

        return originalSend.call(this, data);
      };
    }

    next();
  };
}

/**
 * Security Headers Middleware
 * Sets security headers to prevent common attacks
 */
function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://unpkg.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://toncenter.com https://tonapi.io; " +
    "frame-ancestors 'none';"
  );

  // Permissions Policy (formerly Feature-Policy)
  res.setHeader('Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  next();
}

/**
 * CORS Middleware
 * Only allow trusted origins
 */
function corsPolicy(req, res, next) {
  const allowedOrigins = [
    'https://fas-tap-mining.vercel.app',
    'https://t.me',
    process.env.WEBAPP_URL
  ].filter(Boolean);

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).send();
  }

  next();
}

/**
 * Request Sanitization
 * Sanitize input to prevent injection attacks
 */
function sanitizeInput(req, res, next) {
  // Sanitize function - remove dangerous characters
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove NULL bytes
      let clean = obj.replace(/\0/g, '');

      // Remove control characters except newlines and tabs
      clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

      // Limit length to prevent DOS
      if (clean.length > 10000) {
        clean = clean.substring(0, 10000);
      }

      return clean;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip proto pollution
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          logger.warn('Potential prototype pollution attempt', {
            key,
            path: req.path,
            ip: req.ip
          });
          continue;
        }
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }

    return obj;
  };

  // Sanitize body, query, params
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
}

/**
 * IP Blacklist Middleware
 * Block known malicious IPs
 */
const blacklistedIPs = new Set();

function ipBlacklist(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;

  if (blacklistedIPs.has(ip)) {
    logger.error('Blacklisted IP attempted access', {
      ip,
      path: req.path,
      method: req.method
    });

    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  next();
}

/**
 * Add IP to blacklist
 */
function blacklistIP(ip) {
  blacklistedIPs.add(ip);
  logger.warn('IP added to blacklist', { ip });
}

/**
 * Request Logger Middleware
 * Log all requests for audit trail
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;

    const logLevel = res.statusCode >= 500 ? 'error' :
                     res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
}

/**
 * HTTPS Enforcement Middleware
 * Redirect HTTP to HTTPS in production
 */
function enforceHttps(req, res, next) {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Check x-forwarded-proto header (set by Vercel/reverse proxies)
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;

  if (protocol !== 'https') {
    logger.warn('HTTP request redirected to HTTPS', {
      path: req.path,
      ip: req.ip
    });

    // Redirect to HTTPS
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }

  next();
}

/**
 * Request Size Limit Middleware
 * Prevent memory exhaustion attacks
 */
function requestSizeLimit(req, res, next) {
  const maxSize = 10 * 1024; // 10KB max request size
  let receivedBytes = 0;

  req.on('data', (chunk) => {
    receivedBytes += chunk.length;

    if (receivedBytes > maxSize) {
      logger.warn('Request size limit exceeded', {
        path: req.path,
        ip: req.ip,
        size: receivedBytes
      });

      req.pause();
      res.status(413).json({
        success: false,
        error: 'Request entity too large'
      });
      req.connection.destroy();
    }
  });

  next();
}

module.exports = {
  rateLimit,
  securityHeaders,
  corsPolicy,
  sanitizeInput,
  ipBlacklist,
  blacklistIP,
  requestLogger,
  enforceHttps,
  requestSizeLimit
};
