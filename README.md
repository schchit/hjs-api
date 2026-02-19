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

This project is the first implementation layer service of the [HJS Protocol Family](https://github.com/hjs-spec/spec). It implements the **Judgment** primitive from the HJS core protocol, providing a REST API for recording and tracing structured events in automated systems.

HJS protocols are governed by the [Human Judgment Systems Foundation Ltd.](https://humanjudgment.org) (Singapore CLG).

> **Protocol Boundary**: HJS defines structural traceability primitives. It does not determine legal or ethical responsibility. All responsibility determinations must be made by external systems or legal procedures.

---

## 📦 SDKs

### Python
```bash
pip install hjs-client
```

### Node.js
```bash
npm install hjs-client
```

For usage examples, see the respective SDK directories:
- [Python SDK](client-py/README.md)
- [Node.js SDK](client-js/README.md)

---

## 📄 License

This project uses a **dual-license strategy** to maximize adoption while keeping the protocol open.

### Protocol Specification
The protocol definition in the [`/spec`](spec/) directory is released under the **CC0 1.0 Universal** license, placing it in the public domain. This ensures anyone can implement the protocol without restrictions.

[![License: CC0 1.0](https://img.shields.io/badge/License-CC0_1.0-lightgrey.svg)](https://creativecommons.org/publicdomain/zero/1.0/)

### Reference Implementation
The reference implementation (this codebase) is licensed under the **MIT License**, allowing maximum adoption and integration into any project, including commercial applications.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Full license texts:
- [MIT License](LICENSE)
- [CC0 1.0 Universal](spec/LICENSE)

---

## 🚀 Quick Start

### 1. Get an API Key

Visit the [Developer Console](https://console.hjs.sh) to generate an API key with your email.

### 2. Record a judgment

```bash
curl -X POST https://api.hjs.sh/judgments \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"entity": "alice@bank.com", "action": "loan_approved", "scope": {"amount": 100000}}'
```

**Example response**:
```json
{
  "id": "jgd_1742318412345_abc1",
  "status": "recorded",
  "protocol": "HJS/1.0",
  "timestamp": "2026-02-16T09:30:15.123Z"
}
```

### 3. Retrieve a judgment

```bash
curl https://api.hjs.sh/judgments/jgd_1742318412345_abc1 \
  -H "X-API-Key: your-api-key"
```

**Example response**:
```json
{
  "id": "jgd_1742318412345_abc1",
  "entity": "alice@bank.com",
  "action": "loan_approved",
  "scope": {"amount": 100000},
  "timestamp": "2026-02-16T09:30:15.083Z",
  "recorded_at": "2026-02-16T09:30:15.123Z",
  "immutability_anchor": {
    "type": "none"
  }
}
```

### 4. Try it online

Visit the [Public Lookup](https://lookup.hjs.sh) page to query records without any setup.

---

## ⚠️ Without Traceable Records

See what happens when decisions aren't recorded — [real-world cases](https://humanjudgment.services/cases.html).

---

## 📚 API Reference

### Authentication

All API endpoints require an API key. Include it in the request header:

```
X-API-Key: your-api-key-here
```

To get an API key, visit the [Developer Console](https://console.hjs.sh).

---

### Record a judgment

`POST /judgments`

**Headers**:
- `Content-Type: application/json`
- `X-API-Key`: Your API key

**Request body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entity` | string | Yes | Identifier of the entity making the judgment |
| `action` | string | Yes | The action being judged |
| `scope` | object | No | Scope of the judgment |
| `timestamp` | string | No | Judgment time (ISO 8601). Server time used if omitted |
| `immutability` | object | No | Optional anchoring strategy (see below) |

### Immutability Anchoring

Each record **may** include an optional immutability anchor. Specify via the `immutability` field:

```json
"immutability": {
  "type": "ots",      // options: ots, merkle, trusted_timestamp, none
  "options": {}       // type-specific optional parameters
}
```

- **`ots`**: Anchor to Bitcoin blockchain via OpenTimestamps (official reference implementation)
- **`merkle`**: Batch anchoring via Merkle tree (requires custom implementation)
- **`trusted_timestamp`**: Use a trusted third-party timestamp service (requires custom implementation)
- **`none`**: No anchoring (default)

If the `immutability` field is omitted, the default is `none`.

**Response includes anchoring information**:

```json
"immutability_anchor": {
  "type": "ots",              // actual anchor type used
  "reference": "...",         // optional type-specific reference
  "anchored_at": "..."        // optional anchoring time (only when available)
}
```

**Response**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique credential ID for this judgment |
| `status` | string | Always `recorded` |
| `protocol` | string | Protocol version (HJS/1.0) |
| `timestamp` | string | When the record was stored |

---

### Retrieve a judgment

`GET /judgments/{id}`

**Headers**:
- `X-API-Key`: Your API key

**Path parameters**:
- `id`: The unique credential ID returned from a POST request

**Response**: The complete judgment record object, including anchoring information.

---

### Export as JSON

`GET /judgments/{id}?format=json`

**Headers**:
- `X-API-Key`: Your API key

Download the judgment record as a JSON file.

**Example**:
```bash
curl -X GET "https://api.hjs.sh/judgments/jgd_1234567890abc?format=json" \
  -H "X-API-Key: your-api-key" \
  --output record.json
```

---

### Export as PDF

`GET /judgments/{id}?format=pdf`

**Headers**:
- `X-API-Key`: Your API key

Download a formatted PDF containing:
- Complete judgment details
- QR code linking to the online verification page
- Record hash (SHA-256)
- Anchoring status
- Verification instructions

**Example**:
```bash
curl -X GET "https://api.hjs.sh/judgments/jgd_1234567890abc?format=pdf" \
  -H "X-API-Key: your-api-key" \
  --output record.pdf
```

---

### Download Anchor Proof

`GET /judgments/:id/immutability-proof`

**Headers**:
- `X-API-Key`: Your API key

Returns the proof file corresponding to the record's anchor type:
- `ots` → `.ots` file (Content-Type: `application/vnd.opentimestamps.ots`)
- Other types → generic binary or JSON
- If the record has no proof (`type: none`), returns 404

**Example**:
```bash
curl -X GET "https://api.hjs.sh/judgments/jgd_1234567890abc/immutability-proof" \
  -H "X-API-Key: your-api-key" \
  --output record.proof
```

For backward compatibility, the old `/proof` endpoint automatically redirects to the new one.

---

### List judgments with filters

`GET /judgments`

**Headers**:
- `X-API-Key`: Your API key

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `entity` | string | Filter by entity (exact match) |
| `from` | string | Start time (ISO 8601) |
| `to` | string | End time (ISO 8601) |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20, max: 100) |

**Example Request**:

```bash
curl "https://api.hjs.sh/judgments?entity=alice@bank.com&limit=5&page=1" \
  -H "X-API-Key: your-api-key"
```

**Example Response**:

```json
{
  "page": 1,
  "limit": 5,
  "total": 42,
  "data": [
    {
      "id": "jgd_1742318412345_abc1",
      "entity": "alice@bank.com",
      "action": "loan_approved",
      "scope": {"amount": 100000},
      "timestamp": "2026-02-16T09:30:15.083Z",
      "recorded_at": "2026-02-16T09:30:15.123Z",
      "immutability_anchor": {
        "type": "none"
      }
    }
  ]
}
```

---

### Export list as JSON

`GET /judgments?format=json` (plus any filters)

**Headers**:
- `X-API-Key`: Your API key

Download the filtered judgment list as a JSON file, including pagination metadata.

**Example**:
```bash
curl -X GET "https://api.hjs.sh/judgments?entity=test&limit=5&format=json" \
  -H "X-API-Key: your-api-key" \
  --output judgments.json
```

---

### Error Responses

| Status Code | Description |
|-------------|-------------|
| `400` | Missing required fields |
| `401` | Missing or invalid API key |
| `404` | Judgment ID not found |
| `429` | Rate limit exceeded |
| `500` | Server error |

---

## 🔐 Rate Limiting

- **Limit**: 100 requests per 15-minute window per API key
- **Headers**: Response includes `RateLimit-*` headers with current status

---

## 🔏 Record Verification

Each record may include an optional immutability anchor, providing cryptographic evidence. You can specify the anchoring strategy when creating a record.

### Verify an OTS Proof

#### Method 1: OTS command line

```bash
# Install OTS client
pip3 install opentimestamps-client

# Verify proof
ots verify record.json.ots

# View proof info
ots info record.json.ots
```

#### Method 2: Programmatic verification

```javascript
const ots = require('opentimestamps');
const fs = require('fs');

const proof = fs.readFileSync('record.json.ots');
const detached = ots.DetachedTimestampProof.deserialize(proof);
const isValid = detached.verifyHash(hashBuffer);
```

### Proof Lifecycle

1. **Freshly created**: Proof generated, not yet anchored to blockchain
2. **~1 hour later**: Automatic upgrade anchors proof to Bitcoin blockchain
3. **Long-term verifiable**: Once anchored, proof can be independently verified regardless of service status

---

## 🛠️ Local Development

### Requirements
- Node.js 18+
- npm 9+
- PostgreSQL 14+

### Setup

```bash
git clone https://github.com/schchit/hjs-api.git
cd hjs-api
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database URL

# Run database migrations
psql your_database_url < migrations/init.sql

# Start server
node index.js
```

Server runs at `http://localhost:3000`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | (required) |

---

## ☁️ Deployment

### One-click Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Manual Deployment Steps
1. Fork this repository
2. Create a new **Web Service** on Render
3. Connect your GitHub repository
4. Use these settings:
   - **Build Command**: `npm install && pip3 install opentimestamps-client`
   - **Start Command**: `node index.js`
5. Add the `DATABASE_URL` environment variable
6. Click **Create Web Service**

---

## 🤝 Contributing

Contributions are welcome! You can:
- Open an [Issue](https://github.com/schchit/hjs-api/issues) for bugs or suggestions
- Submit Pull Requests for code or documentation improvements
- Read the [Contributing Guide](CONTRIBUTING.md)

---

## 📬 Contact

- **Implementation Issues**: via [GitHub Issues](https://github.com/schchit/hjs-api/issues)

---

## 🌟 Acknowledgments

- [HJS Protocol Family](https://github.com/hjs-spec/spec) for the core design
- Render for free hosting
- All contributors and users

---

**HJS: Structural Traceability Protocol**  
© 2026 Human Judgment Systems Foundation Ltd.
```
