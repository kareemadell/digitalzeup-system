/**
 * DigitalZeup.net Management System - Dashboard Manager
 */

class DashboardManager {
    constructor() {
        this.currentView = 'dashboard';
        this.currentUser = null;
    }

    /**
     * Initialize dashboard
     */
    async init() {
        this.currentUser = Auth.getCurrentUser();
        this.setupEventListeners();
        this.renderSidebar();
        this.renderDashboard();
        this.startRealTimeUpdates();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Sidebar toggle
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            await this.handleLogout();
        });

        // Notifications
        document.getElementById('notificationsBtn')?.addEventListener('click', () => {
            this.toggleNotifications();
        });

        // Mark all notifications as read
        document.getElementById('markAllRead')?.addEventListener('click', () => {
            this.markAllNotificationsAsRead();
        });

        // User profile click
        document.querySelector('.user-profile')?.addEventListener('click', () => {
            this.showUserProfile();
        });
    }

    /**
     * Render sidebar menu
     */
    renderSidebar() {
        const menuContainer = document.getElementById('sidebarMenu');
        if (!menuContainer) return;

        const menuItems = Auth.getAllowedMenuItems();
        
        menuContainer.innerHTML = menuItems.map(item => `
            <li>
                <a href="#" data-view="${item.id}" class="menu-item ${item.id === this.currentView ? 'active' : ''}">
                    <i class="fas ${item.icon}"></i>
                    <span>${item.title}</span>
                </a>
            </li>
        `).join('');

        // Add click listeners to menu items
        menuContainer.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                this.navigateToView(view);
            });
        });
    }

    /**
     * Navigate to specific view
     */
    navigateToView(view) {
        this.currentView = view;
        
        // Update active menu item
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // Update page title
        const menuItems = Auth.getAllowedMenuItems();
        const currentItem = menuItems.find(item => item.id === view);
        document.getElementById('pageTitle').textContent = currentItem?.title || 'لوحة التحكم';

        // Render view content
        this.renderViewContent(view);
    }

    /**
     * Render view content
     */
    renderViewContent(view) {
        const content = document.getElementById('dashboardContent');
        
        switch (view) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'employees':
                this.renderEmployeesView();
                break;
            case 'clients':
                this.renderClientsView();
                break;
            case 'tasks':
                this.renderTasksView();
                break;
            case 'financial':
                this.renderFinancialView();
                break;
            case 'reports':
                this.renderReportsView();
                break;
            case 'settings':
                this.renderSettingsView();
                break;
            default:
                this.renderDashboard();
        }
    }

    /**
     * Render main dashboard
     */
    async renderDashboard() {
        const content = document.getElementById('dashboardContent');
        
        try {
            // Load dashboard statistics
            const stats = await this.loadDashboardStats();
            
            content.innerHTML = `
                <div class="dashboard-grid">
                    ${this.renderStatsWidgets(stats)}
                </div>
                
                <div class="dashboard-grid">
                    ${this.renderRecentTasksWidget()}
                    ${this.renderRecentClientsWidget()}
                    ${this.renderPendingPaymentsWidget()}
                </div>
            `;

            // Load recent data
            this.loadRecentData();
            
        } catch (error) {
            console.error('Error loading dashboard:', error);
            content.innerHTML = this.renderErrorMessage('فشل تحميل لوحة التحكم');
        }
    }

    /**
     * Render statistics widgets
     */
    renderStatsWidgets(stats) {
        const widgets = [
            {
                title: 'إجمالي الموظفين',
                value: stats.totalEmployees || 0,
                icon: 'fa-users',
                color: 'var(--info-color)',
                change: stats.employeesChange || 0
            },
            {
                title: 'إجمالي العملاء',
                value: stats.totalClients || 0,
                icon: 'fa-handshake',
                color: 'var(--success-color)',
                change: stats.clientsChange || 0
            },
            {
                title: 'المهام النشطة',
                value: stats.activeTasks || 0,
                icon: 'fa-tasks',
                color: 'var(--warning-color)',
                change: stats.tasksChange || 0
            },
            {
                title: 'الإيرادات الشهرية',
                value: `${this.formatCurrency(stats.monthlyRevenue || 0)}`,
                icon: 'fa-money-bill-wave',
                color: 'var(--success-color)',
                change: stats.revenueChange || 0
            }
        ];

        return widgets.map(widget => `
            <div class="widget">
                <div class="widget-header">
                    <div class="widget-icon" style="background: ${widget.color}">
                        <i class="fas ${widget.icon}"></i>
                    </div>
                    <h3 class="widget-title">${widget.title}</h3>
                </div>
                <div class="widget-stats">
                    <span class="widget-value">${widget.value}</span>
                </div>
                ${widget.change !== 0 ? `
                    <div class="widget-change ${widget.change > 0 ? 'positive' : 'negative'}">
                        <i class="fas ${widget.change > 0 ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                        <span>${Math.abs(widget.change)}%</span>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    /**
     * Render recent tasks widget
     */
    renderRecentTasksWidget() {
        return `
            <div class="widget">
                <div class="widget-header">
                    <h3 class="widget-title">أحدث المهام</h3>
                    <button class="btn btn-text" onclick="Dashboard.navigateToView('tasks')">
                        عرض الكل <i class="fas fa-arrow-left"></i>
                    </button>
                </div>
                <div id="recentTasksList">
                    <div class="loading-text">جاري التحميل...</div>
                </div>
            </div>
        `;
    }

    /**
     * Render recent clients widget
     */
    renderRecentClientsWidget() {
        return `
            <div class="widget">
                <div class="widget-header">
                    <h3 class="widget-title">أحدث العملاء</h3>
                    <button class="btn btn-text" onclick="Dashboard.navigateToView('clients')">
                        عرض الكل <i class="fas fa-arrow-left"></i>
                    </button>
                </div>
                <div id="recentClientsList">
                    <div class="loading-text">جاري التحميل...</div>
                </div>
            </div>
        `;
    }

    /**
     * Render pending payments widget
     */
    renderPendingPaymentsWidget() {
        return `
            <div class="widget">
                <div class="widget-header">
                    <h3 class="widget-title">المدفوعات المعلقة</h3>
                    <button class="btn btn-text" onclick="Dashboard.navigateToView('financial')">
                        عرض الكل <i class="fas fa-arrow-left"></i>
                    </button>
                </div>
                <div id="pendingPaymentsList">
                    <div class="loading-text">جاري التحميل...</div>
                </div>
            </div>
        `;
    }

    /**
     * Load dashboard statistics
     */
    async loadDashboardStats() {
        try {
            const response = await ReportsAPI.getDashboardStats();
            return response.data || {};
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            return {};
        }
    }

    /**
     * Load recent data
     */
    async loadRecentData() {
        try {
            // Load recent tasks
            const tasksResponse = await TasksAPI.getAll({ 
                limit: 5, 
                sort: 'created_at:desc' 
            });
            this.renderRecentTasksList(tasksResponse.data || []);

            // Load recent clients
            const clientsResponse = await ClientsAPI.getAll({ 
                limit: 5, 
                sort: 'created_at:desc' 
            });
            this.renderRecentClientsList(clientsResponse.data || []);

            // Load pending payments
            const paymentsResponse = await FinancialAPI.getOutstanding({ 
                limit: 5,
                status: 'overdue'
            });
            this.renderPendingPaymentsList(paymentsResponse.data || []);

        } catch (error) {
            console.error('Error loading recent data:', error);
        }
    }

    /**
     * Render recent tasks list
     */
    renderRecentTasksList(tasks) {
        const container = document.getElementById('recentTasksList');
        if (!container) return;

        if (tasks.length === 0) {
            container.innerHTML = '<p class="text-center text-gray">لا توجد مهام</p>';
            return;
        }

        container.innerHTML = tasks.map(task => `
            <div class="task-item">
                <div class="task-info">
                    <h4>${task.title}</h4>
                    <p class="task-meta">
                        <span class="priority ${task.priority}">${CONFIG.TASK_PRIORITIES[task.priority]?.name || task.priority}</span>
                        <span class="status ${task.status}">${CONFIG.TASK_STATUSES[task.status]?.name || task.status}</span>
                    </p>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render recent clients list
     */
    renderRecentClientsList(clients) {
        const container = document.getElementById('recentClientsList');
        if (!container) return;

        if (clients.length === 0) {
            container.innerHTML = '<p class="text-center text-gray">لا يوجد عملاء</p>';
            return;
        }

        container.innerHTML = clients.map(client => `
            <div class="client-item">
                <div class="client-info">
                    <h4>${client.fullNameAr || client.fullNameEn}</h4>
                    <p class="client-meta">
                        <span class="status ${client.status}">${CONFIG.CLIENT_STATUSES[client.status]?.name || client.status}</span>
                        <span class="company">${client.companyName || ''}</span>
                    </p>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render pending payments list
     */
    renderPendingPaymentsList(payments) {
        const container = document.getElementById('pendingPaymentsList');
        if (!container) return;

        if (payments.length === 0) {
            container.innerHTML = '<p class="text-center text-gray">لا توجد مدفوعات معلقة</p>';
            return;
        }

        container.innerHTML = payments.map(payment => `
            <div class="payment-item">
                <div class="payment-info">
                    <h4>${payment.clientName}</h4>
                    <p class="payment-meta">
                        <span class="amount">${this.formatCurrency(payment.amount)}</span>
                        <span class="overdue ${payment.daysDelayed > 7 ? 'critical' : ''}">
                            متأخر ${payment.daysDelayed} يوم
                        </span>
                    </p>
                </div>
            </div>
        `).join('');
    }

    /**
     * Format currency
     */
    formatCurrency(amount, currency = 'SAR') {
        const currencyInfo = CONFIG.CURRENCIES[currency];
        const symbol = currencyInfo?.symbol || currency;
        return `${symbol} ${Number(amount).toLocaleString()}`;
    }

    /**
     * Render error message
     */
    renderErrorMessage(message) {
        return `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    إعادة المحاولة
                </button>
            </div>
        `;
    }

    /**
     * Handle logout
     */
    async handleLogout() {
        if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
            showLoading();
            
            try {
                await Auth.logout();
                window.location.reload();
            } catch (error) {
                console.error('Logout error:', error);
                window.location.reload();
            } finally {
                hideLoading();
            }
        }
    }

    /**
     * Toggle notifications panel
     */
    toggleNotifications() {
        const panel = document.getElementById('notificationsPanel');
        panel.classList.toggle('hidden');
        
        if (!panel.classList.contains('hidden')) {
            this.loadNotifications();
        }
    }

    /**
     * Load notifications
     */
    async loadNotifications() {
        try {
            const response = await NotificationsAPI.getAll({ limit: 10 });
            this.renderNotificationsList(response.data || []);
            
            // Update badge
            const unreadCount = response.data.filter(n => !n.isRead).length;
            document.getElementById('notificationBadge').textContent = unreadCount;
            
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    /**
     * Render notifications list
     */
    renderNotificationsList(notifications) {
        const container = document.getElementById('notificationsList');
        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = '<p class="text-center text-gray">لا توجد إشعارات</p>';
            return;
        }

        container.innerHTML = notifications.map(notification => `
            <div class="notification-item ${notification.isRead ? '' : 'unread'}" 
                 onclick="Dashboard.markNotificationAsRead('${notification.id}')">
                <div class="notification-content">
                    <h4>${notification.title}</h4>
                    <p>${notification.message}</p>
                    <span class="notification-time">${this.formatTime(notification.createdAt)}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Mark notification as read
     */
    async markNotificationAsRead(notificationId) {
        try {
            await NotificationsAPI.markAsRead(notificationId);
            this.loadNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllNotificationsAsRead() {
        try {
            await NotificationsAPI.markAllAsRead();
            this.loadNotifications();
            showToast('تم تحديد جميع الإشعارات كمقروءة', 'success');
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            showToast('فشل تحديث الإشعارات', 'error');
        }
    }

    /**
     * Format time for display
     */
    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        if (hours < 24) return `منذ ${hours} ساعة`;
        if (days < 7) return `منذ ${days} يوم`;
        
        return date.toLocaleDateString('ar-SA');
    }

    /**
     * Show user profile modal
     */
    showUserProfile() {
        const user = Auth.getCurrentUser();
        if (!user) return;

        const modal = this.createModal('المعلومات الشخصية', `
            <div class="user-profile-modal">
                <div class="profile-header">
                    <img src="${user.employee?.personalPhoto || 'assets/avatar.png'}" 
                         alt="${Auth.getDisplayName()}" class="profile-avatar">
                    <div class="profile-info">
                        <h3>${Auth.getDisplayName()}</h3>
                        <p class="role">${Auth.getRoleDisplayName()}</p>
                        <p class="email">${user.email}</p>
                    </div>
                </div>
                
                ${user.employee ? `
                    <div class="profile-details">
                        <div class="detail-row">
                            <span>رقم الموظف:</span>
                            <span>${user.employee.employeeNumber || 'غير محدد'}</span>
                        </div>
                        <div class="detail-row">
                            <span>المسمى الوظيفي:</span>
                            <span>${user.employee.jobTitle || 'غير محدد'}</span>
                        </div>
                        <div class="detail-row">
                            <span>القسم:</span>
                            <span>${user.employee.department?.nameAr || 'غير محدد'}</span>
                        </div>
                        <div class="detail-row">
                            <span>تاريخ التعيين:</span>
                            <span>${user.employee.hireDate ? new Date(user.employee.hireDate).toLocaleDateString('ar-SA') : 'غير محدد'}</span>
                        </div>
                    </div>
                ` : ''}
                
                <div class="profile-actions">
                    <button class="btn btn-primary" onclick="Dashboard.showChangePasswordModal()">
                        تغيير كلمة المرور
                    </button>
                </div>
            </div>
        `);

        this.showModal(modal);
    }

    /**
     * Show change password modal
     */
    showChangePasswordModal() {
        const modal = this.createModal('تغيير كلمة المرور', `
            <form id="changePasswordForm" class="change-password-form">
                <div class="form-group">
                    <label for="currentPassword">كلمة المرور الحالية</label>
                    <input type="password" id="currentPassword" name="currentPassword" required>
                </div>
                <div class="form-group">
                    <label for="newPassword">كلمة المرور الجديدة</label>
                    <input type="password" id="newPassword" name="newPassword" required minlength="6">
                </div>
                <div class="form-group">
                    <label for="confirmPassword">تأكيد كلمة المرور</label>
                    <input type="password" id="confirmPassword" name="confirmPassword" required minlength="6">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="Dashboard.closeModal()">إلغاء</button>
                    <button type="submit" class="btn btn-primary">تغيير كلمة المرور</button>
                </div>
            </form>
        `);

        this.showModal(modal);

        // Handle form submission
        document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleChangePassword();
        });
    }

    /**
     * Handle change password
     */
    async handleChangePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showToast('كلمة المرور الجديدة غير متطابقة', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showToast('يجب أن تكون كلمة المرور 6 أحرف على الأقل', 'error');
            return;
        }

        showLoading();

        try {
            await AuthAPI.changePassword({ currentPassword, newPassword });
            this.closeModal();
            showToast('تم تغيير كلمة المرور بنجاح', 'success');
        } catch (error) {
            showToast(error.message || 'فشل تغيير كلمة المرور', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * Create modal HTML
     */
    createModal(title, content) {
        const modalId = 'modal_' + Date.now();
        return `
            <div id="${modalId}" class="modal-overlay">
                <div class="modal">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="btn btn-icon" onclick="Dashboard.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show modal
     */
    showModal(modalHTML) {
        const container = document.getElementById('modalsContainer');
        container.innerHTML = modalHTML;
        
        // Add click outside to close
        const overlay = container.querySelector('.modal-overlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeModal();
            }
        });
    }

    /**
     * Close modal
     */
    closeModal() {
        document.getElementById('modalsContainer').innerHTML = '';
    }

    /**
     * Start real-time updates
     */
    startRealTimeUpdates() {
        // Update notifications every 30 seconds
        setInterval(() => {
            this.updateNotificationBadge();
        }, 30000);

        // Update dashboard stats every 5 minutes
        setInterval(() => {
            if (this.currentView === 'dashboard') {
                this.loadDashboardStats();
            }
        }, 300000);
    }

    /**
     * Update notification badge
     */
    async updateNotificationBadge() {
        try {
            const response = await NotificationsAPI.getUnreadCount();
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                badge.textContent = response.data?.count || 0;
                badge.style.display = response.data?.count > 0 ? 'flex' : 'none';
            }
        } catch (error) {
            console.error('Error updating notification badge:', error);
        }
    }
}

// Create global dashboard instance
const Dashboard = new DashboardManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}
