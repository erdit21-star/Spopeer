// Updated
/**
 * Environment configuration and validation.
 * Imported once at startup — fails fast on missing critical vars.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const REQUIRED = [];
const REQUIRED_IN_PRODUCTION = ['APP_URL', 'FRONTEND_URL'];

function validate() {
  const missing = REQUIRED.filter(v => !process.env[v]);
  if (missing.length) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }

  const hasJwtSecret = !!(process.env.JWT_ACCESS_SECRET || process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  if (!hasJwtSecret) {
    console.error('Missing JWT secret configuration: set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET, or provide JWT_SECRET as fallback.');
    process.exit(1);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const hasDB = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL || process.env.DB_HOST;

  if (isProduction && !hasDB) {
    console.error('Production requires DATABASE_DIRECT_URL, DATABASE_URL, or DB_HOST to be set.');
    process.exit(1);
  }

  if (isProduction) {
    const hasAccessSecret = !!process.env.JWT_ACCESS_SECRET;
    const hasRefreshSecret = !!process.env.JWT_REFRESH_SECRET;
    const hasLegacySecret = !!process.env.JWT_SECRET;

    const missingProduction = REQUIRED_IN_PRODUCTION.filter(v => !process.env[v]);
    if (missingProduction.length) {
      console.error('Production is missing required environment variables:', missingProduction.join(', '));
      process.exit(1);
    }

    if ((!hasAccessSecret || !hasRefreshSecret) && !hasLegacySecret) {
      console.error('Production requires JWT_ACCESS_SECRET and JWT_REFRESH_SECRET, or a legacy JWT_SECRET fallback.');
      process.exit(1);
    }

    const missingEmail = ['EMAIL_FROM', 'CONTACT_TO_EMAIL'].filter(v => !process.env[v]);
    if (missingEmail.length) {
      console.error('Production is missing required email routing variables:', missingEmail.join(', '));
      process.exit(1);
    }

    const missingCloudinary = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].filter(v => !process.env[v]);
    if (missingCloudinary.length) {
      console.error('Production is missing required Cloudinary variables:', missingCloudinary.join(', '));
      process.exit(1);
    }

    // Require email service when mandatory email verification is enabled
    const emailVerifyEnabled =
      String(process.env.REQUIRE_EMAIL_VERIFICATION || 'false').toLowerCase() === 'true';
    if (emailVerifyEnabled && !process.env.RESEND_API_KEY) {
      console.error(
        'FATAL: REQUIRE_EMAIL_VERIFICATION=true in production but RESEND_API_KEY is not set.' +
        ' Users will not be able to verify their email. Set RESEND_API_KEY or disable REQUIRE_EMAIL_VERIFICATION.'
      );
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
  jwtAccessSecret: process.env.NODE_ENV === 'production' ? (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET) : (process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET),
  jwtRefreshSecret: process.env.NODE_ENV === 'production' ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) : (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  appUrl: process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`,
  frontendUrl: process.env.FRONTEND_URL || '',
  frontendUrlAlt: process.env.FRONTEND_URL_ALT || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'spopeer',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    directUrl: process.env.DATABASE_DIRECT_URL || null,
    url: process.env.DATABASE_URL || null
  }
};

module.exports = { validate, config };
