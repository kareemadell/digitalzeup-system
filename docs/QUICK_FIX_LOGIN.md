# Quick Fix for Login Issues - DigitalZeup.net

If you're having trouble logging in with the default account:
- **Email**: kareemadelxx55@gmail.com
- **Password**: Owner123!

Follow these quick steps to fix the issue.

## 🔧 Quick Solutions (Try These First)

### 1. Restart the System

```bash
# Stop and restart containers
docker-compose restart

# Wait 30 seconds for system to start
sleep 30

# Check if it's working
curl http://localhost:3000/health
```

### 2. Check System Status

```bash
# Check if all containers are running
docker-compose ps

# Check backend logs for errors
docker-compose logs backend | tail -50
```

### 3. Verify Database Connection

```bash
# Test database connection
docker-compose exec db pg_isready -U postgres

# If not ready, restart database
docker-compose restart db
```

### 4. Reset Password (If Needed)

```bash
# Reset password to default
docker-compose exec db psql -U postgres -d digitalzeup_db -c "
UPDATE users 
SET password_hash = '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj.xnJvC0W8m' 
WHERE email = 'kareemadelxx55@gmail.com';"
```

## 🐛 Common Error Messages

### "Invalid email or password"

**Solution:**
```bash
# Check if user exists
docker-compose exec db psql -U postgres -d digitalzeup_db -c "
SELECT email, is_active FROM users WHERE email = 'kareemadelxx55@gmail.com';"

# If not found, create user
# (See detailed guide for full SQL commands)
```

### "Account is deactivated"

**Solution:**
```bash
# Activate account
docker-compose exec db psql -U postgres -d digitalzeup_db -c "
UPDATE users SET is_active = true WHERE email = 'kareemadelxx55@gmail.com';"
```

### "Cannot connect to server"

**Solution:**
```bash
# Check if containers are running
docker-compose ps

# If not, start them
docker-compose up -d

# Check logs
docker-compose logs
```

### "Database connection failed"

**Solution:**
```bash
# Restart database
docker-compose restart db

# Wait for database to start
sleep 20

# Check database logs
docker-compose logs db
```

## 🔍 Advanced Debugging

### Check Application Logs

```bash
# View backend logs
docker-compose logs backend -f

# Search for authentication errors
docker-compose logs backend | grep -i "auth\|login\|error"
```

### Test API Directly

```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kareemadelxx55@gmail.com","password":"Owner123!"}' \
  -w "\nStatus: %{http_code}\n"
```

### Check Database Health

```bash
# Connect to database
docker-compose exec db psql -U postgres -d digitalzeup_db

-- Check user table
SELECT id, email, role_id, is_active FROM users WHERE email = 'kareemadelxx55@gmail.com';

-- Check employee table
SELECT * FROM employees WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- Exit
\q
```

## 🚨 Emergency Reset

**Warning: This will delete all data!**

```bash
# Full system reset
docker-compose down -v
sudo rm -rf postgres_data/ redis_data/
docker-compose up --build -d
```

## 📊 System Verification

After applying fixes, verify the system:

```bash
# 1. Check health endpoint
curl http://localhost:3000/health

# 2. Check login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kareemadelxx55@gmail.com","password":"Owner123!"}'

# 3. Check frontend
curl http://localhost:3001

# 4. Check database
docker-compose exec db pg_isready -U postgres
```

## 📞 Still Need Help?

If the issue persists, please provide:

1. **System Status:**
   ```bash
   docker-compose ps > status.txt
   ```

2. **Logs:**
   ```bash
   docker-compose logs backend > backend_logs.txt
   docker-compose logs db > db_logs.txt
   ```

3. **Error Message:**
   - Screenshot of the error
   - Exact error message text
   - Browser console errors (F12)

4. **Contact:**
   - Email: support@digitalzeup.net
   - Include all diagnostic information

## ✅ Success Checklist

After fixing the issue, verify:

- [ ] Can access http://localhost:3001
- [ ] Can login with kareemadelxx55@gmail.com / Owner123!
- [ ] Dashboard loads correctly
- [ ] No errors in browser console
- [ ] All containers are running (`docker-compose ps`)

## 🔄 Prevention Tips

1. **Regular Backups:**
   ```bash
   ./backup.sh  # If backup script exists
   ```

2. **Monitor Logs:**
   ```bash
   ./monitor.sh  # If monitor script exists
   ```

3. **Keep System Updated:**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

---

**Remember**: Most login issues are solved by restarting the system and checking the database connection.

For detailed troubleshooting, see: [LOGIN_TROUBLESHOOTING_AR.md](LOGIN_TROUBLESHOOTING_AR.md)
