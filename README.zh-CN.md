<p align="center">
  <strong>中文</strong> | <a href="README.md">English</a>
</p>

# HJS：责任追溯协议

[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)
[![Deployed on Render](https://img.shields.io/badge/Deployed%20on-Render-blue)](https://render.com)

**实现层 API 服务。** 基于 HJS 协议族的 judgment 事件记录参考实现。

接口地址：`https://hjs-api.onrender.com`

---

## 📖 关于本项目

本项目是 [HJS 协议族](https://github.com/hjs-spec/spec)的第一个实现层服务。它实现了 HJS 核心协议中的 **Judgment** 原语，提供了一个 REST API，用于在不可逆的自动化决策中记录和追溯人类判断事件。

HJS 协议由 [Human Judgment Systems Foundation Ltd.](https://humanjudgment.org)（注册中）管理。本实现采用 CC BY-SA 4.0 协议开源。

---

## 🚀 快速开始

### 1. 记录一条 judgment

```bash
curl -X POST https://hjs-api.onrender.com/judgments \
  -H "Content-Type: application/json" \
  -d '{"entity": "alice@bank.com", "action": "loan_approved", "scope": {"amount": 100000}}'
```

**返回示例**：

```json
{
  "id": "jgd_1742318412345_abc1",
  "status": "recorded",
  "timestamp": "2026-02-16T09:30:15.123Z"
}
```

### 2. 查询一条 judgment

```bash
curl https://hjs-api.onrender.com/judgments/jgd_1742318412345_abc1
```

**返回示例**：

```json
{
  "id": "jgd_1742318412345_abc1",
  "entity": "alice@bank.com",
  "action": "loan_approved",
  "scope": {"amount": 100000},
  "timestamp": "2026-02-16T09:30:15.083Z",
  "recorded_at": "2026-02-16T09:30:15.123Z"
}
```

---

## 📚 API 文档

### 记录 judgment

`POST /judgments`

**请求头**：
- `Content-Type: application/json`

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `entity` | string | 是 | 做出判断的实体标识 |
| `action` | string | 是 | 被判断的行为（例如 `loan_approved`） |
| `scope` | object | 否 | 判断的范围（例如金额、权限） |
| `timestamp` | string | 否 | 判断时间（ISO 8601），省略则使用服务器时间 |

**返回**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 该 judgment 的唯一凭证 ID |
| `status` | string | 固定为 `recorded` |
| `timestamp` | string | 记录存储时间 |

### 查询 judgment

`GET /judgments/{id}`

**路径参数**：
- `id`：POST 请求返回的唯一凭证 ID

**返回**：完整的 judgment 记录对象

**错误响应**：
- `400 Bad Request`：缺少必填字段
- `404 Not Found`：judgment ID 不存在

---

## 🔐 记录验证

每条记录都附带一个 OpenTimestamps 证明，提供密码学证据，证明该记录在某个时间点之前已存在且未被篡改。

### 下载证明文件

```
GET /judgments/:id/proof
```

返回一个 `.ots` 文件，包含该记录的时间戳证明。

### 验证记录

#### 方法一：使用在线验证页面

访问 `/verify.html` 上传记录 JSON 文件和证明文件，一键验证。

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

---

## ☁️ 部署

本项目已配置一键部署到 Render：

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### 手动部署步骤
1. Fork 本仓库
2. 在 Render 上创建新的 **Web Service**
3. 连接你的 GitHub 仓库
4. 使用以下设置：
   - **构建命令**：`npm install`
   - **启动命令**：`node index.js`
5. 点击 **Create Web Service**

---

## 📄 许可证

本项目采用 **CC BY-SA 4.0** 许可证。

### 你可以自由地：
- ✅ **共享** — 在任何媒介以任何形式复制、发行本作品
- ✅ **演绎** — 修改、转换或以本作品为基础进行创作，无论商业用途

### 惟须遵守下列条件：
- ⚠️ **署名** — 你必须给出适当的署名，提供指向许可证的链接，并标明是否对内容作了修改
- ⚠️ **相同方式共享** — 如果你对本作品进行修改、转换或在此基础上创作，你必须使用相同的许可证分发你的贡献

完整许可证文本：[https://creativecommons.org/licenses/by-sa/4.0/legalcode](https://creativecommons.org/licenses/by-sa/4.0/legalcode)

---

## 🤝 贡献

欢迎贡献！你可以：
- 提出 [Issue](https://github.com/schchit/hjs-api/issues) 报告问题或建议
- 提交 Pull Request 改进代码或文档

---

## 📬 联系方式

- 协议相关问题：`signal@humanjudgment.org`
- 实现层问题：通过 [GitHub Issues](https://github.com/schchit/hjs-api/issues) 联系

---

## 🌟 致谢

- [HJS 协议族](https://github.com/hjs-spec/spec) 提供核心设计
- Render 提供免费托管
- 所有贡献者和用户

---

**HJS：责任追溯协议**
```
