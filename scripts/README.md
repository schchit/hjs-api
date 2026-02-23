# HJS Database Operations

## 自动备份配置

### Render Cron Job 方式（推荐）

1. 在 Render Dashboard 创建一个新的 **Cron Job**
2. 配置如下：
   - **Name**: hjs-backup
   - **Schedule**: `0 2 * * *` (每天凌晨 2 点)
   - **Command**: `bash scripts/backup.sh`
   - **Environment**: 添加 `DATABASE_URL` 环境变量

3. （可选）配置 S3 备份：
   - 添加 `S3_BUCKET` 环境变量
   - 添加 AWS 访问密钥 (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)

### 服务器 Cron 方式

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天凌晨 2 点备份）
0 2 * * * cd /path/to/hjs-api && DATABASE_URL="your-db-url" ./scripts/backup.sh >> /var/log/hjs-backup.log 2>&1
```

## 手动备份

```bash
# 设置环境变量并运行
export DATABASE_URL="your-database-url"
./scripts/backup.sh
```

备份文件将保存在 `/var/backups/hjs/` 目录（可配置）。

## 恢复数据库

```bash
# 从备份恢复（会提示确认）
./scripts/restore.sh /var/backups/hjs/hjs_backup_20260223_020000.sql.gz

# 强制恢复（跳过确认）
./scripts/restore.sh /var/backups/hjs/hjs_backup_20260223_020000.sql.gz --force
```

⚠️ **警告**: 恢复操作会覆盖当前数据库！

## 健康检查

```bash
# 运行健康检查
export DATABASE_URL="your-database-url"
./scripts/health-check.sh
```

可以配置定时运行健康检查：

```bash
# crontab -e
*/30 * * * * cd /path/to/hjs-api && ./scripts/health-check.sh >> /var/log/hjs-health.log 2>&1
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 连接字符串 |
| `BACKUP_DIR` | ❌ | 备份目录，默认 `/var/backups/hjs` |
| `RETENTION_DAYS` | ❌ | 备份保留天数，默认 30 |
| `S3_BUCKET` | ❌ | S3 桶名称（可选） |
| `S3_PREFIX` | ❌ | S3 路径前缀，默认 `hjs-backups` |
| `ALERT_WEBHOOK` | ❌ | 警报 Webhook URL（可选） |
