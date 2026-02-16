# HJS Python Client

Python client for [HJS API](https://hjs-api.onrender.com) — a responsibility tracing service.

## Installation

```bash
pip install requests
# or from source:
pip install -e /workspaces/hjs-api/client-py
Usage
Basic Example
python
from hjs_client import HJSClient

# Create client
client = HJSClient()

# Record a judgment
result = client.record_judgment(
    entity="alice@bank.com",
    action="loan_approved",
    scope={"amount": 100000}
)
print("Recorded:", result)

# Retrieve it
judgment = client.get_judgment(result['id'])
print("Retrieved:", judgment)
Using Context Manager
python
from hjs_client import HJSClient

with HJSClient() as client:
    result = client.record_judgment("alice@bank.com", "test_action")
    print("Recorded:", result)
Error Handling
python
from hjs_client import HJSClient
import requests

client = HJSClient()

try:
    result = client.record_judgment("alice@bank.com", "test_action")
    print("Success:", result)
except ValueError as e:
    print("Validation error:", e)
except requests.RequestException as e:
    print("API error:", e)
API Reference
HJSClient(base_url, timeout)
Create a new client instance.

base_url: API base URL (default: https://hjs-api.onrender.com)

timeout: Request timeout in seconds (default: 30)

record_judgment(entity, action, scope)
Record a judgment.

entity: Who made the judgment

action: What action was judged

scope: Optional additional context

Returns: { id, status, timestamp }

get_judgment(id)
Retrieve a judgment by ID.

Returns: Complete judgment record

Testing
bash
cd /workspaces/hjs-api/client-py
python -c "
from hjs_client import HJSClient
client = HJSClient()
result = client.record_judgment('test@example.com', 'test_action')
print('Recorded:', result)
judgment = client.get_judgment(result['id'])
print('Retrieved:', judgment)
"
License
MIT