<p align="center">
  <strong>中文</strong> | <a href="README.md">English</a>
</p>

# HJS：结构化可追溯协议

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Spec: CC0 1.0](https://img.shields.io/badge/Spec-CC0_1.0-lightgrey.svg)](https://creativecommons.org/publicdomain/zero/1.0/)
[![Deployed on Render](https://img.shields.io/badge/Deployed%20on-Render-blue)](https://render.com)

**实现层 API 服务**。基于 HJS 协议族的结构化事件记录参考实现。  
**协议规范**位于 [`/spec`](spec/) 目录，采用 CC0 1.0 许可证。

**基础地址**：`https://api.hjs.sh`

---

## 📖 关于本项目

本项目是 [HJS 协议族](https://github.com/hjs-spec/spec)的第一个实现层服务。它实现了 HJS 核心协议中的 **4 个核心原语**：

1. **判断（Judgment）** — 记录结构化决策
2. **委托（Delegation）** — 转移权限并设定范围
3. **终止（Termination）** — 结束责任链条
4. **验证（Verification）** — 验证记录完整性和链条

HJS 协议由 [Human Judgment Systems Foundation Ltd.](https://humanjudgment.org)（新加坡 CLG）管理。

**协议边界**：HJS 定义的是结构化可追溯原语，**不界定法律或道德责任，也不判定决策的正确性**。所有责任认定必须由外部系统或法律程序完成。

---

## 📦 SDK 安装

### Python
```bash
pip install hjs-client
```

```python
from hjs import HJSClient

# 记录一条判断
with HJSClient(api_key="你的密钥") as client:
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

const client = new HJSClient({ apiKey: '你的密钥' });

// 记录一条判断
const result = await client.judgment({
  entity: 'user@example.com',
  action: 'approve',
  scope: { amount: 1000 }
});

console.log(result.id);  // jgd_1234567890abcd
```

更多示例详见：
- [Python SDK](client-py/README.md)
- [Node.js SDK](client-js/README.md)

---

## 🚀 快速开始

### 1. 获取 API 密钥

访问[开发者控制台](https://console.hjs.sh)，用你的邮箱生成 API Key。

### 2. 使用 SDK（推荐）

```bash
# Python
pip install hjs-client

# Node.js
npm install hjs-client
```

### 3. 或直接调用 HTTP API

```bash
# 记录一条判断
curl -X POST https://api.hjs.sh/judgments \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 你的密钥" \
  -d '{"entity": "alice@bank.com", "action": "loan_approved", "scope": {"amount": 100000}}'
```

### 4. 在线体验

访问[公开查询页](https://lookup.hjs.sh)，无需任何设置即可查询记录。

---

## 🏗️ 四大核心原语

### 1. 判断（Judgment）— 记录结构化决策

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

**返回示例**：
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

### 2. 委托（Delegation）— 转移权限

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

**返回示例**：
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

### 3. 终止（Termination）— 结束责任

```bash
POST /terminations
```

```json
{
  "terminator": "admin@company.com",
  "target_id": "dlg_1234567890abcd",
  "target_type": "delegation",
  "reason": "员工离职"
}
```

**返回示例**：
```json
{
  "id": "trm_1234567890abcd",
  "terminator": "admin@company.com",
  "target_id": "dlg_1234567890abcd",
  "target_type": "delegation",
  "reason": "员工离职",
  "created_at": "2026-02-23T12:00:00.000Z"
}
```

### 4. 验证（Verification）— 验证记录

```bash
# 方式一：详细验证
POST /verifications
```

```json
{
  "verifier": "auditor@company.com",
  "target_id": "dlg_1234567890abcd",
  "target_type": "delegation"
}
```

**返回示例**：
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
# 方式二：快速验证（自动识别类型）
POST /verify
```

```json
{"id": "dlg_1234567890abcd"}
```

**返回示例**：
```json
{
  "id": "dlg_1234567890abcd",
  "type": "delegation",
  "status": "VALID"
}
```

---

## 📚 API 参考

### 认证方式

所有 API 端点都需要 API 密钥。请在请求头中携带：

```
X-API-Key: 你的密钥
```

如需获取 API 密钥，请访问[开发者控制台](https://console.hjs.sh)。

### 核心端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/judgments` | POST/GET | 记录/查询判断 |
| `/judgments/{id}` | GET | 查询单条判断 |
| `/delegations` | POST/GET | 创建/查询委托 |
| `/delegations/{id}` | GET | 查询单条委托 |
| `/terminations` | POST/GET | 创建/查询终止 |
| `/terminations/{id}` | GET | 查询单条终止 |
| `/verifications` | POST/GET | 验证/查询验证历史 |
| `/verify` | POST | 快速验证（自动识别类型）|

### 工具端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/docs` | GET | API 文档 |
| `/developer/keys` | POST/GET | 生成/查询 API 密钥 |

### 不可篡改锚定

每条记录可**选择性地**附带一个不可篡改锚定：

```json
"immutability": {
  "type": "ots",
  "options": {}
}
```

类型说明：
- **`ots`**：使用 OpenTimestamps 锚定到比特币区块链
- **`none`**：无锚定（默认值）

---

## 📄 许可证

本项目采用**双重许可证策略**，以最大化协议采用率，同时保持协议的开放性。

### 协议规范
[`/spec`](spec/) 目录下的协议定义采用 **CC0 1.0 公共领域贡献**许可证，完全开放，任何人都可以无限制地实现该协议。

### 参考实现
本仓库的参考实现代码采用 **MIT 许可证**，允许最大程度的采用和集成，包括商业应用。

---

## 🔗 相关链接

- **网站**：https://humanjudgment.services
- **API 文档**：https://api.hjs.sh/api/docs
- **健康检查**：https://api.hjs.sh/health
- **开发者控制台**：https://console.hjs.sh
- **GitHub**：https://github.com/schchit/hjs-api

---

## ⚠️ 如果没有可追溯的记录

看看当决策没有被记录时会发生什么——[真实案例](https://humanjudgment.services/cases.html)。

---

**HJS：结构化可追溯协议**  
© 2026 Human Judgment Systems Foundation Ltd.
