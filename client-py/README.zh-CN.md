<p align="center">
  <strong>中文</strong> | <a href="README.md">English</a>
</p>

# HJS Python 客户端

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python Version](https://img.shields.io/badge/python-3.7%2B-blue)](https://www.python.org/)

适用于 [HJS API](https://hjs-api.onrender.com) 的 Python 客户端库 — 一个责任追溯服务。

## 📦 安装

### 从 PyPI 安装（发布后）
```bash
pip install hjs-client
```

### 从 GitHub 安装（当前）
```bash
pip install git+https://github.com/schchit/hjs-api.git#subdirectory=client-py
```

### 从本地源码安装
```bash
cd /workspaces/hjs-api/client-py
pip install -e .
```

## 🚀 快速开始

### 基础示例

```python
from hjs_client import HJSClient

# 创建客户端
client = HJSClient()

# 记录一次判断
result = client.record_judgment(
    entity="alice@bank.com",
    action="loan_approved",
    scope={"amount": 100000}
)
print("✅ 记录成功:", result)

# 查询判断记录
judgment = client.get_judgment(result['id'])
print("✅ 查询成功:", judgment)
```

### 使用上下文管理器

```python
from hjs_client import HJSClient

with HJSClient() as client:
    result = client.record_judgment("alice@bank.com", "test_action")
    print("✅ 记录成功:", result)
```

### 错误处理

```python
from hjs_client import HJSClient
import requests

client = HJSClient()

try:
    result = client.record_judgment("alice@bank.com", "test_action")
    print("✅ 成功:", result)
except ValueError as e:
    print("❌ 参数错误:", e)
except requests.RequestException as e:
    print("❌ API 错误:", e)
```

## 📚 API 说明

### `HJSClient(base_url, timeout)`

创建客户端实例。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `base_url` | str | `"https://hjs-api.onrender.com"` | API 基础地址 |
| `timeout` | int | `30` | 请求超时时间（秒） |

### `record_judgment(entity, action, scope)`

记录一次判断。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `entity` | str | ✅ | 做出判断的主体 |
| `action` | str | ✅ | 判断的动作 |
| `scope` | dict | ❌ | 附加信息（如金额、权限等） |

**返回**: `{ id, status, timestamp }`

**异常**:
- `ValueError`: 缺少必填参数
- `requests.RequestException`: API 请求失败

### `get_judgment(id)`

根据 ID 查询判断记录。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | str | ✅ | `record_judgment` 返回的 ID |

**返回**: 完整的判断记录

**异常**:
- `ValueError`: ID 缺失或记录不存在
- `requests.RequestException`: API 请求失败

## 🧪 测试

```bash
cd /workspaces/hjs-api/client-py
python -c "
from hjs_client import HJSClient
client = HJSClient()
result = client.record_judgment('test@example.com', 'test_action')
print('✅ 记录成功:', result)
judgment = client.get_judgment(result['id'])
print('✅ 查询成功:', judgment)
"
```

预期输出：
```
✅ 记录成功: {'id': 'jgd_...', 'status': 'recorded', 'timestamp': '...'}
✅ 查询成功: {'id': 'jgd_...', 'entity': 'test@example.com', 'action': 'test_action', ...}
```

## 📄 许可证

MIT © HJS 贡献者

## 🤝 贡献指南

欢迎通过以下方式参与：
- 提交 [Issue](https://github.com/schchit/hjs-api/issues) 报告问题或建议
- 提交 Pull Request 改进代码

---

**HJS: 责任追溯协议**
```

---
