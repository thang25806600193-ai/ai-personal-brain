import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { Trophy, Clock, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, X } from 'lucide-react';

export default function QuizHistoryPanel({ token }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/quiz-result/history/all', {
        params: { limit: 10 }
      });
      setHistory(response.data.results || []);
    } catch (err) {
      console.error('Load history error:', err);
      setError('Không thể tải lịch sử ôn tập');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="animate-spin mx-auto mb-3 text-purple-400" size={32} />
        <p className="text-slate-400">Đang tải...</p>
      </div>
    );
  }

  const latest = history[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600/20 p-3 rounded-lg">
            <Trophy className="text-purple-400" size={28} />
          </div>
          <h3 className="text-2xl font-bold text-white">Lịch sử ôn tập</h3>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(prev => !prev)}
            className="flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200 transition"
          >
            {showHistory ? 'Ẩn lịch sử' : 'Xem lịch sử'}
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl">
          <Clock size={48} className="mx-auto mb-3 text-slate-500 opacity-50" />
          <p className="text-slate-400">Chưa có bài trắc nghiệm nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => setSelectedResult(latest)}
            className="w-full text-left bg-gradient-to-r from-slate-800/50 to-slate-800/30 border border-slate-700 rounded-lg p-4 hover:border-purple-500/50 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {latest.passed ? (
                  <CheckCircle2 className="text-green-400" size={20} />
                ) : (
                  <XCircle className="text-red-400" size={20} />
                )}
                <div>
                  <p className="text-white font-medium">
                    {latest.score}/{latest.total} điểm
                  </p>
                  <p className="text-slate-400 text-sm">
                    {new Date(latest.createdAt).toLocaleDateString('vi-VN')} {' '}
                    {new Date(latest.createdAt).toLocaleTimeString('vi-VN')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black ${latest.passed ? 'text-green-400' : 'text-orange-400'}`}>
                  {latest.percentage}%
                </p>
                <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                  <Clock size={12} />
                  {Math.floor(latest.timeSpent / 60)}:{String(latest.timeSpent % 60).padStart(2, '0')}
                </p>
              </div>
            </div>

            <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  latest.passed
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : 'bg-gradient-to-r from-orange-500 to-red-500'
                }`}
                style={{ width: `${latest.percentage}%` }}
              />
            </div>
          </button>

          {showHistory && (
            <div className="space-y-3">
              {history.map((result) => (
                <button
                  key={result.id}
                  onClick={() => setSelectedResult(result)}
                  className="w-full text-left bg-gradient-to-r from-slate-800/50 to-slate-800/30 border border-slate-700 rounded-lg p-4 hover:border-purple-500/50 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {result.passed ? (
                        <CheckCircle2 className="text-green-400" size={20} />
                      ) : (
                        <XCircle className="text-red-400" size={20} />
                      )}
                      <div>
                        <p className="text-white font-medium">
                          {result.score}/{result.total} điểm
                        </p>
                        <p className="text-slate-400 text-sm">
                          {new Date(result.createdAt).toLocaleDateString('vi-VN')} {' '}
                          {new Date(result.createdAt).toLocaleTimeString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-black ${result.passed ? 'text-green-400' : 'text-orange-400'}`}>
                        {result.percentage}%
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                        <Clock size={12} />
                        {Math.floor(result.timeSpent / 60)}:{String(result.timeSpent % 60).padStart(2, '0')}
                      </p>
                    </div>
                  </div>

                  <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        result.passed
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : 'bg-gradient-to-r from-orange-500 to-red-500'
                      }`}
                      style={{ width: `${result.percentage}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xl font-bold text-white">Chi tiết bài làm</h4>
              <button
                onClick={() => setSelectedResult(null)}
                className="hover:bg-slate-800 p-2 rounded-lg"
              >
                <X size={18} className="text-slate-300" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-white">{selectedResult.score}/{selectedResult.total}</p>
                <p className="text-slate-400 text-sm">Điểm</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className={`text-2xl font-bold ${selectedResult.passed ? 'text-green-400' : 'text-orange-400'}`}>
                  {selectedResult.percentage}%
                </p>
                <p className="text-slate-400 text-sm">Tỷ lệ đúng</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-white">
                  {Math.floor(selectedResult.timeSpent / 60)}:{String(selectedResult.timeSpent % 60).padStart(2, '0')}
                </p>
                <p className="text-slate-400 text-sm">Thời gian</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[45vh] overflow-y-auto custom-scrollbar">
              {selectedResult.wrongAnswers?.length > 0 ? (
                selectedResult.wrongAnswers.map((wrong, idx) => (
                  <div key={`${wrong.questionId}-${idx}`} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <p className="text-white font-medium mb-2">
                      {wrong.conceptTerm || 'Câu hỏi'}
                    </p>
                    <div className="text-sm text-slate-300 space-y-1">
                      <div>❌ Bạn chọn: <strong>{wrong.userAnswer}</strong></div>
                      <div>✅ Đáp án đúng: <strong>{wrong.correctAnswer}</strong></div>
                    </div>
                    {wrong.explanation && (
                      <div className="mt-2 text-sm text-slate-400">
                        {wrong.explanation}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-400">
                  Không có câu sai. Bạn làm rất tốt!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
