class QuizResultService {
  constructor(quizResultRepository) {
    this.quizResultRepository = quizResultRepository;
  }

  async saveResult(userId, subjectId, quizResult, timeSpent) {
    const total = quizResult.total ?? quizResult.totalQuestions ?? quizResult.results?.length ?? 0;
    const result = await this.quizResultRepository.createResult(userId, subjectId, {
      score: quizResult.score,
      total,
      percentage: quizResult.percentage,
      passed: quizResult.passed,
      timeSpent,
      wrongAnswers: quizResult.wrongAnswers
    });

    return result;
  }

  async getHistory(userId, subjectId, limit = 20) {
    return this.quizResultRepository.getHistory(userId, subjectId, limit);
  }

  async getStats(userId, subjectId) {
    return this.quizResultRepository.getStats(userId, subjectId);
  }

  async getAllHistory(userId, limit = 50) {
    return this.quizResultRepository.getAllHistory(userId, limit);
  }
}

module.exports = QuizResultService;
