/**
 * SharedWithUser Repository
 * SRP: Quản lý database operations cho SharedWithUser
 */
class SharedWithUserRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return await this.prisma.sharedWithUser.create({ data });
  }

  async findBySubjectAndUser(subjectId, userId) {
    return await this.prisma.sharedWithUser.findUnique({
      where: {
        subjectId_userId: { subjectId, userId }
      }
    });
  }

  async findBySubject(subjectId) {
    return await this.prisma.sharedWithUser.findMany({
      where: { subjectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        }
      }
    });
  }

  async findByUser(userId) {
    return await this.prisma.sharedWithUser.findMany({
      where: { userId },
      include: {
        subject: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      }
    });
  }

  async delete(id) {
    return await this.prisma.sharedWithUser.delete({ where: { id } });
  }

  async deleteBySubjectAndUser(subjectId, userId) {
    const record = await this.findBySubjectAndUser(subjectId, userId);
    if (record) {
      await this.delete(record.id);
    }
  }
}

module.exports = SharedWithUserRepository;
