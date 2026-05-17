/**
 * Standardized Error Handling Utility
 * Ensures consistent error logging, status codes, and client responses
 */

const logger = require('./logger');

/**
 * Standard HTTP status codes for error types
 */
const ERROR_STATUS_CODES = {
  VALIDATION: 400,
  VALIDATION_REQUIRED_FIELDS: 400,
  VALIDATION_EMAIL: 400,
  INVALID_STATUS: 400,
  UNSUPPORTED_FILE_TYPE: 400,
  CONFLICT: 409,
  AUTH_REQUIRED: 401,
  AUTH_INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  ACCOUNT_DEACTIVATED: 403,
  EMAIL_NOT_VERIFIED: 403,
  NOT_FOUND: 404,
  NO_USERS: 400,
  ENTITY_TOO_LARGE: 413,
  PAYLOAD_TOO_LARGE: 413,
  FILE_TOO_LARGE: 413,
  CLOUDINARY_NOT_CONFIGURED: 500,
  EMAIL_SEND_FAILED: 500,
  SESSION_UNAVAILABLE: 503,
  TOKEN_GENERATION_FAILED: 500,
  ACCOUNT_MISCONFIGURED: 500,
  UPLOAD_ERROR: 400,
  INTERNAL_ERROR: 500,
  SERVER_ERROR: 500
};

/**
 * Log an error with consistent context
 * @param {string} event - Event identifier (e.g., 'update_my_profile_error')
 * @param {Object} req - Express request object
 * @param {Error} error - Error object
 * @param {Object} extra - Additional context fields
 */
function logError(event, req, error, extra = {}) {
  const context = {
    event,
    requestId: req.requestId || null,
    userId: req.userId || null,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    message: error?.message || 'Unknown error',
    ...extra
  };

  // Only include stack in development
  if (process.env.NODE_ENV === 'development' && error?.stack) {
    context.stack = error.stack;
  }

  logger.error(context);
}

/**
 * Send a standardized error response
 * @param {Object} res - Express response object
 * @param {string} code - Error code (e.g., 'NOT_FOUND', 'VALIDATION')
 * @param {string} message - Human-readable error message
 * @param {number} statusCode - HTTP status code (optional, will be looked up from ERROR_STATUS_CODES)
 * @returns {Object} res.json()
 */
function sendErrorResponse(res, code, message, statusCode = null) {
  const status = statusCode || ERROR_STATUS_CODES[code] || 500;
  return res.status(status).json({
    success: false,
    code,
    message,
    error: { code, message }
  });
}

/**
 * Unified error handler for try/catch blocks
 * Logs error and sends standardized response
 * @param {Object} res - Express response object
 * @param {Object} req - Express request object
 * @param {Error} error - Error object
 * @param {string} eventName - Event identifier for logging
 * @param {Object} options - Options { code, message, statusCode, extra }
 * @returns {Object} res.json()
 */
function handleError(res, req, error, eventName, options = {}) {
  const {
    code = 'SERVER_ERROR',
    message = 'An error occurred processing your request.',
    statusCode = null,
    extra = {}
  } = options;

  logError(eventName, req, error, extra);
  return sendErrorResponse(res, code, message, statusCode);
}

/**
 * Wrapper for common validation errors
 */
function handleValidationError(res, req, message, extra = {}) {
  return handleError(res, req, new Error(message), 'validation_error', {
    code: 'VALIDATION',
    message,
    statusCode: 400,
    extra
  });
}

/**
 * Wrapper for authorization errors
 */
function handleAuthError(res, req, message = 'Authentication required.', extra = {}) {
  return handleError(res, req, new Error(message), 'auth_error', {
    code: 'AUTH_REQUIRED',
    message,
    statusCode: 401,
    extra
  });
}

/**
 * Wrapper for forbidden errors
 */
function handleForbiddenError(res, req, message = 'Access denied.', extra = {}) {
  return handleError(res, req, new Error(message), 'forbidden_error', {
    code: 'FORBIDDEN',
    message,
    statusCode: 403,
    extra
  });
}

/**
 * Wrapper for not found errors
 */
function handleNotFoundError(res, req, resource = 'Resource', extra = {}) {
  return handleError(res, req, new Error(`${resource} not found.`), 'not_found_error', {
    code: 'NOT_FOUND',
    message: `${resource} not found.`,
    statusCode: 404,
    extra
  });
}

module.exports = {
  ERROR_STATUS_CODES,
  logError,
  sendErrorResponse,
  handleError,
  handleValidationError,
  handleAuthError,
  handleForbiddenError,
  handleNotFoundError
};
