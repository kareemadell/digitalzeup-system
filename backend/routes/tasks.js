const express = require('express');
const { query, withTransaction } = require('../config/database');
const { authenticate, canAccessTask } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks with pagination and filtering
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            status = null, 
            priority = null, 
            category_id = null,
            assigned_to = null,
            client_id = null,
            assigned_by = null,
            sort = 'created_at:desc',
            overdue_only = false
        } = req.query;
        
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE t.deleted_at IS NULL';
        let params = [];
        let paramIndex = 1;

        // Apply role-based filtering
        if (req.user.role_level === 4) { // Employee
            // Can only see their own tasks or tasks they created
            const empResult = await query(
                'SELECT id FROM employees WHERE user_id = $1',
                [req.user.id]
            );
            
            if (empResult.rows.length > 0) {
                whereClause += ` AND (t.assigned_to = $${paramIndex} OR t.created_by = $${paramIndex})`;
                params.push(empResult.rows[0].id);
                paramIndex++;
            }
        }

        // Status filter
        if (status) {
            whereClause += ` AND t.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Priority filter
        if (priority) {
            whereClause += ` AND t.priority = $${paramIndex}`;
            params.push(priority);
            paramIndex++;
        }

        // Category filter
        if (category_id) {
            whereClause += ` AND t.category_id = $${paramIndex}`;
            params.push(category_id);
            paramIndex++;
        }

        // Assigned to filter
        if (assigned_to) {
            whereClause += ` AND t.assigned_to = $${paramIndex}`;
            params.push(assigned_to);
            paramIndex++;
        }

        // Client filter
        if (client_id) {
            whereClause += ` AND t.client_id = $${paramIndex}`;
            params.push(client_id);
            paramIndex++;
        }

        // Created by filter
        if (assigned_by) {
            whereClause += ` AND t.created_by = $${paramIndex}`;
            params.push(assigned_by);
            paramIndex++;
        }

        // Overdue filter
        if (overdue_only === 'true') {
            whereClause += ` AND t.status != 'completed' AND t.due_date < CURRENT_DATE`;
        }

        // Parse sort
        const [sortField, sortOrder] = sort.split(':');
        const validSortFields = ['created_at', 'updated_at', 'due_date', 'priority', 'status', 'title'];
        const orderBy = validSortFields.includes(sortField) ? `t.${sortField}` : 't.created_at';
        const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM tasks t ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        // Get tasks
        params.push(limit, offset);
        const result = await query(
            `SELECT t.*, 
                    tc.name_ar as category_name_ar, tc.name_en as category_name_en,
                    c.full_name_ar as client_name_ar, c.full_name_en as client_name_en,
                    e.full_name_ar as assigned_employee_name_ar, e.full_name_en as assigned_employee_name_en,
                    u.email as created_by_email,
                    COALESCE(tcs.count, 0) as comments_count
             FROM tasks t 
             LEFT JOIN task_categories tc ON t.category_id = tc.id 
             LEFT JOIN clients c ON t.client_id = c.id 
             LEFT JOIN employees e ON t.assigned_to = e.id 
             LEFT JOIN users u ON t.created_by = u.id 
             LEFT JOIN (SELECT task_id, COUNT(*) as count FROM task_comments GROUP BY task_id) tcs ON t.id = tcs.task_id
             ${whereClause}
             ORDER BY ${orderBy} ${orderDirection}
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        // Calculate overdue status
        const tasks = result.rows.map(task => ({
            ...task,
            is_overdue: task.status !== 'completed' && task.due_date && new Date(task.due_date) < new Date()
        }));

        res.json({
            message: 'Tasks retrieved successfully',
            data: tasks,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Error fetching tasks:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get task by ID
 * @access  Private
 */
router.get('/:id', authenticate, canAccessTask, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT t.*, 
                    tc.name_ar as category_name_ar, tc.name_en as category_name_en,
                    c.full_name_ar as client_name_ar, c.full_name_en as client_name_en,
                    e.full_name_ar as assigned_employee_name_ar, e.full_name_en as assigned_employee_name_en,
                    u.email as created_by_email
             FROM tasks t 
             LEFT JOIN task_categories tc ON t.category_id = tc.id 
             LEFT JOIN clients c ON t.client_id = c.id 
             LEFT JOIN employees e ON t.assigned_to = e.id 
             LEFT JOIN users u ON t.created_by = u.id 
             WHERE t.id = $1 AND t.deleted_at IS NULL`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    message: 'Task not found',
                    code: 'TASK_NOT_FOUND'
                }
            });
        }

        // Get comments
        const commentsResult = await query(
            `SELECT tc.*, u.email as commented_by_email, e.full_name_ar as commented_by_name
             FROM task_comments tc 
             LEFT JOIN users u ON tc.commented_by = u.id 
             LEFT JOIN employees e ON u.id = e.user_id 
             WHERE tc.task_id = $1 
             ORDER BY tc.created_at ASC`,
            [id]
        );

        // Get history
        const historyResult = await query(
            `SELECT * FROM task_history WHERE task_id = $1 ORDER BY created_at DESC`,
            [id]
        );

        const task = result.rows[0];
        task.comments = commentsResult.rows;
        task.history = historyResult.rows;

        res.json({
            message: 'Task retrieved successfully',
            data: task
        });

    } catch (error) {
        logger.error('Error fetching task:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   POST /api/tasks
 * @desc    Create new task
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            title,
            description,
            category_id,
            priority = 'medium',
            expected_duration,
            start_date,
            due_date,
            recurrence_type = 'one_time',
            recurrence_end_date,
            client_id,
            assigned_to
        } = req.body;

        // Validate required fields
        if (!title) {
            return res.status(400).json({
                error: {
                    message: 'Task title is required',
                    code: 'VALIDATION_ERROR'
                }
            });
        }

        // Validate priority
        const validPriorities = ['urgent', 'high', 'medium', 'low'];
        if (!validPriorities.includes(priority)) {
            return res.status(400).json({
                error: {
                    message: 'Invalid priority',
                    code: 'VALIDATION_ERROR'
                }
            });
        }

        // Check if assigned user can receive tasks
        if (assigned_to) {
            const assignedUserResult = await query(
                'SELECT u.role_id, r.level FROM employees e JOIN users u ON e.user_id = u.id JOIN roles r ON u.role_id = r.id WHERE e.id = $1',
                [assigned_to]
            );
            
            if (assignedUserResult.rows.length > 0) {
                const assignedUserLevel = assignedUserResult.rows[0].level;
                
                // Regular employees cannot assign tasks to managers
                if (req.user.role_level === 4 && assignedUserLevel <= 3) {
                    return res.status(403).json({
                        error: {
                            message: 'Cannot assign tasks to managers',
                            code: 'ASSIGNMENT_NOT_ALLOWED'
                        }
                    });
                }
            }
        }

        const result = await query(
            `INSERT INTO tasks (
                id, title, description, category_id, priority, expected_duration,
                start_date, due_date, recurrence_type, recurrence_end_date,
                client_id, assigned_to, created_by, status, progress_percentage, created_at
            ) VALUES (
                uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'new', 0, CURRENT_TIMESTAMP
            ) RETURNING *`,
            [
                title, description, category_id, priority, expected_duration,
                start_date, due_date, recurrence_type, recurrence_end_date,
                client_id, assigned_to, req.user.id
            ]
        );

        // Log the action
        await query(
            `INSERT INTO task_history (task_id, action_type, action_description, performed_by) 
             VALUES ($1, 'CREATE', 'Task created', $2)`,
            [result.rows[0].id, req.user.id]
        );

        // Send notification to assigned user
        if (assigned_to) {
            const assignedUserResult = await query(
                'SELECT user_id FROM employees WHERE id = $1',
                [assigned_to]
            );
            
            if (assignedUserResult.rows.length > 0) {
                await query(
                    `INSERT INTO notifications (user_id, title, message, type, category, related_id, related_type) 
                     VALUES ($1, 'مهمة جديدة', $2, 'info', 'task', $3, 'task')`,
                    [
                        assignedUserResult.rows[0].user_id,
                        `تم تعيين مهمة جديدة: ${title}`,
                        result.rows[0].id
                    ]
                );
            }
        }

        logger.info(`Task created: ${result.rows[0].id} by ${req.user.email}`);

        res.status(201).json({
            message: 'Task created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error creating task:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task
 * @access  Private
 */
router.put('/:id', authenticate, canAccessTask, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Build update query
        const allowedFields = [
            'title', 'description', 'category_id', 'priority', 'expected_duration',
            'start_date', 'due_date', 'recurrence_type', 'recurrence_end_date',
            'client_id', 'assigned_to'
        ];

        const fieldsToUpdate = [];
        const params = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                fieldsToUpdate.push(`${key} = $${paramIndex}`);
                params.push(value);
                paramIndex++;
            }
        }

        if (fieldsToUpdate.length === 0) {
            return res.status(400).json({
                error: {
                    message: 'No valid fields to update',
                    code: 'NO_UPDATE_FIELDS'
                }
            });
        }

        fieldsToUpdate.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        const result = await query(
            `UPDATE tasks SET ${fieldsToUpdate.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    message: 'Task not found',
                    code: 'TASK_NOT_FOUND'
                }
            });
        }

        // Log the action
        await query(
            `INSERT INTO task_history (task_id, action_type, action_description, performed_by) 
             VALUES ($1, 'UPDATE', 'Task updated', $2)`,
            [id, req.user.id]
        );

        logger.info(`Task updated: ${id} by ${req.user.email}`);

        res.json({
            message: 'Task updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error updating task:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   PUT /api/tasks/:id/status
 * @desc    Update task status
 * @access  Private
 */
router.put('/:id/status', authenticate, canAccessTask, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, progress_percentage, notes } = req.body;

        // Validate status
        const validStatuses = ['new', 'in_progress', 'on_hold', 'under_review', 'completed', 'delayed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: {
                    message: 'Invalid status',
                    code: 'INVALID_STATUS'
                }
            });
        }

        // Get current task status
        const currentTaskResult = await query(
            'SELECT status, assigned_to FROM tasks WHERE id = $1',
            [id]
        );

        if (currentTaskResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    message: 'Task not found',
                    code: 'TASK_NOT_FOUND'
                }
            });
        }

        const currentTask = currentTaskResult.rows[0];
        const completedAt = status === 'completed' ? 'CURRENT_TIMESTAMP' : 'NULL';

        const result = await query(
            `UPDATE tasks 
             SET status = $1, 
                 progress_percentage = COALESCE($2, progress_percentage),
                 ${status === 'completed' ? 'completed_at = CURRENT_TIMESTAMP,' : ''}
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $3 
             RETURNING *`,
            [status, progress_percentage, id]
        );

        // Log the action
        await query(
            `INSERT INTO task_history (task_id, action_type, action_description, performed_by, old_values, new_values) 
             VALUES ($1, 'STATUS_CHANGE', $2, $3, $4, $5)`,
            [
                id, 
                `Status changed from ${currentTask.status} to ${status}`,
                req.user.id,
                JSON.stringify({ status: currentTask.status }),
                JSON.stringify({ status, progress_percentage, notes })
            ]
        );

        // Send notification for status changes
        if (currentTask.assigned_to && currentTask.assigned_to !== req.user.id) {
            const assignedUserResult = await query(
                'SELECT user_id FROM employees WHERE id = $1',
                [currentTask.assigned_to]
            );
            
            if (assignedUserResult.rows.length > 0) {
                await query(
                    `INSERT INTO notifications (user_id, title, message, type, category, related_id, related_type) 
                     VALUES ($1, 'تحديث حالة المهمة', $2, 'info', 'task', $3, 'task')`,
                    [
                        assignedUserResult.rows[0].user_id,
                        `تم تحديث حالة المهمة إلى: ${status}`,
                        id
                    ]
                );
            }
        }

        logger.info(`Task status updated: ${id} to ${status} by ${req.user.email}`);

        res.json({
            message: 'Task status updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error updating task status:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   POST /api/tasks/:id/comments
 * @desc    Add comment to task
 * @access  Private
 */
router.post('/:id/comments', authenticate, canAccessTask, async (req, res) => {
    try {
        const { id } = req.params;
        const { comment, attachments } = req.body;

        if (!comment || comment.trim() === '') {
            return res.status(400).json({
                error: {
                    message: 'Comment is required',
                    code: 'VALIDATION_ERROR'
                }
            });
        }

        const result = await query(
            `INSERT INTO task_comments (id, task_id, comment, commented_by, attachments) 
             VALUES (uuid_generate_v4(), $1, $2, $3, $4) 
             RETURNING *`,
            [id, comment, req.user.id, JSON.stringify(attachments || [])]
        );

        // Get comment with user info
        const commentResult = await query(
            `SELECT tc.*, u.email as commented_by_email, e.full_name_ar as commented_by_name
             FROM task_comments tc 
             LEFT JOIN users u ON tc.commented_by = u.id 
             LEFT JOIN employees e ON u.id = e.user_id 
             WHERE tc.id = $1`,
            [result.rows[0].id]
        );

        logger.info(`Comment added to task: ${id} by ${req.user.email}`);

        res.status(201).json({
            message: 'Comment added successfully',
            data: commentResult.rows[0]
        });

    } catch (error) {
        logger.error('Error adding comment:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   POST /api/tasks/upload-excel
 * @desc    Upload tasks from Excel file
 * @access  Private (Owner, Direct Manager, Team Leader)
 */
router.post('/upload-excel', authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: {
                    message: 'No file uploaded',
                    code: 'NO_FILE'
                }
            });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.worksheets[0];

        const tasks = [];
        const errors = [];

        // Skip header row (row 1)
        for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            
            const taskData = {
                title: row.getCell(1).value,
                description: row.getCell(2).value,
                category_name: row.getCell(3).value,
                priority: row.getCell(4).value || 'medium',
                expected_duration: row.getCell(5).value,
                due_date: row.getCell(6).value,
                recurrence_type: row.getCell(7).value || 'one_time',
                client_name: row.getCell(8).value,
                assigned_to_email: row.getCell(9).value
            };

            // Validate required fields
            if (!taskData.title) {
                errors.push(`Row ${i}: Title is required`);
                continue;
            }

            try {
                // Find category
                if (taskData.category_name) {
                    const categoryResult = await query(
                        'SELECT id FROM task_categories WHERE name_ar = $1 OR name_en = $1',
                        [taskData.category_name]
                    );
                    if (categoryResult.rows.length > 0) {
                        taskData.category_id = categoryResult.rows[0].id;
                    }
                }

                // Find client
                if (taskData.client_name) {
                    const clientResult = await query(
                        'SELECT id FROM clients WHERE full_name_ar = $1 OR full_name_en = $1 OR company_name = $1',
                        [taskData.client_name]
                    );
                    if (clientResult.rows.length > 0) {
                        taskData.client_id = clientResult.rows[0].id;
                    }
                }

                // Find assigned employee
                if (taskData.assigned_to_email) {
                    const employeeResult = await query(
                        'SELECT e.id FROM employees e JOIN users u ON e.user_id = u.id WHERE u.email = $1',
                        [taskData.assigned_to_email]
                    );
                    if (employeeResult.rows.length > 0) {
                        taskData.assigned_to = employeeResult.rows[0].id;
                    }
                }

                // Create task
                const createResult = await query(
                    `INSERT INTO tasks (
                        id, title, description, category_id, priority, expected_duration,
                        due_date, recurrence_type, client_id, assigned_to, created_by, status, progress_percentage, created_at
                    ) VALUES (
                        uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'new', 0, CURRENT_TIMESTAMP
                    ) RETURNING id`,
                    [
                        taskData.title,
                        taskData.description,
                        taskData.category_id,
                        taskData.priority,
                        taskData.expected_duration,
                        taskData.due_date,
                        taskData.recurrence_type,
                        taskData.client_id,
                        taskData.assigned_to,
                        req.user.id
                    ]
                );

                tasks.push(createResult.rows[0].id);

            } catch (err) {
                errors.push(`Row ${i}: ${err.message}`);
            }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        logger.info(`Excel upload: ${tasks.length} tasks created, ${errors.length} errors by ${req.user.email}`);

        res.json({
            message: 'Excel upload processed',
            data: {
                created: tasks.length,
                errors: errors
            }
        });

    } catch (error) {
        logger.error('Error processing Excel upload:', error);
        res.status(500).json({
            error: {
                message: 'Error processing Excel file',
                code: 'EXCEL_PROCESS_ERROR'
            }
        });
    }
});

/**
 * @route   GET /api/tasks/categories
 * @desc    Get all task categories
 * @access  Private
 */
router.get('/categories/all', authenticate, async (req, res) => {
    try {
        const result = await query(
            `SELECT tc.*, s.name_ar as specialization_name_ar, s.name_en as specialization_name_en
             FROM task_categories tc 
             LEFT JOIN specializations s ON tc.specialization_id = s.id 
             WHERE tc.is_active = true 
             ORDER BY tc.name_ar`
        );

        res.json({
            message: 'Task categories retrieved successfully',
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching task categories:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   GET /api/tasks/my-tasks
 * @desc    Get current user's tasks
 * @access  Private
 */
router.get('/my-tasks', authenticate, async (req, res) => {
    try {
        const { status = null, priority = null, overdue_only = false } = req.query;
        
        // Get current employee ID
        const empResult = await query(
            'SELECT id FROM employees WHERE user_id = $1',
            [req.user.id]
        );

        if (empResult.rows.length === 0) {
            return res.status(404).json({
                error: {
                    message: 'Employee profile not found',
                    code: 'EMPLOYEE_NOT_FOUND'
                }
            });
        }

        const employeeId = empResult.rows[0].id;
        
        let whereClause = 'WHERE t.assigned_to = $1 AND t.deleted_at IS NULL';
        let params = [employeeId];
        let paramIndex = 2;

        if (status) {
            whereClause += ` AND t.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (priority) {
            whereClause += ` AND t.priority = $${paramIndex}`;
            params.push(priority);
            paramIndex++;
        }

        if (overdue_only === 'true') {
            whereClause += ` AND t.status != 'completed' AND t.due_date < CURRENT_DATE`;
        }

        const result = await query(
            `SELECT t.*, 
                    tc.name_ar as category_name_ar, tc.name_en as category_name_en,
                    c.full_name_ar as client_name_ar, c.full_name_en as client_name_en
             FROM tasks t 
             LEFT JOIN task_categories tc ON t.category_id = tc.id 
             LEFT JOIN clients c ON t.client_id = c.id 
             ${whereClause}
             ORDER BY t.priority DESC, t.due_date ASC`,
            params
        );

        res.json({
            message: 'My tasks retrieved successfully',
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching my tasks:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

module.exports = router;
