class CopilotService {
  constructor({ conceptRepository, quizResultRepository, documentRepository, knowledgeGapService, roadmapService }) {
    this.conceptRepository = conceptRepository;
    this.quizResultRepository = quizResultRepository;
    this.documentRepository = documentRepository;
    this.knowledgeGapService = knowledgeGapService;
    this.roadmapService = roadmapService;
  }

  /**
   * Get real-time learning suggestions for user
   * @param {number} userId
   * @param {number} subjectId
   * @returns {Object} Copilot suggestions
   */
  async getCopilotSuggestions(userId, subjectId) {
    const [
      nextConcepts,
      reviewReminders,
      relatedMaterials,
      studyStreak
    ] = await Promise.all([
      this._getNextConceptSuggestions(userId, subjectId),
      this._getReviewReminders(userId, subjectId),
      this._getRelatedMaterialsSuggestions(userId, subjectId),
      this._getStudyStreak(userId, subjectId)
    ]);

    return {
      nextConcepts,
      reviewReminders,
      relatedMaterials,
      studyStreak,
      motivationalMessage: this._getMotivationalMessage(studyStreak),
      generatedAt: new Date()
    };
  }

  /**
   * Suggest next concepts to learn
   */
  async _getNextConceptSuggestions(userId, subjectId, limit = 3) {
    const recommendations = await this.roadmapService.getNextRecommendations(userId, subjectId, limit);
    
    return recommendations.map(rec => ({
      conceptId: rec.conceptId,
      title: rec.title,
      priority: rec.priority,
      score: rec.score,
      reason: rec.reason,
      action: 'Học ngay',
      type: 'next_to_learn'
    }));
  }

  /**
   * Get concepts that need review (forgotten or at risk)
   */
  async _getReviewReminders(userId, subjectId) {
    const knowledgeGaps = await this.knowledgeGapService.analyzeSubject(userId, subjectId);
    const reminders = [];

    // Weak concepts need urgent review
    knowledgeGaps.weak?.forEach(weak => {
      const daysSinceReview = this._calculateDaysSinceReview(weak);
      if (daysSinceReview > 7 || weak.reasons.includes('Sai nhiều lần')) {
        reminders.push({
          conceptId: weak.conceptId,
          title: weak.title,
          score: weak.score,
          daysSinceReview,
          urgency: 'high',
          reason: daysSinceReview > 14 ? 'Đã lâu không ôn, dễ quên' : 'Sai nhiều lần trong trắc nghiệm',
          action: 'Ôn tập ngay',
          type: 'review_reminder'
        });
      }
    });

    // Medium concepts approaching forgetting curve
    knowledgeGaps.medium?.forEach(medium => {
      const daysSinceReview = this._calculateDaysSinceReview(medium);
      if (daysSinceReview > 14) {
        reminders.push({
          conceptId: medium.conceptId,
          title: medium.title,
          score: medium.score,
          daysSinceReview,
          urgency: 'medium',
          reason: 'Sắp quên, nên ôn lại',
          action: 'Ôn tập',
          type: 'review_reminder'
        });
      }
    });

    // Sort by urgency and days since review
    return reminders
      .sort((a, b) => {
        if (a.urgency !== b.urgency) {
          return a.urgency === 'high' ? -1 : 1;
        }
        return b.daysSinceReview - a.daysSinceReview;
      })
      .slice(0, 5);
  }

  /**
   * Calculate days since last review (from quiz or update)
   */
  _calculateDaysSinceReview(gapInfo) {
    // Try to extract from reasons or use default
    const reasonWithDays = gapInfo.reasons?.find(r => r.includes('ngày'));
    if (reasonWithDays) {
      const match = reasonWithDays.match(/(\d+)\s*ngày/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return 0;
  }

  /**
   * Suggest related materials (documents) for concepts
   */
  async _getRelatedMaterialsSuggestions(userId, subjectId, limit = 3) {
    try {
      // Get weak and medium concepts
      const knowledgeGaps = await this.knowledgeGapService.analyzeSubject(userId, subjectId);
      const targetConcepts = [...(knowledgeGaps.weak || []), ...(knowledgeGaps.medium || [])].slice(0, 5);

      if (targetConcepts.length === 0) {
        return [];
      }

      // Get documents for this subject
      const documents = await this.documentRepository.findBySubjectId(subjectId);

      const suggestions = [];

      for (const concept of targetConcepts) {
        // Find documents that mention this concept (simple title matching)
        const relatedDocs = documents.filter(doc => 
          doc.title?.toLowerCase().includes(concept.title.toLowerCase()) ||
          doc.description?.toLowerCase().includes(concept.title.toLowerCase())
        );

        if (relatedDocs.length > 0) {
          suggestions.push({
            conceptId: concept.conceptId,
            conceptTitle: concept.title,
            documentId: relatedDocs[0].id,
            documentTitle: relatedDocs[0].title,
            documentType: relatedDocs[0].mimeType?.split('/')[1] || 'file',
            reason: `Tài liệu về ${concept.title}`,
            action: 'Xem tài liệu',
            type: 'related_material'
          });
        }
      }

      return suggestions.slice(0, limit);
    } catch (error) {
      console.error('Error getting related materials:', error);
      return [];
    }
  }

  /**
   * Get study streak and statistics
   */
  async _getStudyStreak(userId, subjectId) {
    try {
      const quizHistory = await this.quizResultRepository.getAllHistory(userId);
      
      if (!quizHistory || quizHistory.length === 0) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          totalQuizzes: 0,
          lastStudyDate: null
        };
      }

      // Calculate streak (consecutive days with quiz attempts)
      const sortedDates = quizHistory
        .map(q => new Date(q.createdAt).toDateString())
        .filter((date, index, self) => self.indexOf(date) === index) // unique dates
        .sort((a, b) => new Date(b) - new Date(a));

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 1;

      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      // Check if last study was today or yesterday
      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        currentStreak = 1;

        // Count consecutive days
        for (let i = 1; i < sortedDates.length; i++) {
          const prevDate = new Date(sortedDates[i - 1]);
          const currDate = new Date(sortedDates[i]);
          const diffDays = Math.floor((prevDate - currDate) / 86400000);

          if (diffDays === 1) {
            currentStreak++;
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }

      longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

      return {
        currentStreak,
        longestStreak,
        totalQuizzes: quizHistory.length,
        lastStudyDate: quizHistory[0].createdAt
      };
    } catch (error) {
      console.error('Error calculating study streak:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalQuizzes: 0,
        lastStudyDate: null
      };
    }
  }

  /**
   * Generate motivational message based on streak
   */
  _getMotivationalMessage(studyStreak) {
    const { currentStreak, longestStreak, totalQuizzes } = studyStreak;

    if (currentStreak === 0) {
      return 'Hãy bắt đầu học hôm nay để xây dựng chuỗi ngày học tập! 🚀';
    }

    if (currentStreak === 1) {
      return 'Bắt đầu tốt! Hãy tiếp tục duy trì mỗi ngày 💪';
    }

    if (currentStreak >= 7) {
      return `Tuyệt vời! Bạn đã học ${currentStreak} ngày liên tiếp! 🔥`;
    }

    if (currentStreak >= 3) {
      return `Đang duy trì tốt! ${currentStreak} ngày liên tiếp rồi đấy! ⭐`;
    }

    return `Hôm nay là ngày thứ ${currentStreak}, cố gắng duy trì nhé! 📚`;
  }

  /**
   * Get contextual help for a concept
   * @param {number} conceptId
   * @param {string} context - 'definition', 'example', 'related', 'practice'
   * @returns {Object} Contextual help
   */
  async getConceptHelp(conceptId, context = 'definition') {
    const concept = await this.conceptRepository.findById(conceptId);
    
    if (!concept) {
      throw new Error('Concept not found');
    }

    const help = {
      conceptId,
      title: concept.title,
      definition: concept.definition,
      example: concept.example,
      context
    };

    switch (context) {
      case 'definition':
        help.message = 'Định nghĩa:';
        help.content = concept.definition || 'Chưa có định nghĩa';
        break;

      case 'example':
        help.message = 'Ví dụ:';
        help.content = concept.example || 'Chưa có ví dụ';
        break;

      case 'related':
        help.message = 'Các concept liên quan:';
        const relatedConcepts = await this._getRelatedConcepts(conceptId);
        help.content = relatedConcepts.map(c => c.title).join(', ') || 'Không có concept liên quan';
        help.relatedConcepts = relatedConcepts;
        break;

      case 'practice':
        help.message = 'Gợi ý thực hành:';
        help.content = 'Hãy làm bài trắc nghiệm để kiểm tra kiến thức của bạn về ' + concept.title;
        break;

      default:
        help.message = 'Thông tin concept';
        help.content = concept.definition;
    }

    return help;
  }

  /**
   * Get related concepts (via links)
   */
  async _getRelatedConcepts(conceptId) {
    const concept = await this.conceptRepository.findById(conceptId);
    
    if (!concept || !concept.links || concept.links.length === 0) {
      return [];
    }

    const relatedIds = concept.links.map(link => link.targetId);
    const related = [];

    for (const id of relatedIds) {
      try {
        const relatedConcept = await this.conceptRepository.findById(id);
        if (relatedConcept) {
          related.push({
            id: relatedConcept.id,
            title: relatedConcept.title,
            definition: relatedConcept.definition
          });
        }
      } catch (error) {
        // Skip if not found
      }
    }

    return related;
  }
}

module.exports = CopilotService;
