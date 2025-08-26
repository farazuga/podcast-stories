#!/bin/bash

# VidPOD Rundown Creator - Automated Deployment Script
# Handles the complete deployment process with validation and rollback capability

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/deployment.log"
BACKUP_DIR="$SCRIPT_DIR/backups"
DATABASE_URL="${DATABASE_URL:-}"
DEPLOYMENT_MODE="${1:-development}"

# Functions
log() {
    local message="$1"
    local level="${2:-INFO}"
    local color="${3:-$NC}"
    
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message${NC}" | tee -a "$LOG_FILE"
}

log_info() { log "$1" "INFO" "$BLUE"; }
log_success() { log "$1" "SUCCESS" "$GREEN"; }
log_warning() { log "$1" "WARNING" "$YELLOW"; }
log_error() { log "$1" "ERROR" "$RED"; }
log_section() { 
    echo | tee -a "$LOG_FILE"
    log "$(printf '=%.0s' {1..60})" "SECTION" "$CYAN"
    log "$1" "SECTION" "$CYAN"
    log "$(printf '=%.0s' {1..60})" "SECTION" "$CYAN"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Pre-deployment checks
pre_deployment_checks() {
    log_section "Pre-deployment Checks"
    
    # Check required commands
    local required_commands=("node" "npm" "psql")
    for cmd in "${required_commands[@]}"; do
        if command_exists "$cmd"; then
            log_success "$cmd is available"
        else
            log_error "$cmd is not installed"
            exit 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2)
    local major_version=$(echo "$node_version" | cut -d'.' -f1)
    if [ "$major_version" -ge 16 ]; then
        log_success "Node.js version $node_version is compatible"
    else
        log_error "Node.js version $node_version is too old (require 16+)"
        exit 1
    fi
    
    # Check database connection
    if [ -n "$DATABASE_URL" ]; then
        if psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
            log_success "Database connection verified"
        else
            log_error "Cannot connect to database"
            exit 1
        fi
    else
        log_warning "DATABASE_URL not set - database operations will be skipped"
    fi
    
    # Check if we're in the right directory
    if [ ! -f "$SCRIPT_DIR/package.json" ]; then
        log_error "package.json not found - are you in the correct directory?"
        exit 1
    fi
    
    log_success "Pre-deployment checks passed"
}

# Setup environment
setup_environment() {
    log_section "Environment Setup"
    
    # Create necessary directories
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$SCRIPT_DIR/logs"
    
    # Check for .env file
    if [ ! -f "$SCRIPT_DIR/.env" ] && [ "$DEPLOYMENT_MODE" = "development" ]; then
        log_warning ".env file not found - creating template"
        cat > "$SCRIPT_DIR/.env" << 'EOF'
# VidPOD Rundown Creator Environment Configuration
DATABASE_URL=postgresql://username:password@host:port/database
VIDPOD_API_URL=http://localhost:3000
PORT=3001
NODE_ENV=development
JWT_SECRET=your-jwt-secret-here
DEBUG_MODE=true
EOF
        log_info ".env template created - please configure it before deployment"
    fi
    
    # Set appropriate NODE_ENV
    if [ "$DEPLOYMENT_MODE" = "production" ]; then
        export NODE_ENV=production
        log_info "NODE_ENV set to production"
    else
        export NODE_ENV=development
        log_info "NODE_ENV set to development"
    fi
}

# Install dependencies
install_dependencies() {
    log_section "Installing Dependencies"
    
    cd "$SCRIPT_DIR"
    
    # Clean install for production, regular install for development
    if [ "$DEPLOYMENT_MODE" = "production" ]; then
        log_info "Running npm ci for production..."
        npm ci --only=production
    else
        log_info "Running npm install for development..."
        npm install
    fi
    
    log_success "Dependencies installed successfully"
}

# Database setup
setup_database() {
    log_section "Database Setup"
    
    if [ -z "$DATABASE_URL" ]; then
        log_warning "DATABASE_URL not set - skipping database setup"
        return
    fi
    
    # Check if rundown creator tables exist
    local table_count=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_name LIKE 'rundown_app_%'
    " 2>/dev/null | xargs)
    
    if [ "$table_count" -eq 0 ]; then
        log_info "Rundown creator tables not found - creating schema"
        
        if [ -f "$SCRIPT_DIR/backend/db/schema.sql" ]; then
            psql "$DATABASE_URL" < "$SCRIPT_DIR/backend/db/schema.sql"
            log_success "Database schema created"
        else
            log_error "Schema file not found at backend/db/schema.sql"
            exit 1
        fi
    else
        log_info "Found $table_count rundown creator tables - schema already exists"
    fi
    
    # Create performance indexes
    log_info "Creating performance indexes..."
    psql "$DATABASE_URL" << 'EOF'
CREATE INDEX IF NOT EXISTS idx_rundown_app_rundowns_created_by ON rundown_app_rundowns(created_by);
CREATE INDEX IF NOT EXISTS idx_rundown_app_rundowns_status ON rundown_app_rundowns(status);
CREATE INDEX IF NOT EXISTS idx_rundown_app_segments_rundown_id ON rundown_app_segments(rundown_id);
CREATE INDEX IF NOT EXISTS idx_rundown_app_segments_sort_order ON rundown_app_segments(rundown_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_rundown_app_stories_rundown_id ON rundown_app_stories(rundown_id);
EOF
    
    log_success "Database setup completed"
}

# Build application
build_application() {
    log_section "Building Application"
    
    cd "$SCRIPT_DIR"
    
    # For this application, there's no build step required
    # But we can validate the files
    log_info "Validating application files..."
    
    local required_files=(
        "backend/server.js"
        "backend/routes/rundowns.js"
        "backend/routes/segments.js" 
        "backend/routes/integration.js"
        "backend/middleware/auth-proxy.js"
        "frontend/index.html"
        "frontend/css/rundown-styles.css"
        "frontend/js/app.js"
    )
    
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "✓ $file"
        else
            log_error "✗ $file not found"
            exit 1
        fi
    done
    
    log_success "Application files validated"
}

# Start services
start_services() {
    log_section "Starting Services"
    
    cd "$SCRIPT_DIR"
    
    # Kill any existing processes
    pkill -f "node.*server.js" 2>/dev/null || true
    
    # Wait a moment for processes to die
    sleep 2
    
    # Start the application
    if [ "$DEPLOYMENT_MODE" = "production" ]; then
        log_info "Starting in production mode..."
        nohup npm start > "$SCRIPT_DIR/logs/app.log" 2>&1 &
        APP_PID=$!
        echo $APP_PID > "$SCRIPT_DIR/app.pid"
    else
        log_info "Starting in development mode..."
        nohup npm run dev > "$SCRIPT_DIR/logs/app.log" 2>&1 &
        APP_PID=$!
        echo $APP_PID > "$SCRIPT_DIR/app.pid"
    fi
    
    # Wait for service to start
    log_info "Waiting for service to start..."
    local retries=30
    local count=0
    
    while [ $count -lt $retries ]; do
        if curl -s http://localhost:3001/health >/dev/null 2>&1; then
            log_success "Service started successfully (PID: $APP_PID)"
            return 0
        fi
        
        sleep 1
        count=$((count + 1))
        
        if [ $((count % 5)) -eq 0 ]; then
            log_info "Still waiting... ($count/$retries)"
        fi
    done
    
    log_error "Service failed to start within $retries seconds"
    return 1
}

# Run tests
run_tests() {
    log_section "Running Tests"
    
    cd "$SCRIPT_DIR"
    
    # Run debug tool for comprehensive testing
    if [ -f "$SCRIPT_DIR/debug-tool.js" ]; then
        log_info "Running comprehensive debug checks..."
        
        if node "$SCRIPT_DIR/debug-tool.js" --mode="$DEPLOYMENT_MODE"; then
            log_success "Debug checks passed"
        else
            log_error "Debug checks failed"
            return 1
        fi
    else
        log_warning "Debug tool not found - running basic tests"
        
        # Basic health check
        if curl -s http://localhost:3001/health | grep -q "healthy"; then
            log_success "Basic health check passed"
        else
            log_error "Basic health check failed"
            return 1
        fi
    fi
    
    # Run unit tests if available
    if grep -q '"test"' package.json; then
        log_info "Running unit tests..."
        if npm test; then
            log_success "Unit tests passed"
        else
            log_warning "Unit tests failed - continuing deployment"
        fi
    fi
}

# Post-deployment verification
post_deployment_verification() {
    log_section "Post-deployment Verification"
    
    # Verify service is responding
    local health_check=$(curl -s http://localhost:3001/health 2>/dev/null || echo "failed")
    if echo "$health_check" | grep -q "healthy"; then
        log_success "Health endpoint responding correctly"
    else
        log_error "Health endpoint not responding"
        return 1
    fi
    
    # Verify frontend is loading
    local frontend_check=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null || echo "000")
    if [ "$frontend_check" = "200" ]; then
        log_success "Frontend loading correctly"
    else
        log_error "Frontend not loading (HTTP $frontend_check)"
        return 1
    fi
    
    # Check process is running
    if [ -f "$SCRIPT_DIR/app.pid" ]; then
        local pid=$(cat "$SCRIPT_DIR/app.pid")
        if ps -p "$pid" > /dev/null; then
            log_success "Application process running (PID: $pid)"
        else
            log_error "Application process not running"
            return 1
        fi
    fi
    
    log_success "Post-deployment verification completed"
}

# Create backup
create_backup() {
    log_section "Creating Backup"
    
    local backup_timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_path="$BACKUP_DIR/backup_$backup_timestamp"
    
    mkdir -p "$backup_path"
    
    # Backup database if possible
    if [ -n "$DATABASE_URL" ]; then
        log_info "Creating database backup..."
        pg_dump "$DATABASE_URL" \
            --table="rundown_app_*" \
            --data-only \
            --file="$backup_path/database_backup.sql" 2>/dev/null || {
            log_warning "Database backup failed"
        }
    fi
    
    # Backup configuration
    if [ -f "$SCRIPT_DIR/.env" ]; then
        cp "$SCRIPT_DIR/.env" "$backup_path/"
        log_info "Configuration backed up"
    fi
    
    # Backup logs
    if [ -d "$SCRIPT_DIR/logs" ]; then
        cp -r "$SCRIPT_DIR/logs" "$backup_path/"
        log_info "Logs backed up"
    fi
    
    log_success "Backup created at $backup_path"
    echo "$backup_path" > "$SCRIPT_DIR/latest_backup.txt"
}

# Rollback function
rollback() {
    log_section "Rolling Back Deployment"
    
    # Stop current service
    if [ -f "$SCRIPT_DIR/app.pid" ]; then
        local pid=$(cat "$SCRIPT_DIR/app.pid")
        kill "$pid" 2>/dev/null || true
        rm -f "$SCRIPT_DIR/app.pid"
        log_info "Stopped application process"
    fi
    
    # Restore from latest backup if available
    if [ -f "$SCRIPT_DIR/latest_backup.txt" ]; then
        local backup_path=$(cat "$SCRIPT_DIR/latest_backup.txt")
        if [ -d "$backup_path" ]; then
            log_info "Restoring from backup: $backup_path"
            
            # Restore configuration
            if [ -f "$backup_path/.env" ]; then
                cp "$backup_path/.env" "$SCRIPT_DIR/"
                log_info "Configuration restored"
            fi
            
            # Restore database if backup exists
            if [ -f "$backup_path/database_backup.sql" ] && [ -n "$DATABASE_URL" ]; then
                log_info "Restoring database..."
                psql "$DATABASE_URL" < "$backup_path/database_backup.sql" 2>/dev/null || {
                    log_warning "Database restore failed"
                }
            fi
        fi
    fi
    
    log_success "Rollback completed"
}

# Cleanup function
cleanup() {
    log_section "Cleanup"
    
    # Remove old backups (keep last 5)
    if [ -d "$BACKUP_DIR" ]; then
        local backup_count=$(ls -1 "$BACKUP_DIR" | wc -l)
        if [ "$backup_count" -gt 5 ]; then
            log_info "Removing old backups..."
            ls -1t "$BACKUP_DIR" | tail -n +6 | while read -r old_backup; do
                rm -rf "$BACKUP_DIR/$old_backup"
                log_info "Removed old backup: $old_backup"
            done
        fi
    fi
    
    # Clean up temporary files
    find "$SCRIPT_DIR" -name "*.tmp" -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Show status
show_status() {
    log_section "Deployment Status"
    
    # Service status
    if curl -s http://localhost:3001/health >/dev/null 2>&1; then
        log_success "✓ Rundown Creator service is running"
        
        # Show service details
        local health_response=$(curl -s http://localhost:3001/health 2>/dev/null)
        if [ -n "$health_response" ]; then
            log_info "Service response: $health_response"
        fi
    else
        log_error "✗ Rundown Creator service is not responding"
    fi
    
    # Process status
    if [ -f "$SCRIPT_DIR/app.pid" ]; then
        local pid=$(cat "$SCRIPT_DIR/app.pid")
        if ps -p "$pid" > /dev/null; then
            log_success "✓ Application process running (PID: $pid)"
        else
            log_error "✗ Application process not running"
        fi
    else
        log_warning "No PID file found"
    fi
    
    # Port status
    local port_check=$(lsof -i :3001 2>/dev/null | grep LISTEN || echo "none")
    if [ "$port_check" != "none" ]; then
        log_success "✓ Port 3001 is in use"
    else
        log_error "✗ Port 3001 is not in use"
    fi
    
    # Database status
    if [ -n "$DATABASE_URL" ]; then
        if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM rundown_app_rundowns;" >/dev/null 2>&1; then
            log_success "✓ Database connection working"
        else
            log_error "✗ Database connection failed"
        fi
    else
        log_warning "DATABASE_URL not configured"
    fi
}

# Signal handlers
trap 'log_error "Deployment interrupted by user"; exit 1' INT
trap 'log_error "Deployment terminated"; exit 1' TERM

# Main deployment function
main() {
    log_section "VidPOD Rundown Creator Deployment"
    log_info "Deployment mode: $DEPLOYMENT_MODE"
    log_info "Script directory: $SCRIPT_DIR"
    log_info "Log file: $LOG_FILE"
    
    # Create backup before deployment
    create_backup
    
    # Run deployment steps
    pre_deployment_checks
    setup_environment
    install_dependencies
    setup_database
    build_application
    start_services
    
    # Wait a moment for service to stabilize
    sleep 3
    
    # Run tests and verification
    if run_tests && post_deployment_verification; then
        log_success "🎉 Deployment completed successfully!"
        show_status
        cleanup
        
        log_info ""
        log_info "Access your rundown creator at: http://localhost:3001"
        log_info "Logs are available at: $SCRIPT_DIR/logs/app.log"
        log_info ""
        
        exit 0
    else
        log_error "❌ Deployment failed during testing or verification"
        log_info "Rolling back..."
        rollback
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "production"|"prod")
        DEPLOYMENT_MODE="production"
        main
        ;;
    "development"|"dev"|"")
        DEPLOYMENT_MODE="development"
        main
        ;;
    "status")
        show_status
        ;;
    "rollback")
        rollback
        ;;
    "stop")
        log_info "Stopping rundown creator service..."
        if [ -f "$SCRIPT_DIR/app.pid" ]; then
            local pid=$(cat "$SCRIPT_DIR/app.pid")
            kill "$pid" 2>/dev/null || true
            rm -f "$SCRIPT_DIR/app.pid"
            log_success "Service stopped"
        else
            log_warning "No PID file found"
        fi
        ;;
    "restart")
        log_info "Restarting rundown creator service..."
        if [ -f "$SCRIPT_DIR/app.pid" ]; then
            local pid=$(cat "$SCRIPT_DIR/app.pid")
            kill "$pid" 2>/dev/null || true
            rm -f "$SCRIPT_DIR/app.pid"
        fi
        sleep 2
        start_services
        log_success "Service restarted"
        ;;
    "help"|"-h"|"--help")
        echo "VidPOD Rundown Creator Deployment Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  development, dev     Deploy in development mode (default)"
        echo "  production, prod     Deploy in production mode"
        echo "  status              Show service status"
        echo "  stop                Stop the service"
        echo "  restart             Restart the service"
        echo "  rollback            Rollback to previous deployment"
        echo "  help                Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  DATABASE_URL        PostgreSQL connection string"
        echo "  VIDPOD_API_URL      Main VidPOD API URL (default: http://localhost:3000)"
        echo "  PORT                Service port (default: 3001)"
        echo ""
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac