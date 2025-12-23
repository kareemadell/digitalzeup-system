-- ==========================================
-- DigitalZeup.net Management System
-- Seed Data - Default Values
-- ==========================================

-- Connect to database
\c digitalzeup_db;

-- ==========================================
-- 1. INSERT ROLES
-- ==========================================

INSERT INTO roles (name, level, description, permissions) VALUES 
(
    'Owner', 
    1, 
    'Full system access - System Owner',
    '{
        "users": {"create": true, "read": true, "update": true, "delete": true},
        "employees": {"create": true, "read": true, "update": true, "delete": true},
        "clients": {"create": true, "read": true, "update": true, "delete": true},
        "tasks": {"create": true, "read": true, "update": true, "delete": true},
        "financial": {"create": true, "read": true, "update": true, "delete": true},
        "settings": {"create": true, "read": true, "update": true, "delete": true},
        "reports": {"create": true, "read": true, "update": true, "delete": true}
    }'::jsonb
),
(
    'Direct Manager', 
    2, 
    'Direct Manager - Wide operational access',
    '{
        "users": {"create": true, "read": true, "update": true, "delete": false},
        "employees": {"create": true, "read": true, "update": true, "delete": false},
        "clients": {"create": true, "read": true, "update": true, "delete": false},
        "tasks": {"create": true, "read": true, "update": true, "delete": true},
        "financial": {"create": true, "read": true, "update": false, "delete": false},
        "settings": {"create": false, "read": true, "update": false, "delete": false},
        "reports": {"create": true, "read": true, "update": true, "delete": false}
    }'::jsonb
),
(
    'Team Leader', 
    3, 
    'Team Leader - Department focused access',
    '{
        "users": {"create": false, "read": true, "update": false, "delete": false},
        "employees": {"create": false, "read": true, "update": true, "delete": false},
        "clients": {"create": true, "read": true, "update": true, "delete": false},
        "tasks": {"create": true, "read": true, "update": true, "delete": false},
        "financial": {"create": false, "read": false, "update": false, "delete": false},
        "settings": {"create": false, "read": false, "update": false, "delete": false},
        "reports": {"create": false, "read": true, "update": false, "delete": false}
    }'::jsonb
),
(
    'Employee', 
    4, 
    'Regular Employee - Limited access',
    '{
        "users": {"create": false, "read": false, "update": false, "delete": false},
        "employees": {"create": false, "read": true, "update": false, "delete": false},
        "clients": {"create": false, "read": true, "update": false, "delete": false},
        "tasks": {"create": true, "read": true, "update": true, "delete": false},
        "financial": {"create": false, "read": false, "update": false, "delete": false},
        "settings": {"create": false, "read": false, "update": false, "delete": false},
        "reports": {"create": false, "read": false, "update": false, "delete": false}
    }'::jsonb
),
(
    'Accountant', 
    5, 
    'Accountant - Financial focused access',
    '{
        "users": {"create": false, "read": false, "update": false, "delete": false},
        "employees": {"create": false, "read": false, "update": false, "delete": false},
        "clients": {"create": false, "read": true, "update": false, "delete": false},
        "tasks": {"create": false, "read": false, "update": false, "delete": false},
        "financial": {"create": true, "read": true, "update": true, "delete": false},
        "settings": {"create": false, "read": false, "update": false, "delete": false},
        "reports": {"create": true, "read": true, "update": true, "delete": false}
    }'::jsonb
);

-- ==========================================
-- 2. INSERT DEPARTMENTS
-- ==========================================

INSERT INTO departments (name_ar, name_en, description, color) VALUES
('قسم SEO', 'SEO Department', 'Search Engine Optimization services', '#28a745'),
('قسم السوشيال ميديا', 'Social Media Department', 'Social media management and marketing', '#17a2b8'),
('قسم التصميم', 'Design Department', 'Graphic design and creative services', '#6f42c1'),
('قسم المحتوى', 'Content Department', 'Content creation and copywriting', '#fd7e14'),
('قسم الإعلانات المدفوعة', 'Paid Ads Department', 'Google Ads and paid advertising campaigns', '#dc3545'),
('قسم تطوير المواقع', 'Web Development Department', 'Website development and maintenance', '#6610f2'),
('قسم خدمة العملاء', 'Customer Service Department', 'Client support and relationship management', '#20c997'),
('قسم المبيعات', 'Sales Department', 'Sales and business development', '#e83e8c'),
('القسم المالي', 'Finance Department', 'Financial management and accounting', '#ffc107');

-- ==========================================
-- 3. INSERT SPECIALIZATIONS
-- ==========================================

-- SEO Department (deals_with_clients = true)
INSERT INTO specializations (department_id, name_ar, name_en, deals_with_clients, description) 
SELECT id, 'متخصص SEO', 'SEO Specialist', true, 'SEO optimization specialist' 
FROM departments WHERE name_en = 'SEO Department';

-- Social Media Department
INSERT INTO specializations (department_id, name_ar, name_en, deals_with_clients, description) 
SELECT id, 'مدير سوشيال ميديا', 'Social Media Manager', true, 'Social media account management' 
FROM departments WHERE name_en = 'Social Media Department';

-- Design Department
INSERT INTO specializations (department_id, name_ar, name_en, deals_with_clients, description) 
SELECT id, 'مصمم جرافيك', 'Graphic Designer', true, 'Graphic design and branding' 
FROM departments WHERE name_en = 'Design Department';

-- Content Department
INSERT INTO specializations (department_id, name_ar, name_en, deals_with_clients, description) 
SELECT id, 'كاتب محتوى', 'Content Writer', true, 'Content creation and copywriting' 
FROM departments WHERE name_en = 'Content Department';

-- Paid Ads Department
INSERT INTO specializations (department_id, name_ar, name_en, deals_with_clients, description) 
SELECT id, 'متخصص إعلانات Google Ads', 'Google Ads Specialist', true, 'Paid advertising campaigns' 
FROM departments WHERE name_en = 'Paid Ads Department';

-- Web Development Department (deals_with_clients = false)
INSERT INTO specializations (department_id, name_ar, name_en, deals_with_clients, description) 
SELECT id, 'مطور ويب داخلي', 'Internal Web Developer', false, 'Internal web development' 
FROM departments WHERE name_en = 'Web Development Department';

-- Customer Service Department
INSERT INTO specializations (department_id, name_ar, name_en, deals_with_clients, description) 
SELECT id, 'ممثل خدمة العملاء', 'Customer Service Representative', true, 'Client support and communication' 
FROM departments WHERE name_en = 'Customer Service Department';

-- Sales Department
INSERT INTO specializations (department_id, name_ar, name_en, deals_with_clients, description) 
SELECT id, 'ممثل مبيعات', 'Sales Representative', true, 'Sales and client acquisition' 
FROM departments WHERE name_en = 'Sales Department';

-- Finance Department (deals_with_clients = false)
INSERT INTO specializations (department_id, name_ar, name_en, deals_with_clients, description) 
SELECT id, 'محاسب داخلي', 'Internal Accountant', false, 'Internal financial management' 
FROM departments WHERE name_en = 'Finance Department';

-- HR Specialization (no department - internal)
INSERT INTO specializations (department_id, name_ar, name_en, deals_with_clients, description) 
VALUES (null, 'موظف موارد بشرية', 'HR Employee', false, 'Human resources management');

-- ==========================================
-- 4. INSERT CURRENCIES
-- ==========================================

INSERT INTO currencies (code, name_ar, name_en, symbol) VALUES
('SAR', 'ريال سعودي', 'Saudi Riyal', 'ر.س'),
('USD', 'دولار أمريكي', 'US Dollar', '$'),
('EUR', 'يورو', 'Euro', '€'),
('GBP', 'جنيه إسترليني', 'British Pound', '£'),
('AED', 'درهم إماراتي', 'UAE Dirham', 'د.إ'),
('KWD', 'دينار كويتي', 'Kuwaiti Dinar', 'د.ك'),
('EGP', 'جنيه مصري', 'Egyptian Pound', 'ج.م'),
('JOD', 'دينار أردني', 'Jordanian Dinar', 'د.أ'),
('QAR', 'ريال قطري', 'Qatari Rial', 'ر.ق'),
('BHD', 'دينار بحريني', 'Bahraini Dinar', 'د.ب'),
('OMR', 'ريال عماني', 'Omani Rial', 'ر.ع');

-- ==========================================
-- 5. INSERT PAYMENT METHODS
-- ==========================================

INSERT INTO payment_methods (name_ar, name_en) VALUES
('نقدي', 'Cash'),
('تحويل بنكي', 'Bank Transfer'),
('بطاقة ائتمان', 'Credit Card'),
('شيك', 'Check'),
('مدى', 'Mada'),
('آبل باي', 'Apple Pay'),
('STC Pay', 'STC Pay');

-- ==========================================
-- 6. INSERT BANKS
-- ==========================================

INSERT INTO banks (name_ar, name_en) VALUES
('البنك الأهلي السعودي', 'National Commercial Bank'),
('بنك الراجحي', 'Al Rajhi Bank'),
('بنك ساب', 'SAB Bank'),
('البنك السعودي البريطاني', 'Saudi British Bank'),
('البنك السعودي الفرنسي', 'Banque Saudi Fransi'),
('بنك الإنماء', 'Bank Al Inma'),
('بنك الرياض', 'Riyad Bank'),
('البنك العربي الوطني', 'Arab National Bank');

-- ==========================================
-- 7. INSERT SYSTEM SETTINGS
-- ==========================================

INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('working_hours_start', '09:00', 'time', 'Working hours start time'),
('working_hours_end', '18:00', 'time', 'Working hours end time'),
('working_days', '["sunday", "monday", "tuesday", "wednesday", "thursday"]', 'json', 'Working days of the week'),
('subscription_alert_days', '7', 'integer', 'Days before subscription expiry to send alert'),
('payment_delay_grace_days', '3', 'integer', 'Grace days before marking payment as delayed'),
('base_currency', 'SAR', 'string', 'Base currency for financial operations'),
('exchange_rate_update_interval', '6', 'integer', 'Exchange rate update interval in hours'),
('company_name', 'DigitalZeup.net', 'string', 'Company name'),
('company_email', 'info@digitalzeup.net', 'string', 'Company email'),
('company_phone', '+966XXXXXXXXX', 'string', 'Company phone'),
('company_address', 'Saudi Arabia', 'string', 'Company address'),
('logo_path', '/assets/logo.png', 'string', 'Company logo path'),
('session_timeout', '60', 'integer', 'Session timeout in minutes'),
('max_login_attempts', '5', 'integer', 'Maximum failed login attempts'),
('password_min_length', '8', 'integer', 'Minimum password length'),
('notification_email_enabled', 'true', 'boolean', 'Enable email notifications'),
('notification_sms_enabled', 'false', 'boolean', 'Enable SMS notifications'),
('notification_whatsapp_enabled', 'false', 'boolean', 'Enable WhatsApp notifications'),
('auto_task_assignment', 'true', 'boolean', 'Enable automatic task assignment'),
('task_delay_notifications', 'true', 'boolean', 'Enable task delay notifications');

-- ==========================================
-- 8. INSERT DEFAULT EXCHANGE RATES (SAR = 1)
-- ==========================================

INSERT INTO exchange_rates (from_currency, to_currency, rate, source) VALUES
('SAR', 'SAR', 1.000000, 'system'),
('USD', 'SAR', 3.750000, 'manual'),
('EUR', 'SAR', 4.100000, 'manual'),
('GBP', 'SAR', 4.800000, 'manual'),
('AED', 'SAR', 1.020000, 'manual'),
('KWD', 'SAR', 12.300000, 'manual'),
('EGP', 'SAR', 0.120000, 'manual'),
('JOD', 'SAR', 5.300000, 'manual'),
('QAR', 'SAR', 1.030000, 'manual'),
('BHD', 'SAR', 9.950000, 'manual'),
('OMR', 'SAR', 9.750000, 'manual');

-- ==========================================
-- 9. INSERT OWNER USER
-- ==========================================

-- First create the user (password will be hashed in backend)
INSERT INTO users (id, email, password_hash, role_id, is_active, is_owner, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'kareemadelxx55@gmail.com', '$2b$10$HASHED_PASSWORD_WILL_BE_SET_IN_BACKEND', 1, true, true, CURRENT_TIMESTAMP);

-- Then create the employee record
INSERT INTO employees (
    id, user_id, employee_number, full_name_ar, full_name_en, 
    job_title, hire_date, contract_type, employment_status, basic_salary,
    created_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'EMP001',
    'كريم عادل',
    'Kareem Adel',
    'المالك والمدير التنفيذي',
    '2020-01-01',
    'full_time',
    'active',
    0.00,
    CURRENT_TIMESTAMP
);

-- ==========================================
-- 10. INSERT CLIENT CATEGORIES
-- ==========================================

INSERT INTO client_categories (name_ar, name_en, description, color) VALUES
('عملاء SEO', 'SEO Clients', 'Clients using SEO services', '#28a745'),
('عملاء السوشيال ميديا', 'Social Media Clients', 'Clients using social media management', '#17a2b8'),
('عملاء الإعلانات', 'Advertising Clients', 'Clients using paid advertising services', '#dc3545'),
('عملاء التصميم', 'Design Clients', 'Clients using design services', '#6f42c1'),
('عملاء تطوير المواقع', 'Web Development Clients', 'Clients using web development services', '#6610f2'),
('عملاء المحتوى', 'Content Clients', 'Clients using content creation services', '#fd7e14');

-- ==========================================
-- 11. INSERT TASK CATEGORIES
-- ==========================================

INSERT INTO task_categories (name_ar, name_en, color) VALUES
('تحسين محركات البحث', 'SEO Optimization', '#28a745'),
('إدارة سوشيال ميديا', 'Social Media Management', '#17a2b8'),
('تصميم جرافيك', 'Graphic Design', '#6f42c1'),
('كتابة محتوى', 'Content Writing', '#fd7e14'),
('حملات إعلانية', 'Advertising Campaigns', '#dc3545'),
('تطوير مواقع', 'Web Development', '#6610f2'),
('خدمة عملاء', 'Customer Service', '#20c997'),
('مبيعات', 'Sales', '#e83e8c'),
('محاسبة', 'Accounting', '#ffc107'),
('إدارة', 'Management', '#6c757d');

-- ==========================================
-- FINISHED
-- ==========================================
