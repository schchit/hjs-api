<p align="center">
  <a href="README.zh-CN.md">中文</a> | <strong>English</strong>
</p>

# HJS: Structural Traceability Protocol

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Spec: CC0 1.0](https://img.shields.io/badge/Spec-CC0_1.0-lightgrey.svg)](https://creativecommons.org/publicdomain/zero/1.0/)
[![Deployed on Render](https://img.shields.io/badge/Deployed%20on-Render-blue)](https://render.com)

**Implementation layer API service.** A reference implementation for recording structured events, based on the HJS protocol family.  
**Protocol specification** is available in the [`/spec`](spec/) directory, licensed under CC0 1.0.

**Base URL:** `https://api.hjs.sh`

---

## 📖 About

This project is the first implementation layer service of the [HJS Protocol Family](https://github.com/hjs-spec/spec). It implements the **4 core primitives** from the HJS protocol:

1. **Judgment** — Record structured decisions
2. **Delegation** — Transfer authority with scope and expiry
3. **Termination** — End responsibility chains
4. **Verification** — Validate record integrity and chains

HJS protocols are governed by the [Human Judgment Systems Foundation Ltd.](https://humanjudgment.org) (Singapore CLG).

> **Protocol Boundary**: HJS defines structural traceability primitives. It does not determine legal or ethical responsibility. All responsibility determinations must be made by external systems or legal procedures.

---

## 📦 SDKs

### Python
```bash
pip install hjs-client
```

```python
from hjs import HJSClient

# Record a judgment
with HJSClient(api_key="your_key") as client:
    result = client.judgment(
        entity="user@example.com",
        action="approve",
        scope={"amount": 1000}
    )
    print(result['id'])  # jgd_1234567890abcd
```

### Node.js
```bash
npm install hjs-client
```

```javascript
const HJSClient = require('hjs-client');

const client = new HJSClient({ apiKey: 'your_key' });

// Record a judgment
const result = await client.judgment({
  entity: 'user@example.com',
  action: 'approve',
  scope: { amount: 1000 }
});

console.log(result.id);  // jgd_1234567890abcd
```

For more examples, see:
- [Python SDK](client-py/README.md)
- [Node.js SDK](client-js/README.md)

---

## 🚀 Quick Start

### 1. Get an API Key

Visit the [Developer Console](https://console.hjs.sh) to generate an API key with your email.

### 2. Use the SDK (Recommended)

```bash
# Python
pip install hjs-client

# Node.js
npm install hjs-client
```

### 3. Or use HTTP API directly

```bash
# Record a judgment
curl -X POST https://api.hjs.sh/judgments \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"entity": "alice@bank.com", "action": "loan_approved", "scope": {"amount": 100000}}'
```

### 4. Try it online

Visit the [Public Lookup](https://lookup.hjs.sh) page to query records without any setup.

---

## 🏗️ The 4 Core Primitives

### 1. Judgment — Record Structured Decisions

```bash
POST /judgments
```

```json
{
  "entity": "user@example.com",
  "action": "approve",
  "scope": {"amount": 1000, "currency": "USD"},
  "immutability": {"type": "ots"}
}
```

**Response:**
```json
{
  "id": "jgd_1234567890abcd",
  "status": "recorded",
  "protocol": "HJS/1.0",
  "timestamp": "2026-02-23T12:00:00.000Z",
  "immutability_anchor": {
    "type": "ots",
    "reference": "...",
    "anchored_at": "..."
  }
}
```

### 2. Delegation — Transfer Authority

```bash
POST /delegations
```

```json
{
  "delegator": "manager@company.com",
  "delegatee": "employee@company.com",
  "judgment_id": "jgd_xxx",
  "scope": {"permissions": ["approve_under_1000"]},
  "expiry": "2026-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "id": "dlg_1234567890abcd",
  "status": "active",
  "delegator": "manager@company.com",
  "delegatee": "employee@company.com",
  "scope": {"permissions": ["approve_under_1000"]},
  "expiry": "2026-12-31T23:59:59Z",
  "created_at": "2026-02-23T12:00:00.000Z"
}
```

### 3. Termination — End Responsibility

```bash
POST /terminations
```

```json
{
  "terminator": "admin@company.com",
  "target_id": "dlg_1234567890abcd",
  "target_type": "delegation",
  "reason": "Employee left company"
}
```

**Response:**
```json
{
  "id": "trm_1234567890abcd",
  "terminator": "admin@company.com",
  "target_id": "dlg_1234567890abcd",
  "target_type": "delegation",
  "reason": "Employee left company",
  "created_at": "2026-02-23T12:00:00.000Z"
}
```

### 4. Verification — Validate Records

```bash
# Method 1: Detailed verification
POST /verifications
```

```json
{
  "verifier": "auditor@company.com",
  "target_id": "dlg_1234567890abcd",
  "target_type": "delegation"
}
```

**Response:**
```json
{
  "id": "vfy_1234567890abcd",
  "result": "VALID",
  "details": {
    "valid": true,
    "delegation": {...},
    "judgment": {...}
  },
  "verified_at": "2026-02-23T12:00:00.000Z"
}
```

```bash
# Method 2: Quick verify (auto-detect type)
POST /verify
```

```json
{"id": "dlg_1234567890abcd"}
```

**Response:**
```json
{
  "id": "dlg_1234567890abcd",
  "type": "delegation",
  "status": "VALID"
}
```

---

## 📚 API Reference

### Authentication

All API endpoints require an API key. Include it in the request header:

```
X-API-Key: your-api-key-here
```

To get an API key, visit the [Developer Console](https://console.hjs.sh).

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/judgments` | POST/GET | Record/List judgments |
| `/judgments/{id}` | GET | Retrieve a judgment |
| `/delegations` | POST/GET | Create/List delegations |
| `/delegations/{id}` | GET | Retrieve a delegation |
| `/terminations` | POST/GET | Create/List terminations |
| `/terminations/{id}` | GET | Retrieve a termination |
| `/verifications` | POST/GET | Verify/List verifications |
| `/verify` | POST | Quick verify (auto-detect) |

### Utility Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/docs` | GET | API documentation |
| `/developer/keys` | POST/GET | Generate/List API keys |

### Immutability Anchoring

Each record **may** include an optional immutability anchor:

```json
"immutability": {
  "type": "ots",
  "options": {}
}
```

Types:
- **`ots`**: Anchor to Bitcoin blockchain via OpenTimestamps
- **`none`**: No anchoring (default)

---

## 📄 License

This project uses a **dual-license strategy** to maximize adoption while keeping the protocol open.

### Protocol Specification
The protocol definition in the [`/spec`](spec/) directory is released under the **CC0 1.0 Universal** license, placing it in the public domain.

### Reference Implementation
The reference implementation is licensed under the **MIT License**, allowing maximum adoption and integration into any project, including commercial applications.

---

## 🔗 Links

- **Website**: https://humanjudgment.services
- **API Documentation**: https://api.hjs.sh/api/docs
- **Health Check**: https://api.hjs.sh/health
- **Developer Console**: https://console.hjs.sh
- **GitHub**: https://github.com/schchit/hjs-api

---

## ⚠️ Without Traceable Records

See what happens when decisions aren't recorded — [real-world cases](https://humanjudgment.services/cases.html).
