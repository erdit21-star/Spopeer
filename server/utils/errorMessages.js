/**
 * Standardized Error Message Catalog
 * Purpose: Ensure consistent, user-friendly error messages across the API
 * 
 * Guidelines:
 * - Be specific about what went wrong
 * - Suggest what the user can do to fix it
 * - Use clear, non-technical language
 * - Keep messages concise but helpful
 * - Include error code for developers
 */

const ERROR_MESSAGES = {
  // ─────────────────────────────────────────────────────────────────────
  // AUTHENTICATION ERRORS (401)
  // ─────────────────────────────────────────────────────────────────────
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    status: 401,
    message: 'Authentication required.',
    suggestion: 'Please log in to access this resource.'
  },
  
  AUTH_INVALID_CREDENTIALS: {
    code: 'AUTH_INVALID_CREDENTIALS',
    status: 401,
    message: 'Invalid email or password.',
    suggestion: 'Please check your credentials and try again. Need help? Visit the login page.'
  },
  
  AUTH_REQUIRED: {
    code: 'AUTH_REQUIRED',
    status: 401,
    message: 'Authentication required to perform this action.',
    suggestion: 'Please log in first.'
  },
  
  EMAIL_NOT_VERIFIED: {
    code: 'EMAIL_NOT_VERIFIED',
    status: 403,
    message: 'Please verify your email address before signing in.',
    suggestion: 'Check your inbox for a verification link, or request a new one.'
  },
  
  ACCOUNT_DEACTIVATED: {
    code: 'ACCOUNT_DEACTIVATED',
    status: 403,
    message: 'Your account has been deactivated.',
    suggestion: 'Contact support if you believe this is an error.'
  },
  
  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    status: 401,
    message: 'Your session has expired.',
    suggestion: 'Please log in again.'
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // AUTHORIZATION ERRORS (403)
  // ─────────────────────────────────────────────────────────────────────
  FORBIDDEN: {
    code: 'FORBIDDEN',
    status: 403,
    message: 'You do not have permission to access this resource.',
    suggestion: 'Contact an administrator if you believe you should have access.'
  },
  
  ADMIN_REQUIRED: {
    code: 'FORBIDDEN',
    status: 403,
    message: 'Admin access required.',
    suggestion: 'This action is restricted to administrators.'
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // VALIDATION ERRORS (400)
  // ─────────────────────────────────────────────────────────────────────
  VALIDATION: {
    code: 'VALIDATION',
    status: 400,
    message: 'Please check your input and try again.',
    suggestion: 'Review the error details below for specific issues.'
  },
  
  VALIDATION_REQUIRED_FIELD: {
    code: 'VALIDATION',
    status: 400,
    message: (fieldName) => `${fieldName} is required.`,
    suggestion: 'Please provide a value for this field.'
  },
  
  VALIDATION_EMAIL: {
    code: 'VALIDATION',
    status: 400,
    message: 'Please enter a valid email address.',
    suggestion: 'Use the format: example@domain.com'
  },
  
  VALIDATION_PASSWORD_WEAK: {
    code: 'VALIDATION',
    status: 400,
    message: 'Password is too weak. Use at least 8 characters with uppercase, lowercase, numbers, and symbols.',
    suggestion: 'Create a stronger password with a mix of character types.'
  },
  
  VALIDATION_PASSWORD_MISMATCH: {
    code: 'VALIDATION',
    status: 400,
    message: 'Passwords do not match.',
    suggestion: 'Please re-enter your password carefully.'
  },
  
  VALIDATION_FILE_TYPE: {
    code: 'UNSUPPORTED_FILE_TYPE',
    status: 400,
    message: (allowed) => `Only ${allowed.join(', ')} files are allowed.`,
    suggestion: 'Please upload a file in the correct format.'
  },
  
  VALIDATION_FILE_SIZE: {
    code: 'FILE_TOO_LARGE',
    status: 413,
    message: (maxSize) => `File is too large. Maximum size is ${maxSize}MB.`,
    suggestion: 'Please upload a smaller file.'
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // NOT FOUND ERRORS (404)
  // ─────────────────────────────────────────────────────────────────────
  NOT_FOUND: {
    code: 'NOT_FOUND',
    status: 404,
    message: 'The requested resource was not found.',
    suggestion: 'Please check the URL or try searching.'
  },
  
  USER_NOT_FOUND: {
    code: 'NOT_FOUND',
    status: 404,
    message: 'User not found.',
    suggestion: 'Please verify the username or email address.'
  },
  
  POST_NOT_FOUND: {
    code: 'NOT_FOUND',
    status: 404,
    message: 'Post not found.',
    suggestion: 'The post may have been deleted or you may not have permission to view it.'
  },
  
  PAGE_NOT_FOUND: {
    code: 'NOT_FOUND',
    status: 404,
    message: 'Page not found.',
    suggestion: 'Please check the URL and try again.'
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // CONFLICT ERRORS (409)
  // ─────────────────────────────────────────────────────────────────────
  CONFLICT: {
    code: 'CONFLICT',
    status: 409,
    message: 'This resource already exists.',
    suggestion: 'Please use a different value and try again.'
  },
  
  EMAIL_ALREADY_EXISTS: {
    code: 'CONFLICT',
    status: 409,
    message: 'This email address is already registered.',
    suggestion: 'Please use a different email or try logging in.'
  },
  
  USERNAME_ALREADY_TAKEN: {
    code: 'CONFLICT',
    status: 409,
    message: 'This username is already taken.',
    suggestion: 'Please choose a different username.'
  },
  
  ALREADY_FOLLOWING: {
    code: 'CONFLICT',
    status: 409,
    message: 'You are already following this user.',
    suggestion: 'No action needed.'
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // RATE LIMITING (429)
  // ─────────────────────────────────────────────────────────────────────
  RATE_LIMITED: {
    code: 'RATE_LIMITED',
    status: 429,
    message: 'Too many requests. Please try again later.',
    suggestion: 'Wait a few moments before retrying.'
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // SERVER ERRORS (500)
  // ─────────────────────────────────────────────────────────────────────
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    status: 500,
    message: 'An unexpected error occurred.',
    suggestion: 'Please try again. If the problem persists, contact support.'
  },
  
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    status: 500,
    message: 'An error occurred processing your request.',
    suggestion: 'Please try again or contact support if the problem continues.'
  },
  
  DATABASE_ERROR: {
    code: 'SERVER_ERROR',
    status: 500,
    message: 'A database error occurred.',
    suggestion: 'Please try again or contact support if the problem continues.'
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // SERVICE ERRORS (503)
  // ─────────────────────────────────────────────────────────────────────
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    status: 503,
    message: 'The service is temporarily unavailable.',
    suggestion: 'Please try again in a few moments.'
  },
  
  CLOUDINARY_NOT_CONFIGURED: {
    code: 'CLOUDINARY_NOT_CONFIGURED',
    status: 500,
    message: 'Cloud storage is not configured for uploads.',
    suggestion: 'Contact support to enable uploads.'
  },
  
  SESSION_UNAVAILABLE: {
    code: 'SESSION_UNAVAILABLE',
    status: 503,
    message: 'Unable to create your session. Please try again.',
    suggestion: 'If the problem persists, clear your browser cache and log in again.'
  },
  
  // ─────────────────────────────────────────────────────────────────────
  // BUSINESS LOGIC ERRORS
  // ─────────────────────────────────────────────────────────────────────
  CANNOT_FOLLOW_SELF: {
    code: 'VALIDATION',
    status: 400,
    message: 'You cannot follow yourself.',
    suggestion: 'Choose another user to follow.'
  },
  
  NOT_FOLLOWING: {
    code: 'NOT_FOUND',
    status: 404,
    message: 'You are not following this user.',
    suggestion: 'You must follow a user before unfollowing.'
  },
  
  POST_NOT_YOURS: {
    code: 'FORBIDDEN',
    status: 403,
    message: 'You can only edit or delete your own posts.',
    suggestion: 'Contact the post owner if you want changes made.'
  },
  
  INSUFFICIENT_PERMISSIONS: {
    code: 'FORBIDDEN',
    status: 403,
    message: 'You do not have permission to perform this action.',
    suggestion: 'Contact an administrator if you believe you should have access.'
  }
};

// ─────────────────────────────────────────────────────────────────────────
// ERROR MESSAGE BUILDER
// ─────────────────────────────────────────────────────────────────────────

/**
 * Build a standardized error response
 * @param {string} code - Error code (e.g., 'NOT_FOUND', 'VALIDATION')
 * @param {any} args - Arguments for templated messages
 * @returns {Object} Standardized error object
 */
function buildError(code, ...args) {
  const errorDef = ERROR_MESSAGES[code] || ERROR_MESSAGES.SERVER_ERROR;
  
  const message = typeof errorDef.message === 'function'
    ? errorDef.message(...args)
    : errorDef.message;
  
  const suggestion = typeof errorDef.suggestion === 'function'
    ? errorDef.suggestion(...args)
    : errorDef.suggestion;
  
  return {
    success: false,
    code: errorDef.code,
    message,
    suggestion,
    error: {
      code: errorDef.code,
      message,
      suggestion
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────
// ERROR MESSAGE GUIDELINES
// ─────────────────────────────────────────────────────────────────────────

const GUIDELINES = {
  principles: [
    'Be specific: Tell users exactly what went wrong',
    'Be helpful: Suggest how to fix the problem',
    'Be clear: Use simple language, avoid jargon',
    'Be consistent: Use the same terms across the app',
    'Be professional: Maintain a helpful, not sarcastic tone'
  ],
  
  formatting: {
    tone: 'Friendly, professional, non-technical',
    length: 'One sentence for message, one for suggestion',
    case: 'Sentence case (capitalize first letter only)',
    punctuation: 'End with period, include specific details'
  },
  
  examples: {
    bad: 'Error: Invalid input parameter',
    good: 'Email address is invalid. Please use the format: example@domain.com'
  },
  
  suggestions: {
    forValidation: 'Always include what format is expected',
    forNotFound: 'Always suggest what the user can do next',
    forForbidden: 'Always suggest contacting support if they believe it\'s an error',
    forServerError: 'Always suggest retrying and contacting support'
  }
};

module.exports = {
  ERROR_MESSAGES,
  buildError,
  GUIDELINES
};
