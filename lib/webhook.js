// HJS Webhook 系统
// 事件推送和订阅管理

const crypto = require('crypto');
const EventEmitter = require('events');

// Webhook 事件类型
const WEBHOOK_EVENTS = {
    // Judgment 事件
    'judgment.created': '新记录创建',
    'judgment.updated': '记录更新',
    'judgment.anchored': '记录完成锚定',
    
    // Delegation 事件
    'delegation.created': '委托创建',
    'delegation.revoked': '委托撤销',
    
    // Termination 事件
    'termination.created': '终止记录创建',
    
    // Verification 事件
    'verification.completed': '验证完成',
    
    // 账户事件
    'account.quota.warning': '额度预警',
    'account.quota.exceeded': '额度超限'
};

// Webhook 签名密钥生成
function generateWebhookSecret() {
    return crypto.randomBytes(32).toString('hex');
}

// 签名验证
function signPayload(payload, secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${JSON.stringify(payload)}`)
        .digest('hex');
    
    return { signature, timestamp };
}

// 验证签名
function verifySignature(payload, signature, timestamp, secret) {
    const expected = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${JSON.stringify(payload)}`)
        .digest('hex');
    
    // 时间戳检查（5分钟内有效）
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
        return false;
    }
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
    );
}

class WebhookManager extends EventEmitter {
    constructor(pool, options = {}) {
        super();
        this.pool = pool;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 5000; // 5秒
        this.timeout = options.timeout || 30000; // 30秒
        
        // 启动重试队列处理
        this.processRetryQueue();
    }
    
    // 创建 webhook 订阅
    async subscribe(accountId, { url, events, description }) {
        // 验证 URL 格式
        if (!this.isValidUrl(url)) {
            throw new Error('Invalid webhook URL');
        }
        
        // 验证事件类型
        for (const event of events) {
            if (!WEBHOOK_EVENTS[event]) {
                throw new Error(`Unknown event type: ${event}`);
            }
        }
        
        const id = 'wh_' + Date.now() + Math.random().toString(36).substring(2, 6);
        const secret = generateWebhookSecret();
        
        await this.pool.query(
            `INSERT INTO account_webhooks (id, account_id, url, events, secret, description)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, accountId, url, JSON.stringify(events), secret, description]
        );
        
        // 发送测试事件
        await this.sendTestEvent(id, url, secret);
        
        return {
            id,
            url,
            events,
            secret,  // 只显示一次
            description,
            created_at: new Date().toISOString()
        };
    }
    
    // 验证 URL
    isValidUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }
    
    // 发送测试事件
    async sendTestEvent(webhookId, url, secret) {
        const payload = {
            event: 'webhook.test',
            data: {
                webhook_id: webhookId,
                message: 'This is a test event'
            }
        };
        
        await this.deliver(webhookId, url, secret, payload);
    }
    
    // 触发事件
    async trigger(event, data) {
        // 查找订阅了此事件的 webhook
        const result = await this.pool.query(
            `SELECT * FROM account_webhooks 
             WHERE status = 'active' AND events::jsonb ? $1`,
            [event]
        );
        
        for (const webhook of result.rows) {
            const payload = {
                event,
                timestamp: new Date().toISOString(),
                data
            };
            
            // 异步投递，不阻塞主流程
            this.deliver(webhook.id, webhook.url, webhook.secret, payload)
                .catch(err => console.error(`Webhook delivery failed: ${webhook.id}`, err));
        }
    }
    
    // 投递 webhook
    async deliver(webhookId, url, secret, payload, attempt = 1) {
        const { signature, timestamp } = signPayload(payload, secret);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            // 使用 fetch 发送（Node 18+）
            const fetch = globalThis.fetch || require('node-fetch');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Timestamp': timestamp.toString(),
                    'X-Webhook-ID': webhookId,
                    'User-Agent': 'HJS-Webhook/1.0'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            
            // 记录投递结果
            await this.logDelivery(webhookId, payload.event, response.status, attempt);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return { success: true, status: response.status };
            
        } catch (err) {
            clearTimeout(timeout);
            
            // 记录失败
            await this.logDelivery(webhookId, payload.event, 0, attempt, err.message);
            
            // 重试
            if (attempt < this.retryAttempts) {
                setTimeout(() => {
                    this.deliver(webhookId, url, secret, payload, attempt + 1)
                        .catch(() => {}); // 忽略重试错误
                }, this.retryDelay * attempt); // 指数退避
            } else {
                // 最终失败，禁用 webhook
                await this.disableWebhook(webhookId, 'Delivery failed after retries');
            }
            
            throw err;
        }
    }
    
    // 记录投递日志
    async logDelivery(webhookId, event, status, attempt, error = null) {
        await this.pool.query(
            `INSERT INTO webhook_deliveries (webhook_id, event, status, attempt, error)
             VALUES ($1, $2, $3, $4, $5)`,
            [webhookId, event, status, attempt, error]
        );
    }
    
    // 禁用 webhook
    async disableWebhook(webhookId, reason) {
        await this.pool.query(
            `UPDATE account_webhooks SET status = 'disabled', error_message = $1 WHERE id = $2`,
            [reason, webhookId]
        );
    }
    
    // 删除 webhook
    async unsubscribe(accountId, webhookId) {
        const result = await this.pool.query(
            `DELETE FROM account_webhooks WHERE id = $1 AND account_id = $2 RETURNING id`,
            [webhookId, accountId]
        );
        
        if (result.rowCount === 0) {
            throw new Error('Webhook not found');
        }
        
        return { deleted: true };
    }
    
    // 列出 webhooks
    async list(accountId) {
        const result = await this.pool.query(
            `SELECT id, url, events, status, description, created_at
             FROM account_webhooks
             WHERE account_id = $1
             ORDER BY created_at DESC`,
            [accountId]
        );
        
        return result.rows.map(row => ({
            ...row,
            events: JSON.parse(row.events)
        }));
    }
    
    // 获取投递历史
    async getDeliveryHistory(webhookId, limit = 50) {
        const result = await this.pool.query(
            `SELECT event, status, attempt, error, created_at
             FROM webhook_deliveries
             WHERE webhook_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [webhookId, limit]
        );
        
        return result.rows;
    }
    
    // 处理重试队列（定期清理旧记录）
    processRetryQueue() {
        setInterval(async () => {
            // 清理7天前的投递记录
            await this.pool.query(
                `DELETE FROM webhook_deliveries WHERE created_at < NOW() - INTERVAL '7 days'`
            );
        }, 60 * 60 * 1000); // 每小时
    }
}

module.exports = {
    WebhookManager,
    WEBHOOK_EVENTS,
    signPayload,
    verifySignature
};
