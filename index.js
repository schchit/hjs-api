const { Pool } = require('pg');
const express = require('express');
const { generateRecordHash } = require('./lib/canonical');
const { submitToOTS } = require('./lib/ots-utils');
const rateLimit = require('express-rate-limit');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(express.json());

// ==================== 静态文件服务 ====================
app.use(express.static('public'));

// ==================== 根路径处理 ====================
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HJS API · 责任追溯协议</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
            * { font-family: 'Inter', system-ui, sans-serif; }
            body { background: #0a0a0a; }
            .glow { text-shadow: 0 0 20px rgba(94, 224, 192, 0.5); }
        </style>
    </head>
    <body class="bg-[#0a0a0a] text-[#e5e5e5] antialiased">
        <div class="min-h-screen flex items-center justify-center p-4">
            <div class="max-w-4xl w-full">
                <!-- 头部 Logo 区域 -->
                <div class="text-center mb-12">
                    <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 mb-6">
                        <span class="text-4xl font-bold text-teal-400 glow">H</span>
                    </div>
                    <h1 class="text-5xl font-bold mb-3 bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                        HJS API
                    </h1>
                    <p class="text-xl text-gray-400">责任追溯协议 · 实现层服务</p>
                </div>

                <!-- 卡片网格 -->
                <div class="grid md:grid-cols-2 gap-6 mb-12">
                    <!-- 开发者控制台 -->
                    <a href="/console.html" class="group block p-8 rounded-2xl border border-gray-800 bg-gray-900/50 hover:bg-gray-900 hover:border-teal-500/50 transition-all duration-300">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="p-3 rounded-xl bg-teal-500/10 text-teal-400 group-hover:scale-110 transition-transform">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </div>
                            <h2 class="text-2xl font-semibold text-white">开发者控制台</h2>
                        </div>
                        <p class="text-gray-400 mb-4">管理你的 API 密钥 · 生成、查看、吊销</p>
                        <div class="flex items-center text-teal-400 group-hover:translate-x-2 transition-transform">
                            <span class="text-sm font-medium">进入控制台</span>
                            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </a>

                    <!-- 公开查询页 -->
                    <a href="/lookup.html" class="group block p-8 rounded-2xl border border-gray-800 bg-gray-900/50 hover:bg-gray-900 hover:border-emerald-500/50 transition-all duration-300">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h2 class="text-2xl font-semibold text-white">公开查询页</h2>
                        </div>
                        <p class="text-gray-400 mb-4">根据记录 ID 查询 · 下载 JSON/PDF/OTS 证明</p>
                        <div class="flex items-center text-emerald-400 group-hover:translate-x-2 transition-transform">
                            <span class="text-sm font-medium">开始查询</span>
                            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </a>
                </div>

                <!-- 快速链接和状态 -->
                <div class="grid md:grid-cols-3 gap-4 text-center">
                    <div class="p-4 rounded-xl bg-gray-900/30 border border-gray-800">
                        <div class="text-2xl font-bold text-teal-400 mb-1">REST API</div>
                        <div class="text-sm text-gray-500">基于 HJS 协议族</div>
                    </div>
                    <div class="p-4 rounded-xl bg-gray-900/30 border border-gray-800">
                        <div class="text-2xl font-bold text-emerald-400 mb-1">OTS 证明</div>
                        <div class="text-sm text-gray-500">锚定到比特币区块链</div>
                    </div>
                    <div class="p-4 rounded-xl bg-gray-900/30 border border-gray-800">
                        <div class="text-2xl font-bold text-purple-400 mb-1">开源</div>
                        <div class="text-sm text-gray-500">CC BY-SA 4.0</div>
                    </div>
                </div>

                <!-- 底部链接 -->
                <div class="mt-12 text-center text-sm text-gray-600">
                    <a href="https://github.com/schchit/hjs-api" class="hover:text-gray-400 transition-colors mx-3">GitHub</a>
                    <span class="text-gray-700">|</span>
                    <a href="https://hjs-api.onrender.com/console.html" class="hover:text-gray-400 transition-colors mx-3">Console</a>
                    <span class="text-gray-700">|</span>
                    <a href="https://hjs-api.onrender.com/lookup.html" class="hover:text-gray-400 transition-colors mx-3">Lookup</a>
                </div>
            </div>
        </div>
    </body>
    </html>
  `);
});

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
  legacyHeaders: false
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
  const verifyUrl = `https://hjs-api.onrender.com/verify.html?id=${record.id}`;
  const qrBuffer = await QRCode.toBuffer(verifyUrl, {
    width: 150,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  });
  
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
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${record.id}.pdf"`);
  doc.pipe(res);
  
  doc.fontSize(24).font('Helvetica-Bold')
     .text('HJS Judgment Record', { align: 'center' })
     .moveDown(1.5);
  
  const qrY = doc.y;
  doc.image(qrBuffer, 50, qrY, { width: 100 });
  
  doc.fontSize(10).font('Helvetica')
     .text('Scan to verify online', 160, qrY + 10)
     .text('or visit:', 160, qrY + 25)
     .text(verifyUrl, 160, qrY + 40, { color: 'blue', underline: true, width: 300 });
  
  doc.moveDown(6);
  
  doc.fontSize(14).font('Helvetica-Bold').text('Record Details', { underline: true });
  doc.moveDown(0.5);
  
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
  
  const hash = generateRecordHash(record);
  doc.fontSize(10).font('Helvetica-Bold').text('Record Hash (SHA-256):');
  doc.font('Helvetica').fontSize(8).text(hash, { color: 'grey' });
  
  doc.moveDown(1);
  
  doc.fontSize(9).font('Helvetica')
     .fillColor('gray')
     .text('This document is a representation of a record stored in the HJS system.', { align: 'center' })
     .text('The cryptographic proof can be independently verified using any OpenTimestamps-compatible tool.', { align: 'center' })
     .text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
  
  doc.end();
}

// ==================== 开发者密钥管理 API ====================

// 生成新密钥
app.post('/developer/keys', express.json(), async (req, res) => {
  const { email, name } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  
  const apiKey = crypto.randomBytes(32).toString('hex');
  
  try {
    await pool.query(
      'INSERT INTO api_keys (key, user_id, name) VALUES ($1, $2, $3)',
      [apiKey, email, name || 'default']
    );
    
    res.json({
      success: true,
      key: apiKey,
      email,
      name: name || 'default',
      created: new Date().toISOString()
    });
  } catch (err) {
    console.error('Key generation error:', err);
    res.status(500).json({ error: 'Failed to generate key' });
  }
});

// 查询某邮箱下的所有密钥
app.get('/developer/keys', async (req, res) => {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }
  
  try {
    const { rows } = await pool.query(
      'SELECT key, name, created_at, last_used FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
      [email]
    );
    res.json(rows);
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: 'Failed to fetch keys' });
  }
});

// 吊销密钥
app.delete('/developer/keys/:key', async (req, res) => {
  const { email } = req.query;
  const { key } = req.params;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }
  
  try {
    const result = await pool.query(
      'DELETE FROM api_keys WHERE key = $1 AND user_id = $2',
      [key, email]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Key not found or not owned by you' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete key' });
  }
});

// ==================== 核心 API 路由 ====================

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
      protocol: 'HJS/1.0',
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
    
    if (req.query.format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}.json"`);
      return res.json(record);
    }
    
    if (req.query.format === 'pdf') {
      return await generateJudgmentPDF(record, res);
    }
    
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