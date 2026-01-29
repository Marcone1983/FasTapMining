/**
 * Cryptographic Helper Functions
 * Enterprise-grade security utilities
 */

const crypto = require('crypto');

/**
 * Timing-safe string comparison
 * Prevents timing attacks on secret comparison
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - True if strings match
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  // If lengths don't match, compare against dummy buffer to maintain constant time
  if (bufA.length !== bufB.length) {
    // Create dummy buffer of same length to maintain timing
    const dummy = Buffer.alloc(bufA.length);
    crypto.timingSafeEqual(bufA, dummy);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generate secure random token
 *
 * @param {number} length - Length of token in bytes (default: 32)
 * @returns {string} - Hex-encoded random token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a string with SHA-256
 *
 * @param {string} input - String to hash
 * @returns {string} - Hex-encoded hash
 */
function sha256(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

module.exports = {
  timingSafeEqual,
  generateSecureToken,
  sha256
};
