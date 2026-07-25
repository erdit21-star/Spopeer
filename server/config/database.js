// Updated
/**
 * Spopeer Database Configuration
 * Uses Sequelize ORM with PostgreSQL
 * Supports DATABASE_URL (production) or individual DB_* vars (development)
 */
const { Sequelize } = require('sequelize');
const { URL } = require('url');
const { config: env } = require('./env');

const isProduction = env.nodeEnv === 'production';

function sanitizeDatabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const trimmed = rawUrl.trim();
  const marker = trimmed.search(/postgres(?:ql)?:\/\//i);
  if (marker < 0) return null;

  // Some providers/UI exports prepend labels (e.g. "tenant/user "), so extract URL part only.
  const candidate = trimmed.slice(marker).split(/\s+/)[0];

  try {
    const parsed = new URL(candidate);
    if (parsed.port === '6543') {
      console.warn('[DB] DATABASE_URL uses port 6543 (transaction pooler). Prefer direct 5432 URL for Sequelize.');
    }

    if (parsed.searchParams.has('pgbouncer')) {
      parsed.searchParams.delete('pgbouncer');
    }

    return parsed.toString();
  } catch (error) {
    console.warn('[DB] Invalid database URL provided:', error && error.message ? error.message : error);
    return null;
  }
}

function normalizeHost(rawHost) {
  if (!rawHost || typeof rawHost !== 'string') return rawHost;
  const trimmed = rawHost.trim();
  if (!trimmed) return trimmed;

  // Keep the final token if host was pasted with a label prefix.
  const token = trimmed.split(/\s+/).pop();

  // Accept plain hosts directly.
  if (!token.includes('://') && !token.includes('/')) {
    return token;
  }

  // If a URL-like string is supplied in DB_HOST, extract hostname.
  try {
    const maybeUrl = token.includes('://') ? token : `postgres://${token}`;
    const parsed = new URL(maybeUrl);
    return parsed.hostname || token;
  } catch (_error) {
    return token;
  }
}

const commonOpts = {
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? console.log : false,
  pool: {
    max: isProduction ? 10 : 10,
    min: 0,
    acquire: 10000,
    idle: 5000,
    evict: 15000
  },
  ...(isProduction && {
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
      keepAlive: true,
      options: '-c statement_timeout=25000',
      family: 4
    },
    keepAlive: true
  })
};

// Prefer direct DB URL to avoid transaction pooler checkout failures.
const preferredUrl = process.env.DATABASE_DIRECT_URL || env.db.url;
const dbUrl = sanitizeDatabaseUrl(preferredUrl);

const sequelize = dbUrl
  ? new Sequelize(dbUrl, commonOpts)
  : new Sequelize(env.db.name, env.db.user, env.db.password, {
      ...commonOpts,
      host: normalizeHost(env.db.host),
      port: env.db.port
    });

// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    // Keep the server alive; let runtime recover and requests retry.
  }
}

module.exports = { sequelize, testConnection };

