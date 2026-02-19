// cron/upgrade-proofs.js
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Human Judgment Systems Foundation Ltd.

const { Pool } = require('pg');
const { upgradeAnchor } = require('../lib/anchor');
const cron = require('node-cron');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 每小时运行一次
cron.schedule('0 * * * *', async () => {
  console.log('[' + new Date().toISOString() + '] Running anchor upgrade task...');
  
  try {
    // 查询所有需要升级的锚定
    const { rows } = await pool.query(
      `SELECT id, anchor_type, anchor_proof 
       FROM judgments 
       WHERE anchor_proof IS NOT NULL 
         AND anchor_processed_at IS NULL
         AND anchor_type IN ('ots')`
    );

    console.log(`📊 Found ${rows.length} proofs to upgrade`);

    for (const row of rows) {
      try {
        console.log(`⏫ Upgrading anchor for record ${row.id}...`);
        const upgraded = await upgradeAnchor(row.anchor_type, row.anchor_proof);
        
        if (upgraded) {
          await pool.query(
            `UPDATE judgments 
             SET anchor_proof = $1, anchor_processed_at = NOW() 
             WHERE id = $2`,
            [upgraded, row.id]
          );
          console.log(`✅ Upgraded anchor for record ${row.id}`);
        } else {
          console.log(`⏳ Anchor for record ${row.id} is already at latest state`);
        }
      } catch (err) {
        console.error(`❌ Failed to upgrade record ${row.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('❌ Anchor upgrade task error:', err);
  }
});

// 启动时打印信息
console.log('⏰ Anchor upgrade task scheduled (hourly)');

module.exports = {};
