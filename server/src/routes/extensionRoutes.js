const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const WebClipService = require('../services/webClipService');
const queueService = require('../services/queueService');

const createExtensionRoutes = () => {
  const router = express.Router();
  const webClipService = new WebClipService();

  router.post('/save', authenticateToken, async (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const result = await webClipService.enqueueClip(req.body || {}, userId);
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/job/:jobId', authenticateToken, async (req, res, next) => {
    try {
      const userId = req.user?.userId || req.user?.id;
      const { jobId } = req.params;

      const job = await queueService.getJobStatus('web-clip-processing', jobId);

      if (!job || job.status === 'not_found') {
        return res.status(404).json({ error: 'Job not found' });
      }

      if (job.status === 'error') {
        return res.status(500).json({ error: job.error || 'Cannot read job status' });
      }

      if (job?.data?.userId && job.data.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.json({
        jobId: job.jobId,
        status: job.status,
        progress: typeof job.progress === 'number' ? job.progress : 0,
        failedReason: job.failedReason || null,
        finishedOn: job.finishedOn || null,
        processedOn: job.processedOn || null,
        result: job.returnValue || null,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};

module.exports = createExtensionRoutes;
