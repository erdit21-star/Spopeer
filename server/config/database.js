// Updated
/**
 * Spopeer Database Configuration
 * Uses Sequelize ORM with PostgreSQL
 * Supports DATABASE_URL (production) or individual DB_* vars (development)
 */
const { Sequelize } = require('sequelize');
const { config: env } = require('./env');

const isProduction = env.nodeEnv === 'production';

const commonOpts = {
  dialect: 'postgres',
  logging: env.nodeEnv === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  ...(isProduction && {
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    }
  })
};

// Only use DATABASE_URL if it looks like a valid postgres:// connection string
const dbUrl = env.db.url && env.db.url.startsWith('postgres') ? env.db.url : null;

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

