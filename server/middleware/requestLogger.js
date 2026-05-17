/**
 * Request/Response Logger Middleware
 * Comprehensive logging for debugging, monitoring, and auditing
 */

const logger = require('../utils/logger');

function generateRequestId() {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function isHealthCheck(path) {
  return (
    path === '/health' ||
    path === '/metrics' ||
    path.startsWith('/api/health') ||
    path.startsWith('/api/metrics')
  );
}

function isStaticAsset(path) {
  return /\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot|map|json)$/i.test(path);
}

function getSensitiveFields() {
  return [
    'password', 'passwordHash', 'token', 'refreshToken', 'accessToken',
    'csrfToken', 'creditCard', 'ssn', 'apiKey', 'secret', 'privateKey'
  ];
}

function sanitizeValue(value, fieldName) {
  const name = String(fieldName || '').toLowerCase();
  const isSensitive = getSensitiveFields().some(field => name.includes(field.toLowerCase()));
  if (isSensitive) return '***REDACTED***';
  return value;
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = sanitizeValue(value, key);
    }
  }
  return sanitized;
}

/**
 * Main request logger middleware
 */
function requestLoggerMiddleware(req, res, next) {
  // Assign unique request ID
  req.requestId = req.requestId || generateRequestId();

  const startTime = Date.now();
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent') || '';
  const userId = req.userId || req.user?.id || null;
  const isHealth = isHealthCheck(path);
  const isStatic = isStaticAsset(path);

  // Extract sanitized query and body for logging (not for health checks or static assets)
  const queryParams = isHealth || isStatic ? null : sanitizeObject(req.query);
  const bodyForLog = isHealth || isStatic ? null : sanitizeObject(req.body);

  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusMsg = res.statusMessage || '';
    const contentLength = res.get('content-length') || '0';

    // Log context
    const logContext = {
      requestId: req.requestId,
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userId,
      userAgent: userAgent.substring(0, 100) // truncate UA for brevity
    };

    // Only log body/query for non-health endpoints
    if (!isHealth && !isStatic) {
      if (Object.keys(queryParams || {}).length > 0) logContext.query = queryParams;
      if (bodyForLog && Object.keys(bodyForLog).length > 0) logContext.body = bodyForLog;
    }

    // Determine log level based on status code
    const isError = statusCode >= 400;
    const isWarning = statusCode >= 300 && statusCode < 400;

    if (isError) {
      logger.error({
        event: 'request_error',
        ...logContext,
        contentLength
      });
    } else if (isWarning) {
      logger.warn({
        event: 'request_warning',
        ...logContext
      });
    } else if (!isHealth && !isStatic) {
      logger.info({
        event: 'request_success',
        ...logContext
      });
    }
  });

  // Capture errors and exceptions
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode >= 400 && data) {
      // Log error response details (already sanitized via JSON parse)
      try {
        const errorDetail = typeof data === 'string' ? JSON.parse(data) : data;
        logger.debug({
          event: 'response_error_detail',
          requestId: req.requestId,
          errorResponse: errorDetail
        });
      } catch (e) {
        // Not JSON, skip
      }
    }
    return originalSend.call(this, data);
  };

  next();
}

module.exports = {
  requestLoggerMiddleware,
  generateRequestId,
  sanitizeObject,
  isHealthCheck,
  isStaticAsset
};
