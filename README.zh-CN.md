<p align="center">
  <strong>中文</strong> | <a href="README.md">English</a>
</p>

# HJS：责任追溯协议

[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)
[![Deployed on Render](https://img.shields.io/badge/Deployed%20on-Render-blue)](https://render.com)

**实现层 API 服务**。基于 HJS 协议家族的参考实现，用于记录判断事件。

Base URL: `https://hjs-api.onrender.com`

---

## 📖 关于本项目

本项目是 [HJS 协议家族](https://github.com/hjs-spec/spec) 的第一个实现层服务。它基于 HJS 核心协议中的 **判断（Judgment）** 原语，提供 REST API 用于记录和追溯不可逆自动化决策中的人类判断事件。

HJS 协议由 [人类判断系统基金会](https://humanjudgment.org)（注册中）治理。本实现采用 CC BY-SA 4.0 开源许可。

---

## 🚀 快速开始

### 1. 记录一次判断

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

### 2. 查询判断记录

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

### 记录判断

`POST /judgments`

**请求头**：
- `Content-Type: application/json`

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `entity` | string | 是 | 做出判断的主体标识 |
| `action` | string | 是 | 判断的动作（如 `loan_approved`） |
| `scope` | object | 否 | 判断的作用范围（如金额、权限域） |
| `timestamp` | string | 否 | 判断发生时间（ISO 8601），不填则用服务器时间 |

**返回**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 判断记录的唯一存证 ID |
| `status` | string | 固定为 `recorded` |
| `timestamp` | string | 记录存入的时间 |

### 查询判断

`GET /judgments/{id}`

**路径参数**：
- `id`：POST 请求返回的唯一存证 ID

**返回**：完整的判断记录对象

**错误返回**：
- `400 Bad Request`：缺少必填字段
- `404 Not Found`：记录不存在

---

## 🛠️ 本地开发

### 环境要求
- Node.js 18+
- npm 9+

### 安装依赖

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

本项目已配置为可一键部署到 Render：

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### 手动部署步骤
1. Fork 本仓库
2. 在 Render 创建新的 **Web Service**
3. 连接你的 GitHub 仓库
4. 使用以下配置：
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
5. 点击 **Create Web Service**

---

## 📄 开源许可

本项目采用 **CC BY-SA 4.0** 许可协议。

### 你可以：
- ✅ **复制**：在任何媒介或格式中复制和分享本材料
- ✅ **修改**：在任何用途（包括商业用途）中修改、转换、基于本材料创作

### 但必须遵守：
- ⚠️ **署名**：必须提供适当的署名，提供指向本许可的链接，并标明是否对原始材料做了修改
- ⚠️ **相同方式共享**：如果对材料进行修改、转换，必须以相同的许可协议分发你的贡献

完整许可文本：[https://creativecommons.org/licenses/by-sa/4.0/legalcode.zh-Hans](https://creativecommons.org/licenses/by-sa/4.0/legalcode.zh-Hans)

---

## 🤝 贡献指南

欢迎通过以下方式参与：
- 提交 [Issue](https://github.com/schchit/hjs-api/issues) 报告问题或建议
- 提交 Pull Request 改进代码或文档
- 在 [HJS 讨论区](https://github.com/hjs-spec/spec/discussions) 参与协议层面的讨论

---

## 📬 联系

- 协议相关问题：`signal@humanjudgment.org`
- 实现层问题：通过 GitHub Issues

---

## 🌟 致谢

- [HJS 协议家族](https://github.com/hjs-spec/spec) 提供核心设计
- Render 提供免费部署服务
- 所有贡献者和使用者

---

**HJS: 责任追溯协议**
