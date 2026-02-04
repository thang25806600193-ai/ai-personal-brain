import React from 'react';
import { BrainCircuit, LayoutGrid, MessageSquare, FolderPlus, Book, Trash2, LogOut } from 'lucide-react';

export default function Sidebar({
  user,
  subjects,
  selectedSubject,
  isCreatingSubject,
  newSubjectName,
  isChatOpen,
  onToggleChat,
  onCreateSubjectStart,
  onCreateSubjectCancel,
  onCreateSubject,
  onNewSubjectNameChange,
  onSelectSubject,
  onDeleteSubject,
  onOpenDashboard,
  onLogout,
  getAvatarSrc,
}) {
  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-xl">
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg"><BrainCircuit size={20} /></div>
        <h1 className="font-bold text-lg">My Brain</h1>
      </div>

      <div className="p-3 border-b border-slate-800">
        <button
          onClick={onOpenDashboard}
          className="w-full flex items-center gap-2 text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700 px-3 py-2 rounded-lg transition text-sm font-bold"
        >
          <LayoutGrid size={16} /> Dashboard
        </button>
      </div>

      {selectedSubject && (
        <div className="p-3 border-b border-slate-800">
          <button
            onClick={onToggleChat}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm font-bold ${isChatOpen ? 'bg-purple-600 text-white' : 'text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700'}`}
          >
            <MessageSquare size={16} /> Hỏi AI
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider px-2 mb-2">Môn học của tôi</div>

        {!selectedSubject?.isShared && (
          <>
            {isCreatingSubject ? (
              <div className="bg-slate-800 p-2 rounded-lg animate-in fade-in">
                <input
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm mb-2 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="Tên môn..."
                  value={newSubjectName}
                  onChange={e => onNewSubjectNameChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && onCreateSubject()}
                />
                <div className="flex gap-2 text-xs">
                  <button onClick={onCreateSubject} className="bg-blue-600 px-2 py-1 rounded hover:bg-blue-500">Tạo</button>
                  <button onClick={onCreateSubjectCancel} className="bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">Hủy</button>
                </div>
              </div>
            ) : (
              <button
                onClick={onCreateSubjectStart}
                className="w-full flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition text-sm mb-2 border border-dashed border-slate-700"
              >
                <FolderPlus size={16} /> Thêm môn học
              </button>
            )}
          </>
        )}

        {subjects.map(sub => (
          <div
            key={sub.id}
            className={`group flex items-center justify-between px-3 py-3 rounded-lg text-sm transition ${selectedSubject?.id === sub.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <button
              onClick={() => onSelectSubject(sub)}
              className="flex-1 flex items-center gap-2 truncate text-left"
            >
              <Book size={16} />
              <span className="truncate">{sub.name}</span>
            </button>

            <div className="flex items-center gap-2">
              {sub._count?.documents > 0 && (
                <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full">{sub._count.documents}</span>
              )}
              {!selectedSubject?.isShared && (
                <button
                  onClick={() => onDeleteSubject(sub.id, sub.name)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-900/30 px-2 py-1 rounded transition flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  <span className="text-[10px] font-bold">Xóa</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {user?.avatarUrl ? (
              <img
                src={getAvatarSrc(user.avatarUrl)}
                alt="avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold text-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="text-sm font-medium truncate w-24">{user?.name || 'Người dùng'}</div>
          </div>
          <button onClick={onLogout} className="text-slate-500 hover:text-red-400"><LogOut size={18} /></button>
        </div>
      </div>
    </div>
  );
}