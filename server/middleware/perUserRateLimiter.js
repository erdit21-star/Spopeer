const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../utils/redisClient');

function tryCreateRedisStore() {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const { RedisStore } = require('rate-limit-redis');
    return new RedisStore({ sendCommand: (...args) => client.sendCommand(args) });
  } catch (err) {
    return null;
  }
}

function createPerUserLimiter(opts = {}) {
  const windowMs = opts.windowMs || (15 * 60 * 1000);
  const max = opts.max || 60; // default 60 actions per window per user
  const store = tryCreateRedisStore();

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: store || undefined,
    keyGenerator: (req) => {
      if (req && req.userId) return String(req.userId);
      return req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    },
    handler: (req, res) => {
      res.status(429).json({ success: false, error: { code: 'RATE_LIMIT_USER', message: 'Too many requests for this user. Slow down.' } });
    }
  });
}

module.exports = { createPerUserLimiter };
