# دليل حل مشاكل تسجيل الدخول - نظام DigitalZeup.net

## 📋 فهرس المحتويات

1. [مقدمة](#مقدمة)
2. [الخطوات الأولية للتشخيص](#الخطوات-الأولية-للتشخيص)
3. [حلول المشاكل الشائعة](#حلول-المشاكل-الشائعة)
4. [التحقق من قاعدة البيانات](#التحقق-من-قاعدة-البيانات)
5. [إعادة تعيين كلمة المرور](#إعادة-تعيين-كلمة-المرور)
6. [التحقق من المتطلبات](#التحقق-من-المتطلبات)
7. [حلول متقدمة](#حلول-متقدمة)
8. [التواصل مع الدعم](#التواصل-مع-الدعم)

## مقدمة

إذا واجهت مشكلة في تسجيل الدخول باستخدام الحساب الافتراضي:
- **البريد الإلكتروني**: kareemadelxx55@gmail.com
- **كلمة المرور**: Owner123!

فهذا الدليل سيساعدك في حل المشكلة خطوة بخطوة.

## الخطوات الأولية للتشخيص

### 1. التأكد من تشغيل النظام

```bash
# التحقق من حالة الحاويات
docker-compose ps

# عرض السجلات
docker-compose logs backend
```

### 2. التحقق من اتصال قاعدة البيانات

```bash
# التحقق من PostgreSQL
docker-compose logs db

# الاتصال بقاعدة البيانات
docker-compose exec db psql -U postgres -d digitalzeup_db
```

### 3. التحقق من API

```bash
# اختبار نقطة الصحة (Health)
curl http://localhost:3000/health

# اختبار الاتصال
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kareemadelxx55@gmail.com","password":"Owner123!"}'
```

## حلول المشاكل الشائعة

### المشكلة 1: "Invalid email or password"

**الأسباب المحتملة:**
1. كلمة المرور غير صحيحة
2. الحساب غير موجود في قاعدة البيانات
3. الحساب محذوف أو معطل

**الحل:**

```bash
# الاتصال بقاعدة البيانات
docker-compose exec db psql -U postgres -d digitalzeup_db

# التحقق من وجود الحساب
SELECT id, email, is_active, is_owner FROM users WHERE email = 'kareemadelxx55@gmail.com';

# إذا لم يكن موجوداً، إضافته يدوياً
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

# إضافة سجل الموظف
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

# الخروج
\q
```

### المشكلة 2: "Account is deactivated"

**الحل:**

```bash
# الاتصال بقاعدة البيانات
docker-compose exec db psql -U postgres -d digitalzeup_db

# تفعيل الحساب
UPDATE users SET is_active = true WHERE email = 'kareemadelxx55@gmail.com';

# الخروج
\q
```

### المشكلة 3: "Token has expired" أو "Invalid token"

**الحل:**

```bash
# التحقق من JWT_SECRET في ملف .env
cat backend/.env | grep JWT_SECRET

# إذا لم يكن موجوداً، أضفه
# يجب أن يكون JWT_SECRET طويلاً وعشوائياً
```

### المشكلة 4: Database connection failed

**الحل:**

```bash
# إعادة تشغيل الحاويات
docker-compose restart

# أو إعادة البناء
docker-compose down
docker-compose up --build -d
```

## التحقق من قاعدة البيانات

### خطوات التحقق الشامل

1. **التحقق من وجود الجداول:**

```bash
docker-compose exec db psql -U postgres -d digitalzeup_db -c "\\dt"
```

2. **التحقق من بيانات المستخدم:**

```bash
docker-compose exec db psql -U postgres -d digitalzeup_db -c "
SELECT u.id, u.email, u.role_id, u.is_active, u.is_owner, r.name as role_name
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE u.email = 'kareemadelxx55@gmail.com';"
```

3. **التحقق من بيانات الموظف:**

```bash
docker-compose exec db psql -U postgres -d digitalzeup_db -c "
SELECT e.id, e.employee_number, e.full_name_ar, e.full_name_en, e.job_title, e.employment_status
FROM employees e 
JOIN users u ON e.user_id = u.id 
WHERE u.email = 'kareemadelxx55@gmail.com';"
```

4. **التحقق من الصلاحيات:**

```bash
docker-compose exec db psql -U postgres -d digitalzeup_db -c "
SELECT permissions FROM roles WHERE id = 1;"
```

## إعادة تعيين كلمة المرور

### الطريقة 1: إعادة تعيين كلمة المرور من قاعدة البيانات

```bash
# الاتصال بقاعدة البيانات
docker-compose exec db psql -U postgres -d digitalzeup_db

# تحديث كلمة المرور (Owner123!)
UPDATE users 
SET password_hash = '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj.xnJvC0W8m' 
WHERE email = 'kareemadelxx55@gmail.com';

# الخروج
\q
```

### الطريقة 2: تغيير كلمة المرور من الواجهة

إذا استطعت تسجيل الدخول كمستخدم آخر بصلاحيات المالك:

1. اذهب إلى الإعدادات
2. اختر "المستخدمين"
3. ابحث عن حساب kareemadelxx55@gmail.com
4. اضغط "تعديل"
5. غيّر كلمة المرور

## التحقق من المتطلبات

### التحقق من Docker

```bash
# التحقق من Docker
docker --version
docker-compose --version

# التحقق من الحاويات
docker-compose ps

# عرض السجلات
docker-compose logs
```

### التحقق من المنافذ

```bash
# التحقق من المنافذ المستخدمة
netstat -tulpn | grep -E ':(3000|3001|5432|6379|8080)'

# أو استخدام lsof
lsof -Pi :3000
lsof -Pi :3001
```

### التحقق من ملف .env

```bash
# التحقق من وجود ملف .env
ls -la backend/.env

# عرض محتويات الملف
cat backend/.env

# التحقق من القيم المهمة
grep -E "(JWT_SECRET|DB_|DEFAULT_OWNER)" backend/.env
```

## حلول متقدمة

### إعادة تهيئة النظام بالكامل

**⚠️ تحذير: هذا سيحذف جميع البيانات!**

```bash
# إيقاف الحاويات
docker-compose down -v

# حذف البيانات القديمة
sudo rm -rf postgres_data/
sudo rm -rf redis_data/

# إعادة البناء
docker-compose up --build -d

# الانتظار حتى يبدأ النظام
sleep 30

# التحقق من السجلات
docker-compose logs backend
```

### إنشاء حساب مالك جديد

```bash
# الاتصال بقاعدة البيانات
docker-compose exec db psql -U postgres -d digitalzeup_db

-- إنشاء مستخدم جديد
INSERT INTO users (id, email, password_hash, role_id, is_active, is_owner, created_at) 
VALUES (
    uuid_generate_v4(), 
    'newadmin@digitalzeup.net', 
    '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj.xnJvC0W8m', 
    1, 
    true, 
    true, 
    CURRENT_TIMESTAMP
);

-- إضافة سجل الموظف
INSERT INTO employees (id, user_id, employee_number, full_name_ar, full_name_en, job_title, hire_date, contract_type, employment_status, basic_salary, created_at)
SELECT 
    uuid_generate_v4(),
    id,
    'EMP' || extract(epoch from now())::bigint,
    'مدير جديد',
    'New Manager',
    'المدير التنفيذي',
    CURRENT_DATE,
    'full_time',
    'active',
    0,
    CURRENT_TIMESTAMP
FROM users WHERE email = 'newadmin@digitalzeup.net';

-- الخروج
\q
```

### التشخيص باستخدام السجلات

```bash
# عرض سجلات المصادقة
docker-compose logs backend | grep -i "auth\|login\|error"

# عرض سجلات قاعدة البيانات
docker-compose logs db | grep -i "error\|connection"

# متابعة السجلات بشكل مباشر
docker-compose logs -f backend
```

## الوقاية من المشاكل المستقبلية

### 1. النسخ الاحتياطي المنتظم

```bash
# إنشاء سكريبت نسخ احتياطي
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T db pg_dump -U postgres digitalzeup_db > backup_$DATE.sql
tar -czf uploads_backup_$DATE.tar.gz backend/uploads/
EOF

chmod +x backup.sh

# إضافة إلى cron
crontab -e
# أضف هذا السطر لنسخ احتياطي يومي:
# 0 2 * * * /path/to/backup.sh
```

### 2. مراقبة النظام

```bash
# إنشاء سكريبت مراقبة
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "System Status: $(date)"
echo "========================"
docker-compose ps
echo
echo "Recent Errors:"
docker-compose logs --tail=50 backend | grep -i error | tail -10
EOF

chmod +x monitor.sh
```

### 3. تحديثات الأمان

- تغيير كلمات المرور بانتظام
- تحديث JWT_SECRET
- مراجعة الصلاحيات بشكل دوري

## الاستكشاف باستخدام curl

### اختبار المصادقة

```bash
# اختبار تسجيل الدخول
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kareemadelxx55@gmail.com",
    "password": "Owner123!"
  }' \
  -w "\nStatus: %{http_code}\n"

# اختبار نقطة الصحة
curl http://localhost:3000/health

# اختبار الوصول للمستخدمين (باستخدام التوكن)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/users/me
```

## التواصل مع الدعم

### المعلومات المطلوبة

عند التواصل مع الدعم، يرجى تزويدنا بـ:

1. **سجلات النظام:**
   ```bash
   docker-compose logs backend > backend_logs.txt
   docker-compose logs db > db_logs.txt
   ```

2. **حالة الحاويات:**
   ```bash
   docker-compose ps > containers_status.txt
   ```

3. **ملف .env (بدون كلمات المرور الحساسة):**
   ```bash
   grep -v "SECRET\|PASSWORD\|KEY" backend/.env > env_config.txt
   ```

4. **الخطأ المحدث:**
   - رسالة الخطأ الكاملة
   - خطوات الإنجاز التي أدت للخطأ
   - لقطة شاشة (إن أمكن)

### قنوات الدعم

- **البريد الإلكتروني**: support@digitalzeup.net
- **الموقع**: https://digitalzeup.net/support
- **ساعات العمل**: الأحد - الخميس، 9 ص - 6 م

## ملخص سريع للحلول

### الحل السريع (90% من المشاكل)

```bash
# 1. إعادة تشغيل النظام
docker-compose restart

# 2. التحقق من السجلات
docker-compose logs backend | tail -50

# 3. إعادة تعيين كلمة المرور
docker-compose exec db psql -U postgres -d digitalzeup_db -c "
UPDATE users 
SET password_hash = '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj.xnJvC0W8m' 
WHERE email = 'kareemadelxx55@gmail.com';"

# 4. التحقق من الاتصال
curl http://localhost:3000/health
```

### الحل الشامل (للمشاكل المعقدة)

اتبع الخطوات المفصلة في أقسام هذا الدليل، وابدأ بـ:
1. التشخيص
2. التحقق من قاعدة البيانات
3. مراجعة السجلات
4. تطبيق الحل المناسب

---

**نهاية دليل حل مشاكل تسجيل الدخول**

إذا استمرت المشكلة، الرجاء التواصل مع فريق الدعم مع جميع المعلومات المطلوبة.
