const rateLimit = require('express-rate-limit');

function tryCreateRedisStore() {
  if (!process.env.REDIS_URL) return null;

  try {
    // Optional dependency path; if unavailable we fall back to memory.
    const { RedisStore } = require('rate-limit-redis');
    const { createClient } = require('redis');
    const client = createClient({ url: process.env.REDIS_URL });
    client.connect().catch(() => {});
    return new RedisStore({
      sendCommand: (...args) => client.sendCommand(args)
    });
  } catch (_err) {
    return null;
  }
}

function createLimiter({ windowMs, max, message, skip }) {
  const store = tryCreateRedisStore();
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: store || undefined,
    skip,
    message
  });
}

module.exports = {
  createLimiter
};
