-- ==========================================
-- DigitalZeup.net Management System
-- Database Schema - PostgreSQL
-- ==========================================

-- Create Database
CREATE DATABASE digitalzeup_db
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Connect to database
\c digitalzeup_db;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. USERS & AUTHENTICATION TABLES
-- ==========================================

-- Roles Table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    level INTEGER UNIQUE NOT NULL CHECK (level >= 1 AND level <= 5),
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    is_owner BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);

-- User Sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password Reset Tokens
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. ORGANIZATION STRUCTURE TABLES
-- ==========================================

-- Departments Table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#007bff',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Specializations Table
CREATE TABLE specializations (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id),
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    deals_with_clients BOOLEAN DEFAULT TRUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. EMPLOYEES TABLE
-- ==========================================

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id),
    employee_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- Personal Information
    full_name_ar VARCHAR(100) NOT NULL,
    full_name_en VARCHAR(100) NOT NULL,
    id_number VARCHAR(50),
    passport_number VARCHAR(50),
    date_of_birth DATE,
    nationality VARCHAR(50),
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    marital_status VARCHAR(20),
    personal_photo VARCHAR(500),
    
    -- Contact Information
    personal_phone VARCHAR(20),
    work_phone VARCHAR(20),
    emergency_phone VARCHAR(20),
    personal_email VARCHAR(255),
    work_email VARCHAR(255),
    address TEXT,
    
    -- Additional Information
    education_level VARCHAR(50),
    field_of_study VARCHAR(100),
    years_of_experience INTEGER DEFAULT 0,
    languages JSONB DEFAULT '[]',
    
    -- Job Information
    job_title VARCHAR(100) NOT NULL,
    specialization_id INTEGER REFERENCES specializations(id),
    department_id INTEGER REFERENCES departments(id),
    hire_date DATE NOT NULL,
    direct_manager_id UUID REFERENCES employees(id),
    contract_type VARCHAR(20) CHECK (contract_type IN ('full_time', 'part_time', 'remote', 'freelance', 'training')),
    
    -- Financial Information
    basic_salary DECIMAL(12,2) DEFAULT 0,
    housing_allowance DECIMAL(12,2) DEFAULT 0,
    transportation_allowance DECIMAL(12,2) DEFAULT 0,
    communication_allowance DECIMAL(12,2) DEFAULT 0,
    incentives DECIMAL(12,2) DEFAULT 0,
    payment_method VARCHAR(50),
    iban_number VARCHAR(50),
    
    -- Status
    employment_status VARCHAR(20) DEFAULT 'active' 
        CHECK (employment_status IN ('active', 'on_leave', 'suspended', 'resigned', 'terminated', 'archived', 'deleted')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);

-- Employee History Table
CREATE TABLE employee_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    action_type VARCHAR(50) NOT NULL,
    action_description TEXT,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. CLIENTS & CATEGORIES TABLES
-- ==========================================

-- Client Categories
CREATE TABLE client_categories (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    specialization_id INTEGER REFERENCES specializations(id),
    color VARCHAR(7) DEFAULT '#28a745',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients Table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Information
    full_name_ar VARCHAR(100) NOT NULL,
    full_name_en VARCHAR(100),
    id_number VARCHAR(50),
    commercial_registration VARCHAR(50),
    
    -- Company Information
    company_name VARCHAR(255),
    business_field VARCHAR(100),
    company_size VARCHAR(20),
    employees_count INTEGER,
    website VARCHAR(255),
    
    -- Contact Information
    primary_phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    primary_email VARCHAR(255) NOT NULL,
    secondary_email VARCHAR(255),
    address TEXT,
    country VARCHAR(50),
    geo_location POINT,
    
    -- Social Media Accounts (JSON)
    social_media JSONB DEFAULT '{}',
    
    -- Logo
    logo VARCHAR(500),
    
    -- Classification
    category_id INTEGER REFERENCES client_categories(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'potential' 
        CHECK (status IN ('active', 'potential', 'on_hold', 'completed', 'cancelled', 'payment_delayed')),
    
    -- Access Control
    assigned_employee_id UUID REFERENCES employees(id),
    visibility_scope VARCHAR(20) DEFAULT 'department',
    
    -- Contract Information
    contract_number VARCHAR(50) UNIQUE,
    contract_start_date DATE,
    contract_end_date DATE,
    contract_duration INTEGER,
    contract_type VARCHAR(20) CHECK (contract_type IN ('fixed', 'open_ended', 'trial')),
    contract_value DECIMAL(12,2),
    contract_currency VARCHAR(3) DEFAULT 'SAR',
    services JSONB DEFAULT '[]',
    contract_pdf VARCHAR(500),
    digital_signature VARCHAR(500),
    
    -- Payment Type
    payment_type VARCHAR(20) DEFAULT 'postpaid' CHECK (payment_type IN ('prepaid', 'postpaid')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    
    -- Who created this client
    created_by UUID REFERENCES users(id)
);

-- Client History Table
CREATE TABLE client_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    action_type VARCHAR(50) NOT NULL,
    action_description TEXT,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. TASKS MANAGEMENT TABLES
-- ==========================================

-- Task Categories
CREATE TABLE task_categories (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    specialization_id INTEGER REFERENCES specializations(id),
    color VARCHAR(7) DEFAULT '#007bff',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES task_categories(id),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
    expected_duration INTEGER, -- in hours
    start_date DATE,
    due_date DATE,
    
    -- Recurrence
    recurrence_type VARCHAR(20) DEFAULT 'one_time' 
        CHECK (recurrence_type IN ('one_time', 'daily', 'weekly', 'monthly', 'quarterly', 'annual')),
    recurrence_end_date DATE,
    
    -- Relations
    client_id UUID REFERENCES clients(id),
    assigned_to UUID REFERENCES employees(id),
    created_by UUID REFERENCES users(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'new' 
        CHECK (status IN ('new', 'in_progress', 'on_hold', 'under_review', 'completed', 'delayed', 'cancelled')),
    
    -- Progress
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    
    -- Attachments
    attachments JSONB DEFAULT '[]',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP DEFAULT NULL,
    
    -- Delay tracking
    is_delayed BOOLEAN DEFAULT FALSE,
    delay_reason TEXT,
    delay_notifications_sent JSONB DEFAULT '[]'
);

-- Task Comments Table
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    commented_by UUID REFERENCES users(id),
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task History Table
CREATE TABLE task_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id),
    action_type VARCHAR(50) NOT NULL,
    action_description TEXT,
    old_values JSONB,
    new_values JSONB,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. FINANCIAL TABLES
-- ==========================================

-- Currencies Table
CREATE TABLE currencies (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) UNIQUE NOT NULL,
    name_ar VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    symbol VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exchange Rates Table
CREATE TABLE exchange_rates (
    id SERIAL PRIMARY KEY,
    from_currency VARCHAR(3) REFERENCES currencies(code),
    to_currency VARCHAR(3) REFERENCES currencies(code),
    rate DECIMAL(15,6) NOT NULL,
    source VARCHAR(20) DEFAULT 'manual', -- 'api' or 'manual'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Methods Table
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Banks Table
CREATE TABLE banks (
    id SERIAL PRIMARY KEY,
    name_ar VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    contract_id VARCHAR(50),
    
    -- Amount Information
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) REFERENCES currencies(code),
    amount_in_sar DECIMAL(12,2) NOT NULL,
    exchange_rate_id INTEGER REFERENCES exchange_rates(id),
    
    -- Payment Details
    payment_date DATE NOT NULL,
    payment_method_id INTEGER REFERENCES payment_methods(id),
    bank_id INTEGER REFERENCES banks(id),
    transaction_number VARCHAR(100),
    check_number VARCHAR(50),
    
    -- Coverage Period (for prepaid)
    coverage_start_date DATE,
    coverage_end_date DATE,
    
    -- Invoice Reference (for postpaid)
    invoice_number VARCHAR(50),
    
    -- Accounting
    accounting_month DATE,
    accounting_entry_number VARCHAR(50),
    
    -- Notes
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    
    -- Who recorded
    recorded_by UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Outstanding Payments Table
CREATE TABLE outstanding_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    invoice_number VARCHAR(50),
    amount DECIMAL(12,2) NOT NULL,
    due_date DATE NOT NULL,
    days_delayed INTEGER DEFAULT 0,
    penalty DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'normal' 
        CHECK (status IN ('normal', 'warning', 'moderate', 'critical', 'danger')),
    collection_stage INTEGER DEFAULT 1,
    last_collection_action DATE,
    next_collection_action DATE,
    payment_plan JSONB DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection History Table
CREATE TABLE collection_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outstanding_payment_id UUID REFERENCES outstanding_payments(id),
    action_type VARCHAR(50) NOT NULL,
    action_date DATE NOT NULL,
    contact_method VARCHAR(20),
    contact_result VARCHAR(50),
    notes TEXT,
    follow_up_date DATE,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. FINANCIAL STATEMENTS TABLES
-- ==========================================

-- Income Statement Table
CREATE TABLE income_statement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'semi_annual', 'annual'
    
    -- Revenues
    client_revenue DECIMAL(15,2) DEFAULT 0,
    renewal_revenue DECIMAL(15,2) DEFAULT 0,
    new_client_revenue DECIMAL(15,2) DEFAULT 0,
    other_revenue DECIMAL(15,2) DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    
    -- Expenses
    salaries_benefits DECIMAL(15,2) DEFAULT 0,
    rent DECIMAL(15,2) DEFAULT 0,
    utilities DECIMAL(15,2) DEFAULT 0,
    marketing_advertising DECIMAL(15,2) DEFAULT 0,
    tools_software DECIMAL(15,2) DEFAULT 0,
    administrative DECIMAL(15,2) DEFAULT 0,
    other_expenses DECIMAL(15,2) DEFAULT 0,
    total_expenses DECIMAL(15,2) DEFAULT 0,
    
    -- Result
    net_profit_loss DECIMAL(15,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Balance Sheet Table
CREATE TABLE balance_sheet (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_date DATE NOT NULL,
    
    -- Current Assets
    cash DECIMAL(15,2) DEFAULT 0,
    accounts_receivable DECIMAL(15,2) DEFAULT 0,
    inventory DECIMAL(15,2) DEFAULT 0,
    total_current_assets DECIMAL(15,2) DEFAULT 0,
    
    -- Fixed Assets
    furniture DECIMAL(15,2) DEFAULT 0,
    equipment DECIMAL(15,2) DEFAULT 0,
    vehicles DECIMAL(15,2) DEFAULT 0,
    accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
    total_fixed_assets DECIMAL(15,2) DEFAULT 0,
    
    -- Total Assets
    total_assets DECIMAL(15,2) DEFAULT 0,
    
    -- Current Liabilities
    accounts_payable DECIMAL(15,2) DEFAULT 0,
    accrued_salaries DECIMAL(15,2) DEFAULT 0,
    short_term_loans DECIMAL(15,2) DEFAULT 0,
    total_current_liabilities DECIMAL(15,2) DEFAULT 0,
    
    -- Long Term Liabilities
    long_term_loans DECIMAL(15,2) DEFAULT 0,
    total_long_term_liabilities DECIMAL(15,2) DEFAULT 0,
    
    -- Total Liabilities
    total_liabilities DECIMAL(15,2) DEFAULT 0,
    
    -- Owner's Equity
    capital DECIMAL(15,2) DEFAULT 0,
    retained_earnings DECIMAL(15,2) DEFAULT 0,
    current_period_profit DECIMAL(15,2) DEFAULT 0,
    total_equity DECIMAL(15,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cash Flow Statement Table
CREATE TABLE cash_flow_statement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    
    -- Operating Activities
    cash_from_clients DECIMAL(15,2) DEFAULT 0,
    cash_paid_salaries DECIMAL(15,2) DEFAULT 0,
    cash_paid_expenses DECIMAL(15,2) DEFAULT 0,
    net_operating_cash_flow DECIMAL(15,2) DEFAULT 0,
    
    -- Investing Activities
    fixed_assets_purchased DECIMAL(15,2) DEFAULT 0,
    fixed_assets_sold DECIMAL(15,2) DEFAULT 0,
    net_investing_cash_flow DECIMAL(15,2) DEFAULT 0,
    
    -- Financing Activities
    loans_received DECIMAL(15,2) DEFAULT 0,
    loans_repaid DECIMAL(15,2) DEFAULT 0,
    owner_withdrawals DECIMAL(15,2) DEFAULT 0,
    net_financing_cash_flow DECIMAL(15,2) DEFAULT 0,
    
    -- Net Change
    net_change_in_cash DECIMAL(15,2) DEFAULT 0,
    cash_beginning DECIMAL(15,2) DEFAULT 0,
    cash_ending DECIMAL(15,2) DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 8. NOTIFICATIONS TABLE
-- ==========================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'info', 'warning', 'error', 'success'
    category VARCHAR(50) NOT NULL, -- 'task', 'payment', 'client', 'system'
    related_id UUID, -- Reference to related record
    related_type VARCHAR(50), -- 'task', 'client', 'payment', etc.
    is_read BOOLEAN DEFAULT FALSE,
    sent_email BOOLEAN DEFAULT FALSE,
    sent_sms BOOLEAN DEFAULT FALSE,
    sent_whatsapp BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 9. SYSTEM LOGS TABLE
-- ==========================================

CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 10. SYSTEM SETTINGS TABLE
-- ==========================================

CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    is_editable BOOLEAN DEFAULT TRUE,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
