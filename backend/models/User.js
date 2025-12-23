const bcrypt = require('bcryptjs');
const { query, withTransaction } = require('../config/database');
const logger = require('../utils/logger');

class User {
    constructor(data) {
        this.id = data.id;
        this.email = data.email;
        this.password_hash = data.password_hash;
        this.role_id = data.role_id;
        this.is_active = data.is_active;
        this.is_owner = data.is_owner;
        this.last_login = data.last_login;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.deleted_at = data.deleted_at;
    }

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @returns {Promise<User>} Created user
     */
    static async create(userData) {
        const { email, password, role_id, is_active = true, is_owner = false } = userData;
        
        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const password_hash = await bcrypt.hash(password, saltRounds);

        const result = await query(
            `INSERT INTO users (email, password_hash, role_id, is_active, is_owner) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [email, password_hash, role_id, is_active, is_owner]
        );

        return new User(result.rows[0]);
    }

    /**
     * Find user by email
     * @param {string} email - User email
     * @returns {Promise<User|null>} User or null
     */
    static async findByEmail(email) {
        const result = await query(
            `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
            [email]
        );

        return result.rows.length > 0 ? new User(result.rows[0]) : null;
    }

    /**
     * Find user by ID
     * @param {string} userId - User ID
     * @returns {Promise<User|null>} User or null
     */
    static async findById(userId) {
        const result = await query(
            `SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL`,
            [userId]
        );

        return result.rows.length > 0 ? new User(result.rows[0]) : null;
    }

    /**
     * Get user by ID with role information
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User with role or null
     */
    static async getUserById(userId) {
        const result = await query(
            `SELECT u.*, r.name as role_name, r.level as role_level, r.permissions 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.id = $1 AND u.deleted_at IS NULL`,
            [userId]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Get all users with pagination
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Users and total count
     */
    static async getAll({ page = 1, limit = 10, search = '', role_id = null, is_active = null } = {}) {
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE u.deleted_at IS NULL';
        let params = [];
        let paramIndex = 1;

        // Search filter
        if (search) {
            whereClause += ` AND (u.email ILIKE $${paramIndex} OR e.full_name_ar ILIKE $${paramIndex} OR e.full_name_en ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Role filter
        if (role_id) {
            whereClause += ` AND u.role_id = $${paramIndex}`;
            params.push(role_id);
            paramIndex++;
        }

        // Active filter
        if (is_active !== null) {
            whereClause += ` AND u.is_active = $${paramIndex}`;
            params.push(is_active);
            paramIndex++;
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM users u 
             LEFT JOIN employees e ON u.id = e.user_id 
             ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        // Get users
        params.push(limit, offset);
        const result = await query(
            `SELECT u.id, u.email, u.role_id, u.is_active, u.is_owner, u.last_login, u.created_at,
                    r.name as role_name, r.level as role_level,
                    e.employee_number, e.full_name_ar, e.full_name_en, e.job_title,
                    d.name_ar as department_name_ar, d.name_en as department_name_en
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             LEFT JOIN employees e ON u.id = e.user_id 
             LEFT JOIN departments d ON e.department_id = d.id 
             ${whereClause}
             ORDER BY u.created_at DESC 
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        return {
            users: result.rows,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Update user
     * @param {string} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<User>} Updated user
     */
    static async update(userId, updateData) {
        const { email, password, role_id, is_active } = updateData;
        let queryText = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
        let params = [];
        let paramIndex = 1;

        if (email) {
            queryText += `, email = $${paramIndex}`;
            params.push(email);
            paramIndex++;
        }

        if (password) {
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const password_hash = await bcrypt.hash(password, saltRounds);
            queryText += `, password_hash = $${paramIndex}`;
            params.push(password_hash);
            paramIndex++;
        }

        if (role_id) {
            queryText += `, role_id = $${paramIndex}`;
            params.push(role_id);
            paramIndex++;
        }

        if (is_active !== undefined) {
            queryText += `, is_active = $${paramIndex}`;
            params.push(is_active);
            paramIndex++;
        }

        queryText += ` WHERE id = $${paramIndex} RETURNING *`;
        params.push(userId);

        const result = await query(queryText, params);
        return result.rows.length > 0 ? new User(result.rows[0]) : null;
    }

    /**
     * Update last login
     * @param {string} userId - User ID
     * @returns {Promise<void>}
     */
    static async updateLastLogin(userId) {
        await query(
            `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
            [userId]
        );
    }

    /**
     * Soft delete user
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
    static async softDelete(userId) {
        const result = await query(
            `UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_owner = false RETURNING id`,
            [userId]
        );
        return result.rows.length > 0;
    }

    /**
     * Compare password with hash
     * @param {string} password - Plain password
     * @returns {Promise<boolean>} Match result
     */
    async comparePassword(password) {
        return await bcrypt.compare(password, this.password_hash);
    }

    /**
     * Check if user has permission
     * @param {string} resource - Resource name
     * @param {string} action - Action name (create, read, update, delete)
     * @returns {Promise<boolean>} Permission result
     */
    async hasPermission(resource, action) {
        const result = await query(
            `SELECT permissions FROM roles WHERE id = $1`,
            [this.role_id]
        );

        if (result.rows.length === 0) return false;

        const permissions = result.rows[0].permissions;
        return permissions[resource] && permissions[resource][action] === true;
    }

    /**
     * Get user's role information
     * @returns {Promise<Object|null>} Role information
     */
    async getRole() {
        const result = await query(
            `SELECT * FROM roles WHERE id = $1`,
            [this.role_id]
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Create system log entry
     * @param {string} action - Action performed
     * @param {string} resourceType - Type of resource
     * @param {string} resourceId - Resource ID
     * @param {Object} details - Additional details
     */
    async createLog(action, resourceType, resourceId, details = {}) {
        await query(
            `INSERT INTO system_logs (user_id, action, resource_type, resource_id, ip_address, details) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [this.id, action, resourceType, resourceId, details.ip || null, JSON.stringify(details)]
        );
    }
}

module.exports = User;
