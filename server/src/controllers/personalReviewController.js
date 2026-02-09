class PersonalReviewController {
  constructor({ personalizedQuizService, batchExplanationService }) {
    this.personalizedQuizService = personalizedQuizService;
    this.batchExplanationService = batchExplanationService;
  }

  /**
   * Get concepts prioritized for review
   * GET /api/review/:subjectId/concepts
   */
  async getReviewConcepts(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      const subjectId = req.params.subjectId;
      const limit = parseInt(req.query.limit) || 5;

      const concepts = await this.personalizedQuizService.selectConceptsForReview(
        userId, 
        subjectId, 
        limit
      );

      res.json({
        success: true,
        data: {
          concepts,
          totalSelected: concepts.length,
          selectionCriteria: 'Based on knowledge gaps, importance, and review history'
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate personalized quiz
   * POST /api/review/:subjectId/quiz
   * Body: { numQuestions, conceptIds, difficulty }
   */
  async generatePersonalizedQuiz(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      const subjectId = req.params.subjectId;
      const { numQuestions = 10, conceptIds = null, difficulty = 'adaptive' } = req.body;

      const quiz = await this.personalizedQuizService.generatePersonalizedQuiz(
        userId,
        subjectId,
        { numQuestions, conceptIds, difficulty }
      );

      res.json({
        success: true,
        data: quiz
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get batch explanations for wrong answers
   * POST /api/review/:subjectId/explanations
   * Body: { wrongAnswers: [...] }
   */
  async getBatchExplanations(req, res, next) {
    try {
      const subjectId = req.params.subjectId;
      const { wrongAnswers } = req.body;

      if (!wrongAnswers || !Array.isArray(wrongAnswers) || wrongAnswers.length === 0) {
        return res.status(400).json({ 
          error: 'wrongAnswers array is required and must not be empty' 
        });
      }

      const explanations = await this.batchExplanationService.generateBatchExplanations(
        wrongAnswers,
        subjectId
      );

      const costSavings = this.batchExplanationService.estimateCostSavings(wrongAnswers.length);

      res.json({
        success: true,
        data: {
          explanations,
          totalQuestions: wrongAnswers.length,
          costOptimization: costSavings
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get review statistics
   * GET /api/review/:subjectId/stats
   */
  async getReviewStats(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      const subjectId = req.params.subjectId;

      const stats = await this.personalizedQuizService.getReviewStats(userId, subjectId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PersonalReviewController;
