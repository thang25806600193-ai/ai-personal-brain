class PersonalizedQuizService {
  constructor({ 
    knowledgeGapService, 
    conceptRepository, 
    quizResultRepository, 
    quizService 
  }) {
    this.knowledgeGapService = knowledgeGapService;
    this.conceptRepository = conceptRepository;
    this.quizResultRepository = quizResultRepository;
    this.quizService = quizService;
  }

  /**
   * Get personalized concepts for review (smart selection)
   * @param {string} userId
   * @param {string} subjectId
   * @param {number} limit - Number of concepts to return
   * @returns {Array} Prioritized concepts for review
   */
  async selectConceptsForReview(userId, subjectId, limit = 5) {
    // Get knowledge gaps analysis
    const analysis = await this.knowledgeGapService.analyzeSubject(userId, subjectId);
    
    // Get all concepts for additional metadata
    const allConcepts = await this.conceptRepository.findBySubjectId(subjectId);
    const conceptMap = new Map(allConcepts.map(c => [c.id, c]));

    // Combine weak + medium concepts
    const candidates = [
      ...(analysis.weak || []),
      ...(analysis.medium || [])
    ];

    // Enhanced scoring for prioritization
    const scored = candidates.map(gap => {
      const concept = conceptMap.get(gap.conceptId);
      const linkCount = (concept?.relatedFrom?.length || 0) + (concept?.relatedTo?.length || 0);
      
      let priority = 100 - gap.score; // Lower score = higher priority

      // Boost priority for:
      // 1. Concepts with many links (important in graph)
      if (linkCount > 3) priority += 20;
      
      // 2. Concepts with "Sai nhiều lần"
      if (gap.reasons?.includes('Sai nhiều lần')) priority += 30;
      
      // 3. Concepts with "Lâu chưa ôn"
      const daysSinceReview = this._extractDaysSinceReview(gap.reasons);
      if (daysSinceReview > 14) priority += 20;
      if (daysSinceReview > 30) priority += 40;

      return {
        conceptId: gap.conceptId,
        title: gap.title,
        score: gap.score,
        priority,
        reasons: gap.reasons,
        linkCount,
        daysSinceReview,
        isWeak: gap.score < 55
      };
    });

    // Sort by priority descending
    scored.sort((a, b) => b.priority - a.priority);

    return scored.slice(0, limit);
  }

  /**
   * Extract days since review from reasons array
   */
  _extractDaysSinceReview(reasons) {
    if (!reasons || !Array.isArray(reasons)) return 0;
    
    for (const reason of reasons) {
      const match = reason.match(/(\d+)\s*ngày/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return 0;
  }

  /**
   * Generate personalized quiz based on user profile
   * @param {string} userId
   * @param {string} subjectId
   * @param {Object} options
   * @returns {Object} Quiz with personalized questions
   */
  async generatePersonalizedQuiz(userId, subjectId, options = {}) {
    const {
      numQuestions = 10,
      conceptIds = null, // If null, auto-select
      difficulty = 'adaptive' // 'easy', 'medium', 'hard', 'adaptive'
    } = options;

    let targetConcepts;

    if (conceptIds && conceptIds.length > 0) {
      // User specified concepts
      targetConcepts = await Promise.all(
        conceptIds.map(id => this.conceptRepository.findById(id))
      );
      targetConcepts = targetConcepts.filter(c => c); // Remove nulls
    } else {
      // Auto-select based on knowledge gaps
      const prioritized = await this.selectConceptsForReview(userId, subjectId, 10);
      targetConcepts = await Promise.all(
        prioritized.map(p => this.conceptRepository.findById(p.conceptId))
      );
    }

    if (targetConcepts.length === 0) {
      throw new Error('No concepts available for quiz');
    }

    // Determine difficulty based on user profile
    let finalDifficulty = difficulty;
    if (difficulty === 'adaptive') {
      // Get user's recent performance
      const recentQuizzes = await this.quizResultRepository.getHistory(userId, subjectId, 5);
      const avgScore = recentQuizzes.length > 0
        ? recentQuizzes.reduce((sum, q) => sum + q.percentage, 0) / recentQuizzes.length
        : 50;

      // Adaptive difficulty
      if (avgScore < 40) finalDifficulty = 'easy';
      else if (avgScore < 70) finalDifficulty = 'medium';
      else finalDifficulty = 'hard';
    }

    // Generate quiz using existing QuizService
    const quiz = await this.quizService.generateQuiz(subjectId, {
      conceptIds: targetConcepts.map(c => c.id),
      numQuestions,
      difficulty: finalDifficulty
    });

    // Add metadata
    return {
      ...quiz,
      isPersonalized: true,
      selectedDifficulty: finalDifficulty,
      targetedConcepts: targetConcepts.map(c => ({
        id: c.id,
        title: c.title
      })),
      reasoning: `Quiz được cá nhân hóa dựa trên điểm yếu và lịch sử học tập của bạn. Độ khó: ${finalDifficulty}.`
    };
  }

  /**
   * Get review statistics for user
   * @param {string} userId
   * @param {string} subjectId
   * @returns {Object} Review stats
   */
  async getReviewStats(userId, subjectId) {
    const [analysis, quizHistory] = await Promise.all([
      this.knowledgeGapService.analyzeSubject(userId, subjectId),
      this.quizResultRepository.getAllForSubject(userId, subjectId, 100)
    ]);

    const weakCount = analysis.weak?.length || 0;
    const mediumCount = analysis.medium?.length || 0;
    const strongCount = analysis.strong?.length || 0;
    const totalConcepts = weakCount + mediumCount + strongCount;

    const reviewsThisWeek = quizHistory.filter(q => {
      const date = new Date(q.createdAt);
      const now = new Date();
      const diffDays = (now - date) / (1000 * 60 * 60 * 24);
      return diffDays <= 7;
    }).length;

    return {
      totalConcepts,
      weakCount,
      mediumCount,
      strongCount,
      conceptsNeedingReview: weakCount + Math.floor(mediumCount / 2),
      reviewsThisWeek,
      lastReview: quizHistory[0]?.createdAt || null,
      recommendedReviewFrequency: this._calculateReviewFrequency(weakCount, mediumCount)
    };
  }

  /**
   * Calculate recommended review frequency
   */
  _calculateReviewFrequency(weakCount, mediumCount) {
    if (weakCount > 5) return 'daily';
    if (weakCount > 2 || mediumCount > 5) return '3-4 times per week';
    if (mediumCount > 2) return '2-3 times per week';
    return 'weekly';
  }
}

module.exports = PersonalizedQuizService;
