// HJS IP 白名单系统
// 限制API调用来源，增强安全性

const ipRange = require('ip-range-check');

class IPWhitelist {
    constructor(pool) {
        this.pool = pool;
    }
    
    // 验证IP是否允许访问
    async validateIP(accountId, clientIP) {
        // 获取账户的白名单配置
        const whitelist = await this.getWhitelist(accountId);
        
        // 如果没有配置白名单，允许所有IP
        if (!whitelist.enabled || whitelist.ips.length === 0) {
            return { allowed: true };
        }
        
        // 检查IP是否在白名单中
        const allowed = whitelist.ips.some(entry => {
            if (entry.includes('/')) {
                // CIDR 范围
                return ipRange(clientIP, entry);
            } else if (entry.includes('-')) {
                // IP 范围
                return this.checkIPRange(clientIP, entry);
            } else {
                // 单个IP
                return clientIP === entry;
            }
        });
        
        if (!allowed) {
            // 记录被拒绝的访问
            await this.logDeniedAccess(accountId, clientIP);
            
            return {
                allowed: false,
                error: 'IP not in whitelist',
                code: 'ip_not_allowed',
                your_ip: clientIP,
                contact_admin: 'Contact your account administrator to add this IP'
            };
        }
        
        return { allowed: true };
    }
    
    // 获取白名单配置
    async getWhitelist(accountId) {
        const result = await this.pool.query(
            'SELECT enabled, ips, last_updated FROM ip_whitelist WHERE account_id = $1',
            [accountId]
        );
        
        if (result.rows.length === 0) {
            return {
                enabled: false,
                ips: [],
                last_updated: null
            };
        }
        
        return {
            enabled: result.rows[0].enabled,
            ips: result.rows[0].ips,
            last_updated: result.rows[0].last_updated
        };
    }
    
    // 更新白名单
    async updateWhitelist(accountId, { enabled, ips }) {
        // 验证IP格式
        for (const ip of ips) {
            if (!this.isValidIPOrRange(ip)) {
                throw new Error(`Invalid IP or range: ${ip}`);
            }
        }
        
        // 确保至少保留一个IP（如果启用）
        if (enabled && ips.length === 0) {
            throw new Error('At least one IP is required when whitelist is enabled');
        }
        
        await this.pool.query(
            `INSERT INTO ip_whitelist (account_id, enabled, ips, last_updated)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (account_id)
             DO UPDATE SET 
                enabled = $2,
                ips = $3,
                last_updated = NOW()`,
            [accountId, enabled, ips]
        );
        
        return {
            account_id: accountId,
            enabled,
            ips,
            updated_at: new Date().toISOString()
        };
    }
    
    // 添加单个IP
    async addIP(accountId, ip) {
        if (!this.isValidIPOrRange(ip)) {
            throw new Error(`Invalid IP or range: ${ip}`);
        }
        
        const whitelist = await this.getWhitelist(accountId);
        
        if (whitelist.ips.includes(ip)) {
            throw new Error('IP already in whitelist');
        }
        
        const newIPs = [...whitelist.ips, ip];
        
        return this.updateWhitelist(accountId, {
            enabled: true,
            ips: newIPs
        });
    }
    
    // 移除单个IP
    async removeIP(accountId, ip) {
        const whitelist = await this.getWhitelist(accountId);
        
        const newIPs = whitelist.ips.filter(i => i !== ip);
        
        return this.updateWhitelist(accountId, {
            enabled: newIPs.length > 0,
            ips: newIPs
        });
    }
    
    // 验证IP或范围格式
    isValidIPOrRange(input) {
        // 单个IP
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(input)) {
            return true;
        }
        
        // CIDR 范围
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(input)) {
            return true;
        }
        
        // IP 范围 (192.168.1.1-192.168.1.100)
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}-\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(input)) {
            return true;
        }
        
        return false;
    }
    
    // 检查IP范围
    checkIPRange(ip, range) {
        const [start, end] = range.split('-');
        const ipNum = this.ipToNumber(ip);
        const startNum = this.ipToNumber(start);
        const endNum = this.ipToNumber(end);
        
        return ipNum >= startNum && ipNum <= endNum;
    }
    
    // IP转数字
    ipToNumber(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
    }
    
    // 记录被拒绝的访问
    async logDeniedAccess(accountId, ip) {
        await this.pool.query(
            `INSERT INTO ip_access_denied_log (account_id, ip, created_at)
             VALUES ($1, $2, NOW())`,
            [accountId, ip]
        );
    }
    
    // 获取被拒绝的访问记录
    async getDeniedAccessLogs(accountId, limit = 100) {
        const result = await this.pool.query(
            `SELECT ip, created_at 
             FROM ip_access_denied_log 
             WHERE account_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2`,
            [accountId, limit]
        );
        
        return result.rows;
    }
    
    // 获取当前IP（从请求中提取）
    getClientIP(req) {
        // 优先从代理头获取
        const forwarded = req.headers['x-forwarded-for'];
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
        
        const realIP = req.headers['x-real-ip'];
        if (realIP) {
            return realIP;
        }
        
        // 直接连接
        return req.connection.remoteAddress || req.socket.remoteAddress;
    }
}

// Express中间件
function ipWhitelistMiddleware(ipWhitelist) {
    return async (req, res, next) => {
        // 如果没有账户信息，跳过（让后续认证处理）
        if (!req.account || !req.account.id) {
            return next();
        }
        
        const clientIP = ipWhitelist.getClientIP(req);
        
        const result = await ipWhitelist.validateIP(req.account.id, clientIP);
        
        if (!result.allowed) {
            return res.status(403).json(result);
        }
        
        next();
    };
}

module.exports = {
    IPWhitelist,
    ipWhitelistMiddleware
};
