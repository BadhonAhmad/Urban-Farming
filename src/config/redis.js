const logger = require("../utils/logger");

let client = null;

if (process.env.REDIS_URL) {
  const Redis = require("ioredis");
  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  client.on("connect", () => logger.info("Redis connected"));
  client.on("error", (err) => logger.warn(`Redis error: ${err.message}`));
  client.on("close", () => logger.warn("Redis connection closed"));
}

module.exports = client;
