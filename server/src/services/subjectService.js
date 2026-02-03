/**
 * Subject Service
 * SRP: Chỉ xử lý subject-related business logic
 */

const UnauthorizedException = require('../exceptions/UnauthorizedException');

class SubjectService {
  constructor(subjectRepository, documentRepository, conceptRepository) {
    this.subjectRepository = subjectRepository;
    this.documentRepository = documentRepository;
    this.conceptRepository = conceptRepository;
  }

  /**
   * Lấy danh sách môn học của user
   */
  async getUserSubjects(userId) {
    return await this.subjectRepository.findAll({ userId });
  }

  /**
   * Tạo môn học mới
   */
  async createSubject(userId, { name, description }) {
    return await this.subjectRepository.create({
      name,
      description,
      userId,
    });
  }

  /**
   * Lấy chi tiết môn học (với kiểm tra quyền)
   */
  async getSubjectDetail(subjectId, userId) {
    const subject = await this.subjectRepository.findByIdAndUserId(subjectId, userId);
    return subject;
  }

  /**
   * Xóa môn học (với cascade)
   */
  async deleteSubject(subjectId, userId) {
    const subject = await this.subjectRepository.findByIdAndUserId(subjectId, userId);

    // Xóa tất cả documents trong subject
    const documents = await this.documentRepository.findBySubjectId(subjectId);

    for (const doc of documents) {
      await this.documentRepository.deleteWithRelations(doc.id);
    }

    // Xóa subject
    await this.subjectRepository.delete(subjectId);

    return { message: 'Xóa môn học thành công!' };
  }

  /**
   * Lấy danh sách tài liệu của subject
   */
  async getSubjectDocuments(subjectId) {
    return await this.documentRepository.findBySubjectId(subjectId);
  }

  /**
   * Lấy graph dữ liệu để visualize
   */
  async getSubjectGraph(subjectId) {
    const { concepts, documents, relations } = await this.subjectRepository.getSubjectGraph(
      subjectId
    );

    const nodes = [];
    const links = [];
    const conceptMap = new Map();
    const conceptIdToNodeId = new Map();

    // Tạo nodes cho documents
    documents.forEach((doc) => {
      const isPersonalNotes = doc.title === '📝 Ghi chú cá nhân' || doc.filePath === '__personal_notes__';
      nodes.push({
        id: `FILE_${doc.id}`,
        name: doc.title,
        val: isPersonalNotes ? 25 : 30,
        color: isPersonalNotes ? '#f59e0b' : '#ef4444', // Vàng cho personal notes, đỏ cho PDF
        type: isPersonalNotes ? 'PersonalNotes' : 'Source',
      });
    });

    // Gộp concepts cùng tên
    concepts.forEach((concept) => {
      const normalizedTerm = concept.term.toLowerCase().trim();
      conceptIdToNodeId.set(concept.id, normalizedTerm);

      if (!conceptMap.has(normalizedTerm)) {
        conceptMap.set(normalizedTerm, {
          term: concept.term,
          definition: concept.definition,
          example: concept.example,
          pages: [concept.pageNumber],
          documentIds: [concept.documentId],
          occurrences: 1,
          isFromPersonalNotes: concept.document?.filePath === '__personal_notes__' || concept.document?.title === '📝 Ghi chú cá nhân',
        });
      } else {
        const existing = conceptMap.get(normalizedTerm);
        existing.occurrences++;
        if (!existing.pages.includes(concept.pageNumber)) {
          existing.pages.push(concept.pageNumber);
        }
        if (!existing.documentIds.includes(concept.documentId)) {
          existing.documentIds.push(concept.documentId);
        }
      }
    });

    // Tạo nodes từ concepts
    for (const [normalizedTerm, conceptData] of conceptMap.entries()) {
      // Xác định màu: Vàng/Cam cho personal notes, Xanh cho concepts từ PDF
      let color;
      let type;
      
      if (conceptData.isFromPersonalNotes) {
        color = '#fbbf24'; // Vàng cho personal notes
        type = 'PersonalNote';
      } else if (conceptData.occurrences > 1) {
        color = '#3b82f6'; // Xanh cho concepts xuất hiện nhiều
        type = 'Concept';
      } else {
        color = '#60a5fa'; // Xanh nhạt cho concepts đơn lẻ
        type = 'Concept';
      }

      nodes.push({
        id: normalizedTerm,
        name: conceptData.term,
        definition: conceptData.definition,
        example: conceptData.example,
        page: conceptData.pages[0],
        documentId: conceptData.documentIds[0],
        val: 10 + conceptData.occurrences * 2,
        color: color,
        type: type,
        occurrences: conceptData.occurrences,
        allPages: conceptData.pages,
        allDocumentIds: conceptData.documentIds,
        isPersonalNote: conceptData.isFromPersonalNotes,
      });
    }

    // Tạo links
    const linkSet = new Set();
    concepts.forEach((concept) => {
      const normalizedTerm = concept.term.toLowerCase().trim();
      const linkKey = `FILE_${concept.documentId}|${normalizedTerm}`;
      if (!linkSet.has(linkKey)) {
        links.push({
          source: `FILE_${concept.documentId}`,
          target: normalizedTerm,
        });
        linkSet.add(linkKey);
      }
    });

    // Thêm links giữa các concepts (relation)
    relations.forEach((relation) => {
      const sourceNodeId = conceptIdToNodeId.get(relation.sourceId);
      const targetNodeId = conceptIdToNodeId.get(relation.targetId);
      if (!sourceNodeId || !targetNodeId) return;

      const relationKey = `REL_${sourceNodeId}|${targetNodeId}|${relation.type || 'related'}`;
      if (!linkSet.has(relationKey)) {
        links.push({
          source: sourceNodeId,
          target: targetNodeId,
          type: relation.type || 'related',
        });
        linkSet.add(relationKey);
      }
    });

    return { nodes, links, documents };
  }
}

module.exports = SubjectService;
