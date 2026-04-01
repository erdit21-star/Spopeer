/**
 * Auth Routes
 * POST /api/auth/signup
 * POST /api/auth/login
 * GET  /api/auth/me
 * POST /api/auth/change-password
 * POST /api/auth/forgot-password
 * POST /api/auth/reset-password
 * GET  /api/auth/verify
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { User, PasswordResetToken } = require('../models');
const { authenticate, generateToken } = require('../middleware/auth');
const {
  sanitizeString,
  isValidEmail,
  isAllowedValue,
  normalizeUserRole,
  ALLOWED_ROLES
} = require('../utils/validation');
const { sendPasswordResetEmail, sendVerificationEmail, sendWelcomeEmail, sendSecurityAlertEmail } = require('../services/email');
const { Op } = require('sequelize');

// Signup abuse limiter
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts, please try again later.' }
});

// Login abuse limiter — 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
});

// Forgot-password limiter — 5 requests per hour per IP
const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again later.' }
});

// ─── SIGNUP ───
router.post('/signup', signupLimiter, async (req, res) => {
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
      return res.status(400).json({ error: 'Email, password, first name, and last name are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    if (password.length < 10 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be between 10 and 128 characters.' });
    }

    // Normalize legacy role and prevent admin signup via API.
    const incomingRole = normalizeUserRole(role);

    if (incomingRole === 'admin') {
      return res.status(403).json({
        error: 'Admin signup is not allowed.'
      });
    }

    if (incomingRole && !isAllowedValue(incomingRole, ALLOWED_ROLES)) {
      return res.status(400).json({
        error: `Invalid role. Allowed roles: ${ALLOWED_ROLES.join(', ')}.`
      });
    }

    const safeRole = incomingRole;

    // Check if user exists
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Create user (inactive until verified)
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role: safeRole || 'athlete',
      sport: sport || null,
      profession: profession || null,
      isActive: false,
      emailVerified: false
    });

    // Generate verification token and send email
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await user.update({ emailVerifyToken: verifyToken });

    // Fire-and-forget — don't block signup on email send
    sendVerificationEmail(user.email, verifyToken).catch(err => {
      console.error('Failed to send verification email:', err.message);
    });

    res.status(201).json({
      status: 'pending_verification',
      message: 'Account created. Please check your email to verify your account.',
      token: null,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: error.errors.map(e => e.message).join(', ') });
    }
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

// ─── LOGIN ───
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      attributes: ['id', 'email', 'password', 'role', 'isActive', 'firstName', 'lastName']
    });

    // Fetch optional columns separately — they may not exist in legacy DBs.
    // This prevents a single missing column from blocking login entirely.
    let emailVerified = true; // assume verified for legacy accounts
    let avatarUrl = null;
    let sport = null;
    let lastLogin = null;
    if (user) {
      try {
        const extras = await User.findOne({
          where: { id: user.id },
          attributes: ['emailVerified', 'avatarUrl', 'sport', 'lastLogin']
        });
        if (extras) {
          emailVerified = extras.emailVerified ?? true;
          avatarUrl = extras.avatarUrl ?? null;
          sport = extras.sport ?? null;
          lastLogin = extras.lastLogin ?? null;
        }
      } catch (extrasErr) {
        console.warn('[LOGIN] Optional columns fetch failed (proceeding without):', extrasErr.message);
      }
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.isActive === false && emailVerified === false) {
      return res.status(403).json({
        error: 'Please verify your email address before logging in.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Account has been deactivated.' });
    }

    // Support legacy passwordHash column during migration transition
    const storedHash = user.password || user.getDataValue('passwordHash');
    if (!storedHash) {
      console.error('[LOGIN] No password hash found for user:', user.email);
      return res.status(500).json({ error: 'Account password is misconfigured. Please reset your password.' });
    }

    const validPassword = await user.validatePassword(password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update last login (guarded — column may not yet exist in legacy DBs)
    try {
      await user.update({ lastLogin: new Date() });
    } catch (lastLoginErr) {
      console.warn('[LOGIN] lastLogin update failed (column may not exist):', lastLoginErr.message);
    }

    let token;
    try {
      token = generateToken(user);
    } catch (tokenErr) {
      console.error('[LOGIN] Token generation failed:', tokenErr.message);
      return res.status(500).json({ error: 'Login succeeded but session could not be created. Please contact support.' });
    }

    res.json({
      status: 'ok',
      message: 'Login successful.',
      token,
      user: {
        ...user.toJSON(),
        emailVerified,
        avatarUrl,
        sport,
        lastLogin
      }
    });
  } catch (error) {
    console.error('[LOGIN] Error:', { message: error.message, name: error.name, stack: error.stack, email: req.body?.email });
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ─── GET CURRENT USER ───
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      status: 'ok',
      user: req.user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// ─── CHANGE PASSWORD (authenticated) ───
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: 'New password must be 8–128 characters.' });
    }

    // Re-fetch with password hash
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'password'],
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const valid = await user.validatePassword(currentPassword);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    await user.update({ password: newPassword }); // beforeUpdate hook hashes it

    // Notify user of password change (fire-and-forget)
    const fullUser = await User.findByPk(req.userId, { attributes: ['email'] });
    if (fullUser) {
      sendSecurityAlertEmail(fullUser.email, 'Password Changed', 'Your password was successfully changed. If you did not make this change, please reset your password immediately.').catch(err => {
        console.error('Security alert email error:', err);
      });
    }

    res.json({ status: 'ok', message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// ─── GET USER BY EMAIL ───
router.get('/user-by-email', authenticate, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email query parameter is required.' });
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase(), isActive: true },
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ status: 'ok', user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// ─── FORGOT PASSWORD ───
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  try {
    const email = sanitizeString(req.body.email, 254).toLowerCase();
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }

    const user = await User.findOne({ where: { email } });
    // Always return 200 — never reveal if email exists
    if (!user) {
      return res.json({ status: 'ok', message: 'If that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    // Remove any existing tokens for this user, then store the new one
    await PasswordResetToken.destroy({ where: { userId: user.id } });
    await PasswordResetToken.create({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    });

    await sendPasswordResetEmail(user.email, token);

    res.json({ status: 'ok', message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── RESET PASSWORD ───
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }
    if (password.length < 10 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be 10–128 characters.' });
    }

    const record = await PasswordResetToken.findOne({
      where: {
        token,
        expiresAt: { [Op.gt]: new Date() }
      }
    });
    if (!record) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
    }

    const user = await User.findByPk(record.userId);
    if (!user) {
      return res.status(400).json({ error: 'User not found.' });
    }

    await user.update({ password });
    await PasswordResetToken.destroy({ where: { userId: record.userId } }); // one-time use

    // Notify user of password reset (fire-and-forget)
    sendSecurityAlertEmail(user.email, 'Password Reset', 'Your password was reset via a reset link. If you did not initiate this, contact support immediately.').catch(err => {
      console.error('Security alert email error:', err);
    });

    res.json({ status: 'ok', message: 'Password updated. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── RESEND VERIFICATION EMAIL ───
router.post('/resend-verification', forgotLimiter, async (req, res) => {
  try {
    const email = sanitizeString(req.body.email, 254).toLowerCase();
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }

    const user = await User.findOne({ where: { email } });
    // Always return 200 — never reveal if email exists
    if (!user || user.emailVerified || user.isActive) {
      return res.json({ status: 'ok', message: 'If that account needs verification, a new link has been sent.' });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    await user.update({ emailVerifyToken: verifyToken });

    sendVerificationEmail(user.email, verifyToken).catch(err => {
      console.error('Failed to resend verification email:', err.message);
    });

    res.json({ status: 'ok', message: 'If that account needs verification, a new link has been sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── VERIFY EMAIL ───
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required.' });

    const user = await User.findOne({ where: { emailVerifyToken: token } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
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
    res.status(500).json({ error: 'Verification failed.' });
  }
});

module.exports = router;

