// Universal HJS Client (works in browser and Node.js)

class HJSClient {
  /**
   * Create a new HJS client
   * @param {string} baseURL - The base URL of the HJS API (default: Render URL)
   */
  constructor(baseURL = 'https://hjs-api.onrender.com') {
    this.baseURL = baseURL;
    this.fetch = this._getFetchImplementation();
  }

  // Automatically detect environment and choose appropriate fetch
  _getFetchImplementation() {
    if (typeof window !== 'undefined' && window.fetch) {
      return window.fetch.bind(window); // Browser
    }
    // Node.js - try to use node-fetch or native fetch (Node 18+)
    try {
      return require('node-fetch');
    } catch {
      if (globalThis.fetch) {
        return globalThis.fetch; // Node 18+ native fetch
      }
      throw new Error('Fetch not available. Please install node-fetch or use Node 18+');
    }
  }

  /**
   * Record a judgment
   * @param {string} entity - The entity making the judgment
   * @param {string} action - The action being judged
   * @param {object} scope - Optional scope data
   * @returns {Promise<object>} - The recorded judgment
   */
  async recordJudgment(entity, action, scope = {}) {
    if (!entity || !action) {
      throw new Error('entity and action are required');
    }

    const response = await this.fetch(`${this.baseURL}/judgments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, action, scope })
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
    if (!id) {
      throw new Error('id is required');
    }

    const response = await this.fetch(`${this.baseURL}/judgments/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Judgment not found');
      }
      const error = await response.json();
      throw new Error(error.error || 'Failed to get judgment');
    }

    return response.json();
  }
}

module.exports = HJSClient;