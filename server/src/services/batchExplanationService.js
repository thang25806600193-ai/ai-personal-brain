class BatchExplanationService {
  constructor({ aiService, conceptRepository }) {
    this.aiService = aiService;
    this.conceptRepository = conceptRepository;
  }

  /**
   * Generate batch explanations for wrong answers
   * Optimized: Single LLM call for all questions
   * @param {Array} wrongAnswers - Array of wrong answer objects
   * @param {string} subjectId - Subject context
   * @returns {Array} Explanations for each wrong answer
   */
  async generateBatchExplanations(wrongAnswers, subjectId) {
    if (!wrongAnswers || wrongAnswers.length === 0) {
      return [];
    }

    // Enrich wrong answers with concept information
    const enriched = await this._enrichWithConceptInfo(wrongAnswers);

    // Build single prompt for all questions
    const prompt = this._buildBatchPrompt(enriched);

    try {
      // Single LLM call for all explanations
      const response = await this.aiService.ask(prompt);

      // Parse response into individual explanations
      const explanations = this._parseExplanations(response, enriched);

      return explanations;
    } catch (error) {
      console.error('Error generating batch explanations:', error);
      // Fallback: return basic explanations
      return enriched.map(item => ({
        questionId: item.questionId,
        question: item.question,
        correctAnswer: item.correctAnswer,
        userAnswer: item.userAnswer,
        explanation: 'Không thể tạo giải thích lúc này. Vui lòng thử lại.',
        conceptTitle: item.conceptTitle,
        conceptDefinition: item.conceptDefinition
      }));
    }
  }

  /**
   * Enrich wrong answers with concept metadata
   */
  async _enrichWithConceptInfo(wrongAnswers) {
    const enriched = [];

    for (const wrong of wrongAnswers) {
      let conceptInfo = { title: 'Unknown', definition: '' };

      if (wrong.conceptId) {
        try {
          const concept = await this.conceptRepository.findById(wrong.conceptId);
          if (concept) {
            conceptInfo = {
              title: concept.title,
              definition: concept.definition || '',
              example: concept.example || ''
            };
          }
        } catch (error) {
          console.error(`Error fetching concept ${wrong.conceptId}:`, error);
        }
      }

      enriched.push({
        questionId: wrong.questionId || `q_${Date.now()}_${Math.random()}`,
        question: wrong.question,
        options: wrong.options || [],
        correctAnswer: wrong.correctAnswer,
        userAnswer: wrong.userAnswer,
        conceptId: wrong.conceptId,
        conceptTitle: conceptInfo.title,
        conceptDefinition: conceptInfo.definition,
        conceptExample: conceptInfo.example
      });
    }

    return enriched;
  }

  /**
   * Build optimized batch prompt for LLM
   */
  _buildBatchPrompt(enrichedWrongAnswers) {
    const questionsText = enrichedWrongAnswers.map((item, index) => {
      return `
--- Câu ${index + 1} (ID: ${item.questionId}) ---
Khái niệm: ${item.conceptTitle}
${item.conceptDefinition ? `Định nghĩa: ${item.conceptDefinition}` : ''}
${item.conceptExample ? `Ví dụ: ${item.conceptExample}` : ''}

Câu hỏi: ${item.question}

Các lựa chọn:
${item.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

Đáp án đúng: ${item.correctAnswer}
Học sinh chọn: ${item.userAnswer}
`;
    }).join('\n');

    return `Bạn là một giáo viên kiên nhẫn và giỏi giải thích. Học sinh của bạn vừa làm sai ${enrichedWrongAnswers.length} câu hỏi trắc nghiệm. 
Nhiệm vụ của bạn là giải thích TẠI SAO đáp án đúng lại đúng, và TẠI SAO đáp án học sinh chọn lại SAI.

QUAN TRỌNG: Giải thích từng câu theo format sau (giữ nguyên ID):

[EXPLANATION_START:${enrichedWrongAnswers[0].questionId}]
<giải thích chi tiết cho câu 1>
[EXPLANATION_END:${enrichedWrongAnswers[0].questionId}]

Yêu cầu cho mỗi giải thích:
1. Ngắn gọn (2-4 câu)
2. Giải thích TẠI SAO đáp án đúng lại đúng
3. Chỉ ra SAI LẦM trong suy nghĩ của học sinh
4. Dùng ví dụ nếu cần thiết
5. Khuyến khích học sinh

Dưới đây là danh sách câu hỏi:

${questionsText}

Hãy giải thích từng câu theo format trên.`;
  }

  /**
   * Parse LLM response into structured explanations
   */
  _parseExplanations(response, enrichedWrongAnswers) {
    const explanations = [];

    for (const item of enrichedWrongAnswers) {
      const regex = new RegExp(
        `\\[EXPLANATION_START:${item.questionId}\\]([\\s\\S]*?)\\[EXPLANATION_END:${item.questionId}\\]`,
        'i'
      );
      const match = response.match(regex);

      const explanation = match 
        ? match[1].trim() 
        : this._generateFallbackExplanation(item);

      explanations.push({
        questionId: item.questionId,
        question: item.question,
        correctAnswer: item.correctAnswer,
        userAnswer: item.userAnswer,
        explanation,
        conceptTitle: item.conceptTitle,
        conceptId: item.conceptId
      });
    }

    return explanations;
  }

  /**
   * Generate fallback explanation if parsing fails
   */
  _generateFallbackExplanation(item) {
    return `Đáp án đúng là "${item.correctAnswer}". Bạn đã chọn "${item.userAnswer}". 
${item.conceptDefinition || ''} 
Hãy xem lại khái niệm "${item.conceptTitle}" để hiểu rõ hơn.`;
  }

  /**
   * Generate explanation for a single question (for backwards compatibility)
   * @param {Object} wrongAnswer - Single wrong answer object
   * @param {string} subjectId
   * @returns {Object} Single explanation
   */
  async generateSingleExplanation(wrongAnswer, subjectId) {
    const batch = await this.generateBatchExplanations([wrongAnswer], subjectId);
    return batch[0];
  }

  /**
   * Get estimated cost savings from batch processing
   * @param {number} numQuestions
   * @returns {Object} Cost comparison
   */
  estimateCostSavings(numQuestions) {
    // Rough estimates (tokens per question)
    const tokensPerIndividualCall = 500; // Question + response
    const tokensPerBatchCall = 200 + (numQuestions * 300); // Overhead + all questions

    const individualCost = numQuestions * tokensPerIndividualCall;
    const batchCost = tokensPerBatchCall;

    return {
      individualCalls: numQuestions,
      individualTokens: individualCost,
      batchCalls: 1,
      batchTokens: batchCost,
      tokensSaved: individualCost - batchCost,
      savingsPercent: Math.round(((individualCost - batchCost) / individualCost) * 100),
      latencySavings: `${numQuestions - 1} API calls saved`
    };
  }
}

module.exports = BatchExplanationService;
