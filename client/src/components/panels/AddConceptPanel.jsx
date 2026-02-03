import React, { useState, useEffect } from 'react';
import { Plus, X, Sparkles, Check, Loader2 } from 'lucide-react';

export default function AddConceptPanel({
  selectedSubject,
  documents,
  onClose,
  onCreateConcept,
  onRequestSuggestions,
  onSearchConcepts,
}) {
  const [term, setTerm] = useState('');
  const [noteText, setNoteText] = useState('');
  const [documentId, setDocumentId] = useState('personal-note');
  const [pageNumber, setPageNumber] = useState('');
  
  const [suggestions, setSuggestions] = useState([]);
  const [newConceptCandidates, setNewConceptCandidates] = useState([]);
  const [shouldSuggestNewNode, setShouldSuggestNewNode] = useState(false);
  const [selectedLinks, setSelectedLinks] = useState(new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleGetSuggestions = async () => {
    if (!noteText.trim()) {
      alert('Vui lòng nhập nội dung note trước');
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const result = await onRequestSuggestions(noteText);
      setSuggestions(result.suggestions || []);
      setNewConceptCandidates(result.newConceptCandidates || []);
      setShouldSuggestNewNode(!!result.shouldSuggestNewNode);

      // Mặc định chọn tất cả gợi ý
      const defaultSelected = new Set(
        (result.suggestions || []).map((s) => s.conceptId)
      );
      setSelectedLinks(defaultSelected);
    } catch (error) {
      console.error('Lỗi gợi ý:', error);
      alert('Lỗi khi lấy gợi ý liên kết');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const toggleLink = (conceptId) => {
    const newSet = new Set(selectedLinks);
    if (newSet.has(conceptId)) {
      newSet.delete(conceptId);
    } else {
      newSet.add(conceptId);
    }
    setSelectedLinks(newSet);
  };

  useEffect(() => {
    if (!onSearchConcepts) return;

    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const debounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await onSearchConcepts(query);
        setSearchResults(res || []);
      } catch (error) {
        console.error('Lỗi search:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, onSearchConcepts]);

  const handleCreate = async () => {
    if (!term.trim()) {
      alert('Vui lòng nhập tên khái niệm');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateConcept({
        term: term.trim(),
        noteText: noteText.trim(),
        documentId: documentId === 'personal-note' ? null : documentId,
        pageNumber: pageNumber ? parseInt(pageNumber) : null,
        linkToConceptIds: Array.from(selectedLinks),
      });
      
      // Reset form
      setTerm('');
      setNoteText('');
      setPageNumber(1);
      setSuggestions([]);
      setNewConceptCandidates([]);
      setShouldSuggestNewNode(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedLinks(new Set());
      
      onClose();
    } catch (error) {
      console.error('Lỗi tạo concept:', error);
      alert('Lỗi khi tạo khái niệm');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed right-6 top-24 bottom-6 w-[480px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex justify-between items-center">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <Plus size={20} />
          Thêm khái niệm thủ công
        </h3>
        <button
          onClick={onClose}
          className="hover:bg-white/10 p-1 rounded-full transition"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
        {/* Tên khái niệm */}
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">
            Tên khái niệm *
          </label>
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="VD: Primary Key, Constraint, Normalization..."
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Nội dung / Định nghĩa */}
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">
            Nội dung / Ghi chú
          </label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Nhập ghi chú hoặc định nghĩa của bạn về khái niệm này..."
            rows={4}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Chọn tài liệu */}
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">
            Thuộc tài liệu (tùy chọn)
          </label>
          <select
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="personal-note">📝 Ghi chú cá nhân (không thuộc tài liệu nào)</option>
            {documents.length > 0 && documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                📄 {doc.title}
              </option>
            ))}
          </select>
        </div>

        {/* Số trang - chỉ hiển thị khi chọn document cụ thể */}
        {documentId !== 'personal-note' && (
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">
              Số trang (tùy chọn)
            </label>
            <input
              type="number"
              min="1"
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              placeholder="Để trống nếu không rõ"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Button gợi ý AI */}
        <div>
          <button
            onClick={handleGetSuggestions}
            disabled={isLoadingSuggestions || !noteText.trim()}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            {isLoadingSuggestions ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Đang phân tích...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                AI gợi ý liên kết
              </>
            )}
          </button>
          <p className="text-xs text-slate-500 mt-1 text-center">
            AI sẽ gợi ý các khái niệm liên quan (không tốn quota)
          </p>
        </div>

        {/* Tìm kiếm node thủ công */}
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">
            🔎 Tìm node thủ công (khi AI không gợi ý)
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập tên khái niệm..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {isSearching && (
            <p className="text-xs text-slate-500 mt-2">Đang tìm...</p>
          )}

          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 p-2 hover:bg-slate-700/50 rounded-lg cursor-pointer transition group"
                >
                  <input
                    type="checkbox"
                    checked={selectedLinks.has(item.id)}
                    onChange={() => toggleLink(item.id)}
                    className="w-5 h-5 rounded border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500 bg-slate-700 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium group-hover:text-blue-300 transition">
                      {item.term}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {item.document?.title || 'Tài liệu không rõ'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Danh sách gợi ý */}
        {suggestions.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-purple-400" />
              Gợi ý liên kết với:
            </p>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <label
                  key={suggestion.conceptId}
                  className="flex items-start gap-3 p-2 hover:bg-slate-700/50 rounded-lg cursor-pointer transition group"
                >
                  <div className="relative flex items-center justify-center w-5 h-5 mt-0.5">
                    <input
                      type="checkbox"
                      checked={selectedLinks.has(suggestion.conceptId)}
                      onChange={() => toggleLink(suggestion.conceptId)}
                      className="w-5 h-5 rounded border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500 bg-slate-700 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium group-hover:text-blue-300 transition">
                      {suggestion.term}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">
                        Độ khớp: {(suggestion.score * 100).toFixed(0)}%
                      </span>
                      <span className="text-xs text-purple-400">
                        ({suggestion.matchedBy === 'phrase' ? 'Khớp cụm từ' : 'Khớp từ khóa'})
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Khái niệm mới có thể tạo */}
        {newConceptCandidates.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
            <p className="text-xs text-amber-400 uppercase font-bold tracking-wider mb-2">
              💡 Từ khóa chưa có trong graph:
            </p>
            <div className="flex flex-wrap gap-2">
              {newConceptCandidates.map((keyword, index) => (
                <span
                  key={index}
                  className="bg-amber-700/20 text-amber-300 text-xs px-2 py-1 rounded border border-amber-700/30"
                >
                  {keyword}
                </span>
              ))}
            </div>
            {shouldSuggestNewNode && (
              <p className="text-xs text-amber-300 mt-2">
                👉 Không tìm thấy node phù hợp. Bạn có thể tạo node mới từ note này.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-slate-800 p-4 border-t border-slate-700 space-y-2">
        <button
          onClick={handleCreate}
          disabled={isCreating || !term.trim()}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Đang tạo...
            </>
          ) : (
            <>
              <Check size={16} />
              Xác nhận tạo khái niệm
            </>
          )}
        </button>
        <button
          onClick={onClose}
          className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}
