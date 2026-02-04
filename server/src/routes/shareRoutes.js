/**
 * Share Routes
 */
const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');

module.exports = (container) => {
  const router = express.Router();
  const shareController = container.getShareController();

  // Protected routes (require auth)
  router.post('/create', authenticateToken, shareController.createOrUpdateShare);
  router.delete('/:subjectId', authenticateToken, shareController.deleteShare);
  
  // Email sharing routes (require auth)
  router.post('/email', authenticateToken, shareController.shareWithEmail);
  router.get('/shared-with-me', authenticateToken, shareController.getSharedWithMe);
  router.get('/:subjectId/users', authenticateToken, shareController.getSharedUsers);
  router.delete('/:subjectId/users/:userId', authenticateToken, shareController.removeSharedUser);

  // Public routes (no auth required)
  router.get('/:token', shareController.verifyToken);
  router.get('/:token/graph', shareController.getSharedGraph);

  return router;
};
