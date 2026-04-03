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
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    }
  }
};
