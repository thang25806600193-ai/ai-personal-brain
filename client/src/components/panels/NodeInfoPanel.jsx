import React, { useEffect, useState } from 'react';
import { FileText, X, Trash2, Edit3, Save, Loader2, Copy, Check } from 'lucide-react';

export default function NodeInfoPanel({
  selectedNode,
  onClose,
  onViewInDocument,
  onDeleteConcept,
  onUpdateConcept,
  onOpenDocumentList,
  isSharedView = false,
}) {
  if (!selectedNode) return null;

  const isPersonalNote = selectedNode.type === 'PersonalNote' || selectedNode.isPersonalNote;
  const headerColor = isPersonalNote ? 'text-yellow-400' : 'text-blue-400';
  const badgeColor = isPersonalNote 
    ? 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30' 
    : 'bg-blue-600/20 text-blue-300 border-blue-600/30';
  const badgeText = isPersonalNote ? '📝 Ghi chú cá nhân' : '📚 Khái niệm từ tài liệu';

  const [isEditing, setIsEditing] = useState(false);
  const [editTerm, setEditTerm] = useState('');
  const [editDefinition, setEditDefinition] = useState('');
  const [editExample, setEditExample] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsEditing(false);
    setEditTerm(selectedNode.name || '');
    setEditDefinition(selectedNode.definition || '');
    setEditExample(selectedNode.example || '');
  }, [selectedNode]);

  const handleSave = async () => {
    if (!onUpdateConcept) return;
    if (!editTerm.trim()) {
      alert('Vui lòng nhập tên khái niệm');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateConcept({
        currentTerm: selectedNode.name,
        newTerm: editTerm.trim(),
        definition: editDefinition.trim(),
        example: editExample.trim() || null,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Lỗi cập nhật:', error);
      alert('Lỗi cập nhật khái niệm');
    } finally {
      setIsSaving(false);
    }
  };

  const isCodeExample = (text) => {
    if (!text) return false;
    // Check for common code patterns
    const codePatterns = [
      /```/,  // markdown code blocks
      /\{[\s\S]*\}/,  // curly braces (JSON, JS, etc)
      /function\s+\w+/,  // function declarations
      /class\s+\w+/,  // class declarations
      /import\s+.*from/,  // imports
      /const\s+\w+\s*=/,  // const declarations
      /let\s+\w+\s*=/,  // let declarations
      /var\s+\w+\s*=/,  // var declarations
      /def\s+\w+/,  // python functions
      /public\s+\w+/,  // Java/C# public
      /SELECT\s+.*FROM/i,  // SQL
      /<[a-z]+.*>/,  // HTML tags
    ];
    return codePatterns.some(pattern => pattern.test(text)) || text.split('\n').length > 3;
  };

  const handleCopyCode = async () => {
    if (!selectedNode.example) return;
    try {
      await navigator.clipboard.writeText(selectedNode.example);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const topClass = isSharedView ? 'top-28' : 'top-24';

  return (
    <div className={`fixed right-6 ${topClass} bottom-6 w-[400px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300`}>
      <div className="bg-slate-800 p-4 flex justify-between items-start border-b border-slate-700">
        <div>
          <h3 className={`${headerColor} font-bold text-lg`}>{selectedNode.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="hover:bg-slate-700 p-1 rounded-full"
        >
          <X size={20} className="text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Định nghĩa</p>
          {isEditing ? (
            <textarea
              value={editDefinition}
              onChange={(e) => setEditDefinition(e.target.value)}
              rows={4}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          ) : (
            <p className="text-slate-300 text-sm leading-relaxed">{selectedNode.definition || 'Chưa có định nghĩa'}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Ví dụ</p>
            {!isEditing && selectedNode.example && isCodeExample(selectedNode.example) && (
              <button
                onClick={handleCopyCode}
                className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
              >
                {copied ? (
                  <>
                    <Check size={12} />
                    Đã copy
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copy code
                  </>
                )}
              </button>
            )}
          </div>
          {isEditing ? (
            <textarea
              value={editExample}
              onChange={(e) => setEditExample(e.target.value)}
              rows={6}
              placeholder="Nhập ví dụ minh họa... (hỗ trợ code)"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono text-xs"
            />
          ) : selectedNode.example ? (
            isCodeExample(selectedNode.example) ? (
              <pre className="bg-slate-950 border border-slate-700 rounded-lg p-3 overflow-x-auto">
                <code className="text-emerald-400 text-xs font-mono leading-relaxed">
                  {selectedNode.example}
                </code>
              </pre>
            ) : (
              <p className="text-slate-300 text-sm leading-relaxed italic">
                {selectedNode.example}
              </p>
            )
          ) : (
            <p className="text-slate-500 text-sm italic">Chưa có ví dụ</p>
          )}
        </div>

        {isEditing && (
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Tên khái niệm</p>
            <input
              type="text"
              value={editTerm}
              onChange={(e) => setEditTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

        {!isPersonalNote && (
          <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Vị trí trong tài liệu</p>
            <div className="text-sm">
              <p className="text-slate-300"><span className="text-blue-400">📄 Trang:</span> {selectedNode.page || '?'}</p>
              <p className="text-slate-300"><span className="text-blue-400">📚 Tài liệu:</span>
                <button
                  onClick={onOpenDocumentList}
                  className="text-blue-400 hover:text-blue-300 underline ml-1"
                >
                  Xem danh sách
                </button>
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Thể loại</p>
          <span className={`inline-block text-xs px-3 py-1 rounded-full border ${badgeColor}`}>
            {badgeText}
          </span>
        </div>
      </div>

      {!isSharedView && (
        <div className="bg-slate-800 p-4 border-t border-slate-700 space-y-2">
          {!isPersonalNote && (
            <button
              onClick={() => onViewInDocument(selectedNode)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              <FileText size={16} />
              Xem trong tài liệu
            </button>
          )}

          {onUpdateConcept && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 border border-emerald-600/30"
            >
              <Edit3 size={16} />
              {isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa'}
            </button>
          )}

          {isEditing && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
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
          )}

          <button
            onClick={() => onDeleteConcept(selectedNode)}
            className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 border border-red-600/30"
          >
            <Trash2 size={16} />
            Xóa khái niệm
          </button>
        </div>
      )}
      {isSharedView && (
        <div className="bg-slate-800 p-4 border-t border-slate-700">
          <p className="text-sm text-slate-400 text-center">📌 Chế độ chỉ xem - không thể chỉnh sửa</p>
        </div>
      )}
    </div>
  );
}