#!/bin/bash

# ==========================================
# DigitalZeup.net Management System
# Quick Deployment Script
# ==========================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check if Docker is installed
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker is installed: $DOCKER_VERSION"
    else
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if command_exists docker-compose; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker Compose is installed: $COMPOSE_VERSION"
    else
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if port 3000 is available
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3000 is already in use. Please free it or change the port in docker-compose.yml"
    else
        print_success "Port 3000 is available"
    fi
    
    # Check if port 3001 is available
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Port 3001 is already in use. Please free it or change the port in docker-compose.yml"
    else
        print_success "Port 3001 is available"
    fi
}

# Function to create necessary directories
setup_directories() {
    print_status "Setting up directories..."
    
    mkdir -p backend/uploads
    mkdir -p backend/logs
    mkdir -p frontend/assets
    
    # Create placeholder files
    touch backend/uploads/.gitkeep
    touch backend/logs/.gitkeep
    touch frontend/assets/.gitkeep
    
    print_success "Directories created"
}

# Function to generate secure secrets
generate_secrets() {
    print_status "Generating secure secrets..."
    
    # Check if .env file exists
    if [ -f "backend/.env" ]; then
        print_warning ".env file already exists. Skipping secret generation."
        return
    fi
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    
    # Generate database password
    DB_PASSWORD=$(openssl rand -base64 16)
    
    # Create .env file
    cat > backend/.env << EOF
# ==========================================
# DigitalZeup Backend Configuration
# ==========================================

# Server Configuration
NODE_ENV=production
PORT=3000
HOST=localhost

# Database Configuration
DB_HOST=db
DB_PORT=5432
DB_NAME=digitalzeup_db
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRE=24h
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_EXPIRE=7d

# Email Configuration (Update these with your SMTP settings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@digitalzeup.net

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx,xlsx

# Exchange Rate API (Optional)
EXCHANGE_RATE_API_KEY=your_api_key_here
EXCHANGE_RATE_API_URL=https://api.exchangerate-api.com/v4/latest/USD

# Company Information
COMPANY_NAME=DigitalZeup.net
COMPANY_EMAIL=info@digitalzeup.net
COMPANY_PHONE=+966XXXXXXXXX
COMPANY_ADDRESS=Saudi Arabia

# Security Settings
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
SESSION_TIMEOUT=60

# Notification Settings
EMAIL_NOTIFICATIONS_ENABLED=true
SMS_NOTIFICATIONS_ENABLED=false
WHATSAPP_NOTIFICATIONS_ENABLED=false

# Default Owner Account
DEFAULT_OWNER_EMAIL=kareemadelxx55@gmail.com
DEFAULT_OWNER_PASSWORD=Owner123!

# Working Hours Configuration
WORKING_HOURS_START=09:00
WORKING_HOURS_END=18:00
WORKING_DAYS=sunday,monday,tuesday,wednesday,thursday

# Financial Settings
SUBSCRIPTION_ALERT_DAYS=7
PAYMENT_DELAY_GRACE_DAYS=3
BASE_CURRENCY=SAR
EXCHANGE_RATE_UPDATE_INTERVAL=6

# API Keys
API_KEY_PREFIX=DZ
API_VERSION=v1

# CORS Settings
CORS_ORIGIN=http://localhost:3001
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Backup Settings
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
EOF
    
    print_success "Secrets generated and .env file created"
    print_warning "Please review and update the .env file with your specific settings"
}

# Function to build and start Docker containers
start_containers() {
    print_status "Building and starting Docker containers..."
    
    # Pull latest images
    docker-compose pull
    
    # Build and start containers
    docker-compose up --build -d
    
    if [ $? -eq 0 ]; then
        print_success "Containers started successfully"
    else
        print_error "Failed to start containers"
        exit 1
    fi
}

# Function to wait for database to be ready
wait_for_database() {
    print_status "Waiting for database to be ready..."
    
    # Wait for PostgreSQL to be ready
    for i in {1..30}; do
        if docker-compose exec -T db pg_isready -U postgres >/dev/null 2>&1; then
            print_success "Database is ready"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    echo
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Copy schema and seed files to container
    docker-compose exec -T db psql -U postgres -d digitalzeup_db < database/schema.sql
    docker-compose exec -T db psql -U postgres -d digitalzeup_db < database/seed.sql
    
    print_success "Database migrations completed"
}

# Function to check if application is healthy
check_health() {
    print_status "Checking application health..."
    
    # Wait for backend to start
    for i in {1..30}; do
        if curl -s http://localhost:3000/health >/dev/null 2>&1; then
            print_success "Backend is healthy"
            break
        fi
        echo -n "."
        sleep 2
    done
    
    echo
    
    # Check frontend
    if curl -s http://localhost:3001 >/dev/null 2>&1; then
        print_success "Frontend is accessible"
    else
        print_warning "Frontend may not be ready yet"
    fi
}

# Function to display system information
display_info() {
    print_success "=========================================="
    print_success "DigitalZeup.net System Deployed Successfully!"
    print_success "=========================================="
    echo
    print_status "Access URLs:"
    echo "  - Application: http://localhost:3001"
    echo "  - API: http://localhost:3000"
    echo "  - API Health: http://localhost:3000/health"
    echo "  - Database Admin: http://localhost:8080"
    echo
    print_status "Default Login Credentials:"
    echo "  - Email: kareemadelxx55@gmail.com"
    echo "  - Password: Owner123!"
    echo
    print_status "Important Files:"
    echo "  - Environment Config: backend/.env"
    echo "  - Logs: backend/logs/"
    echo "  - Uploads: backend/uploads/"
    echo
    print_status "Docker Commands:"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Stop system: docker-compose down"
    echo "  - Restart: docker-compose restart"
    echo "  - Update: docker-compose pull && docker-compose up -d"
    echo
    print_warning "Security Recommendations:"
    echo "  1. Change the default owner password immediately"
    echo "  2. Update JWT_SECRET in backend/.env"
    echo "  3. Configure SMTP settings for email notifications"
    echo "  4. Set up SSL/HTTPS for production"
    echo "  5. Configure firewall rules"
    echo
    print_success "=========================================="
}

# Function to setup monitoring
setup_monitoring() {
    print_status "Setting up basic monitoring..."
    
    # Create a simple monitoring script
    cat > monitor.sh << 'EOF'
#!/bin/bash

echo "DigitalZeup System Monitor"
echo "========================="
echo

echo "Container Status:"
docker-compose ps
echo

echo "System Resources:"
docker stats --no-stream
echo

echo "Recent Logs (last 10 lines):"
docker-compose logs --tail=10
echo

echo "Database Size:"
docker-compose exec -T db pg_size_pretty
echo

echo "Backup Status:"
ls -la backups/ 2>/dev/null || echo "No backups found"
EOF
    
    chmod +x monitor.sh
    
    print_success "Monitoring script created: monitor.sh"
}

# Function to setup backup
setup_backup() {
    print_status "Setting up backup script..."
    
    mkdir -p backups
    
    cat > backup.sh << 'EOF'
#!/bin/bash

# Backup script for DigitalZeup system
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup database
print_status "Backing up database..."
docker-compose exec -T db pg_dump -U postgres digitalzeup_db > $BACKUP_DIR/database_$DATE.sql

# Backup uploads
print_status "Backing up uploads..."
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz backend/uploads/

# Backup configuration
print_status "Backing up configuration..."
cp backend/.env $BACKUP_DIR/env_$DATE.backup

# Remove old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.backup" -mtime +7 -delete

print_success "Backup completed: $BACKUP_DIR/"
EOF
    
    chmod +x backup.sh
    
    print_success "Backup script created: backup.sh"
}

# Main deployment function
main() {
    print_status "Starting DigitalZeup.net deployment..."
    echo
    
    # Check if running as root (not recommended)
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root is not recommended for security reasons."
        read -p "Do you want to continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Step 1: Check requirements
    check_requirements
    echo
    
    # Step 2: Setup directories
    setup_directories
    echo
    
    # Step 3: Generate secrets
    generate_secrets
    echo
    
    # Step 4: Start containers
    start_containers
    echo
    
    # Step 5: Wait for database
    wait_for_database
    echo
    
    # Step 6: Run migrations (if needed)
    # run_migrations
    # echo
    
    # Step 7: Check health
    check_health
    echo
    
    # Step 8: Setup monitoring
    setup_monitoring
    echo
    
    # Step 9: Setup backup
    setup_backup
    echo
    
    # Step 10: Display information
    display_info
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "start")
        print_status "Starting existing containers..."
        docker-compose start
        ;;
    "stop")
        print_status "Stopping containers..."
        docker-compose stop
        ;;
    "restart")
        print_status "Restarting containers..."
        docker-compose restart
        ;;
    "update")
        print_status "Updating system..."
        docker-compose pull
        docker-compose up -d
        ;;
    "backup")
        ./backup.sh
        ;;
    "monitor")
        ./monitor.sh
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "clean")
        print_warning "This will remove all containers and data. Are you sure?"
        read -p "Type 'yes' to confirm: " -r
        if [[ $REPLY == "yes" ]]; then
            docker-compose down -v
            docker system prune -f
            print_success "System cleaned"
        else
            print_status "Clean cancelled"
        fi
        ;;
    "help")
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  deploy    - Deploy the system (default)"
        echo "  start     - Start existing containers"
        echo "  stop      - Stop containers"
        echo "  restart   - Restart containers"
        echo "  update    - Update containers"
        echo "  backup    - Run backup"
        echo "  monitor   - Show system status"
        echo "  logs      - Show logs"
        echo "  clean     - Remove all containers and data"
        echo "  help      - Show this help message"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
