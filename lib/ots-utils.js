const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// ots 命令的完整路径
const OTS_PATH = '/home/codespace/.python/current/bin/ots';

/**
 * 提交一个十六进制哈希到 OTS 日历服务器，返回证明文件（Buffer）
 * @param {string} hashHex - 64字符的 SHA-256 哈希值
 * @returns {Promise<Buffer>} OTS 证明文件的二进制数据
 */
async function submitToOTS(hashHex) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ots-'));
  const hashFile = path.join(tmpDir, 'hash.txt');
  const otsFile = path.join(tmpDir, 'hash.txt.ots');
  
  try {
    // 将哈希写入临时文件
    await fs.writeFile(hashFile, hashHex);
    
    // 调用 ots 命令行工具创建时间戳
    await new Promise((resolve, reject) => {
      exec(`${OTS_PATH} stamp ${hashFile}`, (error, stdout, stderr) => {
        if (error) {
          console.error('OTS stamp error:', stderr || error.message);
          reject(error);
          return;
        }
        resolve();
      });
    });
    
    // 读取生成的 OTS 文件（默认生成在同目录下，文件名相同加 .ots）
    const proof = await fs.readFile(otsFile);
    return proof;
    
  } finally {
    // 清理临时文件
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * 尝试升级 OTS 证明（锚定到区块链）
 * @param {Buffer} proof - OTS 证明二进制数据
 * @returns {Promise<Buffer|null>} 升级后的证明，如果已是最新则返回原证明
 */
async function upgradeProof(proof) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ots-'));
  const otsFile = path.join(tmpDir, 'proof.ots');
  
  try {
    // 将证明文件写入临时文件
    await fs.writeFile(otsFile, proof);
    
    // 调用 ots upgrade 升级证明
    await new Promise((resolve, reject) => {
      exec(`${OTS_PATH} upgrade ${otsFile}`, (error, stdout, stderr) => {
        if (error) {
          // 如果错误信息包含 "already at latest state"，说明已经是最新
          if (stderr && stderr.includes('already at latest')) {
            resolve();
          } else {
            console.error('OTS upgrade error:', stderr || error.message);
            reject(error);
          }
          return;
        }
        resolve();
      });
    });
    
    // 读取升级后的证明
    const upgraded = await fs.readFile(otsFile);
    return upgraded;
    
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { submitToOTS, upgradeProof };