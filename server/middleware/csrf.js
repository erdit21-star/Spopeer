const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

function getCsrfCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSite = process.env.COOKIE_SAME_SITE || 'lax';
  const secure = sameSite === 'none' ? true : isProd;
  return {
    httpOnly: false,
    secure,
    sameSite,
    path: '/'
  };
}

function issueCsrfToken(req, res) {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  if (existing) {
    return existing;
  }
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  return token;
}

function csrfProtection(options = {}) {
  const exemptPaths = options.exemptPaths || [];
  return function csrfMiddleware(req, res, next) {
    if (!MUTATING_METHODS.has(req.method)) {
      return next();
    }

    const isExempt = exemptPaths.some((prefix) => req.path.startsWith(prefix));
    if (isExempt) {
      return next();
    }

    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.get(CSRF_HEADER_NAME);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_INVALID',
          message: 'CSRF validation failed. Refresh and try again.'
        }
      });
    }

    return next();
  };
}

module.exports = {
  csrfProtection,
  issueCsrfToken,
  CSRF_COOKIE_NAME
};
