// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Human Judgment Systems Foundation Ltd.
// HJS Protocol Core API Extension - Delegation, Termination, Verification

const { Pool } = require('pg');
const express = require('express');
const crypto = require('crypto');

// ==================== 数据库表初始化 ====================
// 在原有的 judgments 表基础上，添加 delegation、termination、verification 表

const INIT_DELEGATION_TABLE = `
CREATE TABLE IF NOT EXISTS delegations (
  id VARCHAR(50) PRIMARY KEY,
  delegator VARCHAR(255) NOT NULL,
  delegatee VARCHAR(255) NOT NULL,
  judgment_id VARCHAR(50) REFERENCES judgments(id),
  scope JSONB DEFAULT '{}',
  expiry TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP,
  anchor_type VARCHAR(20) DEFAULT 'none',
  anchor_reference TEXT,
  anchor_proof BYTEA,
  anchor_processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delegations_delegator ON delegations(delegator);
CREATE INDEX IF NOT EXISTS idx_delegations_delegatee ON delegations(delegatee);
CREATE INDEX IF NOT EXISTS idx_delegations_judgment ON delegations(judgment_id);
CREATE INDEX IF NOT EXISTS idx_delegations_status ON delegations(status);
`;

const INIT_TERMINATION_TABLE = `
CREATE TABLE IF NOT EXISTS terminations (
  id VARCHAR(50) PRIMARY KEY,
  terminator VARCHAR(255) NOT NULL,
  target_id VARCHAR(50) NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('judgment', 'delegation')),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  anchor_type VARCHAR(20) DEFAULT 'none',
  anchor_reference TEXT,
  anchor_proof BYTEA,
  anchor_processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_terminations_terminator ON terminations(terminator);
CREATE INDEX IF NOT EXISTS idx_terminations_target ON terminations(target_id);
CREATE INDEX IF NOT EXISTS idx_terminations_type ON terminations(target_type);
`;

const INIT_VERIFICATION_TABLE = `
CREATE TABLE IF NOT EXISTS verifications (
  id VARCHAR(50) PRIMARY KEY,
  verifier VARCHAR(255) NOT NULL,
  target_id VARCHAR(50) NOT NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('judgment', 'delegation', 'termination')),
  result VARCHAR(20) NOT NULL CHECK (result IN ('VALID', 'INVALID', 'PENDING')),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verifications_target ON verifications(target_id);
CREATE INDEX IF NOT EXISTS idx_verifications_verifier ON verifications(verifier);
`;

// ==================== 辅助函数 ====================

function generateId(prefix) {
  return prefix + '_' + Date.now() + Math.random().toString(36).substring(2, 6);
}

async function initHJSExtensionTables(pool) {
  try {
    await pool.query(INIT_DELEGATION_TABLE);
    await pool.query(INIT_TERMINATION_TABLE);
    await pool.query(INIT_VERIFICATION_TABLE);
    console.log('✅ HJS Extension tables initialized');
  } catch (err) {
    console.error('Failed to init extension tables:', err);
    throw err;
  }
}

// ==================== HJS Protocol 验证逻辑 ====================

async function verifyDelegationChain(pool, delegationId) {
  const result = await pool.query(
    `SELECT d.*, j.id as judgment_id, j.entity as judgment_entity
     FROM delegations d
     LEFT JOIN judgments j ON d.judgment_id = j.id
     WHERE d.id = $1`,
    [delegationId]
  );
  
  if (result.rows.length === 0) {
    return { valid: false, error: 'Delegation not found' };
  }
  
  const delegation = result.rows[0];
  
  // 检查是否已被终止
  const termResult = await pool.query(
    'SELECT * FROM terminations WHERE target_id = $1 AND target_type = $2',
    [delegationId, 'delegation']
  );
  
  if (termResult.rows.length > 0) {
    return { 
      valid: false, 
      error: 'Delegation has been terminated',
      terminated_at: termResult.rows[0].created_at,
      reason: termResult.rows[0].reason
    };
  }
  
  // 检查是否过期
  if (delegation.expiry && new Date(delegation.expiry) < new Date()) {
    return { valid: false, error: 'Delegation has expired' };
  }
  
  // 检查状态
  if (delegation.status !== 'active') {
    return { valid: false, error: `Delegation status: ${delegation.status}` };
  }
  
  return {
    valid: true,
    delegation: {
      id: delegation.id,
      delegator: delegation.delegator,
      delegatee: delegation.delegatee,
      scope: delegation.scope,
      created_at: delegation.created_at,
      expiry: delegation.expiry
    },
    judgment: delegation.judgment_id ? {
      id: delegation.judgment_id,
      entity: delegation.judgment_entity
    } : null
  };
}

async function verifyJudgment(pool, judgmentId) {
  const result = await pool.query(
    'SELECT * FROM judgments WHERE id = $1',
    [judgmentId]
  );
  
  if (result.rows.length === 0) {
    return { valid: false, error: 'Judgment not found' };
  }
  
  const judgment = result.rows[0];
  
  // 检查是否已被终止
  const termResult = await pool.query(
    'SELECT * FROM terminations WHERE target_id = $1 AND target_type = $2',
    [judgmentId, 'judgment']
  );
  
  if (termResult.rows.length > 0) {
    return { 
      valid: false, 
      error: 'Judgment has been terminated',
      terminated_at: termResult.rows[0].created_at,
      reason: termResult.rows[0].reason
    };
  }
  
  return {
    valid: true,
    judgment: {
      id: judgment.id,
      entity: judgment.entity,
      action: judgment.action,
      scope: judgment.scope,
      timestamp: judgment.timestamp,
      recorded_at: judgment.recorded_at,
      anchor_type: judgment.anchor_type
    }
  };
}

// ==================== Express Router ====================

function createHJSExtensionRouter(pool, authenticateApiKey, limiter) {
  const router = express.Router();
  
  // ==================== DELEGATION API ====================
  
  // POST /delegations - 创建委托
  router.post('/delegations', limiter, authenticateApiKey, async (req, res) => {
    const { delegator, delegatee, judgment_id, scope, expiry } = req.body;
    
    if (!delegator || !delegatee) {
      return res.status(400).json({ error: 'delegator and delegatee are required' });
    }
    
    // 验证 judgment_id 是否存在且有效
    if (judgment_id) {
      const judgmentCheck = await verifyJudgment(pool, judgment_id);
      if (!judgmentCheck.valid) {
        return res.status(400).json({ error: `Invalid judgment: ${judgmentCheck.error}` });
      }
    }
    
    const id = generateId('dlg');
    
    try {
      await pool.query(
        `INSERT INTO delegations (id, delegator, delegatee, judgment_id, scope, expiry)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, delegator, delegatee, judgment_id || null, JSON.stringify(scope || {}), expiry || null]
      );
      
      res.status(201).json({
        id,
        status: 'active',
        delegator,
        delegatee,
        judgment_id: judgment_id || null,
        scope: scope || {},
        expiry: expiry || null,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Delegation creation error:', err);
      res.status(500).json({ error: 'Failed to create delegation' });
    }
  });
  
  // GET /delegations/:id - 查询委托
  router.get('/delegations/:id', limiter, authenticateApiKey, async (req, res) => {
    try {
      const verification = await verifyDelegationChain(pool, req.params.id);
      
      if (!verification.valid) {
        return res.status(404).json({ 
          error: verification.error,
          terminated_at: verification.terminated_at,
          reason: verification.reason
        });
      }
      
      res.json({
        id: verification.delegation.id,
        status: 'active',
        ...verification.delegation,
        judgment: verification.judgment
      });
    } catch (err) {
      console.error('Delegation query error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // GET /delegations - 列表查询
  router.get('/delegations', limiter, authenticateApiKey, async (req, res) => {
    const { delegator, delegatee, judgment_id, status = 'active', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM delegations WHERE 1=1';
    const params = [];
    let paramIdx = 1;
    
    if (delegator) {
      query += ` AND delegator = $${paramIdx++}`;
      params.push(delegator);
    }
    if (delegatee) {
      query += ` AND delegatee = $${paramIdx++}`;
      params.push(delegatee);
    }
    if (judgment_id) {
      query += ` AND judgment_id = $${paramIdx++}`;
      params.push(judgment_id);
    }
    if (status) {
      query += ` AND status = $${paramIdx++}`;
      params.push(status);
    }
    
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);
    
    const { rows } = await pool.query(query, params);
    
    res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      data: rows.map(d => ({
        id: d.id,
        delegator: d.delegator,
        delegatee: d.delegatee,
        judgment_id: d.judgment_id,
        scope: d.scope,
        status: d.status,
        expiry: d.expiry,
        created_at: d.created_at
      }))
    });
  });
  
  // ==================== TERMINATION API ====================
  
  // POST /terminations - 创建终止记录
  router.post('/terminations', limiter, authenticateApiKey, async (req, res) => {
    const { terminator, target_id, target_type, reason } = req.body;
    
    if (!terminator || !target_id || !target_type) {
      return res.status(400).json({ 
        error: 'terminator, target_id, and target_type are required' 
      });
    }
    
    if (!['judgment', 'delegation'].includes(target_type)) {
      return res.status(400).json({ error: 'target_type must be judgment or delegation' });
    }
    
    // 验证目标是否存在
    let targetCheck;
    if (target_type === 'judgment') {
      targetCheck = await verifyJudgment(pool, target_id);
    } else {
      targetCheck = await verifyDelegationChain(pool, target_id);
    }
    
    if (!targetCheck.valid && !targetCheck.error.includes('terminated')) {
      return res.status(404).json({ error: `Target not found: ${targetCheck.error}` });
    }
    
    const id = generateId('trm');
    
    try {
      await pool.query(
        `INSERT INTO terminations (id, terminator, target_id, target_type, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, terminator, target_id, target_type, reason || null]
      );
      
      // 如果是委托，更新委托状态
      if (target_type === 'delegation') {
        await pool.query(
          "UPDATE delegations SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP WHERE id = $1",
          [target_id]
        );
      }
      
      res.status(201).json({
        id,
        terminator,
        target_id,
        target_type,
        reason: reason || null,
        created_at: new Date().toISOString(),
        status: 'terminated'
      });
    } catch (err) {
      console.error('Termination creation error:', err);
      res.status(500).json({ error: 'Failed to create termination' });
    }
  });
  
  // GET /terminations/:id - 查询终止记录
  router.get('/terminations/:id', limiter, authenticateApiKey, async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM terminations WHERE id = $1',
        [req.params.id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Termination not found' });
      }
      
      res.json(rows[0]);
    } catch (err) {
      console.error('Termination query error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // GET /terminations - 列表查询
  router.get('/terminations', limiter, authenticateApiKey, async (req, res) => {
    const { terminator, target_id, target_type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM terminations WHERE 1=1';
    const params = [];
    let paramIdx = 1;
    
    if (terminator) {
      query += ` AND terminator = $${paramIdx++}`;
      params.push(terminator);
    }
    if (target_id) {
      query += ` AND target_id = $${paramIdx++}`;
      params.push(target_id);
    }
    if (target_type) {
      query += ` AND target_type = $${paramIdx++}`;
      params.push(target_type);
    }
    
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);
    
    const { rows } = await pool.query(query, params);
    
    res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      data: rows
    });
  });
  
  // ==================== VERIFICATION API ====================
  
  // POST /verifications - 验证记录
  router.post('/verifications', limiter, authenticateApiKey, async (req, res) => {
    const { verifier, target_id, target_type } = req.body;
    
    if (!verifier || !target_id || !target_type) {
      return res.status(400).json({ 
        error: 'verifier, target_id, and target_type are required' 
      });
    }
    
    if (!['judgment', 'delegation', 'termination'].includes(target_type)) {
      return res.status(400).json({ 
        error: 'target_type must be judgment, delegation, or termination' 
      });
    }
    
    let verificationResult;
    let details = {};
    
    // 根据类型执行验证
    if (target_type === 'judgment') {
      verificationResult = await verifyJudgment(pool, target_id);
    } else if (target_type === 'delegation') {
      verificationResult = await verifyDelegationChain(pool, target_id);
    } else {
      // termination 验证
      const termResult = await pool.query(
        'SELECT * FROM terminations WHERE id = $1',
        [target_id]
      );
      if (termResult.rows.length === 0) {
        verificationResult = { valid: false, error: 'Termination not found' };
      } else {
        verificationResult = { 
          valid: true, 
          termination: termResult.rows[0] 
        };
      }
    }
    
    const result = verificationResult.valid ? 'VALID' : 'INVALID';
    details = {
      ...verificationResult,
      verified_at: new Date().toISOString()
    };
    
    // 记录验证结果
    const id = generateId('vfy');
    try {
      await pool.query(
        `INSERT INTO verifications (id, verifier, target_id, target_type, result, details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, verifier, target_id, target_type, result, JSON.stringify(details)]
      );
    } catch (err) {
      console.error('Failed to save verification:', err);
    }
    
    res.json({
      id,
      verifier,
      target_id,
      target_type,
      result,
      details: verificationResult,
      verified_at: new Date().toISOString()
    });
  });
  
  // GET /verifications - 查询验证历史
  router.get('/verifications', limiter, authenticateApiKey, async (req, res) => {
    const { verifier, target_id, target_type, result, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM verifications WHERE 1=1';
    const params = [];
    let paramIdx = 1;
    
    if (verifier) {
      query += ` AND verifier = $${paramIdx++}`;
      params.push(verifier);
    }
    if (target_id) {
      query += ` AND target_id = $${paramIdx++}`;
      params.push(target_id);
    }
    if (target_type) {
      query += ` AND target_type = $${paramIdx++}`;
      params.push(target_type);
    }
    if (result) {
      query += ` AND result = $${paramIdx++}`;
      params.push(result);
    }
    
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);
    
    const { rows } = await pool.query(query, params);
    
    res.json({
      page: Number(page),
      limit: Number(limit),
      total,
      data: rows.map(v => ({
        ...v,
        details: typeof v.details === 'string' ? JSON.parse(v.details) : v.details
      }))
    });
  });
  
  // ==================== 统一验证入口 ====================
  
  // POST /verify - 通用验证接口（简化版）
  router.post('/verify', limiter, async (req, res) => {
    const { id, type } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }
    
    // 自动检测类型
    let detectedType = type;
    if (!detectedType) {
      if (id.startsWith('jgd_')) detectedType = 'judgment';
      else if (id.startsWith('dlg_')) detectedType = 'delegation';
      else if (id.startsWith('trm_')) detectedType = 'termination';
    }
    
    if (!detectedType) {
      return res.status(400).json({ error: 'Unable to detect type from id, please specify type' });
    }
    
    let result;
    switch (detectedType) {
      case 'judgment':
        result = await verifyJudgment(pool, id);
        break;
      case 'delegation':
        result = await verifyDelegationChain(pool, id);
        break;
      case 'termination':
        const termResult = await pool.query('SELECT * FROM terminations WHERE id = $1', [id]);
        result = termResult.rows.length > 0 
          ? { valid: true, termination: termResult.rows[0] }
          : { valid: false, error: 'Termination not found' };
        break;
      default:
        return res.status(400).json({ error: 'Unknown type' });
    }
    
    res.json({
      id,
      type: detectedType,
      status: result.valid ? 'VALID' : 'INVALID',
      ...result
    });
  });
  
  return router;
}

module.exports = {
  initHJSExtensionTables,
  createHJSExtensionRouter,
  verifyJudgment,
  verifyDelegationChain
};
