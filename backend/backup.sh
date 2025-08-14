#!/bin/bash

# Comprehensive Data Backup Script for AmaKoNana Backend
# Creates Django JSON dumps (full, essential, per-app) and PostgreSQL (custom + plain) or SQLite backups.
# Designed to run inside the web container (working dir /app) OR on host (will docker exec if possible).

set -euo pipefail
IFS=$'\n\t'

# -------- Colorized Output ---------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
log_ok()      { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_err()     { echo -e "${RED}[ERR]${NC} $*" 1>&2; }

# -------- Host / Container Auto-detect ---------
IN_CONTAINER=0
if [ -f /.dockerenv ] || grep -qi docker /proc/1/cgroup 2>/dev/null; then
  IN_CONTAINER=1
fi

# If run from repo root on host, but manage.py lives in backend/ then cd there
if [ -f "manage.py" ]; then
  PROJECT_ROOT=$(pwd)
elif [ -f "backend/manage.py" ]; then
  PROJECT_ROOT=$(pwd)/backend
  cd "$PROJECT_ROOT"
else
  log_err "manage.py not found (looked in . and backend/). Run from repo root or backend dir."
  exit 1
fi

# Default apps for per-app dumps (present ones only)
APP_LIST=(userauth enterprise allinventory alltransactions)

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PARENT="${PROJECT_ROOT}/backups"
BACKUP_DIR="${BACKUP_PARENT}/${TIMESTAMP}"
FULL_DUMP_JSON="${BACKUP_DIR}/django_full.json"
ESSENTIAL_DUMP_JSON="${BACKUP_DIR}/django_essential.json"
SQL_DUMP_CUSTOM="${BACKUP_DIR}/postgres.custom.dump"
SQL_DUMP_PLAIN="${BACKUP_DIR}/postgres_plain.sql"
SQLITE_COPY="${BACKUP_DIR}/sqlite_db_copy.db"
SQLITE_SQL="${BACKUP_DIR}/sqlite_dump.sql"
SUMMARY_FILE="${BACKUP_DIR}/backup_summary.txt"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "$BACKUP_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1
log_info "Backup directory: $BACKUP_DIR"

# -------- Helper: ensure pg client ---------
ensure_pg_client() {
  if command -v pg_dump >/dev/null 2>&1; then
    return 0
  fi
  log_warn "pg_dump not found; attempting install (requires apt, yum, or apk)."
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq && apt-get install -y -qq postgresql-client
  elif command -v yum >/dev/null 2>&1; then
    yum install -y postgresql
  elif command -v apk >/dev/null 2>&1; then
    apk add --no-cache postgresql-client
  else
    log_err "Unable to install postgres client automatically."; return 1
  fi
}

# -------- Detect DB engine via Django ---------
read_db_config() {
  python - <<'PY'
import os, json, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','backend.settings')
try:
    django.setup()
except Exception as e:
    print(json.dumps({'error': str(e)}))
    raise
from django.conf import settings
cfg = settings.DATABASES.get('default', {})
print(json.dumps({
  'ENGINE': cfg.get('ENGINE'),
  'NAME': cfg.get('NAME'),
  'USER': cfg.get('USER'),
  'HOST': cfg.get('HOST') or 'localhost',
  'PORT': str(cfg.get('PORT') or ''),
  'PASSWORD': cfg.get('PASSWORD')
}))
PY
}

DB_JSON=$(read_db_config)
DB_ENGINE=$(echo "$DB_JSON" | python -c "import sys, json; print(json.load(sys.stdin).get('ENGINE',''))")
DB_NAME=$(echo "$DB_JSON"   | python -c "import sys, json; print(json.load(sys.stdin).get('NAME',''))")
DB_USER=$(echo "$DB_JSON"   | python -c "import sys, json; print(json.load(sys.stdin).get('USER',''))")
DB_HOST=$(echo "$DB_JSON"   | python -c "import sys, json; print(json.load(sys.stdin).get('HOST',''))")
DB_PORT=$(echo "$DB_JSON"   | python -c "import sys, json; print(json.load(sys.stdin).get('PORT',''))")
DB_PASSWORD=$(echo "$DB_JSON" | python -c "import sys, json; print(json.load(sys.stdin).get('PASSWORD',''))")

log_info "Detected DB engine: $DB_ENGINE"

# -------- Django Dumps ---------
full_dump() {
  log_info "Creating full Django dump..."
  python manage.py dumpdata --indent 2 > "$FULL_DUMP_JSON"
  log_ok "Full dump: $FULL_DUMP_JSON ($(du -h "$FULL_DUMP_JSON" | cut -f1))"
}

essential_dump() {
  log_info "Creating essential Django dump (excluding auth/content/session noise)..."
  python manage.py dumpdata \
    --exclude sessions.session \
    --exclude admin.logentry \
    --exclude contenttypes.contenttype \
    --exclude auth.permission \
    --indent 2 > "$ESSENTIAL_DUMP_JSON"
  log_ok "Essential dump: $ESSENTIAL_DUMP_JSON ($(du -h "$ESSENTIAL_DUMP_JSON" | cut -f1))"
}

per_app_dumps() {
  log_info "Per-app dumps..."
  for app in "${APP_LIST[@]}"; do
    if python manage.py showmigrations "$app" >/dev/null 2>&1; then
      OUT_FILE="$BACKUP_DIR/${app}.json"
      python manage.py dumpdata "$app" --indent 2 > "$OUT_FILE" || {
        log_warn "Failed dump for app $app"; continue; }
      log_ok "App $app: $(du -h "$OUT_FILE" | cut -f1) -> $OUT_FILE"
    else
      log_warn "App $app not present (skipping)"
    fi
  done
}

# -------- Database Dump ---------
pg_dump_db() {
  ensure_pg_client || { log_err "Skipping Postgres dump (client missing)"; return 1; }
  export PGPASSWORD="$DB_PASSWORD"
  log_info "Running pg_dump (custom)..."
  pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "${DB_PORT:-5432}" \
    -Fc -Z9 -f "$SQL_DUMP_CUSTOM" --no-owner --no-privileges
  log_ok "Postgres custom dump: $SQL_DUMP_CUSTOM ($(du -h "$SQL_DUMP_CUSTOM" | cut -f1))"

  log_info "Running pg_dump (plain)..."
  pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "${DB_PORT:-5432}" \
    --inserts -f "$SQL_DUMP_PLAIN" --no-owner --no-privileges
  log_ok "Postgres plain SQL: $SQL_DUMP_PLAIN ($(du -h "$SQL_DUMP_PLAIN" | cut -f1))"
  unset PGPASSWORD
}

sqlite_dump() {
  local src="$DB_NAME"
  if [ -f "$src" ]; then
    cp "$src" "$SQLITE_COPY"
    log_ok "SQLite file copy: $SQLITE_COPY ($(du -h "$SQLITE_COPY" | cut -f1))"
    if command -v sqlite3 >/dev/null 2>&1; then
      sqlite3 "$src" .dump > "$SQLITE_SQL"
      log_ok "SQLite SQL dump: $SQLITE_SQL ($(du -h "$SQLITE_SQL" | cut -f1))"
    else
      log_warn "sqlite3 CLI not present; skipping SQL text dump"
    fi
  else
    log_warn "SQLite database file '$src' not found."
  fi
}

run_db_dump() {
  case "$DB_ENGINE" in
    *postgresql*|*postgres*) pg_dump_db ;;
    *sqlite*) sqlite_dump ;;
    *) log_warn "Unsupported DB engine ($DB_ENGINE). Skipping DB dump." ;;
  esac
}

# -------- Summary ---------
write_summary() {
  {
    echo "AmaKoNana Backup Summary"
    echo "=========================="
    echo "Timestamp: $(date)"
    echo "Directory: $BACKUP_DIR"
    echo "Host: $(hostname)"
    echo "User: $(whoami)"
    echo
    echo "Database: $DB_ENGINE name=$DB_NAME host=$DB_HOST port=$DB_PORT"
    echo
    echo "Files:"
    ls -lh "$BACKUP_DIR" | sed '1d'
    echo
    echo "Total size: $(du -sh "$BACKUP_DIR" | cut -f1)"
  } > "$SUMMARY_FILE"
  log_ok "Summary: $SUMMARY_FILE"
}

# -------- Retention (keep last 10) ---------
retention() {
  if [ -d "$BACKUP_PARENT" ]; then
    local count=$(find "$BACKUP_PARENT" -maxdepth 1 -mindepth 1 -type d | wc -l || echo 0)
    if [ "$count" -gt 10 ]; then
      log_info "Applying retention (keep 10)"
      find "$BACKUP_PARENT" -maxdepth 1 -mindepth 1 -type d | sort | head -n -10 | while read -r old; do
        rm -rf "$old" && log_info "Removed old backup: $(basename "$old")"
      done
    fi
  fi
}

# -------- Permissions ---------
lockdown() {
  chmod -R go-rwx "$BACKUP_DIR" || true
  log_ok "Locked down permissions"
}

# -------- Main ---------
main() {
  log_info "Starting backup at $(date)"
  full_dump
  essential_dump
  per_app_dumps
  run_db_dump
  write_summary
  lockdown
  retention
  log_ok "Backup complete -> $BACKUP_DIR"
}

trap 'log_err "Failure on line $LINENO"' ERR
main "$@"
