/**
 * DigitalZeup.net Management System - Configuration
 */

const CONFIG = {
    // API Configuration
    API_BASE_URL: 'http://localhost:3000/api',
    
    // Application Settings
    APP_NAME: 'DigitalZeup.net',
    APP_VERSION: '1.0.0',
    
    // Date/Time Settings
    DATE_FORMAT: 'YYYY-MM-DD',
    TIME_FORMAT: 'HH:mm',
    DATETIME_FORMAT: 'YYYY-MM-DD HH:mm',
    
    // Pagination
    DEFAULT_PAGE_SIZE: 10,
    
    // File Upload
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    
    // Colors for charts and UI
    COLORS: {
        primary: '#2563eb',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        secondary: '#64748b'
    },
    
    // Role Levels
    ROLES: {
        1: { name: 'المالك', nameEn: 'Owner', level: 1, color: '#dc2626' },
        2: { name: 'المدير المباشر', nameEn: 'Direct Manager', level: 2, color: '#ea580c' },
        3: { name: 'مدير القسم', nameEn: 'Team Leader', level: 3, color: '#ca8a04' },
        4: { name: 'موظف', nameEn: 'Employee', level: 4, color: '#16a34a' },
        5: { name: 'محاسب', nameEn: 'Accountant', level: 5, color: '#2563eb' }
    },
    
    // Task Priorities
    TASK_PRIORITIES: {
        urgent: { name: 'عاجل', nameEn: 'Urgent', color: '#dc2626', icon: 'fa-exclamation-circle' },
        high: { name: 'عالي', nameEn: 'High', color: '#ea580c', icon: 'fa-arrow-up' },
        medium: { name: 'متوسط', nameEn: 'Medium', color: '#ca8a04', icon: 'fa-minus' },
        low: { name: 'منخفض', nameEn: 'Low', color: '#16a34a', icon: 'fa-arrow-down' }
    },
    
    // Task Statuses
    TASK_STATUSES: {
        new: { name: 'جديدة', nameEn: 'New', color: '#6b7280', icon: 'fa-circle' },
        in_progress: { name: 'قيد التنفيذ', nameEn: 'In Progress', color: '#2563eb', icon: 'fa-spinner' },
        on_hold: { name: 'معلقة', nameEn: 'On Hold', color: '#f59e0b', icon: 'fa-pause' },
        under_review: { name: 'قيد المراجعة', nameEn: 'Under Review', color: '#8b5cf6', icon: 'fa-search' },
        completed: { name: 'مكتملة', nameEn: 'Completed', color: '#10b981', icon: 'fa-check' },
        delayed: { name: 'متأخرة', nameEn: 'Delayed', color: '#dc2626', icon: 'fa-clock' },
        cancelled: { name: 'ملغاة', nameEn: 'Cancelled', color: '#6b7280', icon: 'fa-times' }
    },
    
    // Client Statuses
    CLIENT_STATUSES: {
        active: { name: 'نشط', nameEn: 'Active', color: '#10b981', icon: 'fa-circle' },
        potential: { name: 'محتمل', nameEn: 'Potential', color: '#f59e0b', icon: 'fa-question-circle' },
        on_hold: { name: 'معلق', nameEn: 'On Hold', color: '#ea580c', icon: 'fa-pause-circle' },
        completed: { name: 'منتهي', nameEn: 'Completed', color: '#6b7280', icon: 'fa-check-circle' },
        cancelled: { name: 'ملغي', nameEn: 'Cancelled', color: '#dc2626', icon: 'fa-times-circle' },
        payment_delayed: { name: 'متأخر في الدفع', nameEn: 'Payment Delayed', color: '#dc2626', icon: 'fa-exclamation-triangle' }
    },
    
    // Employee Statuses
    EMPLOYEE_STATUSES: {
        active: { name: 'نشط', nameEn: 'Active', color: '#10b981' },
        on_leave: { name: 'في إجازة', nameEn: 'On Leave', color: '#f59e0b' },
        suspended: { name: 'معلق', nameEn: 'Suspended', color: '#ea580c' },
        resigned: { name: 'مستقيل', nameEn: 'Resigned', color: '#6b7280' },
        terminated: { name: 'منتهي الخدمة', nameEn: 'Terminated', color: '#dc2626' },
        archived: { name: 'مؤرشف', nameEn: 'Archived', color: '#6b7280' },
        deleted: { name: 'محذوف', nameEn: 'Deleted', color: '#dc2626' }
    },
    
    // Payment Methods
    PAYMENT_METHODS: {
        cash: { name: 'نقدي', nameEn: 'Cash' },
        bank_transfer: { name: 'تحويل بنكي', nameEn: 'Bank Transfer' },
        credit_card: { name: 'بطاقة ائتمان', nameEn: 'Credit Card' },
        check: { name: 'شيك', nameEn: 'Check' },
        mada: { name: 'مدى', nameEn: 'Mada' },
        apple_pay: { name: 'آبل باي', nameEn: 'Apple Pay' },
        stc_pay: { name: 'STC Pay', nameEn: 'STC Pay' }
    },
    
    // Currencies
    CURRENCIES: {
        SAR: { name: 'ريال سعودي', nameEn: 'Saudi Riyal', symbol: 'ر.س' },
        USD: { name: 'دولار أمريكي', nameEn: 'US Dollar', symbol: '$' },
        EUR: { name: 'يورو', nameEn: 'Euro', symbol: '€' },
        GBP: { name: 'جنيه إسترليني', nameEn: 'British Pound', symbol: '£' },
        AED: { name: 'درهم إماراتي', nameEn: 'UAE Dirham', symbol: 'د.إ' }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
