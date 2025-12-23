const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { getUserById } = require('../models/User');

let io;

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 */
function initializeSocket(server) {
    io = socketIo(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await getUserById(decoded.userId);
            
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.user = user;
            next();
        } catch (error) {
            logger.error('Socket authentication error:', error);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // Connection handling
    io.on('connection', (socket) => {
        logger.info(`User connected: ${socket.user.email} (${socket.id})`);

        // Join user-specific room
        socket.join(`user_${socket.user.id}`);
        
        // Join role-specific room
        socket.join(`role_${socket.user.role_id}`);

        // Handle disconnection
        socket.on('disconnect', () => {
            logger.info(`User disconnected: ${socket.user.email} (${socket.id})`);
        });

        // Handle join room requests
        socket.on('join_room', (room) => {
            socket.join(room);
            logger.info(`User ${socket.user.email} joined room: ${room}`);
        });

        // Handle leave room requests
        socket.on('leave_room', (room) => {
            socket.leave(room);
            logger.info(`User ${socket.user.email} left room: ${room}`);
        });

        // Handle notification mark as read
        socket.on('mark_notification_read', (notificationId) => {
            // This will be handled by the notification controller
            socket.broadcast.to(`user_${socket.user.id}`).emit('notification_read', {
                notificationId,
                userId: socket.user.id
            });
        });

        // Handle task updates
        socket.on('task_update', (data) => {
            // Broadcast to relevant users based on task assignment
            if (data.assignedTo) {
                socket.broadcast.to(`user_${data.assignedTo}`).emit('task_updated', data);
            }
        });

        // Handle client updates
        socket.on('client_update', (data) => {
            // Broadcast to users with access to this client
            socket.broadcast.emit('client_updated', data);
        });

        // Handle financial updates
        socket.on('payment_update', (data) => {
            // Broadcast to accountants and managers
            socket.broadcast.to('role_5').emit('payment_updated', data); // Accountants
            socket.broadcast.to('role_2').emit('payment_updated', data); // Direct Managers
            socket.broadcast.to('role_1').emit('payment_updated', data); // Owner
        });
    });

    return io;
}

/**
 * Get Socket.IO instance
 */
function getIo() {
    return io;
}

/**
 * Send notification to specific user
 * @param {string} userId - User ID
 * @param {Object} notification - Notification data
 */
function sendToUser(userId, notification) {
    if (io) {
        io.to(`user_${userId}`).emit('notification', notification);
        logger.info(`Notification sent to user ${userId}:`, notification);
    }
}

/**
 * Send notification to users with specific role
 * @param {number} roleId - Role ID
 * @param {Object} notification - Notification data
 */
function sendToRole(roleId, notification) {
    if (io) {
        io.to(`role_${roleId}`).emit('notification', notification);
        logger.info(`Notification sent to role ${roleId}:`, notification);
    }
}

/**
 * Send notification to all connected users
 * @param {Object} notification - Notification data
 */
function broadcast(notification) {
    if (io) {
        io.emit('notification', notification);
        logger.info('Broadcast notification sent:', notification);
    }
}

/**
 * Send task update to assigned user
 * @param {string} userId - User ID
 * @param {Object} taskData - Task update data
 */
function sendTaskUpdate(userId, taskData) {
    if (io) {
        io.to(`user_${userId}`).emit('task_update', taskData);
        logger.info(`Task update sent to user ${userId}:`, taskData);
    }
}

/**
 * Send payment reminder
 * @param {string} userId - User ID
 * @param {Object} paymentData - Payment reminder data
 */
function sendPaymentReminder(userId, paymentData) {
    if (io) {
        io.to(`user_${userId}`).emit('payment_reminder', paymentData);
        logger.info(`Payment reminder sent to user ${userId}:`, paymentData);
    }
}

module.exports = {
    initializeSocket,
    getIo,
    sendToUser,
    sendToRole,
    broadcast,
    sendTaskUpdate,
    sendPaymentReminder
};
