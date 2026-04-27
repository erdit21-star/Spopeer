// Updated
/**
 * Centralized Express error handler.
 * Mount LAST after all routes.
 */
function errorHandler(err, req, res, _next) {
  // Log with request context
  const meta = req.requestId ? `[${req.requestId}]` : '';
  console.error(`${meta} Server error:`, err);
  const maxSizeMb = Math.max(1, Math.round((parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024) / (1024 * 1024)));

  // Entity too large (body-parser)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large.' });
  }

  // Multer file-size limit
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, code: 'FILE_TOO_LARGE', message: `File too large. Maximum size is ${maxSizeMb}MB.` });
  }

  if (err.code === 'UNSUPPORTED_FILE_TYPE') {
    return res.status(400).json({ success: false, code: 'UNSUPPORTED_FILE_TYPE', message: err.message || 'Unsupported file type.' });
  }

  if (err.code === 'CLOUDINARY_NOT_CONFIGURED') {
    return res.status(500).json({ success: false, code: 'CLOUDINARY_NOT_CONFIGURED', message: 'Cloud storage is not configured for uploads.' });
  }

  if (err.code === 'CSRF_FAILED' || err.code === 'CSRF_INVALID') {
    return res.status(403).json({ success: false, code: 'CSRF_FAILED', message: 'CSRF validation failed. Refresh and try again.' });
  }

  if (err.code === 'AUTH_REQUIRED') {
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: err.message || 'Authentication required.' });
  }

  // Other Multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, code: 'UPLOAD_ERROR', message: `Upload error: ${err.message}` });
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors ? err.errors.map(e => e.message) : [err.message];
    return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: messages.join(', ') });
  }

  // Default 500
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: isDev ? err.message : 'Internal server error.'
  });
}

module.exports = errorHandler;
