# Render 生产环境配置指南

## ⚠️ 重要提醒

- 操作前确保已备份数据
- 建议在低峰期操作
- 每一步操作后验证结果

---

## 步骤 1：数据库迁移（必须）

### 1.1 进入 Render PostgreSQL 控制台

1. 登录 https://dashboard.render.com/
2. 点击你的 **PostgreSQL** 服务
3. 点击 **PSQL Console** 标签
4. 或者点击 **Connect** 查看连接信息，用本地 psql 连接

### 1.2 执行迁移 SQL

```sql
-- 添加幂等性字段到 judgments 表
ALTER TABLE judgments 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64),
  ADD COLUMN IF NOT EXISTS client_ref VARCHAR(255);

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_judgments_idempotency 
  ON judgments(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- 为 delegations 添加幂等性支持
ALTER TABLE delegations 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_delegations_idempotency 
  ON delegations(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- 为 terminations 添加幂等性支持
ALTER TABLE terminations 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_terminations_idempotency 
  ON terminations(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;
```

### 1.3 验证迁移

```sql
-- 检查新字段是否添加成功
\d judgments
\d delegations
\d terminations

-- 应该看到 idempotency_key 字段
```

---

## 步骤 2：配置自动备份

### 2.1 创建 Cron Job

1. 在 Render Dashboard 点击 **New** → **Cron Job**
2. 填写配置：

| 字段 | 值 |
|------|-----|
| **Name** | `hjs-backup` |
| **Schedule** | `0 2 * * *` |
| **Command** | `bash scripts/backup.sh` |

3. **Environment Variables**：
   - 确保已添加 `DATABASE_URL`
   - （可选）`BACKUP_DIR`: `/tmp/hjs-backups`
   - （可选）`RETENTION_DAYS`: `30`

4. 点击 **Create Cron Job**

### 2.2 测试备份

等待 Cron Job 创建完成后：
1. 点击 **Manual Run** 测试一次
2. 查看 Logs 确认成功
3. 检查备份文件是否生成

---

## 步骤 3：重新部署 Web Service

### 3.1 部署最新代码

1. 在 Render Dashboard 找到你的 **Web Service**
2. 点击 **Manual Deploy** → **Deploy latest commit**
3. 等待部署完成（约 2-3 分钟）

### 3.2 验证部署

```bash
# 测试健康检查
curl https://api.hjs.sh/health

# 应该返回
{"status":"healthy","version":"1.0.0",...}

# 测试幂等性（用相同 idempotency_key 发送两次请求）
curl -X POST https://api.hjs.sh/judgments \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "entity": "test@test.com",
    "action": "test",
    "idempotency_key": "test-123"
  }'

# 第二次应该返回相同结果，不重复扣费
```

---

## 步骤 4：配置监控（可选）

### 4.1 健康检查 Cron Job

1. 创建另一个 Cron Job：
   - **Name**: `hjs-health-check`
   - **Schedule**: `*/30 * * * *` （每30分钟）
   - **Command**: `bash scripts/health-check.sh`

2. 添加环境变量：
   - `DATABASE_URL`
   - （可选）`ALERT_WEBHOOK`: 你的 Slack/Discord Webhook

---

## 故障排查

### 问题 1：迁移失败

**错误信息**: `column already exists`

**解决**: 这是正常的，说明字段已存在，可以忽略。

### 问题 2：部署后服务无法启动

**检查步骤**:
1. 查看 Render Logs
2. 检查是否有 `hjs-extension.js` 文件
3. 确认所有依赖已安装

**解决**:
```bash
# 在 Render Shell 中执行
ls -la hjs-extension.js
npm install
```

### 问题 3：备份脚本无权限

**解决**:
```bash
# 在 Render Shell 中
chmod +x scripts/*.sh
```

---

## 验证清单

完成所有步骤后，检查：

- [ ] 数据库迁移成功（字段已添加）
- [ ] 自动备份 Cron Job 运行正常
- [ ] Web Service 重新部署成功
- [ ] `/health` 端点返回正常
- [ ] 幂等性测试通过（重复请求不重复扣费）
- [ ] （可选）健康检查 Cron Job 运行正常

---

## 需要帮助？

如果在任何步骤遇到问题：
1. 截图错误信息
2. 复制相关日志
3. 告诉我具体的错误内容

**不要急于操作，先确认上一步成功再继续。**
