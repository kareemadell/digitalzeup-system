/**
 * DigitalZeup.net Management System - Main Application
 */

class DigitalZeupApp {
    constructor() {
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Show loading
            this.showLoading();

            // Initialize authentication
            const isAuthenticated = await Auth.init();
            
            if (isAuthenticated) {
                await this.initializeApp();
            } else {
                this.showLoginScreen();
            }

            this.setupGlobalEventListeners();
            this.isInitialized = true;

        } catch (error) {
            console.error('App initialization error:', error);
            this.showErrorMessage('فشل تحميل التطبيق');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Initialize authenticated app
     */
    async initializeApp() {
        // Hide login screen
        document.getElementById('loginScreen').classList.remove('active');
        
        // Show main screen
        document.getElementById('mainScreen').classList.add('active');
        
        // Initialize dashboard
        await Dashboard.init();
        
        // Update user interface
        this.updateUserInterface();
        
        // Initialize notifications
        this.initializeNotifications();
    }

    /**
     * Show login screen
     */
    showLoginScreen() {
        document.getElementById('loginScreen').classList.add('active');
        document.getElementById('mainScreen').classList.remove('active');
        
        // Setup login form
        this.setupLoginForm();
    }

    /**
     * Setup login form
     */
    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Handle Enter key in password field
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }
    }

    /**
     * Handle login
     */
    async handleLogin() {
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validate inputs
        if (!email || !password) {
            this.showToast('الرجاء إدخال البريد الإلكتروني وكلمة المرور', 'warning');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showToast('الرجاء إدخال بريد إلكتروني صحيح', 'warning');
            return;
        }

        // Show loading
        this.showLoading();

        try {
            const result = await Auth.login(email, password);
            
            if (result.success) {
                this.showToast('تم تسجيل الدخول بنجاح', 'success');
                await this.initializeApp();
            } else {
                this.showToast(result.error || 'فشل تسجيل الدخول', 'error');
                
                // Clear password field
                document.getElementById('password').value = '';
                document.getElementById('password').focus();
            }
            
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('حدث خطأ أثناء تسجيل الدخول', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Update user interface with current user info
     */
    updateUserInterface() {
        const user = Auth.getCurrentUser();
        if (!user) return;

        // Update user name
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = Auth.getDisplayName();
        }

        // Update user avatar
        const userAvatarElement = document.getElementById('userAvatar');
        if (userAvatarElement) {
            const avatarSrc = user.employee?.personalPhoto || 'assets/avatar.png';
            userAvatarElement.src = avatarSrc;
        }
    }

    /**
     * Initialize notifications
     */
    initializeNotifications() {
        // Load initial notification count
        this.updateNotificationCount();
        
        // Setup periodic updates
        setInterval(() => {
            this.updateNotificationCount();
        }, 30000); // Every 30 seconds
    }

    /**
     * Update notification count
     */
    async updateNotificationCount() {
        try {
            const response = await NotificationsAPI.getUnreadCount();
            const count = response.data?.count || 0;
            
            const badge = document.getElementById('notificationBadge');
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
        } catch (error) {
            console.error('Error updating notification count:', error);
        }
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Handle page visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && Auth.isAuthenticated()) {
                // Refresh data when page becomes visible
                this.refreshAppData();
            }
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            this.showToast('تم الاتصال بالإنترنت', 'success');
        });

        window.addEventListener('offline', () => {
            this.showToast('تم فقد الاتصال بالإنترنت', 'warning');
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Handle clicks outside modals and dropdowns
        document.addEventListener('click', (e) => {
            this.handleOutsideClicks(e);
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
    }

    /**
     * Refresh app data
     */
    async refreshAppData() {
        try {
            // Refresh user data
            await Auth.refreshUserData();
            
            // Update UI
            this.updateUserInterface();
            
            // Refresh current view if dashboard is active
            if (Dashboard.currentView) {
                // Re-render current view
                Dashboard.renderViewContent(Dashboard.currentView);
            }
            
        } catch (error) {
            console.error('Error refreshing app data:', error);
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + L: Focus search (if exists)
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Escape: Close modals and dropdowns
        if (e.key === 'Escape') {
            this.closeAllModals();
            this.closeAllDropdowns();
        }

        // Ctrl/Cmd + K: Quick actions (if implemented)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.showQuickActions();
        }
    }

    /**
     * Handle outside clicks
     */
    handleOutsideClicks(e) {
        // Close notifications panel when clicking outside
        const notificationsPanel = document.getElementById('notificationsPanel');
        const notificationsBtn = document.getElementById('notificationsBtn');
        
        if (notificationsPanel && !notificationsPanel.contains(e.target) && 
            notificationsBtn && !notificationsBtn.contains(e.target)) {
            notificationsPanel.classList.add('hidden');
        }
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Adjust sidebar for mobile
        const sidebar = document.querySelector('.sidebar');
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
        }
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => modal.remove());
    }

    /**
     * Close all dropdowns
     */
    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown.active');
        dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
    }

    /**
     * Show quick actions (placeholder)
     */
    showQuickActions() {
        // This could be implemented as a command palette
        console.log('Quick actions triggered');
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toastId = 'toast_' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast ${type}`;
        
        const icon = this.getToastIcon(type);
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, duration);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);
    }

    /**
     * Get toast icon based on type
     */
    getToastIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * Show error message
     */
    showErrorMessage(message) {
        const content = document.getElementById('dashboardContent');
        if (content) {
            content.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>حدث خطأ</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">
                        إعادة تحميل الصفحة
                    </button>
                </div>
            `;
        }
    }

    /**
     * Get app info
     */
    getAppInfo() {
        return {
            name: CONFIG.APP_NAME,
            version: CONFIG.APP_VERSION,
            isAuthenticated: Auth.isAuthenticated(),
            currentUser: Auth.getCurrentUser(),
            isInitialized: this.isInitialized
        };
    }
}

// Global utility functions
function showLoading() {
    App.showLoading();
}

function hideLoading() {
    App.hideLoading();
}

function showToast(message, type = 'info') {
    App.showToast(message, type);
}

// Create global app instance
const App = new DigitalZeupApp();

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    // Cleanup if needed
});

// Make App globally available
window.App = App;
window.Auth = Auth;
window.Dashboard = Dashboard;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { App, Auth, Dashboard };
}
