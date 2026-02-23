#!/bin/bash
# HJS Database Restore Script
# 从备份文件恢复数据库

set -e

# 用法检查
if [ $# -lt 1 ]; then
    echo "Usage: $0 <backup_file> [--force]"
    echo "  backup_file: Path to the backup .sql.gz file"
    echo "  --force: Skip confirmation prompt"
    exit 1
fi

BACKUP_FILE="$1"
FORCE_RESTORE=false

if [ "$2" == "--force" ]; then
    FORCE_RESTORE=true
fi

# 检查备份文件
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not set"
    exit 1
fi

# 确认恢复
echo "⚠️  WARNING: This will OVERWRITE the current database!"
echo "   Backup file: $BACKUP_FILE"
echo "   Target: $DATABASE_URL"
echo ""

if [ "$FORCE_RESTORE" = false ]; then
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Restore cancelled"
        exit 0
    fi
fi

echo "🔄 Starting restore at $(date)"
echo "📦 Backup file: $BACKUP_FILE"
echo "📊 File size: $(du -h "$BACKUP_FILE" | cut -f1)"

# 执行恢复
echo "🔄 Restoring database..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
else
    psql "$DATABASE_URL" < "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    echo "✅ Restore completed successfully at $(date)"
    echo "🔄 Verifying connection..."
    if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM judgments;" 2>/dev/null; then
        echo "✅ Database is accessible and working"
    fi
else
    echo "❌ Restore failed"
    exit 1
fi
