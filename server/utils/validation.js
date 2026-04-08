// Updated
/**
 * Shared validation helpers
 * Provides common sanitization and validation functions.
 *
 * NOTE: For a production app, integrate a library like Joi, Zod, or
 *       express-validator. These helpers give an immediate safety net.
 */
const { PUBLIC_USER_ROLES, LEGACY_ROLE_ALIASES } = require('./constants');

/**
 * Sanitize a string: trim, limit length, strip control chars.
 */
function sanitizeString(value, maxLength = 1000) {
  if (typeof value !== 'string') return '';
  // Remove control characters except newlines/tabs
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().substring(0, maxLength);
}

/**
 * Validate an email address (basic RFC 5322).
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * Validate pagination parameters, return bounded values.
 */
function parsePagination(query, defaults = {}) {
  const maxLimit = defaults.maxLimit || 100;
  const defaultLimit = defaults.limit || 20;
  const defaultPage = 1;

  let page = parseInt(query.page);
  let limit = parseInt(query.limit || query.pageSize);

  if (isNaN(page) || page < 1) page = defaultPage;
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  return { page, limit, offset: (page - 1) * limit };
}

/**
 * Validate that a value is in an allowed set.
 */
function normalizeUserRole(value) {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().toLowerCase();
  return LEGACY_ROLE_ALIASES[normalized] || normalized;
}

function isAllowedValue(value, allowedValues) {
  return allowedValues.includes(value);
}

/**
 * Validate a numeric ID.
 */
function isValidId(value) {
  const n = parseInt(value);
  return !isNaN(n) && n > 0 && n <= Number.MAX_SAFE_INTEGER;
}

/**
 * Validate a URL (basic check).
 */
function isValidUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate password strength.
 * Requires 10–128 chars, at least one uppercase, one lowercase, one digit.
 * Returns { valid: boolean, message?: string }.
 */
function validatePassword(pw) {
  if (typeof pw !== 'string') return { valid: false, message: 'Password is required.' };
  if (pw.length < 10 || pw.length > 128) return { valid: false, message: 'Password must be 10–128 characters.' };
  if (!/[A-Z]/.test(pw)) return { valid: false, message: 'Password must include at least one uppercase letter.' };
  if (!/[a-z]/.test(pw)) return { valid: false, message: 'Password must include at least one lowercase letter.' };
  if (!/[0-9]/.test(pw)) return { valid: false, message: 'Password must include at least one digit.' };
  return { valid: true };
}

/**
 * Allowed user roles.
 */
const ALLOWED_ROLES = PUBLIC_USER_ROLES;

module.exports = {
  sanitizeString,
  isValidEmail,
  parsePagination,
  isAllowedValue,
  isValidId,
  isValidUrl,
  normalizeUserRole,
  validatePassword,
  ALLOWED_ROLES
};
