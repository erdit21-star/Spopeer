// Updated
/**
 * Standardized API response helpers
 *
 * Success: { success: true, data: ..., pagination: ... }
 * Error:   { success: false, error: { code: '...', message: '...' } }
 *
 * Usage:  const { ok, fail } = require('../utils/response');
 *         return ok(res, data);
 *         return fail(res, 404, 'NOT_FOUND', 'User not found.');
 */

function ok(res, data, extra = {}) {
  return res.json({ success: true, ...extra, data });
}

function created(res, data, extra = {}) {
  return res.status(201).json({ success: true, ...extra, data });
}

function fail(res, statusCode, code, message) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    error: { code, message }
  });
}

module.exports = { ok, created, fail };
