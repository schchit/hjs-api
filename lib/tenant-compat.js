// HJS 多租户快速适配层
// 兼容旧API的同时支持新账户系统

// 获取账户ID（兼容旧key和新account系统）
async function getAccountIdFromRequest(pool, req) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return null;
    
    // 首先尝试新账户系统
    const accountResult = await pool.query(
        `SELECT account_id FROM account_api_keys WHERE key = $1 AND status = 'active'`,
        [apiKey]
    );
    
    if (accountResult.rows.length > 0) {
        return accountResult.rows[0].account_id;
    }
    
    // 回退到旧系统：从api_keys表获取user_id作为account_id
    const oldKeyResult = await pool.query(
        `SELECT user_id FROM api_keys WHERE key = $1`,
        [apiKey]
    );
    
    if (oldKeyResult.rows.length > 0) {
        // 旧系统的key，尝试找到或创建对应的账户
        const email = oldKeyResult.rows[0].user_id;
        
        // 检查是否已有对应账户
        const existingAccount = await pool.query(
            'SELECT id FROM accounts WHERE email = $1',
            [email]
        );
        
        if (existingAccount.rows.length > 0) {
            return existingAccount.rows[0].id;
        }
        
        // 自动迁移：为旧用户创建账户
        const { createAccount } = require('./tenant');
        try {
            const newAccount = await createAccount(pool, {
                name: email,
                email: email,
                plan: 'free'
            });
            return newAccount.account.id;
        } catch (err) {
            console.error('Auto-migration failed for old key:', err);
            return null;
        }
    }
    
    return null;
}

// 构建带账户过滤的查询
function buildTenantQuery(baseQuery, accountId, params = []) {
    if (accountId) {
        // 新系统：只查询该账户的数据
        return {
            query: baseQuery.replace('WHERE', 'WHERE account_id = $1 AND').replace('ORDER', 'AND account_id = $1 ORDER'),
            params: [accountId, ...params]
        };
    }
    // 旧系统或公开查询：不加过滤（保持向后兼容）
    return { query: baseQuery, params };
}

module.exports = {
    getAccountIdFromRequest,
    buildTenantQuery
};
