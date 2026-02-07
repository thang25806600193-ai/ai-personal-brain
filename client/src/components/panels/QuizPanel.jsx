import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { 
  Brain, 
  ChevronRight, 
  Clock, 
  Trophy, 
  CheckCircle2, 
  XCircle,
  Lightbulb,
  ArrowLeft,
  Loader2,
  Target,
  BarChart3,
  Sparkles,
  X
} from 'lucide-react';

export default function QuizPanel({ subjectId, subjectName, onClose, token }) {
  const [stage, setStage] = useState('config'); // config | quiz | result
  const [config, setConfig] = useState({ count: 10, difficulty: 'medium' });
  const [quiz, setQuiz] = useState(null);
  const [answersToken, setAnswersToken] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showExplanation, setShowExplanation] = useState({});
  const [explanationLoading, setExplanationLoading] = useState({});
  const [aiExplanations, setAiExplanations] = useState({});

  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` }
  });

  // Timer
  useEffect(() => {
    if (stage === 'quiz') {
      const interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [stage]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerateQuiz = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.post(`/quiz/${subjectId}/generate`, config);
      setQuiz(response.data.quiz);
      setAnswersToken(response.data.answersToken);
      setStage('quiz');
      setTimeElapsed(0);
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể tạo bộ câu hỏi');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitQuiz = async () => {
    try {
      setLoading(true);
      setError('');
      
      const answers = Object.entries(userAnswers).map(([questionId, answer]) => ({
        questionId,
        answer
      }));

      const response = await api.post(`/quiz/${subjectId}/submit`, {
        answers,
        answersToken
      });

      setResult(response.data.result);
      
      // Lưu kết quả vào database
      try {
        await api.post(`/quiz-result/${subjectId}/result`, {
          quizResult: response.data.result,
          timeSpent: timeElapsed
        });
      } catch (err) {
        console.error('Không thể lưu kết quả:', err);
      }
      
      setStage('result');
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể chấm điểm');
    } finally {
      setLoading(false);
    }
  };

  const handleExplainAnswer = async (wrongAnswer) => {
    const key = wrongAnswer.questionId;
    try {
      setExplanationLoading(prev => ({ ...prev, [key]: true }));
      
      const response = await api.post('/quiz/explain', {
        conceptId: wrongAnswer.conceptId,
        question: quiz.questions.find(q => q.id === wrongAnswer.questionId)?.question,
        userAnswer: wrongAnswer.userAnswer,
        correctAnswer: wrongAnswer.correctAnswer
      });

      setAiExplanations(prev => ({
        ...prev,
        [key]: response.data.explanation
      }));
      setShowExplanation(prev => ({ ...prev, [key]: true }));
    } catch (err) {
      setError('Không thể tạo giải thích');
    } finally {
      setExplanationLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const progress = quiz ? ((currentQuestionIndex + 1) / quiz.questions.length) * 100 : 0;
  const answeredCount = Object.keys(userAnswers).length;

  // CONFIG STAGE
  if (stage === 'config') {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Brain className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Ôn tập trắc nghiệm</h2>
                <p className="text-slate-400 text-sm">{subjectName}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition">
              <ArrowLeft size={24} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-slate-300 mb-2 font-medium">Số lượng câu hỏi</label>
              <select
                value={config.count}
                onChange={(e) => setConfig(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={5}>5 câu</option>
                <option value={10}>10 câu</option>
                <option value={15}>15 câu</option>
                <option value={20}>20 câu</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-2 font-medium">Độ khó</label>
              <div className="grid grid-cols-3 gap-3">
                {['easy', 'medium', 'hard'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setConfig(prev => ({ ...prev, difficulty: level }))}
                    className={`py-3 rounded-xl font-medium transition ${
                      config.difficulty === level
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {level === 'easy' ? 'Dễ' : level === 'medium' ? 'Trung bình' : 'Khó'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateQuiz}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Đang tạo câu hỏi...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Bắt đầu ôn tập
                </>
              )}
            </button>

            <p className="text-slate-500 text-xs text-center">
              💡 Câu hỏi được sinh tự động từ knowledge graph của bạn
            </p>
          </div>
        </div>
      </div>
    );
  }

  // QUIZ STAGE
  if (stage === 'quiz' && quiz) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-slate-700">
          {/* Header */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Target className="text-purple-400" size={24} />
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Câu {currentQuestionIndex + 1} / {quiz.questions.length}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Đã trả lời: {answeredCount}/{quiz.questions.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock size={18} />
                  <span className="font-mono">{formatTime(timeElapsed)}</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition">
                  <ArrowLeft size={24} />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="p-8 overflow-y-auto max-h-[calc(90vh-220px)] custom-scrollbar">
            <div className="mb-6">
              <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-medium mb-3">
                {currentQuestion.type === 'multiple-choice' ? 'Trắc nghiệm' : 
                 currentQuestion.type === 'fill-blank' ? 'Điền từ' : 'Đúng/Sai'}
              </span>
              <h4 className="text-2xl font-bold text-white leading-relaxed whitespace-pre-line">
                {currentQuestion.question}
              </h4>
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = userAnswers[currentQuestion.id] === option.label;
                return (
                  <button
                    key={option.label}
                    onClick={() => handleAnswerSelect(currentQuestion.id, option.label)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20 text-white'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        isSelected ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {option.label}
                      </div>
                      <span className="flex-1">{option.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-700 flex justify-between gap-2">
            <button
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-3 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Câu trước
            </button>

            {currentQuestionIndex < quiz.questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-blue-500 transition flex items-center gap-2"
              >
                Câu tiếp theo
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                disabled={loading || answeredCount < quiz.questions.length}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-500 hover:to-emerald-500 transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Đang chấm...
                  </>
                ) : (
                  <>
                    <Trophy size={18} />
                    Nộp bài ({answeredCount}/{quiz.questions.length})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // RESULT STAGE
  if (stage === 'result' && result) {
    const passColor = result.passed ? 'from-green-600 to-emerald-600' : 'from-red-600 to-orange-600';
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[88vh] overflow-hidden border border-slate-700">
          {/* Header */}
          <div className={`p-8 bg-gradient-to-r ${passColor} relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
            </div>
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 text-white hover:text-white/80 transition z-20"
            >
              <X size={24} />
            </button>
            <div className="relative z-10 text-center">
              <Trophy className="mx-auto mb-4 text-white" size={64} />
              <h2 className="text-4xl font-black text-white mb-2">
                {result.passed ? 'Xuất sắc! 🎉' : 'Cố gắng lên! 💪'}
              </h2>
              <p className="text-white/80 text-lg">
                Bạn đạt <span className="font-bold">{result.percentage}%</span>
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6 grid grid-cols-3 gap-4 border-b border-slate-700">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{result.score}</div>
              <div className="text-slate-400 text-sm">Đúng</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">{result.wrongAnswers.length}</div>
              <div className="text-slate-400 text-sm">Sai</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{formatTime(timeElapsed)}</div>
              <div className="text-slate-400 text-sm">Thời gian</div>
            </div>
          </div>

          {/* Wrong answers */}
          <div className="p-6 overflow-y-auto max-h-[calc(88vh-280px)] custom-scrollbar">
            {result.wrongAnswers.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <XCircle className="text-red-400" size={24} />
                  Câu trả lời sai ({result.wrongAnswers.length})
                </h3>
                {result.wrongAnswers.map((wrong) => {
                  const question = quiz.questions.find(q => q.id === wrong.questionId);
                  const showingExplanation = showExplanation[wrong.questionId];
                  const loadingExplanation = explanationLoading[wrong.questionId];
                  const aiExplanation = aiExplanations[wrong.questionId];

                  return (
                    <div key={wrong.questionId} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                      <p className="text-white font-medium mb-3">{question?.question}</p>
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-red-400">
                          <XCircle size={16} />
                          <span className="text-sm">Bạn chọn: <strong>{wrong.userAnswer}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-green-400">
                          <CheckCircle2 size={16} />
                          <span className="text-sm">Đáp án đúng: <strong>{wrong.correctAnswer}</strong></span>
                        </div>
                      </div>

                      {wrong.explanation && !showingExplanation && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-300 text-sm mb-3">
                          {wrong.explanation}
                        </div>
                      )}

                      {showingExplanation && aiExplanation && (
                        <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg mb-3">
                          <div className="flex items-start gap-2 mb-2">
                            <Sparkles className="text-purple-400 flex-shrink-0 mt-0.5" size={16} />
                            <span className="text-purple-300 text-xs font-bold">GIẢI THÍCH TỪ AI</span>
                          </div>
                          <p className="text-white text-sm leading-relaxed whitespace-pre-line">
                            {aiExplanation}
                          </p>
                        </div>
                      )}

                      {!showingExplanation && (
                        <button
                          onClick={() => handleExplainAnswer(wrong)}
                          disabled={loadingExplanation}
                          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition disabled:opacity-50"
                        >
                          {loadingExplanation ? (
                            <>
                              <Loader2 className="animate-spin" size={14} />
                              Đang tạo giải thích...
                            </>
                          ) : (
                            <>
                              <Lightbulb size={14} />
                              Giải thích bằng AI (tốn quota)
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="mx-auto mb-4 text-green-400" size={64} />
                <h3 className="text-2xl font-bold text-white mb-2">Hoàn hảo! 🎯</h3>
                <p className="text-slate-400">Bạn đã trả lời đúng tất cả các câu hỏi!</p>
              </div>
            )}
          </div>


        </div>
      </div>
    );
  }

  return null;
}
