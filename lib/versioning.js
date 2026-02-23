// HJS API 版本控制系统
// 支持 URL 版本化和 Header 版本化

const express = require('express');

// API版本配置
const API_VERSIONS = {
    '1.0.0': {
        path: '/v1',
        status: 'stable',
        sunset: null  // 无废弃计划
    },
    '0.9.0': {
        path: '/v0',
        status: 'deprecated',
        sunset: '2026-06-01',  // 废弃日期
        message: 'Please upgrade to /v1'
    }
};

// 版本协商中间件
function versionNegotiation() {
    return (req, res, next) => {
        // 检查Header中的版本请求
        const requestedVersion = req.headers['x-api-version'] || req.headers['accept-version'];
        
        if (requestedVersion) {
            // 找到匹配的版本
            const version = Object.keys(API_VERSIONS).find(v => v.startsWith(requestedVersion));
            
            if (version) {
                req.apiVersion = version;
                req.apiVersionConfig = API_VERSIONS[version];
                
                // 检查版本状态
                if (API_VERSIONS[version].status === 'deprecated') {
                    res.setHeader('X-API-Deprecated', 'true');
                    res.setHeader('X-API-Sunset-Date', API_VERSIONS[version].sunset);
                    res.setHeader('X-API-Upgrade-Message', API_VERSIONS[version].message);
                }
            } else {
                // 请求的版本不存在
                return res.status(400).json({
                    error: 'Unsupported API version',
                    requested: requestedVersion,
                    available: Object.keys(API_VERSIONS).filter(k => API_VERSIONS[k].status === 'stable')
                });
            }
        }
        
        // 添加版本信息到响应头
        res.setHeader('X-API-Version', req.apiVersion || '1.0.0');
        res.setHeader('X-API-Latest-Version', '1.0.0');
        
        next();
    };
}

// 创建版本化路由
function createVersionRouter(pool, authenticateApiKey, limiter, auditLog) {
    const router = express.Router();
    
    // v1 路由（当前稳定版）
    const v1Router = express.Router();
    
    // v1 基础信息
    v1Router.get('/', (req, res) => {
        res.json({
            version: '1.0.0',
            status: 'stable',
            base_url: '/v1',
            documentation: 'https://docs.hjs.sh/v1',
            endpoints: {
                judgments: '/v1/judgments',
                delegations: '/v1/delegations',
                terminations: '/v1/terminations',
                verifications: '/v1/verifications',
                account: '/v1/account'
            }
        });
    });
    
    // v1 健康检查
    v1Router.get('/health', async (req, res) => {
        try {
            await pool.query('SELECT NOW()');
            res.json({
                version: '1.0.0',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                environment: req.isSandbox ? 'sandbox' : 'production'
            });
        } catch (err) {
            res.status(503).json({
                version: '1.0.0',
                status: 'unhealthy',
                error: 'Database connection failed'
            });
        }
    });
    
    router.use('/v1', v1Router);
    
    // v0 路由（废弃版本）
    const v0Router = express.Router();
    v0Router.use((req, res, next) => {
        res.setHeader('X-API-Deprecated', 'true');
        res.setHeader('X-API-Sunset-Date', '2026-06-01');
        res.setHeader('X-API-Message', 'v0 is deprecated, please use /v1');
        next();
    });
    
    v0Router.get('/', (req, res) => {
        res.json({
            version: '0.9.0',
            status: 'deprecated',
            message: 'This version will be sunset on 2026-06-01',
            upgrade_url: '/v1'
        });
    });
    
    // v0 路由重定向到v1
    v0Router.use((req, res) => {
        res.status(301).json({
            error: 'v0 API is deprecated',
            message: 'Please upgrade to /v1',
            redirect: '/v1' + req.path,
            sunset_date: '2026-06-01'
        });
    });
    
    router.use('/v0', v0Router);
    
    return router;
}

// API变更日志
const CHANGELOG = {
    '1.0.0': {
        date: '2026-02-24',
        changes: [
            'Add multi-tenant account system',
            'Add sandbox environment support',
            'Add idempotency keys',
            'Add webhook system',
            'Breaking: Authentication now requires X-API-Key header'
        ]
    },
    '0.9.0': {
        date: '2026-02-01',
        changes: [
            'Initial release',
            'Basic judgment recording',
            'OpenTimestamps anchoring'
        ]
    }
};

module.exports = {
    versionNegotiation,
    createVersionRouter,
    API_VERSIONS,
    CHANGELOG
};
