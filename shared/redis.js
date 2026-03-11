const Redis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let client = null;

function getRedisClient() {
    if (client) return client;

    client = new Redis(REDIS_URL, {
        retryStrategy: (times) => {
            const delay = Math.min(times * 500, 5000);
            console.log(`Redis reconnecting in ${delay}ms... (attempt ${times})`);
            return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: false,
    });

    client.on("connect", () => console.log("Redis connected"));
    client.on("error", (err) => console.error("Redis error:", err.message));
    client.on("close", () => console.log("Redis connection closed"));

    return client;
}

// ─── Cache Helpers ───────────────────────────────────────────────────

async function cacheGet(key) {
    try {
        const redis = getRedisClient();
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error("Redis GET error:", error.message);
        return null;
    }
}

async function cacheSet(key, value, ttlSeconds = 60) {
    try {
        const redis = getRedisClient();
        await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
        return true;
    } catch (error) {
        console.error("Redis SET error:", error.message);
        return false;
    }
}

async function cacheDelete(key) {
    try {
        const redis = getRedisClient();
        await redis.del(key);
        return true;
    } catch (error) {
        console.error("Redis DEL error:", error.message);
        return false;
    }
}

async function cacheInvalidatePattern(pattern) {
    try {
        const redis = getRedisClient();
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
            console.log(`🗑️  Invalidated ${keys.length} cache keys matching "${pattern}"`);
        }
        return true;
    } catch (error) {
        console.error("Redis pattern invalidation error:", error.message);
        return false;
    }
}

// ─── Token Blacklist (for JWT logout) ────────────────────────────────

async function blacklistToken(token, ttlSeconds) {
    try {
        const redis = getRedisClient();
        await redis.set(`bl_${token}`, "1", "EX", ttlSeconds);
        return true;
    } catch (error) {
        console.error("Redis blacklist error:", error.message);
        return false;
    }
}

async function isTokenBlacklisted(token) {
    try {
        const redis = getRedisClient();
        const result = await redis.get(`bl_${token}`);
        return result !== null;
    } catch (error) {
        console.error("Redis blacklist check error:", error.message);
        return false; // Fail open — don't block on Redis errors
    }
}

// ─── Idempotency Key (for duplicate order prevention) ────────────────

async function setIdempotencyKey(key, value, ttlSeconds = 86400) {
    try {
        const redis = getRedisClient();
        // NX = only set if not exists
        const result = await redis.set(`idem_${key}`, JSON.stringify(value), "EX", ttlSeconds, "NX");
        return result === "OK";
    } catch (error) {
        console.error("Redis idempotency error:", error.message);
        return false;
    }
}

async function getIdempotencyKey(key) {
    try {
        const redis = getRedisClient();
        const data = await redis.get(`idem_${key}`);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error("Redis idempotency GET error:", error.message);
        return null;
    }
}

module.exports = {
    getRedisClient,
    cacheGet,
    cacheSet,
    cacheDelete,
    cacheInvalidatePattern,
    blacklistToken,
    isTokenBlacklisted,
    setIdempotencyKey,
    getIdempotencyKey,
};
