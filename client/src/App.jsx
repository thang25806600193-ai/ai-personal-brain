import React, { useState, useRef, useCallback, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import axios from 'axios';
import { Upload, BrainCircuit, Loader2, FileText, X, LogOut, User, FolderPlus, Book, Layers, Trash2, LayoutGrid, MessageSquare, Send } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import * as d3 from 'd3-force';
import AuthPage from './AuthPage';
import Dashboard from './Dashboard';
import VerifyEmail from './VerifyEmail';
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  // --- STATE MÔN HỌC ---
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null); // Môn đang chọn
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  // --- STATE CORE ---
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(() => {
    const saved = localStorage.getItem('selectedNode');
    return saved ? JSON.parse(saved) : null;
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('currentPage');
    return saved ? parseInt(saved) : 1;
  });
  const [isPdfOpen, setIsPdfOpen] = useState(() => {
    const saved = localStorage.getItem('isPdfOpen');
    return saved ? JSON.parse(saved) : false;
  });
  const [isDocumentListOpen, setIsDocumentListOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' hoặc 'app'
  
  // --- STATE CHAT AI ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  const graphRef = useRef();
  const token = localStorage.getItem('token');

  // Cấu hình Axios để luôn gửi Token
  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  const handleAuthExpired = (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      localStorage.clear();
      setUser(null);
    }
  };

  // 1. LOAD DANH SÁCH MÔN HỌC KHI VÀO APP
  useEffect(() => {
    if (user && token) {
        loadSubjects();
    }
  }, [user, token]);

  const loadSubjects = async () => {
      try {
          const res = await api.get('/subjects');
          setSubjects(res.data);
          // Mặc định chọn môn đầu tiên nếu có
          if (res.data.length > 0 && !selectedSubject) {
              handleSelectSubject(res.data[0]);
          }
      } catch (e) {
        handleAuthExpired(e);
        console.error("Lỗi load môn:", e);
      }
  };

  const handleSelectSubject = async (subject) => {
      setSelectedSubject(subject);
      setLoading(true);
      setIsDocumentListOpen(false);
      // Load Graph của môn này
      try {
          const res = await api.get(`/subjects/${subject.id}/graph`);
          setGraphData(res.data);
          // Lưu documents vào state để sử dụng sau
          if (res.data.documents) {
              setDocuments(res.data.documents);
          }
      } catch (e) { console.error("Lỗi load graph:", e); }
      setLoading(false);
  };

  const loadDocuments = async (subjectId) => {
      try {
          const res = await api.get(`/subjects/${subjectId}/documents`);
          setDocuments(res.data);
          setIsDocumentListOpen(true);
      } catch (e) { 
          console.error("Lỗi load tài liệu:", e);
          alert("Lỗi tải danh sách tài liệu");
      }
  };

  const handleCreateSubject = async () => {
      if (!newSubjectName.trim()) return;
      try {
          const res = await api.post('/subjects', { name: newSubjectName });
          setSubjects([res.data, ...subjects]);
          handleSelectSubject(res.data); // Chuyển ngay sang môn mới
          setNewSubjectName("");
          setIsCreatingSubject(false);
      } catch (e) { alert("Lỗi tạo môn"); }
  };

  // 2. UPLOAD FILE VÀO MÔN ĐANG CHỌN
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedSubject) return;

    setLoading(true);
    setPdfFile(file);
    setCurrentPage(1);
    localStorage.setItem('currentPage', '1');
    setIsPdfOpen(false); // Đóng PDF cũ, chờ upload xong
    localStorage.setItem('isPdfOpen', JSON.stringify(false));

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('subjectId', selectedSubject.id);

    try {
      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Upload xong: cập nhật PDF và mở lên
      setPdfFile(file);
      setCurrentPage(1);
      localStorage.setItem('currentPage', '1');
      
      // Reload lại Graph
      await handleSelectSubject(selectedSubject);
      
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi upload.");
      setLoading(false);
    }
  };

  // --- LOGIC HIGHLIGHT cho PDF (Đơn giản bằng text layer search) ---
  useEffect(() => {
    if (isPdfOpen && selectedNode && selectedNode.name) {
      const searchTerm = selectedNode.name.trim();
      if (!searchTerm) return;

      // Highlight text trên PDF bằng CSS
      const textLayer = document.querySelector('[role="presentation"]');
      if (textLayer) {
        // Bỏ highlight cũ
        const oldHighlights = textLayer.querySelectorAll('.pdf-highlight');
        oldHighlights.forEach(el => {
          el.classList.remove('pdf-highlight');
        });
        
        // Tìm và highlight text mới
        const walker = document.createTreeWalker(
          textLayer,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        const nodesToReplace = [];
        let node;
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        
        while (node = walker.nextNode()) {
          if (regex.test(node.textContent)) {
            nodesToReplace.push(node);
          }
        }
        
        nodesToReplace.forEach(node => {
          const span = document.createElement('span');
          span.innerHTML = node.textContent.replace(
            new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
            `<mark class="pdf-highlight">$&</mark>`
          );
          node.parentNode.replaceChild(span, node);
        });
      }
    }
  }, [isPdfOpen, selectedNode]);

  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
        const fg = graphRef.current;
        fg.d3Force('charge', d3.forceManyBody().strength(-300));
        fg.d3Force('link').distance(100);
        fg.d3Force('center', d3.forceCenter().strength(0.6));
        fg.d3ReheatSimulation();
    }
  }, [graphData]);

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa tài liệu này? Tất cả khái niệm sẽ bị xóa theo.')) return;
    
    try {
      await api.delete(`/documents/${documentId}`);
      
      // Refresh graph
      if (selectedSubject) {
        await handleSelectSubject(selectedSubject);
      }
      
      // Đóng PDF modal nếu đang mở
      setIsPdfOpen(false);
      setSelectedNode(null);
      localStorage.removeItem('selectedNode');
      localStorage.removeItem('isPdfOpen');
    } catch (error) {
      console.error("Lỗi xóa:", error);
      alert("Lỗi xóa tài liệu");
    }
  };

  const handleDeleteSubject = async (subjectId, subjectName) => {
    if (!window.confirm(`Bạn chắc chắn muốn xóa môn học "${subjectName}"? Tất cả tài liệu và khái niệm sẽ bị xóa theo.`)) return;
    
    try {
      await api.delete(`/subjects/${subjectId}`);
      
      // Cập nhật danh sách môn học
      await loadSubjects();
      
      // Nếu xóa môn đang chọn, clear state
      if (selectedSubject?.id === subjectId) {
        setSelectedSubject(null);
        setGraphData({ nodes: [], links: [] });
        setIsPdfOpen(false);
        setSelectedNode(null);
        localStorage.removeItem('selectedNode');
        localStorage.removeItem('isPdfOpen');
      }
    } catch (error) {
      console.error("Lỗi xóa:", error);
      alert("Lỗi xóa môn học");
    }
  };

  const handleDeleteConcept = async (conceptId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa khái niệm này?')) return;
    
    try {
      await api.delete(`/concepts/${conceptId}`);
      
      // Refresh graph
      if (selectedSubject) {
        await handleSelectSubject(selectedSubject);
      }
      
      setSelectedNode(null);
      localStorage.removeItem('selectedNode');
    } catch (error) {
      console.error("Lỗi xóa:", error);
      alert("Lỗi xóa khái niệm");
    }
  };

  const handleAskAI = async () => {
    if (!chatInput.trim() || !selectedSubject) return;
    
    const userMessage = { type: 'user', text: chatInput };
    const question = chatInput; // Lưu câu hỏi trước khi xóa input
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    // Thêm message "Đang phân tích"
    setChatMessages(prev => [...prev, {
      type: 'loading',
      text: '🔍 Đang phân tích câu hỏi bằng Knowledge Graph + NLP...'
    }]);

    try {
      const res = await api.post(`/subjects/${selectedSubject.id}/ask`, {
        question: question
      });

      // Xóa loading message và thêm kết quả
      setChatMessages(prev => {
        const filtered = prev.filter(msg => msg.type !== 'loading');
        return [...filtered, {
          type: 'ai',
          text: res.data.answer,
          concepts: res.data.foundConcepts || [],
          fromGeneralKnowledge: res.data.fromGeneralKnowledge || false
        }];
      });
    } catch (error) {
      console.error("Lỗi hỏi AI:", error);
      setChatMessages(prev => {
        const filtered = prev.filter(msg => msg.type !== 'loading');
        return [...filtered, {
          type: 'error',
          text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.'
        }];
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleNodeClick = useCallback((node) => {
    if (node.type === 'Source') return;
    setSelectedNode(node);
    localStorage.setItem('selectedNode', JSON.stringify(node));
    // Không tự động mở PDF - chỉ hiển thị thông tin
  }, []);

  const handleViewInDocument = (node) => {
    // Sử dụng documentId từ node
    if (!node.documentId) {
      alert("Không tìm thấy thông tin tài liệu của khái niệm này");
      return;
    }

    // Tìm document từ danh sách documents
    const doc = documents.find(d => d.id === node.documentId);
    
    if (!doc) {
      alert("Không tìm thấy tài liệu");
      return;
    }

    // Tạo URL từ filePath
    const fileUrl = `http://localhost:5000/uploads/${doc.filePath.split('\\').pop()}`;
    
    setPdfFile(fileUrl);
    setCurrentPage(node.page || 1);
    localStorage.setItem('currentPage', (node.page || 1).toString());
    
    setIsPdfOpen(true);
    localStorage.setItem('isPdfOpen', JSON.stringify(true));
    
    if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 1000);
        graphRef.current.zoom(2.5, 2000);
    }
  };

  if (window.location.pathname.startsWith('/verify-email')) {
    return <VerifyEmail />;
  }

  if (!user) return <AuthPage onLoginSuccess={(u) => setUser(u)} />;

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const getAvatarSrc = (avatarUrl) => {
    if (!avatarUrl) return null;
    return avatarUrl.startsWith('http') ? avatarUrl : `http://localhost:5000${avatarUrl}`;
  };

  // Nếu đang ở dashboard, hiển thị dashboard
  if (currentView === 'dashboard') {
    return <Dashboard 
      user={user} 
      onLogout={() => { localStorage.clear(); setUser(null); }}
      onReturnToApp={() => setCurrentView('app')}
      onUserUpdate={handleUserUpdate}
    />;
  }

  return (
    <div className="flex h-screen w-full bg-[#020617] text-white font-sans overflow-hidden">
      
      {/* 1. SIDEBAR: DANH SÁCH MÔN HỌC */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg"><BrainCircuit size={20} /></div>
              <h1 className="font-bold text-lg">My Brain</h1>
          </div>

          {/* Dashboard Button */}
          <div className="p-3 border-b border-slate-800">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="w-full flex items-center gap-2 text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700 px-3 py-2 rounded-lg transition text-sm font-bold"
            >
              <LayoutGrid size={16} /> Dashboard
            </button>
          </div>

          {/* AI Chat Button */}
          {selectedSubject && (
            <div className="p-3 border-b border-slate-800">
              <button 
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm font-bold ${isChatOpen ? 'bg-purple-600 text-white' : 'text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700'}`}
              >
                <MessageSquare size={16} /> Hỏi AI
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider px-2 mb-2">Môn học của tôi</div>
              
              {/* Nút tạo môn mới */}
              {isCreatingSubject ? (
                  <div className="bg-slate-800 p-2 rounded-lg animate-in fade-in">
                      <input 
                        autoFocus
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm mb-2 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="Tên môn..."
                        value={newSubjectName}
                        onChange={e => setNewSubjectName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateSubject()}
                      />
                      <div className="flex gap-2 text-xs">
                          <button onClick={handleCreateSubject} className="bg-blue-600 px-2 py-1 rounded hover:bg-blue-500">Tạo</button>
                          <button onClick={() => setIsCreatingSubject(false)} className="bg-slate-700 px-2 py-1 rounded hover:bg-slate-600">Hủy</button>
                      </div>
                  </div>
              ) : (
                  <button onClick={() => setIsCreatingSubject(true)} className="w-full flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-lg transition text-sm mb-2 border border-dashed border-slate-700">
                      <FolderPlus size={16} /> Thêm môn học
                  </button>
              )}

              {/* List Môn học */}
              {subjects.map(sub => (
                  <div
                    key={sub.id}
                    className={`group flex items-center justify-between px-3 py-3 rounded-lg text-sm transition ${selectedSubject?.id === sub.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'}`}
                  >
                      <button
                        onClick={() => handleSelectSubject(sub)}
                        className="flex-1 flex items-center gap-2 truncate text-left"
                      >
                          <Book size={16} /> 
                          <span className="truncate">{sub.name}</span>
                      </button>
                      
                      <div className="flex items-center gap-2">
                          {sub._count?.documents > 0 && <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full">{sub._count.documents}</span>}
                          <button
                            onClick={() => handleDeleteSubject(sub.id, sub.name)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-900/30 px-2 py-1 rounded transition flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            <span className="text-[10px] font-bold">Xóa</span>
                          </button>
                      </div>
                  </div>
              ))}
          </div>

          {/* User Footer */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      {user.avatarUrl ? (
                        <img
                          src={getAvatarSrc(user.avatarUrl)}
                          alt="avatar"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center font-bold text-xs">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <div className="text-sm font-medium truncate w-24">{user.name}</div>
                  </div>
                  <button onClick={() => { localStorage.clear(); setUser(null); }} className="text-slate-500 hover:text-red-400"><LogOut size={18} /></button>
              </div>
          </div>
      </div>

      {/* 2. MAIN AREA */}
      <div className="flex-1 relative bg-[#020617] flex flex-col h-screen overflow-hidden">
          
          {/* Header Môn học */}
          <div className="z-10 p-6 flex justify-between items-start border-b border-slate-800/50 flex-shrink-0">
              <div>
                  {selectedSubject ? (
                      <div className="animate-in slide-in-from-left-4">
                          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-3">
                              {selectedSubject.name}
                          </h2>
                          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2 cursor-pointer hover:text-blue-300 transition" onClick={() => loadDocuments(selectedSubject.id)}>
                              <Layers size={14} /> 
                              <span className="hover:underline">{graphData.nodes.filter(n => n.type === 'Source').length} Tài liệu</span> • {graphData.nodes.filter(n => n.type === 'Concept').length} Khái niệm
                          </p>
                      </div>
                  ) : (
                      <h2 className="text-2xl font-bold text-slate-500">Vui lòng chọn môn học</h2>
                  )}
              </div>

              {/* Nút Upload */}
            {selectedSubject && (
                  <div>
                      <label className="cursor-pointer bg-white text-slate-900 hover:bg-blue-50 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all transform hover:scale-105 active:scale-95">
                          {loading ? <Loader2 className="animate-spin"/> : <Upload size={20} />} 
                          {loading ? 'Đang học...' : 'Nạp thêm tài liệu'}
                          <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                      </label>
                  </div>
              )}
          </div>

          {/* Graph Area */}
          <div className="flex-1 relative overflow-hidden">
             {selectedSubject ? (
                 <ForceGraph2D
                    ref={graphRef}
                    graphData={graphData}
                  nodeLabel={() => ''}
                    nodeColor={node => node.color}
                    nodeRelSize={8}
                    linkColor={() => 'rgba(255,255,255,0.1)'}
                    backgroundColor="#020617"
                    onNodeClick={handleNodeClick}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const label = node.name;
                      const baseFontSize = 12 / globalScale;
                        ctx.fillStyle = node.id === selectedNode?.id ? 'rgba(59, 130, 246, 1)' : 'rgba(255, 255, 255, 0.6)';
                        ctx.beginPath();
                    const radius = node.val ? node.val * 0.4 : 5;
                    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                        ctx.fillStyle = node.color;
                        ctx.fill();
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                      const maxWidth = radius * 1.8;
                      let fontSize = baseFontSize;

                      // Try to fit text by reducing font size (min 8px)
                      ctx.font = `${fontSize}px Sans-Serif`;
                      while (ctx.measureText(label).width > maxWidth && fontSize > 8 / globalScale) {
                        fontSize -= 1 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                      }

                      // If still too long, wrap into up to 2 lines
                      const words = label.split(' ');
                      const lines = [];
                      let currentLine = '';

                      words.forEach(word => {
                        const testLine = currentLine ? `${currentLine} ${word}` : word;
                        if (ctx.measureText(testLine).width <= maxWidth) {
                          currentLine = testLine;
                        } else {
                          if (currentLine) lines.push(currentLine);
                          currentLine = word;
                        }
                      });
                      if (currentLine) lines.push(currentLine);

                      // Limit to 2 lines; if more, truncate last line
                      const displayLines = lines.slice(0, 2);
                      if (lines.length > 2) {
                        const last = displayLines[1];
                        let trimmed = last;
                        while (ctx.measureText(`${trimmed}…`).width > maxWidth && trimmed.length > 1) {
                          trimmed = trimmed.slice(0, -1);
                        }
                        displayLines[1] = `${trimmed}…`;
                      }

                      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                      const lineHeight = fontSize * 1.1;
                      const startY = node.y - (displayLines.length - 1) * lineHeight * 0.5;
                      displayLines.forEach((line, i) => {
                        ctx.fillText(line, node.x, startY + i * lineHeight);
                      });
                    }}
                />
             ) : (
                 <div className="absolute inset-0 flex items-center justify-center opacity-20">
                     <BrainCircuit size={200} />
                 </div>
             )}
          </div>
      </div>

      {/* 3. NODE INFO PANEL (Bên phải - Thông tin chi tiết) */}
      {selectedNode && selectedNode.type !== 'Source' && !isChatOpen && (
        <div className="fixed right-6 top-24 bottom-6 w-[400px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
            {/* Header */}
            <div className="bg-slate-800 p-4 flex justify-between items-start border-b border-slate-700">
                <div>
                    <h3 className="text-yellow-400 font-bold text-lg">{selectedNode.name}</h3>
                </div>
                <button 
                  onClick={() => {
                    setSelectedNode(null);
                    localStorage.removeItem('selectedNode');
                  }}
                  className="hover:bg-slate-700 p-1 rounded-full"
                >
                  <X size={20} className="text-slate-400" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Định nghĩa */}
                <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Định nghĩa</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{selectedNode.definition || "Chưa có định nghĩa"}</p>
                </div>

                {/* Thông tin vị trí */}
                <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Vị trí trong tài liệu</p>
                    <div className="text-sm">
                        <p className="text-slate-300"><span className="text-blue-400">📄 Trang:</span> {selectedNode.page || "?"}</p>
                        <p className="text-slate-300"><span className="text-blue-400">📚 Tài liệu:</span> 
                          <button 
                            onClick={() => loadDocuments(selectedSubject.id)}
                            className="text-blue-400 hover:text-blue-300 underline ml-1"
                          >
                            Xem danh sách
                          </button>
                        </p>
                    </div>
                </div>

                {/* Tags */}
                <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Thể loại</p>
                    <span className="inline-block bg-blue-600/20 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-600/30">
                        Khái niệm
                    </span>
                </div>
            </div>

            {/* Footer - Action Buttons */}
            <div className="bg-slate-800 p-4 border-t border-slate-700 space-y-2">
                <button 
                  onClick={() => handleViewInDocument(selectedNode)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  Xem trong tài liệu
                </button>
                
                <button 
                  onClick={() => handleDeleteConcept(selectedNode.id)}
                  className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 border border-red-600/30"
                >
                  <Trash2 size={16} />
                  Xóa khái niệm
                </button>
            </div>
        </div>
      )}

      {/* 4. MODAL PDF (Khi click "Xem trong tài liệu") */}
      {isPdfOpen && pdfFile && (
        <div className="fixed right-6 top-24 bottom-6 w-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
            <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
                <div className="flex items-center gap-2 text-blue-400 font-bold"><FileText size={18} /><span>Tài liệu</span></div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">Trang {currentPage}</span>
                    <button onClick={() => setIsPdfOpen(false)} className="hover:bg-slate-700 p-1 rounded-full"><X size={20} className="text-slate-400" /></button>
                </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-500/10 custom-scrollbar flex justify-center">
                <Document file={pdfFile} className="shadow-2xl">
                    <Page 
                      pageNumber={currentPage} 
                      renderTextLayer={true} 
                      renderAnnotationLayer={true}
                      width={450} 
                      className="bg-white text-black shadow-lg rounded-sm overflow-hidden"
                    />
                </Document>
            </div>
        </div>
      )}

      {/* 5. AI CHAT PANEL */}
      {isChatOpen && selectedSubject && (
        <div className="fixed right-6 top-24 bottom-6 w-[450px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex justify-between items-center border-b border-slate-700">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <MessageSquare size={18} />
                    Hỏi AI về {selectedSubject.name}
                </h3>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="hover:bg-white/20 p-1 rounded-full transition"
                >
                  <X size={20} className="text-white" />
                </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar bg-slate-950/50">
                {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <BrainCircuit size={48} className="text-purple-400 mb-3 opacity-50" />
                        <p className="text-slate-400 text-sm">Hãy hỏi tôi bất cứ điều gì về môn học này!</p>
                        <p className="text-slate-500 text-xs mt-2">Ví dụ: "Primary Key khác Foreign Key thế nào?"</p>
                    </div>
                ) : (
                    chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.type === 'user' ? (
                                <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl max-w-[80%] text-sm">
                                    {msg.text}
                                </div>
                            ) : msg.type === 'error' ? (
                                <div className="bg-red-900/30 border border-red-600/50 text-red-400 px-4 py-2 rounded-2xl max-w-[80%] text-sm">
                                    {msg.text}
                                </div>
                            ) : msg.type === 'loading' ? (
                                <div className="bg-slate-700/50 text-slate-300 px-4 py-2 rounded-2xl max-w-[80%] text-sm flex items-center gap-2">
                                    <span className="inline-block animate-spin">⏳</span>
                                    {msg.text}
                                </div>
                            ) : (
                                <div className="bg-slate-800 text-slate-200 px-4 py-3 rounded-2xl max-w-[85%] text-sm">
                                    <div className="mb-2">{msg.text}</div>
                                    {msg.concepts && msg.concepts.length > 0 ? (
                                        <div className="mt-3 pt-3 border-t border-slate-700">
                                            <p className="text-xs text-slate-400 mb-2 font-bold">📚 Nguồn tham khảo:</p>
                                            {msg.concepts.map((concept, i) => (
                                                <div key={i} className="text-xs text-slate-400 mb-1">
                                                    • <span className="text-blue-400">{concept.term}</span> - {concept.source}
                                                </div>
                                            ))}
                                        </div>
                                    ) : msg.fromGeneralKnowledge && (
                                        <div className="mt-3 pt-3 border-t border-yellow-700/30">
                                            <p className="text-xs text-yellow-500 flex items-center gap-1">
                                                ⚠️ Trả lời từ kiến thức chung (không có trong tài liệu)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
                
                {isChatLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 text-slate-400 px-4 py-3 rounded-2xl flex items-center gap-2">
                            <Loader2 className="animate-spin" size={16} />
                            <span className="text-sm">Đang suy nghĩ...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="bg-slate-800 p-4 border-t border-slate-700">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !isChatLoading && handleAskAI()}
                        placeholder="Hỏi về khái niệm, so sánh..."
                        className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl py-2 px-4 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm placeholder-slate-500"
                        disabled={isChatLoading}
                    />
                    <button
                        onClick={handleAskAI}
                        disabled={isChatLoading || !chatInput.trim()}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white p-2 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                    </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">AI sẽ trả lời dựa trên tài liệu của bạn</p>
            </div>
        </div>
      )}

      {/* 6. MODAL DANH SÁCH TÀI LIỆU */}
      {isDocumentListOpen && selectedSubject && (
        <div className="fixed right-6 top-24 bottom-6 w-[400px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
            {/* Header */}
            <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
                <h3 className="text-blue-400 font-bold flex items-center gap-2">
                    <FileText size={18} />
                    Danh sách tài liệu
                </h3>
                <button 
                  onClick={() => setIsDocumentListOpen(false)}
                  className="hover:bg-slate-700 p-1 rounded-full"
                >
                  <X size={20} className="text-slate-400" />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {documents.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        Chưa có tài liệu nào
                    </div>
                ) : (
                    <div className="p-3 space-y-2">
                        {documents.map((doc, idx) => (
                            <div 
                              key={doc.id}
                              onClick={() => {
                                setPdfFile(doc.fileUrl);
                                setCurrentPage(1);
                                localStorage.setItem('currentPage', '1');
                                setIsPdfOpen(true);
                                localStorage.setItem('isPdfOpen', JSON.stringify(true));
                                setIsDocumentListOpen(false);
                              }}
                              className="bg-slate-800/50 hover:bg-slate-700 cursor-pointer p-3 rounded-lg transition border border-slate-700 group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white truncate group-hover:text-blue-300 transition">{doc.title}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {doc._count?.concepts || 0} khái niệm
                                        </p>
                                    </div>
                                    <span className="text-xs text-slate-500 ml-2 flex-shrink-0">
                                        {new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}

    </div>
  );
}

export default App;