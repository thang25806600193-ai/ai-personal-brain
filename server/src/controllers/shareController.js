/**
 * Share Controller
 * SRP: HTTP endpoints cho share functionality
 */
const ShareController = (shareService) => {
  return {
    /**
     * POST /api/shares/create
     * Create or update share for a subject
     */
    createOrUpdateShare: async (req, res, next) => {
      try {
        const { subjectId, shareType } = req.body;
        const userId = req.user.userId;

        // Verify ownership (basic check in controller)
        const result = await shareService.createOrUpdateShare(subjectId, shareType);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /api/shares/:token
     * Verify share token and get share info
     */
    verifyToken: async (req, res, next) => {
      try {
        const { token } = req.params;
        const result = await shareService.verifyToken(token);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /api/shares/:token/graph
     * Get shared graph (public endpoint - no auth)
     */
    getSharedGraph: async (req, res, next) => {
      try {
        const { token } = req.params;
        const graph = await shareService.getSharedGraph(token);
        res.json(graph);
      } catch (error) {
        next(error);
      }
    },

    /**
     * DELETE /api/shares/:subjectId
     * Delete share for a subject (owner only)
     */
    deleteShare: async (req, res, next) => {
      try {
        const { subjectId } = req.params;
        const result = await shareService.deleteShare(subjectId);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /api/subjects/:subjectId/share
     * Get existing share for a subject
     */
    getShareBySubject: async (req, res, next) => {
      try {
        const { subjectId } = req.params;
        const result = await shareService.getShareBySubject(subjectId);
        if (!result) {
          return res.status(404).json({ message: 'Chưa có share' });
        }
        res.json(result);
      } catch (error) {
        next(error);
      }
    },

    /**
     * POST /api/shares/email
     * Share subject with user by email
     */
    shareWithEmail: async (req, res, next) => {
      try {
        const { subjectId, email } = req.body;
        const result = await shareService.shareWithEmail(subjectId, email);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /api/shares/:subjectId/users
     * Get list of users subject is shared with
     */
    getSharedUsers: async (req, res, next) => {
      try {
        const { subjectId } = req.params;
        const users = await shareService.getSharedUsers(subjectId);
        res.json(users);
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /api/shares/shared-with-me
     * Get subjects shared with current user
     */
    getSharedWithMe: async (req, res, next) => {
      try {
        const userId = req.user.userId; // JWT payload uses userId
        const subjects = await shareService.getSharedWithMe(userId);
        res.json(subjects);
      } catch (error) {
        next(error);
      }
    },

    /**
     * DELETE /api/shares/:subjectId/users/:userId
     * Remove user access to subject
     */
    removeSharedUser: async (req, res, next) => {
      try {
        const { subjectId, userId } = req.params;
        await shareService.removeSharedUser(subjectId, userId);
        res.json({ message: 'Đã xóa quyền truy cập' });
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /api/subjects/:subjectId/access
     * Validate if user can access shared subject (auth required)
     */
    validateAccess: async (req, res, next) => {
      try {
        const { subjectId } = req.params;
        const userId = req.user.userId; // JWT payload uses userId, not id
        const result = await shareService.validateSubjectAccess(subjectId, userId);
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  };
};

module.exports = ShareController;
