import HJSClient from 'hjs-client';

// 测试：创建客户端实例（应该有类型提示）
const client = new HJSClient('https://hjs-api.onrender.com');

async function runTest() {
  try {
    // 测试1：recordJudgment 应该有完整的参数提示
    console.log('🧪 测试 recordJudgment...');
    const record = await client.recordJudgment(
      'test@example.com',
      'test_action',
      { test: true, source: 'typescript-test' }
    );
    
    // 这里应该有 JudgmentRecord 类型提示
    console.log('✅ 记录成功:', record);
    console.log('   ID:', record.id);           // 应该有 string 提示
    console.log('   状态:', record.status);      // 应该只能为 'recorded'

    // 测试2：getJudgment 应该返回 FullJudgment 类型
    console.log('\n🧪 测试 getJudgment...');
    const judgment = await client.getJudgment(record.id);
    
    // 这里应该有 FullJudgment 类型提示
    console.log('✅ 查询成功:', judgment);
    console.log('   主体:', judgment.entity);    // string
    console.log('   动作:', judgment.action);    // string
    console.log('   范围:', judgment.scope);     // Record<string, any>
    console.log('   记录时间:', judgment.recorded_at); // string

  } catch (error) {
    // error 应该是 unknown 类型，需要处理
    if (error instanceof Error) {
      console.error('❌ 测试失败:', error.message);
    } else {
      console.error('❌ 未知错误:', error);
    }
  }
}

runTest();