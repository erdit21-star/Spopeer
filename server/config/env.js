// Updated
/**
 * Environment configuration and validation.
 * Imported once at startup — fails fast on missing critical vars.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const REQUIRED = ['JWT_SECRET'];
const REQUIRED_IN_PRODUCTION = ['APP_URL', 'FRONTEND_URL']; // RESEND_API_KEY is Phase 2 (email)

// Used in validate() below
const _RECOMMENDED = [
  'DATABASE_URL',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];

function validate() {
  const missing = REQUIRED.filter(v => !process.env[v]);
  if (missing.length) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const hasDB = process.env.DATABASE_URL || process.env.DB_HOST;

  // In production, database config is mandatory
  if (isProduction && !hasDB) {
    console.error('Production requires DATABASE_URL or DB_HOST to be set.');
    process.exit(1);
  }

  if (isProduction) {
    const missingProduction = REQUIRED_IN_PRODUCTION.filter(v => !process.env[v]);
    if (missingProduction.length) {
      console.error('Production is missing required environment variables:', missingProduction.join(', '));
      process.exit(1);
    }
  }

  if (!hasDB) {
    console.warn('No database config found (DATABASE_URL or DB_HOST). Using defaults.');
  }
}

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`,
  frontendUrl: process.env.FRONTEND_URL || '',
  frontendUrlAlt: process.env.FRONTEND_URL_ALT || '',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'spopeer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    url: process.env.DATABASE_URL || null
  }
};

module.exports = { validate, config };
