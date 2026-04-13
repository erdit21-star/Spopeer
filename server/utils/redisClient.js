const { createClient } = require('redis');

let client = null;

function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;
  try {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (err) => {
      // Do not crash the app if Redis has issues — degrade gracefully
      console.warn('Redis client error:', err && err.message ? err.message : err);
    });
    client.connect().catch((err) => {
      console.warn('Redis connect failed:', err && err.message ? err.message : err);
    });
    return client;
  } catch (err) {
    return null;
  }
}

module.exports = { getRedisClient };
