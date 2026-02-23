"""
HJS Python Client - Complete SDK for HJS Protocol
Implements all 4 core primitives: Judgment, Delegation, Termination, Verification
"""

import requests
from typing import Optional, Dict, Any, List
from datetime import datetime


class HJSClient:
    """
    Complete client for HJS Protocol API
    
    Args:
        base_url: The base URL of the HJS API (default: https://hjs-api.onrender.com)
        api_key: Optional API key for authenticated endpoints
        timeout: Request timeout in seconds (default: 30)
    """
    
    def __init__(
        self, 
        base_url: str = "https://hjs-api.onrender.com",
        api_key: Optional[str] = None,
        timeout: int = 30
    ):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.session = requests.Session()
        
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'HJS-Python-Client/1.0.0'
        }
        if api_key:
            headers['X-API-Key'] = api_key
            
        self.session.headers.update(headers)
    
    # ==================== JUDGMENT API (Core Primitive #1) ====================
    
    def judgment(
        self,
        entity: str,
        action: str,
        scope: Optional[Dict[str, Any]] = None,
        immutability: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Record a judgment (Core Primitive #1)
        
        Args:
            entity: The entity making the judgment (e.g., user@example.com)
            action: The action being judged (e.g., "approve", "reject")
            scope: Optional scope data (e.g., amount, permissions, context)
            immutability: Optional anchoring config {"type": "ots"} for blockchain
            
        Returns:
            Dict with id, status, protocol, timestamp, immutability_anchor
            
        Example:
            >>> client = HJSClient()
            >>> result = client.judgment(
            ...     entity="user@example.com",
            ...     action="approve_loan",
            ...     scope={"amount": 10000, "currency": "USD"}
            ... )
            >>> print(result['id'])  # jgd_1234567890abcd
        """
        if not entity or not action:
            raise ValueError("entity and action are required")
        
        payload = {
            'entity': entity,
            'action': action,
            'scope': scope or {}
        }
        if immutability:
            payload['immutability'] = immutability
        
        response = self.session.post(
            f"{self.base_url}/judgments",
            json=payload,
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()
    
    def get_judgment(self, judgment_id: str) -> Dict[str, Any]:
        """Get a judgment by ID"""
        if not judgment_id:
            raise ValueError("judgment_id is required")
        
        response = self.session.get(
            f"{self.base_url}/judgments/{judgment_id}",
            timeout=self.timeout
        )
        
        if response.status_code == 404:
            raise ValueError(f"Judgment not found: {judgment_id}")
        
        response.raise_for_status()
        return response.json()
    
    def list_judgments(
        self,
        entity: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """List judgments with optional filters"""
        params = {'page': page, 'limit': limit}
        if entity:
            params['entity'] = entity
            
        response = self.session.get(
            f"{self.base_url}/judgments",
            params=params,
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()
    
    # ==================== DELEGATION API (Core Primitive #2) ====================
    
    def delegation(
        self,
        delegator: str,
        delegatee: str,
        judgment_id: Optional[str] = None,
        scope: Optional[Dict[str, Any]] = None,
        expiry: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a delegation (Core Primitive #2)
        
        Args:
            delegator: Who is delegating authority
            delegatee: Who receives the delegation
            judgment_id: Optional linked judgment that authorizes this delegation
            scope: Delegation scope/permissions
            expiry: ISO 8601 date when delegation expires
            
        Returns:
            Dict with id, status, delegator, delegatee
            
        Example:
            >>> result = client.delegation(
            ...     delegator="manager@company.com",
            ...     delegatee="employee@company.com",
            ...     scope={"permissions": ["approve_under_1000"]},
            ...     expiry="2026-12-31T23:59:59Z"
            ... )
        """
        if not delegator or not delegatee:
            raise ValueError("delegator and delegatee are required")
        
        payload = {
            'delegator': delegator,
            'delegatee': delegatee,
            'scope': scope or {}
        }
        if judgment_id:
            payload['judgment_id'] = judgment_id
        if expiry:
            payload['expiry'] = expiry
        
        response = self.session.post(
            f"{self.base_url}/delegations",
            json=payload,
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()
    
    def get_delegation(self, delegation_id: str) -> Dict[str, Any]:
        """Get a delegation by ID"""
        if not delegation_id:
            raise ValueError("delegation_id is required")
        
        response = self.session.get(
            f"{self.base_url}/delegations/{delegation_id}",
            timeout=self.timeout
        )
        
        if response.status_code == 404:
            raise ValueError(f"Delegation not found: {delegation_id}")
        
        response.raise_for_status()
        return response.json()
    
    def list_delegations(
        self,
        delegator: Optional[str] = None,
        delegatee: Optional[str] = None,
        status: str = 'active'
    ) -> Dict[str, Any]:
        """List delegations with optional filters"""
        params = {'status': status}
        if delegator:
            params['delegator'] = delegator
        if delegatee:
            params['delegatee'] = delegatee
            
        response = self.session.get(
            f"{self.base_url}/delegations",
            params=params,
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()
    
    # ==================== TERMINATION API (Core Primitive #3) ====================
    
    def termination(
        self,
        terminator: str,
        target_id: str,
        target_type: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a termination (Core Primitive #3)
        
        Args:
            terminator: Who is terminating the record
            target_id: ID of judgment or delegation to terminate
            target_type: 'judgment' or 'delegation'
            reason: Optional reason for termination
            
        Returns:
            Dict with id, terminator, target_id, status
            
        Example:
            >>> result = client.termination(
            ...     terminator="admin@company.com",
            ...     target_id="dlg_1234567890abcd",
            ...     target_type="delegation",
            ...     reason="Employee left company"
            ... )
        """
        if not terminator or not target_id or not target_type:
            raise ValueError("terminator, target_id, and target_type are required")
        
        payload = {
            'terminator': terminator,
            'target_id': target_id,
            'target_type': target_type
        }
        if reason:
            payload['reason'] = reason
        
        response = self.session.post(
            f"{self.base_url}/terminations",
            json=payload,
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()
    
    def get_termination(self, termination_id: str) -> Dict[str, Any]:
        """Get a termination by ID"""
        if not termination_id:
            raise ValueError("termination_id is required")
        
        response = self.session.get(
            f"{self.base_url}/terminations/{termination_id}",
            timeout=self.timeout
        )
        
        if response.status_code == 404:
            raise ValueError(f"Termination not found: {termination_id}")
        
        response.raise_for_status()
        return response.json()
    
    # ==================== VERIFICATION API (Core Primitive #4) ====================
    
    def verification(
        self,
        verifier: str,
        target_id: str,
        target_type: str
    ) -> Dict[str, Any]:
        """
        Verify a record (Core Primitive #4)
        
        Args:
            verifier: Who is performing the verification
            target_id: ID of record to verify
            target_type: 'judgment', 'delegation', or 'termination'
            
        Returns:
            Dict with result (VALID/INVALID), details, verified_at
            
        Example:
            >>> result = client.verification(
            ...     verifier="auditor@company.com",
            ...     target_id="dlg_1234567890abcd",
            ...     target_type="delegation"
            ... )
            >>> print(result['result'])  # 'VALID' or 'INVALID'
        """
        if not verifier or not target_id or not target_type:
            raise ValueError("verifier, target_id, and target_type are required")
        
        payload = {
            'verifier': verifier,
            'target_id': target_id,
            'target_type': target_type
        }
        
        response = self.session.post(
            f"{self.base_url}/verifications",
            json=payload,
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()
    
    def verify(self, record_id: str) -> Dict[str, Any]:
        """
        Quick verify - auto-detects type from ID prefix
        
        Args:
            record_id: Record ID (jgd_, dlg_, or trm_ prefix)
            
        Returns:
            Verification result with auto-detected type
        """
        if not record_id:
            raise ValueError("record_id is required")
        
        response = self.session.post(
            f"{self.base_url}/verify",
            json={'id': record_id},
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()
    
    # ==================== UTILITY METHODS ====================
    
    def health(self) -> Dict[str, Any]:
        """Check API health status"""
        response = self.session.get(
            f"{self.base_url}/health",
            timeout=self.timeout
        )
        return response.json()
    
    def docs(self) -> Dict[str, Any]:
        """Get API documentation"""
        response = self.session.get(
            f"{self.base_url}/api/docs",
            timeout=self.timeout
        )
        return response.json()
    
    def generate_key(self, email: str, name: str = "default") -> Dict[str, Any]:
        """
        Generate a new API key (no authentication required)
        
        Args:
            email: User email
            name: Key name/description
            
        Returns:
            Dict with key, email, name, created timestamp
        """
        if not email:
            raise ValueError("email is required")
        
        response = self.session.post(
            f"{self.base_url}/developer/keys",
            json={'email': email, 'name': name},
            timeout=self.timeout
        )
        response.raise_for_status()
        return response.json()
    
    # ==================== CONTEXT MANAGERS ====================
    
    def close(self):
        """Close the session"""
        self.session.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


# Convenience function for quick usage
def create_judgment(entity: str, action: str, **kwargs) -> Dict[str, Any]:
    """Quick function to create a judgment without instantiating client"""
    with HJSClient() as client:
        return client.judgment(entity=entity, action=action, **kwargs)
