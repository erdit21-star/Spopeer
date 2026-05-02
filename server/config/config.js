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
    use_env_variable: process.env.DATABASE_DIRECT_URL ? 'DATABASE_DIRECT_URL' : 'DATABASE_URL',
    dialect: 'postgres',
    pool: {
      max: 3,
      min: 0,
      acquire: 10000,
      idle: 5000,
      evict: 15000
    },
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
      keepAlive: true,
      options: '-c statement_timeout=25000'
    }
  }
};
