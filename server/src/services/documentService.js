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
      const concepts = await this._extractConceptsViaAI(pages, fullText);

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
  _splitPageIntoSentences(pageText) {
    return pageText
      .replace(/\s+/g, ' ')
      .trim()
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  _chunkSentences(pages, options = {}) {
    const targetWords = options.targetWords ?? 1500;
    const overlapRatio = options.overlapRatio ?? 0.15;
    const overlapWords = Math.max(1, Math.floor(targetWords * overlapRatio));

    const sentences = [];
    pages.forEach((pageText, index) => {
      const pageNumber = index + 1;
      const pageSentences = this._splitPageIntoSentences(pageText);
      pageSentences.forEach((text) => {
        sentences.push({ text, page: pageNumber });
      });
    });

    const chunks = [];
    let current = [];
    let currentWords = 0;

    const countWords = (text) => text.split(/\s+/).filter(Boolean).length;

    const finalizeChunk = () => {
      if (current.length === 0) return;
      const pagesInChunk = current.map((s) => s.page);
      const startPage = Math.min(...pagesInChunk);
      const endPage = Math.max(...pagesInChunk);
      chunks.push({
        text: current.map((s) => s.text).join(' '),
        startPage,
        endPage,
      });
    };

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const words = countWords(sentence.text);

      if (currentWords + words > targetWords && current.length > 0) {
        finalizeChunk();

        let overlapCount = 0;
        const overlapSentences = [];
        for (let j = current.length - 1; j >= 0; j--) {
          overlapSentences.unshift(current[j]);
          overlapCount += countWords(current[j].text);
          if (overlapCount >= overlapWords) break;
        }

        current = overlapSentences;
        currentWords = overlapCount;
      }

      current.push(sentence);
      currentWords += words;
    }

    finalizeChunk();

    return chunks;
  }

  _safeParseJsonArray(aiResponse) {
    try {
      const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('⚠️ Lỗi parse JSON từ AI:', error);
      return [];
    }
  }

  _dedupeConcepts(concepts) {
    const map = new Map();
    concepts.forEach((concept) => {
      if (!concept || !concept.term) return;
      const key = this.aiService.normalizeText(concept.term);
      if (!map.has(key)) {
        map.set(key, concept);
      }
    });
    return Array.from(map.values());
  }

  _formatConceptsForAI(concepts) {
    return concepts
      .map((c) => {
        const term = c.term || '';
        const definition = c.definition || '';
        const example = c.example ?? null;
        const page = c.page || 1;
        return { term, definition, example, page };
      })
      .filter((c) => c.term && c.definition);
  }

  async _extractConceptsViaAI(pages, textFallback) {
    const chunks = this._chunkSentences(pages.length > 0 ? pages : [textFallback]);
    const allConcepts = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const prompt = `
        Nhiệm vụ: Liệt kê TẤT CẢ khái niệm mới xuất hiện trong đoạn sau.
        
        Mỗi khái niệm gồm:
        - term: Tên khái niệm
        - definition: Định nghĩa rõ ràng
        - example: Ví dụ minh họa từ đoạn (nếu có).
          + QUAN TRỌNG: CHỈ lấy ví dụ có thật trong đoạn, KHÔNG tự bịa.
          + Nếu ví dụ là CODE thì bảo toàn format, xuống dòng, indent nguyên gốc
          + Nếu không có ví dụ thì để null
        - page: Số trang (chọn 1 trang phù hợp trong khoảng ${chunk.startPage}-${chunk.endPage})
        
        Trả về JSON CHUẨN dạng: [{"term": "...", "definition": "...", "example": "..." hoặc null, "page": 1}]
        Tuyệt đối chỉ trả về JSON, không thêm lời dẫn.
        
        Đoạn ${i + 1}/${chunks.length} (trang ${chunk.startPage}-${chunk.endPage}):
        """${chunk.text}"""
      `;

      try {
        const aiResponse = await this.aiService.ask(prompt);
        const parsed = this._safeParseJsonArray(aiResponse);
        allConcepts.push(...parsed);
      } catch (error) {
        console.error(`⚠️ Lỗi AI ở chunk ${i + 1}:`, error);
      }
    }

    const deduped = this._dedupeConcepts(allConcepts);
    const formatted = this._formatConceptsForAI(deduped);

    if (formatted.length === 0) return [];

    const reducePrompt = `
      Bạn đang có danh sách khái niệm thô từ nhiều đoạn.
      Hãy lọc trùng, chỉnh sửa lại cho rõ ràng, và sắp xếp theo nhóm chủ đề (vẫn trả về mảng phẳng).
      
      Trả về JSON CHUẨN dạng: [{"term": "...", "definition": "...", "example": "..." hoặc null, "page": 1}]
      Tuyệt đối chỉ trả về JSON, không thêm lời dẫn.
      
      Danh sách đầu vào: ${JSON.stringify(formatted)}
    `;

    try {
      const reduceResponse = await this.aiService.ask(reducePrompt);
      const reduced = this._safeParseJsonArray(reduceResponse);
      return reduced.length > 0 ? reduced : formatted;
    } catch (error) {
      console.error('⚠️ Lỗi reduce concepts từ AI:', error);
      return formatted;
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
