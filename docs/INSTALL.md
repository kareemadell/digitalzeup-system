# DigitalZeup.net Management System - Installation Guide

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation Methods](#installation-methods)
3. [Docker Installation (Recommended)](#docker-installation-recommended)
4. [Manual Installation](#manual-installation)
5. [Configuration](#configuration)
6. [First Time Setup](#first-time-setup)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)
9. [Production Deployment](#production-deployment)

## System Requirements

### Minimum Requirements

- **Operating System**: Linux (Ubuntu 20.04+), macOS (10.15+), Windows 10+
- **Memory**: 4 GB RAM
- **Storage**: 10 GB free space
- **Network**: Internet connection for initial setup

### Recommended Requirements

- **Operating System**: Linux (Ubuntu 22.04+)
- **Memory**: 8 GB RAM
- **Storage**: 50 GB SSD
- **CPU**: 4 cores
- **Network**: Stable internet connection

### Software Requirements

#### For Docker Installation
- Docker 20.10+
- Docker Compose 2.0+

#### For Manual Installation
- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (optional but recommended)
- npm 9+ or yarn 1.22+

## Installation Methods

### Method 1: Docker Installation (Recommended) ⭐

This is the easiest and most reliable method. Docker handles all dependencies and configurations automatically.

### Method 2: Manual Installation

For users who prefer manual control over the installation process or want to integrate with existing infrastructure.

## Docker Installation (Recommended)

### Step 1: Install Docker

#### Ubuntu/Debian
```bash
# Update package index
sudo apt update

# Install required packages
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io

# Add user to docker group
sudo usermod -aG docker $USER
```

#### CentOS/RHEL
```bash
# Install required packages
sudo yum install -y yum-utils

# Add Docker repository
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker
sudo yum install docker-ce docker-ce-cli containerd.io

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

#### macOS
Download and install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)

#### Windows
Download and install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)

### Step 2: Install Docker Compose

#### Linux
```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

#### macOS/Windows
Docker Compose is included with Docker Desktop.

### Step 3: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/digitalzeup-system.git

# Navigate to the directory
cd digitalzeup-system
```

### Step 4: Configure Environment

Copy the environment file template:

```bash
cp backend/.env.example backend/.env
```

Edit the `.env` file with your preferred settings:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=db
DB_PORT=5432
DB_NAME=digitalzeup_db
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production
JWT_EXPIRE=24h

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Default Owner Account
DEFAULT_OWNER_EMAIL=kareemadelxx55@gmail.com
DEFAULT_OWNER_PASSWORD=Owner123!
```

### Step 5: Start the System

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 6: Verify Installation

Open your browser and navigate to:
- **Application**: http://localhost:3001
- **API Health Check**: http://localhost:3000/health
- **Database Admin**: http://localhost:8080 (Adminer)

## Manual Installation

### Step 1: Install PostgreSQL

#### Ubuntu/Debian
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb digitalzeup_db

# Create user
sudo -u postgres createuser -P digitalzeup_user
```

#### CentOS/RHEL
```bash
# Install PostgreSQL
sudo yum install postgresql-server postgresql-contrib

# Initialize database
sudo postgresql-setup --initdb

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
# Install PostgreSQL using Homebrew
brew install postgresql

# Start PostgreSQL
brew services start postgresql

# Create database
createdb digitalzeup_db
```

### Step 2: Install Node.js

#### Using NodeSource (Linux)
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install nodejs

# Verify installation
node --version
npm --version
```

#### Using nvm (Recommended)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js
nvm install 18
nvm use 18
```

#### macOS
```bash
# Using Homebrew
brew install node
```

### Step 3: Install Redis (Optional but Recommended)

#### Ubuntu/Debian
```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### macOS
```bash
# Using Homebrew
brew install redis
brew services start redis
```

### Step 4: Clone and Setup Backend

```bash
# Clone repository
git clone https://github.com/yourusername/digitalzeup-system.git
cd digitalzeup-system

# Navigate to backend
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Step 5: Configure Database

Edit `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=digitalzeup_db
DB_USER=your_username
DB_PASSWORD=your_password
```

### Step 6: Initialize Database

```bash
# Run schema
psql -h localhost -U your_username -d digitalzeup_db -f ../database/schema.sql

# Run seed data
psql -h localhost -U your_username -d digitalzeup_db -f ../database/seed.sql
```

### Step 7: Start Backend

```bash
# Development mode
npm run dev

# Or production mode
npm start
```

### Step 8: Setup Frontend

```bash
# Navigate to frontend
cd ../frontend

# Open in browser (simple method)
open index.html

# Or serve with Python
python -m http.server 3001

# Or serve with Node.js
npx serve . -p 3001
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3000` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `digitalzeup_db` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRE` | JWT expiration time | `24h` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |

### System Settings

Access system settings through the API or database:

```sql
-- View all settings
SELECT * FROM system_settings;

-- Update setting
UPDATE system_settings 
SET setting_value = '7' 
WHERE setting_key = 'subscription_alert_days';
```

## First Time Setup

### 1. Login with Owner Account

- URL: http://localhost:3001
- Email: kareemadelxx55@gmail.com
- Password: Owner123!

### 2. Change Default Password

1. Click on profile picture (top right)
2. Select "Personal Information"
3. Click "Change Password"
4. Enter new secure password

### 3. Configure Company Information

1. Navigate to Settings (only visible to owner)
2. Update company details:
   - Company name
   - Email
   - Phone
   - Address
3. Upload company logo

### 4. Setup Departments

1. Go to Employees → Departments
2. Add all company departments:
   - SEO Department
   - Social Media Department
   - Design Department
   - etc.

### 5. Setup Specializations

1. Go to Employees → Specializations
2. Add specializations for each department
3. Mark which ones deal with clients

### 6. Create Employee Accounts

1. Go to Employees → Add New
2. Fill in employee details
3. Assign role and department
4. Employee will receive login credentials

### 7. Setup Client Categories

1. Go to Clients → Categories
2. Create categories based on your services
3. Link to appropriate specializations

## Verification

### Check Services

```bash
# Check Docker services
docker-compose ps

# Check logs
docker-compose logs backend
docker-compose logs db

# Check API health
curl http://localhost:3000/health
```

### Check Database

```bash
# Connect to database
docker-compose exec db psql -U postgres -d digitalzeup_db

# Or for manual installation
psql -h localhost -U postgres -d digitalzeup_db

# List tables
\dt

# Check data
SELECT * FROM users LIMIT 5;
```

### Check Redis (if enabled)

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Or for manual installation
redis-cli

# Test connection
ping

# Check keys
keys *
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Docker:**
```bash
# Check database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

**Manual:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql
```

#### 2. Port Already in Use

```bash
# Find process using port 3000
sudo netstat -tulpn | grep :3000

# Find process using port 5432 (PostgreSQL)
sudo netstat -tulpn | grep :5432

# Change ports in .env or docker-compose.yml
```

#### 3. JWT Secret Not Set

```bash
# Generate secure JWT secret
openssl rand -base64 32

# Add to .env file
JWT_SECRET=your_generated_secret
```

#### 4. Permission Denied

```bash
# Fix file permissions
sudo chown -R $USER:$USER /path/to/project

# Fix Docker permissions
sudo usermod -aG docker $USER
```

#### 5. Frontend Not Loading

- Clear browser cache
- Check browser console for errors
- Verify backend is running and accessible
- Check CORS settings in backend

### Getting Help

1. Check logs: `docker-compose logs` or `npm logs`
2. Review documentation
3. Check GitHub issues
4. Contact support: support@digitalzeup.net

## Production Deployment

### Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Set up regular backups
- [ ] Enable rate limiting
- [ ] Use environment variables for sensitive data

### Performance Optimization

1. **Database:**
   - Add indexes for frequently queried columns
   - Configure connection pooling
   - Set up read replicas if needed

2. **Redis:**
   - Enable persistence
   - Configure memory limits
   - Set up clustering for high availability

3. **Node.js:**
   - Use PM2 for process management
   - Enable clustering
   - Configure memory limits

4. **Nginx:**
   - Enable gzip compression
   - Configure caching
   - Set up load balancing

### Monitoring

Set up monitoring for:
- Application performance
- Database performance
- System resources
- Error rates
- User activity

### Backup Strategy

1. **Database:**
   ```bash
   # Daily backup
   pg_dump digitalzeup_db > backup_$(date +%Y%m%d).sql
   
   # Automated backup script
   # Add to crontab: 0 2 * * * /path/to/backup.sh
   ```

2. **Uploaded Files:**
   ```bash
   # Backup uploads directory
   tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
   ```

3. **Configuration:**
   - Backup `.env` files
   - Document all custom configurations

### SSL/HTTPS Setup

1. **Using Let's Encrypt (Free):**
   ```bash
   # Install Certbot
   sudo apt install certbot
   
   # Generate certificate
   sudo certbot --nginx -d yourdomain.com
   ```

2. **Configure Nginx:**
   ```nginx
   server {
       listen 443 ssl;
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:3001;
       }
   }
   ```

---

**End of Installation Guide**

For additional support, visit: https://digitalzeup.net/docs
