import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Clock, Award, ChevronRight, BookOpen } from 'lucide-react';
import { API_URL } from '../../config/api';

export default function RoadmapPanel({ selectedSubject, token }) {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);

  useEffect(() => {
    if (selectedSubject) {
      loadRoadmap();
    }
  }, [selectedSubject]);

  const loadRoadmap = async () => {
    if (!selectedSubject) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/roadmap/${selectedSubject.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Không thể tải lộ trình học tập');
      }

      const result = await response.json();
      setRoadmap(result.data);
    } catch (err) {
      console.error('Error loading roadmap:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'Ưu tiên cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Đã nắm vững';
      default: return 'Chưa đánh giá';
    }
  };

  if (!selectedSubject) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Calendar className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-slate-100">Lộ Trình Học Tập</h2>
        </div>
        <p className="text-slate-400 text-center py-8">
          Chọn một môn học để xem lộ trình học tập được AI đề xuất
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Calendar className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-slate-100">Lộ Trình Học Tập</h2>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
          <p className="text-slate-400 mt-4">Đang tạo lộ trình học tập...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Calendar className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-slate-100">Lộ Trình Học Tập</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-red-400">{error}</p>
          <button
            onClick={loadRoadmap}
            className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="w-6 h-6 text-purple-400" />
          <h2 className="text-xl font-bold text-slate-100">Lộ Trình Học Tập</h2>
        </div>
        <button
          onClick={loadRoadmap}
          className="px-3 py-1 text-sm bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition"
        >
          Tạo lại
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
          <div className="flex items-center space-x-2 mb-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span className="text-slate-400 text-sm">Tổng số concept</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{roadmap.totalConcepts}</p>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-slate-400 text-sm">Thời gian dự kiến</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{roadmap.estimatedWeeks} tuần</p>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-slate-400 text-sm">Kiến thức nền tảng</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{roadmap.foundationalConcepts.length}</p>
        </div>
      </div>

      {/* Foundational Concepts */}
      {roadmap.foundationalConcepts.length > 0 && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-400 mb-2">📚 Kiến thức nền tảng cần nắm vững:</h3>
          <div className="flex flex-wrap gap-2">
            {roadmap.foundationalConcepts.map((concept, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Schedule */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">📅 Kế hoạch học tập theo tuần</h3>
        
        {roadmap.weeklySchedule.map((week) => (
          <div
            key={week.weekNumber}
            className="bg-slate-700/30 rounded-lg border border-slate-600/30 overflow-hidden hover:border-purple-500/50 transition cursor-pointer"
            onClick={() => setSelectedWeek(selectedWeek === week.weekNumber ? null : week.weekNumber)}
          >
            {/* Week Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 bg-purple-500/20 rounded-lg">
                  <span className="text-purple-400 font-bold">{week.weekNumber}</span>
                </div>
                <div>
                  <h4 className="text-slate-100 font-semibold">{week.title}</h4>
                  <p className="text-sm text-slate-400">{week.focus}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="flex items-center space-x-1 text-slate-400 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{week.estimatedHours}h</span>
                  </div>
                  <div className="text-xs text-slate-500">{week.concepts.length} concepts</div>
                </div>
                <ChevronRight
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    selectedWeek === week.weekNumber ? 'rotate-90' : ''
                  }`}
                />
              </div>
            </div>

            {/* Week Details (Expandable) */}
            {selectedWeek === week.weekNumber && (
              <div className="px-4 pb-4 space-y-2 border-t border-slate-600/30">
                {week.concepts.map((concept) => (
                  <div
                    key={concept.id}
                    className="mt-2 p-3 bg-slate-800/50 rounded-lg border border-slate-600/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="text-slate-100 font-medium">{concept.title}</h5>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-xs border ${getPriorityColor(concept.priority)}`}>
                            {getPriorityLabel(concept.priority)}
                          </span>
                          {concept.score !== undefined && (
                            <span className="text-xs text-slate-500">
                              Điểm hiện tại: {Math.round(concept.score)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Award className={`w-5 h-5 ${
                        concept.priority === 'high' ? 'text-red-400' :
                        concept.priority === 'medium' ? 'text-yellow-400' :
                        'text-green-400'
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="mt-6 p-4 bg-slate-700/20 rounded-lg border border-slate-600/30">
        <p className="text-sm text-slate-400">
          💡 <span className="text-slate-300">Lộ trình được tạo dựa trên:</span> phân tích điểm yếu, quan hệ phụ thuộc giữa các concept, và lịch sử học tập của bạn.
        </p>
      </div>
    </div>
  );
}
