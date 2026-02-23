"""
HJS Python Client - Complete SDK for HJS Protocol

Implements all 4 core primitives:
- Judgment: Record structured decisions
- Delegation: Transfer authority with scope
- Termination: End responsibility chains
- Verification: Validate record integrity

Example:
    >>> from hjs import HJSClient
    >>> client = HJSClient(api_key="your_key")
    >>> result = client.judgment("user@example.com", "approve", scope={"amount": 100})
    >>> print(result['id'])
"""

from .client import HJSClient, create_judgment

__version__ = "1.0.0"
__all__ = ['HJSClient', 'create_judgment']
