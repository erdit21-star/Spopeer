/**
 * Spopeer Express Application
 * Separated from server.js so tests can require(app) without starting the listener.
 */
require('./config/env');

const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const { sequelize } = require('./config/database');
const { randomUUID } = require('crypto');

// Import models (initializes associations)
require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const connectionRoutes = require('./routes/connections');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const groupRoutes = require('./routes/groups');
const marketplaceRoutes = require('./routes/marketplace');
const forumRoutes = require('./routes/forums');
const reelRoutes = require('./routes/reels');
const followRoutes = require('./routes/follows');
const bookmarkRoutes = require('./routes/bookmarks');
const searchRoutes = require('./routes/search');
const eventRoutes = require('./routes/events');
const mediaRoutes = require('./routes/media');
const sponsorshipRoutes = require('./routes/sponsorships');
const moderationRoutes = require('./routes/moderation');

const errorHandler = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// ─── REQUEST ID MIDDLEWARE ───
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

// ─── REQUEST TIMING / OBSERVABILITY ───
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.log(JSON.stringify({
      level: 'info',
      event: 'request_complete',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      userId: req.userId || null,
      ts: new Date().toISOString()
    }));
  });
  next();
});

// ─── COOKIE PARSER ───
app.use(cookieParser());

// ─── COMPRESSION ───
app.use(compression());

// ─── SECURITY MIDDLEWARE ───
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://*.cloudinary.com"],
      connectSrc: ["'self'", "ws:", "wss:"],
      mediaSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS
const allowedOrigins = [
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5000',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_ALT
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached. Try again later.' }
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many searches. Please slow down.' }
});

// ─── BODY PARSING ───
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── STATIC FILES ───
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── API ROUTES ───
app.use('/api/auth', authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/posts', apiLimiter, postRoutes);
app.use('/api/connections', apiLimiter, connectionRoutes);
app.use('/api/messages', apiLimiter, messageRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/groups', apiLimiter, groupRoutes);
app.use('/api/marketplace', apiLimiter, marketplaceRoutes);
app.use('/api/forums', apiLimiter, forumRoutes);
app.use('/api/reels', apiLimiter, reelRoutes);
app.use('/api/follows', apiLimiter, followRoutes);
app.use('/api/bookmarks', apiLimiter, bookmarkRoutes);
app.use('/api/search', searchLimiter, searchRoutes);
app.use('/api/events', apiLimiter, eventRoutes);
app.use('/api/media', uploadLimiter, mediaRoutes);
app.use('/api/sponsorships', apiLimiter, sponsorshipRoutes);
app.use('/api/moderation', apiLimiter, moderationRoutes);

// ─── PROFILE ROUTES (frontend compatibility) ───
app.use('/api/profiles', apiLimiter, require('./routes/users'));

// ─── HEALTH CHECK ───
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// ─── READINESS CHECK ───
app.get('/api/ready', async (req, res) => {
  const checks = { database: 'unknown', secrets: 'unknown', email: 'unknown' };
  let ready = true;

  // DB check
  try {
    await sequelize.authenticate();
    checks.database = 'ok';
  } catch (_) {
    checks.database = 'fail';
    ready = false;
  }

  // Required secrets check
  const requiredSecrets = ['JWT_SECRET'];
  const missingSecrets = requiredSecrets.filter(v => !process.env[v]);
  checks.secrets = missingSecrets.length === 0 ? 'ok' : 'fail';
  if (missingSecrets.length) ready = false;

  // Email provider check (fail only in production)
  const emailOk = !!process.env.RESEND_API_KEY;
  checks.email = emailOk ? 'ok' : (process.env.NODE_ENV === 'production' ? 'fail' : 'warn');
  if (process.env.NODE_ENV === 'production' && !emailOk) ready = false;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString()
  });
});

// ─── ADMIN DASHBOARD (serve HTML) ───
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'admin', 'dashboard.html'));
});
app.get('/admin/{*rest}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'admin', 'dashboard.html'));
});

// ─── CATCH-ALL: serve index.html for frontend routes ───
app.get('{*path}', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  const filePath = path.join(__dirname, '..', 'public', req.path);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    }
  });
});

// ─── ERROR HANDLING ───
app.use(errorHandler);

module.exports = app;
