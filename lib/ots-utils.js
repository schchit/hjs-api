// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Human Judgment Systems Foundation Ltd.

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

/**
 * 查找 ots 命令的路径
 */
async function findOtsPath() {
  // 常见可能的位置
  const possiblePaths = [
    'ots',  // 如果在 PATH 中
    '/usr/local/bin/ots',
    '/usr/bin/ots',
    '/home/codespace/.python/current/bin/ots',  // Codespace 环境
    '/opt/render/project/src/.venv/bin/ots',     // Render Python 虚拟环境
  ];
  
  for (const cmd of possiblePaths) {
    try {
      await execAsync(`which ${cmd}`, { shell: true });
      return cmd;  // 找到可用命令
    } catch {
      // 继续尝试下一个
    }
  }
  
  throw new Error('OTS command line tool not found. Please install with: pip3 install opentimestamps-client');
}

/**
 * 提交一个十六进制哈希到 OTS 日历服务器，返回证明文件（Buffer）
 * @param {string} hashHex - 64字符的 SHA-256 哈希值
 * @returns {Promise<Buffer>} OTS 证明文件的二进制数据
 */
async function submitToOTS(hashHex) {
  const otsPath = await findOtsPath();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ots-'));
  const hashFile = path.join(tmpDir, 'hash.txt');
  const otsFile = path.join(tmpDir, 'hash.txt.ots');
  
  try {
    await fs.writeFile(hashFile, hashHex);
    
    // 调用 ots 命令行工具创建时间戳
    await execAsync(`${otsPath} stamp ${hashFile}`);
    
    const proof = await fs.readFile(otsFile);
    return proof;
    
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * 尝试升级 OTS 证明（锚定到区块链）
 * @param {Buffer} proof - OTS 证明二进制数据
 * @returns {Promise<Buffer|null>} 升级后的证明，如果已是最新则返回 null
 */
async function upgradeProof(proof) {
  const otsPath = await findOtsPath();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ots-'));
  const otsFile = path.join(tmpDir, 'proof.ots');
  
  try {
    await fs.writeFile(otsFile, proof);
    
    try {
      await execAsync(`${otsPath} upgrade ${otsFile}`);
      const upgraded = await fs.readFile(otsFile);
      return upgraded;
    } catch (err) {
      // 如果错误信息包含 "already at latest state"，说明已经是最新
      if (err.stderr && err.stderr.includes('already at latest')) {
        return null;
      }
      throw err;
    }
    
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { submitToOTS, upgradeProof };
