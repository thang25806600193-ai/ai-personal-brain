/**
 * User Repository
 * SRP: Chỉ xử lý User-related database operations
 * LSP: Properly extends BaseRepository with full implementation
 */

const BaseRepository = require('./BaseRepository');
const ResourceNotFoundException = require('../exceptions/ResourceNotFoundException');

class UserRepository extends BaseRepository {
  constructor(prismaClient) {
    super(prismaClient, 'user');
  }

  async findById(id) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ResourceNotFoundException('User', id);
    }

    return user;
  }

  async findByEmail(email) {
    return await this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data) {
    return await this.prisma.user.create({
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }

  async update(id, data) {
    return await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });
  }

  async delete(id) {
    return await this.prisma.user.delete({
      where: { id },
    });
  }

  async findByVerifyToken(tokenHash) {
    return await this.prisma.user.findFirst({
      where: {
        emailVerifyTokenHash: tokenHash,
        emailVerifyTokenExpires: { gt: new Date() },
      },
    });
  }

  async updateVerificationStatus(userId, emailVerified) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified,
        emailVerifyTokenHash: null,
        emailVerifyTokenExpires: null,
      },
    });
  }
}

module.exports = UserRepository;
