-- migrations/005_add_tenant_isolation.sql
-- 添加多租户隔离支持

-- 账户表（租户）
CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(50) PRIMARY KEY,  -- acct_xxx
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',  -- active, suspended, deleted
    plan VARCHAR(20) DEFAULT 'free',  -- free, pro, enterprise
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 账户API密钥（替代现有的api_keys表）
CREATE TABLE IF NOT EXISTS account_api_keys (
    key VARCHAR(64) PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255),
    permissions JSONB DEFAULT '["read", "write"]',  -- ["read", "write", "admin"]
    status VARCHAR(20) DEFAULT 'active',  -- active, revoked
    last_used TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为judgments添加账户ID
ALTER TABLE judgments 
    ADD COLUMN IF NOT EXISTS account_id VARCHAR(50) REFERENCES accounts(id);

CREATE INDEX IF NOT EXISTS idx_judgments_account_id ON judgments(account_id);

-- 为delegations添加账户ID
ALTER TABLE delegations 
    ADD COLUMN IF NOT EXISTS account_id VARCHAR(50) REFERENCES accounts(id);

CREATE INDEX IF NOT EXISTS idx_delegations_account_id ON delegations(account_id);

-- 为terminations添加账户ID
ALTER TABLE terminations 
    ADD COLUMN IF NOT EXISTS account_id VARCHAR(50) REFERENCES accounts(id);

CREATE INDEX IF NOT EXISTS idx_terminations_account_id ON terminations(account_id);

-- 为verifications添加账户ID
ALTER TABLE verifications 
    ADD COLUMN IF NOT EXISTS account_id VARCHAR(50) REFERENCES accounts(id);

CREATE INDEX IF NOT EXISTS idx_verifications_account_id ON verifications(account_id);

-- 账户用量统计（替代daily_usage）
CREATE TABLE IF NOT EXISTS account_usage (
    account_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    judgment_count INTEGER DEFAULT 0,
    anchor_count INTEGER DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    storage_bytes BIGINT DEFAULT 0,
    PRIMARY KEY (account_id, date)
);

-- 账户余额和交易记录已存在，添加账户ID关联
ALTER TABLE users RENAME TO account_billing;
ALTER TABLE account_billing ADD COLUMN IF NOT EXISTS account_id VARCHAR(50) REFERENCES accounts(id);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_id VARCHAR(50) REFERENCES accounts(id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);

-- Webhook配置表
CREATE TABLE IF NOT EXISTS account_webhooks (
    id VARCHAR(50) PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events JSONB NOT NULL,  -- ["judgment.created", "anchor.completed"]
    secret VARCHAR(64),  -- 用于签名验证
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 审计日志增强（添加账户ID）
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS account_id VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_audit_logs_account_id ON audit_logs(account_id);

-- 创建触发器：自动更新updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at 
    BEFORE UPDATE ON accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
