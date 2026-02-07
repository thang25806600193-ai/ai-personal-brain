/**
 * Quiz Service - Ôn tập kiến thức với trắc nghiệm
 * SRP: Chỉ xử lý quiz generation và evaluation
 * DIP: Depends on repositories and AIService
 */

const ValidationException = require('../exceptions/ValidationException');

class QuizService {
  constructor(subjectRepository, conceptRepository, aiService) {
    this.subjectRepository = subjectRepository;
    this.conceptRepository = conceptRepository;
    this.aiService = aiService;
  }

  /**
   * Phân tích graph và tạo bộ câu hỏi trắc nghiệm
   * @param {string} subjectId - Subject ID
   * @param {Object} options - { count: 10, difficulty: 'easy' | 'medium' | 'hard' }
   * @returns {Promise<Object>} - Quiz session
   */
  async generateQuiz(subjectId, options = {}) {
    const { count = 10, difficulty = 'medium' } = options;

    // Validate subject exists
    const subject = await this.subjectRepository.findById(subjectId);
    if (!subject) {
      throw new ValidationException('Subject không tồn tại', 'subjectId');
    }

    // Lấy tất cả concepts trong subject
    const concepts = await this.subjectRepository.findConceptsBySubject(subjectId);

    if (concepts.length === 0) {
      throw new ValidationException('Subject chưa có concepts nào để ôn tập');
    }

    // Phân tích graph để chọn concepts quan trọng
    const selectedConcepts = this._selectConceptsForQuiz(concepts, count, difficulty);

    // Sinh câu hỏi trắc nghiệm (KHÔNG dùng AI)
    const questions = await this._generateQuestions(selectedConcepts, difficulty);

    return {
      quizId: this._generateQuizId(),
      subjectId,
      subjectName: subject.name,
      totalQuestions: questions.length,
      difficulty,
      questions: questions.map(q => ({
        id: q.id,
        conceptId: q.conceptId,
        question: q.question,
        options: q.options,
        type: q.type,
      })),
      // Giữ đáp án riêng để check sau
      _answers: questions.map(q => ({
        id: q.id,
        correctAnswer: q.correctAnswer,
        conceptId: q.conceptId,
        conceptTerm: q.conceptTerm,
        explanation: q.explanation,
      })),
      createdAt: new Date(),
    };
  }

  /**
   * Chấm điểm và trả kết quả
   * @param {string} quizId - Quiz ID
   * @param {Array} userAnswers - [{ questionId, answer }]
   * @param {Array} correctAnswers - Đáp án đúng từ quiz session
   * @returns {Object} - Kết quả
   */
  async submitQuiz(userAnswers, correctAnswers) {
    const results = userAnswers.map(userAns => {
      const correct = correctAnswers.find(c => c.id === userAns.questionId);
      const isCorrect = correct && userAns.answer === correct.correctAnswer;

      return {
        questionId: userAns.questionId,
        userAnswer: userAns.answer,
        correctAnswer: correct?.correctAnswer,
        isCorrect,
        conceptId: correct?.conceptId,
        conceptTerm: correct?.conceptTerm,
        explanation: isCorrect ? null : correct?.explanation, // Chỉ trả explanation nếu sai
      };
    });

    const score = results.filter(r => r.isCorrect).length;
    const totalQuestions = results.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    return {
      score,
      totalQuestions,
      percentage,
      passed: percentage >= 70,
      results,
      wrongAnswers: results.filter(r => !r.isCorrect),
    };
  }

  /**
   * Giải thích câu trả lời sai bằng AI (nếu user yêu cầu)
   * @param {string} conceptId - Concept ID
   * @param {string} question - Câu hỏi
   * @param {string} userAnswer - Câu trả lời của user
   * @param {string} correctAnswer - Đáp án đúng
   * @returns {Promise<string>} - Giải thích chi tiết từ AI
   */
  async explainAnswer(conceptId, question, userAnswer, correctAnswer) {
    // Lấy thông tin concept
    const concept = await this.conceptRepository.findById(conceptId);
    
    if (!concept) {
      return 'Không tìm thấy thông tin khái niệm này.';
    }

    const prompt = `Bạn là giáo viên giải thích kiến thức.

Khái niệm: ${concept.term}
Định nghĩa: ${concept.definition || 'Không có'}

Câu hỏi: ${question}
Học sinh chọn: ${userAnswer}
Đáp án đúng: ${correctAnswer}

Hãy giải thích TẠI SAO đáp án đúng là "${correctAnswer}" và TẠI SAO "${userAnswer}" là SAI.
Giải thích ngắn gọn, dễ hiểu, không quá 100 từ.`;

    try {
      const explanation = await this.aiService.ask(prompt);
      return explanation;
    } catch (error) {
      console.error('❌ AI explanation error:', error);
      return 'Không thể tạo giải thích lúc này. Vui lòng xem lại định nghĩa của khái niệm.';
    }
  }

  /**
   * Private: Chọn concepts để ôn tập dựa trên graph analysis
   */
  _selectConceptsForQuiz(concepts, count, difficulty) {
    // Priority 1: Concepts có nhiều relations (quan trọng trong graph)
    const conceptsWithScore = concepts.map(c => {
      let score = 0;
      
      // Có definition → +3 điểm
      if (c.definition && c.definition.length > 20) score += 3;
      
      // Có example → +2 điểm
      if (c.example && c.example.length > 10) score += 2;
      
      // Có expanded definition → +2 điểm
      if (c.expandedDefinition && c.expandedDefinition.length > 50) score += 2;
      
      // Khái niệm dài (nhiều từ) → quan trọng hơn
      const wordCount = c.term.split(/\s+/).length;
      if (wordCount >= 3) score += 2;
      if (wordCount >= 5) score += 1;

      return { ...c, score };
    });

    // Sắp xếp theo score giảm dần
    conceptsWithScore.sort((a, b) => b.score - a.score);

    // Lấy top concepts
    const selected = conceptsWithScore.slice(0, Math.min(count, concepts.length));

    // Shuffle để không predictable
    return this._shuffleArray(selected);
  }

  /**
   * Private: Sinh câu hỏi trắc nghiệm (Rule-based, KHÔNG dùng AI)
   */
  async _generateQuestions(concepts, difficulty) {
    const questions = [];
    const allConcepts = concepts; // Để tạo distractor options

    for (const concept of concepts) {
      // Skip nếu không có definition
      if (!concept.definition || concept.definition.length < 10) continue;

      // Random loại câu hỏi
      const questionTypes = ['definition', 'fill-blank', 'true-false'];
      const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];

      let question = null;

      if (type === 'definition') {
        question = this._createDefinitionQuestion(concept, allConcepts);
      } else if (type === 'fill-blank') {
        question = this._createFillBlankQuestion(concept);
      } else if (type === 'true-false') {
        question = this._createTrueFalseQuestion(concept, allConcepts);
      }

      if (question) {
        questions.push({
          id: this._generateQuestionId(),
          conceptId: concept.id,
          conceptTerm: concept.term,
          ...question,
        });
      }
    }

    return questions;
  }

  /**
   * Câu hỏi dạng: "Định nghĩa nào đúng về X?"
   */
  _createDefinitionQuestion(concept, allConcepts) {
    const correctDef = concept.definition;
    
    // Tạo 3 distractors (đáp án sai) từ concepts khác
    const otherConcepts = allConcepts
      .filter(c => c.id !== concept.id && c.definition && c.definition.length > 20)
      .slice(0, 3);

    if (otherConcepts.length < 2) {
      return null; // Không đủ distractors
    }

    const options = [
      { label: 'A', text: correctDef, isCorrect: true },
      { label: 'B', text: otherConcepts[0]?.definition, isCorrect: false },
      { label: 'C', text: otherConcepts[1]?.definition, isCorrect: false },
      { label: 'D', text: otherConcepts[2]?.definition || 'Không có định nghĩa chính xác', isCorrect: false },
    ];

    // Shuffle options
    const shuffled = this._shuffleArray(options);

    return {
      type: 'multiple-choice',
      question: `Định nghĩa nào sau đây đúng về "${concept.term}"?`,
      options: shuffled.map(o => ({ label: o.label, text: o.text })),
      correctAnswer: shuffled.find(o => o.isCorrect).label,
      explanation: `Định nghĩa đúng: ${correctDef}`,
    };
  }

  /**
   * Câu hỏi dạng: Điền vào chỗ trống
   */
  _createFillBlankQuestion(concept) {
    if (!concept.definition || concept.definition.length < 30) return null;

    // Lấy keyword từ definition (từ dài nhất)
    const words = concept.definition.split(/\s+/);
    const keywords = words
      .filter(w => w.length > 5 && !/^(là|của|được|trong|với|và|hoặc)$/i.test(w))
      .sort((a, b) => b.length - a.length);

    if (keywords.length === 0) return null;

    const keyword = keywords[0];
    const blankDef = concept.definition.replace(keyword, '______');

    // Tạo 3 options sai
    const wrongOptions = [
      this._generateSimilarWord(keyword),
      this._generateSimilarWord(keyword),
      'Không có từ phù hợp',
    ];

    const options = [
      { label: 'A', text: keyword, isCorrect: true },
      { label: 'B', text: wrongOptions[0], isCorrect: false },
      { label: 'C', text: wrongOptions[1], isCorrect: false },
      { label: 'D', text: wrongOptions[2], isCorrect: false },
    ];

    const shuffled = this._shuffleArray(options);

    return {
      type: 'fill-blank',
      question: `Điền vào chỗ trống: "${blankDef}"`,
      options: shuffled.map(o => ({ label: o.label, text: o.text })),
      correctAnswer: shuffled.find(o => o.isCorrect).label,
      explanation: `Từ đúng là "${keyword}". Định nghĩa đầy đủ: ${concept.definition}`,
    };
  }

  /**
   * Câu hỏi Đúng/Sai
   */
  _createTrueFalseQuestion(concept, allConcepts) {
    const isTrue = Math.random() > 0.5;

    let statement;
    if (isTrue) {
      statement = `${concept.term} là ${concept.definition}`;
    } else {
      // Tạo statement sai bằng cách ghép term với definition của concept khác
      const otherConcept = allConcepts.find(c => c.id !== concept.id && c.definition);
      if (!otherConcept) return null;
      statement = `${concept.term} là ${otherConcept.definition}`;
    }

    return {
      type: 'true-false',
      question: `Câu sau đây ĐÚNG hay SAI?\n"${statement}"`,
      options: [
        { label: 'A', text: 'ĐÚNG' },
        { label: 'B', text: 'SAI' },
      ],
      correctAnswer: isTrue ? 'A' : 'B',
      explanation: isTrue 
        ? `ĐÚNG. ${concept.term}: ${concept.definition}`
        : `SAI. Định nghĩa đúng của ${concept.term} là: ${concept.definition}`,
    };
  }

  /**
   * Utility: Shuffle array
   */
  _shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Utility: Generate similar word for distractors
   */
  _generateSimilarWord(word) {
    const prefixes = ['không', 'phi', 'bán', 'đa', 'siêu'];
    const suffixes = ['hóa', 'học', 'tính', 'trị'];
    
    const random = Math.random();
    if (random < 0.5 && word.length > 6) {
      return prefixes[Math.floor(Math.random() * prefixes.length)] + ' ' + word;
    } else {
      return word + ' ' + suffixes[Math.floor(Math.random() * suffixes.length)];
    }
  }

  /**
   * Generate unique quiz ID
   */
  _generateQuizId() {
    return `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique question ID
   */
  _generateQuestionId() {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
}

module.exports = QuizService;
