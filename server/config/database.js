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
  if (!rawUrl.startsWith('postgres')) return null;

  try {
    const parsed = new URL(rawUrl);
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

const commonOpts = {
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? console.log : false,
  pool: {
    max: isProduction ? 3 : 10,
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
      host: env.db.host,
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

