/**
 * Base Repository - Abstract base class cho tất cả repositories
 * DIP: Controllers depend on repositories (interface), không depend trên DB directly
 * LSP: All repositories must be substitutable with this base class
 * ISP: Implements IRepository interface
 */

const IRepository = require('../interfaces/IRepository');

class BaseRepository extends IRepository {
  constructor(prismaClient, modelName) {
    super();
    if (!prismaClient) {
      throw new Error('PrismaClient is required for BaseRepository');
    }
    this.prisma = prismaClient;
    this.modelName = modelName;
  }

  /**
   * Validate if repository has required Prisma model
   */
  _validateModel() {
    if (!this.modelName || !this.prisma[this.modelName]) {
      throw new Error(`Invalid model name: ${this.modelName}`);
    }
  }

  /**
   * Tìm một record theo ID
   */
  async findById(id) {
    throw new Error('findById must be implemented in child class');
  }

  /**
   * Tìm tất cả records
   */
  async findAll(filters = {}) {
    throw new Error('findAll must be implemented in child class');
  }

  /**
   * Tạo record mới
   */
  async create(data) {
    throw new Error('create must be implemented in child class');
  }

  /**
   * Cập nhật record
   */
  async update(id, data) {
    throw new Error('update must be implemented in child class');
  }

  /**
   * Xóa record
   */
  async delete(id) {
    throw new Error('delete must be implemented in child class');
  }
}

module.exports = BaseRepository;
