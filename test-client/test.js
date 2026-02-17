// 引入你的客户端库
const HJSClient = require('hjs-client');

// 创建客户端实例（指向你的 Render API）
const client = new HJSClient('https://hjs-api.onrender.com');

async function runTests() {
  try {
    console.log('🧪 测试1: 记录一条判断...');
    const recordResult = await client.recordJudgment(
      'test@example.com',
      'test_action',
      { test: true, timestamp: Date.now() }
    );
    console.log('✅ 记录成功:', recordResult);

    const judgmentId = recordResult.id;

    console.log('\n🧪 测试2: 根据 ID 查询判断...');
    const getResult = await client.getJudgment(judgmentId);
    console.log('✅ 查询成功:', getResult);

    console.log('\n🎉 所有测试通过！');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

runTests();