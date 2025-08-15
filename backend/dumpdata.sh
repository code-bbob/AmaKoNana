#!/bin/bash

# Data Dump Script for Tracking Backend
# This script runs inside the Docker container and creates both Django JSON dumps and PostgreSQL dumps

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
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

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_DIR="/app/backups/${TIMESTAMP}"
DJANGO_DUMP_FILE="${DUMP_DIR}/django_full_dump.json"
ESSENTIAL_DUMP_FILE="${DUMP_DIR}/django_essential_dump.json"
SQL_DUMP_FILE="${DUMP_DIR}/postgres_dump.sql"

# Create backup directory
create_backup_dir() {
    print_status "Creating backup directory: ${DUMP_DIR}"
    mkdir -p "${DUMP_DIR}"
    
    # Ensure the parent backups directory exists and has proper permissions
    if [ ! -d "/app/backups" ]; then
        mkdir -p "/app/backups"
        chmod 755 "/app/backups"
    fi
    
    if [ -d "${DUMP_DIR}" ]; then
        print_success "Backup directory created"
    else
        print_error "Failed to create backup directory"
        exit 1
    fi
}

# Django data dump functions
django_full_dump() {
    print_status "Creating full Django data dump..."
    python manage.py dumpdata \
        --output="${DJANGO_DUMP_FILE}" \
        --indent=2 \
        --format=json \
        --verbosity=1
    
    if [ -f "${DJANGO_DUMP_FILE}" ]; then
        local size=$(du -h "${DJANGO_DUMP_FILE}" | cut -f1)
        print_success "Full Django dump created: ${DJANGO_DUMP_FILE} (${size})"
    else
        print_error "Failed to create Django dump"
        return 1
    fi
}

django_essential_dump() {
    print_status "Creating essential Django data dump (excluding temporary data)..."
    python manage.py dumpdata \
        --output="${ESSENTIAL_DUMP_FILE}" \
        --indent=2 \
        --format=json \
        --exclude=sessions.session \
        --exclude=admin.logentry \
        --exclude=contenttypes.contenttype \
        --exclude=auth.permission \
        --verbosity=1
    
    if [ -f "${ESSENTIAL_DUMP_FILE}" ]; then
        local size=$(du -h "${ESSENTIAL_DUMP_FILE}" | cut -f1)
        print_success "Essential Django dump created: ${ESSENTIAL_DUMP_FILE} (${size})"
    else
        print_error "Failed to create essential Django dump"
        return 1
    fi
}
# PostgreSQL dump function
postgres_dump() {
    print_status "Creating PostgreSQL database dump..."
    
    # Check if we're using PostgreSQL
    local db_engine=$(python -c "
import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

db_config = settings.DATABASES.get('default', {})
print(db_config.get('ENGINE', ''))
")
    
    if [[ "$db_engine" == *"postgresql"* ]]; then
        # Check if pg_dump is available
        if ! command -v pg_dump &> /dev/null; then
            print_error "pg_dump command not found. PostgreSQL client tools are not installed."
            print_warning "Installing PostgreSQL client tools..."
            
            # Try to install PostgreSQL client tools
            if command -v apt-get &> /dev/null; then
                apt-get update -qq && apt-get install -y -qq postgresql-client
            elif command -v yum &> /dev/null; then
                yum install -y postgresql
            elif command -v apk &> /dev/null; then
                apk add --no-cache postgresql-client
            else
                print_error "Cannot install PostgreSQL client tools automatically."
                print_warning "Please install pg_dump manually or use Django-only dumps."
                return 1
            fi
        fi
        
        # Get database configuration from Django settings
        local db_config=$(python -c "
import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

db_config = settings.DATABASES.get('default', {})
print(f\"{db_config.get('NAME', '')};{db_config.get('USER', '')};{db_config.get('HOST', 'localhost')};{db_config.get('PORT', '5432')};{db_config.get('PASSWORD', '')}\")
")
        
        IFS=';' read -r DB_NAME DB_USER DB_HOST DB_PORT DB_PASSWORD <<< "$db_config"
        
        print_status "Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
        
        # Set PGPASSWORD environment variable
        export PGPASSWORD="${DB_PASSWORD}"
        
        # Create PostgreSQL dump
        pg_dump \
            --host="${DB_HOST}" \
            --port="${DB_PORT}" \
            --username="${DB_USER}" \
            --dbname="${DB_NAME}" \
            --file="${SQL_DUMP_FILE}" \
            --verbose \
            --no-password \
            --format=custom \
            --compress=9
        
        if [ -f "${SQL_DUMP_FILE}" ]; then
            local size=$(du -h "${SQL_DUMP_FILE}" | cut -f1)
            print_success "PostgreSQL dump created: ${SQL_DUMP_FILE} (${size})"
        else
            print_error "Failed to create PostgreSQL dump"
            return 1
        fi
        
        # Also create a plain SQL dump for easier inspection
        local plain_sql_dump="${DUMP_DIR}/postgres_dump_plain.sql"
        pg_dump \
            --host="${DB_HOST}" \
            --port="${DB_PORT}" \
            --username="${DB_USER}" \
            --dbname="${DB_NAME}" \
            --file="${plain_sql_dump}" \
            --no-password \
            --format=plain \
            --inserts
        
        if [ -f "${plain_sql_dump}" ]; then
            local size=$(du -h "${plain_sql_dump}" | cut -f1)
            print_success "Plain PostgreSQL dump created: ${plain_sql_dump} (${size})"
        fi
        
        unset PGPASSWORD
        
    elif [[ "$db_engine" == *"sqlite"* ]]; then
        print_status "SQLite database detected, copying database file..."
        
        local sqlite_file=$(python -c "
import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

db_config = settings.DATABASES.get('default', {})
print(db_config.get('NAME', ''))
")
        
        if [ -f "${sqlite_file}" ]; then
            cp "${sqlite_file}" "${DUMP_DIR}/sqlite_database.db"
            local size=$(du -h "${DUMP_DIR}/sqlite_database.db" | cut -f1)
            print_success "SQLite database copied: ${DUMP_DIR}/sqlite_database.db (${size})"
            
            # Create SQL dump from SQLite
            sqlite3 "${sqlite_file}" .dump > "${DUMP_DIR}/sqlite_dump.sql"
            local sql_size=$(du -h "${DUMP_DIR}/sqlite_dump.sql" | cut -f1)
            print_success "SQLite SQL dump created: ${DUMP_DIR}/sqlite_dump.sql (${sql_size})"
        else
            print_error "SQLite database file not found: ${sqlite_file}"
        fi
    else
        print_warning "Unsupported database engine: ${db_engine}"
        print_warning "Skipping database dump"
    fi
}

# Create summary file
create_summary() {
    local summary_file="${DUMP_DIR}/backup_summary.txt"
    
    print_status "Creating backup summary..."
    
    cat > "${summary_file}" << EOF
Tracking Backend - Data Backup Summary
=====================================

Backup Date: $(date)
Backup Directory: ${DUMP_DIR}
Hostname: $(hostname)
User: $(whoami)

Files Created:
$(ls -lh "${DUMP_DIR}" | grep -v "^total")

Database Information:
$(python -c "
import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

db_config = settings.DATABASES.get('default', {})
print(f'Engine: {db_config.get(\"ENGINE\", \"\")}')
print(f'Name: {db_config.get(\"NAME\", \"\")}')
print(f'Host: {db_config.get(\"HOST\", \"localhost\")}')
print(f'Port: {db_config.get(\"PORT\", \"5432\")}')
")

Django Apps:
- userauth
- enterprise  
- bills
- codes

Total Backup Size: $(du -sh "${DUMP_DIR}" | cut -f1)
EOF
    
    print_success "Summary created: ${summary_file}"
}

# Set file permissions
set_permissions() {
    print_status "Setting backup file permissions..."
    chmod -R 600 "${DUMP_DIR}"
    chmod 700 "${DUMP_DIR}"
    print_success "Permissions set (owner read/write only)"
}

# Cleanup old backups (keep last 10)
cleanup_old_backups() {
    local backup_parent_dir="/app/backups"
    
    if [ -d "${backup_parent_dir}" ]; then
        print_status "Cleaning up old backups (keeping last 10)..."
        
        # Count existing backups
        local backup_count=$(ls -1 "${backup_parent_dir}" | wc -l)
        
        if [ "${backup_count}" -gt 10 ]; then
            # Remove oldest backups, keeping only the 10 most recent
            ls -1t "${backup_parent_dir}" | tail -n +11 | while read old_backup; do
                rm -rf "${backup_parent_dir}/${old_backup}"
                print_status "Removed old backup: ${old_backup}"
            done
            print_success "Old backups cleaned up"
        else
            print_status "No cleanup needed (${backup_count} backups exist)"
        fi
    fi
}

# Main execution
main() {
    echo "=============================================="
    echo "  TRACKING BACKEND - DATA DUMP UTILITY"
    echo "=============================================="
    echo
    
    print_status "Starting backup process at $(date)"
    
    # Create backup directory
    create_backup_dir
    
    # Perform Django dumps
    django_full_dump
    django_essential_dump
    
    # Perform database dump
    postgres_dump
    
    # Create summary
    create_summary
    
    # Set permissions
    set_permissions
    
    # Cleanup old backups
    cleanup_old_backups
    
    echo
    print_success "Backup completed successfully!"
    print_success "Backup location: ${DUMP_DIR}"
    
    # Display final summary
    echo
    echo "Backup Summary:"
    echo "==============="
    ls -lh "${DUMP_DIR}"
    echo
    print_success "Total backup size: $(du -sh "${DUMP_DIR}" | cut -f1)"
}

# Error handling
trap 'print_error "Script failed on line $LINENO"' ERR

# Check if running in Django project directory
if [ ! -f "manage.py" ]; then
    print_error "manage.py not found. Please run this script from the Django project root."
    exit 1
fi

# Execute main function
main "$@"
