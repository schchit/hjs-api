<p align="center">
  <a href="README.zh-CN.md">中文</a> | <strong>English</strong>
</p>

# HJS Python Client

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python Version](https://img.shields.io/badge/python-3.7%2B-blue)](https://www.python.org/)

Python client for [HJS API](https://api.hjs.sh) — a structural traceability protocol.

Implements all 4 core primitives: **Judgment**, **Delegation**, **Termination**, **Verification**.

## 📦 Installation

```bash
pip install hjs-client
```

## 🚀 Quick Start

```python
from hjs import HJSClient

# Create client with API key
client = HJSClient(api_key="your-api-key")

# 1. Record a judgment
result = client.judgment(
    entity="alice@bank.com",
    action="loan_approved",
    scope={"amount": 100000}
)
print(f"✅ Judgment recorded: {result['id']}")

# 2. Create a delegation
delegation = client.delegation(
    delegator="manager@company.com",
    delegatee="employee@company.com",
    scope={"permissions": ["approve_under_1000"]}
)
print(f"✅ Delegation created: {delegation['id']}")

# 3. Verify the record
verify = client.verify(delegation['id'])
print(f"✅ Verification result: {verify['status']}")  # 'VALID' or 'INVALID'
```

### Using Context Manager

```python
from hjs import HJSClient

with HJSClient(api_key="your-api-key") as client:
    result = client.judgment(
        entity="alice@bank.com",
        action="loan_approved"
    )
    print(f"✅ Recorded: {result['id']}")
```

---

## 📚 API Reference

### Constructor

```python
client = HJSClient(
    base_url="https://api.hjs.sh",  # Optional
    api_key="your-api-key",          # Optional
    timeout=30                       # Optional
)
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `base_url` | str | `"https://api.hjs.sh"` | API base URL |
| `api_key` | str | `None` | API key for authentication |
| `timeout` | int | `30` | Request timeout in seconds |

---

### Core Primitives

#### 1. Judgment — Record structured decisions

```python
result = client.judgment(
    entity="user@example.com",           # Required: who is making the judgment
    action="approve",                     # Required: what action
    scope={"amount": 1000},              # Optional: additional context
    immutability={"type": "ots"}         # Optional: anchor to blockchain
)
```

**Returns:**
```python
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

#### 2. Delegation — Transfer authority

```python
result = client.delegation(
    delegator="manager@company.com",     # Required: who delegates
    delegatee="employee@company.com",    # Required: who receives
    judgment_id="jgd_xxx",               # Optional: linked judgment
    scope={"permissions": ["approve"]},  # Optional: delegation scope
    expiry="2026-12-31T23:59:59Z"        # Optional: expiration time (ISO 8601)
)
```

**Returns:**
```python
{
    "id": "dlg_1234567890abcd",
    "status": "active",
    "delegator": "manager@company.com",
    "delegatee": "employee@company.com",
    "scope": {"permissions": ["approve"]},
    "created_at": "2026-02-23T12:00:00.000Z"
}
```

#### 3. Termination — End responsibility

```python
result = client.termination(
    terminator="admin@company.com",      # Required: who terminates
    target_id="dlg_1234567890abcd",      # Required: what to terminate
    target_type="delegation",            # Required: 'judgment' or 'delegation'
    reason="Employee left company"       # Optional: reason for termination
)
```

**Returns:**
```python
{
    "id": "trm_1234567890abcd",
    "terminator": "admin@company.com",
    "target_id": "dlg_1234567890abcd",
    "target_type": "delegation",
    "reason": "Employee left company",
    "created_at": "2026-02-23T12:00:00.000Z"
}
```

#### 4. Verification — Validate records

```python
# Method 1: Detailed verification
result = client.verification(
    verifier="auditor@company.com",
    target_id="dlg_1234567890abcd",
    target_type="delegation"  # 'judgment', 'delegation', or 'termination'
)

# Method 2: Quick verify (auto-detects type from ID)
result = client.verify("dlg_1234567890abcd")
```

**Returns:**
```python
{
    "id": "vfy_1234567890abcd",
    "result": "VALID",  # or 'INVALID'
    "details": {
        "valid": True,
        "delegation": {...},
        "judgment": {...}
    },
    "verified_at": "2026-02-23T12:00:00.000Z"
}
```

---

### Query Methods

#### Get single record

```python
judgment = client.get_judgment("jgd_xxx")
delegation = client.get_delegation("dlg_xxx")
termination = client.get_termination("trm_xxx")
```

#### List records

```python
# List judgments
judgments = client.list_judgments(
    entity="user@example.com",
    page=1,
    limit=20
)

# List delegations
delegations = client.list_delegations(
    delegator="manager@company.com",
    status="active"
)
```

---

### Utility Methods

#### Health check

```python
health = client.health()
# Returns: {"status": "healthy", "version": "1.0.0", ...}
```

#### API documentation

```python
docs = client.docs()
# Returns complete API documentation
```

#### Generate API key

```python
key = client.generate_key("user@example.com", "my-app")
# Returns: {"key": "...", "email": "...", "created": "..."}
```

---

## 🧪 Testing

```bash
# Install from source
git clone https://github.com/schchit/hjs-api.git
cd hjs-api/client-py
pip install -e .

# Run quick test
python -c "
from hjs import HJSClient
client = HJSClient()
result = client.generate_key('test@example.com', 'test')
print('✅ Generated key:', result['key'][:8] + '...')
"
```

## ❌ Error Handling

```python
from hjs import HJSClient
from requests import RequestException

client = HJSClient(api_key="your-key")

try:
    result = client.judgment(
        entity="alice@bank.com",
        action="loan_approved"
    )
    print("✅ Success:", result['id'])
except ValueError as e:
    print("❌ Validation error:", e)
except RequestException as e:
    print("❌ API error:", e)
```

## 📄 License

MIT License — see [LICENSE](../LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please:
- Open an [Issue](https://github.com/schchit/hjs-api/issues) for bugs or suggestions
- Submit Pull Requests for improvements
