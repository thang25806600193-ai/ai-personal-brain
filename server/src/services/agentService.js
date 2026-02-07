/**
 * Agent Service - Phát hiện tri thức chưa hoàn thiện
 * SRP: Quét knowledge graph tìm gaps + gợi ý cải tiến
 */

class AgentService {
  constructor(subjectRepository, conceptRepository, aiService, suggestionRepository) {
    this.subjectRepository = subjectRepository;
    this.conceptRepository = conceptRepository;
    this.aiService = aiService;
    this.suggestionRepository = suggestionRepository;
  }

  /**
   * Phân tích độ hoàn chỉnh của knowledge graph
   * @returns { issues[], completenessScore }
   */
  async analyzeKnowledgeCompleteness(subjectId) {
    const concepts = await this.subjectRepository.findConceptsBySubject(subjectId);
    
    if (concepts.length === 0) {
      return {
        total: 0,
        issues: [],
        completenessScore: 0,
        message: 'Chưa có khái niệm nào để phân tích'
      };
    }

    const issues = [];

    // 1️⃣ Detect: Concept thiếu ví dụ
    const missingExamples = concepts.filter(c => 
      c.definition && 
      (!c.example || c.example.trim() === '')
    );
    
    if (missingExamples.length > 0) {
      missingExamples.slice(0, 5).forEach(concept => {
        issues.push({
          id: `example-${concept.id}`,
          type: 'missing-example',
          severity: 'medium',
          conceptId: concept.id,
          term: concept.term,
          definition: concept.definition,
          message: `"${concept.term}" thiếu ví dụ minh họa`,
          suggestion: `Thêm ví dụ để làm rõ "${concept.term}"`,
          linkedDocuments: concept.document ? [concept.document.title] : []
        });
      });
    }

    // 2️⃣ Detect: Định nghĩa quá ngắn (< 50 ký tự)
    const shortDefinitions = concepts.filter(c => 
      c.definition && 
      c.definition.trim().length < 50 && 
      c.definition.trim().length > 0
    );
    
    if (shortDefinitions.length > 0) {
      shortDefinitions.slice(0, 5).forEach(concept => {
        issues.push({
          id: `short-def-${concept.id}`,
          type: 'short-definition',
          severity: 'low',
          conceptId: concept.id,
          term: concept.term,
          currentDefinition: concept.definition,
          message: `"${concept.term}" có định nghĩa quá ngắn (${concept.definition.length} ký tự)`,
          suggestion: `Mở rộng định nghĩa của "${concept.term}" để chi tiết hơn`,
          linkedDocuments: concept.document ? [concept.document.title] : []
        });
      });
    }

    // 3️⃣ Detect: Concept cô lập (không có liên kết)
    const isolated = concepts.filter(c => 
      c.definition && 
      (!c.related || c.related.length === 0)
    );
    
    if (isolated.length > 0) {
      isolated.slice(0, 5).forEach(concept => {
        issues.push({
          id: `isolated-${concept.id}`,
          type: 'isolated-concept',
          severity: 'high',
          conceptId: concept.id,
          term: concept.term,
          definition: concept.definition,
          message: `"${concept.term}" cô lập - chưa liên kết với khái niệm khác`,
          suggestion: `Tìm liên kết giữa "${concept.term}" và các khái niệm liên quan`,
          linkedDocuments: concept.document ? [concept.document.title] : []
        });
      });
    }

    // 4️⃣ Detect: Concept thiếu định nghĩa
    const noDefinition = concepts.filter(c => 
      !c.definition || c.definition.trim() === ''
    );
    
    if (noDefinition.length > 0) {
      noDefinition.slice(0, 3).forEach(concept => {
        issues.push({
          id: `no-def-${concept.id}`,
          type: 'missing-definition',
          severity: 'high',
          conceptId: concept.id,
          term: concept.term,
          message: `"${concept.term}" không có định nghĩa`,
          suggestion: `Thêm định nghĩa cho "${concept.term}"`,
          linkedDocuments: concept.document ? [concept.document.title] : []
        });
      });
    }

    // 5️⃣ Tính completeness score
    const totalCheck = concepts.length;
    const withDefinition = concepts.filter(c => c.definition && c.definition.trim() !== '').length;
    const withExample = concepts.filter(c => c.example && c.example.trim() !== '').length;
    const withLinks = concepts.filter(c => c.related && c.related.length > 0).length;

    const completenessScore = Math.round(
      ((withDefinition + withExample + withLinks) / (totalCheck * 3)) * 100
    );

    return {
      total: concepts.length,
      stats: {
        withDefinition,
        withExample,
        withLinks
      },
      issues: issues.sort((a, b) => {
        const severityMap = { 'high': 3, 'medium': 2, 'low': 1 };
        return severityMap[b.severity] - severityMap[a.severity];
      }),
      completenessScore,
      message: completenessScore < 50 
        ? `⚠️ Tri thức chưa hoàn thiện (${completenessScore}%). Cần bổ sung ${issues.length} item`
        : completenessScore < 80
        ? `ℹ️ Tri thức khá hoàn thiện (${completenessScore}%). Có ${issues.length} đề xuất cải tiến`
        : `✅ Tri thức hoàn thiện (${completenessScore}%). Chỉ có ${issues.length} đề xuất nhỏ`
    };
  }

  /**
   * Gọi AI để gợi ý bổ sung nội dung cho concept
   */
  async generateSupplementalContent(conceptId, issue, conceptData) {
    const { term, definition, currentDefinition } = issue;
    
    let prompt = '';

    if (issue.type === 'missing-example') {
      prompt = `
Khái niệm: "${term}"
Định nghĩa: "${definition}"

Hãy tạo 2-3 ví dụ cụ thể và dễ hiểu về "${term}". 
Ví dụ phải ngắn gọn, dễ nhớ và liên quan đến thực tế.
Format: Trả về JSON { "examples": ["ví dụ 1", "ví dụ 2", "ví dụ 3"] }
      `;
    } else if (issue.type === 'short-definition') {
      prompt = `
Khái niệm: "${term}"
Định nghĩa hiện tại: "${currentDefinition}"

Hãy mở rộng định nghĩa để chi tiết hơn (150-200 từ), giải thích rõ:
- Ý nghĩa cơ bản
- Đặc điểm chính
- Phân biệt với các khái niệm tương tự (nếu có)

Format: Trả về JSON { "expandedDefinition": "nội dung mở rộng" }
      `;
    } else if (issue.type === 'isolated-concept') {
      prompt = `
Khái niệm: "${term}"
Định nghĩa: "${definition}"

Hãy gợi ý 3-5 khái niệm liên quan mà "${term}" có thể kết nối.
Giải thích mối liên hệ giữa chúng.

Format: Trả về JSON { 
  "relatedConcepts": [
    { "name": "khái niệm 1", "relationship": "mối liên hệ" },
    { "name": "khái niệm 2", "relationship": "mối liên hệ" }
  ]
}
      `;
    } else if (issue.type === 'missing-definition') {
      prompt = `
Khái niệm: "${term}"

Hãy tạo định nghĩa ngắn gọn, dễ hiểu cho "${term}" (50-100 từ).
Định nghĩa phải chính xác, không quá kỹ thuật.

Format: Trả về JSON { "definition": "nội dung định nghĩa" }
      `;
    }

    if (!prompt) return null;

    try {
      const response = await this.aiService.ask(prompt);
      
      // Parse JSON từ response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('❌ AI generation error:', error.message);
      return null;
    }
  }

  /**
   * Tạo suggestion package để gửi client
   * 🔧 Fix: Batch AI calls - Gọi LLM đúng 1 lần thay vì N lần
   */
  async createSuggestionPackage(subjectId) {
    // 1) Nếu đã có pending suggestions trong DB thì trả về luôn
    const existing = await this.suggestionRepository.findPendingBySubject(subjectId);
    if (existing && existing.length > 0) {
      return {
        subjectId,
        suggestions: existing.map((s) => ({
          id: s.id,
          conceptId: s.conceptId,
          term: s.term,
          type: s.type,
          issue: {
            type: s.type,
            severity: s.severity,
            message: s.message,
            suggestion: s.suggestion,
          },
          aiSuggestion: s.aiSuggestion || {},
          status: s.status,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
        })),
        hasIssues: true,
        message: '✅ Đã tải lại các đề xuất chưa xử lý từ DB',
      };
    }

    const analysis = await this.analyzeKnowledgeCompleteness(subjectId);
    
    if (analysis.issues.length === 0) {
      return {
        subjectId,
        suggestions: [],
        hasIssues: false,
        message: analysis.message
      };
    }

    // 2) Bỏ qua các concept đã có pending suggestion để tránh spam
    const pendingConceptIds = await this.suggestionRepository.findPendingConceptIdsBySubject(subjectId);
    const filteredIssues = analysis.issues.filter(
      (issue) => !pendingConceptIds.has(issue.conceptId)
    );

    if (filteredIssues.length === 0) {
      return {
        subjectId,
        suggestions: [],
        hasIssues: false,
        completenessScore: analysis.completenessScore,
        totalConcepts: analysis.total,
        message: '✅ Không có gợi ý mới (đã có pending cho các khái niệm này)',
      };
    }

    // Lấy top 5 issues nguy hiểm nhất
    const topIssues = filteredIssues.slice(0, 5);

    // 🔧 BATCH: Gộp lại tất cả issues thành 1 prompt duy nhất
    const batchPrompt = this._generateBatchPrompt(topIssues);
    
    console.log('🔄 Batch AI call (1 lần) cho', topIssues.length, 'issues');
    
    let batchResult = {};
    try {
      const response = await this.aiService.ask(batchPrompt);
      
      // Parse JSON từ response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        batchResult = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('❌ Batch AI generation error:', error.message);
    }

    const suggestions = [];
    const now = new Date();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < topIssues.length; i++) {
      const issue = topIssues[i];
      const concept = await this.conceptRepository.findById(issue.conceptId);
      
      // Lấy suggestion từ batch result
      const aiSuggestion = batchResult[`issue_${i}`] || {};

      suggestions.push({
        id: issue.id,
        conceptId: issue.conceptId,
        term: issue.term,
        type: issue.type,
        issue: {
          type: issue.type,
          severity: issue.severity,
          message: issue.message,
          suggestion: issue.suggestion
        },
        aiSuggestion: aiSuggestion,
        status: 'pending', // pending, approved, rejected
        createdAt: now,
        expiresAt
      });
    }

    // 2) Lưu suggestions vào DB để tái sử dụng ở thiết bị khác
    await this.suggestionRepository.createMany(
      suggestions.map((s) => ({
        subjectId,
        conceptId: s.conceptId,
        term: s.term,
        type: s.type,
        severity: s.issue.severity,
        message: s.issue.message,
        suggestion: s.issue.suggestion,
        aiSuggestion: s.aiSuggestion,
        status: 'pending',
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      }))
    );

    const saved = await this.suggestionRepository.findPendingBySubject(subjectId);
    return {
      subjectId,
      suggestions: saved.map((s) => ({
        id: s.id,
        conceptId: s.conceptId,
        term: s.term,
        type: s.type,
        issue: {
          type: s.type,
          severity: s.severity,
          message: s.message,
          suggestion: s.suggestion,
        },
        aiSuggestion: s.aiSuggestion || {},
        status: s.status,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
      hasIssues: saved.length > 0,
      completenessScore: analysis.completenessScore,
      totalConcepts: analysis.total,
      message: analysis.message
    };
  }

  /**
   * Tạo batch prompt - Gộp tất cả issues thành 1 prompt
   */
  _generateBatchPrompt(issues) {
    const issueDetails = issues.map((issue, idx) => {
      let details = `Issue ${idx}: ${issue.term} (${issue.type})\n`;
      details += `Definition: "${issue.definition || 'N/A'}"\n`;
      details += `Current Definition: "${issue.currentDefinition || 'N/A'}"\n`;
      return details;
    }).join('\n---\n');

    const prompt = `
Tôi có ${issues.length} khái niệm trong hệ thống cần cải tiến. Hãy cung cấp đề xuất cho từng khái niệm.

${issueDetails}

Trả về JSON với cấu trúc:
{
  "issue_0": {
    "examples": ["ví dụ 1", "ví dụ 2"] hoặc
    "expandedDefinition": "..." hoặc
    "definition": "..." hoặc
    "relatedConcepts": [{"name": "...", "relationship": "..."}]
  },
  "issue_1": { ... },
  ...
}

Mỗi issue có thể trả một trong các field tùy theo loại issue.
    `;

    return prompt;
  }

  /**
   * Áp dụng suggestion (merge AI suggestion vào concept)
   * 🔧 Fix: Lưu đúng format vào database
   */
  async applySuggestion(subjectId, suggestionId, approvedContent) {
    try {
      let { conceptId, type, data } = approvedContent;

      // Nếu có suggestionId thì lấy từ DB để đảm bảo type và aiSuggestion
      if (suggestionId) {
        const dbSuggestion = await this.suggestionRepository.findById(suggestionId);
        if (dbSuggestion) {
          if (!conceptId) conceptId = dbSuggestion.conceptId;
          if (!type) type = dbSuggestion.type;
          if (!data || Object.keys(data).length === 0) {
            data = dbSuggestion.aiSuggestion || {};
          }
        }
      }

      if (!conceptId) {
        throw new Error('Missing conceptId');
      }

      // Fallback: infer type from suggestionId if missing
      if (!type && suggestionId) {
        const knownTypes = ['missing-example', 'short-definition', 'isolated-concept', 'missing-definition'];
        type = knownTypes.find((t) => suggestionId.startsWith(t)) || type;
      }

      // Fallback: generate AI content if data is empty
      if (!data || Object.keys(data).length === 0) {
        const concept = await this.conceptRepository.findById(conceptId);
        const issue = {
          type,
          term: concept.term,
          definition: concept.definition,
          currentDefinition: concept.definition,
        };
        const generated = await this.generateSupplementalContent(conceptId, issue, concept);
        data = generated || {};
      }

      console.log('💾 Applying suggestion for concept:', conceptId);
      console.log('   Type:', type);
      console.log('   Data keys:', Object.keys(data));

      const updatePayload = {};

      // Xử lý nội dung suggestion (không phụ thuộc type để tránh lỗi mismatch)
      if (data.examples && Array.isArray(data.examples)) {
        updatePayload.example = data.examples.join('\n• ');
        console.log('   ✅ Set example');
      }
      
      if (data.expandedDefinition) {
        updatePayload.definition = data.expandedDefinition;
        console.log('   ✅ Set expandedDefinition');
      }
      
      if (data.definition) {
        updatePayload.definition = data.definition;
        console.log('   ✅ Set definition');
      }

      if (Object.keys(updatePayload).length > 0) {
        const concept = await this.conceptRepository.findById(conceptId);
        const updatedCount = await this.conceptRepository.updateByTermInSubject(
          subjectId,
          concept.term,
          updatePayload
        );
        console.log('   ✅ Updated concepts by term:', updatedCount);
      }

      // isolated-concept: tạo relations nếu có relatedConcepts
      if (type === 'isolated-concept' && data.relatedConcepts && Array.isArray(data.relatedConcepts)) {
        const conceptsInSubject = await this.subjectRepository.findConceptsBySubject(subjectId);
        const termToId = new Map(
          conceptsInSubject.map((c) => [c.term.toLowerCase(), c.id])
        );

        const targetIds = data.relatedConcepts
          .map((rel) => termToId.get((rel.name || '').toLowerCase()))
          .filter(Boolean);

        if (targetIds.length > 0) {
          const concept = await this.conceptRepository.findById(conceptId);
          const sourceIds = await this.conceptRepository.findIdsByTermInSubject(
            subjectId,
            concept.term
          );

          let totalCreated = 0;
          for (const sourceId of sourceIds) {
            const created = await this.conceptRepository.createRelations(sourceId, targetIds);
            totalCreated += created;
          }
          console.log('   ✅ Created relations:', totalCreated);
        }
      }

      if (Object.keys(updatePayload).length === 0 && !(type === 'isolated-concept' && data.relatedConcepts)) {
        return {
          success: false,
          message: 'Không có dữ liệu hợp lệ để cập nhật',
          conceptId,
        };
      }

      // cập nhật trạng thái suggestion
      if (suggestionId) {
        await this.suggestionRepository.updateStatus(suggestionId, 'approved');
      }

      return {
        success: true,
        message: 'Đã cập nhật khái niệm',
        conceptId,
      };
    } catch (error) {
      console.error('❌ Apply suggestion error:', error.message);
      throw error;
    }
  }

  /**
   * Từ chối suggestion
   */
  async rejectSuggestion(subjectId, suggestionId) {
    if (suggestionId) {
      await this.suggestionRepository.updateStatus(suggestionId, 'rejected');
    }
    return {
      success: true,
      message: 'Đã từ chối đề xuất',
      suggestionId
    };
  }
}

module.exports = AgentService;
