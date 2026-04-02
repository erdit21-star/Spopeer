/**
 * Centralized Express error handler.
 * Mount LAST after all routes.
 */
function errorHandler(err, req, res, _next) {
  // Log with request context
  const meta = req.requestId ? `[${req.requestId}]` : '';
  console.error(`${meta} Server error:`, err);

  // Entity too large (body-parser)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large.' });
  }

  // Multer file-size limit
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, code: 'FILE_TOO_LARGE', message: 'File too large. Maximum size is 5MB.' });
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
