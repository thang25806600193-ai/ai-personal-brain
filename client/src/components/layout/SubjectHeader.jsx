import React from 'react';
import { Layers, Upload, Loader2, PlusCircle, Search } from 'lucide-react';

export default function SubjectHeader({
  selectedSubject,
  graphData,
  loading,
  onLoadDocuments,
  onFileUpload,
  onAddConcept,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  onSelectSearchResult,
  isSearching,
}) {
  return (
    <div className="z-10 p-6 flex justify-between items-start border-b border-slate-800/50 flex-shrink-0">
      <div>
        {selectedSubject ? (
          <div className="animate-in slide-in-from-left-4">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-3">
              {selectedSubject.name}
            </h2>
            <p
              className="text-slate-400 text-sm mt-1 flex items-center gap-2 cursor-pointer hover:text-blue-300 transition"
              onClick={() => onLoadDocuments(selectedSubject.id)}
            >
              <Layers size={14} />
              <span className="hover:underline">{graphData.nodes.filter(n => n.type === 'Source').length} Tài liệu</span> • {graphData.nodes.filter(n => n.type === 'Concept').length} Khái niệm
            </p>
          </div>
        ) : (
          <h2 className="text-2xl font-bold text-slate-500">Vui lòng chọn môn học</h2>
        )}
      </div>

      {selectedSubject && (
        <div className="flex gap-3 items-start">
          <div className="relative w-[320px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Tìm node để xem/sửa..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {searchQuery?.trim().length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                {isSearching ? (
                  <div className="p-3 text-sm text-slate-400">Đang tìm...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500">Không tìm thấy khái niệm phù hợp</div>
                ) : (
                  <div className="max-h-64 overflow-auto custom-scrollbar">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onSelectSearchResult(item)}
                        className="w-full text-left p-3 hover:bg-slate-800 transition border-b border-slate-800 last:border-b-0"
                      >
                        <p className="text-white font-medium truncate">{item.term}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {item.document?.title || 'Tài liệu không rõ'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onAddConcept}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            <PlusCircle size={20} />
            Thêm khái niệm
          </button>
          <label className="cursor-pointer bg-white text-slate-900 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all transform hover:scale-105 active:scale-95">
            {loading ? <Loader2 className="animate-spin" /> : <Upload size={20} />}
            {loading ? 'Đang học...' : 'Nạp tài liệu'}
            <input type="file" className="hidden" accept=".pdf" onChange={onFileUpload} />
          </label>
        </div>
      )}
    </div>
  );
}