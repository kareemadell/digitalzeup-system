# DigitalZeup.net Management System - Entity Relationship Diagram

## Overview
This document describes the complete database schema for the DigitalZeup.net Management System.

## Core Entities

### 1. Users & Authentication
```
users (1) ----< (M) user_sessions
users (1) ----< (M) password_resets
users (M) >---- (1) roles
```

### 2. Organization Structure
```
departments (1) ----< (M) specializations
specializations (M) ----> (1) departments (nullable for HR)
```

### 3. Employees
```
employees (M) ----> (1) users
employees (M) ----> (1) specializations
employees (M) ----> (1) departments
employees (1) ----< (M) employees (self-referencing for manager)
employees (1) ----< (M) employee_history
```

### 4. Clients
```
clients (M) ----> (1) client_categories
clients (M) ----> (1) employees (assigned_employee)
clients (M) ----> (1) users (created_by)
clients (1) ----< (M) client_history
```

### 5. Tasks
```
tasks (M) ----> (1) task_categories
tasks (M) ----> (1) clients
tasks (M) ----> (1) employees (assigned_to)
tasks (M) ----> (1) users (created_by)
tasks (1) ----< (M) task_comments
tasks (1) ----< (M) task_history
```

### 6. Financial
```
currencies (1) ----< (M) exchange_rates
payments (M) ----> (1) clients
payments (M) ----> (1) currencies
payments (M) ----> (1) payment_methods
payments (M) ----> (1) banks (nullable)
payments (M) ----> (1) exchange_rates (nullable)
payments (M) ----> (1) users (recorded_by)

outstanding_payments (M) ----> (1) clients
outstanding_payments (1) ----< (M) collection_history
```

### 7. Financial Statements
```
income_statement (period_type, period_start, period_end)
balance_sheet (period_date)
cash_flow_statement (period_type, period_start, period_end)
```

### 8. Notifications & Logs
```
notifications (M) ----> (1) users
system_logs (M) ----> (1) users (nullable for system actions)
```

## Key Relationships

### One-to-Many Relationships:
- One role has many users
- One department has many specializations
- One specialization has many employees
- One employee (manager) has many subordinates
- One client category has many clients
- One employee has many assigned clients
- One client has many tasks
- One employee has many assigned tasks
- One currency has many exchange rates
- One client has many payments
- One user has many notifications

### Many-to-One Relationships:
- Many employees belong to one department
- Many tasks assigned to one employee
- Many payments from one client
- Many notifications for one user

### Self-Referencing:
- employees.direct_manager_id → employees.id

### Nullable Foreign Keys:
- employees.specialization_id (can be null for HR)
- employees.department_id (can be null for HR)
- payments.bank_id (for non-bank payments)
- payments.exchange_rate_id (for SAR payments)
- system_logs.user_id (for system actions)

## Indexes

### Primary Indexes:
- All UUID columns have primary key indexes
- All foreign key columns have indexes

### Performance Indexes:
- users.email (unique)
- users.role_id
- employees.employee_number (unique)
- employees.department_id
- employees.specialization_id
- employees.employment_status
- clients.status
- clients.category_id
- clients.assigned_employee_id
- tasks.status
- tasks.assigned_to
- tasks.client_id
- payments.client_id
- payments.payment_date
- notifications.user_id, notifications.is_read

## Data Types

### UUIDs:
- All primary keys are UUID v4 for better scalability

### JSONB Fields:
- users.permissions (role permissions)
- employees.languages (employee languages)
- clients.social_media (social media accounts)
- clients.services (contract services)
- tasks.attachments (file attachments)
- task_comments.attachments (comment attachments)
- payments.attachments (payment receipts)
- outstanding_payments.payment_plan (debt payment plans)
- notifications.related_id (polymorphic relation)

### Monetary Values:
- All monetary values use DECIMAL(12,2) for precision
- Exchange rates use DECIMAL(15,6) for accuracy

### Dates:
- All timestamps use TIMESTAMP with timezone
- Date-only fields use DATE type

## Constraints

### Check Constraints:
- roles.level: 1-5 only
- employees.contract_type: specific values
- employees.employment_status: specific values
- clients.status: specific values
- tasks.priority: specific values
- tasks.status: specific values
- tasks.progress_percentage: 0-100 only

### Unique Constraints:
- users.email
- roles.name, roles.level
- employees.employee_number
- currencies.code
- system_settings.setting_key

## Security Considerations

1. **Password Hashing**: passwords stored as bcrypt hashes
2. **Session Management**: JWT tokens with expiration
3. **Audit Trail**: All changes logged in history tables
4. **Soft Deletes**: deleted_at timestamp for most tables
5. **Access Control**: Visibility scopes for clients and tasks

## Backup Strategy

1. **Daily Backups**: Automated daily database dumps
2. **Point-in-time Recovery**: WAL archiving enabled
3. **Replication**: Master-slave replication for high availability

## Performance Optimization

1. **Partitioning**: Large tables (payments, tasks) partitioned by date
2. **Archiving**: Old records archived to separate tables
3. **Caching**: Redis caching for frequently accessed data
4. **Connection Pooling**: PgBouncer for connection management
