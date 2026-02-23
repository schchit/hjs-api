// HJS 阶梯定价计费系统
// 基础设施模式：用量越大，单价越低

class TieredBillingSystem {
    constructor(pool) {
        this.pool = pool;
        
        // 阶梯定价配置
        this.tiers = [
            { min: 0, max: 100, price: 0.03, name: 'experience' },
            { min: 101, max: 1000, price: 0.02, name: 'standard' },
            { min: 1001, max: 10000, price: 0.01, name: 'bulk' },
            { min: 10001, max: Infinity, price: 0.005, name: 'enterprise' }
        ];
        
        // 链上成本（几乎为0）
        this.chainCost = 0.0001;
        
        // 最低预存金额
        this.minDeposit = 10;
    }
    
    // 计算当前阶梯单价
    getTierPrice(usageCount) {
        for (const tier of this.tiers) {
            if (usageCount >= tier.min && usageCount <= tier.max) {
                return tier;
            }
        }
        return this.tiers[this.tiers.length - 1];
    }
    
    // 计算本次锚定的价格
    async calculateAnchorPrice(accountId) {
        // 获取本月已锚定数量
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const result = await this.pool.query(
            `SELECT SUM(anchor_count) as count 
             FROM account_usage 
             WHERE account_id = $1 AND date >= $2`,
            [accountId, currentMonth + '-01']
        );
        
        const currentCount = parseInt(result.rows[0]?.count) || 0;
        const tier = this.getTierPrice(currentCount + 1); // +1 因为是本次
        
        return {
            price: tier.price,
            tier: tier.name,
            currentCount,
            nextTier: this.getNextTierInfo(currentCount)
        };
    }
    
    // 获取下一阶梯信息（激励提示）
    getNextTierInfo(currentCount) {
        for (const tier of this.tiers) {
            if (currentCount < tier.min) {
                return {
                    threshold: tier.min,
                    price: tier.price,
                    savings: this.calculateSavings(currentCount, tier.min, tier.price)
                };
            }
        }
        return null;
    }
    
    // 计算达到下一阶梯可节省多少
    calculateSavings(currentCount, nextThreshold, nextPrice) {
        const currentTier = this.getTierPrice(currentCount);
        const priceDiff = currentTier.price - nextPrice;
        return {
            perAnchor: priceDiff,
            percentage: ((priceDiff / currentTier.price) * 100).toFixed(1)
        };
    }
    
    // 检查余额是否充足
    async checkBalance(accountId, anchorPrice) {
        const result = await this.pool.query(
            'SELECT balance FROM account_billing WHERE account_id = $1',
            [accountId]
        );
        
        const balance = parseFloat(result.rows[0]?.balance || 0);
        
        return {
            sufficient: balance >= anchorPrice,
            balance,
            required: anchorPrice,
            shortfall: Math.max(0, anchorPrice - balance)
        };
    }
    
    // 扣费
    async charge(accountId, amount, reference) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // 扣减余额
            const updateResult = await client.query(
                `UPDATE account_billing 
                 SET balance = balance - $1 
                 WHERE account_id = $2 AND balance >= $1
                 RETURNING balance`,
                [amount, accountId]
            );
            
            if (updateResult.rowCount === 0) {
                throw new Error('Insufficient balance');
            }
            
            // 记录交易
            await client.query(
                `INSERT INTO transactions (account_id, amount, type, status, reference_id)
                 VALUES ($1, $2, 'anchor', 'completed', $3)`,
                [accountId, -amount, reference]
            );
            
            await client.query('COMMIT');
            
            return {
                success: true,
                charged: amount,
                remainingBalance: parseFloat(updateResult.rows[0].balance)
            };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
    
    // 充值
    async deposit(accountId, amount, paymentMethod = 'stripe') {
        if (amount < this.minDeposit) {
            throw new Error(`Minimum deposit is $${this.minDeposit}`);
        }
        
        if (amount > 10000) {
            throw new Error('Maximum single deposit is $10,000');
        }
        
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            // 创建交易记录
            const transResult = await client.query(
                `INSERT INTO transactions (account_id, amount, type, status, reference_id)
                 VALUES ($1, $2, 'deposit', 'pending', $3)
                 RETURNING id`,
                [accountId, amount, `deposit_${Date.now()}`]
            );
            
            // 增加余额
            await client.query(
                `UPDATE account_billing 
                 SET balance = balance + $1 
                 WHERE account_id = $2`,
                [amount, accountId]
            );
            
            // 标记交易完成（实际应等支付回调）
            await client.query(
                `UPDATE transactions SET status = 'completed' WHERE id = $1`,
                [transResult.rows[0].id]
            );
            
            await client.query('COMMIT');
            
            const balanceResult = await this.pool.query(
                'SELECT balance FROM account_billing WHERE account_id = $1',
                [accountId]
            );
            
            return {
                success: true,
                deposited: amount,
                newBalance: parseFloat(balanceResult.rows[0].balance),
                transactionId: transResult.rows[0].id
            };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
    
    // 获取定价信息（供API展示）
    async getPricingInfo(accountId) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const result = await this.pool.query(
            `SELECT SUM(anchor_count) as count 
             FROM account_usage 
             WHERE account_id = $1 AND date >= $2`,
            [accountId, currentMonth + '-01']
        );
        
        const currentCount = parseInt(result.rows[0]?.count) || 0;
        const currentTier = this.getTierPrice(currentCount);
        const nextTier = this.getNextTierInfo(currentCount);
        
        return {
            tiers: this.tiers.map(t => ({
                name: t.name,
                range: t.max === Infinity ? `${t.min}+` : `${t.min}-${t.max}`,
                price: t.price,
                isCurrent: t.name === currentTier.name
            })),
            current: {
                count: currentCount,
                tier: currentTier.name,
                price: currentTier.price
            },
            nextTier: nextTier ? {
                at: nextTier.threshold,
                price: nextTier.price,
                savePerAnchor: nextTier.savings.perAnchor,
                savePercentage: nextTier.savings.percentage
            } : null,
            minDeposit: this.minDeposit
        };
    }
    
    // 预估费用（批量锚定）
    async estimateBulkCost(accountId, anchorCount) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const result = await this.pool.query(
            `SELECT SUM(anchor_count) as count 
             FROM account_usage 
             WHERE account_id = $1 AND date >= $2`,
            [accountId, currentMonth + '-01']
        );
        
        const currentCount = parseInt(result.rows[0]?.count) || 0;
        let totalCost = 0;
        let breakdown = [];
        
        for (let i = 1; i <= anchorCount; i++) {
            const tier = this.getTierPrice(currentCount + i);
            totalCost += tier.price;
            
            if (i === 1 || i === anchorCount || tier.name !== breakdown[breakdown.length - 1]?.tier) {
                breakdown.push({
                    anchorNumber: currentCount + i,
                    tier: tier.name,
                    price: tier.price
                });
            }
        }
        
        return {
            anchorCount,
            estimatedCost: parseFloat(totalCost.toFixed(4)),
            averagePrice: parseFloat((totalCost / anchorCount).toFixed(4)),
            startingFrom: currentCount + 1,
            breakdown: breakdown.length > 5 ? [...breakdown.slice(0, 3), { omitted: '...' }, ...breakdown.slice(-2)] : breakdown
        };
    }
}

module.exports = { TieredBillingSystem };
