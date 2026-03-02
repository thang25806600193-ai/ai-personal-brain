import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api';
import { Brain, AlertTriangle, ShieldCheck, Gauge } from 'lucide-react';

export default function KnowledgeGapPanel({ subjects, token }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` }
  });

  const handleAnalyze = async () => {
    if (!selectedSubjectId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/knowledge-gap/${selectedSubjectId}`);
      setResult(res.data);
    } catch (err) {
      console.error('Knowledge gap error:', err);
      setError('Không thể phân tích lỗ hổng kiến thức');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600/20 p-3 rounded-lg">
          <Brain className="text-blue-400" size={26} />
        </div>
        <h3 className="text-2xl font-bold text-white">Knowledge Gap Detection</h3>
      </div>

      <div className="text-sm text-slate-400 mb-6">
        <p className="mb-2 font-medium text-slate-300">Cách tính điểm kiến thức (0–100):</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>+ liên kết trong graph (tối đa +20)</li>
          <li>+ có định nghĩa (+10) • có ví dụ (+5)</li>
          <li>+ độ quan trọng concept (importance: degree + số concept phụ thuộc)</li>
          <li>+ trọng số nền tảng (prerequisite depth / foundation weight)</li>
          <li>- sai trong trắc nghiệm (mỗi lần sai -10, tối đa -40)</li>
          <li>- lâu chưa ôn (mỗi 7 ngày -5, tối đa -20)</li>
        </ul>
        <p className="mt-2">Ngưỡng: Strong ≥ 75 • Medium 55–74 • Weak &lt; 55</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center mb-6">
        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="w-full md:w-80 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white"
        >
          <option value="">Chọn môn học để phân tích</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={handleAnalyze}
          disabled={!selectedSubjectId || loading}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-bold text-white transition disabled:opacity-50"
        >
          {loading ? 'Đang phân tích...' : 'Phân tích'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-slate-400 text-sm">Mạnh</div>
              <div className="text-2xl font-bold text-green-400">{result.summary.strong}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-slate-400 text-sm">Trung bình</div>
              <div className="text-2xl font-bold text-yellow-400">{result.summary.medium}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-slate-400 text-sm">Yếu</div>
              <div className="text-2xl font-bold text-red-400">{result.summary.weak}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ConceptList title="Strong" icon={<ShieldCheck className="text-green-400" size={18} />} items={result.strong} />
            <ConceptList title="Medium" icon={<Gauge className="text-yellow-400" size={18} />} items={result.medium} />
            <ConceptList title="Weak" icon={<AlertTriangle className="text-red-400" size={18} />} items={result.weak} />
          </div>
        </div>
      )}
    </div>
  );
}

function ConceptList({ title, icon, items }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="font-bold text-white">{title}</h4>
      </div>
      {items.length === 0 ? (
        <div className="text-slate-500 text-sm">Không có</div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {items.map((c) => (
            <div key={c.conceptId} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="text-white font-medium truncate">{c.title || c.term}</div>
                <div className="text-xs text-slate-400">{c.score}%</div>
              </div>
              {(c.importanceScore !== undefined || c.foundationWeight !== undefined) && (
                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                  {c.importanceScore !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                      Importance: {Math.round(c.importanceScore * 100)}
                    </span>
                  )}
                  {c.foundationWeight !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
                      Foundation: {Math.round(c.foundationWeight * 100)}
                    </span>
                  )}
                </div>
              )}
              {c.reasons?.length > 0 && (
                <div className="text-xs text-slate-400 mt-2">
                  {c.reasons.join(' • ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
