// HJS 多租户隔离模块
// 基础设施核心：账户认证和数据隔离

const crypto = require('crypto');

// 生成账户ID
function generateAccountId() {
    return 'acct_' + Date.now() + Math.random().toString(36).substring(2, 6);
}

// 生成API Key
function generateApiKey() {
    return 'sk_live_' + crypto.randomBytes(24).toString('hex');
}

// 生成沙盒API Key
function generateSandboxKey() {
    return 'sk_sandbox_' + crypto.randomBytes(24).toString('hex');
}

// 账户认证中间件
function authenticateAccount(pool) {
    return async (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        
        if (!apiKey) {
            return res.status(401).json({ 
                error: 'API key required',
                code: 'missing_api_key'
            });
        }
        
        try {
            // 查询API Key和关联账户
            const result = await pool.query(
                `SELECT k.*, a.id as account_id, a.name as account_name, a.status as account_status, a.plan
                 FROM account_api_keys k
                 JOIN accounts a ON k.account_id = a.id
                 WHERE k.key = $1 AND k.status = 'active'`,
                [apiKey]
            );
            
            if (result.rows.length === 0) {
                return res.status(401).json({ 
                    error: 'Invalid or revoked API key',
                    code: 'invalid_api_key'
                });
            }
            
            const keyData = result.rows[0];
            
            // 检查账户状态
            if (keyData.account_status !== 'active') {
                return res.status(403).json({
                    error: `Account is ${keyData.account_status}`,
                    code: 'account_' + keyData.account_status
                });
            }
            
            // 检查权限
            const requiredPermission = req.method === 'GET' ? 'read' : 'write';
            if (!keyData.permissions.includes(requiredPermission) && !keyData.permissions.includes('admin')) {
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    code: 'insufficient_permissions',
                    required: requiredPermission
                });
            }
            
            // 更新最后使用时间
            await pool.query(
                'UPDATE account_api_keys SET last_used = NOW() WHERE key = $1',
                [apiKey]
            );
            
            // 将账户信息附加到请求
            req.account = {
                id: keyData.account_id,
                name: keyData.account_name,
                plan: keyData.plan,
                permissions: keyData.permissions
            };
            
            // 判断是否为沙盒环境
            req.isSandbox = apiKey.startsWith('sk_sandbox_');
            
            next();
            
        } catch (err) {
            console.error('Account authentication error:', err);
            res.status(500).json({ error: 'Authentication failed' });
        }
    };
}

// 账户创建函数
async function createAccount(pool, { name, email, plan = 'free' }) {
    const accountId = generateAccountId();
    const apiKey = generateApiKey();
    const sandboxKey = generateSandboxKey();
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 创建账户
        await client.query(
            'INSERT INTO accounts (id, name, email, plan) VALUES ($1, $2, $3, $4)',
            [accountId, name, email, plan]
        );
        
        // 创建生产环境API Key
        await client.query(
            'INSERT INTO account_api_keys (key, account_id, name, permissions) VALUES ($1, $2, $3, $4)',
            [apiKey, accountId, 'Production Key', ['read', 'write']]
        );
        
        // 创建沙盒环境API Key
        await client.query(
            'INSERT INTO account_api_keys (key, account_id, name, permissions) VALUES ($1, $2, $3, $4)',
            [sandboxKey, accountId, 'Sandbox Key', ['read', 'write']]
        );
        
        // 初始化账单
        await client.query(
            'INSERT INTO account_billing (account_id, email, balance) VALUES ($1, $2, 0)',
            [accountId, email]
        );
        
        await client.query('COMMIT');
        
        return {
            account: {
                id: accountId,
                name,
                email,
                plan
            },
            keys: {
                production: apiKey,
                sandbox: sandboxKey
            }
        };
        
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// 记录用量
async function recordUsage(pool, accountId, { judgments = 0, anchors = 0, apiCalls = 0 }) {
    const today = new Date().toISOString().split('T')[0];
    
    await pool.query(
        `INSERT INTO account_usage (account_id, date, judgment_count, anchor_count, api_calls)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (account_id, date)
         DO UPDATE SET 
            judgment_count = account_usage.judgment_count + $3,
            anchor_count = account_usage.anchor_count + $4,
            api_calls = account_usage.api_calls + $5`,
        [accountId, today, judgments, anchors, apiCalls]
    );
}

// 检查账户限额
async function checkQuota(pool, accountId, plan) {
    const today = new Date().toISOString().split('T')[0];
    
    // 获取本月用量
    const result = await pool.query(
        `SELECT 
            SUM(judgment_count) as judgments,
            SUM(anchor_count) as anchors,
            SUM(api_calls) as api_calls
         FROM account_usage
         WHERE account_id = $1 AND date >= DATE_TRUNC('month', CURRENT_DATE)`,
        [accountId]
    );
    
    const usage = result.rows[0];
    
    // 根据计划定义限额
    const quotas = {
        free: { judgments: 1000, anchors: 10, api_calls: 10000 },
        pro: { judgments: 100000, anchors: 1000, api_calls: 1000000 },
        enterprise: { judgments: Infinity, anchors: Infinity, api_calls: Infinity }
    };
    
    const quota = quotas[plan] || quotas.free;
    
    return {
        usage,
        quota,
        exceeded: {
            judgments: usage.judgments >= quota.judgments,
            anchors: usage.anchors >= quota.anchors,
            api_calls: usage.api_calls >= quota.api_calls
        }
    };
}

module.exports = {
    generateAccountId,
    generateApiKey,
    generateSandboxKey,
    authenticateAccount,
    createAccount,
    recordUsage,
    checkQuota
};
