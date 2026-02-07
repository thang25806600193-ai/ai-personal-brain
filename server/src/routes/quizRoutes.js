/**
 * Quiz Routes
 * Routes cho tính năng ôn tập trắc nghiệm
 */

const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { 
  validateSubjectId, 
  validateQuizGenerate,
  validateQuizSubmit,
  validateExplainAnswer,
} = require('../middleware/validationMiddleware');

const createQuizRoutes = (container) => {
  const router = express.Router();
  const quizController = container.getQuizController();

  // Tất cả routes đều cần authentication
  router.use(authenticateToken);

  // Tạo bộ câu hỏi
  router.post(
    '/:subjectId/generate',
    validateSubjectId,
    validateQuizGenerate,
    quizController.generateQuiz
  );

  // Nộp bài và chấm điểm
  router.post(
    '/:subjectId/submit',
    validateSubjectId,
    validateQuizSubmit,
    quizController.submitQuiz
  );

  // Giải thích đáp án (optional, dùng AI)
  router.post(
    '/explain',
    validateExplainAnswer,
    quizController.explainAnswer
  );

  return router;
};

module.exports = createQuizRoutes;
