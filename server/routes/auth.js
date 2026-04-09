// Updated
/**
 * Auth Routes
 * POST /api/auth/signup
 * POST /api/auth/login
 * POST /api/auth/logout
 * POST /api/auth/refresh
 * GET  /api/auth/me
 * POST /api/auth/change-password
 * POST /api/auth/forgot-password
 * POST /api/auth/reset-password
 * GET  /api/auth/verify
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User, PasswordResetToken, RefreshSession } = require('../models');
const { authenticate, clearAuthCookies, generateAccessToken, generateRefreshToken, getCookieOptions } = require('../middleware/auth');
const { ok, fail } = require('../utils/response');
const { sanitizePublicProfile } = require('../utils/privacy');
const { sha256 } = require('../utils/crypto');
const {
  sanitizeString,
  isValidEmail,
  isAllowedValue,
  normalizeUserRole,
  validatePassword,
  ALLOWED_ROLES
} = require('../utils/validation');
const { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail, sendSecurityAlertEmail } = require('../services/email');
const { Op } = require('sequelize');
const { issueCsrfToken, csrfProtection } = require('../middleware/csrf');
const requireCsrf = csrfProtection();
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  validate
} = require('../utils/schemas');
const { createLimiter } = require('../services/rateLimiter');

// Signup abuse limiter
const isTest = process.env.NODE_ENV === 'test';

const signupLimiter = createLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, error: { code: 'RATE_LIMIT_SIGNUP', message: 'Too many signup attempts, please try again later.' } }
});

// Login abuse limiter — 10 attempts per 15 minutes per IP
const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, error: { code: 'RATE_LIMIT_LOGIN', message: 'Too many login attempts, please try again later.' } }
});

// Forgot-password limiter — 5 requests per hour per IP
const forgotLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, error: { code: 'RATE_LIMIT_FORGOT', message: 'Too many reset requests. Please try again later.' } }
});

// Reset-password limiter — 10 attempts per 15 min per IP
const resetLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, error: { code: 'RATE_LIMIT_RESET', message: 'Too many reset attempts. Please try again later.' } }
});

// Temporary request logger for auth routes — masks sensitive fields.
router.use((req, res, next) => {
  try {
    const safeBody = { ...(req.body || {}) };
    if (safeBody.password) safeBody.password = '***MASKED***';
    if (safeBody.newPassword) safeBody.newPassword = '***MASKED***';
    console.info(`[AUTH] ${req.method} ${req.path} body=${JSON.stringify(safeBody)} ua=${req.get('user-agent') || ''}`);
  } catch (e) {
    console.warn('[AUTH] Request logging failed:', e && e.message);
  }
  next();
});

// ─── CSRF TOKEN ───
router.get('/csrf', (req, res) => {
  const token = issueCsrfToken(req, res);
  return ok(res, { csrfToken: token });
});

// ─── SIGNUP ───
router.post('/signup', signupLimiter, validate(signupSchema), async (req, res) => {
  try {
    const email = sanitizeString(req.body.email, 254).toLowerCase();
    const password = req.body.password;
    const firstName = sanitizeString(req.body.firstName, 100);
    const lastName = sanitizeString(req.body.lastName, 100);
    const role = sanitizeString(req.body.role, 50);
    const sport = sanitizeString(req.body.sport || '', 100) || null;
    const profession = sanitizeString(req.body.profession || '', 200) || null;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return fail(res, 400, 'VALIDATION_REQUIRED_FIELDS', 'Email, password, first name, and last name are required.');
    }

    if (!isValidEmail(email)) {
      return fail(res, 400, 'VALIDATION_EMAIL', 'Invalid email address.');
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return fail(res, 400, 'VALIDATION_PASSWORD', pwCheck.message);
    }

    // Normalize legacy role and prevent admin signup via API.
    const incomingRole = normalizeUserRole(role);

    if (incomingRole === 'admin') {
      return fail(res, 403, 'FORBIDDEN_ADMIN_SIGNUP', 'Admin signup is not allowed.');
    }

    if (incomingRole && !isAllowedValue(incomingRole, ALLOWED_ROLES)) {
      return fail(res, 400, 'VALIDATION_ROLE', `Invalid role. Allowed roles: ${ALLOWED_ROLES.join(', ')}.`);
    }

    const safeRole = incomingRole;

    // Check if user exists
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return fail(res, 409, 'EMAIL_EXISTS', 'Email already registered.');
    }

    // Create user (active immediately; email verification is optional enhancement)
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role: safeRole || 'athlete',
      sport: sport || null,
      profession: profession || null,
      isActive: true
    });

    // Generate verification token and send email (optional — does not block signup)
    try {
      const verifyToken = crypto.randomBytes(32).toString('hex');
      await user.update({ emailVerifyToken: sha256(verifyToken), emailVerified: false });
      sendVerificationEmail(user.email, verifyToken).catch(err => {
        console.error('Failed to send verification email:', err.message);
      });
    } catch (verifyErr) {
      console.error('[SIGNUP] emailVerifyToken update failed (column may not exist):', verifyErr.message);
    }

    // Issue DB-backed session so the user can use the app immediately (MODEL B — verification optional)
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    if (process.env.NODE_ENV === 'production') {
      await RefreshSession.create({
        userId: user.id,
        tokenHash: sha256(refreshToken),
        userAgent: req.get('user-agent') || null,
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    } else {
      try {
        await RefreshSession.create({
          userId: user.id,
          tokenHash: sha256(refreshToken),
          userAgent: req.get('user-agent') || null,
          ipAddress: req.ip,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
      } catch (sessionErr) {
        console.error('[SIGNUP] RefreshSession.create failed (table may not exist):', sessionErr.message);
      }
    }

    res.cookie('access_token', accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(201).json({
      success: true,
      data: {
        message: 'Account created successfully. A verification email has been sent.',
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.name === 'SequelizeValidationError') {
      return fail(res, 400, 'VALIDATION', error.errors.map(e => e.message).join(', '));
    }
    fail(res, 500, 'SERVER_ERROR', 'Server error during signup.');
  }
});

// ─── LOGIN ───
router.post('/login', loginLimiter, validate(loginSchema), async (req, res, next) => {
  const requestId = req.requestId || 'n/a';
  let stage = 'start';
  try {
    stage = 'validate_input';
    const { email, password } = req.body;

    if (!email || !password) {
      return fail(res, 400, 'VALIDATION_REQUIRED_FIELDS', 'Email and password are required.');
    }

    stage = 'user_lookup';
    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      attributes: ['id', 'email', 'password', 'role', 'isActive']
    });

    if (!user) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    stage = 'status_check';
    if (user.isActive === false) {
      return fail(res, 403, 'ACCOUNT_DEACTIVATED', 'Account has been deactivated.');
    }

    // Support legacy passwordHash column during migration transition
    stage = 'password_prepare';
    const storedHash = user.password || user.getDataValue('passwordHash');
    if (!storedHash) {
      console.error('[LOGIN] No password hash found for user:', user.email);
      return fail(res, 500, 'ACCOUNT_MISCONFIGURED', 'Account password is misconfigured. Please reset your password.');
    }

    stage = 'password_check';
    const validPassword = await user.validatePassword(password);
    if (!validPassword) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    // Fetch optional profile columns separately so legacy schema gaps do not block auth.
    let firstName = null;
    let lastName = null;
    let emailVerified = true; // assume verified for legacy accounts
    let avatarUrl = null;
    let sport = null;
    let lastLogin = null;
    try {
      stage = 'profile_fetch';
      const profile = await User.findOne({
        where: { id: user.id },
        attributes: ['firstName', 'lastName', 'emailVerified', 'avatarUrl', 'sport', 'lastLogin']
      });

      if (profile) {
        firstName = profile.firstName ?? null;
        lastName = profile.lastName ?? null;
        emailVerified = profile.emailVerified ?? true;
        avatarUrl = profile.avatarUrl ?? null;
        sport = profile.sport ?? null;
        lastLogin = profile.lastLogin ?? null;
      }
    } catch (profileErr) {
      console.warn(`[LOGIN] requestId=${requestId} stage=profile_fetch optional columns fetch failed:`, profileErr.message);
      stage = 'post_profile_fetch';
    }

    // Update last login (guarded — column may not yet exist in legacy DBs)
    try {
      stage = 'last_login_update';
      await user.update({ lastLogin: new Date() });
    } catch (lastLoginErr) {
      console.warn('[LOGIN] lastLogin update failed (column may not exist):', lastLoginErr.message);
    }

    let token;
    try {
      stage = 'token_generation';
      token = generateAccessToken(user);
    } catch (tokenErr) {
      console.error('[LOGIN] Token generation failed:', tokenErr.message);
      return fail(res, 500, 'TOKEN_GENERATION_FAILED', 'Login succeeded but session could not be created. Please contact support.');
    }

    // Issue DB-backed refresh session (safe: do not crash on failure)
    stage = 'session_write';
    const refreshToken = generateRefreshToken(user);
    try {
      await RefreshSession.create({
        userId: user.id,
        tokenHash: sha256(refreshToken),
        userAgent: req.get('user-agent') || null,
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    } catch (err) {
      console.error('[LOGIN] RefreshSession failed:', err.message);
      clearAuthCookies(res);
      return fail(
        res,
        503,
        'SESSION_UNAVAILABLE',
        'Session store unavailable. Please try again in a moment.'
      );
    }

    res.cookie('access_token', token, getCookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    stage = 'response';
    res.json({
      success: true,
      data: {
        message: 'Login successful.',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          userType: user.role,
          isActive: user.isActive,
          firstName,
          lastName,
          displayName: user.displayName || [firstName, lastName].filter(Boolean).join(' ') || email,
          emailVerified,
          avatarUrl,
          sport,
          lastLogin
        }
      }
    });
  } catch (error) {
    // Log detailed context then forward to central error handler
    console.error('[LOGIN] Error:', {
      requestId,
      stage,
      message: error.message,
      name: error.name,
      stack: error.stack,
      email: req.body?.email,
      ip: req.ip,
      ua: req.get('user-agent')
    });
    return next(error);
  }
});

// ─── GET CURRENT USER ───
router.get('/me', authenticate, async (req, res) => {
  try {
    return ok(res, { user: req.user.toJSON() });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch user.');
  }
});

// ─── CHANGE PASSWORD (authenticated) ───
router.post('/change-password', authenticate, requireCsrf, validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return fail(res, 400, 'VALIDATION_REQUIRED_FIELDS', 'Current password and new password are required.');
    }
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return fail(res, 400, 'VALIDATION_PASSWORD', pwCheck.message);
    }

    // Re-fetch with password hash
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'password'],
    });
    if (!user) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }

    const valid = await user.validatePassword(currentPassword);
    if (!valid) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Current password is incorrect.');
    }

    await user.update({ password: newPassword }); // beforeUpdate hook hashes it

    // Revoke ALL refresh sessions for this user (force re-login on all devices)
    await RefreshSession.update(
      { revokedAt: new Date() },
      { where: { userId: req.userId, revokedAt: null } }
    );

    // Invalidate sessions by clearing cookies
    clearAuthCookies(res);

    // Notify user of password change (fire-and-forget)
    const fullUser = await User.findByPk(req.userId, { attributes: ['email'] });
    if (fullUser) {
      sendSecurityAlertEmail(fullUser.email, 'Password Changed', 'Your password was successfully changed. If you did not make this change, please reset your password immediately.').catch(err => {
        console.error('Security alert email error:', err);
      });
    }

    return ok(res, { message: 'Password updated successfully. Please log in again.' });
  } catch (error) {
    console.error('Change password error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Failed to change password.');
  }
});

// ─── GET USER BY EMAIL ───
router.get('/user-by-email', authenticate, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return fail(res, 400, 'VALIDATION_REQUIRED_FIELDS', 'Email query parameter is required.');
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase(), isActive: true },
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }

    return ok(res, { user: sanitizePublicProfile(req.user, user.toJSON()) });
  } catch (error) {
    fail(res, 500, 'SERVER_ERROR', 'Failed to fetch user.');
  }
});

// ─── FORGOT PASSWORD ───
router.post('/forgot-password', forgotLimiter, validate(forgotPasswordSchema), async (req, res) => {
  try {
    const email = sanitizeString(req.body.email, 254).toLowerCase();
    if (!email || !isValidEmail(email)) {
      return fail(res, 400, 'VALIDATION_EMAIL', 'Valid email is required.');
    }

    const user = await User.findOne({ where: { email } });
    // Always return 200 — never reveal if email exists
    if (!user) {
      return ok(res, { message: 'If that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(token);

    // Remove any existing tokens for this user, then store the hashed token
    await PasswordResetToken.destroy({ where: { userId: user.id } });
    await PasswordResetToken.create({
      userId: user.id,
      token: tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    });

    // Send the raw token in the email (user clicks it, server hashes to compare)
    await sendPasswordResetEmail(user.email, token);

    return ok(res, { message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Server error.');
  }
});

// ─── RESET PASSWORD ───
router.post('/reset-password', resetLimiter, validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return fail(res, 400, 'VALIDATION_REQUIRED_FIELDS', 'Token and new password are required.');
    }
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return fail(res, 400, 'VALIDATION_PASSWORD', pwCheck.message);
    }

    const tokenHash = sha256(token);
    const record = await PasswordResetToken.findOne({
      where: {
        token: tokenHash,
        expiresAt: { [Op.gt]: new Date() }
      }
    });
    if (!record) {
      return fail(res, 400, 'TOKEN_INVALID', 'Reset link is invalid or has expired.');
    }

    const user = await User.findByPk(record.userId);
    if (!user) {
      return fail(res, 400, 'NOT_FOUND', 'User not found.');
    }

    await user.update({ password });
    await PasswordResetToken.destroy({ where: { userId: record.userId } }); // one-time use

    // Revoke all refresh sessions (password changed externally)
    await RefreshSession.update(
      { revokedAt: new Date() },
      { where: { userId: record.userId, revokedAt: null } }
    );

    // Notify user of password reset (fire-and-forget)
    sendSecurityAlertEmail(user.email, 'Password Reset', 'Your password was reset via a reset link. If you did not initiate this, contact support immediately.').catch(err => {
      console.error('Security alert email error:', err);
    });

    return ok(res, { message: 'Password updated. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Server error.');
  }
});

// ─── RESEND VERIFICATION EMAIL ───
router.post('/resend-verification', forgotLimiter, async (req, res) => {
  try {
    const email = sanitizeString(req.body.email, 254).toLowerCase();
    if (!email || !isValidEmail(email)) {
      return fail(res, 400, 'VALIDATION_EMAIL', 'Valid email is required.');
    }

    const user = await User.findOne({ where: { email } });
    // Always return 200 — never reveal if email exists
    // MODEL B: verification is optional — resend only if not already verified
    if (!user || user.emailVerified) {
      return ok(res, { message: 'If that account needs verification, a new link has been sent.' });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    await user.update({ emailVerifyToken: sha256(verifyToken) });

    sendVerificationEmail(user.email, verifyToken).catch(err => {
      console.error('Failed to resend verification email:', err.message);
    });

    return ok(res, { message: 'If that account needs verification, a new link has been sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Server error.');
  }
});

// ─── VERIFY EMAIL ───
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return fail(res, 400, 'VALIDATION_REQUIRED_FIELDS', 'Token required.');

    const tokenHash = sha256(token);
    const user = await User.findOne({ where: { emailVerifyToken: tokenHash } });
    if (!user) {
      return fail(res, 400, 'TOKEN_INVALID', 'Invalid or expired verification link.');
    }

    await user.update({ isActive: true, emailVerifyToken: null, emailVerified: true });

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail(user.email, user.firstName).catch(err => {
      console.error('Welcome email error:', err);
    });

    // Redirect to login with success indicator
    res.redirect('/pages/auth/login.html?verified=1');
  } catch (error) {
    console.error('Verify error:', error);
    fail(res, 500, 'SERVER_ERROR', 'Verification failed.');
  }
});

// ─── LOGOUT ───
router.post('/logout', requireCsrf, async (req, res) => {
  try {
    const rawToken = req.cookies?.refresh_token;
    if (rawToken) {
      const tokenHash = sha256(rawToken);
      await RefreshSession.update(
        { revokedAt: new Date() },
        { where: { tokenHash, revokedAt: null } }
      );
    }

    clearAuthCookies(res);
    return ok(res, { message: 'Logged out successfully.' });
  } catch (error) {
    clearAuthCookies(res);
    return ok(res, { message: 'Logged out successfully.' });
  }
});

// ─── REFRESH TOKEN ───
router.post('/refresh', requireCsrf, async (req, res) => {
  try {
    const rawToken = req.cookies?.refresh_token;
    if (!rawToken) {
      return fail(res, 401, 'AUTH_REQUIRED', 'No refresh token provided.');
    }

    let decoded;
    try {
      decoded = jwt.verify(rawToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      clearAuthCookies(res);
      return fail(res, 401, 'TOKEN_INVALID', 'Invalid or expired refresh token.');
    }

    if (decoded.type !== 'refresh') {
      clearAuthCookies(res);
      return fail(res, 401, 'TOKEN_INVALID', 'Invalid token type.');
    }

    // Verify DB-backed session exists and is not revoked
    const tokenHash = sha256(rawToken);
    let session;
    try {
      session = await RefreshSession.findOne({
        where: { tokenHash, revokedAt: null }
      });
    } catch (sessionErr) {
      console.error('[REFRESH] RefreshSession lookup failed:', sessionErr.message);
      clearAuthCookies(res);
      return fail(res, 401, 'TOKEN_INVALID', 'Refresh session unavailable.');
    }

    if (!session || session.expiresAt <= new Date()) {
      clearAuthCookies(res);
      return fail(res, 401, 'TOKEN_INVALID', 'Refresh session not found or expired.');
    }

    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      clearAuthCookies(res);
      return fail(res, 401, 'AUTH_INVALID', 'User not found or deactivated.');
    }

    // Issue rotated tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    try {
      await RefreshSession.create({
        userId: user.id,
        tokenHash: sha256(newRefreshToken),
        userAgent: req.get('user-agent') || null,
        ipAddress: req.ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    } catch (sessionErr) {
      console.error('[REFRESH] RefreshSession.create failed:', sessionErr.message);
      clearAuthCookies(res);
      return fail(
        res,
        503,
        'SESSION_UNAVAILABLE',
        'Session refresh unavailable. Please log in again shortly.'
      );
    }

    // Revoke old session only after new session persisted
    try {
      await session.update({ revokedAt: new Date() });
    } catch (err) {
      console.debug('refresh: old session revoke failed', err.message);
    }

    res.cookie('access_token', newAccessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', newRefreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    return ok(res, { message: 'Token refreshed.' });
  } catch (error) {
    console.error('Refresh token error:', error);
    clearAuthCookies(res);
    fail(res, 500, 'SERVER_ERROR', 'Failed to refresh token.');
  }
});

module.exports = router;

