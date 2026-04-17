const redis = require("../config/redis");
const logger = require("./logger");

const get = async (key) => {
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.warn(`Cache GET failed for ${key}: ${err.message}`);
    return null;
  }
};

const set = async (key, data, ttlSeconds = 120) => {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
  } catch (err) {
    logger.warn(`Cache SET failed for ${key}: ${err.message}`);
  }
};

const del = async (pattern) => {
  if (!redis) return;
  try {
    const stream = redis.scanStream({ match: pattern, count: 100 });
    stream.on("data", (keys) => {
      if (keys.length) redis.del(...keys);
    });
    await new Promise((resolve) => stream.on("end", resolve));
  } catch (err) {
    logger.warn(`Cache DEL failed for ${pattern}: ${err.message}`);
  }
};

const wrap = async (key, ttlSeconds, fetchFn) => {
  const cached = await get(key);
  if (cached) return cached;

  const result = await fetchFn();
  await set(key, result, ttlSeconds);
  return result;
};

module.exports = { get, set, del, wrap };
