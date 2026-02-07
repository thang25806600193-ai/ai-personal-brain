const { PrismaClient } = require('@prisma/client');

class QuizResultRepository {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async createResult(userId, subjectId, resultData) {
    return this.prisma.quizResult.create({
      data: {
        userId,
        subjectId,
        score: resultData.score,
        total: resultData.total,
        percentage: resultData.percentage,
        passed: resultData.passed,
        timeSpent: resultData.timeSpent,
        wrongAnswers: resultData.wrongAnswers || []
      }
    });
  }

  async getHistory(userId, subjectId, limit = 20) {
    return this.prisma.quizResult.findMany({
      where: {
        userId,
        subjectId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }

  async getStats(userId, subjectId) {
    const results = await this.prisma.quizResult.findMany({
      where: {
        userId,
        subjectId
      }
    });

    if (results.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        passCount: 0,
        lastAttempt: null
      };
    }

    const scores = results.map(r => r.percentage);
    const passCount = results.filter(r => r.passed).length;

    return {
      totalAttempts: results.length,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      bestScore: Math.max(...scores),
      passCount,
      lastAttempt: results[0].createdAt
    };
  }

  async getAllHistory(userId, limit = 50) {
    return this.prisma.quizResult.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }
}

module.exports = QuizResultRepository;
