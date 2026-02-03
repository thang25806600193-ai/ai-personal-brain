/**
 * Concept Routes
 * Refactored with DI Container
 */

const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');

const createConceptRoutes = (container) => {
  const router = express.Router();
  const conceptController = container.getConceptController();

  router.use(authenticateToken);

  router.post('/suggest-links', conceptController.suggestLinks);
  router.post('/manual', conceptController.createManualConcept);
  router.post('/search', conceptController.searchConcepts);
  router.post('/update-by-term', conceptController.updateConceptByTerm);
  router.post('/delete-by-term', conceptController.deleteConceptByTerm);
  router.delete('/:conceptId', conceptController.deleteConcept);

  return router;
};

module.exports = createConceptRoutes;
