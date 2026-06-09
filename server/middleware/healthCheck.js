/**
 * Health & Readiness Check Middleware
 * Provides liveness and readiness probes for orchestration systems (Kubernetes, etc.)
 */

const { sequelize } = require('../config/db');
const logger = require('../utils/logger');

class HealthChecker {
  constructor() {
    this.checks = {};
    this.startTime = Date.now();
  }

  registerCheck(name, fn) {
    this.checks[name] = fn;
  }

  async runCheck(name) {
    try {
      const result = await this.checks[name]();
      return { status: 'ok', message: result };
    } catch (error) {
      logger.warn({ event: 'health_check_failed', check: name, error: error.message });
      return { status: 'error', message: error.message };
    }
  }

  async getHealthStatus() {
    const results = {};
    const promises = Object.keys(this.checks).map(async (name) => {
      results[name] = await this.runCheck(name);
    });
    await Promise.all(promises);

    const allHealthy = Object.values(results).every(r => r.status === 'ok');
    const uptime = Date.now() - this.startTime;

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      uptime: `${Math.floor(uptime / 1000)}s`,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }

  async getReadinessStatus() {
    // Readiness = is the app ready to serve traffic? (subset of health checks)
    const criticalChecks = ['database', 'auth'];
    const results = {};
    for (const check of criticalChecks) {
      if (this.checks[check]) {
        results[check] = await this.runCheck(check);
      }
    }

    const ready = Object.values(results).every(r => r.status === 'ok');
    return {
      ready,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }
}

const healthChecker = new HealthChecker();

// Register default checks
healthChecker.registerCheck('database', async () => {
  try {
    await sequelize.authenticate();
    return 'connected';
  } catch (error) {
    throw new Error(`Database unavailable: ${error.message}`);
  }
});

healthChecker.registerCheck('memory', async () => {
  const mem = process.memoryUsage();
  const heapUsedPercent = (mem.heapUsed / mem.heapTotal) * 100;
  if (heapUsedPercent > 90) {
    throw new Error(`High memory usage: ${heapUsedPercent.toFixed(1)}%`);
  }
  return `heap ${heapUsedPercent.toFixed(1)}% used`;
});

healthChecker.registerCheck('auth', async () => {
  // Allow either split JWT secrets or a legacy JWT_SECRET fallback.
  const hasAccessSecret = !!process.env.JWT_ACCESS_SECRET;
  const hasRefreshSecret = !!process.env.JWT_REFRESH_SECRET;
  const hasLegacySecret = !!process.env.JWT_SECRET;
  if ((!hasAccessSecret || !hasRefreshSecret) && !hasLegacySecret) {
    throw new Error('JWT secret configuration missing');
  }
  return 'JWT configured';
});

healthChecker.registerCheck('email', async () => {
  // Check if email service is configured
  if (!process.env.RESEND_API_KEY) {
    return 'email service not configured (degraded)';
  }
  return 'email service configured';
});

module.exports = {
  healthChecker,
  healthCheckMiddleware: async (req, res) => {
    const status = await healthChecker.getHealthStatus();
    return res.json(status);
  },
  readinessCheckMiddleware: async (req, res) => {
    const status = await healthChecker.getReadinessStatus();
    const statusCode = status.ready ? 200 : 503;
    return res.status(statusCode).json(status);
  }
};
