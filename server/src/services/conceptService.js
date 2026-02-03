/**
 * Concept Service
 * SRP: Chỉ xử lý concept-related business logic
 */

const ValidationException = require('../exceptions/ValidationException');

class ConceptService {
  constructor(conceptRepository, documentRepository, subjectRepository, aiService) {
    this.conceptRepository = conceptRepository;
    this.documentRepository = documentRepository;
    this.subjectRepository = subjectRepository;
    this.aiService = aiService;
  }

  /**
   * Xóa concept
   */
  async deleteConcept(conceptId) {
    const deleted = await this.conceptRepository.delete(conceptId);
    if (!deleted) {
      return { message: 'Khái niệm không tồn tại hoặc đã bị xóa.', conceptId };
    }
    return { message: 'Xóa khái niệm thành công!', conceptId };
  }

  /**
   * Xóa concept theo term trong subject (dùng cho node gộp)
   */
  async deleteConceptByTerm(subjectId, term) {
    if (!term || term.trim().length === 0) {
      throw new ValidationException('Vui lòng nhập tên khái niệm', 'term');
    }

    const deletedCount = await this.conceptRepository.deleteByTermInSubject(
      term.trim(),
      subjectId
    );

    if (deletedCount === 0) {
      return { message: 'Khái niệm không tồn tại hoặc đã bị xóa.', term };
    }

    return { message: `Đã xóa ${deletedCount} khái niệm cùng tên.`, term };
  }

  /**
   * Cập nhật concept theo term trong subject (node gộp)
   */
  async updateConceptByTerm(subjectId, currentTerm, data) {
    if (!currentTerm || currentTerm.trim().length === 0) {
      throw new ValidationException('Vui lòng nhập tên khái niệm hiện tại', 'currentTerm');
    }

    const newTerm = data?.newTerm?.trim();
    const definition = typeof data?.definition === 'string' ? data.definition.trim() : undefined;
    const example = typeof data?.example === 'string' ? data.example.trim() || null : undefined;

    const updatedCount = await this.conceptRepository.updateByTermInSubject(
      subjectId,
      currentTerm.trim(),
      {
        term: newTerm,
        definition,
        example,
      }
    );

    if (updatedCount === 0) {
      return { message: 'Khái niệm không tồn tại hoặc không có thay đổi.', currentTerm };
    }

    return { message: `Đã cập nhật ${updatedCount} khái niệm.`, currentTerm };
  }

  /**
   * Tìm concepts theo term trong một subject
   */
  async searchConceptsByTerm(term, subjectId) {
    return await this.conceptRepository.findByTermInSubject(term, subjectId);
  }

  /**
   * Gợi ý liên kết concept cho note (NLP nhẹ)
   */
  async suggestLinks(subjectId, noteText, options = {}) {
    if (!noteText || noteText.trim().length === 0) {
      throw new ValidationException('Vui lòng nhập nội dung note', 'noteText');
    }

    const conceptsInDB = await this.subjectRepository.findConceptsBySubject(subjectId);
    return this.aiService.suggestLinksForNote(noteText, conceptsInDB, options);
  }

  /**
   * Tạo concept thủ công
   */
  async createManualConcept(subjectId, data) {
    const { term, definition, noteText, pageNumber, documentId, linkToConceptIds } = data;

    if (!term || term.trim().length === 0) {
      throw new ValidationException('Vui lòng nhập tên khái niệm', 'term');
    }

    let finalDocumentId = documentId;

    // Nếu không có documentId, tạo hoặc tìm document "Ghi chú cá nhân"
    if (!documentId) {
      const personalNotesDoc = await this.documentRepository.findOrCreatePersonalNotes(subjectId);
      finalDocumentId = personalNotesDoc.id;
    } else {
      // Kiểm tra document có thuộc subject này không
      const document = await this.documentRepository.findById(documentId);
      if (document.subjectId !== subjectId) {
        throw new ValidationException('Tài liệu không thuộc môn học này', 'documentId');
      }
    }

    const created = await this.conceptRepository.create({
      term: term.trim(),
      definition: (definition || noteText || '').trim() || 'Chưa có định nghĩa',
      pageNumber: Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1,
      documentId: finalDocumentId,
    });

    if (Array.isArray(linkToConceptIds) && linkToConceptIds.length > 0) {
      for (const targetId of linkToConceptIds) {
        await this.conceptRepository.createRelation(created.id, targetId, 'suggested');
      }
    }

    return { message: 'Tạo khái niệm thủ công thành công!', concept: created };
  }

  /**
   * Tạo concept
   */
  async createConcept(data) {
    return await this.conceptRepository.create(data);
  }

  /**
   * Cập nhật concept
   */
  async updateConcept(conceptId, data) {
    return await this.conceptRepository.update(conceptId, data);
  }
}

module.exports = ConceptService;
