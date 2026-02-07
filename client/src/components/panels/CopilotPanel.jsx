import { useState, useEffect } from 'react';
import { Lightbulb, BookOpen, Clock, TrendingUp, Zap, Target, FileText, ChevronRight, Flame } from 'lucide-react';
import { API_URL } from '../../config/api';

export default function CopilotPanel({ selectedSubject, token }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSection, setExpandedSection] = useState('nextConcepts');

  useEffect(() => {
    if (selectedSubject) {
      loadSuggestions();
    }
  }, [selectedSubject]);

  const loadSuggestions = async () => {
    if (!selectedSubject) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/roadmap/${selectedSubject.id}/copilot`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Không thể tải gợi ý học tập');
      }

      const result = await response.json();
      setSuggestions(result.data);
    } catch (err) {
      console.error('Error loading copilot suggestions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <Target className="w-4 h-4 text-red-400" />;
      case 'medium': return <TrendingUp className="w-4 h-4 text-yellow-400" />;
      case 'low': return <BookOpen className="w-4 h-4 text-green-400" />;
      default: return <Lightbulb className="w-4 h-4 text-slate-400" />;
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high': return 'border-red-500/50 bg-red-500/10';
      case 'medium': return 'border-yellow-500/50 bg-yellow-500/10';
      default: return 'border-slate-500/50 bg-slate-700/30';
    }
  };

  if (!selectedSubject) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Zap className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-slate-100">AI Learning Copilot</h2>
        </div>
        <p className="text-slate-400 text-center py-8">
          Chọn một môn học để nhận gợi ý học tập thông minh từ AI
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Zap className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-slate-100">AI Learning Copilot</h2>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="text-slate-400 mt-4">Đang phân tích và tạo gợi ý...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Zap className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-slate-100">AI Learning Copilot</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-red-400">{error}</p>
          <button
            onClick={loadSuggestions}
            className="mt-4 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!suggestions) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Zap className="w-6 h-6 text-yellow-400" />
          <h2 className="text-xl font-bold text-slate-100">AI Learning Copilot</h2>
        </div>
        <button
          onClick={loadSuggestions}
          className="px-3 py-1 text-sm bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition"
        >
          Làm mới
        </button>
      </div>

      {/* Study Streak */}
      {suggestions.studyStreak && (
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Flame className="w-6 h-6 text-orange-400" />
              <div>
                <p className="text-slate-100 font-semibold">
                  {suggestions.studyStreak.currentStreak > 0 
                    ? `🔥 ${suggestions.studyStreak.currentStreak} ngày liên tiếp!`
                    : 'Bắt đầu chuỗi ngày học tập'}
                </p>
                <p className="text-sm text-slate-400">{suggestions.motivationalMessage}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-400">{suggestions.studyStreak.totalQuizzes}</p>
              <p className="text-xs text-slate-500">bài trắc nghiệm</p>
            </div>
          </div>
          {suggestions.studyStreak.longestStreak > 0 && (
            <div className="mt-2 pt-2 border-t border-orange-500/20">
              <p className="text-xs text-slate-400">
                Kỷ lục: {suggestions.studyStreak.longestStreak} ngày liên tiếp 🏆
              </p>
            </div>
          )}
        </div>
      )}

      {/* Next Concepts to Learn */}
      {suggestions.nextConcepts && suggestions.nextConcepts.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setExpandedSection(expandedSection === 'nextConcepts' ? null : 'nextConcepts')}
            className="w-full flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition"
          >
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-blue-400">Gợi ý học tiếp</span>
              <span className="px-2 py-0.5 bg-blue-500/30 text-blue-300 rounded-full text-xs">
                {suggestions.nextConcepts.length}
              </span>
            </div>
            <ChevronRight
              className={`w-5 h-5 text-blue-400 transition-transform ${
                expandedSection === 'nextConcepts' ? 'rotate-90' : ''
              }`}
            />
          </button>

          {expandedSection === 'nextConcepts' && (
            <div className="mt-2 space-y-2">
              {suggestions.nextConcepts.map((concept) => (
                <div
                  key={concept.conceptId}
                  className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:border-blue-500/50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {getPriorityIcon(concept.priority)}
                        <h4 className="text-slate-100 font-medium">{concept.title}</h4>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{concept.reason}</p>
                      {concept.score !== undefined && (
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                concept.score < 55 ? 'bg-red-500' :
                                concept.score < 75 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${concept.score}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{Math.round(concept.score)}</span>
                        </div>
                      )}
                    </div>
                    <button className="ml-4 px-3 py-1 bg-blue-500/20 text-blue-400 text-sm rounded hover:bg-blue-500/30 transition">
                      {concept.action}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Reminders */}
      {suggestions.reviewReminders && suggestions.reviewReminders.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setExpandedSection(expandedSection === 'reviewReminders' ? null : 'reviewReminders')}
            className="w-full flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg hover:bg-orange-500/20 transition"
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-orange-400" />
              <span className="font-semibold text-orange-400">Nhắc ôn tập</span>
              <span className="px-2 py-0.5 bg-orange-500/30 text-orange-300 rounded-full text-xs">
                {suggestions.reviewReminders.length}
              </span>
            </div>
            <ChevronRight
              className={`w-5 h-5 text-orange-400 transition-transform ${
                expandedSection === 'reviewReminders' ? 'rotate-90' : ''
              }`}
            />
          </button>

          {expandedSection === 'reviewReminders' && (
            <div className="mt-2 space-y-2">
              {suggestions.reviewReminders.map((reminder) => (
                <div
                  key={reminder.conceptId}
                  className={`p-4 rounded-lg border ${getUrgencyColor(reminder.urgency)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Clock className={`w-4 h-4 ${
                          reminder.urgency === 'high' ? 'text-red-400' : 'text-yellow-400'
                        }`} />
                        <h4 className="text-slate-100 font-medium">{reminder.title}</h4>
                      </div>
                      <p className="text-sm text-slate-400 mb-1">{reminder.reason}</p>
                      <p className="text-xs text-slate-500">
                        {reminder.daysSinceReview > 0 
                          ? `${reminder.daysSinceReview} ngày chưa ôn`
                          : 'Chưa từng ôn tập'}
                      </p>
                    </div>
                    <button className={`ml-4 px-3 py-1 text-sm rounded transition ${
                      reminder.urgency === 'high'
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    }`}>
                      {reminder.action}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Related Materials */}
      {suggestions.relatedMaterials && suggestions.relatedMaterials.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setExpandedSection(expandedSection === 'relatedMaterials' ? null : 'relatedMaterials')}
            className="w-full flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition"
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-green-400" />
              <span className="font-semibold text-green-400">Tài liệu liên quan</span>
              <span className="px-2 py-0.5 bg-green-500/30 text-green-300 rounded-full text-xs">
                {suggestions.relatedMaterials.length}
              </span>
            </div>
            <ChevronRight
              className={`w-5 h-5 text-green-400 transition-transform ${
                expandedSection === 'relatedMaterials' ? 'rotate-90' : ''
              }`}
            />
          </button>

          {expandedSection === 'relatedMaterials' && (
            <div className="mt-2 space-y-2">
              {suggestions.relatedMaterials.map((material) => (
                <div
                  key={material.documentId}
                  className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:border-green-500/50 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <FileText className="w-4 h-4 text-green-400" />
                        <h4 className="text-slate-100 font-medium">{material.documentTitle}</h4>
                        <span className="px-2 py-0.5 bg-slate-700 text-slate-400 rounded text-xs">
                          {material.documentType}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">{material.reason}</p>
                      <p className="text-xs text-slate-500 mt-1">Liên quan: {material.conceptTitle}</p>
                    </div>
                    <button className="ml-4 px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded hover:bg-green-500/30 transition">
                      {material.action}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {(!suggestions.nextConcepts || suggestions.nextConcepts.length === 0) &&
       (!suggestions.reviewReminders || suggestions.reviewReminders.length === 0) &&
       (!suggestions.relatedMaterials || suggestions.relatedMaterials.length === 0) && (
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Chưa có gợi ý học tập</p>
          <p className="text-sm text-slate-500 mt-1">Hãy làm bài trắc nghiệm để AI có thể phân tích</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
        <p className="text-sm text-slate-400">
          🤖 <span className="text-slate-300">AI Copilot phân tích:</span> tiến độ học tập, điểm yếu, và lịch sử để đưa ra gợi ý phù hợp nhất với bạn.
        </p>
      </div>
    </div>
  );
}
