const cacheStore = new Map();
const tagIndex = new Map(); // Maps tags to sets of cache keys
let redisClient = null;

async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (redisClient) return redisClient;
  try {
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
    // Clean up tags
    if (entry.tags) {
      entry.tags.forEach(tag => {
        const tagKeys = tagIndex.get(tag);
        if (tagKeys) tagKeys.delete(key);
        if (tagKeys && tagKeys.size === 0) tagIndex.delete(tag);
      });
    }
    return null;
  }
  return entry.value;
}

async function set(key, value, ttlMs, tags = []) {
  const client = await getRedisClient();
  if (client) {
    await client.set(key, JSON.stringify(value), { PX: ttlMs });
    // Track tags in Redis (optional, for distributed systems)
    if (tags.length > 0) {
      for (const tag of tags) {
        await client.sadd(`tag:${tag}`, key);
        await client.expire(`tag:${tag}`, Math.ceil(ttlMs / 1000));
      }
    }
    return;
  }

  cacheStore.set(key, { value, expiresAt: now() + ttlMs, tags });
  // Track tags in memory
  if (tags.length > 0) {
    tags.forEach(tag => {
      if (!tagIndex.has(tag)) {
        tagIndex.set(tag, new Set());
      }
      tagIndex.get(tag).add(key);
    });
  }
}

async function del(key) {
  const client = await getRedisClient();
  if (client) {
    await client.del(key);
    return;
  }
  const entry = cacheStore.get(key);
  if (entry && entry.tags) {
    entry.tags.forEach(tag => {
      const tagKeys = tagIndex.get(tag);
      if (tagKeys) tagKeys.delete(key);
      if (tagKeys && tagKeys.size === 0) tagIndex.delete(tag);
    });
  }
  cacheStore.delete(key);
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
      await del(key);
    }
  }
}

async function invalidateByTag(tag) {
  const client = await getRedisClient();
  if (client) {
    const keys = await client.smembers(`tag:${tag}`);
    if (keys.length > 0) {
      await client.del(keys);
      await client.del(`tag:${tag}`);
    }
    return;
  }

  // Memory-based invalidation
  const keysToDelete = tagIndex.get(tag);
  if (keysToDelete) {
    for (const key of keysToDelete) {
      cacheStore.delete(key);
    }
    tagIndex.delete(tag);
  }
}

function clear() {
  cacheStore.clear();
  tagIndex.clear();
}

module.exports = {
  cache: { get, set, del, delByPrefix, invalidateByTag, clear }
};
