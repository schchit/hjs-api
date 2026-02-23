// HJS API 输入验证中间件
// 基础输入验证和清理

// Email 验证正则
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ID 格式验证（jgd_, dlg_, trm_, vfy_ 前缀）
const ID_REGEX = /^(jgd|dlg|trm|vfy)_[a-zA-Z0-9_-]+$/;

// 验证中间件
function validateInput(rules) {
  return (req, res, next) => {
    const errors = [];
    
    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field] || req.query[field] || req.params[field];
      
      // 必填检查
      if (rule.required && !value) {
        errors.push(`${field} is required`);
        continue;
      }
      
      // 如果有值，进行类型和格式检查
      if (value) {
        // 类型检查
        if (rule.type === 'email' && !EMAIL_REGEX.test(value)) {
          errors.push(`${field} must be a valid email`);
        }
        
        if (rule.type === 'id' && !ID_REGEX.test(value)) {
          errors.push(`${field} must be a valid HJS ID`);
        }
        
        // 长度检查
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${field} must be less than ${rule.maxLength} characters`);
        }
        
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${field} must be at least ${rule.minLength} characters`);
        }
        
        // 数值范围检查
        if (rule.type === 'number' && typeof value === 'number') {
          if (rule.max !== undefined && value > rule.max) {
            errors.push(`${field} must be less than ${rule.max}`);
          }
          if (rule.min !== undefined && value < rule.min) {
            errors.push(`${field} must be greater than ${rule.min}`);
          }
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    next();
  };
}

// 清理中间件 - 防止 XSS
function sanitizeInput(req, res, next) {
  const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/[<>]/g, '') // 移除 < > 防止 HTML 注入
      .trim(); // 去除首尾空格
  };
  
  // 清理 body
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitize(req.body[key]);
      }
    }
  }
  
  // 清理 query
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitize(req.query[key]);
      }
    }
  }
  
  next();
}

// scope 大小限制中间件
function limitScopeSize(req, res, next) {
  if (req.body && req.body.scope) {
    const scopeStr = JSON.stringify(req.body.scope);
    const maxSize = 100 * 1024; // 100KB
    
    if (scopeStr.length > maxSize) {
      return res.status(400).json({
        error: 'Scope too large',
        maxSize: '100KB',
        actualSize: Math.round(scopeStr.length / 1024) + 'KB'
      });
    }
    
    // 限制 scope 嵌套深度
    const checkDepth = (obj, depth = 0) => {
      if (depth > 5) {
        throw new Error('Scope nesting too deep (max 5 levels)');
      }
      if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          checkDepth(obj[key], depth + 1);
        }
      }
    };
    
    try {
      checkDepth(req.body.scope);
    } catch (err) {
      return res.status(400).json({
        error: err.message
      });
    }
  }
  
  next();
}

module.exports = {
  validateInput,
  sanitizeInput,
  limitScopeSize
};
