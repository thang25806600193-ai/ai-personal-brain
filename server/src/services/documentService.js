/**
 * Document Service
 * SRP: Chỉ xử lý document-related business logic
 */

const fs = require('fs');
const pdf = require('pdf-parse');
const ValidationException = require('../exceptions/ValidationException');

class DocumentService {
  constructor(documentRepository, conceptRepository, subjectRepository, aiService) {
    this.documentRepository = documentRepository;
    this.conceptRepository = conceptRepository;
    this.subjectRepository = subjectRepository;
    this.aiService = aiService;
  }

  /**
   * Upload và process document
   */
  async uploadDocument(file, subjectId) {
    if (!file) {
      throw new ValidationException('Vui lòng upload file PDF', 'file');
    }

    try {
      // Đọc PDF theo trang
      const pages = await this._extractPdfPages(file.path);
      const fullText = pages.join('\n');
      const totalPages = pages.length || 1;

      // Lấy hoặc tạo subject
      let subject = await this.subjectRepository.findById(subjectId).catch(() => null);
      if (!subject) {
        subject = await this.subjectRepository.create({
          name: 'Môn học Demo',
          userId: 'demo-user',
        });
        subjectId = subject.id;
      }

      // Tạo document
      const newDoc = await this.documentRepository.create({
        title: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        subjectId,
      });

      // Trích xuất concepts bằng AI (Gemini/Groq)
      const concepts = await this._extractConceptsViaAI(fullText);

      // Lưu concepts vào DB với deduplication
      await this._saveConcepts(concepts, newDoc.id, subjectId);

      return {
        message: 'Xử lý thành công!',
        document: newDoc,
        extractedConcepts: concepts,
        totalPages,
      };
    } catch (error) {
      // Xóa file nếu lỗi
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  /**
   * Xóa document
   */
  async deleteDocument(documentId) {
    const document = await this.documentRepository.deleteWithRelations(documentId);

    // Xóa file từ disk
    if (document.filePath && fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
      console.log(`✅ Xóa file: ${document.filePath}`);
    }

    return { message: 'Xóa tài liệu thành công!', documentId };
  }

  /**
   * Private method: Extract text từ PDF
   */
  async _extractPdfPages(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pages = [];

      await pdf(dataBuffer, {
        pagerender: (pageData) =>
          pageData
            .getTextContent({ normalizeWhitespace: true })
            .then((textContent) => {
              const pageText = textContent.items.map((item) => item.str).join(' ');
              pages.push(pageText);
              return pageText;
            }),
      });

      return pages;
    } catch (error) {
      console.error('❌ Lỗi đọc PDF:', error);
      throw new ValidationException('Không thể đọc nội dung file PDF này');
    }
  }

  /**
   * Private method: Trích xuất concepts bằng NLP nhẹ (rule-based)
   */
  async _extractConceptsLight(pages) {
    const concepts = [];
    const seen = new Set();

    const addConcept = (term, definition, page = 1) => {
      const cleanTerm = term.trim();
      const cleanDef = definition.trim();
      // Term must be at least 2 words or longer than 10 chars
      const termWords = cleanTerm.split(/\s+/);
      if (termWords.length === 1 && cleanTerm.length < 10) return;
      if (cleanTerm.length < 2 || cleanDef.length < 10) return;

      const key = this.aiService.normalizeText(cleanTerm);
      if (seen.has(key)) return;

      seen.add(key);
      concepts.push({ term: cleanTerm, definition: cleanDef, page });
    };

    const isHeading = (line) => {
      if (line.length > 60) return false;
      if (/[.!?]/.test(line)) return false;
      const words = line.split(' ');
      return words.length <= 6;
    };

    const isChapterOrSectionHeading = (line) => {
      // Filter out chapter headings: "CHƯƠNG 1", "Chapter 1", "Phần I"
      if (/^(CHƯƠNG|PHẦN|BÀI|Chapter|Section|Part)\s+[0-9IVX]+/i.test(line)) return true;
      // Filter out all-caps section titles: "TỔNG QUAN", "GIỚI THIỆU"
      if (/^[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴĐ\s]{5,60}$/.test(line) && !/\d/.test(line)) return true;
      // Filter out numbered sections: "1.", "1.1", "2.3.4"
      if (/^\d+(\.\d+)*\.?\s*$/.test(line)) return true;
      // Filter out generic section words
      if (/^(Định nghĩa|Giới thiệu|Tóm tắt|Kết luận|Mục đích|Ứng dụng|Phân loại|Đặc điểm|Ví dụ|Bài tập|Definition|Introduction|Summary|Conclusion|Example)s?$/i.test(line)) return true;
      return false;
    };

    const splitIntoLines = (pageText) => {
      const rawLines = pageText
        .split('\n')
        .map((l) => l.replace(/\s+/g, ' ').trim())
        .filter((l) => l.length > 0);

      if (rawLines.length > 1) return rawLines;

      return pageText
        .split(/(?<=[.!?])\s+|•|\u2022/g)
        .map((l) => l.replace(/\s+/g, ' ').trim())
        .filter((l) => l.length > 0);
    };

    for (let p = 0; p < pages.length; p++) {
      const lines = splitIntoLines(pages[p]);
      const pageNumber = p + 1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cleaned = line.replace(/^[•\-*]\s*/, '');

        // Pattern: Term: Definition
        let match = cleaned.match(/^(.{2,60})\s*[:\-]\s*(.{10,400})$/);
        if (match) {
          addConcept(match[1], match[2], pageNumber);
          continue;
        }

        // Pattern: Term là / được hiểu là / được gọi là Definition
        match = cleaned.match(/^(.{2,60})\s+(là|được hiểu là|được gọi là)\s+(.{10,400})$/i);
        if (match) {
          addConcept(match[1], match[3], pageNumber);
          continue;
        }

        // Heading + next line as definition (only if not chapter/section heading)
        if (isHeading(cleaned) && !isChapterOrSectionHeading(cleaned) && lines[i + 1] && lines[i + 1].length > 15 && !isChapterOrSectionHeading(lines[i + 1])) {
          addConcept(cleaned.replace(/:$/, ''), lines[i + 1], pageNumber);
          i += 1;
        }
      }
    }

    return concepts.slice(0, 7);
  }

  /**
   * Private method: Merge concepts from NLP + AI, dedupe by term
   */
  _mergeConcepts(primary, secondary) {
    const map = new Map();

    primary.forEach((c) => {
      map.set(this.aiService.normalizeText(c.term), c);
    });

    secondary.forEach((c) => {
      const key = this.aiService.normalizeText(c.term);
      if (!map.has(key)) {
        map.set(key, c);
      }
    });

    return Array.from(map.values());
  }

  /**
   * Private method: Gọi AI để trích xuất concepts
   */
  async _extractConceptsViaAI(text) {
    const prompt = `
      Dựa vào tài liệu học tập sau, hãy trích xuất 5-7 khái niệm quan trọng nhất.
      
      Với mỗi khái niệm:
      - term: Tên khái niệm
      - definition: Định nghĩa rõ ràng
      - example: Ví dụ minh họa từ tài liệu (nếu có). 
        + QUAN TRỌNG: CHỈ lấy ví dụ có thật trong tài liệu, KHÔNG tự bịa.
        + Nếu ví dụ là CODE thì bảo toàn format, xuống dòng, indent nguyên gốc
        + Nếu không có ví dụ thì để null
      - page: Số trang (mặc định 1)
      
      Trả về JSON CHUẨN dạng: [{"term": "...", "definition": "...", "example": "..." hoặc null, "page": 1}]
      Tuyệt đối chỉ trả về JSON, không thêm lời dẫn.
      
      Văn bản: "${text.substring(0, 4000)}..."
    `;

    const aiResponse = await this.aiService.ask(prompt);

    try {
      const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('⚠️ Lỗi parse JSON từ AI:', error);
      return [];
    }
  }

  /**
   * Private method: Lưu concepts với deduplication
   */
  async _saveConcepts(concepts, documentId, subjectId) {
    for (const concept of concepts) {
      const normalizedTerm = concept.term.toLowerCase().trim();

      // Kiểm tra xem concept đã tồn tại trong subject chưa
      // (Placeholder: implement concept deduplication logic)

      await this.conceptRepository.create({
        term: concept.term,
        definition: concept.definition,
        example: concept.example || null,
        pageNumber: concept.page || 1,
        documentId,
      });
    }
  }
}

module.exports = DocumentService;
