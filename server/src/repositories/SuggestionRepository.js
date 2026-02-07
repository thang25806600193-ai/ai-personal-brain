/**
 * Suggestion Repository
 * Lưu trữ AI suggestions để dùng lại giữa các thiết bị
 */

class SuggestionRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findPendingBySubject(subjectId) {
    return await this.prisma.suggestion.findMany({
      where: {
        subjectId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingConceptIdsBySubject(subjectId) {
    const rows = await this.prisma.suggestion.findMany({
      where: {
        subjectId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      select: { conceptId: true },
    });

    return new Set(rows.map((r) => r.conceptId));
  }

  async createMany(items) {
    if (!items || items.length === 0) return 0;
    const result = await this.prisma.suggestion.createMany({
      data: items,
      skipDuplicates: true,
    });
    return result.count || 0;
  }

  async findById(id) {
    return await this.prisma.suggestion.findUnique({
      where: { id },
    });
  }

  async updateStatus(id, status) {
    return await this.prisma.suggestion.update({
      where: { id },
      data: { status },
    });
  }
}

module.exports = SuggestionRepository;
