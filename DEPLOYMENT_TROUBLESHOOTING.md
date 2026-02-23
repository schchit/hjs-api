# HJS API 部署故障排除

## 🔴 问题诊断

### 症状
- API返回500错误
- 或无法访问 `/v1/` 端点

### 可能原因

1. **数据库迁移未执行**
   - 新表/字段未创建
   - 旧记录缺少 `account_id`

2. **依赖缺失**
   - 新模块需要额外依赖

3. **环境变量问题**
   - `DATABASE_URL` 未设置

---

## 🔧 快速修复步骤

### 步骤1：检查Render日志

```bash
# 在Render Dashboard中：
# 1. 打开你的 Web Service
# 2. 点击 "Logs" 标签
# 3. 查看最新错误信息
```

### 步骤2：手动执行数据库修复

在Render PostgreSQL控制台执行：

```sql
-- 1. 检查字段是否存在
SELECT column_name 
FROM information_schema.columns 
WHERE table_name='judgments' AND column_name='account_id';

-- 2. 如果不存在，添加字段
ALTER TABLE judgments ADD COLUMN IF NOT EXISTS account_id VARCHAR(50);
ALTER TABLE delegations ADD COLUMN IF NOT EXISTS account_id VARCHAR(50);
ALTER TABLE terminations ADD COLUMN IF NOT EXISTS account_id VARCHAR(50);

-- 3. 为旧记录添加默认account_id
UPDATE judgments SET account_id = 'acct_legacy' WHERE account_id IS NULL;
UPDATE delegations SET account_id = 'acct_legacy' WHERE account_id IS NULL;
UPDATE terminations SET account_id = 'acct_legacy' WHERE account_id IS NULL;

-- 4. 创建accounts表（如果不存在）
CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    plan VARCHAR(20) DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 创建account_api_keys表（如果不存在）
CREATE TABLE IF NOT EXISTS account_api_keys (
    key VARCHAR(64) PRIMARY KEY,
    account_id VARCHAR(50) REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255),
    permissions JSONB DEFAULT '["read", "write"]',
    status VARCHAR(20) DEFAULT 'active',
    last_used TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 步骤3：重新部署

```bash
# 在Render Dashboard：
# Manual Deploy → Deploy latest commit
```

---

## 🧪 验证修复

```bash
# 测试健康检查
curl https://your-api-url/health

# 测试v1端点
curl https://your-api-url/v1/

# 测试旧端点（向后兼容）
curl https://your-api-url/judgments
```

---

## 🔄 如果仍失败：回退方案

### 临时回退到稳定版本

```bash
# 在本地
git log --oneline -10

# 找到上一个稳定版本的commit hash
# 例如：git checkout <stable-commit>

# 强制推送（谨慎！）
git push origin HEAD --force
```

---

## 📋 检查清单

- [ ] 数据库迁移已执行
- [ ] 新表已创建（accounts, account_api_keys）
- [ ] 旧记录已添加默认account_id
- [ ] 重新部署完成
- [ ] /health 端点返回200
- [ ] /v1/ 端点可访问

---

## 🆘 获取帮助

如果以上步骤无法解决问题：

1. 复制Render日志中的错误信息
2. 复制执行SQL的结果
3. 告诉我具体的错误内容
