# HJS JavaScript 客户端

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
