#!/bin/bash
# HJS Health & Backup Monitor
# 检查数据库健康和备份状态

set -e

# 配置
DATABASE_URL="${DATABASE_URL}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hjs}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

echo "🔍 Health Check at $(date)"
echo "================================"

# 1. 检查数据库连接
echo "📡 Checking database connection..."
if psql "$DATABASE_URL" -c "SELECT NOW()" > /dev/null 2>&1; then
    echo "✅ Database connection: OK"
else
    echo "❌ Database connection: FAILED"
    send_alert "HJS Database Connection Failed"
    exit 1
fi

# 2. 检查表大小
echo "📊 Table sizes:"
psql "$DATABASE_URL" -c "
SELECT 
    schemaname,
    relname as table_name,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size,
    n_live_tup as row_count
FROM pg_stat_user_tables 
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 5;
" 2>/dev/null || echo "⚠️  Could not get table sizes"

# 3. 检查最近备份
echo "💾 Checking recent backups..."
if [ -d "$BACKUP_DIR" ]; then
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/hjs_backup_*.sql.gz 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP" 2>/dev/null || stat -f %m "$LATEST_BACKUP")) / 86400 ))
        BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
        echo "✅ Latest backup: $(basename $LATEST_BACKUP) ($BACKUP_SIZE, ${BACKUP_AGE} days ago)"
        
        if [ $BACKUP_AGE -gt 1 ]; then
            echo "⚠️  WARNING: Backup is older than 1 day!"
            send_alert "HJS Backup is ${BACKUP_AGE} days old"
        fi
    else
        echo "❌ No backups found!"
        send_alert "HJS No Database Backups Found"
    fi
else
    echo "❌ Backup directory not found: $BACKUP_DIR"
fi

# 4. 检查 API 可用性
echo "🌐 Checking API health..."
if command -v curl &> /dev/null; then
    if curl -sf "https://api.hjs.sh/health" > /dev/null 2>&1; then
        echo "✅ API health: OK"
    else
        echo "⚠️  API health check failed"
        send_alert "HJS API Health Check Failed"
    fi
fi

echo "================================"
echo "✅ Health check completed at $(date)"

# 发送警报函数
function send_alert() {
    local message="$1"
    echo "🚨 ALERT: $message"
    
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -s -X POST "$ALERT_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"🚨 HJS Alert: $message\"}" \
            > /dev/null 2>&1 || echo "⚠️  Failed to send alert"
    fi
}
