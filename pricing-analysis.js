// HJS 定价方案对比

const COST_CHAIN = 0.0001;  // 链上成本 ~$0.0001/次
const COST_SERVER_MONTHLY = 50;  // 服务器月成本 ~$50

// 方案对比
const pricingOptions = {
    current: {
        name: "当前定价",
        anchorPrice: 0.03,
        description: "高毛利，快速回本"
    },
    option1: {
        name: "方案1：低价走量",
        anchorPrice: 0.01,
        description: "薄利多销，扩大市场"
    },
    option2: {
        name: "方案2：接近成本",
        anchorPrice: 0.005,
        description: "量大取胜，生态优先"
    },
    option3: {
        name: "方案3：分级定价",
        anchorPrice: "0.01-0.03",
        description: "阶梯价格，用得越多越便宜"
    }
};

// 计算各方案指标
function calculateMetrics(price) {
    const grossProfit = price - COST_CHAIN;
    const grossMargin = (grossProfit / price * 100).toFixed(1);
    const breakEvenVolume = Math.ceil(COST_SERVER_MONTHLY / grossProfit);
    
    return {
        price,
        cost: COST_CHAIN,
        grossProfit: grossProfit.toFixed(4),
        grossMargin: grossMargin + '%',
        breakEvenVolume: breakEvenVolume.toLocaleString() + '次/月',
        breakEvenDaily: Math.ceil(breakEvenVolume / 30) + '次/天'
    };
}

console.log('HJS 定价方案对比分析');
console.log('====================\n');

console.log('【方案1】低价走量（推荐）');
console.log('锚定价格: $0.01/次');
console.log('链上成本: $0.0001/次');
console.log('毛利: $0.0099/次');
console.log('毛利率: 99.0%');
console.log('盈亏平衡: 5,051次/月 (169次/天)');
console.log('优点: 价格合理，容易推广');
console.log('缺点: 毛利率仍极高\n');

console.log('【方案2】成本定价');
console.log('锚定价格: $0.005/次');
console.log('链上成本: $0.0001/次');
console.log('毛利: $0.0049/次');
console.log('毛利率: 98.0%');
console.log('盈亏平衡: 10,204次/月 (340次/天)');
console.log('优点: 极具竞争力');
console.log('缺点: 需要更大销量\n');

console.log('【推荐方案】阶梯定价');
console.log('0-100次: $0.03/次 (体验价)');
console.log('101-1000次: $0.02/次 (标准价)');
console.log('1001-10000次: $0.01/次 (批量价)');
console.log('10000+次: $0.005/次 (批发价)');
console.log('平均毛利率: ~95%');
console.log('优点: 照顾小用户，奖励大用户');
console.log('缺点: 定价复杂\n');

console.log('====================');
console.log('无论怎么定价，毛利率都在95%+');
console.log('这是因为链上成本极低 (~$0.0001)');
console.log('建议采用阶梯定价，平衡各方利益');
