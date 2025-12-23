# Diagnostic Checklist - DigitalZeup.net System

Use this checklist to systematically diagnose and fix login issues.

## ✅ Step 1: System Status Check

### Check Docker Status
```bash
# Run this command
docker-compose ps

# Expected output:
# Name                    Command               State           Ports
# ----------------------------------------------------------------------------
# digitalzeup-backend     npm start              Up      0.0.0.0:3000->3000/tcp
# digitalzeup-db          docker-entrypoint.sh   Up      0.0.0.0:5432->5432/tcp
# digitalzeup-frontend    nginx -g daemon off;   Up      0.0.0.0:3001->80/tcp
# digitalzeup-redis       docker-entrypoint.sh   Up      0.0.0.0:6379->6379/tcp
```

- [ ] All containers are "Up"
- [ ] All ports are mapped correctly
- [ ] No containers are "Exit" or "Restarting"

### If containers are not running:
```bash
# Start containers
docker-compose up -d

# Wait 30 seconds
sleep 30

# Check again
docker-compose ps
```

## ✅ Step 2: Network Connectivity Check

### Test Localhost Access
```bash
# Test backend health endpoint
curl http://localhost:3000/health

# Expected output:
# {"status":"OK","timestamp":"...","uptime":...}
```

- [ ] Backend responds with HTTP 200
- [ ] Response contains "status":"OK"

### Test Frontend Access
```bash
# Test frontend
curl -I http://localhost:3001

# Expected output:
# HTTP/1.1 200 OK
```

- [ ] Frontend responds with HTTP 200

### If not accessible:
```bash
# Check what's using the ports
sudo netstat -tulpn | grep -E ':(3000|3001|5432|6379|8080)'

# If ports are blocked, change them in docker-compose.yml
```

## ✅ Step 3: Database Connection Check

### Test Database Connectivity
```bash
# Test PostgreSQL
docker-compose exec db pg_isready -U postgres

# Expected output:
# localhost:5432 - accepting connections
```

- [ ] Database is accepting connections

### If not:
```bash
# Restart database
docker-compose restart db

# Wait for startup
sleep 20

# Test again
docker-compose exec db pg_isready -U postgres
```

### Check Database Logs
```bash
# View database logs
docker-compose logs db | tail -20

# Look for errors like:
# - "database system is ready"
# - "listening on IPv4 address"
# - No "FATAL" or "ERROR" messages
```

- [ ] Database logs show successful startup
- [ ] No fatal errors in logs

## ✅ Step 4: User Account Check

### Connect to Database
```bash
# Connect to PostgreSQL
docker-compose exec db psql -U postgres -d digitalzeup_db
```

### Check User Account
```sql
-- Check if user exists
SELECT id, email, role_id, is_active, is_owner, created_at 
FROM users 
WHERE email = 'kareemadelxx55@gmail.com';

-- Expected output:
--                  id                  |       email        | role_id | is_active | is_owner |         created_at
-- -------------------------------------+--------------------+---------+-----------+----------+-----------------------------
--  11111111-1111-1111-1111-111111111111 | kareemadelxx55@gmail.com |       1 | t         | t        | 2024-01-01 00:00:00
```

- [ ] User exists with ID: 11111111-1111-1111-1111-111111111111
- [ ] is_active = true (t)
- [ ] is_owner = true (t)
- [ ] role_id = 1

### If user doesn't exist:
```sql
-- Create user account
INSERT INTO users (id, email, password_hash, role_id, is_active, is_owner, created_at) 
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'kareemadelxx55@gmail.com', 
    '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj.xnJvC0W8m', 
    1, 
    true, 
    true, 
    CURRENT_TIMESTAMP
);

-- Create employee record
INSERT INTO employees (
    id, user_id, employee_number, full_name_ar, full_name_en, 
    job_title, hire_date, contract_type, employment_status, basic_salary, created_at
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

-- Exit database
\q
```

### Check Role Permissions
```bash
# Check role permissions
docker-compose exec db psql -U postgres -d digitalzeup_db -c "
SELECT name, level, permissions 
FROM roles 
WHERE id = 1;"
```

- [ ] Role exists with ID 1
- [ ] Level is 1 (Owner)
- [ ] Permissions include full access

## ✅ Step 5: Authentication Test

### Test Login Endpoint
```bash
# Test authentication endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kareemadelxx55@gmail.com","password":"Owner123!"}' \
  -w "\nStatus: %{http_code}\n"

# Expected output:
# {
#   "message": "Login successful",
#   "data": {
#     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "refreshToken": "...",
#     "user": {...}
#   }
# }
# Status: 200
```

- [ ] HTTP Status is 200
- [ ] Response contains "Login successful"
- [ ] Response includes token and refreshToken

### If login fails with 401:
```bash
# Check for specific error message
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kareemadelxx55@gmail.com","password":"Owner123!"}' \
  | jq -r '.error.message' 2>/dev/null || echo "Parse error"
```

### Common Errors and Fixes:

**"Invalid email or password"**
- Password hash is incorrect
- User doesn't exist
- **Fix**: Reset password (see below)

**"Account is deactivated"**
- is_active = false
- **Fix**: `UPDATE users SET is_active = true WHERE email = 'kareemadelxx55@gmail.com';`

**"User not found"**
- User doesn't exist in database
- **Fix**: Create user (see Step 4)

## ✅ Step 6: Password Reset (If Needed)

### Reset to Default Password
```bash
# Reset password to "Owner123!"
docker-compose exec db psql -U postgres -d digitalzeup_db -c "
UPDATE users 
SET password_hash = '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj.xnJvC0W8m' 
WHERE email = 'kareemadelxx55@gmail.com';"
```

### Verify Password Hash
```bash
# Check current password hash
docker-compose exec db psql -U postgres -d digitalzeup_db -c "
SELECT password_hash FROM users WHERE email = 'kareemadelxx55@gmail.com';"

# Should show:
# $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj.xnJvC0W8m
```

- [ ] Password hash matches expected value

## ✅ Step 7: Environment Variables Check

### Check .env File
```bash
# Check if .env file exists
ls -la backend/.env

# Check JWT secret
grep "JWT_SECRET" backend/.env

# Check database configuration
grep "DB_" backend/.env
```

- [ ] backend/.env file exists
- [ ] JWT_SECRET is set and not empty
- [ ] Database configuration is correct

### If .env is missing:
```bash
# Copy example file
cp backend/.env.example backend/.env

# Generate new secrets
openssl rand -base64 32 > temp_secret
JWT_SECRET=$(cat temp_secret)
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" backend/.env
rm temp_secret

# Restart to apply changes
docker-compose restart
```

## ✅ Step 8: Frontend Check

### Test Frontend Access
```bash
# Test frontend
curl -I http://localhost:3001

# Expected:
# HTTP/1.1 200 OK
```

### Check Browser Console
1. Open browser
2. Go to http://localhost:3001
3. Press F12 (Developer Tools)
4. Check Console tab for errors

- [ ] No errors in browser console
- [ ] All resources load correctly (200 status)

### Common Frontend Issues:

**CORS Errors**
- Backend not running
- Wrong CORS configuration
- **Fix**: Ensure backend is running and CORS is configured

**404 Errors for Resources**
- Missing files
- Wrong paths
- **Fix**: Check that all files are present

## ✅ Step 9: System Logs Analysis

### Check Backend Logs
```bash
# View recent backend logs
docker-compose logs --tail=50 backend

# Search for authentication errors
docker-compose logs backend | grep -i "auth\|login\|error\|failed"

# Follow logs in real-time
docker-compose logs -f backend
```

### Look for these patterns:

**Good signs:**
- "Server running on port 3000"
- "Database connected successfully"
- "Redis connected successfully"

**Bad signs:**
- "Database connection failed"
- "JWT_SECRET not found"
- "User not found"
- "Invalid token"

### Check Database Logs
```bash
# View database logs
docker-compose logs db | tail -20

# Search for errors
docker-compose logs db | grep -i "error\|fatal\|connection"
```

### Check Redis Logs (if using)
```bash
# View Redis logs
docker-compose logs redis | tail -10
```

## ✅ Step 10: Complete Reset (Last Resort)

**Warning: This will delete all data!**

```bash
# Stop and remove containers
docker-compose down -v

# Remove data volumes
sudo rm -rf postgres_data/ redis_data/ backend/uploads/*

# Rebuild and start
docker-compose up --build -d

# Wait for startup
sleep 60

# Check status
docker-compose ps
```

## 🎯 Success Criteria

After completing all steps, you should be able to:

- [ ] Access http://localhost:3001
- [ ] Login with kareemadelxx55@gmail.com / Owner123!
- [ ] See the dashboard
- [ ] No errors in browser console
- [ ] All containers running normally

## 📊 Diagnostic Summary

Create a summary file with:

```bash
# Create diagnostic report
cat > diagnostic_report.txt << EOF
System Diagnostic Report
Generated: $(date)

1. Container Status:
$(docker-compose ps)

2. Health Check:
$(curl -s http://localhost:3000/health 2>/dev/null || echo "FAILED")

3. Database Status:
$(docker-compose exec db pg_isready -U postgres 2>/dev/null || echo "FAILED")

4. User Account:
$(docker-compose exec db psql -U postgres -d digitalzeup_db -c "SELECT email, is_active FROM users WHERE email='kareemadelxx55@gmail.com';" 2>/dev/null || echo "FAILED")

5. Recent Errors:
$(docker-compose logs --tail=20 backend 2>&1 | grep -i error | tail -5)
EOF
```

## 🆘 When to Contact Support

Contact support if:
- All steps above have been tried
- System still doesn't work
- You see persistent database errors
- Containers won't start

**Required Information for Support:**
1. diagnostic_report.txt
2. docker-compose logs backend > backend_logs.txt
3. docker-compose logs db > db_logs.txt
4. Screenshot of browser console errors
5. Description of steps already tried

---

**End of Diagnostic Checklist**

Use this checklist systematically. Most issues are resolved in Steps 1-4.
