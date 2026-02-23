// Universal HJS Client (works in browser and Node.js)
// HJS Protocol - Complete SDK with all 4 primitives

class HJSClient {
  /**
   * Create a new HJS client
   * @param {Object} options - Configuration options
   * @param {string} options.baseURL - The base URL of the HJS API
   * @param {string} options.apiKey - API key for authentication
   */
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'https://hjs-api.onrender.com';
    this.apiKey = options.apiKey || null;
    this.fetch = this._getFetchImplementation();
  }

  // Automatically detect environment and choose appropriate fetch
  _getFetchImplementation() {
    if (typeof window !== 'undefined' && window.fetch) {
      return window.fetch.bind(window);
    }
    try {
      return require('node-fetch');
    } catch {
      if (globalThis.fetch) {
        return globalThis.fetch;
      }
      throw new Error('Fetch not available. Please install node-fetch or use Node 18+');
    }
  }

  // Get headers with optional API key
  _getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    return headers;
  }

  // ==================== JUDGMENT API ====================
  
  /**
   * Record a judgment (Core Primitive #1)
   * @param {Object} params - Judgment parameters
   * @param {string} params.entity - The entity making the judgment
   * @param {string} params.action - The action being judged
   * @param {Object} params.scope - Optional scope data
   * @param {Object} params.immutability - Optional anchoring options
   * @returns {Promise<object>} - The recorded judgment
   */
  async judgment(params) {
    const { entity, action, scope = {}, immutability } = params;
    
    if (!entity || !action) {
      throw new Error('entity and action are required');
    }

    const response = await this.fetch(`${this.baseURL}/judgments`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ entity, action, scope, immutability })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to record judgment');
    }

    return response.json();
  }

  /**
   * Get a judgment by ID
   * @param {string} id - The judgment ID
   * @returns {Promise<object>} - The judgment data
   */
  async getJudgment(id) {
    if (!id) throw new Error('id is required');

    const response = await this.fetch(`${this.baseURL}/judgments/${id}`, {
      headers: this._getHeaders()
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error('Judgment not found');
      const error = await response.json();
      throw new Error(error.error || 'Failed to get judgment');
    }

    return response.json();
  }

  /**
   * List judgments
   * @param {Object} params - Query parameters
   * @param {string} params.entity - Filter by entity
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @returns {Promise<object>} - List of judgments
   */
  async listJudgments(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${this.baseURL}/judgments${query ? '?' + query : ''}`;
    
    const response = await this.fetch(url, { headers: this._getHeaders() });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list judgments');
    }

    return response.json();
  }

  // ==================== DELEGATION API (Core Primitive #2) ====================

  /**
   * Create a delegation
   * @param {Object} params - Delegation parameters
   * @param {string} params.delegator - Who is delegating
   * @param {string} params.delegatee - Who receives the delegation
   * @param {string} params.judgmentId - Optional linked judgment
   * @param {Object} params.scope - Delegation scope/permissions
   * @param {string} params.expiry - ISO date when delegation expires
   * @returns {Promise<object>} - The created delegation
   */
  async delegation(params) {
    const { delegator, delegatee, judgmentId, scope = {}, expiry } = params;
    
    if (!delegator || !delegatee) {
      throw new Error('delegator and delegatee are required');
    }

    const response = await this.fetch(`${this.baseURL}/delegations`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ delegator, delegatee, judgment_id: judgmentId, scope, expiry })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create delegation');
    }

    return response.json();
  }

  /**
   * Get a delegation by ID
   * @param {string} id - The delegation ID
   * @returns {Promise<object>} - The delegation data
   */
  async getDelegation(id) {
    if (!id) throw new Error('id is required');

    const response = await this.fetch(`${this.baseURL}/delegations/${id}`, {
      headers: this._getHeaders()
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error('Delegation not found');
      const error = await response.json();
      throw new Error(error.error || 'Failed to get delegation');
    }

    return response.json();
  }

  /**
   * List delegations
   * @param {Object} params - Query parameters
   * @returns {Promise<object>} - List of delegations
   */
  async listDelegations(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${this.baseURL}/delegations${query ? '?' + query : ''}`;
    
    const response = await this.fetch(url, { headers: this._getHeaders() });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list delegations');
    }

    return response.json();
  }

  // ==================== TERMINATION API (Core Primitive #3) ====================

  /**
   * Create a termination
   * @param {Object} params - Termination parameters
   * @param {string} params.terminator - Who is terminating
   * @param {string} params.targetId - ID of judgment or delegation to terminate
   * @param {string} params.targetType - 'judgment' or 'delegation'
   * @param {string} params.reason - Optional reason for termination
   * @returns {Promise<object>} - The created termination
   */
  async termination(params) {
    const { terminator, targetId, targetType, reason } = params;
    
    if (!terminator || !targetId || !targetType) {
      throw new Error('terminator, targetId, and targetType are required');
    }

    const response = await this.fetch(`${this.baseURL}/terminations`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ terminator, target_id: targetId, target_type: targetType, reason })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create termination');
    }

    return response.json();
  }

  /**
   * Get a termination by ID
   * @param {string} id - The termination ID
   * @returns {Promise<object>} - The termination data
   */
  async getTermination(id) {
    if (!id) throw new Error('id is required');

    const response = await this.fetch(`${this.baseURL}/terminations/${id}`, {
      headers: this._getHeaders()
    });

    if (!response.ok) {
      if (response.status === 404) throw new Error('Termination not found');
      const error = await response.json();
      throw new Error(error.error || 'Failed to get termination');
    }

    return response.json();
  }

  // ==================== VERIFICATION API (Core Primitive #4) ====================

  /**
   * Verify any record (judgment, delegation, or termination)
   * @param {Object} params - Verification parameters
   * @param {string} params.verifier - Who is verifying
   * @param {string} params.targetId - ID of record to verify
   * @param {string} params.targetType - 'judgment', 'delegation', or 'termination'
   * @returns {Promise<object>} - Verification result
   */
  async verification(params) {
    const { verifier, targetId, targetType } = params;
    
    if (!verifier || !targetId || !targetType) {
      throw new Error('verifier, targetId, and targetType are required');
    }

    const response = await this.fetch(`${this.baseURL}/verifications`, {
      method: 'POST',
      headers: this._getHeaders(),
      body: JSON.stringify({ verifier, target_id: targetId, target_type: targetType })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify');
    }

    return response.json();
  }

  /**
   * Quick verify (auto-detects type from ID)
   * @param {string} id - Record ID (jgd_, dlg_, or trm_)
   * @returns {Promise<object>} - Verification result
   */
  async verify(id) {
    if (!id) throw new Error('id is required');

    const response = await this.fetch(`${this.baseURL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify');
    }

    return response.json();
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check API health
   * @returns {Promise<object>} - Health status
   */
  async health() {
    const response = await this.fetch(`${this.baseURL}/health`);
    return response.json();
  }

  /**
   * Get API documentation
   * @returns {Promise<object>} - API documentation
   */
  async docs() {
    const response = await this.fetch(`${this.baseURL}/api/docs`);
    return response.json();
  }

  /**
   * Generate API key (no authentication required)
   * @param {string} email - User email
   * @param {string} name - Key name/description
   * @returns {Promise<object>} - Generated API key
   */
  async generateKey(email, name = 'default') {
    if (!email) throw new Error('email is required');

    const response = await this.fetch(`${this.baseURL}/developer/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate key');
    }

    return response.json();
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HJSClient;
}

// Also expose as global for browser
if (typeof window !== 'undefined') {
  window.HJSClient = HJSClient;
}
