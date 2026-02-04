/**
 * Subject Routes
 * Refactored with DI Container
 */

const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');

const createSubjectRoutes = (container) => {
  const router = express.Router();
  const subjectController = container.getSubjectController();
  const shareController = container.getShareController();

  router.use(authenticateToken);

  router.get('/', subjectController.getSubjects);
  router.post('/', subjectController.createSubject);
  router.get('/:subjectId/access', shareController.validateAccess);
  router.get('/:subjectId/share', shareController.getShareBySubject);
  router.get('/:subjectId/graph', subjectController.getSubjectGraph);
  router.get('/:subjectId/documents', subjectController.getDocuments);
  router.post('/:subjectId/ask', subjectController.askQuestion);
  router.delete('/:subjectId', subjectController.deleteSubject);

  return router;
};

module.exports = createSubjectRoutes;