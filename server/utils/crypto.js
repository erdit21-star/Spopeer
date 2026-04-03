/**
 * Cryptographic helpers
 */
const crypto = require('crypto');

/**
 * SHA-256 hash of a string value (hex encoded).
 */
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

module.exports = { sha256 };
