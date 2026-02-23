// HJS 租户隔离中间件
// 为所有请求注入账户ID并验证权限

const { getAccountIdFromRequest } = require('./tenant-compat');

// 注入账户ID到请求
function injectAccountId(pool) {
    return async (req, res, next) => {
        try {
            const accountId = await getAccountIdFromRequest(pool, req);
            req.accountId = accountId;
            
            // 如果有账户ID，记录用量
            if (accountId && req.method !== 'GET') {
                // 异步记录，不阻塞请求
                const { recordUsage } = require('./tenant');
                recordUsage(pool, accountId, { apiCalls: 1 }).catch(() => {});
            }
            
            next();
        } catch (err) {
            console.error('Inject account ID error:', err);
            next(); // 继续处理，让后续认证处理错误
        }
    };
}

// 验证记录所有权
function requireOwnership(pool, tableName) {
    return async (req, res, next) => {
        const recordId = req.params.id;
        const accountId = req.accountId;
        
        // 如果没有账户ID，允许访问（向后兼容旧系统）
        if (!accountId) {
            return next();
        }
        
        try {
            const result = await pool.query(
                `SELECT account_id FROM ${tableName} WHERE id = $1`,
                [recordId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Record not found' });
            }
            
            const recordAccountId = result.rows[0].account_id;
            
            // 如果记录没有account_id（旧数据），允许访问
            if (!recordAccountId) {
                return next();
            }
            
            // 验证所有权
            if (recordAccountId !== accountId) {
                return res.status(403).json({ 
                    error: 'Access denied',
                    code: 'not_owner'
                });
            }
            
            next();
        } catch (err) {
            console.error('Ownership check error:', err);
            res.status(500).json({ error: 'Authorization check failed' });
        }
    };
}

// 构建带账户过滤的SQL
function withAccountFilter(baseQuery, accountId, params = []) {
    if (!accountId) {
        return { query: baseQuery, params };
    }
    
    // 在WHERE子句中添加account_id过滤
    let query = baseQuery;
    if (query.includes('WHERE')) {
        query = query.replace('WHERE', 'WHERE account_id = $1 AND');
    } else if (query.includes('ORDER BY')) {
        query = query.replace('ORDER BY', 'WHERE account_id = $1 ORDER BY');
    } else {
        query += ' WHERE account_id = $1';
    }
    
    return { query, params: [accountId, ...params] };
}

module.exports = {
    injectAccountId,
    requireOwnership,
    withAccountFilter
};
