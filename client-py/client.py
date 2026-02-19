"""
HJS Python Client

A Python client for the HJS API is a protocol for structural traceability.
"""

import requests
from typing import Optional, Dict, Any, Union
from datetime import datetime

class HJSClient:
    """
    Client for HJS API
    
    Args:
        base_url: The base URL of the HJS API (default: https://hjs-api.onrender.com)
        timeout: Request timeout in seconds (default: 30)
    """
    
    def __init__(self, base_url: str = "https://hjs-api.onrender.com", timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'HJS-Python-Client/0.1.0'
        })
    
    def record_judgment(
        self,
        entity: str,
        action: str,
        scope: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Record a judgment
        
        Args:
            entity: The entity making the judgment
            action: The action being judged
            scope: Optional scope data (e.g., amount, permissions)
            
        Returns:
            Dict containing id, status, and timestamp
            
        Raises:
            ValueError: If entity or action is missing
            requests.RequestException: If the API request fails
        """
        if not entity or not action:
            raise ValueError("entity and action are required")
        
        payload = {
            'entity': entity,
            'action': action,
            'scope': scope or {}
        }
        
        response = self.session.post(
            f"{self.base_url}/judgments",
            json=payload,
            timeout=self.timeout
        )
        
        response.raise_for_status()
        return response.json()
    
    def get_judgment(self, judgment_id: str) -> Dict[str, Any]:
        """
        Retrieve a judgment by ID
        
        Args:
            judgment_id: The judgment ID returned from record_judgment
            
        Returns:
            Dict containing the complete judgment record
            
        Raises:
            ValueError: If judgment_id is missing
            requests.RequestException: If the API request fails
        """
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
    
    def close(self):
        """Close the session"""
        self.session.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
