/**
 * Share Repository
 * SRP: Quản lý database operations cho Share
 */
class ShareRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async create(data) {
    return await this.prisma.share.create({ data });
  }

  async findById(id) {
    return await this.prisma.share.findUnique({ where: { id } });
  }

  async findByToken(token) {
    return await this.prisma.share.findUnique({ where: { token } });
  }

  async findBySubjectId(subjectId) {
    return await this.prisma.share.findFirst({ where: { subjectId } });
  }

  async update(id, data) {
    return await this.prisma.share.update({ where: { id }, data });
  }

  async delete(id) {
    return await this.prisma.share.delete({ where: { id } });
  }
}

module.exports = ShareRepository;
