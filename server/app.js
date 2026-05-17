/**
 * Spopeer Express Application
 * Separated from server.js so tests can require(app) without starting the listener.
 */
require('./config/env');

// ─── PRODUCTION STARTUP GUARDS ───
if (process.env.NODE_ENV === 'production') {
  const hasAccessSecret = !!process.env.JWT_ACCESS_SECRET;
  const hasRefreshSecret = !!process.env.JWT_REFRESH_SECRET;
  if (!hasAccessSecret || !hasRefreshSecret) {
    console.error('FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required in production.');
    process.exit(1);
  }

  const required = ['FRONTEND_URL', 'APP_URL', 'EMAIL_FROM', 'CONTACT_TO_EMAIL'];
  const missingRequired = required.filter(k => !process.env[k]);
  if (missingRequired.length) {
    console.error(`FATAL: Missing required env vars in production: ${missingRequired.join(', ')}`);
    process.exit(1);
  }

  const missingCloudinary = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(k => !process.env[k]);
  if (missingCloudinary.length) {
    console.error(`FATAL: Missing required Cloudinary vars in production: ${missingCloudinary.join(', ')}`);
    process.exit(1);
  }
}

const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const { sequelize } = require('./config/database');
const { randomUUID } = require('crypto');
const logger = require('./utils/logger');
const { createLimiter } = require('./services/rateLimiter');

// Import models (initializes associations)
require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profile');
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
const storyRoutes = require('./routes/stories');
const ogRoutes = require('./routes/og.routes');
const securityRoutes = require('./routes/security');
const { getProfileCardDataBySlug } = require('./services/og/profile-card-data');

const errorHandler = require('./middleware/errorHandler');
const { sentryErrorHandler } = require('./services/sentry');
const { authenticate } = require('./middleware/auth');
const { requireAdmin } = require('./middleware/admin');
const { createPerUserLimiter } = require('./middleware/perUserRateLimiter');
const { csrfProtection } = require('./middleware/csrf');
const { requestLoggerMiddleware } = require('./middleware/requestLogger');
const { healthCheckMiddleware, readinessCheckMiddleware } = require('./middleware/healthCheck');

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
    logger.info({
      level: 'info',
      event: 'request_complete',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      userId: req.userId || null,
      ts: new Date().toISOString()
    });
  });
  next();
});

// ─── COOKIE PARSER ───
app.use(cookieParser());

// ─── COMPRESSION ───
app.use(compression());

// ─── ENVIRONMENT ───
const isProd = process.env.NODE_ENV === 'production';

// ─── SECURITY MIDDLEWARE ───
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://apis.google.com"],
      // scriptSrcAttr: unsafe-inline removed — disallows inline event handlers (onclick=, etc.)
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://accounts.google.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "https://accounts.google.com", "https://www.googleapis.com", "https://oauth2.googleapis.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com", "https://*.cloudinary.com"],
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
function normalizeOrigin(value) {
  return String(value || '').trim().replace(/\/+$/, '').toLowerCase();
}

const _localhostOrigins = process.env.NODE_ENV !== 'production'
  ? ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:3000']
  : [];

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.APP_URL,
  process.env.RENDER_EXTERNAL_URL,
  ..._localhostOrigins
]
  .filter(Boolean)
  .flatMap((v) => String(v).split(','))
  .map((o) => normalizeOrigin(o))
  .filter(Boolean);

const allowedOriginSet = new Set(allowedOrigins);
logger.info({ event: 'cors_allowed_origins', allowedOrigins });

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOriginSet.has(normalizedOrigin)) {
      return callback(null, true);
    }

    logger.warn({ event: 'cors_rejected_origin', origin, normalizedOrigin });
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

// Rate limiting
const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later.' } }
});

// Per-user limiter for actions that should be rate-limited per account rather than per IP.
const perUserWriteLimiter = createPerUserLimiter({ windowMs: 15 * 60 * 1000, max: parseInt(process.env.PER_USER_MAX || '60') });

const uploadLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { success: false, error: { code: 'RATE_LIMIT_UPLOAD', message: 'Upload limit reached. Try again later.' } }
});

const searchLimiter = createLimiter({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { success: false, error: { code: 'RATE_LIMIT_SEARCH', message: 'Too many searches. Please slow down.' } }
});

// ─── BODY PARSING ───
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const globalApiCsrf = csrfProtection({
  exemptPaths: [
    '/auth/csrf',
    '/auth/login',
    '/auth/signup',
    '/auth/register',
    '/auth/google',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/verify-email/request',
    '/auth/resend-verification',
    '/contact',
    '/reports',
    '/careers'
  ]
});

app.use('/api', (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  if (!MUTATING_METHODS.has(req.method)) return next();

  const hasCookieSession = Boolean(req.cookies?.access_token || req.cookies?.refresh_token);
  if (!hasCookieSession) return next();

  return globalApiCsrf(req, res, next);
});

// ─── METRICS (basic Prometheus text format) ───
const metrics = {
  startedAt: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
  authFailures: 0
};

app.use((req, res, next) => {
  metrics.totalRequests += 1;
  res.on('finish', () => {
    if (res.statusCode >= 500) metrics.totalErrors += 1;
    if (req.path.startsWith('/api/auth') && res.statusCode === 401) {
      metrics.authFailures += 1;
    }
  });
  next();
});

// ─── STATIC FILES ───
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── HEALTH & READINESS CHECKS ───
app.get('/health', healthCheckMiddleware);
app.get('/ready', readinessCheckMiddleware);
app.get('/metrics', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    metrics
  });
});

// ─── API ROUTES ───
app.use('/api/auth', authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/profiles', apiLimiter, userRoutes);
app.use('/api/profile', apiLimiter, profileRoutes);
app.use('/api/posts', apiLimiter, perUserWriteLimiter, postRoutes);
app.use('/api/connections', apiLimiter, connectionRoutes);
app.use('/api/messages', apiLimiter, perUserWriteLimiter, messageRoutes);
app.use('/api/admin', apiLimiter, authenticate, requireAdmin, adminRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/groups', apiLimiter, groupRoutes);
app.use('/api/marketplace', apiLimiter, marketplaceRoutes);
app.use('/api/forums', apiLimiter, forumRoutes);
app.use('/api/reels', apiLimiter, reelRoutes);
app.use('/api/follows', apiLimiter, perUserWriteLimiter, followRoutes);
app.use('/api/bookmarks', apiLimiter, perUserWriteLimiter, bookmarkRoutes);
app.use('/api/search', searchLimiter, searchRoutes);
app.use('/api/events', apiLimiter, perUserWriteLimiter, eventRoutes);
app.use('/api/media', uploadLimiter, mediaRoutes);
app.use('/api/sponsorships', apiLimiter, sponsorshipRoutes);
app.use('/api/moderation', apiLimiter, moderationRoutes);
app.use('/api/stories', apiLimiter, storyRoutes);
app.use('/api/og', apiLimiter, ogRoutes);
app.use('/api/security', apiLimiter, securityRoutes);
app.use('/api/contact',    apiLimiter, require('./routes/contact'));
app.use('/api/reports',    apiLimiter, require('./routes/reports'));
app.use('/api/careers',    apiLimiter, require('./routes/careers'));

app.get('/u/:slug', async (req, res) => {
  try {
    const profile = await getProfileCardDataBySlug(req.params.slug);

    if (!profile) {
      return res.status(404).send('Profile not found');
    }

    const siteUrl = process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || process.env.APP_URL || 'https://spopeer.onrender.com';
    const profileUrl = `${siteUrl}/u/${profile.publicSlug}`;
    const imageUrl = profile.ogImageUrl || `${siteUrl}/api/og/profile/${encodeURIComponent(profile.publicSlug)}.png`;
    const roleLabel = profile.sport || profile.userType || 'athlete';
    const title = `${profile.fullName} | ${roleLabel} | Spopeer`;
    const description = `Connect with ${profile.fullName} on Spopeer - passport to the world of sports.`;
    const frontendProfileUrl = `${siteUrl}/pages/profiles/public-profile.html?userId=${encodeURIComponent(profile.publicSlug)}`;

    const esc = (value) => String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

    return res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${esc(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="${esc(profileUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(imageUrl)}">
  <meta http-equiv="refresh" content="0; url=${esc(frontendProfileUrl)}">
</head>
<body>
  <a href="${esc(frontendProfileUrl)}">Open ${esc(profile.fullName)} on Spopeer</a>
  <script>window.location.replace(${JSON.stringify(frontendProfileUrl)});</script>
</body>
</html>`);
  } catch (error) {
    console.error('Public share route failed:', error);
    return res.status(500).send('Failed to load profile preview');
  }
});

// ─── SENTRY DEBUG (non-production only) ───
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug-sentry', (_req, _res) => {
    throw new Error('Sentry test error — verify this appears in Sentry dashboard');
  });
}

// ─── HEALTH CHECK ───
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }
  });
});

app.get('/api/metrics', authenticate, requireAdmin, (_req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - metrics.startedAt) / 1000);
  res.type('text/plain').send(
    [
      '# HELP spopeer_uptime_seconds Process uptime in seconds',
      '# TYPE spopeer_uptime_seconds gauge',
      `spopeer_uptime_seconds ${uptimeSeconds}`,
      '# HELP spopeer_requests_total Total HTTP requests',
      '# TYPE spopeer_requests_total counter',
      `spopeer_requests_total ${metrics.totalRequests}`,
      '# HELP spopeer_errors_total Total 5xx responses',
      '# TYPE spopeer_errors_total counter',
      `spopeer_errors_total ${metrics.totalErrors}`,
      '# HELP spopeer_auth_failures_total Total auth 401 responses',
      '# TYPE spopeer_auth_failures_total counter',
      `spopeer_auth_failures_total ${metrics.authFailures}`
    ].join('\n')
  );
});

// ─── READINESS CHECK ───
app.get('/api/ready', async (req, res) => {
  const checks = {
    database: 'unknown',
    authSchema: 'unknown',
    secrets: 'unknown',
    email: 'unknown',
    storage: 'unknown',
    appUrl: 'unknown'
  };
  let ready = true;

  // DB check
  try {
    await sequelize.authenticate();
    checks.database = 'ok';
  } catch (err) {
    console.debug('Health: DB check failed', err.message);
    checks.database = 'fail';
    ready = false;
  }

  // Auth schema check (required for login to work in production)
  if (checks.database === 'ok') {
    try {
      if (!sequelize || typeof sequelize.getQueryInterface !== 'function') {
        checks.authSchema = process.env.NODE_ENV === 'production' ? 'fail' : 'warn';
        if (process.env.NODE_ENV === 'production') ready = false;
        throw new Error('query interface unavailable');
      }
      const queryInterface = sequelize.getQueryInterface();
      const usersTable = await queryInterface.describeTable('users');
      const requiredUserColumns = ['id', 'email', 'password', 'role', 'isActive'];
      const missingUserColumns = requiredUserColumns.filter((col) => !usersTable[col]);

      await queryInterface.describeTable('refresh_sessions');
      await queryInterface.describeTable('password_reset_tokens');

      if (missingUserColumns.length > 0) {
        checks.authSchema = process.env.NODE_ENV === 'production' ? 'fail' : 'warn';
        if (process.env.NODE_ENV === 'production') ready = false;
      } else {
        checks.authSchema = 'ok';
      }
    } catch (err) {
      console.debug('Health: auth schema check failed', err.message);
      checks.authSchema = process.env.NODE_ENV === 'production' ? 'fail' : 'warn';
      if (process.env.NODE_ENV === 'production') ready = false;
    }
  } else {
    checks.authSchema = 'skip';
  }

  // Required secrets check
  const hasAccessSecret = !!(process.env.NODE_ENV === 'production' ? process.env.JWT_ACCESS_SECRET : (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET));
  const hasRefreshSecret = !!(process.env.NODE_ENV === 'production' ? process.env.JWT_REFRESH_SECRET : (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET));
  checks.secrets = hasAccessSecret && hasRefreshSecret ? 'ok' : 'fail';
  if (!hasAccessSecret || !hasRefreshSecret) ready = false;

  // Email provider check (fail only in production)
  const emailOk = !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.CONTACT_TO_EMAIL);
  checks.email = emailOk ? 'ok' : (process.env.NODE_ENV === 'production' ? 'fail' : 'warn');
  if (process.env.NODE_ENV === 'production' && !emailOk) ready = false;

  // Storage provider check
  const storageOk = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  checks.storage = storageOk ? 'ok' : (process.env.NODE_ENV === 'production' ? 'fail' : 'warn');
  if (process.env.NODE_ENV === 'production' && !storageOk) ready = false;

  // App URL check
  const hasAppUrls = !!(process.env.APP_URL && process.env.FRONTEND_URL);
  checks.appUrl = hasAppUrls ? 'ok' : (process.env.NODE_ENV === 'production' ? 'fail' : 'warn');
  if (process.env.NODE_ENV === 'production' && !hasAppUrls) ready = false;

  res.status(ready ? 200 : 503).json({
    success: ready,
    data: {
      status: ready ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString()
    }
  });
});

// ─── ADMIN DASHBOARD (serve HTML) ───
app.get('/admin', authenticate, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'admin', 'dashboard.html'));
});
app.get('/admin/{*rest}', authenticate, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'pages', 'admin', 'dashboard.html'));
});

// ─── CATCH-ALL: serve index.html for frontend routes ───
const ASSET_EXT = /\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot|map|json|txt|pdf|zip)$/i;
app.get('{*path}', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'API endpoint not found.' } });
  }
  // Return 404 for static asset requests so missing files are not silently served as index.html
  if (ASSET_EXT.test(req.path)) {
    return res.status(404).send('Not found.');
  }
  const filePath = path.join(__dirname, '..', 'public', req.path);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    }
  });
});

// ─── ERROR HANDLING ───
app.use(sentryErrorHandler);   // forwards to Sentry, then falls through
app.use(errorHandler);

module.exports = app;
