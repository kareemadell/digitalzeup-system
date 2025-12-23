const express = require('express');
const { query } = require('../config/database');
const { authenticate, authorize, canAccessEmployee } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination
 * @access  Private (Owner, Direct Manager)
 */
router.get('/', authenticate, authorize(2), async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', role_id, is_active } = req.query;
        
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
        if (is_active !== undefined) {
            whereClause += ` AND u.is_active = $${paramIndex}`;
            params.push(is_active === 'true');
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

        res.json({
            message: 'Users retrieved successfully',
            data: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Error fetching users:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', authenticate, canAccessEmployee, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT u.id, u.email, u.role_id, u.is_active, u.is_owner, u.last_login, u.created_at,
                    r.name as role_name, r.level as role_level, r.permissions,
                    e.id as employee_id, e.employee_number, e.full_name_ar, e.full_name_en,
                    e.job_title, e.personal_photo, e.date_of_birth, e.nationality,
                    e.personal_phone, e.work_phone, e.personal_email,
                    d.id as department_id, d.name_ar as department_name_ar, d.name_en as department_name_en,
                    s.id as specialization_id, s.name_ar as specialization_name_ar, s.name_en as specialization_name_en
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             LEFT JOIN employees e ON u.id = e.user_id 
             LEFT JOIN departments d ON e.department_id = d.id 
             LEFT JOIN specializations s ON e.specialization_id = s.id 
             WHERE u.id = $1 AND u.deleted_at IS NULL`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                }
            });
        }

        res.json({
            message: 'User retrieved successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error fetching user:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Owner, Direct Manager)
 */
router.post('/', authenticate, authorize(2), async (req, res) => {
    try {
        const { email, password, role_id, employee_data } = req.body;

        // Validate required fields
        if (!email || !password || !role_id) {
            return res.status(400).json({
                error: {
                    message: 'Email, password, and role_id are required',
                    code: 'VALIDATION_ERROR'
                }
            });
        }

        // Check if user already exists
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                error: {
                    message: 'User with this email already exists',
                    code: 'EMAIL_EXISTS'
                }
            });
        }

        // Start transaction
        const client = await require('../config/database').getClient();
        await require('../config/database').beginTransaction(client);

        try {
            // Create user
            const userResult = await client.query(
                `INSERT INTO users (email, password_hash, role_id, is_active) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id, email, role_id, is_active, created_at`,
                [email, password, role_id, true] // Password will be hashed in model
            );

            const user = userResult.rows[0];

            // Create employee record if employee_data provided
            if (employee_data) {
                const { full_name_ar, full_name_en, job_title, department_id, specialization_id } = employee_data;
                
                await client.query(
                    `INSERT INTO employees (user_id, employee_number, full_name_ar, full_name_en, job_title, department_id, specialization_id, hire_date, employment_status) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, 'active')`,
                    [
                        user.id,
                        `EMP${Date.now()}`, // Generate employee number
                        full_name_ar,
                        full_name_en,
                        job_title,
                        department_id,
                        specialization_id
                    ]
                );
            }

            // Log the action
            await client.query(
                `INSERT INTO system_logs (user_id, action, resource_type, resource_id, details) 
                 VALUES ($1, 'CREATE_USER', 'USER', $2, $3)`,
                [req.user.id, user.id, JSON.stringify({ email, role_id })]
            );

            await require('../config/database').commitTransaction(client);
            client.release();

            logger.info(`User created: ${email} by ${req.user.email}`);

            res.status(201).json({
                message: 'User created successfully',
                data: user
            });

        } catch (error) {
            await require('../config/database').rollbackTransaction(client);
            client.release();
            throw error;
        }

    } catch (error) {
        logger.error('Error creating user:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Owner, Direct Manager)
 */
router.put('/:id', authenticate, authorize(2), async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, role_id, is_active } = req.body;

        // Check if user exists
        const userCheck = await query(
            'SELECT id, is_owner FROM users WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                error: {
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                }
            });
        }

        // Prevent updating owner account unless requester is owner
        if (userCheck.rows[0].is_owner && !req.user.is_owner) {
            return res.status(403).json({
                error: {
                    message: 'Cannot update owner account',
                    code: 'OWNER_UPDATE_DENIED'
                }
            });
        }

        // Build update query
        let updateFields = [];
        let params = [];
        let paramIndex = 1;

        if (email) {
            updateFields.push(`email = $${paramIndex}`);
            params.push(email);
            paramIndex++;
        }

        if (password) {
            updateFields.push(`password_hash = $${paramIndex}`);
            params.push(password); // Will be hashed in model
            paramIndex++;
        }

        if (role_id) {
            updateFields.push(`role_id = $${paramIndex}`);
            params.push(role_id);
            paramIndex++;
        }

        if (is_active !== undefined) {
            updateFields.push(`is_active = $${paramIndex}`);
            params.push(is_active);
            paramIndex++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: {
                    message: 'No fields to update',
                    code: 'NO_UPDATE_FIELDS'
                }
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        const result = await query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, role_id, is_active, updated_at`,
            params
        );

        // Log the action
        await query(
            `INSERT INTO system_logs (user_id, action, resource_type, resource_id, details) 
             VALUES ($1, 'UPDATE_USER', 'USER', $2, $3)`,
            [req.user.id, id, JSON.stringify({ updated_by: req.user.email })]
        );

        logger.info(`User updated: ${id} by ${req.user.email}`);

        res.json({
            message: 'User updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error updating user:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Soft delete user (only owner can permanently delete)
 * @access  Private (Owner, Direct Manager)
 */
router.delete('/:id', authenticate, authorize(2), async (req, res) => {
    try {
        const { id } = req.params;
        const { permanent = false } = req.query;

        // Check if user exists
        const userCheck = await query(
            'SELECT id, is_owner FROM users WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                error: {
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                }
            });
        }

        // Prevent deleting owner account
        if (userCheck.rows[0].is_owner) {
            return res.status(403).json({
                error: {
                    message: 'Cannot delete owner account',
                    code: 'OWNER_DELETE_DENIED'
                }
            });
        }

        // Only owner can permanently delete
        if (permanent === 'true' && !req.user.is_owner) {
            return res.status(403).json({
                error: {
                    message: 'Only owner can permanently delete users',
                    code: 'PERMANENT_DELETE_DENIED'
                }
            });
        }

        if (permanent === 'true') {
            // Permanent delete (only owner)
            await query('DELETE FROM users WHERE id = $1', [id]);
            logger.info(`User permanently deleted: ${id} by owner ${req.user.email}`);
        } else {
            // Soft delete
            await query(
                'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
                [id]
            );
            logger.info(`User soft deleted: ${id} by ${req.user.email}`);
        }

        // Log the action
        await query(
            `INSERT INTO system_logs (user_id, action, resource_type, resource_id, details) 
             VALUES ($1, 'DELETE_USER', 'USER', $2, $3)`,
            [req.user.id, id, JSON.stringify({ permanent: permanent === 'true' })]
        );

        res.json({
            message: permanent === 'true' ? 'User permanently deleted' : 'User deactivated successfully'
        });

    } catch (error) {
        logger.error('Error deleting user:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

module.exports = router;
