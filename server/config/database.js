// Updated
/**
 * Spopeer Database Configuration
 * Uses Sequelize ORM with PostgreSQL
 * Supports DATABASE_URL (production) or individual DB_* vars (development)
 */
const { Sequelize } = require('sequelize');
const { config: env } = require('./env');

const isProduction = env.nodeEnv === 'production';
const poolMax = parseInt(process.env.DB_POOL_MAX || (isProduction ? '1' : '10'), 10);
const poolMin = parseInt(process.env.DB_POOL_MIN || '0', 10);
const rawPoolAcquire = parseInt(process.env.DB_POOL_ACQUIRE || (isProduction ? '60000' : '30000'), 10);
const poolAcquire = isProduction ? Math.max(rawPoolAcquire, 60000) : rawPoolAcquire;
const poolIdle = parseInt(process.env.DB_POOL_IDLE || '10000', 10);
const poolEvict = parseInt(process.env.DB_POOL_EVICT || '2000', 10);

const commonOpts = {
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? console.log : false,
  pool: {
    max: poolMax,
    min: poolMin,
    acquire: poolAcquire,
    idle: poolIdle,
    evict: poolEvict
  },
  retry: {
    max: parseInt(process.env.DB_RETRY_MAX || '2', 10)
  },
  ...(isProduction && {
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
      application_name: process.env.DB_APP_NAME || 'spopeer-server'
    }
  })
};

// Prefer a direct session connection string in production if provided.
// Useful when pooler/transaction-mode endpoints are saturated.
const preferredDbUrl = process.env.DATABASE_URL_DIRECT || env.db.url;

// Only use URL if it looks like a valid postgres:// connection string
const dbUrl = preferredDbUrl && preferredDbUrl.startsWith('postgres') ? preferredDbUrl : null;

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
    throw error;
  }
}

module.exports = { sequelize, testConnection };

