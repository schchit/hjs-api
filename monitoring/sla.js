// HJS SLA 监控和指标收集
// 基础设施核心：可观测性

const EventEmitter = require('events');

class SLAMonitor extends EventEmitter {
    constructor(pool, options = {}) {
        super();
        this.pool = pool;
        this.metrics = {
            requests: { total: 0, success: 0, error: 0 },
            latency: [],
            errors: {},
            endpoints: {}
        };
        this.startTime = Date.now();
        
        // 配置
        this.retentionPeriod = options.retentionPeriod || 24 * 60 * 60 * 1000; // 24小时
        this.sloTargets = {
            availability: 99.9,  // 99.9%
            latency_p99: 500,    // 500ms
            latency_p95: 200,    // 200ms
            error_rate: 0.1      // 0.1%
        };
        
        // 启动定时清理
        setInterval(() => this.cleanup(), 60 * 60 * 1000); // 每小时清理
    }
    
    // 记录请求
    recordRequest(method, path, statusCode, latency) {
        const endpoint = `${method} ${path}`;
        const timestamp = Date.now();
        
        // 总请求数
        this.metrics.requests.total++;
        
        // 成功/失败统计
        if (statusCode >= 200 && statusCode < 400) {
            this.metrics.requests.success++;
        } else {
            this.metrics.requests.error++;
            this.metrics.errors[statusCode] = (this.metrics.errors[statusCode] || 0) + 1;
        }
        
        // 延迟记录
        this.metrics.latency.push({ timestamp, latency });
        
        // 端点统计
        if (!this.metrics.endpoints[endpoint]) {
            this.metrics.endpoints[endpoint] = {
                count: 0,
                latencies: [],
                errors: 0
            };
        }
        this.metrics.endpoints[endpoint].count++;
        this.metrics.endpoints[endpoint].latencies.push(latency);
        if (statusCode >= 400) {
            this.metrics.endpoints[endpoint].errors++;
        }
        
        // 检查SLO违规
        this.checkSLO(endpoint, latency, statusCode);
    }
    
    // 检查SLO
    checkSLO(endpoint, latency, statusCode) {
        // 延迟SLO
        if (latency > this.sloTargets.latency_p99) {
            this.emit('slo.violation', {
                type: 'latency',
                endpoint,
                value: latency,
                threshold: this.sloTargets.latency_p99,
                severity: latency > this.sloTargets.latency_p99 * 2 ? 'critical' : 'warning'
            });
        }
        
        // 错误率SLO
        const windowMetrics = this.getMetricsForWindow(5 * 60 * 1000); // 5分钟窗口
        if (windowMetrics.errorRate > this.sloTargets.error_rate) {
            this.emit('slo.violation', {
                type: 'error_rate',
                endpoint,
                value: windowMetrics.errorRate,
                threshold: this.sloTargets.error_rate,
                severity: 'critical'
            });
        }
    }
    
    // 获取时间窗口内的指标
    getMetricsForWindow(windowMs) {
        const now = Date.now();
        const cutoff = now - windowMs;
        
        const recentLatencies = this.metrics.latency.filter(l => l.timestamp > cutoff);
        const total = recentLatencies.length;
        const errors = this.metrics.requests.error; // 简化处理
        
        return {
            total,
            errorRate: total > 0 ? (errors / total) * 100 : 0,
            avgLatency: total > 0 ? recentLatencies.reduce((a, b) => a + b.latency, 0) / total : 0,
            maxLatency: total > 0 ? Math.max(...recentLatencies.map(l => l.latency)) : 0
        };
    }
    
    // 计算百分位延迟
    getLatencyPercentile(percentile) {
        const sorted = this.metrics.latency
            .map(l => l.latency)
            .sort((a, b) => a - b);
        
        if (sorted.length === 0) return 0;
        
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }
    
    // 获取SLA报告
    getSLAReport(timeWindow = 24 * 60 * 60 * 1000) {
        const windowMetrics = this.getMetricsForWindow(timeWindow);
        const p99 = this.getLatencyPercentile(99);
        const p95 = this.getLatencyPercentile(95);
        const p50 = this.getLatencyPercentile(50);
        
        const totalRequests = this.metrics.requests.total;
        const successfulRequests = this.metrics.requests.success;
        const availability = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;
        
        return {
            timestamp: new Date().toISOString(),
            period: `${timeWindow / 1000 / 60} minutes`,
            slo: this.sloTargets,
            actual: {
                availability: availability.toFixed(3),
                latency_p99: p99,
                latency_p95: p95,
                latency_p50: p50,
                error_rate: windowMetrics.errorRate.toFixed(3)
            },
            status: {
                availability: availability >= this.sloTargets.availability ? 'met' : 'violated',
                latency_p99: p99 <= this.sloTargets.latency_p99 ? 'met' : 'violated',
                error_rate: windowMetrics.errorRate <= this.sloTargets.error_rate ? 'met' : 'violated'
            },
            top_endpoints: this.getTopEndpoints(5)
        };
    }
    
    // 获取最活跃的端点
    getTopEndpoints(limit = 5) {
        return Object.entries(this.metrics.endpoints)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, limit)
            .map(([endpoint, data]) => ({
                endpoint,
                requests: data.count,
                error_rate: ((data.errors / data.count) * 100).toFixed(2),
                avg_latency: data.latencies.length > 0 
                    ? (data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length).toFixed(2)
                    : 0
            }));
    }
    
    // 清理旧数据
    cleanup() {
        const cutoff = Date.now() - this.retentionPeriod;
        
        this.metrics.latency = this.metrics.latency.filter(l => l.timestamp > cutoff);
        
        // 清理端点历史数据
        Object.keys(this.metrics.endpoints).forEach(endpoint => {
            const data = this.metrics.endpoints[endpoint];
            // 保留聚合数据，清理详细记录
            if (data.latencies.length > 1000) {
                data.latencies = data.latencies.slice(-1000);
            }
        });
        
        this.emit('cleanup', { timestamp: new Date().toISOString() });
    }
    
    // 健康检查
    async healthCheck() {
        const checks = {
            database: false,
            api: true,  // 如果能执行到这里，API是正常的
            memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024 // 500MB
        };
        
        try {
            await this.pool.query('SELECT 1');
            checks.database = true;
        } catch (err) {
            checks.database = false;
        }
        
        const healthy = Object.values(checks).every(v => v);
        
        return {
            healthy,
            checks,
            uptime: Date.now() - this.startTime,
            version: '1.0.0'
        };
    }
}

// Express中间件：自动收集指标
function metricsMiddleware(monitor) {
    return (req, res, next) => {
        const startTime = Date.now();
        
        // 响应完成后记录
        res.on('finish', () => {
            const latency = Date.now() - startTime;
            monitor.recordRequest(req.method, req.path, res.statusCode, latency);
        });
        
        next();
    };
}

module.exports = {
    SLAMonitor,
    metricsMiddleware
};
