/**
 * Subject Routes
 * Refactored with DI Container and Input Validation
 */

const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { validateCreateSubject, validateSubjectId, validateQuestion } = require('../middleware/validationMiddleware');

const createSubjectRoutes = (container) => {
  const router = express.Router();
  const subjectController = container.getSubjectController();
  const shareController = container.getShareController();
  const agentController = container.getAgentController();

  router.use(authenticateToken);

  router.get('/', subjectController.getSubjects);
  router.post('/', validateCreateSubject, subjectController.createSubject);
  router.get('/:subjectId/access', validateSubjectId, shareController.validateAccess);
  router.get('/:subjectId/share', validateSubjectId, shareController.getShareBySubject);
  
  // 🤖 AGENT ENDPOINTS
  router.get('/:subjectId/agent/analysis', validateSubjectId, agentController.analyzeCompleteness);
  router.post('/:subjectId/agent/suggestions', validateSubjectId, agentController.getSuggestions);
  router.post('/:subjectId/agent/apply-suggestion', validateSubjectId, agentController.applySuggestion);
  router.post('/:subjectId/agent/reject-suggestion', validateSubjectId, agentController.rejectSuggestion);
  
  router.get('/:subjectId/graph', validateSubjectId, subjectController.getSubjectGraph);
  router.get('/:subjectId/documents', validateSubjectId, subjectController.getDocuments);
  router.post('/:subjectId/ask', validateSubjectId, validateQuestion, subjectController.askQuestion);
  router.delete('/:subjectId', validateSubjectId, subjectController.deleteSubject);

  return router;
};

module.exports = createSubjectRoutes;