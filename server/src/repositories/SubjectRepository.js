/**
 * Subject Repository
 * SRP: Chỉ xử lý Subject-related database operations
 */

const BaseRepository = require('./BaseRepository');
const ResourceNotFoundException = require('../exceptions/ResourceNotFoundException');

class SubjectRepository extends BaseRepository {
  async findById(id) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        _count: { select: { documents: true } },
      },
    });

    if (!subject) {
      throw new ResourceNotFoundException('Subject', id);
    }

    return subject;
  }

  async findByIdAndUserId(id, userId) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { documents: true } },
      },
    });

    if (!subject) {
      throw new ResourceNotFoundException('Subject', id);
    }

    return subject;
  }

  async findAll(filters = {}) {
    return await this.prisma.subject.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { documents: true } } },
    });
  }

  async create(data) {
    return await this.prisma.subject.create({
      data,
      include: { _count: { select: { documents: true } } },
    });
  }

  async update(id, data) {
    return await this.prisma.subject.update({
      where: { id },
      data,
    });
  }

  async delete(id) {
    return await this.prisma.subject.delete({
      where: { id },
    });
  }

  async findConceptsBySubject(subjectId) {
    return await this.prisma.concept.findMany({
      where: { document: { subjectId } },
      select: {
        id: true,
        term: true,
        definition: true,
        document: { select: { title: true, id: true } },
      },
      distinct: ['term'],
    });
  }

  async getSubjectGraph(subjectId) {
    const concepts = await this.prisma.concept.findMany({
      where: { document: { subjectId } },
      include: {
        document: {
          select: { title: true, id: true },
        },
      },
    });

    const documents = await this.prisma.document.findMany({
      where: { subjectId },
    });

    const relations = await this.prisma.relation.findMany({
      where: {
        source: { document: { subjectId } },
        target: { document: { subjectId } },
      },
      select: { sourceId: true, targetId: true, type: true },
    });

    return { concepts, documents, relations };
  }
}

module.exports = SubjectRepository;
