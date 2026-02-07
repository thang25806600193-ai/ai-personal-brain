/**
 * IAIProvider Interface (Updated with stricter contract)
 * DIP: High-level modules depend on this abstraction
 * LSP: All AI providers must be substitutable
 * ISP: Specific interface for AI capabilities
 */

class IAIProvider {
  /**
   * Send a prompt to the AI and get a response
   * @param {string} prompt - The question or instruction
   * @returns {Promise<string>} - The AI's response
   */
  async ask(prompt) {
    throw new Error('Method ask() must be implemented');
  }

  /**
   * Check if the provider is healthy and available
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    throw new Error('Method isHealthy() must be implemented');
  }

  /**
   * Get the provider name (for logging/debugging)
   * @returns {string}
   */
  getName() {
    throw new Error('Method getName() must be implemented');
  }

  /**
   * Get provider-specific metadata
   * @returns {Object} - { model: string, maxTokens: number, etc. }
   */
  getMetadata() {
    return {
      model: 'unknown',
      maxTokens: 0,
      supportsStreaming: false,
    };
  }
}

module.exports = IAIProvider;
