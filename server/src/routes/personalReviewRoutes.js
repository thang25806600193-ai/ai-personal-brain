const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');

function createPersonalReviewRoutes(container) {
  const router = express.Router();
  const personalReviewController = container.getPersonalReviewController();

  // All routes require authentication
  router.use(authenticateToken);

  // Get concepts prioritized for review
  router.get('/:subjectId/concepts', (req, res, next) => {
    personalReviewController.getReviewConcepts(req, res, next);
  });

  // Generate personalized quiz
  router.post('/:subjectId/quiz', (req, res, next) => {
    personalReviewController.generatePersonalizedQuiz(req, res, next);
  });

  // Get batch explanations for wrong answers
  router.post('/:subjectId/explanations', (req, res, next) => {
    personalReviewController.getBatchExplanations(req, res, next);
  });

  // Get review statistics
  router.get('/:subjectId/stats', (req, res, next) => {
    personalReviewController.getReviewStats(req, res, next);
  });

  return router;
}

module.exports = createPersonalReviewRoutes;
