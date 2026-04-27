const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { User } = require('../models');
const { sequelize } = require('../config/database');
const { sendPasswordResetEmail } = require('../services/email');
const { JWT_SECRET } = process.env;

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.register = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Request body is missing. Set Content-Type: application/json header.' });
    }
    const { firstName, lastName, email, password, role } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ firstName, lastName, email: email.toLowerCase(), password: hash, role });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Request body is missing. Set Content-Type: application/json header.' });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email: email.toLowerCase() }, attributes: ['id', 'email', 'password', 'role', 'firstName', 'lastName', 'emailVerified'] });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    // For MVP, do not require emailVerified. If you want to enforce, uncomment below:
    // if (!user.emailVerified) return res.status(403).json({ error: 'Please verify your email before logging in.' });
    await User.update({ lastLogin: new Date() }, { where: { id: user.id } });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

exports.profile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential is required.' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture: avatarUrl } = payload;

    if (!email) return res.status(400).json({ error: 'Google account has no email.' });

    let user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      user = await User.create({
        firstName: firstName || 'User',
        lastName: lastName || '',
        email: email.toLowerCase(),
        googleId,
        avatarUrl: avatarUrl || null,
        role: 'athlete',
        emailVerified: true,
        password: null
      });
    } else if (!user.googleId) {
      await user.update({ googleId, avatarUrl: user.avatarUrl || avatarUrl || null, emailVerified: true });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } });
  } catch (err) {
    console.error('[Google Auth]', err.message);
    res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
};

// ─── Forgot Password ───
exports.forgotPassword = async (req, res) => {
  const GENERIC = 'If an account exists with this email, a reset link has been sent.';
  try {
    const { email } = req.body || {};
    if (!email) return res.json({ message: GENERIC });

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return res.json({ message: GENERIC });

    // Generate raw token; store SHA-256 hash in DB
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Remove any existing tokens for this user, then insert new one
    await sequelize.query(
      'DELETE FROM password_reset_tokens WHERE user_id = :userId',
      { replacements: { userId: user.id } }
    );
    await sequelize.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (:userId, :token, :expiresAt)',
      { replacements: { userId: user.id, token: tokenHash, expiresAt } }
    );

    await sendPasswordResetEmail(user.email, rawToken);
    res.json({ message: GENERIC });
  } catch (err) {
    console.error('[ForgotPassword]', err.message);
    // Always return generic message — never reveal whether email exists
    res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
  }
};

// ─── Reset Password ───
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required.' });
    }
    if (password.length < 10) {
      return res.status(400).json({ error: 'Password must be at least 10 characters.' });
    }
    if (password.length > 128) {
      return res.status(400).json({ error: 'Password is too long.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const [rows] = await sequelize.query(
      'SELECT * FROM password_reset_tokens WHERE token = :hash AND expires_at > NOW() LIMIT 1',
      { replacements: { hash: tokenHash } }
    );

    if (!rows.length) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired. Please request a new one.' });
    }

    const tokenRow = rows[0];
    const hash = await bcrypt.hash(password, 12);
    await User.update({ password: hash }, { where: { id: tokenRow.user_id } });
    await sequelize.query(
      'DELETE FROM password_reset_tokens WHERE id = :id',
      { replacements: { id: tokenRow.id } }
    );

    res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('[ResetPassword]', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
