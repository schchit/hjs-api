<p align="center">
  <a href="README.zh-CN.md">中文</a> | <strong>English</strong>
</p>

# HJS JavaScript Client

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

JavaScript client for [HJS API](https://api.hjs.sh) — A Protocol for Structural Traceability.

Implements all 4 core primitives: **Judgment**, **Delegation**, **Termination**, **Verification**.

## 📦 Installation

```bash
npm install hjs-client
```

## 🚀 Quick Start

```javascript
const HJSClient = require('hjs-client');

const client = new HJSClient({ 
  baseURL: 'https://api.hjs.sh',
  apiKey: 'your-api-key'  // Optional
});

async function example() {
  // 1. Record a judgment
  const record = await client.judgment({
    entity: 'alice@bank.com',
    action: 'loan_approved',
    scope: { amount: 100000 }
  });
  console.log('✅ Judgment recorded:', record.id);

  // 2. Create a delegation
  const delegation = await client.delegation({
    delegator: 'manager@company.com',
    delegatee: 'employee@company.com',
    scope: { permissions: ['approve_under_1000'] }
  });
  console.log('✅ Delegation created:', delegation.id);

  // 3. Verify any record
  const verify = await client.verify(delegation.id);
  console.log('✅ Verification result:', verify.status);  // 'VALID' or 'INVALID'
}

example();
```

## 📚 API Reference

### Constructor

```javascript
const client = new HJSClient(options);
```

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseURL` | string | `'https://api.hjs.sh'` | API base URL |
| `apiKey` | string | `null` | API key for authentication |

---

### Core Primitives

#### 1. Judgment — Record structured decisions

```javascript
const result = await client.judgment({
  entity: 'user@example.com',    // Required: who is making the judgment
  action: 'approve',              // Required: what action
  scope: { amount: 1000 },       // Optional: additional context
  immutability: { type: 'ots' }  // Optional: anchor to blockchain
});
```

**Returns:**
```javascript
{
  id: 'jgd_1234567890abcd',
  status: 'recorded',
  protocol: 'HJS/1.0',
  timestamp: '2026-02-23T12:00:00.000Z',
  immutability_anchor: {
    type: 'ots',
    reference: '...',
    anchored_at: '...'
  }
}
```

#### 2. Delegation — Transfer authority

```javascript
const result = await client.delegation({
  delegator: 'manager@company.com',   // Required: who delegates
  delegatee: 'employee@company.com',  // Required: who receives
  judgmentId: 'jgd_xxx',              // Optional: linked judgment
  scope: { permissions: ['approve'] }, // Optional: delegation scope
  expiry: '2026-12-31T23:59:59Z'      // Optional: expiration time
});
```

**Returns:**
```javascript
{
  id: 'dlg_1234567890abcd',
  status: 'active',
  delegator: 'manager@company.com',
  delegatee: 'employee@company.com',
  scope: { permissions: ['approve'] },
  created_at: '2026-02-23T12:00:00.000Z'
}
```

#### 3. Termination — End responsibility

```javascript
const result = await client.termination({
  terminator: 'admin@company.com',     // Required: who terminates
  targetId: 'dlg_1234567890abcd',      // Required: what to terminate
  targetType: 'delegation',            // Required: 'judgment' or 'delegation'
  reason: 'Employee left company'      // Optional: reason for termination
});
```

**Returns:**
```javascript
{
  id: 'trm_1234567890abcd',
  terminator: 'admin@company.com',
  target_id: 'dlg_1234567890abcd',
  target_type: 'delegation',
  reason: 'Employee left company',
  created_at: '2026-02-23T12:00:00.000Z'
}
```

#### 4. Verification — Validate records

```javascript
// Method 1: Detailed verification
const result = await client.verification({
  verifier: 'auditor@company.com',
  targetId: 'dlg_1234567890abcd',
  targetType: 'delegation'  // 'judgment', 'delegation', or 'termination'
});

// Method 2: Quick verify (auto-detects type from ID)
const result = await client.verify('dlg_1234567890abcd');
```

**Returns:**
```javascript
{
  id: 'vfy_1234567890abcd',
  result: 'VALID',  // or 'INVALID'
  details: {
    valid: true,
    delegation: {...},
    judgment: {...}
  },
  verified_at: '2026-02-23T12:00:00.000Z'
}
```

---

### Query Methods

#### Get single record

```javascript
const judgment = await client.getJudgment('jgd_xxx');
const delegation = await client.getDelegation('dlg_xxx');
const termination = await client.getTermination('trm_xxx');
```

#### List records

```javascript
// List judgments
const judgments = await client.listJudgments({
  entity: 'user@example.com',
  page: 1,
  limit: 20
});

// List delegations
const delegations = await client.listDelegations({
  delegator: 'manager@company.com',
  status: 'active'
});
```

---

### Utility Methods

#### Health check

```javascript
const health = await client.health();
// Returns: { status: 'healthy', version: '1.0.0', ... }
```

#### API documentation

```javascript
const docs = await client.docs();
// Returns complete API documentation
```

#### Generate API key

```javascript
const key = await client.generateKey('user@example.com', 'my-app');
// Returns: { key: '...', email: '...', created: '...' }
```

---

## 🧪 Testing

```bash
# Clone the repository
git clone https://github.com/schchit/hjs-api.git
cd hjs-api/client-js

# Run tests
node test.js
```

## 🌐 Browser Usage

The SDK works in both Node.js and browsers:

```html
<script src="https://cdn.jsdelivr.net/npm/hjs-client@latest"></script>
<script>
  const client = new HJSClient({ apiKey: 'your-key' });
  
  client.judgment({
    entity: 'user@example.com',
    action: 'test'
  }).then(result => {
    console.log('Recorded:', result.id);
  });
</script>
```

## 📄 License

MIT License — see [LICENSE](../LICENSE) for details.
