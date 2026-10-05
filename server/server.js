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
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const server = http.createServer(app);
const PORT = env.port;

initSocket(server);

async function startServer() {
  try {
    try { assertEmailReady(); } catch (e) { console.warn('⚠️ Email not configured:', e.message); }

    // Production deployments can opt into automatic Sequelize migrations.
    // This is safe across restarts because Sequelize tracks completed migrations.
    const shouldRunMigrations =
      process.env.RUN_MIGRATIONS_ON_BOOT === 'true' ||
      (process.env.NODE_ENV === 'production' && process.env.RUN_MIGRATIONS_ON_BOOT !== 'false');

    if (shouldRunMigrations && process.env.NODE_ENV !== 'test') {
      const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      console.log('[startup] Running database migrations...');
      await execFileAsync(npxCommand, ['sequelize-cli', 'db:migrate', '--env', process.env.NODE_ENV || 'development'], {
        cwd: __dirname,
        env: process.env
      });
      console.log('[startup] Database migrations complete.');
    }

    // DB repair: opt-in only via RUN_DB_REPAIR_ON_BOOT=true — never run automatically in production
    if (process.env.RUN_DB_REPAIR_ON_BOOT === 'true') {
      console.log('[startup] RUN_DB_REPAIR_ON_BOOT=true — running database repairs...');
      await runDatabaseRepairs(sequelize);
    }

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
