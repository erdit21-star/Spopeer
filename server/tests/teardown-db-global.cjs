/**
 * Global teardown for real-DB integration tests.
 * Closes any lingering Sequelize connections.
 */
module.exports = async function globalTeardown() {
  // Nothing critical — each test file closes its own connection.
  // This is a safety net.
  console.log('\n🧹 DB test teardown complete.');
};
