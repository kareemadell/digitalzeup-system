const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Authenticate user with JWT token
 */
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                error: {
                    message: 'Access denied. No token provided.',
                    code: 'NO_TOKEN'
                }
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.getUserById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                error: {
                    message: 'Invalid token. User not found.',
                    code: 'INVALID_USER'
                }
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                error: {
                    message: 'Account is deactivated.',
                    code: 'ACCOUNT_DEACTIVATED'
                }
            });
        }

        req.user = user;
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: {
                    message: 'Token has expired.',
                    code: 'TOKEN_EXPIRED'
                }
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: {
                    message: 'Invalid token.',
                    code: 'INVALID_TOKEN'
                }
            });
        }

        return res.status(401).json({
            error: {
                message: 'Authentication failed.',
                code: 'AUTH_FAILED'
            }
        });
    }
};

/**
 * Authorize user based on role level
 * @param {number} minLevel - Minimum role level required
 */
const authorize = (minLevel) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: {
                    message: 'User not authenticated.',
                    code: 'NOT_AUTHENTICATED'
                }
            });
        }

        if (req.user.role_level > minLevel) {
            logger.warn(`Authorization failed: User ${req.user.email} (level ${req.user.role_level}) tried to access level ${minLevel} resource`);
            return res.status(403).json({
                error: {
                    message: 'Access denied. Insufficient permissions.',
                    code: 'INSUFFICIENT_PERMISSIONS'
                }
            });
        }

        next();
    };
};

/**
 * Check specific permission
 * @param {string} resource - Resource name
 * @param {string} action - Action name (create, read, update, delete)
 */
const checkPermission = (resource, action) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: {
                    message: 'User not authenticated.',
                    code: 'NOT_AUTHENTICATED'
                }
            });
        }

        // Owner has all permissions
        if (req.user.is_owner) {
            return next();
        }

        const hasPermission = await User.prototype.hasPermission.call(req.user, resource, action);
        
        if (!hasPermission) {
            logger.warn(`Permission denied: User ${req.user.email} tried to ${action} ${resource}`);
            return res.status(403).json({
                error: {
                    message: `Access denied. You don't have permission to ${action} ${resource}.`,
                    code: 'PERMISSION_DENIED'
                }
            });
        }

        next();
    };
};

/**
 * Check if user can access employee data
 */
const canAccessEmployee = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: {
                message: 'User not authenticated.',
                code: 'NOT_AUTHENTICATED'
            }
        });
    }

    // Owner and Direct Manager can access all employees
    if (req.user.role_level <= 2) {
        return next();
    }

    // Team Leader can only access their department employees
    if (req.user.role_level === 3) {
        const employeeId = req.params.id;
        const { query } = require('../config/database');
        
        const result = await query(
            `SELECT d.id as department_id 
             FROM employees e 
             JOIN departments d ON e.department_id = d.id 
             WHERE e.id = $1`,
            [employeeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    message: 'Employee not found.',
                    code: 'EMPLOYEE_NOT_FOUND'
                }
            });
        }

        const userDepartment = await query(
            `SELECT department_id FROM employees WHERE user_id = $1`,
            [req.user.id]
        );

        if (userDepartment.rows.length === 0 || 
            userDepartment.rows[0].department_id !== result.rows[0].department_id) {
            return res.status(403).json({
                error: {
                    message: 'Access denied. You can only access employees from your department.',
                    code: 'DEPARTMENT_ACCESS_DENIED'
                }
            });
        }

        return next();
    }

    // Regular employees can only access their own data
    if (req.user.role_level === 4) {
        const employeeId = req.params.id;
        const { query } = require('../config/database');
        
        const result = await query(
            `SELECT id FROM employees WHERE user_id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0 || result.rows[0].id !== employeeId) {
            return res.status(403).json({
                error: {
                    message: 'Access denied. You can only access your own data.',
                    code: 'SELF_ACCESS_ONLY'
                }
            });
        }

        return next();
    }

    return res.status(403).json({
        error: {
            message: 'Access denied.',
            code: 'ACCESS_DENIED'
        }
    });
};

/**
 * Check if user can access client data
 */
const canAccessClient = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: {
                message: 'User not authenticated.',
                code: 'NOT_AUTHENTICATED'
            }
        });
    }

    // Owner and Direct Manager can access all clients
    if (req.user.role_level <= 2) {
        return next();
    }

    const clientId = req.params.id;
    const { query } = require('../config/database');

    // Get client information
    const clientResult = await query(
        `SELECT assigned_employee_id, c.specialization_id 
         FROM clients c 
         JOIN client_categories cc ON c.category_id = cc.id 
         WHERE c.id = $1`,
        [clientId]
    );

    if (clientResult.rows.length === 0) {
        return res.status(404).json({
            error: {
                message: 'Client not found.',
                code: 'CLIENT_NOT_FOUND'
            }
        });
    }

    const client = clientResult.rows[0];

    // Team Leader can access clients in their department's specialization
    if (req.user.role_level === 3) {
        const userDepartment = await query(
            `SELECT department_id FROM employees WHERE user_id = $1`,
            [req.user.id]
        );

        const specializationResult = await query(
            `SELECT department_id FROM specializations WHERE id = $1`,
            [client.specialization_id]
        );

        if (userDepartment.rows.length > 0 && 
            specializationResult.rows.length > 0 &&
            userDepartment.rows[0].department_id === specializationResult.rows[0].department_id) {
            return next();
        }
    }

    // Check if user is assigned to this client
    const userEmployee = await query(
        `SELECT id FROM employees WHERE user_id = $1`,
        [req.user.id]
    );

    if (userEmployee.rows.length > 0 && 
        userEmployee.rows[0].id === client.assigned_employee_id) {
        return next();
    }

    return res.status(403).json({
        error: {
            message: 'Access denied. You can only access clients assigned to you or in your department.',
            code: 'CLIENT_ACCESS_DENIED'
        }
    });
};

/**
 * Check if user can access task data
 */
const canAccessTask = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: {
                message: 'User not authenticated.',
                code: 'NOT_AUTHENTICATED'
            }
        });
    }

    // Owner and Direct Manager can access all tasks
    if (req.user.role_level <= 2) {
        return next();
    }

    const taskId = req.params.id;
    const { query } = require('../config/database');

    // Get task information
    const taskResult = await query(
        `SELECT assigned_to, created_by FROM tasks WHERE id = $1`,
        [taskId]
    );

    if (taskResult.rows.length === 0) {
        return res.status(404).json({
            error: {
                message: 'Task not found.',
                code: 'TASK_NOT_FOUND'
            }
        });
    }

    const task = taskResult.rows[0];

    // Users can access tasks they created or are assigned to
    if (task.created_by === req.user.id || task.assigned_to === req.user.id) {
        return next();
    }

    // Team Leader can access tasks in their department
    if (req.user.role_level === 3) {
        const userDepartment = await query(
            `SELECT department_id FROM employees WHERE user_id = $1`,
            [req.user.id]
        );

        const assignedEmployeeDepartment = await query(
            `SELECT department_id FROM employees WHERE id = $1`,
            [task.assigned_to]
        );

        if (userDepartment.rows.length > 0 && 
            assignedEmployeeDepartment.rows.length > 0 &&
            userDepartment.rows[0].department_id === assignedEmployeeDepartment.rows[0].department_id) {
            return next();
        }
    }

    return res.status(403).json({
        error: {
            message: 'Access denied. You can only access your own tasks or tasks in your department.',
            code: 'TASK_ACCESS_DENIED'
        }
    });
};

/**
 * Check if user can access financial data
 */
const canAccessFinancial = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: {
                message: 'User not authenticated.',
                code: 'NOT_AUTHENTICATED'
            }
        });
    }

    // Only Owner, Direct Manager, and Accountant can access financial data
    if (req.user.role_level <= 2 || req.user.role_level === 5) {
        return next();
    }

    return res.status(403).json({
        error: {
            message: 'Access denied. Financial data is restricted to authorized personnel only.',
            code: 'FINANCIAL_ACCESS_DENIED'
        }
    });
};

module.exports = {
    authenticate,
    authorize,
    checkPermission,
    canAccessEmployee,
    canAccessClient,
    canAccessTask,
    canAccessFinancial
};
