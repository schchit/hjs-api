-- migrations/006_add_webhooks.sql
-- 添加 webhook 支持

-- webhook投递记录表
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id SERIAL PRIMARY KEY,
    webhook_id VARCHAR(50) NOT NULL,
    event VARCHAR(100) NOT NULL,
    status INTEGER,  -- HTTP状态码，0表示失败
    attempt INTEGER DEFAULT 1,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- 增强 account_webhooks 表（如果已创建）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='account_webhooks' AND column_name='error_message') THEN
        ALTER TABLE account_webhooks ADD COLUMN error_message TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='account_webhooks' AND column_name='last_triggered_at') THEN
        ALTER TABLE account_webhooks ADD COLUMN last_triggered_at TIMESTAMPTZ;
    END IF;
END $$;
