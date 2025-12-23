/**
 * DigitalZeup.net Management System - Authentication Manager
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.refreshToken = localStorage.getItem('refreshToken');
    }

    /**
     * Initialize authentication manager
     */
    async init() {
        if (this.token) {
            try {
                await this.validateToken();
                return true;
            } catch (error) {
                console.log('Token validation failed, trying refresh');
                return await this.tryRefreshToken();
            }
        }
        return false;
    }

    /**
     * Validate current token
     */
    async validateToken() {
        const response = await AuthAPI.me();
        this.currentUser = response.data;
        return true;
    }

    /**
     * Try to refresh token
     */
    async tryRefreshToken() {
        if (!this.refreshToken) return false;
        
        try {
            const response = await AuthAPI.refresh(this.refreshToken);
            this.setTokens(response.data.token, response.data.refreshToken);
            return true;
        } catch (error) {
            this.clearTokens();
            return false;
        }
    }

    /**
     * Login user
     */
    async login(email, password) {
        try {
            const response = await AuthAPI.login({ email, password });
            
            this.setTokens(response.data.token, response.data.refreshToken);
            this.currentUser = response.data.user;
            
            // Store user info
            localStorage.setItem('user', JSON.stringify(this.currentUser));
            
            return { success: true, user: this.currentUser };
        } catch (error) {
            return { 
                success: false, 
                error: error.message || 'فشل تسجيل الدخول' 
            };
        }
    }

    /**
     * Logout user
     */
    async logout() {
        try {
            if (this.token) {
                await AuthAPI.logout();
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearTokens();
            this.currentUser = null;
            localStorage.removeItem('user');
        }
    }

    /**
     * Set authentication tokens
     */
    setTokens(token, refreshToken) {
        this.token = token;
        this.refreshToken = refreshToken;
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        API.setToken(token);
    }

    /**
     * Clear authentication tokens
     */
    clearTokens() {
        this.token = null;
        this.refreshToken = null;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        API.clearToken();
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.token && !!this.currentUser;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        if (!this.currentUser) {
            const stored = localStorage.getItem('user');
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        }
        return this.currentUser;
    }

    /**
     * Check if user has specific role level
     */
    hasRoleLevel(level) {
        const user = this.getCurrentUser();
        return user && user.role.level <= level;
    }

    /**
     * Check if user is owner
     */
    isOwner() {
        const user = this.getCurrentUser();
        return user && user.isOwner;
    }

    /**
     * Check if user has permission
     */
    hasPermission(resource, action) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        // Owner has all permissions
        if (user.isOwner) return true;
        
        return user.role.permissions[resource] && 
               user.role.permissions[resource][action];
    }

    /**
     * Get user display name
     */
    getDisplayName() {
        const user = this.getCurrentUser();
        if (!user) return 'زائر';
        
        if (user.employee) {
            return user.employee.fullNameAr || user.employee.fullNameEn || user.email;
        }
        return user.email;
    }

    /**
     * Get user role display name
     */
    getRoleDisplayName() {
        const user = this.getCurrentUser();
        if (!user || !user.role) return '';
        
        return CONFIG.ROLES[user.role.level]?.name || user.role.name;
    }

    /**
     * Check if user can access resource
     */
    canAccess(resource, level = null) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        // Owner can access everything
        if (user.isOwner) return true;
        
        // Check role level
        if (level && user.role.level > level) {
            return false;
        }
        
        // Check specific permissions
        if (resource) {
            return this.hasPermission(resource, 'read');
        }
        
        return true;
    }

    /**
     * Get allowed menu items based on user role
     */
    getAllowedMenuItems() {
        const user = this.getCurrentUser();
        if (!user) return [];
        
        const menuItems = [
            {
                id: 'dashboard',
                title: 'لوحة التحكم',
                icon: 'fa-tachometer-alt',
                path: '/dashboard',
                roles: [1, 2, 3, 4, 5]
            },
            {
                id: 'employees',
                title: 'الموظفين',
                icon: 'fa-users',
                path: '/employees',
                roles: [1, 2, 3]
            },
            {
                id: 'clients',
                title: 'العملاء',
                icon: 'fa-handshake',
                path: '/clients',
                roles: [1, 2, 3, 4]
            },
            {
                id: 'tasks',
                title: 'المهام',
                icon: 'fa-tasks',
                path: '/tasks',
                roles: [1, 2, 3, 4]
            },
            {
                id: 'financial',
                title: 'المالية',
                icon: 'fa-money-bill-wave',
                path: '/financial',
                roles: [1, 2, 5]
            },
            {
                id: 'reports',
                title: 'التقارير',
                icon: 'fa-chart-bar',
                path: '/reports',
                roles: [1, 2, 5]
            },
            {
                id: 'settings',
                title: 'الإعدادات',
                icon: 'fa-cog',
                path: '/settings',
                roles: [1]
            }
        ];
        
        return menuItems.filter(item => 
            item.roles.includes(user.role.level)
        );
    }

    /**
     * Get user permissions summary
     */
    getPermissionsSummary() {
        const user = this.getCurrentUser();
        if (!user || !user.role) return {};
        
        return user.role.permissions;
    }

    /**
     * Refresh user data
     */
    async refreshUserData() {
        try {
            const response = await AuthAPI.me();
            this.currentUser = response.data;
            localStorage.setItem('user', JSON.stringify(this.currentUser));
            return true;
        } catch (error) {
            console.error('Failed to refresh user data:', error);
            return false;
        }
    }
}

// Create global auth manager instance
const Auth = new AuthManager();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
