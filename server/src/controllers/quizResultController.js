class QuizResultController {
  constructor(quizResultService) {
    this.quizResultService = quizResultService;
  }

  async saveResult(req, res) {
    try {
      const { subjectId } = req.params;
      const { quizResult, timeSpent } = req.body;
      const userId = req.user.userId || req.user.id;

      if (!subjectId || !quizResult || !timeSpent) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await this.quizResultService.saveResult(userId, subjectId, quizResult, timeSpent);

      res.json({
        success: true,
        resultId: result.id,
        message: 'Kết quả trắc nghiệm đã được lưu'
      });
    } catch (error) {
      console.error('Save result error:', error);
      res.status(500).json({ error: 'Không thể lưu kết quả' });
    }
  }

  async getHistory(req, res) {
    try {
      const { subjectId } = req.params;
      const { limit = 20 } = req.query;
      const userId = req.user.userId || req.user.id;

      const history = await this.quizResultService.getHistory(userId, subjectId, parseInt(limit));

      res.json({
        results: history
      });
    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({ error: 'Không thể lấy lịch sử' });
    }
  }

  async getStats(req, res) {
    try {
      const { subjectId } = req.params;
      const userId = req.user.userId || req.user.id;

      const stats = await this.quizResultService.getStats(userId, subjectId);

      res.json(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Không thể lấy thống kê' });
    }
  }

  async getAllHistory(req, res) {
    try {
      const { limit = 50 } = req.query;
      const userId = req.user.userId || req.user.id;

      const history = await this.quizResultService.getAllHistory(userId, parseInt(limit));

      res.json({
        results: history
      });
    } catch (error) {
      console.error('Get all history error:', error);
      res.status(500).json({ error: 'Không thể lấy lịch sử' });
    }
  }
}

module.exports = QuizResultController;
