// HJS v1 API - 多租户版本
// 完整支持账户隔离

const express = require('express');

function createV1Router(pool, authenticateApiKey, limiter, auditLog, generateRecordHash, anchorRecord) {
    const router = express.Router();
    
    // 辅助函数：获取账户ID
    async function getAccountId(apiKey) {
        if (!apiKey) return null;
        
        // 尝试新账户系统
        const result = await pool.query(
            'SELECT account_id FROM account_api_keys WHERE key = $1 AND status = \'active\'',
            [apiKey]
        );
        
        if (result.rows.length > 0) {
            return result.rows[0].account_id;
        }
        
        return null;
    }
    
    // GET /v1/ - API信息
    router.get('/', (req, res) => {
        res.json({
            version: '1.0.0',
            status: 'stable',
            base_url: '/v1',
            endpoints: {
                judgments: '/v1/judgments',
                delegations: '/v1/delegations',
                terminations: '/v1/terminations',
                verifications: '/v1/verifications',
                account: '/v1/account'
            }
        });
    });
    
    // POST /v1/judgments - 记录事件（多租户版）
    router.post('/judgments', limiter, authenticateApiKey, auditLog, async (req, res) => {
        const apiKey = req.headers['x-api-key'];
        const accountId = await getAccountId(apiKey);
        
        const { entity, action, scope, timestamp, immutability, idempotency_key } = req.body;
        
        if (!entity || !action) {
            return res.status(400).json({ error: 'entity and action are required' });
        }
        
        const id = 'jgd_' + Date.now() + Math.random().toString(36).substring(2, 6);
        const eventTime = timestamp || new Date().toISOString();
        const recordedAt = new Date().toISOString();
        const anchorType = immutability?.type || 'none';
        
        try {
            // 插入记录（带account_id）
            await pool.query(
                `INSERT INTO judgments (
                    id, entity, action, scope, timestamp, recorded_at,
                    anchor_type, idempotency_key, account_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [id, entity, action, scope || {}, eventTime, recordedAt, 
                 anchorType, idempotency_key || null, accountId]
            );
            
            res.json({
                id,
                status: 'recorded',
                protocol: 'HJS/1.0',
                timestamp: recordedAt,
                account_id: accountId
            });
        } catch (err) {
            console.error('Error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    
    // GET /v1/judgments/:id - 查询（带账户隔离）
    router.get('/judgments/:id', limiter, authenticateApiKey, async (req, res) => {
        const apiKey = req.headers['x-api-key'];
        const accountId = await getAccountId(apiKey);
        
        try {
            // 查询时添加账户过滤
            let query = 'SELECT * FROM judgments WHERE id = $1';
            let params = [req.params.id];
            
            if (accountId) {
                query += ' AND (account_id = $2 OR account_id IS NULL)';
                params.push(accountId);
            }
            
            const { rows } = await pool.query(query, params);
            
            if (rows.length === 0) {
                return res.status(404).json({ error: 'Judgment not found' });
            }
            
            const record = rows[0];
            
            // 检查所有权（如果记录有account_id）
            if (record.account_id && record.account_id !== accountId) {
                return res.status(403).json({ error: 'Access denied' });
            }
            
            res.json({
                ...record,
                immutability_anchor: {
                    type: record.anchor_type || 'none'
                }
            });
        } catch (err) {
            console.error('Error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    
    // GET /v1/judgments - 列表查询（带账户过滤）
    router.get('/judgments', limiter, authenticateApiKey, async (req, res) => {
        const apiKey = req.headers['x-api-key'];
        const accountId = await getAccountId(apiKey);
        
        const { entity, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        try {
            let whereClause = 'WHERE 1=1';
            let params = [];
            let paramIndex = 1;
            
            // 账户隔离
            if (accountId) {
                whereClause += ` AND (account_id = $${paramIndex} OR account_id IS NULL)`;
                params.push(accountId);
                paramIndex++;
            }
            
            // entity过滤
            if (entity) {
                whereClause += ` AND entity = $${paramIndex}`;
                params.push(entity);
                paramIndex++;
            }
            
            // 查询总数
            const countResult = await pool.query(
                `SELECT COUNT(*) FROM judgments ${whereClause}`,
                params
            );
            const total = parseInt(countResult.rows[0].count);
            
            // 查询数据
            params.push(limit, offset);
            const { rows } = await pool.query(
                `SELECT * FROM judgments ${whereClause} ORDER BY recorded_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                params
            );
            
            res.json({
                page: Number(page),
                limit: Number(limit),
                total,
                data: rows
            });
        } catch (err) {
            console.error('Error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    
    return router;
}

module.exports = { createV1Router };
