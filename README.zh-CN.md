<p align="center">
  <strong>中文</strong> | <a href="README.md">English</a>
</p>

# HJS：结构化追溯协议

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Deployed on Render](https://img.shields.io/badge/Deployed%20on-Render-blue)](https://render.com)

**实现层 API 服务**。基于 HJS 协议族的参考实现，用于记录结构化事件。

基础地址：`https://api.hjs.sh`

---

## 📖 关于本项目

本项目是 [HJS 协议族](https://github.com/hjs-spec/spec)的第一个实现层服务。它实现了 HJS 核心协议中的 **Judgment（判断）**原语，提供了一个 REST API，用于在不可逆的自动化决策中记录和追溯人类判断事件。

HJS 协议由 [Human Judgment Systems Foundation Ltd.](https://humanjudgment.org)（新加坡 CLG）管理。

> **协议边界**：HJS 定义的是结构化可追溯原语，不判定法律或道德责任。所有责任判定必须由外部系统或法律程序完成。

---

## 📄 许可证

本项目采用**多重许可证**策略：

### 核心代码
`index.js`、`lib/`、`cron/` 等核心源代码采用 **AGPL-3.0** 许可证。

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

**这意味着：**
- ✅ 你可以自由使用、修改、分发代码
- ✅ 可以用于商业项目
- ✅ 如果你基于本代码提供网络服务，必须开源你的修改
- ❌ 不能将代码闭源后重新分发

完整许可证文本：[LICENSE](LICENSE)

### 文档与前端
文档（`README.md`）和前端页面（`public/`）采用 **CC BY-SA 4.0** 许可证。

[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)

---

## 🚀 快速开始

### 1. 获取 API 密钥

访问[开发者控制台](https://console.hjs.sh)，用你的邮箱生成 API Key。

### 2. 记录一条判断

```bash
curl -X POST https://api.hjs.sh/judgments \
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

### 3. 查询一条判断

```bash
curl https://api.hjs.sh/judgments/jgd_1742318412345_abc1 \
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
  "immutability_anchor": {
    "type": "none"
  }
}
```

### 4. 在线体验

访问[公开查询页](https://lookup.hjs.sh)，无需任何设置即可查询记录。

---

## 📚 API 文档

### 认证方式

所有 API 端点都需要 API 密钥。请在请求头中携带：

```
X-API-Key: 你的密钥
```

如需获取 API 密钥，请访问[开发者控制台](https://console.hjs.sh)。

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
| `action` | string | 是 | 被判断的行为 |
| `scope` | object | 否 | 判断的作用域 |
| `timestamp` | string | 否 | 判断时间（ISO 8601），不填则使用服务器时间 |
| `immutability` | object | 否 | 可选锚定策略（见下文） |

### 不可篡改锚定

每条记录可**选择性地**附带一个不可篡改锚定。通过 `immutability` 字段指定：

```json
"immutability": {
  "type": "ots",      // 可选值：ots, merkle, trusted_timestamp, none
  "options": {}       // 类型相关的可选参数
}
```

- **`ots`**：使用 OpenTimestamps 锚定到比特币区块链（官方推荐参考实现）
- **`merkle`**：批量锚定到默克尔树（需自行实现）
- **`trusted_timestamp`**：使用可信第三方时间戳服务（需自行实现）
- **`none`**：无锚定（默认值）

如果不提供 `immutability` 字段，默认使用 `none`。

**响应中包含锚定信息**：

```json
"immutability_anchor": {
  "type": "ots",              // 实际使用的锚定类型
  "reference": "...",         // 可选，类型相关引用
  "anchored_at": "..."        // 可选，锚定时间（仅当已锚定时返回）
}
```

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

**返回**：完整的判断记录对象，包含锚定信息。

---

### 导出为 JSON

`GET /judgments/{id}?format=json`

**请求头**：
- `X-API-Key`: 你的密钥

下载 JSON 格式的记录文件。

**示例**：
```bash
curl -X GET "https://api.hjs.sh/judgments/jgd_1234567890abc?format=json" \
  -H "X-API-Key: 你的密钥" \
  --output record.json
```

---

### 导出为 PDF

`GET /judgments/{id}?format=pdf`

**请求头**：
- `X-API-Key`: 你的密钥

下载格式化的 PDF 文件，包含：
- 完整的记录详情
- 二维码（扫码直达验证页面）
- 记录哈希值（SHA-256）
- 锚定状态
- 验证说明

**示例**：
```bash
curl -X GET "https://api.hjs.sh/judgments/jgd_1234567890abc?format=pdf" \
  -H "X-API-Key: 你的密钥" \
  --output record.pdf
```

---

### 下载锚定证明

`GET /judgments/:id/immutability-proof`

**请求头**：
- `X-API-Key`: 你的密钥

根据记录的锚定类型，返回对应的证明文件：
- `ots` → 返回 `.ots` 文件（Content-Type: `application/vnd.opentimestamps.ots`）
- 其他类型返回通用二进制或 JSON
- 如果记录无证明（`type: none`），返回 404

**示例**：
```bash
curl -X GET "https://api.hjs.sh/judgments/jgd_1234567890abc/immutability-proof" \
  -H "X-API-Key: 你的密钥" \
  --output record.proof
```

为了向后兼容，旧的 `/proof` 接口会自动重定向到新接口。

---

### 查询记录列表（支持筛选）

`GET /judgments`

**请求头**：
- `X-API-Key`: 你的密钥

**查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `entity` | string | 按实体精确筛选 |
| `from` | string | 开始时间（ISO 8601） |
| `to` | string | 结束时间（ISO 8601） |
| `page` | integer | 页码（默认：1） |
| `limit` | integer | 每页条数（默认：20，最大：100） |

**请求示例**：

```bash
curl "https://api.hjs.sh/judgments?entity=alice@bank.com&limit=5&page=1" \
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
      "immutability_anchor": {
        "type": "none"
      }
    }
  ]
}
```

---

### 导出列表为 JSON

`GET /judgments?format=json`（可附加筛选参数）

**请求头**：
- `X-API-Key`: 你的密钥

下载筛选后的列表结果，包含分页信息。

**示例**：
```bash
curl -X GET "https://api.hjs.sh/judgments?entity=test&limit=5&format=json" \
  -H "X-API-Key: 你的密钥" \
  --output judgments.json
```

---

### 错误响应

| 状态码 | 说明 |
|--------|------|
| `400` | 缺少必填字段 |
| `401` | 缺少或无效的 API 密钥 |
| `404` | 判断 ID 不存在 |
| `429` | 请求过于频繁，超出限制 |
| `500` | 服务器错误 |

---

## 🔐 速率限制

- **限制**：每个 API 密钥每 15 分钟最多 100 次请求
- **响应头**：返回中包含 `RateLimit-*` 头，显示当前状态

---

## 🔏 记录验证

每条记录可附带一个不可篡改锚定，提供密码学证据。您可以在创建记录时指定锚定策略。

### 验证 OTS 证明

#### 方法一：使用 OTS 命令行工具

```bash
# 安装 OTS 客户端
pip3 install opentimestamps-client

# 验证证明
ots verify record.json.ots

# 查看证明信息
ots info record.json.ots
```

#### 方法二：编程验证

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
3. **长期可验证**：一旦锚定，证明可被独立验证，不受本服务存续影响

---

## 🛠️ 本地开发

### 环境要求
- Node.js 18+
- npm 9+
- PostgreSQL 14+

### 安装

```bash
git clone https://github.com/schchit/hjs-api.git
cd hjs-api
npm install

# 复制环境变量示例
cp .env.example .env
# 编辑 .env 文件，填入你的数据库连接串

# 执行数据库迁移
psql 你的数据库连接串 < migrations/init.sql

# 启动服务
node index.js
```

服务运行在 `http://localhost:3000`

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `DATABASE_URL` | PostgreSQL 连接串 |（必需）|

---

## ☁️ 部署

### 一键部署到 Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### 手动部署步骤
1. Fork 本仓库
2. 在 Render 上创建新的 **Web Service**
3. 连接你的 GitHub 仓库
4. 使用以下设置：
   - **构建命令**：`npm install && pip3 install opentimestamps-client`
   - **启动命令**：`node index.js`
5. 添加环境变量 `DATABASE_URL`
6. 点击 **Create Web Service**

---

## 🤝 贡献指南

欢迎贡献！你可以：
- 通过 [Issues](https://github.com/schchit/hjs-api/issues) 提交 bug 或建议
- 提交 Pull Request 改进代码或文档
- 阅读[贡献指南](CONTRIBUTING.md)

---

## 📬 联系方式

- **实现问题**：通过 [GitHub Issues](https://github.com/schchit/hjs-api/issues)

---

## 🌟 致谢

- [HJS 协议族](https://github.com/hjs-spec/spec) 提供核心设计
- Render 提供免费托管
- 所有贡献者和用户

---

**HJS：结构化追溯协议**  
© 2026 Human Judgment Systems Foundation Ltd.
```
