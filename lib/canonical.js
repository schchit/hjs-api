const crypto = require('crypto');

/**
 * 递归地、确定性地序列化对象，确保相同的对象总是生成相同的字符串。
 * 键按字母顺序排序，值按类型处理。
 */
function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(v => canonicalStringify(v)).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => `"${k}":${canonicalStringify(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * 根据记录内容生成 SHA-256 哈希（十六进制字符串）
 * @param {Object} record - 完整的记录对象（应包含所有参与哈希的字段）
 * @returns {string} 64字符的十六进制哈希值
 */
function generateRecordHash(record) {
  // 选择需要参与哈希的字段（排除 id 和可能自动生成的时间戳，根据需求调整）
  // 通常应包括 entity, action, scope, timestamp, recorded_at 等业务字段
  const { id, ...fields } = record; // 如果 id 不参与哈希，可排除
  const canonicalJson = canonicalStringify(fields);
  return crypto.createHash('sha256').update(canonicalJson).digest('hex');
}

module.exports = { generateRecordHash };