const { Pool } = require('pg');
const express = require('express');
const { generateRecordHash } = require('./lib/canonical');
const { submitToOTS } = require('./lib/ots-utils');
const rateLimit = require('express-rate-limit');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(express.json());

// ==================== 中间件定义 ====================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please slow down' });
  },
  standardHeaders: true,
  legacyHeaders: false
});

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
    
    pool.query('UPDATE api_keys SET last_used = NOW() WHERE key = $1', [apiKey])
      .catch(err => console.error('Failed to update last_used:', err));
    
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const auditLog = async (req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
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

// ==================== 工具函数：生成 PDF ====================

async function generateJudgmentPDF(record, res) {
  // 生成验证页面的二维码
  const verifyUrl = `https://hjs-api.onrender.com/verify.html?id=${record.id}`;
  const qrBuffer = await QRCode.toBuffer(verifyUrl, {
    width: 150,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
  
  // 创建 PDF 文档
  const doc = new PDFDocument({ 
    margin: 50,
    size: 'A4',
    info: {
      Title: `HJS Judgment Record - ${record.id}`,
      Author: 'HJS API',
      Subject: 'Responsibility Tracing Record',
      Keywords: 'HJS, blockchain, timestamp, OpenTimestamps'
    }
  });
  
  // 设置响应头
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${record.id}.pdf"`);
  
  // 将 PDF 流式输出到响应
  doc.pipe(res);
  
  // ===== PDF 内容开始 =====
  
  // 标题
  doc.fontSize(24).font('Helvetica-Bold')
     .text('HJS Judgment Record', { align: 'center' })
     .moveDown(1.5);
  
  // 二维码和验证信息并排
  const qrY = doc.y;
  doc.image(qrBuffer, 50, qrY, { width: 100 });
  
  doc.fontSize(10).font('Helvetica')
     .text('Scan to verify online', 160, qrY + 10)
     .text('or visit:', 160, qrY + 25)
     .text(verifyUrl, 160, qrY + 40, { 
       color: 'blue', 
       underline: true,
       width: 300
     });
  
  doc.moveDown(6);
  
  // 记录详情
  doc.fontSize(14).font('Helvetica-Bold').text('Record Details', { underline: true });
  doc.moveDown(0.5);
  
  // 用表格形式展示
  const formatField = (label, value) => {
    doc.font('Helvetica-Bold').text(`${label}:`, { continued: true });
    doc.font('Helvetica').text(` ${value}`);
    doc.moveDown(0.3);
  };
  
  formatField('ID', record.id);
  formatField('Entity', record.entity);
  formatField('Action', record.action);
  
  if (record.scope && Object.keys(record.scope).length > 0) {
    formatField('Scope', JSON.stringify(record.scope, null, 2));
  }
  
  formatField('Judgment Time', new Date(record.timestamp).toLocaleString());
  formatField('Recorded At', new Date(record.recorded_at).toLocaleString());
  
  doc.moveDown(0.5);
  
  // OTS 证明状态
  doc.fontSize(14).font('Helvetica-Bold').text('OpenTimestamps Proof', { underline: true });
  doc.moveDown(0.5);
  
  if (record.ots_proof) {
    doc.fontSize(12).font('Helvetica')
       .fillColor('green')
       .text('✅ Proof available and anchored to Bitcoin blockchain')
       .fillColor('black');
    
    if (record.ots_verified) {
      doc.text('Status: Verified and anchored');
    }
  } else {
    doc.fontSize(12).font('Helvetica')
       .fillColor('orange')
       .text('⏳ Proof pending - will be anchored within 1 hour')
       .fillColor('black');
  }
  
  doc.moveDown(1.5);
  
  // 计算哈希值（用于验证）
  const hash = generateRecordHash(record);
  doc.fontSize(10).font('Helvetica-Bold').text('Record Hash (SHA-256):');
  doc.font('Helvetica').fontSize(8).text(hash, { color: 'grey' });
  
  doc.moveDown(1);
  
  // 脚注
  doc.fontSize(9).font('Helvetica')
     .fillColor('gray')
     .text('This document is a representation of a record stored in the HJS system.', { align: 'center' })
     .text('The cryptographic proof can be independently verified using any OpenTimestamps-compatible tool.', { align: 'center' })
     .text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
  
  doc.end();
}

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

// GET /judgments/:id - 查询单条记录（支持 JSON/PDF 导出）
app.get('/judgments/:id', limiter, authenticateApiKey, auditLog, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM judgments WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Judgment not found' });
    }
    
    const record = rows[0];
    
    // JSON 导出
    if (req.query.format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}.json"`);
      return res.json(record);
    }
    
    // PDF 导出（带二维码、哈希、完整信息）
    if (req.query.format === 'pdf') {
      return await generateJudgmentPDF(record, res);
    }
    
    // 默认返回 JSON
    res.json(record);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /judgments - 列表查询（支持 JSON 导出）
app.get('/judgments', limiter, authenticateApiKey, auditLog, async (req, res) => {
  const { entity, from, to, page = 1, limit = 20, format } = req.query;
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
  
  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);
  
  query += ` ORDER BY recorded_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
  params.push(limit, offset);
  const { rows } = await pool.query(query, params);
  
  const result = {
    page: Number(page),
    limit: Number(limit),
    total,
    data: rows
  };
  
  // 列表 JSON 导出
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="judgments_export.json"`);
    return res.json(result);
  }
  
  res.json(result);
});

// GET /judgments/:id/proof - 下载 OTS 证明文件
app.get('/judgments/:id/proof', limiter, authenticateApiKey, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT ots_proof FROM judgments WHERE id = $1', [req.params.id]);
    if (!rows[0]?.ots_proof) {
      return res.status(404).json({ error: 'Proof not found or not ready yet' });
    }
    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${req.params.id}.ots"`);
    res.send(rows[0].ots_proof);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== 启动服务 ====================

app.listen(port, () => {
  console.log(`🚀 HJS API running at http://localhost:${port}`);
});

if (process.env.NODE_ENV === 'production') {
  require('./cron/upgrade-proofs');
} else {
  console.log('⏰ OTS upgrade task skipped in development mode');
}