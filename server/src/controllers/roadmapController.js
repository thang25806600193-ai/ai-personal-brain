class RoadmapController {
  constructor({ roadmapService, copilotService }) {
    this.roadmapService = roadmapService;
    this.copilotService = copilotService;
  }

  /**
   * Generate learning roadmap for a subject
   * GET /api/roadmap/:subjectId
   */
  async generateRoadmap(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      const subjectId = parseInt(req.params.subjectId);

      if (!subjectId) {
        return res.status(400).json({ error: 'Subject ID is required' });
      }

      const roadmap = await this.roadmapService.generateRoadmap(userId, subjectId);

      res.json({
        success: true,
        data: roadmap
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get next recommended concepts
   * GET /api/roadmap/:subjectId/recommendations
   */
  async getRecommendations(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      const subjectId = parseInt(req.params.subjectId);
      const limit = parseInt(req.query.limit) || 5;

      if (!subjectId) {
        return res.status(400).json({ error: 'Subject ID is required' });
      }

      const recommendations = await this.roadmapService.getNextRecommendations(userId, subjectId, limit);

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get copilot suggestions (real-time learning assistance)
   * GET /api/roadmap/:subjectId/copilot
   */
  async getCopilotSuggestions(req, res, next) {
    try {
      const userId = req.user.userId || req.user.id;
      const subjectId = parseInt(req.params.subjectId);

      if (!subjectId) {
        return res.status(400).json({ error: 'Subject ID is required' });
      }

      const suggestions = await this.copilotService.getCopilotSuggestions(userId, subjectId);

      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get contextual help for a concept
   * GET /api/roadmap/concept/:conceptId/help
   */
  async getConceptHelp(req, res, next) {
    try {
      const conceptId = parseInt(req.params.conceptId);
      const context = req.query.context || 'definition'; // definition, example, related, practice

      if (!conceptId) {
        return res.status(400).json({ error: 'Concept ID is required' });
      }

      const help = await this.copilotService.getConceptHelp(conceptId, context);

      res.json({
        success: true,
        data: help
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RoadmapController;
