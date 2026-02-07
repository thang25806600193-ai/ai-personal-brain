/**
 * AI Service - Business logic layer
 * SRP: Chỉ xử lý AI-related logic
 * DIP: Depend on AIProviderFactory, không depend trực tiếp trên Gemini/Groq
 */

const AIProviderFactory = require('../factories/AIProviderFactory');
const { HfInference } = require('@huggingface/inference');

class AIService {
  constructor(primaryProvider = 'gemini', fallbackProvider = 'groq', timeout = 30000) {
    this.aiProvider = AIProviderFactory.createWithFallback(
      primaryProvider,
      fallbackProvider
    );
    this.hf = new HfInference(process.env.HF_ACCESS_TOKEN);
    this.timeout = timeout; // AI request timeout in milliseconds
  }

  /**
   * Create a timeout promise
   */
  _createTimeoutPromise(ms, operationName = 'AI request') {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${ms}ms`));
      }, ms);
    });
  }

  /**
   * Gọi AI chính (với fallback và timeout)
   */
  async ask(prompt) {
    try {
      // Race between AI call and timeout
      return await Promise.race([
        this.aiProvider.ask(prompt),
        this._createTimeoutPromise(this.timeout, 'AI request')
      ]);
    } catch (error) {
      console.error('❌ AI service error:', error.message);
      throw error;
    }
  }

  /**
   * Trích xuất thông tin bằng Hugging Face
   */
  async extractWithHF(text) {
    try {
      // Placeholder: tính năng bảo trì
      return 'Tính năng tóm tắt đang bảo trì để tối ưu tiếng Việt.';
    } catch (error) {
      console.error('❌ HF extraction error:', error);
      return null;
    }
  }

  /**
   * Chuẩn hóa text: lowercase, bỏ dấu tiếng Việt
   */
  normalizeText(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt
      .replace(/[?.,!;:]/g, ''); // Bỏ dấu câu
  }

  /**
   * Tokenize text: normalize + split + remove stopwords
   */
  tokenize(text) {
    const normalized = this.normalizeText(text);
    const words = normalized
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((word) => word.length > 2);

    // Stopwords tiếng Việt
    const stopwords = new Set([
      'la',
      'cua',
      'trong',
      'nao',
      'the',
      'cai',
      'no',
      'duoc',
      'lam',
      'co',
      'khong',
      'va',
      'hay',
      'hoac',
      'voi',
      'tu',
      'den',
      'khac',
      'giua',
      'so',
      'sanh',
      'tuong',
      'ung',
      'hon',
      'kem',
    ]);

    return words.filter((word) => !stopwords.has(word));
  }

  /**
   * Trích xuất khái niệm từ câu hỏi dựa trên Knowledge Graph
   */
  async extractConceptsFromQuestion(question, conceptsInDB) {
    try {
      console.log('🔍 Phân tích câu hỏi bằng Knowledge Graph + NLP...');

      const keywords = this.tokenize(question);

      // Đối chiếu với Knowledge Graph
      const matches = conceptsInDB.filter((concept) => {
        const conceptNormalized = this.normalizeText(concept.term);
        return keywords.some(
          (k) =>
            conceptNormalized.includes(k) ||
            k.includes(conceptNormalized.split(' ')[0])
        );
      });

      const matchedTerms = matches.map((m) => m.term);
      console.log('✅ Khái niệm khớp:', matchedTerms.slice(0, 5));

      return matchedTerms.length > 0 ? matchedTerms : keywords.slice(0, 3);
    } catch (error) {
      console.error('⚠️ NLP error:', error);
      return [];
    }
  }

  /**
   * Gợi ý liên kết concept cho note (NLP nhẹ, không dùng LLM)
   */
  suggestLinksForNote(noteText, conceptsInDB, options = {}) {
    const threshold = options.threshold ?? 0.6;
    const limit = options.limit ?? 5;

    const noteTokens = this.tokenize(noteText);
    const noteNormalized = this.normalizeText(noteText);

    const suggestions = conceptsInDB
      .map((concept) => {
        const termNormalized = this.normalizeText(concept.term);
        const termTokens = termNormalized.split(/\s+/).filter(Boolean);

        let score = 0;
        let matchedBy = 'token';

        if (termNormalized.length > 0 && noteNormalized.includes(termNormalized)) {
          score = 1;
          matchedBy = 'phrase';
        } else if (termTokens.length > 0) {
          const matchedTokens = termTokens.filter((t) => noteTokens.includes(t));
          score = matchedTokens.length / termTokens.length;
        }

        return {
          conceptId: concept.id,
          term: concept.term,
          score: Number(score.toFixed(2)),
          matchedBy,
        };
      })
      .filter((s) => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const conceptTokens = new Set(
      conceptsInDB
        .flatMap((c) => this.tokenize(c.term))
        .filter(Boolean)
    );

    const newConceptCandidates = noteTokens
      .filter((t) => !conceptTokens.has(t))
      .slice(0, 5);

    const shouldSuggestNewNode = suggestions.length === 0 && newConceptCandidates.length > 0;

    return {
      suggestions,
      newConceptCandidates,
      shouldSuggestNewNode,
      reasoning: shouldSuggestNewNode
        ? 'Không có node phù hợp → đề xuất tạo node mới'
        : 'Có node phù hợp → đề xuất liên kết',
    };
  }
}

module.exports = AIService;


module.exports = AIService;