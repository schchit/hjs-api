const { Pool } = require('pg');
const express = require('express');
const { generateRecordHash } = require('./lib/canonical');
const { submitToOTS } = require('./lib/ots-utils');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(express.json());

// ==================== 中间件定义 ====================

// 1. 速率限制中间件
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个 IP 最多 100 次请求
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please slow down' });
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: '请求过于频繁，请稍后再试'
});

// 2. API Key 认证中间件
const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT user_id FROM api_keys WHERE key = $1',
      [apiKey]
    );
    if (rows.length === 0) {
      return res.status(403).json({ error: 'Invalid API key' });
    }
    req.userId = rows[0].user_id;
    req.apiKey = apiKey;
    
    // 异步更新最后使用时间
    pool.query('UPDATE api_keys SET last_used = NOW() WHERE key = $1', [apiKey])
      .catch(err => console.error('Failed to update last_used:', err));
    
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// 3. 审计日志中间件
const auditLog = async (req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    // 只记录成功的 POST 和 GET 请求
    if ((req.method === 'POST' && req.path === '/judgments') ||
        (req.method === 'GET' && (req.path === '/judgments' || req.path.startsWith('/judgments/')))) {
      
      const resourceId = req.method === 'POST' ? data?.id : (req.params.id || 'list');
      
      setImmediate(async () => {
        try {
          await pool.query(
            `INSERT INTO audit_logs (user_id, api_key, action, resource_id, ip, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.userId, req.apiKey, req.method + ' ' + req.path, resourceId,
             req.ip, req.headers['user-agent']]
          );
        } catch (err) {
          console.error('Audit log failed:', err);
        }
      });
    }
    originalJson.call(this, data);
  };
  next();
};

// ==================== 路由 ====================

// POST /judgments - 记录判断
app.post('/judgments', limiter, authenticateApiKey, auditLog, async (req, res) => {
  const { entity, action, scope, timestamp } = req.body;

  if (!entity || !action) {
    return res.status(400).json({ error: 'entity and action are required' });
  }

  const id = 'jgd_' + Date.now() + Math.random().toString(36).substring(2, 6);
  const judgmentTime = timestamp || new Date().toISOString();
  const recordedAt = new Date().toISOString();

  try {
    const query = `
      INSERT INTO judgments (id, entity, action, scope, timestamp, recorded_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await pool.query(query, [id, entity, action, scope || {}, judgmentTime, recordedAt]);

    const record = {
      id,
      entity,
      action,
      scope: scope || {},
      timestamp: judgmentTime,
      recorded_at: recordedAt
    };

    const hash = generateRecordHash(record);
    
    (async () => {
      try {
        const proof = await submitToOTS(hash);
        await pool.query('UPDATE judgments SET ots_proof = $1 WHERE id = $2', [proof, id]);
      } catch (err) {
        console.error(`OTS submission failed for record ${id}:`, err);
      }
    })();

    res.json({
      id,
      status: 'recorded',
      timestamp: recordedAt
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /judgments/:id - 查询单条记录
app.get('/judgments/:id', limiter, authenticateApiKey, auditLog, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM judgments WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Judgment not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== ✨ 新增：GET /judgments - 按条件查询 ==========
app.get('/judgments', limiter, authenticateApiKey, auditLog, async (req, res) => {
  const { entity, from, to, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM judgments WHERE 1=1';
  const params = [];
  let paramIdx = 1;
  
  if (entity) {
    query += ` AND entity = $${paramIdx++}`;
    params.push(entity);
  }
  if (from) {
    query += ` AND recorded_at >= $${paramIdx++}`;
    params.push(from);
  }
  if (to) {
    query += ` AND recorded_at <= $${paramIdx++}`;
    params.push(to);
  }
  
  // 先查询总数
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);
  
  // 再查询数据
  query += ` ORDER BY recorded_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(limit, offset);
  const { rows } = await pool.query(query, params);
  
  res.json({
    page: Number(page),
    limit: Number(limit),
    total,
    data: rows
  });
});
// ==================================================

// ==================== 启动服务 ====================

app.listen(port, () => {
  console.log(`🚀 HJS API running at http://localhost:${port}`);
});

// 启动定时任务（只在生产环境运行）
if (process.env.NODE_ENV === 'production') {
  require('./cron/upgrade-proofs');
} else {
  console.log('⏰ OTS upgrade task skipped in development mode');
}