const express = require('express');
const { query, withTransaction } = require('../config/database');
const { authenticate, canAccessClient } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   GET /api/clients
 * @desc    Get all clients with pagination and filtering
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            status = null, 
            category_id = null,
            assigned_employee_id = null,
            sort = 'created_at:desc'
        } = req.query;
        
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE c.deleted_at IS NULL';
        let params = [];
        let paramIndex = 1;

        // Apply role-based filtering
        if (req.user.role_level === 3) { // Team Leader
            // Can only see clients in their department's specialization
            const deptResult = await query(
                'SELECT department_id FROM employees WHERE user_id = $1',
                [req.user.id]
            );
            
            if (deptResult.rows.length > 0) {
                whereClause += ` AND s.department_id = $${paramIndex}`;
                params.push(deptResult.rows[0].department_id);
                paramIndex++;
            }
        } else if (req.user.role_level === 4) { // Employee
            // Can only see clients assigned to them
            const empResult = await query(
                'SELECT id FROM employees WHERE user_id = $1',
                [req.user.id]
            );
            
            if (empResult.rows.length > 0) {
                whereClause += ` AND c.assigned_employee_id = $${paramIndex}`;
                params.push(empResult.rows[0].id);
                paramIndex++;
            }
        }

        // Search filter
        if (search) {
            whereClause += ` AND (c.full_name_ar ILIKE $${paramIndex} OR c.full_name_en ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex} OR c.primary_email ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Status filter
        if (status) {
            whereClause += ` AND c.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Category filter
        if (category_id) {
            whereClause += ` AND c.category_id = $${paramIndex}`;
            params.push(category_id);
            paramIndex++;
        }

        // Assigned employee filter
        if (assigned_employee_id) {
            whereClause += ` AND c.assigned_employee_id = $${paramIndex}`;
            params.push(assigned_employee_id);
            paramIndex++;
        }

        // Parse sort
        const [sortField, sortOrder] = sort.split(':');
        const validSortFields = ['created_at', 'updated_at', 'full_name_ar', 'full_name_en', 'company_name', 'status'];
        const orderBy = validSortFields.includes(sortField) ? `c.${sortField}` : 'c.created_at';
        const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM clients c 
             LEFT JOIN client_categories cc ON c.category_id = cc.id 
             LEFT JOIN specializations s ON cc.specialization_id = s.id 
             ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        // Get clients
        params.push(limit, offset);
        const result = await query(
            `SELECT c.*, 
                    cc.name_ar as category_name_ar, cc.name_en as category_name_en,
                    e.full_name_ar as assigned_employee_name_ar, e.full_name_en as assigned_employee_name_en,
                    s.name_ar as specialization_name_ar, s.name_en as specialization_name_en,
                    COALESCE(SUM(p.amount), 0) as total_paid,
                    COALESCE(COUNT(op.id), 0) as outstanding_count
             FROM clients c 
             LEFT JOIN client_categories cc ON c.category_id = cc.id 
             LEFT JOIN employees e ON c.assigned_employee_id = e.id 
             LEFT JOIN specializations s ON cc.specialization_id = s.id 
             LEFT JOIN payments p ON c.id = p.client_id 
             LEFT JOIN outstanding_payments op ON c.id = op.client_id 
             ${whereClause}
             GROUP BY c.id, cc.name_ar, cc.name_en, e.full_name_ar, e.full_name_en, s.name_ar, s.name_en
             ORDER BY ${orderBy} ${orderDirection}
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        res.json({
            message: 'Clients retrieved successfully',
            data: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Error fetching clients:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   GET /api/clients/:id
 * @desc    Get client by ID
 * @access  Private
 */
router.get('/:id', authenticate, canAccessClient, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await query(
            `SELECT c.*, 
                    cc.name_ar as category_name_ar, cc.name_en as category_name_en,
                    cc.specialization_id,
                    e.full_name_ar as assigned_employee_name_ar, e.full_name_en as assigned_employee_name_en,
                    e.employee_number as assigned_employee_number,
                    COALESCE(SUM(p.amount), 0) as total_paid,
                COALESCE(SUM(CASE WHEN op.status IN ('warning', 'moderate', 'critical', 'danger') THEN op.amount ELSE 0 END), 0) as total_outstanding
             FROM clients c 
             LEFT JOIN client_categories cc ON c.category_id = cc.id 
             LEFT JOIN employees e ON c.assigned_employee_id = e.id 
             LEFT JOIN payments p ON c.id = p.client_id 
             LEFT JOIN outstanding_payments op ON c.id = op.client_id 
             WHERE c.id = $1 AND c.deleted_at IS NULL
             GROUP BY c.id, cc.name_ar, cc.name_en, cc.specialization_id, e.full_name_ar, e.full_name_en, e.employee_number`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    message: 'Client not found',
                    code: 'CLIENT_NOT_FOUND'
                }
            });
        }

        // Get client history
        const historyResult = await query(
            `SELECT * FROM client_history WHERE client_id = $1 ORDER BY created_at DESC LIMIT 10`,
            [id]
        );

        const client = result.rows[0];
        client.history = historyResult.rows;

        res.json({
            message: 'Client retrieved successfully',
            data: client
        });

    } catch (error) {
        logger.error('Error fetching client:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   POST /api/clients
 * @desc    Create new client
 * @access  Private (Owner, Direct Manager, Team Leader)
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            full_name_ar,
            full_name_en,
            id_number,
            commercial_registration,
            company_name,
            business_field,
            primary_phone,
            secondary_phone,
            primary_email,
            secondary_email,
            address,
            country,
            website,
            social_media,
            category_id,
            assigned_employee_id,
            contract_number,
            contract_start_date,
            contract_end_date,
            contract_value,
            contract_currency,
            services,
            payment_type
        } = req.body;

        // Validate required fields
        if (!full_name_ar || !primary_phone || !primary_email) {
            return res.status(400).json({
                error: {
                    message: 'Full name (Arabic), primary phone, and primary email are required',
                    code: 'VALIDATION_ERROR'
                }
            });
        }

        // Generate contract number if not provided
        const finalContractNumber = contract_number || `CNT${Date.now()}`;

        const result = await query(
            `INSERT INTO clients (
                id, full_name_ar, full_name_en, id_number, commercial_registration,
                company_name, business_field, primary_phone, secondary_phone,
                primary_email, secondary_email, address, country, website,
                social_media, category_id, assigned_employee_id, contract_number,
                contract_start_date, contract_end_date, contract_value,
                contract_currency, services, payment_type, status, created_by, created_at
            ) VALUES (
                uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, 'active', $24, CURRENT_TIMESTAMP
            ) RETURNING *`,
            [
                full_name_ar, full_name_en, id_number, commercial_registration,
                company_name, business_field, primary_phone, secondary_phone,
                primary_email, secondary_email, address, country, website,
                JSON.stringify(social_media || {}), category_id, assigned_employee_id,
                finalContractNumber, contract_start_date, contract_end_date,
                contract_value, contract_currency || 'SAR', JSON.stringify(services || []),
                payment_type || 'postpaid', req.user.id
            ]
        );

        // Log the action
        await query(
            `INSERT INTO client_history (client_id, action_type, action_description, performed_by) 
             VALUES ($1, 'CREATE', 'Client created', $2)`,
            [result.rows[0].id, req.user.id]
        );

        logger.info(`Client created: ${result.rows[0].id} by ${req.user.email}`);

        res.status(201).json({
            message: 'Client created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error creating client:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   PUT /api/clients/:id
 * @desc    Update client
 * @access  Private
 */
router.put('/:id', authenticate, canAccessClient, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        // Build update query
        const allowedFields = [
            'full_name_ar', 'full_name_en', 'id_number', 'commercial_registration',
            'company_name', 'business_field', 'primary_phone', 'secondary_phone',
            'primary_email', 'secondary_email', 'address', 'country', 'website',
            'social_media', 'category_id', 'assigned_employee_id', 'contract_number',
            'contract_start_date', 'contract_end_date', 'contract_value',
            'contract_currency', 'services', 'payment_type', 'status'
        ];

        const fieldsToUpdate = [];
        const params = [];
        let paramIndex = 1;

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key)) {
                if (key === 'social_media' || key === 'services') {
                    fieldsToUpdate.push(`${key} = $${paramIndex}`);
                    params.push(JSON.stringify(value));
                } else {
                    fieldsToUpdate.push(`${key} = $${paramIndex}`);
                    params.push(value);
                }
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
            `UPDATE clients SET ${fieldsToUpdate.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: {
                    message: 'Client not found',
                    code: 'CLIENT_NOT_FOUND'
                }
            });
        }

        // Log the action
        await query(
            `INSERT INTO client_history (client_id, action_type, action_description, performed_by) 
             VALUES ($1, 'UPDATE', 'Client updated', $2)`,
            [id, req.user.id]
        );

        logger.info(`Client updated: ${id} by ${req.user.email}`);

        res.json({
            message: 'Client updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error updating client:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   DELETE /api/clients/:id
 * @desc    Soft delete client
 * @access  Private (Owner, Direct Manager)
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { permanent = false } = req.query;

        // Only owner can permanently delete
        if (permanent === 'true' && !req.user.is_owner) {
            return res.status(403).json({
                error: {
                    message: 'Only owner can permanently delete clients',
                    code: 'PERMANENT_DELETE_DENIED'
                }
            });
        }

        // Check for outstanding payments
        const outstandingResult = await query(
            'SELECT COUNT(*) FROM outstanding_payments WHERE client_id = $1 AND status != \'paid\'',
            [id]
        );

        if (parseInt(outstandingResult.rows[0].count) > 0 && permanent !== 'true') {
            return res.status(400).json({
                error: {
                    message: 'Cannot delete client with outstanding payments',
                    code: 'OUTSTANDING_PAYMENTS_EXIST'
                }
            });
        }

        if (permanent === 'true') {
            // Permanent delete
            await query('DELETE FROM clients WHERE id = $1', [id]);
            logger.info(`Client permanently deleted: ${id} by owner ${req.user.email}`);
        } else {
            // Soft delete
            await query(
                'UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
                [id]
            );
            logger.info(`Client soft deleted: ${id} by ${req.user.email}`);
        }

        res.json({
            message: permanent === 'true' ? 'Client permanently deleted' : 'Client deactivated successfully'
        });

    } catch (error) {
        logger.error('Error deleting client:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   GET /api/clients/categories
 * @desc    Get all client categories
 * @access  Private
 */
router.get('/categories/all', authenticate, async (req, res) => {
    try {
        const result = await query(
            `SELECT cc.*, s.name_ar as specialization_name_ar, s.name_en as specialization_name_en
             FROM client_categories cc 
             LEFT JOIN specializations s ON cc.specialization_id = s.id 
             WHERE cc.is_active = true 
             ORDER BY cc.name_ar`
        );

        res.json({
            message: 'Client categories retrieved successfully',
            data: result.rows
        });

    } catch (error) {
        logger.error('Error fetching client categories:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

/**
 * @route   POST /api/clients/categories
 * @desc    Create client category
 * @access  Private (Owner, Direct Manager)
 */
router.post('/categories', authenticate, async (req, res) => {
    try {
        const { name_ar, name_en, specialization_id, description } = req.body;

        if (!name_ar || !name_en) {
            return res.status(400).json({
                error: {
                    message: 'Arabic and English names are required',
                    code: 'VALIDATION_ERROR'
                }
            });
        }

        const result = await query(
            `INSERT INTO client_categories (name_ar, name_en, specialization_id, description) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [name_ar, name_en, specialization_id, description]
        );

        res.status(201).json({
            message: 'Client category created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Error creating client category:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                code: 'SERVER_ERROR'
            }
        });
    }
});

module.exports = router;
