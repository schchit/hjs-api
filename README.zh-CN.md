<p align="center">
  <strong>中文</strong> | <a href="README.md">English</a>
</p>

# HJS：责任追溯协议

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Deployed on Render](https://img.shields.io/badge/Deployed%20on-Render-blue)](https://render.com)

**实现层 API 服务**。基于 HJS 协议族的参考实现，用于记录判断事件。

基础地址：`https://hjs-api.onrender.com`

---

## 📖 关于本项目

本项目是 [HJS 协议族](https://github.com/hjs-spec/spec)的第一个实现层服务。它实现了 HJS 核心协议中的 **Judgment（判断）**原语，提供了一个 REST API，用于在不可逆的自动化决策中记录和追溯人类判断事件。

HJS 协议由 [Human Judgment Systems Foundation Ltd.](https://humanjudgment.org)（注册中）管理。本实现采用 CC BY-SA 4.0 许可证开源。

---

## 🚀 快速开始

### 1. 记录一条判断

```bash
curl -X POST https://hjs-api.onrender.com/judgments \
  -H "Content-Type: application/json" \
  -H "X-API-Key: 你的密钥" \
  -d '{"entity": "alice@bank.com", "action": "loan_approved", "scope": {"amount": 100000}}'
```

**返回示例**：

```json
{
  "id": "jgd_1742318412345_abc1",
  "status": "recorded",
  "protocol": "HJS/1.0",
  "timestamp": "2026-02-16T09:30:15.123Z"
}
```

### 2. 查询一条判断

```bash
curl https://hjs-api.onrender.com/judgments/jgd_1742318412345_abc1 \
  -H "X-API-Key: 你的密钥"
```

**返回示例**：

```json
{
  "id": "jgd_1742318412345_abc1",
  "entity": "alice@bank.com",
  "action": "loan_approved",
  "scope": {"amount": 100000},
  "timestamp": "2026-02-16T09:30:15.083Z",
  "recorded_at": "2026-02-16T09:30:15.123Z",
  "ots_proof": null,
  "ots_verified": false
}
```

---

## 📚 API 文档

### 认证方式

所有 API 端点（除了根路径）都需要 API 密钥。请在请求头中携带：

```
X-API-Key: 你的密钥
```

如需获取 API 密钥，请联系项目维护者。

---

### 记录一条判断

`POST /judgments`

**请求头**：
- `Content-Type: application/json`
- `X-API-Key`: 你的密钥

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `entity` | string | 是 | 做出判断的实体标识 |
| `action` | string | 是 | 被判断的行为（例如 `loan_approved`） |
| `scope` | object | 否 | 判断的作用域（例如金额、权限等） |
| `timestamp` | string | 否 | 判断时间（ISO 8601格式）。如不提供则使用服务器时间 |

**返回**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 本次判断的唯一凭证 ID |
| `status` | string | 固定为 `recorded` |
| `protocol` | string | 协议版本 (HJS/1.0) |
| `timestamp` | string | 记录存储时间 |

---

### 查询单条记录

`GET /judgments/{id}`

**请求头**：
- `X-API-Key`: 你的密钥

**路径参数**：
- `id`: 创建记录时返回的唯一凭证 ID

**返回**：完整的判断记录对象

---

### 导出为 JSON

`GET /judgments/{id}?format=json`

**请求头**：
- `X-API-Key`: 你的密钥

下载 JSON 格式的记录文件，便于程序处理或集成到其他系统。

**示例**：
```bash
curl -X GET "https://hjs-api.onrender.com/judgments/jgd_1234567890abc?format=json" \
  -H "X-API-Key: 你的密钥" \
  --output record.json
```

---

### 导出为 PDF（含二维码）

`GET /judgments/{id}?format=pdf`

**请求头**：
- `X-API-Key`: 你的密钥

下载格式化的 PDF 文件，包含：
- 完整的记录详情
- 二维码（扫码直达验证页面）
- 记录哈希值（SHA-256）
- OpenTimestamps 证明状态
- 生成时间戳和验证说明

适合打印、存档、提交给审计或监管。

**示例**：
```bash
curl -X GET "https://hjs-api.onrender.com/judgments/jgd_1234567890abc?format=pdf" \
  -H "X-API-Key: 你的密钥" \
  --output record.pdf
```

---

### 查询记录列表（支持筛选）

`GET /judgments`

**请求头**：
- `X-API-Key`: 你的密钥

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `entity` | string | 按实体精确筛选 |
| `from` | string | 开始时间（ISO 8601格式，例如 `2026-02-01T00:00:00Z`） |
| `to` | string | 结束时间（ISO 8601格式） |
| `page` | integer | 页码（默认：1） |
| `limit` | integer | 每页条数（默认：20，最大：100） |

**请求示例**：

```bash
curl "https://hjs-api.onrender.com/judgments?entity=alice@bank.com&limit=5&page=1" \
  -H "X-API-Key: 你的密钥"
```

**返回示例**：

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
      "ots_proof": null,
      "ots_verified": false
    }
  ]
}
```

---

### 导出列表为 JSON

`GET /judgments?format=json`（可附加筛选参数）

**请求头**：
- `X-API-Key`: 你的密钥

下载筛选后的列表结果，包含分页信息，保存为 JSON 文件。

**示例**：
```bash
curl -X GET "https://hjs-api.onrender.com/judgments?entity=test&limit=5&format=json" \
  -H "X-API-Key: 你的密钥" \
  --output judgments.json
```

---

### 下载 OTS 证明文件

`GET /judgments/:id/proof`

**请求头**：
- `X-API-Key`: 你的密钥

返回一个 `.ots` 文件，包含该记录的 OpenTimestamps 时间戳证明。此文件可用于任何兼容 OpenTimestamps 的工具进行独立验证。

**示例**：
```bash
curl -X GET "https://hjs-api.onrender.com/judgments/jgd_1234567890abc/proof" \
  -H "X-API-Key: 你的密钥" \
  --output record.ots
```

---

### 错误响应

| 状态码 | 说明 |
|--------|------|
| `400 Bad Request` | 缺少必填字段 |
| `401 Unauthorized` | 缺少或无效的 API 密钥 |
| `404 Not Found` | 判断 ID 不存在 |
| `429 Too Many Requests` | 请求过于频繁，超出限制 |
| `500 Internal Server Error` | 服务器错误 |

---

## 🔐 速率限制

为保证服务稳定性，API 请求受速率限制：

- **限制**：每个 API 密钥每 15 分钟最多 100 次请求
- **响应头**：返回中包含 `RateLimit-*` 头，显示当前状态
- **超出限制**：返回 `429 Too Many Requests` 及错误信息

---

## 🔏 记录验证

每条记录都附带一个 OpenTimestamps 证明，提供密码学证据，证明该记录在某个时间点之前已存在，且内容未被篡改。

### 验证记录

#### 方法一：使用在线验证页面

访问 `/verify.html` 上传记录文件和证明文件，一键验证。

#### 方法二：使用 OTS 命令行工具

```bash
# 安装 OTS 客户端
pip3 install opentimestamps-client

# 验证证明
ots verify record.json.ots

# 查看证明信息
ots info record.json.ots
```

#### 方法三：编程验证

```javascript
const ots = require('opentimestamps');
const fs = require('fs');

const proof = fs.readFileSync('record.json.ots');
const detached = ots.DetachedTimestampProof.deserialize(proof);
const isValid = detached.verifyHash(hashBuffer);
```

### 证明的生命周期

1. **刚创建时**：证明文件生成，但还未锚定到区块链
2. **约1小时后**：定时任务自动升级证明，锚定到比特币区块链
3. **永久有效**：一旦锚定，证明永久有效，可独立验证

---

## 🛠️ 本地开发

### 环境要求
- Node.js 18+
- npm 9+

### 安装

```bash
git clone https://github.com/schchit/hjs-api.git
cd hjs-api
npm install
```

### 本地运行

```bash
node index.js
```

服务运行在 `http://localhost:3000`

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `DATABASE_URL` | PostgreSQL 连接串 |（生产环境必需）|

---

## ☁️ 部署

本项目已配置为可在 Render 上一键部署：

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### 手动部署步骤
1. Fork 本仓库
2. 在 Render 上创建新的 **Web Service**
3. 连接你的 GitHub 仓库
4. 使用以下设置：
   - **构建命令**：`npm install`
   - **启动命令**：`node index.js`
5. 添加环境变量 `DATABASE_URL`（生产环境必需）
6. 点击 **Create Web Service**

---

## 📄 许可证

本项目采用 **CC BY-SA 4.0** 许可证。

### 你可以自由地：
- ✅ **共享** – 在任何媒介或格式中复制、分发本材料
- ✅ **演绎** – 修改、转换、基于本材料创作，甚至用于商业目的

### 但必须遵守以下条款：
- ⚠️ **署名** – 你必须给出适当的署名，提供许可证链接，并注明是否进行了修改
- ⚠️ **相同方式共享** – 如果你对材料进行再混合、转换或基于它进行创作，你必须以相同的许可证分发你的贡献

完整许可证文本：https://creativecommons.org/licenses/by-sa/4.0/legalcode.zh-hans

---

## 🤝 贡献指南

欢迎贡献！你可以：
- 通过 [Issues](https://github.com/schchit/hjs-api/issues) 提交 bug 或建议
- 提交 Pull Request 改进代码或文档

---

## 📬 联系方式

- 协议相关：`signal@humanjudgment.org`
- 实现问题：通过 [GitHub Issues](https://github.com/schchit/hjs-api/issues)

---

## 🌟 致谢

- [HJS 协议族](https://github.com/hjs-spec/spec) 提供核心设计
- Render 提供免费托管
- 所有贡献者和用户

---

**HJS：责任追溯协议**
```
