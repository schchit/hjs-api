#!/bin/bash
# HJS Database Backup Script
# 自动备份 PostgreSQL 数据库到本地和可选的 S3

set -e

# 配置
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hjs}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-hjs-backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="hjs_backup_${DATE}.sql.gz"

# 确保备份目录存在
mkdir -p "$BACKUP_DIR"

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not set"
    exit 1
fi

echo "🔄 Starting backup at $(date)"

# 执行备份
echo "📦 Dumping database..."
pg_dump "$DATABASE_URL" --clean --if-exists --verbose 2>/dev/null | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# 检查备份是否成功
if [ $? -eq 0 ] && [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    FILE_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo "✅ Backup successful: $BACKUP_FILE ($FILE_SIZE)"
    
    # 上传到 S3（如果配置了）
    if [ -n "$S3_BUCKET" ]; then
        if command -v aws &> /dev/null; then
            echo "☁️  Uploading to S3..."
            aws s3 cp "$BACKUP_DIR/$BACKUP_FILE" "s3://$S3_BUCKET/$S3_PREFIX/$BACKUP_FILE" --storage-class STANDARD_IA
            if [ $? -eq 0 ]; then
                echo "✅ S3 upload successful"
            else
                echo "⚠️  S3 upload failed, but local backup is kept"
            fi
        else
            echo "⚠️  AWS CLI not found, skipping S3 upload"
        fi
    fi
else
    echo "❌ Backup failed"
    exit 1
fi

# 清理旧备份
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "hjs_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# 列出当前备份
echo "📊 Current backups:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -5

echo "✅ Backup completed at $(date)"
