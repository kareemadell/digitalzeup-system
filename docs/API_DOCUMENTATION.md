# DigitalZeup.net Management System - API Documentation

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Endpoints](#endpoints)
7. [WebSocket Events](#websocket-events)

## Overview

The DigitalZeup.net Management System API is a RESTful API that provides access to all system functionalities. It uses standard HTTP methods and returns JSON responses.

### Features

- RESTful design
- JWT authentication
- Role-based access control
- Real-time updates via WebSocket
- File upload support
- Comprehensive error handling

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header for all protected endpoints.

### Getting a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

### Using the Token

```http
GET /api/users
Authorization: Bearer <your_jwt_token>
```

### Token Refresh

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<your_refresh_token>"
}
```

## Base URL

```
http://localhost:3000/api
```

## Error Handling

The API uses standard HTTP status codes and returns detailed error information in the response body.

### Error Response Format

```json
{
  "error": {
    "message": "Detailed error message",
    "code": "ERROR_CODE",
    "details": {},
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Standard endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 10 requests per minute per IP

## Endpoints

### Authentication

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "data": {
    "token": "jwt_token",
    "refreshToken": "refresh_token",
    "user": {
      "id": "uuid",
      "email": "string",
      "role": {
        "id": 1,
        "name": "Owner",
        "level": 1,
        "permissions": {}
      },
      "isOwner": true
    }
  }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "string",
  "newPassword": "string"
}
```

### Users

#### Get All Users
```http
GET /api/users?page=1&limit=10&search=john&role_id=2
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search term
- `role_id` (number): Filter by role
- `is_active` (boolean): Filter by active status

#### Get User by ID
```http
GET /api/users/:id
Authorization: Bearer <token>
```

#### Create User
```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password",
  "role_id": 2,
  "employee_data": {
    "full_name_ar": "اسم الموظف",
    "full_name_en": "Employee Name",
    "job_title": "Job Title",
    "department_id": 1,
    "specialization_id": 1
  }
}
```

#### Update User
```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newemail@example.com",
  "role_id": 3,
  "is_active": true
}
```

#### Delete User
```http
DELETE /api/users/:id?permanent=false
Authorization: Bearer <token>
```

### Employees

#### Get All Employees
```http
GET /api/employees?page=1&limit=10&department_id=1&status=active
Authorization: Bearer <token>
```

#### Get Employee by ID
```http
GET /api/employees/:id
Authorization: Bearer <token>
```

#### Create Employee
```http
POST /api/employees
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "uuid",
  "full_name_ar": "اسم الموظف",
  "full_name_en": "Employee Name",
  "job_title": "Web Developer",
  "department_id": 1,
  "specialization_id": 1,
  "hire_date": "2024-01-01",
  "contract_type": "full_time",
  "basic_salary": 5000,
  "personal_phone": "+9665xxxxxxxxx",
  "work_email": "employee@company.com"
}
```

#### Update Employee
```http
PUT /api/employees/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name_ar": "اسم جديد",
  "job_title": "Senior Developer",
  "basic_salary": 6000
}
```

### Clients

#### Get All Clients
```http
GET /api/clients?page=1&limit=10&status=active&category_id=1
Authorization: Bearer <token>
```

#### Create Client
```http
POST /api/clients
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name_ar": "اسم العميل",
  "full_name_en": "Client Name",
  "company_name": "Company Ltd.",
  "primary_phone": "+9665xxxxxxxxx",
  "primary_email": "client@company.com",
  "category_id": 1,
  "status": "active",
  "contract_value": 10000,
  "contract_currency": "SAR",
  "payment_type": "postpaid"
}
```

### Tasks

#### Get All Tasks
```http
GET /api/tasks?page=1&limit=10&status=in_progress&assigned_to=uuid
Authorization: Bearer <token>
```

#### Create Task
```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Task Title",
  "description": "Task description",
  "category_id": 1,
  "priority": "high",
  "due_date": "2024-01-15",
  "recurrence_type": "one_time",
  "client_id": "uuid",
  "assigned_to": "uuid"
}
```

#### Update Task Status
```http
PUT /api/tasks/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed"
}
```

#### Add Task Comment
```http
POST /api/tasks/:id/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "comment": "Task comment text"
}
```

#### Upload Tasks from Excel
```http
POST /api/tasks/upload-excel
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <excel_file>
```

### Financial

#### Get Payments
```http
GET /api/financial/payments?page=1&limit=10&client_id=uuid&start_date=2024-01-01
Authorization: Bearer <token>
```

#### Create Payment
```http
POST /api/financial/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "client_id": "uuid",
  "amount": 5000,
  "currency": "SAR",
  "payment_date": "2024-01-01",
  "payment_method_id": 1,
  "notes": "Payment notes"
}
```

#### Get Outstanding Payments
```http
GET /api/financial/outstanding?page=1&limit=10&status=overdue
Authorization: Bearer <token>
```

#### Get Exchange Rates
```http
GET /api/financial/exchange-rates
Authorization: Bearer <token>
```

#### Get Financial Statements

**Income Statement:**
```http
GET /api/financial/income-statement?period_type=monthly&period_start=2024-01-01&period_end=2024-01-31
Authorization: Bearer <token>
```

**Balance Sheet:**
```http
GET /api/financial/balance-sheet?period_date=2024-01-31
Authorization: Bearer <token>
```

**Cash Flow:**
```http
GET /api/financial/cash-flow?period_type=monthly&period_start=2024-01-01&period_end=2024-01-31
Authorization: Bearer <token>
```

### Reports

#### Get Dashboard Stats
```http
GET /api/reports/dashboard
Authorization: Bearer <token>
```

#### Get Employee Performance
```http
GET /api/reports/employee-performance?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

#### Export Report
```http
GET /api/reports/export/tasks?format=pdf&start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

### Notifications

#### Get Notifications
```http
GET /api/notifications?page=1&limit=10&is_read=false
Authorization: Bearer <token>
```

#### Mark as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

#### Mark All as Read
```http
PUT /api/notifications/read-all
Authorization: Bearer <token>
```

### Settings

#### Get All Settings
```http
GET /api/settings
Authorization: Bearer <token>
```

#### Update Setting
```http
PUT /api/settings/:key
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": "new_value"
}
```

## WebSocket Events

The system uses Socket.IO for real-time updates. Connect to:

```
ws://localhost:3000
```

### Authentication

Authenticate with the WebSocket server by sending the JWT token:

```javascript
socket.emit('authenticate', {
  token: 'your_jwt_token'
});
```

### Events

#### Client → Server

**Join Room:**
```javascript
socket.emit('join_room', 'user_userId');
```

**Task Update:**
```javascript
socket.emit('task_update', {
  taskId: 'uuid',
  assignedTo: 'userId',
  status: 'completed'
});
```

#### Server → Client

**Notification:**
```javascript
socket.on('notification', (data) => {
  console.log('New notification:', data);
});
```

**Task Update:**
```javascript
socket.on('task_update', (data) => {
  console.log('Task updated:', data);
});
```

**Payment Reminder:**
```javascript
socket.on('payment_reminder', (data) => {
  console.log('Payment reminder:', data);
});
```

## Pagination

List endpoints support pagination using `page` and `limit` parameters:

```http
GET /api/users?page=2&limit=20
```

**Response format:**
```json
{
  "message": "Users retrieved successfully",
  "data": [...],
  "pagination": {
    "total": 100,
    "page": 2,
    "limit": 20,
    "pages": 5
  }
}
```

## Filtering and Search

Most list endpoints support filtering and search:

```http
GET /api/clients?status=active&category_id=1&search=company
```

## File Upload

File uploads use multipart/form-data:

```http
POST /api/uploads
Content-Type: multipart/form-data

file: <file_content>
type: "profile_picture"
```

## Testing

### Using cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kareemadelxx55@gmail.com","password":"Owner123!"}'

# Get users with token
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>"
```

### Using Postman

1. Import the collection (available separately)
2. Set environment variables:
   - `baseUrl`: http://localhost:3000/api
   - `token`: Your JWT token
3. Use the pre-request script to set the Authorization header

## SDKs and Libraries

### JavaScript/Node.js

```javascript
const api = new DigitalZeupAPI({
  baseURL: 'http://localhost:3000/api',
  token: 'your_jwt_token'
});

const users = await api.users.getAll();
```

### Python

```python
import requests

headers = {
    'Authorization': 'Bearer your_jwt_token'
}

response = requests.get('http://localhost:3000/api/users', headers=headers)
users = response.json()
```

## Support

For API support and questions:
- Email: support@digitalzeup.net
- Documentation: https://digitalzeup.net/docs/api

---

**End of API Documentation**

For the latest updates, follow our documentation at https://digitalzeup.net/docs
