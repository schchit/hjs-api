// HJS Billing System
// 完整的用量计量和计费系统

class BillingSystem {
    constructor(pool) {
        this.pool = pool;
        
        // 定价配置
        this.pricing = {
            free: {
                judgments: { limit: 1000, price: 0 },
                anchors: { limit: 10, price: 0 },
                storage: { limit: 100 * 1024 * 1024, price: 0 }  // 100MB
            },
            pro: {
                judgments: { limit: 100000, price: 0 },
                anchors: { limit: 1000, price: 0.03 },
                storage: { limit: 10 * 1024 * 1024 * 1024, price: 0 },  // 10GB
                overage: {
                    judgments: 0.001,  // $0.001 per record
                    anchors: 0.03,
                    storage: 0.10  // $0.10 per GB
                }
            },
            enterprise: {
                judgments: { limit: Infinity, price: 0 },
                anchors: { limit: Infinity, price: 0.025 },  // 批量折扣
                storage: { limit: Infinity, price: 0 },
                custom: true
            }
        };
    }
    
    // 获取账户账单概览
    async getBillingOverview(accountId) {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // 获取账户信息和计划
        const accountResult = await this.pool.query(
            'SELECT plan FROM accounts WHERE id = $1',
            [accountId]
        );
        
        if (accountResult.rows.length === 0) {
            throw new Error('Account not found');
        }
        
        const plan = accountResult.rows[0].plan;
        const planConfig = this.pricing[plan] || this.pricing.free;
        
        // 获取本月用量
        const usageResult = await this.pool.query(
            `SELECT 
                SUM(judgment_count) as judgments,
                SUM(anchor_count) as anchors,
                SUM(api_calls) as api_calls
             FROM account_usage
             WHERE account_id = $1 AND date >= $2`,
            [accountId, firstDayOfMonth]
        );
        
        const usage = {
            judgments: parseInt(usageResult.rows[0].judgments) || 0,
            anchors: parseInt(usageResult.rows[0].anchors) || 0,
            api_calls: parseInt(usageResult.rows[0].api_calls) || 0
        };
        
        // 计算费用
        const costs = this.calculateCosts(plan, usage);
        
        // 获取余额
        const balanceResult = await this.pool.query(
            'SELECT balance FROM account_billing WHERE account_id = $1',
            [accountId]
        );
        
        const balance = parseFloat(balanceResult.rows[0]?.balance || 0);
        
        return {
            account_id: accountId,
            plan,
            period: {
                start: firstDayOfMonth.toISOString(),
                end: now.toISOString()
            },
            usage,
            quota: {
                judgments: planConfig.judgments.limit,
                anchors: planConfig.anchors.limit
            },
            costs,
            balance,
            estimated_total: costs.total
        };
    }
    
    // 计算费用
    calculateCosts(plan, usage) {
        const planConfig = this.pricing[plan] || this.pricing.free;
        const costs = {
            judgments: 0,
            anchors: 0,
            storage: 0,
            overage: 0,
            total: 0
        };
        
        // 判断用量
        if (plan === 'pro' || plan === 'enterprise') {
            // 锚定费用
            costs.anchors = usage.anchors * planConfig.anchors.price;
            
            // 超额判断
            if (usage.judgments > planConfig.judgments.limit) {
                const overage = usage.judgments - planConfig.judgments.limit;
                costs.overage += overage * planConfig.overage.judgments;
            }
        }
        
        costs.total = costs.judgments + costs.anchors + costs.storage + costs.overage;
        
        return costs;
    }
    
    // 生成月度账单
    async generateMonthlyBill(accountId, year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        // 获取用量详情
        const usageResult = await this.pool.query(
            `SELECT 
                date,
                judgment_count,
                anchor_count,
                api_calls
             FROM account_usage
             WHERE account_id = $1 AND date >= $2 AND date <= $3
             ORDER BY date`,
            [accountId, startDate, endDate]
        );
        
        // 获取交易记录
        const transactionsResult = await this.pool.query(
            `SELECT 
                amount,
                type,
                status,
                reference_id,
                created_at
             FROM transactions
             WHERE account_id = $1 AND created_at >= $2 AND created_at <= $3
             ORDER BY created_at`,
            [accountId, startDate, endDate]
        );
        
        const dailyUsage = usageResult.rows;
        const transactions = transactionsResult.rows;
        
        // 计算总计
        const totalJudgments = dailyUsage.reduce((sum, d) => sum + parseInt(d.judgment_count), 0);
        const totalAnchors = dailyUsage.reduce((sum, d) => sum + parseInt(d.anchor_count), 0);
        const totalCharges = transactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
        const totalCredits = transactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
        return {
            account_id: accountId,
            billing_period: {
                year,
                month,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString()
            },
            summary: {
                total_judgments: totalJudgments,
                total_anchors: totalAnchors,
                total_charges: totalCharges.toFixed(2),
                total_credits: totalCredits.toFixed(2),
                net_amount: (totalCharges - totalCredits).toFixed(2)
            },
            daily_usage: dailyUsage,
            transactions: transactions
        };
    }
    
    // 预算告警检查
    async checkBudgetAlerts(accountId) {
        const overview = await this.getBillingOverview(accountId);
        const alerts = [];
        
        // 检查各项用量是否接近限额
        const thresholds = [0.8, 0.9, 0.95, 1.0];
        
        for (const threshold of thresholds) {
            if (overview.quota.judgments !== Infinity) {
                const usageRatio = overview.usage.judgments / overview.quota.judgments;
                if (usageRatio >= threshold && usageRatio < (threshold + 0.1)) {
                    alerts.push({
                        type: 'quota_warning',
                        resource: 'judgments',
                        threshold: threshold * 100,
                        usage: overview.usage.judgments,
                        quota: overview.quota.judgments,
                        severity: threshold >= 0.95 ? 'critical' : 'warning'
                    });
                }
            }
            
            if (overview.quota.anchors !== Infinity) {
                const usageRatio = overview.usage.anchors / overview.quota.anchors;
                if (usageRatio >= threshold && usageRatio < (threshold + 0.1)) {
                    alerts.push({
                        type: 'quota_warning',
                        resource: 'anchors',
                        threshold: threshold * 100,
                        usage: overview.usage.anchors,
                        quota: overview.quota.anchors,
                        severity: threshold >= 0.95 ? 'critical' : 'warning'
                    });
                }
            }
        }
        
        // 检查余额
        if (overview.balance < 10) {
            alerts.push({
                type: 'low_balance',
                balance: overview.balance,
                severity: overview.balance < 5 ? 'critical' : 'warning'
            });
        }
        
        return alerts;
    }
    
    // 导出账单为CSV
    async exportBillCSV(accountId, year, month) {
        const bill = await this.generateMonthlyBill(accountId, year, month);
        
        // CSV头部
        let csv = 'Date,Judgments,Anchors,API Calls\n';
        
        // 每日用量
        for (const day of bill.daily_usage) {
            csv += `${day.date},${day.judgment_count},${day.anchor_count},${day.api_calls}\n`;
        }
        
        // 汇总
        csv += `\nTotal,${bill.summary.total_judgments},${bill.summary.total_anchors},\n`;
        csv += `\nTotal Charges,$${bill.summary.total_charges}\n`;
        
        return csv;
    }
    
    // 充值（模拟，实际对接Stripe）
    async topUp(accountId, amount, paymentMethod = 'stripe') {
        if (amount < 5) {
            throw new Error('Minimum top-up amount is $5');
        }
        
        if (amount > 1000) {
            throw new Error('Maximum top-up amount is $1000');
        }
        
        // 创建待处理交易
        const result = await this.pool.query(
            `INSERT INTO transactions (account_id, amount, type, status, reference_id)
             VALUES ($1, $2, 'topup', 'pending', $3)
             RETURNING id`,
            [accountId, amount, `topup_${Date.now()}`]
        );
        
        const transactionId = result.rows[0].id;
        
        // 这里应该调用Stripe创建支付意图
        // 暂时模拟成功
        await this.pool.query(
            `UPDATE transactions SET status = 'completed' WHERE id = $1`,
            [transactionId]
        );
        
        await this.pool.query(
            `UPDATE account_billing SET balance = balance + $1 WHERE account_id = $2`,
            [amount, accountId]
        );
        
        return {
            transaction_id: transactionId,
            amount,
            status: 'completed',
            new_balance: (await this.getBalance(accountId)).balance
        };
    }
    
    // 获取余额
    async getBalance(accountId) {
        const result = await this.pool.query(
            'SELECT balance FROM account_billing WHERE account_id = $1',
            [accountId]
        );
        
        return {
            balance: parseFloat(result.rows[0]?.balance || 0),
            currency: 'USD'
        };
    }
}

module.exports = { BillingSystem };
