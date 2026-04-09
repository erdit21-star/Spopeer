const cacheStore = new Map();
let redisClient = null;

async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (redisClient) return redisClient;
  try {
    // eslint-disable-next-line global-require
    const { createClient } = require('redis');
    redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();
    return redisClient;
  } catch (_err) {
    return null;
  }
}

function now() {
  return Date.now();
}

async function get(key) {
  const client = await getRedisClient();
  if (client) {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value;
}

async function set(key, value, ttlMs) {
  const client = await getRedisClient();
  if (client) {
    await client.set(key, JSON.stringify(value), { PX: ttlMs });
    return;
  }
  cacheStore.set(key, { value, expiresAt: now() + ttlMs });
}

async function delByPrefix(prefix) {
  const client = await getRedisClient();
  if (client) {
    const keys = await client.keys(`${prefix}*`);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}

module.exports = {
  cache: { get, set, delByPrefix }
};
