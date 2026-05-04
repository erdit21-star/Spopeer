// Updated
/**
 * Spopeer Backend Server
 */
const { validate: validateEnv, config: env } = require('./config/env');
validateEnv();

const http = require('http');
const app = require('./app');
const { sequelize, testConnection } = require('./config/database');
const { initSocket } = require('./services/socket');
const { assertEmailReady } = require('./services/email');
const { runDatabaseRepairs } = require('./services/databaseRepair');

const server = http.createServer(app);
const PORT = env.port;

initSocket(server);

async function startServer() {
  try {
    try { assertEmailReady(); } catch (e) { console.warn('⚠️ Email not configured:', e.message); }

    // 🔥 CRITICAL FIX: ensure DB schema is correct before handling requests
    await runDatabaseRepairs(sequelize);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Spopeer Server running on http://0.0.0.0:${PORT}`);
    });

    testConnection().catch((error) => {
      console.warn('⚠️ Database connection check failed:', error && error.message ? error.message : error);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
