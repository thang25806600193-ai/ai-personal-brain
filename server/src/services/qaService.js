/**
 * Question/Answer Service
 * SRP: Chỉ xử lý Q&A logic dựa trên Knowledge Graph
 */

const ValidationException = require('../exceptions/ValidationException');

class QAService {
  constructor(subjectRepository, aiService, vectorSearchService = null) {
    this.subjectRepository = subjectRepository;
    this.aiService = aiService;
    this.vectorSearchService = vectorSearchService;
  }

  /**
   * Trả lời câu hỏi dựa trên Knowledge Graph của subject
   */
  async answerQuestion(subjectId, question) {
    if (!question || question.trim().length === 0) {
      throw new ValidationException('Vui lòng nhập câu hỏi', 'question');
    }

    console.log(`💬 Câu hỏi: "${question}"`);

    const semanticMatches = this.vectorSearchService
      ? await this.vectorSearchService.searchSimilar(subjectId, question, 6)
      : [];

    // Lấy danh sách concepts của subject
    const conceptsInDB = await this.subjectRepository.findConceptsBySubject(subjectId);

    if (conceptsInDB.length === 0 && semanticMatches.length === 0) {
      console.log('⚠️ Chưa có concepts nào trong subject');
      return {
        answer: 'Xin lỗi, môn học này chưa có tài liệu hoặc khái niệm nào. Hãy upload tài liệu trước.',
        concepts: [],
        foundConcepts: [],
        fromGeneralKnowledge: true,
      };
    }

    if (conceptsInDB.length === 0 && semanticMatches.length > 0) {
      const { answer, contextSource } = await this._generateAnswer(question, [], 'general', semanticMatches);
      return {
        answer,
        concepts: [],
        foundConcepts: contextSource,
        fromGeneralKnowledge: false,
      };
    }

    // Trích xuất concepts liên quan từ câu hỏi
    const extractedTerms = await this.aiService.extractConceptsFromQuestion(
      question,
      conceptsInDB
    );

    if (extractedTerms.length === 0 && semanticMatches.length === 0) {
      console.log('⚠️ Không nhận diện được khái niệm nào');
      return {
        answer:
          'Xin lỗi, không tìm thấy khái niệm liên quan trong tài liệu của bạn. Hãy hỏi về các chủ đề mà bạn đã upload tài liệu.',
        concepts: [],
        foundConcepts: [],
        fromGeneralKnowledge: true,
      };
    }

    console.log('🔍 Terms khớp:', extractedTerms);

    // Tìm chi tiết thông tin của các concepts
    const detailedConcepts = await this._findDetailedConcepts(extractedTerms, conceptsInDB);

    console.log(`📚 Tìm thấy ${detailedConcepts.length} concept có định nghĩa`);

    const intent = this._detectIntent(question);
    console.log(`🧠 Intent: ${intent}`);

    // Quyết định: trả lời trực tiếp nếu là câu hỏi định nghĩa và có definition
    if (intent === 'definition' && detailedConcepts.length > 0) {
      const bestConcept = this._pickBestConcept(question, detailedConcepts);
      const directAnswer = this._buildDirectDefinitionAnswer(bestConcept);
      const contextSource = [
        {
          term: bestConcept.term,
          definition: bestConcept.definition,
          source: bestConcept.document?.title || 'Tài liệu không rõ',
          page: bestConcept.pageNumber || 1,
        },
      ];

      console.log('✅ Trả lời trực tiếp từ Knowledge Graph (không gọi AI)');

      return {
        answer: directAnswer,
        concepts: extractedTerms,
        foundConcepts: contextSource,
        fromGeneralKnowledge: false,
      };
    }

    // Sinh câu trả lời
    const { answer, contextSource } = await this._generateAnswer(question, detailedConcepts, intent, semanticMatches);

    return {
      answer,
      concepts: extractedTerms,
      foundConcepts: contextSource,
      fromGeneralKnowledge: detailedConcepts.length === 0 && semanticMatches.length === 0,
    };
  }

  /**
   * Private: Tìm chi tiết concepts có definition
   */
  async _findDetailedConcepts(extractedTerms, conceptsInDB) {
    const detailed = [];

    for (const term of extractedTerms) {
      const matched = conceptsInDB.find(
        (c) => c.term.toLowerCase().trim() === term.toLowerCase().trim()
      );

      if (matched && matched.definition && matched.definition.trim().length > 0) {
        detailed.push(matched);
      }
    }

    return detailed;
  }

  /**
   * Private: Phân loại intent câu hỏi
   */
  _detectIntent(question) {
    const q = question.toLowerCase();
    const qn = this.aiService.normalizeText(question);

    if (/là gì|định nghĩa|khái niệm|meaning|define|what is/.test(q) || /la gi|dinh nghia|khai niem/.test(qn)) {
      return 'definition';
    }

    if (/so sánh|khác nhau|khác biệt|vs\.?|giữa|between|compare/.test(q) || /so sanh|khac nhau|khac biet|giua/.test(qn)) {
      return 'compare';
    }

    if (/tóm tắt|tổng hợp|overview|summary/.test(q) || /tom tat|tong hop/.test(qn)) {
      return 'summary';
    }

    if (/ví dụ|example/.test(q) || /vi du/.test(qn)) {
      return 'example';
    }

    if (/giải thích|explain|cách|how/.test(q) || /giai thich|cach/.test(qn)) {
      return 'explain';
    }

    return 'general';
  }

  /**
   * Private: Chọn concept phù hợp nhất
   */
  _pickBestConcept(question, concepts) {
    const normalizedQuestion = this.aiService.normalizeText(question);

    const scored = concepts.map((c) => {
      const normalizedTerm = this.aiService.normalizeText(c.term);
      let score = 0;

      // Ưu tiên exact match trong câu hỏi
      if (normalizedQuestion.includes(normalizedTerm)) {
        score += 3;
      }

      // Ưu tiên term ngắn và cụ thể
      const lengthPenalty = Math.min(normalizedTerm.length / 20, 1);
      score += 1 - lengthPenalty;

      // Ưu tiên có definition dài hơn
      if (c.definition && c.definition.trim().length > 20) {
        score += 1;
      }

      return { concept: c, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.concept || concepts[0];
  }

  /**
   * Private: Tạo câu trả lời định nghĩa trực tiếp từ node
   */
  _buildDirectDefinitionAnswer(concept) {
    const source = concept.document?.title || 'Tài liệu không rõ';
    const page = concept.pageNumber || 1;
    const def = (concept.definition || '').trim();
    const startsWithLa = /^(là|la)\b/i.test(def);
    const definitionText = startsWithLa ? def : `là ${def}`;

    return `📚 Theo tài liệu của bạn:\n${concept.term} ${definitionText}.\n(Nguồn: ${source} – trang ${page})`;
  }

  /**
   * Private: Sinh câu trả lời từ AI hoặc Knowledge Graph
   */
  async _generateAnswer(question, concepts, intent = 'general', semanticMatches = []) {
    let prompt;
    let contextSource = [];

    const semanticContextSource = semanticMatches.map((row) => ({
      term: row.sourceType === 'concept' ? 'Concept (semantic)' : 'PDF chunk',
      definition: row.content,
      source: row.documentTitle || 'Tài liệu không rõ',
      page: row.pageNumber || 1,
      similarity: row.similarity,
    }));

    const semanticContextText = semanticMatches
      .map(
        (row, idx) => `• [${idx + 1}] (${Math.round((row.similarity || 0) * 100)}%) ${row.content}\n  (Nguồn: ${row.documentTitle || 'Tài liệu không rõ'}${row.pageNumber ? ` – trang ${row.pageNumber}` : ''})`
      )
      .join('\n\n');

    if (concepts.length === 0 && semanticMatches.length === 0) {
      // Không có concept nào có định nghĩa → fallback AI
      prompt = `
        Câu hỏi: "${question}"
        
        Hãy trả lời dựa vào kiến thức chung một cách ngắn gọn, chính xác.
        
        Lưu ý:
        - Trả lời bằng tiếng Việt
        - Bắt đầu bằng: "⚠️ Thông tin này không có trong tài liệu của bạn, nhưng theo kiến thức chung:"
        - Thêm ví dụ minh họa nếu có
      `;
    } else {
      // Có concept có định nghĩa → trả lời từ Knowledge Graph
      contextSource = concepts.map((c) => ({
        term: c.term,
        definition: c.definition,
        source: c.document?.title || 'Tài liệu không rõ',
        page: c.pageNumber || 1,
      }));

      const conceptDetails = concepts
        .map((c) => {
          const source = c.document?.title || 'Tài liệu không rõ';
          const page = c.pageNumber || 1;
          return `• **${c.term}**: ${c.definition}\n  (Nguồn: ${source} – trang ${page})`;
        })
        .join('\n\n');

      if (semanticContextSource.length > 0) {
        contextSource = [...contextSource, ...semanticContextSource];
      }

      const semanticSection = semanticContextText
        ? `\n🔎 NGỮ CẢNH SEMANTIC TỪ VECTOR SEARCH:\n${semanticContextText}\n`
        : '';

      if (intent === 'example' || intent === 'compare' || intent === 'summary' || intent === 'explain') {
        prompt = `
          Bạn là trợ lý học tập. Hãy trả lời câu hỏi dựa trên tài liệu, và nếu tài liệu KHÔNG có ví dụ/so sánh/tổng hợp đầy đủ thì BỔ SUNG kiến thức chung.
          
          📚 KIẾN THỨC TỪ TÀI LIỆU CỦA HỌC VIÊN:
          ${conceptDetails}
          ${semanticSection}
          
          ❓ CÂU HỎI: "${question}"
          
          🎯 YÊU CẦU:
          1. BẮT ĐẦU bằng: "📚 Theo tài liệu của bạn:"
          2. Phần từ tài liệu: nêu đúng định nghĩa/ngữ cảnh có sẵn
          3. Nếu cần bổ sung ví dụ/so sánh → thêm mục: "💡 Tham khảo thêm (kiến thức chung):" và nêu rõ đây KHÔNG có trong tài liệu
          4. Cuối cùng ghi rõ nguồn tài liệu: "(Nguồn: [tên file] – trang [số])"
          5. Ngắn gọn, rõ ràng, tiếng Việt
          
          ❌ KHÔNG được:
          - Gộp kiến thức chung vào phần "Theo tài liệu"
          - Làm người đọc hiểu nhầm là tài liệu có ví dụ
        `;
      } else {
        prompt = `
          Bạn là trợ lý học tập. Dựa vào kiến thức có sẵn từ tài liệu để trả lời câu hỏi.
          
          📚 KIẾN THỨC TỪ TÀI LIỆU CỦA HỌC VIÊN:
          ${conceptDetails}
          ${semanticSection}
          
          ❓ CÂU HỎI: "${question}"
          
          🎯 YÊU CẦU:
          1. BẮT ĐẦU bằng: "📚 Theo tài liệu của bạn:"
          2. Trả lời DỰA TRÊN định nghĩa trên (không bịa thêm)
          3. Nếu có NHIỀU khái niệm → liên kết chúng logic
          4. Cuối cùng ghi rõ: "(Nguồn: [tên file] – trang [số])"
          5. Ngắn gọn, dễ hiểu, tiếng Việt
          
          ❌ KHÔNG được:
          - Nói "theo kiến thức chung"
          - Thêm thông tin không có trong tài liệu
          - Dùng từ "có thể", "thường là" (phải khẳng định)
        `;
      }
    }

    const answer = await this.aiService.ask(prompt);
    console.log('✅ Hoàn thành');

    return { answer, contextSource };
  }
}

module.exports = QAService;
