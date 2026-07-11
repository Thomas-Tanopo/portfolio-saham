#!/bin/bash
set -e

# =============================================
# Backup Script: PostgreSQL + Uploads -> Google Drive
# Schedule: Daily at 02:00 via cron
# =============================================

# --- Configuration ---
DB_NAME="portfolio_saham"
DB_USER="postgres"
COMPOSE_DIR="/root/app"                    # dir tempat docker-compose.yml berada
UPLOADS_DIR="${COMPOSE_DIR}/backend/uploads"
RCLONE_REMOTE="gdrive"
RCLONE_DEST="Backup-App"
LOG_FILE="/var/log/backup-to-gdrive.log"
TEMP_DIR="/tmp/backup-$$"

# --- Detect DB container ---
DB_CONTAINER=$(docker ps --filter name=db --format "{{.Names}}" | head -1)
if [ -z "$DB_CONTAINER" ]; then
  echo "[ERROR] No PostgreSQL container found" | tee -a "$LOG_FILE"
  exit 1
fi

# --- Prepare temp directory ---
mkdir -p "$TEMP_DIR"
trap "rm -rf $TEMP_DIR" EXIT

# --- Dump database ---
echo "[$(date)] Dumping database $DB_NAME from container $DB_CONTAINER ..." | tee -a "$LOG_FILE"
docker exec "$DB_CONTAINER" pg_dump -Fc -U "$DB_USER" "$DB_NAME" -f "$TEMP_DIR/database.dump" 2>>"$LOG_FILE"

# --- Copy uploads ---
if [ -d "$UPLOADS_DIR" ]; then
  echo "[$(date)] Copying uploads from $UPLOADS_DIR ..." | tee -a "$LOG_FILE"
  cp -r "$UPLOADS_DIR" "$TEMP_DIR/uploads"
else
  echo "[WARN] Uploads directory $UPLOADS_DIR not found" | tee -a "$LOG_FILE"
fi

# --- Compress ---
echo "[$(date)] Creating archive ..." | tee -a "$LOG_FILE"
tar -czf "$TEMP_DIR/backup.tar.gz" -C "$TEMP_DIR" database.dump uploads 2>/dev/null

# --- Upload to Google Drive via rclone (overwrite) ---
echo "[$(date)] Uploading to Google Drive ($RCLONE_REMOTE:$RCLONE_DEST) ..." | tee -a "$LOG_FILE"
rclone copy "$TEMP_DIR/backup.tar.gz" "$RCLONE_REMOTE:$RCLONE_DEST/" \
  --progress --log-file="$LOG_FILE" 2>>"$LOG_FILE"

# --- Cleanup ---
rm -f "$TEMP_DIR/backup.tar.gz"
echo "[$(date)] Backup completed successfully" | tee -a "$LOG_FILE"
