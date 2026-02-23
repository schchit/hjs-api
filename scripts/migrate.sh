#!/bin/bash
# HJS 数据库自动迁移脚本
# 一键完成所有数据库迁移
# 用法: curl -s URL | bash

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 HJS Database Migration Tool"
echo "=============================="
echo ""

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL not set${NC}"
    echo "Please set your database URL:"
    echo "  export DATABASE_URL='postgresql://user:pass@host:port/db'"
    exit 1
fi

echo "📡 Connecting to database..."

# 检查数据库连接
if ! psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Cannot connect to database${NC}"
    echo "Please check your DATABASE_URL"
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"
echo ""

# 检查 migrations 表是否存在，不存在则创建
psql "$DATABASE_URL" << 'EOF'
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW()
);
EOF

# 检查是否已迁移的函数
check_migration() {
    local version=$1
    local result=$(psql "$DATABASE_URL" -t -c "SELECT 1 FROM schema_migrations WHERE version = '$version'" 2>/dev/null | xargs)
    if [ "$result" = "1" ]; then
        return 0  # 已迁移
    else
        return 1  # 未迁移
    fi
}

# 记录迁移的函数
record_migration() {
    local version=$1
    psql "$DATABASE_URL" -c "INSERT INTO schema_migrations (version) VALUES ('$version') ON CONFLICT DO NOTHING" > /dev/null 2>&1
}

# 迁移计数
MIGRATIONS_APPLIED=0
MIGRATIONS_SKIPPED=0

# ========== 迁移 1: 初始表结构 ==========
echo "📝 Migration 001: Initial schema"
if check_migration "001_initial"; then
    echo -e "${YELLOW}  ⏭️  Already applied, skipping${NC}"
    ((MIGRATIONS_SKIPPED++))
else
    psql "$DATABASE_URL" << 'EOF'
-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  key VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ
);

-- Judgments table
CREATE TABLE IF NOT EXISTS judgments (
  id VARCHAR(50) PRIMARY KEY,
  entity VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  scope JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  anchor_type VARCHAR(50) DEFAULT 'none',
  anchor_reference TEXT,
  anchor_processed_at TIMESTAMPTZ,
  anchor_proof BYTEA
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  api_key VARCHAR(64),
  action VARCHAR(50),
  resource_id VARCHAR(50),
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_judgments_entity ON judgments(entity);
CREATE INDEX IF NOT EXISTS idx_judgments_recorded_at ON judgments(recorded_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
EOF
    
    if [ $? -eq 0 ]; then
        record_migration "001_initial"
        echo -e "${GREEN}  ✅ Applied successfully${NC}"
        ((MIGRATIONS_APPLIED++))
    else
        echo -e "${RED}  ❌ Failed${NC}"
        exit 1
    fi
fi

# ========== 迁移 2: 添加锚定字段 ==========
echo "📝 Migration 002: Add anchor fields"
if check_migration "002_anchor_fields"; then
    echo -e "${YELLOW}  ⏭️  Already applied, skipping${NC}"
    ((MIGRATIONS_SKIPPED++))
else
    psql "$DATABASE_URL" << 'EOF'
-- 添加新字段
ALTER TABLE judgments 
  ADD COLUMN IF NOT EXISTS anchor_type VARCHAR(50) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS anchor_reference TEXT,
  ADD COLUMN IF NOT EXISTS anchor_processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anchor_proof BYTEA;
EOF
    
    if [ $? -eq 0 ]; then
        record_migration "002_anchor_fields"
        echo -e "${GREEN}  ✅ Applied successfully${NC}"
        ((MIGRATIONS_APPLIED++))
    else
        echo -e "${RED}  ❌ Failed${NC}"
        exit 1
    fi
fi

# ========== 迁移 3: 添加幂等性字段 ==========
echo "📝 Migration 003: Add idempotency support"
if check_migration "003_idempotency"; then
    echo -e "${YELLOW}  ⏭️  Already applied, skipping${NC}"
    ((MIGRATIONS_SKIPPED++))
else
    psql "$DATABASE_URL" << 'EOF'
-- 为 judgments 表添加幂等键
ALTER TABLE judgments 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64),
  ADD COLUMN IF NOT EXISTS client_ref VARCHAR(255);

-- 创建唯一索引防止重复
CREATE UNIQUE INDEX IF NOT EXISTS idx_judgments_idempotency 
  ON judgments(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- 为 delegations 表添加幂等支持
CREATE TABLE IF NOT EXISTS delegations (
  id VARCHAR(50) PRIMARY KEY,
  delegator VARCHAR(255) NOT NULL,
  delegatee VARCHAR(255) NOT NULL,
  judgment_id VARCHAR(50) REFERENCES judgments(id),
  scope JSONB DEFAULT '{}',
  expiry TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP,
  anchor_type VARCHAR(20) DEFAULT 'none',
  anchor_reference TEXT,
  anchor_proof BYTEA,
  anchor_processed_at TIMESTAMP,
  idempotency_key VARCHAR(64)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_delegations_idempotency 
  ON delegations(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delegations_delegator ON delegations(delegator);
CREATE INDEX IF NOT EXISTS idx_delegations_delegatee ON delegations(delegatee);
CREATE INDEX IF NOT EXISTS idx_delegations_judgment ON delegations(judgment_id);
CREATE INDEX IF NOT EXISTS idx_delegations_status ON delegations(status);

-- 为 terminations 表添加幂等支持
CREATE TABLE IF NOT EXISTS terminations (
  id VARCHAR(50) PRIMARY KEY,
  terminator VARCHAR(255) NOT NULL,
  target_id VARCHAR(50) NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('judgment', 'delegation')),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  anchor_type VARCHAR(20) DEFAULT 'none',
  anchor_reference TEXT,
  anchor_proof BYTEA,
  anchor_processed_at TIMESTAMP,
  idempotency_key VARCHAR(64)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_terminations_idempotency 
  ON terminations(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_terminations_terminator ON terminations(terminator);
CREATE INDEX IF NOT EXISTS idx_terminations_target ON terminations(target_id);
CREATE INDEX IF NOT EXISTS idx_terminations_type ON terminations(target_type);

-- 创建 verifications 表
CREATE TABLE IF NOT EXISTS verifications (
  id VARCHAR(50) PRIMARY KEY,
  verifier VARCHAR(255) NOT NULL,
  target_id VARCHAR(50) NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('judgment', 'delegation', 'termination')),
  result VARCHAR(20) NOT NULL CHECK (result IN ('VALID', 'INVALID', 'PENDING')),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verifications_target ON verifications(target_id);
CREATE INDEX IF NOT EXISTS idx_verifications_verifier ON verifications(verifier);
EOF
    
    if [ $? -eq 0 ]; then
        record_migration "003_idempotency"
        echo -e "${GREEN}  ✅ Applied successfully${NC}"
        ((MIGRATIONS_APPLIED++))
    else
        echo -e "${RED}  ❌ Failed${NC}"
        exit 1
    fi
fi

# ========== 迁移 4: 添加用户和交易表 ==========
echo "📝 Migration 004: Add users and transactions"
if check_migration "004_users_transactions"; then
    echo -e "${YELLOW}  ⏭️  Already applied, skipping${NC}"
    ((MIGRATIONS_SKIPPED++))
else
    psql "$DATABASE_URL" << 'EOF'
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  email VARCHAR(255) PRIMARY KEY,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 交易记录表
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  reference_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_email ON transactions(email);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- 每日用量统计
CREATE TABLE IF NOT EXISTS daily_usage (
  email VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  anchor_count INTEGER DEFAULT 0,
  PRIMARY KEY (email, date)
);
EOF
    
    if [ $? -eq 0 ]; then
        record_migration "004_users_transactions"
        echo -e "${GREEN}  ✅ Applied successfully${NC}"
        ((MIGRATIONS_APPLIED++))
    else
        echo -e "${RED}  ❌ Failed${NC}"
        exit 1
    fi
fi

# 总结
echo ""
echo "=============================="
echo -e "${GREEN}✅ Migration completed${NC}"
echo ""
echo "Applied: $MIGRATIONS_APPLIED"
echo "Skipped: $MIGRATIONS_SKIPPED"
echo ""

# 显示数据库状态
echo "📊 Database status:"
psql "$DATABASE_URL" << 'EOF'
SELECT 
    'judgments' as table_name, COUNT(*) as count FROM judgments
UNION ALL
SELECT 'delegations', COUNT(*) FROM delegations
UNION ALL
SELECT 'terminations', COUNT(*) FROM terminations
UNION ALL
SELECT 'api_keys', COUNT(*) FROM api_keys
UNION ALL
SELECT 'users', COUNT(*) FROM users;
EOF

echo ""
echo -e "${GREEN}🎉 Your database is ready!${NC}"
