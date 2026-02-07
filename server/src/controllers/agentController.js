/**
 * Agent Controller
 * Xử lý AI Agent requests
 */

class AgentController {
  constructor(agentService) {
    this.agentService = agentService;
  }

  /**
   * Phân tích độ hoàn chỉnh knowledge graph
   */
  analyzeCompleteness = async (req, res) => {
    try {
      const { subjectId } = req.params;
      const userId = req.user.userId;

      // TODO: Verify user has access to this subject

      const analysis = await this.agentService.analyzeKnowledgeCompleteness(subjectId);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('❌ Analysis error:', error.message);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Lấy suggestions (tạo recommendation từ issues)
   */
  getSuggestions = async (req, res) => {
    try {
      const { subjectId } = req.params;
      const userId = req.user.userId;

      // TODO: Verify user has access to this subject

      const suggestionPackage = await this.agentService.createSuggestionPackage(subjectId);
      
      res.json({
        success: true,
        data: suggestionPackage
      });
    } catch (error) {
      console.error('❌ Suggestions error:', error.message);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Chấp thuận suggestion - cập nhật concept
   */
  applySuggestion = async (req, res) => {
    try {
      const { subjectId } = req.params;
      const { suggestionId, conceptId, type, data } = req.body;
      const userId = req.user.userId;

      console.log('🔧 applySuggestion called:');
      console.log('   subjectId:', subjectId);
      console.log('   suggestionId:', suggestionId);
      console.log('   conceptId:', conceptId);
      console.log('   type:', type);
      console.log('   data:', data);

      // TODO: Verify user has access

      const result = await this.agentService.applySuggestion(
        subjectId,
        suggestionId,
        { conceptId, type, data }
      );

      console.log('✅ applySuggestion result:', result);

      res.json({
        success: true,
        message: result.message,
        conceptId: result.conceptId
      });
    } catch (error) {
      console.error('❌ Apply suggestion error:', error.message);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Từ chối suggestion
   */
  rejectSuggestion = async (req, res) => {
    try {
      const { subjectId } = req.params;
      const { suggestionId } = req.body;
      const userId = req.user.userId;

      const result = await this.agentService.rejectSuggestion(
        subjectId,
        suggestionId
      );

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('❌ Reject suggestion error:', error.message);
      res.status(500).json({ error: error.message });
    }
  };
}

module.exports = AgentController;
