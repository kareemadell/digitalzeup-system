const { Pool } = require('pg');
const logger = require('../utils/logger');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'digitalzeup_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool events
pool.on('connect', (client) => {
    logger.info('Database client connected');
});

pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client', err);
    process.exit(-1);
});

/**
 * Connect to database and test connection
 */
async function connectDB() {
    try {
        const client = await pool.connect();
        logger.info('Database connection established');
        
        // Test connection
        const result = await client.query('SELECT NOW()');
        logger.info('Database time:', result.rows[0].now);
        
        client.release();
        return true;
    } catch (error) {
        logger.error('Database connection failed:', error);
        throw error;
    }
}

/**
 * Execute a query with parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
async function query(text, params = []) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', { text, duration, rows: result.rowCount });
        return result;
    } catch (error) {
        logger.error('Database query error:', { text, params, error: error.message });
        throw error;
    }
}

/**
 * Get a client from the pool
 * @returns {Promise} Database client
 */
async function getClient() {
    return await pool.connect();
}

/**
 * Begin a transaction
 * @param {Object} client - Database client
 * @returns {Promise} Transaction result
 */
async function beginTransaction(client) {
    await client.query('BEGIN');
}

/**
 * Commit a transaction
 * @param {Object} client - Database client
 * @returns {Promise} Transaction result
 */
async function commitTransaction(client) {
    await client.query('COMMIT');
}

/**
 * Rollback a transaction
 * @param {Object} client - Database client
 * @returns {Promise} Transaction result
 */
async function rollbackTransaction(client) {
    await client.query('ROLLBACK');
}

/**
 * Execute queries within a transaction
 * @param {Function} callback - Function to execute within transaction
 * @returns {Promise} Transaction result
 */
async function withTransaction(callback) {
    const client = await getClient();
    try {
        await beginTransaction(client);
        const result = await callback(client);
        await commitTransaction(client);
        return result;
    } catch (error) {
        await rollbackTransaction(client);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Close the database pool
 */
async function closePool() {
    await pool.end();
    logger.info('Database pool closed');
}

module.exports = {
    connectDB,
    query,
    getClient,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    withTransaction,
    closePool,
    pool
};
