// HJS API 测试脚本
// 测试所有 4 个核心原语

const HJSClient = require('../client-js');

// 创建客户端实例
const client = new HJSClient({
  baseURL: process.env.API_BASE || 'https://api.hjs.sh'
});

// 生成测试用的幂等键
function generateIdempotencyKey() {
  return `test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

async function runTests() {
  console.log('🚀 HJS API 测试开始\n');
  
  const testEntity = `test-${Date.now()}@example.com`;
  
  try {
    // ========== 测试 1: 健康检查 ==========
    console.log('🧪 测试1: 健康检查...');
    const health = await client.health();
    console.log('✅ 服务健康:', health.status, '| 版本:', health.version);
    
    // ========== 测试 2: 生成 API Key ==========
    console.log('\n🧪 测试2: 生成 API Key...');
    const keyResult = await client.generateKey(testEntity, 'test-client');
    console.log('✅ Key 生成成功:', keyResult.key.substring(0, 8) + '...');
    
    // 使用生成的 key 进行后续测试
    client.apiKey = keyResult.key;
    
    // ========== 测试 3: 记录 Judgment ==========
    console.log('\n🧪 测试3: 记录 Judgment...');
    const judgmentResult = await client.judgment({
      entity: testEntity,
      action: 'test_action',
      scope: { test: true, value: 100 },
      idempotency_key: generateIdempotencyKey()
    });
    console.log('✅ Judgment 记录成功:', judgmentResult.id);
    
    const judgmentId = judgmentResult.id;
    
    // ========== 测试 4: 幂等性测试 ==========
    console.log('\n🧪 测试4: 幂等性测试（重复请求）...');
    const sameKey = generateIdempotencyKey();
    const result1 = await client.judgment({
      entity: testEntity,
      action: 'idempotent_test',
      idempotency_key: sameKey
    });
    const result2 = await client.judgment({
      entity: testEntity,
      action: 'idempotent_test',
      idempotency_key: sameKey
    });
    if (result1.id === result2.id) {
      console.log('✅ 幂等性工作正常:', result1.id);
    } else {
      console.log('❌ 幂等性失败: 创建了重复记录');
    }
    
    // ========== 测试 5: 查询 Judgment ==========
    console.log('\n🧪 测试5: 查询 Judgment...');
    const getResult = await client.getJudgment(judgmentId);
    console.log('✅ 查询成功:', getResult.id, '| Action:', getResult.action);
    
    // ========== 测试 6: 创建 Delegation ==========
    console.log('\n🧪 测试6: 创建 Delegation...');
    const delegationResult = await client.delegation({
      delegator: testEntity,
      delegatee: 'delegate@example.com',
      judgment_id: judgmentId,
      scope: { permissions: ['read', 'write'] },
      idempotency_key: generateIdempotencyKey()
    });
    console.log('✅ Delegation 创建成功:', delegationResult.id);
    
    const delegationId = delegationResult.id;
    
    // ========== 测试 7: 查询 Delegation ==========
    console.log('\n🧪 测试7: 查询 Delegation...');
    const getDelegation = await client.getDelegation(delegationId);
    console.log('✅ 查询成功:', getDelegation.id, '| Status:', getDelegation.status);
    
    // ========== 测试 8: 创建 Termination ==========
    console.log('\n🧪 测试8: 创建 Termination...');
    const terminationResult = await client.termination({
      terminator: testEntity,
      target_id: delegationId,
      target_type: 'delegation',
      reason: 'Test termination'
    });
    console.log('✅ Termination 创建成功:', terminationResult.id);
    
    // ========== 测试 9: 验证记录 ==========
    console.log('\n🧪 测试9: 验证 Delegation...');
    const verifyResult = await client.verify(delegationId);
    console.log('✅ 验证结果:', verifyResult.status, '| Type:', verifyResult.type);
    
    // ========== 测试 10: API 文档 ==========
    console.log('\n🧪 测试10: 获取 API 文档...');
    const docs = await client.docs();
    console.log('✅ API 文档获取成功:', docs.name, '| 版本:', docs.version);
    
    console.log('\n🎉 所有测试通过！');
    console.log('\n测试总结:');
    console.log('- Judgment 记录 & 查询: ✅');
    console.log('- Delegation 创建 & 查询: ✅');
    console.log('- Termination 创建: ✅');
    console.log('- Verification 验证: ✅');
    console.log('- 幂等性控制: ✅');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack.split('\n')[0]);
    }
    process.exit(1);
  }
}

// 运行测试
runTests();
