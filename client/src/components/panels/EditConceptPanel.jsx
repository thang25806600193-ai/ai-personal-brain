import React, { useEffect, useState } from 'react';
import { X, Search, Save, Loader2, Edit3 } from 'lucide-react';

export default function EditConceptPanel({
  selectedSubject,
  onClose,
  onSearchConcepts,
  onUpdateConcept,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedConcept, setSelectedConcept] = useState(null);
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSelect = (item) => {
    setSelectedConcept(item);
    setTerm(item.term || '');
    setDefinition(item.definition || '');
  };

  const handleSave = async () => {
    if (!selectedConcept) return;
    if (!term.trim()) {
      alert('Vui lòng nhập tên khái niệm');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateConcept({
        currentTerm: selectedConcept.term,
        newTerm: term.trim(),
        definition: definition.trim(),
      });
      onClose();
    } catch (error) {
      console.error('Lỗi cập nhật:', error);
      alert('Lỗi cập nhật khái niệm');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed right-6 top-24 bottom-6 w-[480px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex justify-between items-center">
        <h3 className="text-white font-bold text-lg flex items-center gap-2">
          <Edit3 size={18} />
          Chỉnh sửa khái niệm
        </h3>
        <button
          onClick={onClose}
          className="hover:bg-white/10 p-1 rounded-full transition"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">
            Tìm khái niệm
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập tên khái niệm..."
                className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          {isSearching && (
            <p className="text-xs text-slate-500 mt-2">Đang tìm...</p>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">
              Kết quả
            </p>
            <div className="space-y-2">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left p-2 rounded-lg transition border ${
                    selectedConcept?.id === item.id
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-700 hover:bg-slate-700/50'
                  }`}
                >
                  <p className="text-white font-medium truncate">{item.term}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {item.document?.title || 'Tài liệu không rõ'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedConcept && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">
                Tên khái niệm
              </label>
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 block">
                Định nghĩa
              </label>
              <textarea
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                rows={4}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800 p-4 border-t border-slate-700 space-y-2">
        <button
          onClick={handleSave}
          disabled={isSaving || !selectedConcept}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Đang lưu...
            </>
          ) : (
            <>
              <Save size={16} />
              Lưu thay đổi
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
