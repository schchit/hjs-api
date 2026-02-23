-- migrations/004_add_idempotency.sql
-- 添加幂等性控制字段

-- 为 judgments 表添加幂等键
ALTER TABLE judgments 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64),
  ADD COLUMN IF NOT EXISTS client_ref VARCHAR(255);

-- 创建唯一索引防止重复
CREATE UNIQUE INDEX IF NOT EXISTS idx_judgments_idempotency 
  ON judgments(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- 为 delegations, terminations 也添加幂等支持
ALTER TABLE delegations 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_delegations_idempotency 
  ON delegations(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE terminations 
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_terminations_idempotency 
  ON terminations(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;
