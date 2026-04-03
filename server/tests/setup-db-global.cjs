/**
 * Global setup for real-DB integration tests.
 * Runs migrations against the test database before any test file executes.
 */
const { execSync } = require('child_process');
const path = require('path');

module.exports = async function globalSetup() {
  // Ensure test env vars are set
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-db-tests';
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '5432';
  process.env.DB_NAME = process.env.DB_NAME || 'spopeer_test';
  process.env.DB_USER = process.env.DB_USER || 'postgres';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

  const serverDir = path.resolve(__dirname, '..');

  console.log('\n🗄️  Running migrations on test database...');
  try {
    execSync('npx sequelize-cli db:migrate', {
      cwd: serverDir,
      stdio: 'pipe',
      env: { ...process.env }
    });
    console.log('✅ Migrations complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err.stderr?.toString() || err.message);
    throw err;
  }
};
