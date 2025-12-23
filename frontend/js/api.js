/**
 * DigitalZeup.net Management System - API Client
 */

class ApiClient {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
        this.token = localStorage.getItem('token');
    }

    /**
     * Set authentication token
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    /**
     * Clear authentication token
     */
    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    /**
     * Make API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authentication token
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    /**
     * GET request
     */
    get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    /**
     * POST request
     */
    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    /**
     * Upload file
     */
    async upload(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        return this.request(endpoint, {
            method: 'POST',
            body: formData,
            headers: {} // Let browser set Content-Type
        });
    }
}

// Create global API client instance
const API = new ApiClient();

/**
 * Authentication API
 */
const AuthAPI = {
    login: (credentials) => API.post('/auth/login', credentials),
    logout: () => API.post('/auth/logout'),
    refresh: (refreshToken) => API.post('/auth/refresh', { refreshToken }),
    me: () => API.get('/auth/me'),
    changePassword: (data) => API.post('/auth/change-password', data)
};

/**
 * Users API
 */
const UsersAPI = {
    getAll: (params) => API.get('/users', params),
    getById: (id) => API.get(`/users/${id}`),
    create: (data) => API.post('/users', data),
    update: (id, data) => API.put(`/users/${id}`, data),
    delete: (id) => API.delete(`/users/${id}`)
};

/**
 * Employees API
 */
const EmployeesAPI = {
    getAll: (params) => API.get('/employees', params),
    getById: (id) => API.get(`/employees/${id}`),
    create: (data) => API.post('/employees', data),
    update: (id, data) => API.put(`/employees/${id}`, data),
    delete: (id) => API.delete(`/employees/${id}`),
    getHistory: (id) => API.get(`/employees/${id}/history`)
};

/**
 * Departments API
 */
const DepartmentsAPI = {
    getAll: () => API.get('/departments'),
    getById: (id) => API.get(`/departments/${id}`),
    create: (data) => API.post('/departments', data),
    update: (id, data) => API.put(`/departments/${id}`, data),
    delete: (id) => API.delete(`/departments/${id}`)
};

/**
 * Clients API
 */
const ClientsAPI = {
    getAll: (params) => API.get('/clients', params),
    getById: (id) => API.get(`/clients/${id}`),
    create: (data) => API.post('/clients', data),
    update: (id, data) => API.put(`/clients/${id}`, data),
    delete: (id) => API.delete(`/clients/${id}`),
    getHistory: (id) => API.get(`/clients/${id}/history`)
};

/**
 * Tasks API
 */
const TasksAPI = {
    getAll: (params) => API.get('/tasks', params),
    getById: (id) => API.get(`/tasks/${id}`),
    create: (data) => API.post('/tasks', data),
    update: (id, data) => API.put(`/tasks/${id}`, data),
    delete: (id) => API.delete(`/tasks/${id}`),
    updateStatus: (id, status) => API.put(`/tasks/${id}/status`, { status }),
    addComment: (id, comment) => API.post(`/tasks/${id}/comments`, { comment }),
    uploadFromExcel: (file) => API.upload('/tasks/upload-excel', file)
};

/**
 * Financial API
 */
const FinancialAPI = {
    // Payments
    getPayments: (params) => API.get('/financial/payments', params),
    createPayment: (data) => API.post('/financial/payments', data),
    updatePayment: (id, data) => API.put(`/financial/payments/${id}`, data),
    deletePayment: (id) => API.delete(`/financial/payments/${id}`),
    
    // Outstanding Payments
    getOutstanding: (params) => API.get('/financial/outstanding', params),
    updateOutstanding: (id, data) => API.put(`/financial/outstanding/${id}`, data),
    
    // Collection
    getCollectionHistory: (id) => API.get(`/financial/outstanding/${id}/collection-history`),
    addCollectionAction: (id, data) => API.post(`/financial/outstanding/${id}/collection`, data),
    
    // Exchange Rates
    getExchangeRates: () => API.get('/financial/exchange-rates'),
    updateExchangeRate: (data) => API.put('/financial/exchange-rates', data),
    
    // Financial Statements
    getIncomeStatement: (params) => API.get('/financial/income-statement', params),
    getBalanceSheet: (params) => API.get('/financial/balance-sheet', params),
    getCashFlow: (params) => API.get('/financial/cash-flow', params)
};

/**
 * Reports API
 */
const ReportsAPI = {
    getDashboardStats: () => API.get('/reports/dashboard'),
    getEmployeePerformance: (params) => API.get('/reports/employee-performance', params),
    getClientReport: (params) => API.get('/reports/clients', params),
    getTaskReport: (params) => API.get('/reports/tasks', params),
    getFinancialReport: (params) => API.get('/reports/financial', params),
    exportReport: (type, params) => API.get(`/reports/export/${type}`, params)
};

/**
 * Notifications API
 */
const NotificationsAPI = {
    getAll: (params) => API.get('/notifications', params),
    markAsRead: (id) => API.put(`/notifications/${id}/read`),
    markAllAsRead: () => API.put('/notifications/read-all'),
    getUnreadCount: () => API.get('/notifications/unread-count')
};

/**
 * Settings API
 */
const SettingsAPI = {
    getAll: () => API.get('/settings'),
    getByKey: (key) => API.get(`/settings/${key}`),
    update: (key, value) => API.put(`/settings/${key}`, { value }),
    updateMultiple: (data) => API.put('/settings', data)
};

/**
 * Uploads API
 */
const UploadsAPI = {
    uploadFile: (file, type) => API.upload('/uploads', file, { type }),
    deleteFile: (filename) => API.delete(`/uploads/${filename}`)
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API,
        AuthAPI,
        UsersAPI,
        EmployeesAPI,
        DepartmentsAPI,
        ClientsAPI,
        TasksAPI,
        FinancialAPI,
        ReportsAPI,
        NotificationsAPI,
        SettingsAPI,
        UploadsAPI
    };
}
