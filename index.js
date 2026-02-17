const { Pool } = require('pg');
const express = require('express');
const { generateRecordHash } = require('./lib/canonical');
const { submitToOTS } = require('./lib/ots-utils');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(express.json());

// POST /judgments - 记录判断
app.post('/judgments', async (req, res) => {
  const { entity, action, scope, timestamp } = req.body;

  if (!entity || !action) {
    return res.status(400).json({ error: 'entity and action are required' });
  }

  const id = 'jgd_' + Date.now() + Math.random().toString(36).substring(2, 6);
  const judgmentTime = timestamp || new Date().toISOString();
  const recordedAt = new Date().toISOString();

  try {
    // 1. 保存到数据库
    const query = `
      INSERT INTO judgments (id, entity, action, scope, timestamp, recorded_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await pool.query(query, [id, entity, action, scope || {}, judgmentTime, recordedAt]);

    // 2. 构造完整的记录对象（用于生成哈希）
    const record = {
      id,
      entity,
      action,
      scope: scope || {},
      timestamp: judgmentTime,
      recorded_at: recordedAt
    };

    // 3. 生成哈希并异步提交 OTS
    const hash = generateRecordHash(record);
    
    (async () => {
      try {
        const proof = await submitToOTS(hash);
        await pool.query('UPDATE judgments SET ots_proof = $1 WHERE id = $2', [proof, id]);
      } catch (err) {
        console.error(`OTS submission failed for record ${id}:`, err);
      }
    })();

    // 4. 返回成功响应
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

// GET /judgments/:id - 查询记录
app.get('/judgments/:id', async (req, res) => {
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

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 HJS API running at http://localhost:${port}`);
});
// 启动定时任务（只在生产环境运行）
if (process.env.NODE_ENV === 'production') {
  require('./cron/upgrade-proofs');
} else {
  console.log('⏰ OTS upgrade task skipped in development mode');
}