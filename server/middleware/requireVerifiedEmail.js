/**
 * requireVerifiedEmail middleware
 *
 * Blocks write/authenticated actions until the account's email is verified.
 * Apply AFTER the `authenticate` middleware on any mutating route that
 * should not be accessible to unverified users.
 *
 * The check is skipped when:
 *   - NODE_ENV is 'test'
 *   - REQUIRE_EMAIL_VERIFICATION env var is not 'true' (and not in production)
 *
 * Allowed routes for unverified users (handled by auth.js directly):
 *   POST /api/auth/resend-verification
 *   GET  /api/auth/verify-email
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 *   POST /api/auth/refresh
 */

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const requireEmailVerification =
  isProd ||
  String(process.env.REQUIRE_EMAIL_VERIFICATION || 'false').toLowerCase() === 'true';

function requireVerifiedEmail(req, res, next) {
  // Skip in test mode or when feature is disabled
  if (isTest || !requireEmailVerification) return next();

  // User must be attached by authenticate() first
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_REQUIRED',
      error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' }
    });
  }

  const emailVerified =
    typeof req.user.getDataValue === 'function'
      ? req.user.getDataValue('emailVerified')
      : req.user.emailVerified;

  if (emailVerified !== true) {
    return res.status(403).json({
      success: false,
      code: 'EMAIL_NOT_VERIFIED',
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address to perform this action.'
      }
    });
  }

  next();
}

module.exports = { requireVerifiedEmail };
