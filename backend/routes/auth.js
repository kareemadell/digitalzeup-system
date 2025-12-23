const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    try {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: {
                    message: 'Validation failed',
                    details: errors.array()
                }
            });
        }

        const { email, password } = req.body;

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({
                error: {
                    message: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS'
                }
            });
        }

        // Check if account is active
        if (!user.is_active) {
            return res.status(401).json({
                error: {
                    message: 'Account is deactivated',
                    code: 'ACCOUNT_DEACTIVATED'
                }
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            // Log failed login attempt
            logger.warn(`Failed login attempt for email: ${email} from IP: ${req.ip}`);
            
            return res.status(401).json({
                error: {
                    message: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS'
                }
            });
        }

        // Update last login
        await User.updateLastLogin(user.id);

        // Get user role and permissions
        const userWithRole = await User.getUserById(user.id);

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                roleId: user.role_id,
                roleLevel: userWithRole.role_level
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
       );

        // Generate refresh token
        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
        );

        // Log successful login
        logger.info(`User logged in: ${user.email} from IP: ${req.ip}`);

        // Create session log
        await user.createLog('LOGIN', 'USER', user.id, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            message: 'Login successful',
            data: {
                token,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    role: {
                        id: user.role_id,
                        name: userWithRole.role_name,
                        level: userWithRole.role_level,
                        permissions: userWithRole.permissions
                    },
                    isOwner: user.is_owner,
                    lastLogin: user.last_login
                }
            }
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res) => {
    try {
        // Create logout log
        await req.user.createLog('LOGOUT', 'USER', req.user.id, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        logger.info(`User logged out: ${req.user.email}`);

        res.json({
            message: 'Logout successful'
        });
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', [
    body('refreshToken').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: {
                    message: 'Refresh token is required',
                    details: errors.array()
                }
            });
        }

        const { refreshToken } = req.body;

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        
        // Get user
        const user = await User.getUserById(decoded.userId);
        if (!user) {
            return res.status(401).json({
                error: {
                    message: 'Invalid refresh token',
                    code: 'INVALID_REFRESH_TOKEN'
                }
            });
        }

        // Generate new access token
        const newToken = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                roleId: user.role_id,
                roleLevel: user.role_level
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );

        res.json({
            message: 'Token refreshed successfully',
            data: {
                token: newToken
            }
        });

    } catch (error) {
        logger.error('Token refresh error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: {
                    message: 'Refresh token has expired',
                    code: 'REFRESH_TOKEN_EXPIRED'
                }
            });
        }

        res.status(401).json({
            error: {
                message: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            }
        });
    }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user information
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const { query } = require('../config/database');
        
        // Get complete user information
        const result = await query(
            `SELECT u.id, u.email, u.role_id, u.is_active, u.is_owner, u.last_login, u.created_at,
                    r.name as role_name, r.level as role_level, r.permissions,
                    e.id as employee_id, e.employee_number, e.full_name_ar, e.full_name_en,
                    e.job_title, e.personal_photo,
                    d.name_ar as department_name_ar, d.name_en as department_name_en,
                    s.name_ar as specialization_name_ar, s.name_en as specialization_name_en
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             LEFT JOIN employees e ON u.id = e.user_id 
             LEFT JOIN departments d ON e.department_id = d.id 
             LEFT JOIN specializations s ON e.specialization_id = s.id 
             WHERE u.id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    message: 'User not found',
                    code: 'USER_NOT_FOUND'
                }
            });
        }

        const user = result.rows[0];

        res.json({
            message: 'User information retrieved successfully',
            data: {
                id: user.id,
                email: user.email,
                role: {
                    id: user.role_id,
                    name: user.role_name,
                    level: user.role_level,
                    permissions: user.permissions
                },
                isOwner: user.is_owner,
                employee: user.employee_id ? {
                    id: user.employee_id,
                    employeeNumber: user.employee_number,
                    fullNameAr: user.full_name_ar,
                    fullNameEn: user.full_name_en,
                    jobTitle: user.job_title,
                    personalPhoto: user.personal_photo,
                    department: user.department_name_ar ? {
                        nameAr: user.department_name_ar,
                        nameEn: user.department_name_en
                    } : null,
                    specialization: user.specialization_name_ar ? {
                        nameAr: user.specialization_name_ar,
                        nameEn: user.specialization_name_en
                    } : null
                } : null,
                lastLogin: user.last_login,
                createdAt: user.created_at
            }
        });

    } catch (error) {
        logger.error('Get user info error:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', [
    authenticate,
    body('currentPassword').isLength({ min: 6 }),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: {
                    message: 'Validation failed',
                    details: errors.array()
                }
            });
        }

        const { currentPassword, newPassword } = req.body;

        // Verify current password
        const isCurrentPasswordValid = await req.user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                error: {
                    message: 'Current password is incorrect',
                    code: 'INVALID_CURRENT_PASSWORD'
                }
            });
        }

        // Update password
        await User.update(req.user.id, { password: newPassword });

        // Log password change
        await req.user.createLog('PASSWORD_CHANGE', 'USER', req.user.id, {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        logger.info(`Password changed for user: ${req.user.email}`);

        res.json({
            message: 'Password changed successfully'
        });

    } catch (error) {
        logger.error('Change password error:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

module.exports = router;
