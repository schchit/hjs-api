-- migrations/init.sql
-- Initial database schema

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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_judgments_entity ON judgments(entity);
CREATE INDEX IF NOT EXISTS idx_judgments_recorded_at ON judgments(recorded_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);