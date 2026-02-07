const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');

module.exports = function createQuizResultRoutes(container) {
  const router = express.Router();
  const quizResultController = container.getQuizResultController();

  // Save quiz result
  router.post('/:subjectId/result', authenticateToken, (req, res) =>
    quizResultController.saveResult(req, res)
  );

  // Get quiz history for subject
  router.get('/:subjectId/history', authenticateToken, (req, res) =>
    quizResultController.getHistory(req, res)
  );

  // Get quiz stats for subject
  router.get('/:subjectId/stats', authenticateToken, (req, res) =>
    quizResultController.getStats(req, res)
  );

  // Get all quiz history (all subjects)
  router.get('/history/all', authenticateToken, (req, res) =>
    quizResultController.getAllHistory(req, res)
  );

  return router;
};
