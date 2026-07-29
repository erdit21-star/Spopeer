// Updated
/**
 * JWT Authentication Middleware
 * Supports HttpOnly cookie auth (preferred) with Bearer token fallback.
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');

const AUTH_USER_ATTRIBUTES = [
  'id',
  'email',
  'password',
  'role',
  'isActive',
  'emailVerified',
  'firstName',
  'lastName',
  'displayName',
  'avatarUrl',
  'sport',
  'subscription'
];

function getAccessSecret() {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_ACCESS_SECRET or JWT_SECRET must be set in production');
  }
  return secret;
}

function getRefreshSecret() {
  // Prefer dedicated refresh secret, but gracefully fall back to access/general secret
  // to avoid hard login failures in partially configured environments.
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_REFRESH_SECRET or JWT_SECRET must be set in production');
  }
  return secret;
}

/**
 * Extract token from cookies (preferred) or Authorization header (fallback).
 */
function extractToken(req) {
  // Prefer HttpOnly cookie
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }
  // Fallback to Bearer header (backward compat / mobile clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

/**
 * Verify JWT token and attach user to request
 */
async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication required.',
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' }
      });
    }

    const decoded = jwt.verify(token, getAccessSecret(), { algorithms: ['HS256'] });
    const user = await User.findByPk(decoded.userId, {
      attributes: AUTH_USER_ATTRIBUTES
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_INVALID',
        message: 'Invalid session.',
        error: { code: 'AUTH_INVALID', message: 'Invalid session.' }
      });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Session expired. Please log in again.',
        error: { code: 'TOKEN_EXPIRED', message: 'Session expired. Please log in again.' }
      });
    }

    return res.status(401).json({
      success: false,
      code: 'AUTH_INVALID',
      message: 'Invalid session.',
      error: { code: 'AUTH_INVALID', message: 'Invalid session.' }
    });
  }
}

/**
 * Optional auth - attaches user if token exists, but doesn't block
 */
async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = jwt.verify(token, getAccessSecret(), { algorithms: ['HS256'] });
      const user = await User.findByPk(decoded.userId, {
        attributes: AUTH_USER_ATTRIBUTES
      });
      if (user && user.isActive) {
        req.user = user;
        req.userId = user.id;
      }
    }
  } catch (err) {
    // Token invalid - continue without user
    console.debug('optionalAuth: token verification failed', err.message);
  }
  next();
}

/**
 * Generate access token (15 minutes — matches cookie maxAge)
 */
function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    getAccessSecret(),
    { expiresIn: '15m' }
  );
}

/**
 * Generate longer-lived refresh token (7 days)
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user.id, type: 'refresh', jti: crypto.randomBytes(16).toString('hex') },
    getRefreshSecret(),
    { expiresIn: '7d' }
  );
}

/**
 * Legacy token generator (backward compat — use generateAccessToken for new code)
 */
function generateToken(user) {
  return generateAccessToken(user);
}

/**
 * Cookie options helper
 */
function getCookieOptions(maxAgeMs) {
  const isProd = process.env.NODE_ENV === 'production';
  const configuredSameSite = String(process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
  const sameSite = configuredSameSite === 'none' || configuredSameSite === 'lax' || configuredSameSite === 'strict'
    ? configuredSameSite
    : 'lax';
  const secure = isProd || configuredSameSite === 'none';
  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: maxAgeMs
  };
  if (isProd && process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }
  return options;
}

/**
 * Set auth cookies on response
 */
function setAuthCookies(res, user) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  res.cookie('access_token', accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie('refresh_token', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
  return { accessToken, refreshToken };
}

/**
 * Clear auth cookies on response
 */
function clearAuthCookies(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const configuredSameSite = String(process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
  const sameSite = configuredSameSite === 'none' || configuredSameSite === 'lax' || configuredSameSite === 'strict'
    ? configuredSameSite
    : 'lax';
  const secure = isProd || configuredSameSite === 'none';
  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: '/'
  };
  if (isProd && process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }
  res.clearCookie('access_token', options);
  res.clearCookie('refresh_token', options);
  res.clearCookie('csrf_token', {
    httpOnly: false,
    secure,
    sameSite,
    path: '/'
  });
}

module.exports = {
  authenticate,
  optionalAuth,
  generateToken,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getCookieOptions,
  extractToken
};

