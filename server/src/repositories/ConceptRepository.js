/**
 * Concept Repository
 * SRP: Chỉ xử lý Concept-related database operations
 */

const BaseRepository = require('./BaseRepository');
const ResourceNotFoundException = require('../exceptions/ResourceNotFoundException');

class ConceptRepository extends BaseRepository {
  async findById(id) {
    const concept = await this.prisma.concept.findUnique({
      where: { id },
      include: {
        document: true,
        relatedFrom: true,
        relatedTo: true,
      },
    });

    if (!concept) {
      throw new ResourceNotFoundException('Concept', id);
    }

    return concept;
  }

  async create(data) {
    return await this.prisma.concept.create({
      data,
    });
  }

  async update(id, data) {
    console.log('📝 ConceptRepository.update called:');
    console.log('   ID:', id);
    console.log('   Data to update:', data);
    
    const result = await this.prisma.concept.update({
      where: { id },
      data,
    });
    
    console.log('✅ Update result:', {
      id: result.id,
      term: result.term,
      definition: result.definition ? '(set)' : '(not set)',
      example: result.example ? '(set)' : '(not set)'
    });
    
    return result;
  }

  async createRelations(sourceId, targetIds = []) {
    if (!sourceId || targetIds.length === 0) return 0;

    const data = targetIds.map((targetId) => ({
      sourceId,
      targetId,
    }));

    const result = await this.prisma.relation.createMany({
      data,
      skipDuplicates: true,
    });

    return result.count || 0;
  }

  async delete(id) {
    const existing = await this.prisma.concept.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) return null;

    // Xóa tất cả relations
    await this.prisma.relation.deleteMany({
      where: {
        OR: [{ sourceId: id }, { targetId: id }],
      },
    });

    return await this.prisma.concept.delete({
      where: { id },
    });
  }

  async deleteByTermInSubject(term, subjectId) {
    const concepts = await this.prisma.concept.findMany({
      where: {
        term: { equals: term, mode: 'insensitive' },
        document: { subjectId },
      },
      select: { id: true },
    });

    if (concepts.length === 0) return 0;

    const conceptIds = concepts.map((c) => c.id);

    await this.prisma.relation.deleteMany({
      where: {
        OR: [
          { sourceId: { in: conceptIds } },
          { targetId: { in: conceptIds } },
        ],
      },
    });

    const result = await this.prisma.concept.deleteMany({
      where: { id: { in: conceptIds } },
    });

    return result.count || 0;
  }

  async updateByTermInSubject(subjectId, currentTerm, data) {
    const updateData = {};
    if (data?.term) updateData.term = data.term;
    if (typeof data?.definition === 'string') updateData.definition = data.definition;
    if (data?.example !== undefined) updateData.example = data.example;

    if (Object.keys(updateData).length === 0) return 0;

    const result = await this.prisma.concept.updateMany({
      where: {
        term: { equals: currentTerm, mode: 'insensitive' },
        document: { subjectId },
      },
      data: updateData,
    });

    return result.count || 0;
  }

  async findIdsByTermInSubject(subjectId, term) {
    const rows = await this.prisma.concept.findMany({
      where: {
        term: { equals: term, mode: 'insensitive' },
        document: { subjectId },
      },
      select: { id: true },
    });

    return rows.map((r) => r.id);
  }

  async createRelation(sourceId, targetId, type = 'related') {
    const existing = await this.prisma.relation.findFirst({
      where: { sourceId, targetId, type },
    });

    if (existing) return existing;

    return await this.prisma.relation.create({
      data: { sourceId, targetId, type },
    });
  }

  async findByTermInSubject(term, subjectId) {
    return await this.prisma.concept.findMany({
      where: {
        term: { contains: term, mode: 'insensitive' },
        document: { subjectId },
      },
      include: {
        document: { select: { title: true } },
      },
    });
  }

  async findBySubjectId(subjectId) {
    return await this.prisma.concept.findMany({
      where: {
        document: { subjectId: String(subjectId) },
      },
      include: {
        document: { select: { title: true } },
        relatedFrom: true,
        relatedTo: true,
      },
    });
  }

  async bulkCreate(concepts) {
    return await Promise.all(
      concepts.map((concept) => this.create(concept))
    );
  }

  async findExistingConceptInSubject(normalizedTerm, subjectId) {
    return await this.prisma.concept.findFirst({
      where: {
        document: { subjectId },
        term: {
          // Search case-insensitive
          search: normalizedTerm,
        },
      },
    });
  }
}

module.exports = ConceptRepository;
