/**
 * Quiz Controller
 * SRP: Chỉ xử lý HTTP requests/responses cho quiz
 * DIP: Depends on QuizService
 */

const QuizController = (quizService) => {
  return {
    /**
     * POST /api/subjects/:subjectId/quiz/generate
     * Tạo bộ câu hỏi trắc nghiệm
     */
    generateQuiz: async (req, res, next) => {
      try {
        const { subjectId } = req.params;
        const { count, difficulty } = req.body;

        const quiz = await quizService.generateQuiz(subjectId, {
          count: count || 10,
          difficulty: difficulty || 'medium',
        });

        // Tách đáp án ra khỏi response, lưu vào session hoặc cache
        // Ở đây tạm trả về để client lưu (trong production nên dùng Redis)
        const { _answers, ...quizData } = quiz;

        res.json({
          message: 'Tạo bộ câu hỏi thành công!',
          quiz: quizData,
          // Trả _answers riêng để client có thể submit sau
          answersToken: Buffer.from(JSON.stringify(_answers)).toString('base64'),
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * POST /api/subjects/:subjectId/quiz/submit
     * Nộp bài và chấm điểm
     */
    submitQuiz: async (req, res, next) => {
      try {
        const { answers, answersToken } = req.body;

        if (!answersToken) {
          return res.status(400).json({ error: 'Thiếu answersToken' });
        }

        // Decode đáp án đúng từ token
        const correctAnswers = JSON.parse(
          Buffer.from(answersToken, 'base64').toString('utf-8')
        );

        const result = await quizService.submitQuiz(answers, correctAnswers);

        res.json({
          message: 'Chấm điểm thành công!',
          result,
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * POST /api/quiz/explain
     * Giải thích đáp án sai bằng AI (optional, tốn quota)
     */
    explainAnswer: async (req, res, next) => {
      try {
        const { conceptId, question, userAnswer, correctAnswer } = req.body;

        if (!conceptId || !question || !userAnswer || !correctAnswer) {
          return res.status(400).json({ 
            error: 'Thiếu thông tin: conceptId, question, userAnswer, correctAnswer' 
          });
        }

        const explanation = await quizService.explainAnswer(
          conceptId,
          question,
          userAnswer,
          correctAnswer
        );

        res.json({
          explanation,
          note: 'Giải thích này được tạo bởi AI và có thể tiêu tốn quota.',
        });
      } catch (error) {
        next(error);
      }
    },
  };
};

module.exports = QuizController;
