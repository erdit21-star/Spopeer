/**
 * Sentry integration for production error monitoring.
 *
 * Setup:
 *   1. npm install @sentry/node (in server/)
 *   2. Set SENTRY_DSN in your env / secrets
 *   3. This module is loaded in app.js
 *
 * If SENTRY_DSN is not set, all exports are no-ops — safe to import anywhere.
 */

let Sentry;
const isConfigured = !!process.env.SENTRY_DSN;

if (isConfigured) {
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      release: `spopeer@${process.env.npm_package_version || '1.0.0'}`,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      // Ignore expected errors
      ignoreErrors: [
        'TokenExpiredError',
        'JsonWebTokenError',
        'RATE_LIMIT'
      ]
    });
  } catch (err) {
    console.warn('[Sentry] Failed to initialize (@sentry/node may not be installed):', err.message);
    Sentry = null;
  }
}

/**
 * Capture an exception in Sentry (no-op if unconfigured).
 */
function captureException(err, context = {}) {
  if (Sentry) {
    Sentry.withScope(scope => {
      if (context.requestId) scope.setTag('requestId', context.requestId);
      if (context.userId) scope.setUser({ id: context.userId });
      if (context.extra) scope.setExtras(context.extra);
      Sentry.captureException(err);
    });
  }
}

/**
 * Capture a message in Sentry (no-op if unconfigured).
 */
function captureMessage(msg, level = 'warning') {
  if (Sentry) {
    Sentry.captureMessage(msg, level);
  }
}

/**
 * Express error-handler middleware that forwards errors to Sentry
 * before passing to the next error handler.
 */
function sentryErrorHandler(err, req, res, next) {
  captureException(err, {
    requestId: req.requestId,
    userId: req.userId,
    extra: { method: req.method, url: req.originalUrl }
  });
  next(err);
}

module.exports = {
  captureException,
  captureMessage,
  sentryErrorHandler,
  isConfigured
};
