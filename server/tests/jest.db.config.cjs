/**
 * Jest config for real-DB integration tests.
 * Runs against a live Postgres instance (CI provides one via services).
 * No model/database mocks — tests hit real Sequelize + migrations.
 */
module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: ['<rootDir>/tests/**/*.db.test.js'],
  globalSetup: '<rootDir>/tests/setup-db-global.cjs',
  globalTeardown: '<rootDir>/tests/teardown-db-global.cjs',
  testTimeout: 30000
};
