// HJS API 快速修复脚本
// 修复部署问题

console.log('🔧 HJS API Deployment Fix');
console.log('==========================\n');

const fixes = {
    // 问题1: v1 API 需要 account_id 字段
    issue1: {
        description: 'v1 API requires account_id column',
        check: `SELECT column_name FROM information_schema.columns 
                WHERE table_name='judgments' AND column_name='account_id'`,
        fix: `ALTER TABLE judgments ADD COLUMN IF NOT EXISTS account_id VARCHAR(50);
              ALTER TABLE delegations ADD COLUMN IF NOT EXISTS account_id VARCHAR(50);
              ALTER TABLE terminations ADD COLUMN IF NOT EXISTS account_id VARCHAR(50);`
    },
    
    // 问题2: 旧数据需要默认account_id
    issue2: {
        description: 'Old records need default account_id',
        check: `SELECT COUNT(*) FROM judgments WHERE account_id IS NULL`,
        fix: `UPDATE judgments SET account_id = 'acct_legacy' WHERE account_id IS NULL;
              UPDATE delegations SET account_id = 'acct_legacy' WHERE account_id IS NULL;
              UPDATE terminations SET account_id = 'acct_legacy' WHERE account_id IS NULL;`
    },
    
    // 问题3: 检查accounts表
    issue3: {
        description: 'Check accounts table exists',
        check: `SELECT COUNT(*) FROM information_schema.tables WHERE table_name='accounts'`,
        fix: `CREATE TABLE IF NOT EXISTS accounts (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                plan VARCHAR(20) DEFAULT 'free',
                created_at TIMESTAMPTZ DEFAULT NOW()
              );`
    }
};

console.log('Execute these SQL commands in your database:\n');

Object.values(fixes).forEach((fix, index) => {
    console.log(`${index + 1}. ${fix.description}`);
    console.log('   Check:', fix.check);
    console.log('   Fix:', fix.fix);
    console.log('');
});

console.log('After running fixes, restart your service.');
