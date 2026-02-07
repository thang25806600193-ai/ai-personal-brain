const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');

function createRoadmapRoutes(container) {
  const router = express.Router();
  const roadmapController = container.getRoadmapController();

  // All routes require authentication
  router.use(authenticateToken);

  // Generate learning roadmap for a subject
  router.get('/:subjectId', (req, res, next) => {
    roadmapController.generateRoadmap(req, res, next);
  });

  // Get next recommended concepts
  router.get('/:subjectId/recommendations', (req, res, next) => {
    roadmapController.getRecommendations(req, res, next);
  });

  // Get copilot suggestions (real-time learning assistance)
  router.get('/:subjectId/copilot', (req, res, next) => {
    roadmapController.getCopilotSuggestions(req, res, next);
  });

  // Get contextual help for a concept
  router.get('/concept/:conceptId/help', (req, res, next) => {
    roadmapController.getConceptHelp(req, res, next);
  });

  return router;
}

module.exports = createRoadmapRoutes;
