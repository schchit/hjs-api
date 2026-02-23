// 自动数据库迁移模块
// 应用启动时自动检查和创建缺失的表/字段

const AUTO_MIGRATE_SQL = `
-- 检查并创建 schema_migrations 表
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW()
);

-- 迁移 001: 添加幂等性字段到 judgments（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='judgments' AND column_name='idempotency_key') THEN
        ALTER TABLE judgments ADD COLUMN idempotency_key VARCHAR(64);
        CREATE UNIQUE INDEX idx_judgments_idempotency ON judgments(idempotency_key) WHERE idempotency_key IS NOT NULL;
        INSERT INTO schema_migrations (version) VALUES ('001_judgments_idempotency') ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 迁移 002: 创建 delegations 表（如果不存在）
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_delegations_idempotency ON delegations(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_delegations_delegator ON delegations(delegator);
CREATE INDEX IF NOT EXISTS idx_delegations_delegatee ON delegations(delegatee);

-- 迁移 003: 创建 terminations 表（如果不存在）
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_terminations_idempotency ON terminations(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 迁移 004: 创建 verifications 表（如果不存在）
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

-- 迁移 005: 创建 users 和 transactions 表（如果不存在）
CREATE TABLE IF NOT EXISTS users (
  email VARCHAR(255) PRIMARY KEY,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 迁移 006: 创建 daily_usage 表（如果不存在）
CREATE TABLE IF NOT EXISTS daily_usage (
  email VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  anchor_count INTEGER DEFAULT 0,
  PRIMARY KEY (email, date)
);
`;

async function autoMigrate(pool) {
    console.log('🔍 Checking database schema...');
    
    try {
        const client = await pool.connect();
        try {
            await client.query(AUTO_MIGRATE_SQL);
            console.log('✅ Database schema is up to date');
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('⚠️  Auto-migration warning:', err.message);
        console.log('Continuing anyway...');
    }
}

module.exports = { autoMigrate };
