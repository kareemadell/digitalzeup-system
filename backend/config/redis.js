const redis = require('redis');
const logger = require('../utils/logger');

let redisClient;

/**
 * Initialize Redis client
 */
async function initializeRedis() {
    try {
        redisClient = redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            database: process.env.REDIS_DB || 0,
        });

        redisClient.on('error', (err) => {
            logger.error('Redis Client Error:', err);
        });

        redisClient.on('connect', () => {
            logger.info('Redis client connected');
        });

        await redisClient.connect();
        return redisClient;
    } catch (error) {
        logger.error('Failed to initialize Redis:', error);
        // Don't throw error, Redis is optional
        return null;
    }
}

/**
 * Get Redis client
 */
function getRedisClient() {
    return redisClient;
}

/**
 * Set cache with expiration
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} expiration - Expiration time in seconds (default: 1 hour)
 */
async function setCache(key, value, expiration = 3600) {
    if (!redisClient) return null;
    
    try {
        const serializedValue = JSON.stringify(value);
        await redisClient.setEx(key, expiration, serializedValue);
        return true;
    } catch (error) {
        logger.error('Cache set error:', error);
        return false;
    }
}

/**
 * Get cached value
 * @param {string} key - Cache key
 */
async function getCache(key) {
    if (!redisClient) return null;
    
    try {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        logger.error('Cache get error:', error);
        return null;
    }
}

/**
 * Delete cached value
 * @param {string} key - Cache key
 */
async function deleteCache(key) {
    if (!redisClient) return null;
    
    try {
        await redisClient.del(key);
        return true;
    } catch (error) {
        logger.error('Cache delete error:', error);
        return false;
    }
}

/**
 * Clear all cache
 */
async function clearCache() {
    if (!redisClient) return null;
    
    try {
        await redisClient.flushDb();
        return true;
    } catch (error) {
        logger.error('Cache clear error:', error);
        return false;
    }
}

/**
 * Close Redis connection
 */
async function closeRedis() {
    if (redisClient) {
        await redisClient.quit();
        logger.info('Redis connection closed');
    }
}

module.exports = {
    initializeRedis,
    getRedisClient,
    setCache,
    getCache,
    deleteCache,
    clearCache,
    closeRedis
};
