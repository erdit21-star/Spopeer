// Updated
/**
 * Spopeer Backend Server
 * Entry point — imports the Express app and starts the HTTP listener.
 */
const { validate: validateEnv, config: env } = require('./config/env');
validateEnv();

const http = require('http');
const app = require('./app');
const { sequelize, testConnection } = require('./config/database');
const { initSocket } = require('./services/socket');
const { assertEmailReady } = require('./services/email');

const server = http.createServer(app);
const PORT = env.port;

// Initialize Socket.io
initSocket(server);

// ─── START SERVER ───
async function startServer() {
  try {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Spopeer Server running on http://0.0.0.0:${PORT}`);
    });

    try {
      assertEmailReady();
    } catch (e) {
      console.warn('⚠️ Email not configured:', e.message);
    }

    testConnection()
      .then(() => {
        console.log('✅ Database connection verified.');
      })
      .catch((error) => {
        console.warn('⚠️ Database connection failed after server start:', error.message);
      });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// ─── GRACEFUL SHUTDOWN ───
function gracefulShutdown(signal) {
  console.log(`\n⏳ ${signal} received — shutting down gracefully...`);
  server.close(async () => {
    try {
      await sequelize.close();
      console.log('✅ Database connections closed.');
    } catch (err) {
      console.error('Error closing database:', err);
    }
    process.exit(0);
  });
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000).unref();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

