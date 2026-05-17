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
const { OAuth2Client } = require('google-auth-library');
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
  ALLOWED_ROLES,
  calculateAge
} = require('../utils/validation');
const {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendSecurityAlertEmail,
  verifyEmailPreferenceToken
} = require('../services/email');
const { Op } = require('sequelize');
const { config: env } = require('../config/env');
const { issueCsrfToken, csrfProtection } = require('../middleware/csrf');
const { verifyCaptchaMiddleware } = require('../middleware/captcha');
const { getEffectivePlan } = require('../utils/subscription-plans');
// Test flag (used to relax middleware in tests)
const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';
const requireEmailVerification = isProd || String(process.env.REQUIRE_EMAIL_VERIFICATION || 'false').toLowerCase() === 'true';
const emailVerifyTtlHours = parseInt(process.env.EMAIL_VERIFY_TOKEN_HOURS || '24', 10);

function getRefreshSecret() {
  if (process.env.NODE_ENV === 'production') {
    return process.env.JWT_REFRESH_SECRET;
  }
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
}

function isMissingEmailVerifyExpiryColumn(error) {
  const msg = String((error && error.message) || '');
  return /emailVerifyExpiresAt|email_verify_expires_at/i.test(msg);
}

// Do not enforce CSRF during unit tests to keep test requests simple
const requireCsrf = isTest ? (req, res, next) => next() : csrfProtection();
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

// Google OAuth limiter — 20 attempts per 15 min per IP
const googleLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  message: { success: false, error: { code: 'RATE_LIMIT_GOOGLE', message: 'Too many Google sign-in attempts. Please try again later.' } }
});

// Initialize Google OAuth client
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      err.code = 'TIMEOUT';
      reject(err);
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

async function withRetries(factory, retries, label) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await factory();
    } catch (error) {
      lastError = error;
      const message = (error && error.message) || '';
      const retryable = isTransientDbError(error) || (error && error.code === 'TIMEOUT');

      if (!retryable || attempt === retries) {
        throw error;
      }

      console.warn(`[GOOGLE_AUTH] retrying ${label} (${attempt + 1}/${retries}) after: ${message}`);
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }

  throw lastError;
}

function buildAuthUserPayload(user) {
  const plan = getEffectivePlan(user);
  const firstName = user.firstName ?? null;
  const lastName = user.lastName ?? null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    userType: user.role,
    firstName,
    lastName,
    displayName: user.displayName || [firstName, lastName].filter(Boolean).join(' ') || user.email,
    avatarUrl: user.avatarUrl ?? null,
    sport: user.sport ?? null,
    username: user.username ?? null,
    subscription: plan.coarseSubscription,
    subscriptionPlanCode: plan.code,
    subscriptionPlanLabel: plan.label,
    subscriptionTier: plan.tier,
    subscriptionFeatures: plan.features
  };
}

function isTransientDbError(error) {
  const message = String((error && error.message) || '');
  const code = String((error && error.code) || '');
  return (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    /ECHECKOUTTIMEOUT|ConnectionAcquireTimeout|SequelizeConnectionAcquireTimeoutError|timeout|terminating connection/i.test(message)
  );
}

// Minimal auth request logger (no request body logging).
router.use((req, res, next) => {
  const startedAt = Date.now();
  console.info(`[AUTH] ${req.method} ${req.path} ua=${req.get('user-agent') || ''}`);

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.info(`[AUTH] ${req.method} ${req.path} -> ${res.statusCode} (${durationMs}ms)`);
  });

  next();
});

// ─── CSRF TOKEN ───
router.get('/csrf', (req, res) => {
  const token = issueCsrfToken(req, res);
  return ok(res, { csrfToken: token });
});

// ─── PUBLIC AUTH CONFIG ───
router.get('/google-config', (_req, res) => {
  return ok(res, {
    enabled: !!env.googleClientId,
    clientId: env.googleClientId || ''
  });
});

// ─── SIGNUP ───
router.post('/signup', signupLimiter, requireCsrf, verifyCaptchaMiddleware, validate(signupSchema), async (req, res) => {
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
    const existing = await User.findOne({
      where: { email: email.toLowerCase() },
      attributes: ['id']
    });
    if (existing) {
      return fail(res, 409, 'EMAIL_EXISTS', 'Email already registered.');
    }

    // Create user. In production (or when explicitly enabled), users must verify email first.
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      dateOfBirth: req.validated.dateOfBirth || null,
      role: safeRole || 'athlete',
      sport: sport || null,
      profession: profession || null,
      isActive: !requireEmailVerification,
      // GDPR: Record consent timestamps
      privacyPolicyAcceptedAt: new Date(),
      termsOfServiceAcceptedAt: new Date(),
      marketingConsentAt: req.body.marketingConsent ? new Date() : null
    });

    // Generate verification token and send email (optional — does not block signup)
    let emailSent = null;
    try {
      const verifyToken = crypto.randomBytes(32).toString('hex');
      try {
        await user.update({
          emailVerifyToken: sha256(verifyToken),
          emailVerifyExpiresAt: new Date(Date.now() + (Number.isFinite(emailVerifyTtlHours) ? emailVerifyTtlHours : 24) * 60 * 60 * 1000),
          emailVerified: false
        });
      } catch (updateErr) {
        if (!isMissingEmailVerifyExpiryColumn(updateErr)) {
          throw updateErr;
        }
        await user.update({ emailVerifyToken: sha256(verifyToken), emailVerified: false });
      }
      try {
        const emailRes = await sendVerificationEmail(user.email, verifyToken);
        emailSent = !!(emailRes && emailRes.success);
        if (!emailSent) console.error('[SIGNUP] verification email send returned failure:', emailRes && emailRes.error);
      } catch (emailErr) {
        emailSent = false;
        console.error('[SIGNUP] Failed to send verification email:', emailErr && emailErr.message);
      }
    } catch (verifyErr) {
      console.error('[SIGNUP] emailVerifyToken update failed (column may not exist):', verifyErr && verifyErr.message);
    }

    if (!requireEmailVerification) {
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

      try {
        issueCsrfToken(req, res);
      } catch (err) {
        console.debug('issueCsrfToken failed on signup:', err && err.message);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        message: requireEmailVerification
          ? 'Account created successfully. Please verify your email before signing in.'
          : 'Account created successfully. A verification email has been sent.',
        user: buildAuthUserPayload(user),
        emailSent: emailSent === null ? null : !!emailSent
      }
    });
  } catch (error) {
    console.error('[SIGNUP] Error:', {
      message: error && error.message,
      name: error && error.name,
      stack: error && error.stack,
      requestId: req.requestId
    });
    if (error && error.name === 'SequelizeValidationError') {
      return fail(res, 400, 'VALIDATION', error.errors.map(e => e.message).join(', '));
    }
    return fail(res, 500, 'SERVER_ERROR', 'Server error during signup.');
  }
});

// Register alias to keep backend route naming consistent with /api/auth/register.
router.post('/register', (req, res, next) => {
  req.url = '/signup';
  return router.handle(req, res, next);
});

// ─── LOGIN ───
router.post('/login', loginLimiter, requireCsrf, validate(loginSchema), async (req, res, next) => {
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
      // Keep login compatible with older DB schemas that may not yet have optional profile columns.
      attributes: ['id', 'email', 'password', 'role', 'isActive', 'emailVerified', 'firstName', 'lastName']
    });

    if (!user) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    stage = 'status_check';
    if (user.isActive === false) {
      const emailVerified = (typeof user.getDataValue === 'function' ? user.getDataValue('emailVerified') : user.emailVerified);
      if (requireEmailVerification && emailVerified !== true) {
        return fail(res, 403, 'EMAIL_NOT_VERIFIED', 'Please verify your email address before signing in.');
      }
      return fail(res, 403, 'ACCOUNT_DEACTIVATED', 'Account has been deactivated.');
    }

    stage = 'password_check';
    const validPassword = await user.validatePassword(password);
    if (!validPassword) {
      return fail(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const firstName = user.firstName ?? null;
    const lastName = user.lastName ?? null;
    const emailVerified = (typeof user.getDataValue === 'function' ? user.getDataValue('emailVerified') : user.emailVerified) ?? true;
    const avatarUrl = (typeof user.getDataValue === 'function' ? user.getDataValue('avatarUrl') : user.avatarUrl) ?? null;
    const sport = (typeof user.getDataValue === 'function' ? user.getDataValue('sport') : user.sport) ?? null;
    const lastLogin = (typeof user.getDataValue === 'function' ? user.getDataValue('lastLogin') : user.lastLogin) ?? null;

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

    // RefreshSession is mandatory — without it the user will be silently logged out after 15 min
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
      console.error('[LOGIN] RefreshSession.create failed — cannot complete login safely:', err.message);
      return fail(res, 503, 'SESSION_UNAVAILABLE', 'Login succeeded but session could not be stored. Please try again.');
    }

    res.cookie('access_token', token, getCookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    // Ensure client receives a CSRF cookie immediately after login.
    try {
      issueCsrfToken(req, res);
    } catch (err) {
      console.debug('issueCsrfToken failed on login:', err && err.message);
    }

    stage = 'response';
    res.json({
      success: true,
      data: {
        message: 'Login successful.',
        user: {
          ...buildAuthUserPayload(user),
          isActive: user.isActive,
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
      message: error && error.message,
      name: error && error.name,
      stack: error && error.stack,
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
    const u = req.user;
    return ok(res, { user: buildAuthUserPayload(u) });
  } catch (error) {
    console.error('[GET-USER-BY-EMAIL] Error:', { message: error && error.message, stack: error && error.stack, requestId: req.requestId });
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch user.');
  }
});

router.get('/profile', authenticate, async (req, res) => {
  try {
    const u = req.user;
    return ok(res, { user: buildAuthUserPayload(u) });
  } catch (error) {
    console.error('[GET-PROFILE] Error:', { message: error && error.message, stack: error && error.stack, requestId: req.requestId });
    return fail(res, 500, 'SERVER_ERROR', 'Failed to fetch profile.');
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

    // Re-fetch with only the fields required for password update flow.
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
    const userEmail = req.user?.email
      || (await User.findByPk(req.userId, { attributes: ['email'] }))?.email
      || null;
    if (userEmail) {
      sendSecurityAlertEmail(userEmail, 'Password Changed', 'Your password was successfully changed. If you did not make this change, please reset your password immediately.').catch(err => {
        console.error('Security alert email error:', err);
      });
    }

    return ok(res, { message: 'Password updated successfully. Please log in again.' });
  } catch (error) {
    console.error('[CHANGE-PASSWORD] Error:', { message: error && error.message, stack: error && error.stack, requestId: req.requestId });
    return fail(res, 500, 'SERVER_ERROR', 'Failed to change password.');
  }
});

// ─── EMAIL MARKETING PREFERENCES ───
router.post('/marketing-preferences', authenticate, requireCsrf, async (req, res) => {
  try {
    const marketingEmails = req.body?.marketingEmails;
    if (typeof marketingEmails !== 'boolean') {
      return fail(res, 400, 'VALIDATION', 'marketingEmails must be a boolean.');
    }

    const updates = {
      marketingConsentAt: marketingEmails ? (req.user?.marketingConsentAt || new Date()) : null
    };

    await User.update(updates, { where: { id: req.userId } });
    return ok(res, {
      marketingEmails,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MARKETING-PREFERENCES] Error:', { message: error && error.message, requestId: req.requestId });
    return fail(res, 500, 'SERVER_ERROR', 'Failed to update marketing preferences.');
  }
});

// ─── ONE-CLICK UNSUBSCRIBE ───
router.get('/unsubscribe', async (req, res) => {
  try {
    const token = String(req.query?.token || '');
    const verified = verifyEmailPreferenceToken(token, 'unsubscribe');
    if (!verified || !verified.email) {
      return fail(res, 400, 'TOKEN_INVALID', 'Unsubscribe link is invalid or expired.');
    }

    const user = await User.findOne({ where: { email: verified.email }, attributes: ['id', 'email', 'marketingConsentAt'] });
    if (!user) {
      return ok(res, { message: 'You have been unsubscribed from marketing emails.' });
    }

    if (user.marketingConsentAt) {
      await user.update({ marketingConsentAt: null });
    }

    return ok(res, { message: 'You have been unsubscribed from marketing emails.' });
  } catch (error) {
    console.error('[UNSUBSCRIBE] Error:', { message: error && error.message, requestId: req.requestId });
    return fail(res, 500, 'SERVER_ERROR', 'Failed to process unsubscribe request.');
  }
});

// ─── AGE GATING: REQUEST VERIFICATION (ADMIN-ONLY) ───
router.post('/request-age-verification', authenticate, requireCsrf, async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Only admins can request age verification
    if (req.user?.role !== 'admin') {
      return fail(res, 403, 'FORBIDDEN', 'Only admins can request age verification.');
    }

    if (!userId) {
      return fail(res, 400, 'VALIDATION_REQUIRED_FIELDS', 'userId is required.');
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'firstName', 'dateOfBirth', 'ageVerificationRequired', 'ageVerificationStatus']
    });

    if (!user) {
      return fail(res, 404, 'NOT_FOUND', 'User not found.');
    }

    // Mark user as requiring age verification
    await user.update({
      ageVerificationRequired: true,
      ageVerificationStatus: 'pending',
      ageVerificationRequestedAt: new Date()
    });

    // Notify user via email (fire-and-forget)
    sendSecurityAlertEmail(
      user.email,
      'Age Verification Required',
      `We require age verification for your account. Please update your profile with valid identification.`
    ).catch(err => {
      console.error('[AGE-VERIFICATION] Email notification error:', err);
    });

    return ok(res, {
      message: 'Age verification requested.',
      user: {
        id: user.id,
        email: user.email,
        ageVerificationRequired: true,
        ageVerificationStatus: 'pending',
        ageVerificationRequestedAt: user.ageVerificationRequestedAt
      }
    });
  } catch (error) {
    console.error('[REQUEST-AGE-VERIFICATION] Error:', { message: error && error.message, requestId: req.requestId });
    return fail(res, 500, 'SERVER_ERROR', 'Failed to request age verification.');
  }
});

// ─── AGE GATING: SUBMIT VERIFICATION (USER) ───
router.post('/verify-age', authenticate, requireCsrf, async (req, res) => {
  try {
    const { dateOfBirth } = req.body;

    if (!dateOfBirth) {
      return fail(res, 400, 'VALIDATION_REQUIRED_FIELDS', 'dateOfBirth is required.');
    }

    const dobDate = new Date(dateOfBirth);
    if (isNaN(dobDate.getTime())) {
      return fail(res, 400, 'VALIDATION', 'Invalid date format.');
    }

    // Verify age is 18+
    const age = calculateAge(dobDate);
    if (age === null || age < 18) {
      return fail(res, 403, 'AGE_GATE_FAILED', 'You must be at least 18 years old to use this service.');
    }

    // Update user
    await User.update(
      {
        dateOfBirth: dobDate,
        ageVerificationRequired: false,
        ageVerificationStatus: 'verified'
      },
      { where: { id: req.userId } }
    );

    return ok(res, {
      message: 'Age verified successfully.',
      ageVerificationStatus: 'verified'
    });
  } catch (error) {
    console.error('[VERIFY-AGE] Error:', { message: error && error.message, requestId: req.requestId });
    return fail(res, 500, 'SERVER_ERROR', 'Failed to verify age.');
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
router.post('/forgot-password', forgotLimiter, verifyCaptchaMiddleware, validate(forgotPasswordSchema), async (req, res) => {
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
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });

    // Respond immediately — don't make the client wait for SMTP
    ok(res, { message: 'If that email exists, a reset link has been sent.' });

    // Send email in background (fire-and-forget)
    sendPasswordResetEmail(user.email, token).then(emailResult => {
      if (!emailResult || emailResult.success === false) {
        console.error('[FORGOT-PASSWORD] Email send failed:', { to: user.email, error: emailResult && emailResult.error, requestId: req.requestId });
      } else {
        console.log('[FORGOT-PASSWORD] Reset email sent to:', user.email, '| Message ID:', emailResult.id);
      }
    }).catch(err => {
      console.error('[FORGOT-PASSWORD] Email send threw:', { to: user.email, message: err && err.message, requestId: req.requestId });
    });
  } catch (error) {
    console.error('[FORGOT-PASSWORD] Error:', { message: error && error.message, stack: error && error.stack, requestId: req.requestId });
    return fail(res, 500, 'SERVER_ERROR', 'Server error.');
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
    console.error('[RESET-PASSWORD] Error:', { message: error && error.message, stack: error && error.stack, requestId: req.requestId });
    return fail(res, 500, 'SERVER_ERROR', 'Server error.');
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
    try {
      await user.update({
        emailVerifyToken: sha256(verifyToken),
        emailVerifyExpiresAt: new Date(Date.now() + (Number.isFinite(emailVerifyTtlHours) ? emailVerifyTtlHours : 24) * 60 * 60 * 1000)
      });
    } catch (updateErr) {
      if (!isMissingEmailVerifyExpiryColumn(updateErr)) {
        throw updateErr;
      }
      await user.update({ emailVerifyToken: sha256(verifyToken) });
    }

    sendVerificationEmail(user.email, verifyToken).catch(err => {
      console.error('Failed to resend verification email:', err.message);
    });

    return ok(res, { message: 'If that account needs verification, a new link has been sent.' });
  } catch (error) {
    console.error('[RESEND-VERIFICATION] Error:', { message: error && error.message, stack: error && error.stack, requestId: req.requestId });
    return fail(res, 500, 'SERVER_ERROR', 'Server error.');
  }
});

// ─── VERIFY EMAIL ───
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return fail(res, 400, 'VALIDATION_REQUIRED_FIELDS', 'Token required.');

    const tokenHash = sha256(token);
    let user;
    try {
      user = await User.findOne({
        where: {
          emailVerifyToken: tokenHash,
          [Op.or]: [
            { emailVerifyExpiresAt: null },
            { emailVerifyExpiresAt: { [Op.gt]: new Date() } }
          ]
        }
      });
    } catch (lookupErr) {
      if (!isMissingEmailVerifyExpiryColumn(lookupErr)) {
        throw lookupErr;
      }
      user = await User.findOne({ where: { emailVerifyToken: tokenHash } });
    }
    if (!user) {
      return fail(res, 400, 'TOKEN_INVALID', 'Invalid or expired verification link.');
    }

    try {
      await user.update({
        isActive: true,
        emailVerifyToken: null,
        emailVerifyExpiresAt: null,
        emailVerified: true
      });
    } catch (updateErr) {
      if (!isMissingEmailVerifyExpiryColumn(updateErr)) {
        throw updateErr;
      }
      await user.update({ isActive: true, emailVerifyToken: null, emailVerified: true });
    }

    // Send welcome email and surface failures in production by appending a flag.
    let welcomeOk = null;
    try {
      const welcomeRes = await sendWelcomeEmail(user.email, user.firstName);
      welcomeOk = !!(welcomeRes && welcomeRes.success);
      if (!welcomeOk) console.error('[VERIFY] welcome email send returned failure:', welcomeRes && welcomeRes.error);
    } catch (welErr) {
      welcomeOk = false;
      console.error('[VERIFY] Welcome email error:', welErr && welErr.message);
    }

    // Redirect to login with success indicator; if welcome email failed in production, add email=error
    const redirectUrl = welcomeOk === false && isProd
      ? '/pages/auth/login.html?verified=1&email=error'
      : '/pages/auth/login.html?verified=1';

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('[VERIFY] Error:', { message: error && error.message, stack: error && error.stack, requestId: req.requestId });
    return fail(res, 500, 'SERVER_ERROR', 'Verification failed.');
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
      decoded = jwt.verify(rawToken, getRefreshSecret(), { algorithms: ['HS256'] });
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

// ─── GOOGLE OAUTH ───
router.post('/google', googleLimiter, async (req, res) => {
  try {
    if (!googleClient) {
      return fail(res, 503, 'NOT_CONFIGURED', 'Google authentication is not configured.');
    }

    const requestedGoogleVerifyTimeoutMs = parseInt(process.env.GOOGLE_VERIFY_TIMEOUT_MS || '10000', 10);
    const requestedAuthDbTimeoutMs = parseInt(process.env.AUTH_DB_OP_TIMEOUT_MS || '8000', 10);
    const googleVerifyTimeoutMs = Number.isFinite(requestedGoogleVerifyTimeoutMs) ? requestedGoogleVerifyTimeoutMs : 10000;
    // Keep this below pool.acquire (10000) so app-level timeout handles errors first.
    const authDbTimeoutMs = Math.min(Number.isFinite(requestedAuthDbTimeoutMs) ? requestedAuthDbTimeoutMs : 8000, 9000);
    const googleVerifyRetries = parseInt(process.env.GOOGLE_VERIFY_RETRIES || '1', 10);
    const authDbRetries = parseInt(process.env.AUTH_DB_OP_RETRIES || '1', 10);
    console.info(`[GOOGLE_AUTH] effective timeouts verify=${googleVerifyTimeoutMs}ms db=${authDbTimeoutMs}ms retries verify=${googleVerifyRetries} db=${authDbRetries}`);

    const { credential } = req.body;
    if (!credential) {
      return fail(res, 400, 'VALIDATION', 'Google credential token is required.');
    }

    const ticket = await withRetries(
      () => withTimeout(
        googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID
        }),
        googleVerifyTimeoutMs,
        'google.verifyIdToken'
      ),
      googleVerifyRetries,
      'google.verifyIdToken'
    );
    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture: avatarUrl } = payload;

    if (!email) {
      return fail(res, 400, 'VALIDATION', 'Google account has no email.');
    }

    let user = await withRetries(
      () => withTimeout(
        User.findOne({
          where: { email: email.toLowerCase() },
          attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'avatarUrl', 'emailVerified', 'isActive', 'googleId']
        }),
        authDbTimeoutMs,
        'auth.google.findUser'
      ),
      authDbRetries,
      'auth.google.findUser'
    );

    // Create new user or link Google ID
    if (!user) {
      user = await withRetries(
        () => withTimeout(
          User.create({
            firstName: firstName || 'User',
            lastName: lastName || '',
            email: email.toLowerCase(),
            googleId,
            avatarUrl: avatarUrl || null,
            role: 'athlete',
            emailVerified: true,
            isActive: true,
            password: null
          }),
          authDbTimeoutMs,
          'auth.google.createUser'
        ),
        authDbRetries,
        'auth.google.createUser'
      );
    } else if (!user.googleId) {
      // Link Google ID to existing account (non-blocking)
      withRetries(
        () => withTimeout(
          user.update({
            googleId,
            avatarUrl: user.avatarUrl || avatarUrl || null,
            emailVerified: true
          }),
          authDbTimeoutMs,
          'auth.google.linkGoogleId'
        ),
        authDbRetries,
        'auth.google.linkGoogleId'
      ).catch((linkErr) => {
        console.error('[GOOGLE_AUTH] googleId link failed (non-fatal):', linkErr && linkErr.message ? linkErr.message : linkErr);
      });
    }

    if (!user.isActive) {
      return fail(res, 403, 'ACCOUNT_INACTIVE', 'This account has been deactivated.');
    }

    // Generate tokens.
    const refreshToken = generateRefreshToken(user);
    const refreshTokenHash = sha256(refreshToken);
    const accessToken = generateAccessToken(user);

    // Send curated user object (no passwords, tokens, or internal fields)
    const curatedUser = {
      ...buildAuthUserPayload(user),
      emailVerified: user.emailVerified
    };

    const responsePayload = {
      message: 'Signed in with Google',
      user: curatedUser
    };

    // Persist refresh session first. Do not set cookies unless this succeeds.
    try {
      await withRetries(
        () => withTimeout(
          RefreshSession.create({
            userId: user.id,
            tokenHash: refreshTokenHash,
            userAgent: req.get('user-agent') || null,
            ipAddress: req.ip,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }),
          authDbTimeoutMs,
          'auth.google.createRefreshSession'
        ),
        authDbRetries,
        'auth.google.createRefreshSession'
      );
    } catch (sessionErr) {
      console.error('[GOOGLE_AUTH] RefreshSession.create failed — aborting login:', sessionErr && sessionErr.message ? sessionErr.message : sessionErr);
      return fail(res, 503, 'SESSION_UNAVAILABLE', 'Sign-in succeeded but session could not be stored. Please try again.');
    }

    // Session is persisted: now set auth cookies and CSRF token.
    res.cookie('access_token', accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
    issueCsrfToken(req, res);

    ok(res, responsePayload);
    return;
  } catch (error) {
    console.error('[GOOGLE_AUTH] failed', {
      message: error && error.message,
      code: error && error.code,
      name: error && error.name,
      stack: error && error.stack
    });
    if (error && error.code === 'TIMEOUT') {
      return fail(res, 503, 'AUTH_TIMEOUT', 'Google sign-in timed out. Please try again.');
    }
    if (error.message && error.message.includes('Invalid token')) {
      return fail(res, 401, 'INVALID_TOKEN', 'Google token is invalid or expired.');
    }
    return fail(res, 400, 'GOOGLE_AUTH_ERROR', 'Google sign-in failed.');
  }
});

module.exports = router;

