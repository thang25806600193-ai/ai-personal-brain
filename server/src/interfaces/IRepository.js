/**
 * IRepository Interface
 * ISP (Interface Segregation Principle): Base interface for all repositories
 * LSP (Liskov Substitution Principle): All repositories must implement these methods
 */

class IRepository {
  /**
   * Find a record by ID
   * @param {string} id - The record ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    throw new Error('Method findById() must be implemented');
  }

  /**
   * Find all records with optional filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>}
   */
  async findAll(filters = {}) {
    throw new Error('Method findAll() must be implemented');
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<Object>}
   */
  async create(data) {
    throw new Error('Method create() must be implemented');
  }

  /**
   * Update a record
   * @param {string} id - The record ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    throw new Error('Method update() must be implemented');
  }

  /**
   * Delete a record
   * @param {string} id - The record ID
   * @returns {Promise<Object>}
   */
  async delete(id) {
    throw new Error('Method delete() must be implemented');
  }
}

module.exports = IRepository;
