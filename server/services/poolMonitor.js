/**
 * Database Connection Pool Monitoring
 * Tracks pool health, slow queries, and connection issues
 */

const logger = require('../utils/logger');

class PoolMonitor {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0
    };
    this.slowQueryThresholdMs = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10);
    this.slowQueries = []; // Last 100 slow queries
    this.connectionIssues = [];
  }

  /**
   * Log a query execution
   */
  logQuery(sql, duration, options = {}) {
    this.metrics.totalQueries += 1;

    if (duration > this.slowQueryThresholdMs) {
      this.metrics.slowQueries += 1;
      const slowQuery = {
        sql: sql.substring(0, 200),
        duration,
        timestamp: new Date().toISOString(),
        attributes: options.attributes
      };
      this.slowQueries.push(slowQuery);
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift();
      }
      logger.warn({
        event: 'slow_query',
        duration,
        threshold: this.slowQueryThresholdMs,
        sql: sql.substring(0, 500)
      });
    }
  }

  /**
   * Log query failure
   */
  logQueryError(sql, error) {
    this.metrics.failedQueries += 1;
    logger.error({
      event: 'query_error',
      sql: sql.substring(0, 500),
      error: error.message
    });
  }

  /**
   * Update connection pool status
   */
  updatePoolStatus() {
    const pool = this.sequelize.connectionManager;
    if (!pool) return;

    try {
      const maxConnections = pool._pool?.max || 10;
      const currentConnections = pool._pool?.size || 0;
      const idleConnections = pool._pool?.available?.length || 0;
      const waitingRequests = pool._pool?.waitQueue?.length || 0;

      this.metrics.totalConnections = maxConnections;
      this.metrics.activeConnections = currentConnections - idleConnections;
      this.metrics.idleConnections = idleConnections;
      this.metrics.waitingRequests = waitingRequests;

      // Alert if pool is exhausted or waiting requests are accumulating
      if (waitingRequests > 5) {
        logger.warn({
          event: 'connection_pool_stress',
          waitingRequests,
          activeConnections: this.metrics.activeConnections,
          maxConnections
        });
      }
    } catch (err) {
      logger.debug({ event: 'pool_status_error', error: err.message });
    }
  }

  /**
   * Get current pool metrics
   */
  getMetrics() {
    this.updatePoolStatus();
    return {
      ...this.metrics,
      slowQueryThreshold: this.slowQueryThresholdMs,
      recentSlowQueries: this.slowQueries.slice(-10)
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0
    };
    this.slowQueries = [];
  }
}

module.exports = {
  PoolMonitor
};
