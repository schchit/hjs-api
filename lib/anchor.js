// lib/anchor.js
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Human Judgment Systems Foundation Ltd.

/**
 * HJS 锚定接口模块
 * 提供多种不可篡改锚定策略的实现
 * 所有实现都遵循“优雅降级”原则：失败时回退到 none
 */

const { submitToOTS, upgradeProof } = require('./ots-utils');

/**
 * 根据锚定类型处理记录
 * @param {string} type - 锚定类型 (ots, merkle, trusted_timestamp, none)
 * @param {string} hash - 记录哈希（64位十六进制）
 * @param {object} options - 锚定选项（类型相关）
 * @returns {Promise<object>} 锚定结果 { proof, reference, anchoredAt }
 */
async function anchorRecord(type, hash, options = {}) {
  const startTime = new Date().toISOString();
  
  switch (type) {
    case 'ots':
      try {
        const proof = await submitToOTS(hash);
        return { 
          proof, 
          reference: null,
          anchoredAt: null,
          _note: 'OTS proof generated, waiting for blockchain confirmation'
        };
      } catch (err) {
        console.warn(`OTS anchor failed, falling back to none: ${err.message}`);
        return { 
          proof: null, 
          reference: null, 
          anchoredAt: null,
          _error: err.message
        };
      }

    case 'merkle':
      console.warn('Merkle anchor not implemented, using none');
      return { 
        proof: null, 
        reference: null, 
        anchoredAt: null,
        _note: 'Merkle anchor not implemented'
      };

    case 'trusted_timestamp':
      console.warn('Trusted timestamp not implemented, using none');
      return { 
        proof: null, 
        reference: null, 
        anchoredAt: null,
        _note: 'Trusted timestamp not implemented'
      };

    case 'none':
      return { 
        proof: null, 
        reference: null, 
        anchoredAt: startTime,
        _note: 'No immutability anchor requested'
      };

    default:
      console.warn(`Unknown anchor type "${type}", using none`);
      return { 
        proof: null, 
        reference: null, 
        anchoredAt: startTime,
        _note: `Unknown type "${type}", treated as none`
      };
  }
}

/**
 * 升级/验证锚定（例如 OTS 的定时升级）
 * @param {string} type - 锚定类型
 * @param {Buffer} proof - 原始证明
 * @returns {Promise<Buffer|null>} 升级后的证明，若无变化则返回 null
 */
async function upgradeAnchor(type, proof) {
  if (type === 'ots' && proof) {
    try {
      const upgraded = await upgradeProof(proof);
      return upgraded;
    } catch (err) {
      console.warn(`OTS upgrade failed: ${err.message}`);
      return null;
    }
  }
  return null;
}

module.exports = { 
  anchorRecord, 
  upgradeAnchor
};
