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

const testConfig = process.env.DATABASE_URL
  ? {
      use_env_variable: 'DATABASE_URL',
      dialect: 'postgres'
    }
  : {
      dialect: 'postgres',
      host: process.env.DB_TEST_HOST || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_TEST_PORT || process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_TEST_NAME || 'spopeer_test',
      username: process.env.DB_TEST_USER || process.env.DB_USER || 'postgres',
      password: process.env.DB_TEST_PASSWORD || process.env.DB_PASSWORD || 'postgres'
    };

module.exports = {
  development: { ...base },
  test: testConfig,
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
