<p align="center">
  <a href="README.zh-CN.md">中文</a> | <strong>English</strong>
</p>

# HJS JavaScript Client

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/hjs-client.svg)](https://www.npmjs.com/package/hjs-client)

JavaScript client for [HJS API](https://hjs-api.onrender.com) — a responsibility tracing service.

...

## 📦 Installation

### From GitHub (current)
```bash
npm install https://github.com/schchit/hjs-api/tree/main/client-js
```

## 🚀 Quick Start

```javascript
const HJSClient = require('hjs-client');

const client = new HJSClient('https://hjs-api.onrender.com');

async function example() {
  // Record a judgment
  const record = await client.recordJudgment(
    'alice@bank.com',
    'loan_approved',
    { amount: 100000 }
  );
  console.log('✅ Recorded:', record);

  // Retrieve it
  const judgment = await client.getJudgment(record.id);
  console.log('✅ Retrieved:', judgment);
}

example();
```

## 📚 API

### `new HJSClient(baseURL)`
Create a new client. `baseURL` defaults to `https://hjs-api.onrender.com`.

### `recordJudgment(entity, action, scope)`
Record a judgment. Returns `{ id, status, timestamp }`.

### `getJudgment(id)`
Get a judgment by ID.

## 🧪 Test

```bash
cd /workspaces/hjs-api/test-client
node test.js
```

Expected output:

```
✅ 记录成功: { id: 'jgd_...', status: 'recorded', timestamp: '...' }
✅ 查询成功: { id: 'jgd_...', entity: 'test@example.com', action: 'test_action', ... }
```
