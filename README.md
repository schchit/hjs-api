# HJS: A Protocol for Responsibility Tracing

[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)
[![Render Deployment](https://img.shields.io/badge/Deployed%20on-Render-blue)](https://render.com)

**Implementation layer API service.** A reference implementation for recording judgment events, based on the HJS protocol family.

Base URL: `https://hjs-api.onrender.com`

---

## 📖 About

This project is the first implementation layer service of the [HJS Protocol Family](https://github.com/hjs-spec/spec). It implements the **Judgment** primitive from the HJS core protocol, providing a REST API for recording and tracing human judgment events in irreversible automated decisions.

HJS protocols are governed by the [Human Judgment Systems Foundation Ltd.](https://humanjudgment.org) (registration in progress). This implementation is open source under the CC BY-SA 4.0 license.

---

## 🚀 Quick Start

### 1. Record a judgment

```bash
curl -X POST https://hjs-api.onrender.com/judgments \
  -H "Content-Type: application/json" \
  -d '{"entity": "alice@bank.com", "action": "loan_approved", "scope": {"amount": 100000}}'
```

**Example response**:

```json
{
  "id": "jgd_1742318412345_abc1",
  "status": "recorded",
  "timestamp": "2026-02-16T09:30:15.123Z"
}
```

### 2. Retrieve a judgment

```bash
curl https://hjs-api.onrender.com/judgments/jgd_1742318412345_abc1
```

**Example response**:

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

## 📚 API Reference

### Record a judgment

`POST /judgments`

**Headers**:
- `Content-Type: application/json`

**Request body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entity` | string | Yes | Identifier of the entity making the judgment |
| `action` | string | Yes | The action being judged (e.g., `loan_approved`) |
| `scope` | object | No | Scope of the judgment (e.g., amount, permissions) |
| `timestamp` | string | No | Judgment time (ISO 8601). Server time used if omitted. |

**Response**:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique credential ID for this judgment |
| `status` | string | Always `recorded` |
| `timestamp` | string | When the record was stored |

### Retrieve a judgment

`GET /judgments/{id}`

**Path parameters**:
- `id`: The unique credential ID returned from a POST request.

**Response**: The complete judgment record object.

**Error responses**:
- `400 Bad Request`: Missing required fields
- `404 Not Found`: Judgment ID not found

---

## 🛠️ Local Development

### Requirements
- Node.js 18+
- npm 9+

### Setup

```bash
git clone https://github.com/schchit/hjs-api.git
cd hjs-api
npm install
```

### Run locally

```bash
node index.js
```

Server runs at `http://localhost:3000`.

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |

---

## ☁️ Deployment

This project is configured for one‑click deployment on Render:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Manual deployment steps
1. Fork this repository.
2. Create a new **Web Service** on Render.
3. Connect your GitHub repository.
4. Use these settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
5. Click **Create Web Service**.

---

## 📄 License

This project is licensed under **CC BY-SA 4.0**.

### You are free to:
- ✅ **Share** – copy and redistribute the material in any medium or format
- ✅ **Adapt** – remix, transform, and build upon the material for any purpose, even commercially

### Under the following terms:
- ⚠️ **Attribution** – You must give appropriate credit, provide a link to the license, and indicate if changes were made
- ⚠️ **ShareAlike** – If you remix, transform, or build upon the material, you must distribute your contributions under the same license

Full license text: [https://creativecommons.org/licenses/by-sa/4.0/legalcode](https://creativecommons.org/licenses/by-sa/4.0/legalcode)

---

## 🤝 Contributing

Contributions are welcome! Please:
- Open an [Issue](https://github.com/schchit/hjs-api/issues) for bugs or suggestions
- Submit Pull Requests for code or documentation improvements
- Join protocol discussions at [HJS Discussion Forum](https://github.com/hjs-spec/spec/discussions)

---

## 📬 Contact

- Protocol questions: `signal@humanjudgment.org`
- Implementation issues: via [GitHub Issues](https://github.com/schchit/hjs-api/issues)

---

## 🌟 Acknowledgments

- [HJS Protocol Family](https://github.com/hjs-spec/spec) for the core design
- Render for free hosting
- All contributors and users

---

**HJS: A Protocol for Responsibility Tracing**
