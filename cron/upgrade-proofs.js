// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Human Judgment Systems Foundation Ltd.

const { Pool } = require('pg');
const { upgradeProof } = require('../lib/ots-utils');
const cron = require('node-cron');

// 数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 每小时运行一次
cron.schedule('0 * * * *', async () => {
  console.log('🔍 Running OTS proof upgrade task...', new Date().toISOString());
  
  try {
    // 查询所有未验证且有证明的记录
    const { rows } = await pool.query(
      'SELECT id, ots_proof FROM judgments WHERE ots_proof IS NOT NULL AND ots_verified = false'
    );

    console.log(`📊 Found ${rows.length} proofs to upgrade`);

    for (const row of rows) {
      try {
        console.log(`⏫ Upgrading proof for record ${row.id}...`);
        const proof = row.ots_proof; // 已经是 Buffer 格式
        const upgraded = await upgradeProof(proof);
        
        if (upgraded) {
          await pool.query(
            'UPDATE judgments SET ots_proof = $1, ots_verified = true WHERE id = $2',
            [upgraded, row.id]
          );
          console.log(`✅ Upgraded proof for record ${row.id}`);
        } else {
          console.log(`⏳ Proof for record ${row.id} is already at latest state`);
        }
      } catch (err) {
        console.error(`❌ Failed to upgrade record ${row.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ OTS upgrade task error:', err);
  }
});

console.log('⏰ OTS upgrade task scheduled (hourly)');
