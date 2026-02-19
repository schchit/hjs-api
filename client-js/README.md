<p align="center">
  <a href="README.zh-CN.md">中文</a> | <strong>English</strong>
</p>

# HJS JavaScript Client

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

JavaScript client for [HJS API](https://hjs-api.onrender.com) — A Protocol for Structural Traceability.

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
## 📘 TypeScript Usage

The client includes full TypeScript type definitions. Here's a complete example:

### Installation

```bash
npm install /workspaces/hjs-api/client-js
# or when published:
# npm install hjs-client
```

### Example Code

```typescript
import HJSClient from 'hjs-client';

const client = new HJSClient('https://hjs-api.onrender.com');

async function runTest() {
  try {
    // Record a judgment
    console.log('🧪 Testing recordJudgment...');
    const record = await client.recordJudgment(
      'test@example.com',
      'test_action',
      { test: true, source: 'typescript-test' }
    );
    
    console.log('✅ Recorded:', record);
    console.log('   ID:', record.id);
    console.log('   Status:', record.status);  // TypeScript knows this is 'recorded'

    // Retrieve the judgment
    console.log('\n🧪 Testing getJudgment...');
    const judgment = await client.getJudgment(record.id);
    
    console.log('✅ Retrieved:', judgment);
    console.log('   Entity:', judgment.entity);
    console.log('   Action:', judgment.action);
    console.log('   Scope:', judgment.scope);
    console.log('   Recorded at:', judgment.recorded_at);

  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Test failed:', error.message);
    }
  }
}

runTest();
```

### Expected Output

```
🧪 Testing recordJudgment...
✅ Recorded: { id: 'jgd_...', status: 'recorded', timestamp: '...' }

🧪 Testing getJudgment...
✅ Retrieved: { 
  id: 'jgd_...', 
  entity: 'test@example.com', 
  action: 'test_action', 
  scope: { test: true, source: 'typescript-test' },
  timestamp: '...', 
  recorded_at: '...' 
}
```

### Type Definitions

The client exports the following types:

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
```git add README.md
