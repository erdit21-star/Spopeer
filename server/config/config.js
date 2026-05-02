// Updated
/**
 * Sequelize CLI configuration.
 * Reads from the same env vars used by database.js.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const base = {
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'spopeer',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

module.exports = {
  development: { ...base },
  test: { ...base },
  production: {
    use_env_variable: process.env.DATABASE_URL_DIRECT ? 'DATABASE_URL_DIRECT' : 'DATABASE_URL',
    dialect: 'postgres',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '1', 10),
      min: parseInt(process.env.DB_POOL_MIN || '0', 10),
      acquire: Math.max(parseInt(process.env.DB_POOL_ACQUIRE || '60000', 10), 60000),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
      evict: parseInt(process.env.DB_POOL_EVICT || '2000', 10)
    },
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    }
  }
};
