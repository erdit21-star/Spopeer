const { createLogger, format, transports } = require('winston');
const path = require('path');
const logsDir = path.join(__dirname, '..', 'logs');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'spopeer-server' },
  transports: [
    new transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new transports.File({ filename: path.join(logsDir, 'combined.log') })
  ]
});

// In development, also log to console with simple formatting
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(format.colorize(), format.simple())
  }));
}

module.exports = logger;

