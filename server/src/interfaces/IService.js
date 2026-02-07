/**
 * IService Interface
 * ISP (Interface Segregation Principle): Base interface for all services
 * Services encapsulate business logic and coordinate between repositories
 */

class IService {
  /**
   * Validate service dependencies are properly injected
   */
  validateDependencies() {
    throw new Error('Method validateDependencies() must be implemented');
  }

  /**
   * Get service name for logging/debugging
   * @returns {string}
   */
  getName() {
    throw new Error('Method getName() must be implemented');
  }
}

module.exports = IService;
