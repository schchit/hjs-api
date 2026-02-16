<p align="center">
  <strong>中文</strong> | <a href="README.md">English</a>
</p>

# HJS JavaScript 客户端

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

适用于 [HJS API](https://hjs-api.onrender.com) 的 JavaScript 客户端库 — 一个责任追溯服务。

## 📦 安装

### 从 GitHub 安装（当前）
```bash
npm install https://github.com/schchit/hjs-api/tree/main/client-js
```

## 🚀 快速开始

```javascript
const HJSClient = require('hjs-client');

const client = new HJSClient('https://hjs-api.onrender.com');

async function example() {
  // 记录一次判断
  const record = await client.recordJudgment(
    'alice@bank.com',
    'loan_approved',
    { amount: 100000 }
  );
  console.log('✅ 记录成功:', record);

  // 根据 ID 查询
  const judgment = await client.getJudgment(record.id);
  console.log('✅ 查询成功:', judgment);
}

example();
```

## 📚 API 说明

### `new HJSClient(baseURL)`
创建客户端实例。`baseURL` 默认指向 `https://hjs-api.onrender.com`。

### `recordJudgment(entity, action, scope)`
记录一次判断。返回 `{ id, status, timestamp }`。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `entity` | string | ✅ | 做出判断的主体 |
| `action` | string | ✅ | 判断的动作 |
| `scope` | object | ❌ | 附加信息（如金额、权限等） |

### `getJudgment(id)`
根据 ID 获取判断记录。

## 🧪 测试

```bash
cd /workspaces/hjs-api/test-client
node test.js
```

预期输出：

```
✅ 记录成功: { id: 'jgd_...', status: 'recorded', timestamp: '...' }
✅ 查询成功: { id: 'jgd_...', entity: 'test@example.com', action: 'test_action', ... }
```
## 📘 TypeScript 使用示例

客户端包含完整的 TypeScript 类型定义。以下是一个完整的示例：

### 安装

```bash
npm install /workspaces/hjs-api/client-js
# 或发布后：
# npm install hjs-client
```

### 示例代码

```typescript
import HJSClient from 'hjs-client';

const client = new HJSClient('https://hjs-api.onrender.com');

async function runTest() {
  try {
    // 记录一次判断
    console.log('🧪 测试 recordJudgment...');
    const record = await client.recordJudgment(
      'test@example.com',
      'test_action',
      { test: true, source: 'typescript-test' }
    );
    
    console.log('✅ 记录成功:', record);
    console.log('   ID:', record.id);
    console.log('   状态:', record.status);  // TypeScript 知道这里只能是 'recorded'

    // 查询判断记录
    console.log('\n🧪 测试 getJudgment...');
    const judgment = await client.getJudgment(record.id);
    
    console.log('✅ 查询成功:', judgment);
    console.log('   主体:', judgment.entity);
    console.log('   动作:', judgment.action);
    console.log('   范围:', judgment.scope);
    console.log('   记录时间:', judgment.recorded_at);

  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ 测试失败:', error.message);
    }
  }
}

runTest();
```

### 预期输出

```
🧪 测试 recordJudgment...
✅ 记录成功: { id: 'jgd_...', status: 'recorded', timestamp: '...' }

🧪 测试 getJudgment...
✅ 查询成功: { 
  id: 'jgd_...', 
  entity: 'test@example.com', 
  action: 'test_action', 
  scope: { test: true, source: 'typescript-test' },
  timestamp: '...', 
  recorded_at: '...' 
}
```

### 类型定义

客户端导出以下类型：

```typescript
interface JudgmentRecord {
  id: string
  status: 'recorded'
  timestamp: string
}

interface FullJudgment extends JudgmentRecord {
  entity: string
  action: string
  scope: Record<string, any>
  recorded_at: string
}
```