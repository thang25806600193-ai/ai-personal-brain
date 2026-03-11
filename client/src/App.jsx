import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import * as d3 from 'd3-force';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import VerifyEmail from './pages/VerifyEmail';
import SharedView from './pages/SharedView';
import Sidebar from './components/layout/Sidebar';
import SubjectHeader from './components/layout/SubjectHeader';
import GraphView from './components/graph/GraphView';
import NodeInfoPanel from './components/panels/NodeInfoPanel';
import PdfPanel from './components/panels/PdfPanel';
import ChatPanel from './components/panels/ChatPanel';
import DocumentListPanel from './components/panels/DocumentListPanel';
import AddConceptPanel from './components/panels/AddConceptPanel';
import NotificationCenter from './components/panels/NotificationCenter';
import QuizPanel from './components/panels/QuizPanel';
import { API_URL, toAbsoluteUrl, uploadsUrl } from './config/api';

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadEtaSeconds, setUploadEtaSeconds] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle');
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
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  
  // --- STATE CHAT AI ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // --- STATE ADD CONCEPT ---
  const [isAddConceptOpen, setIsAddConceptOpen] = useState(false);

  // --- STATE SEARCH NODE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- STATE NOTIFICATION (AI Agent) ---
  const [reloadGraphTrigger, setReloadGraphTrigger] = useState(0);
  
  const graphRef = useRef();
  const uploadStartRef = useRef(null);
  const processingEstimateRef = useRef(0);
  const processingStartRef = useRef(null);
  const processingTimerRef = useRef(null);
  const token = localStorage.getItem('token');

  const PROCESSING_STATS_KEY = 'uploadProcessingStats';
  const DEFAULT_BASE_PROCESSING_SECONDS = 10;
  const DEFAULT_SECONDS_PER_MB = 6;

  const getProcessingEstimateSeconds = (fileSizeBytes) => {
    const sizeMb = Math.max(fileSizeBytes / (1024 * 1024), 0.1);
    let secondsPerMb = DEFAULT_SECONDS_PER_MB;
    let baseSeconds = DEFAULT_BASE_PROCESSING_SECONDS;

    try {
      const raw = localStorage.getItem(PROCESSING_STATS_KEY);
      if (raw) {
        const stats = JSON.parse(raw);
        if (stats?.totalMb > 0 && stats?.totalSeconds > 0) {
          secondsPerMb = stats.totalSeconds / stats.totalMb;
        }
      }
    } catch (error) {
      console.warn('Không thể đọc thống kê upload:', error);
    }

    return Math.max(1, Math.round(baseSeconds + secondsPerMb * sizeMb));
  };

  const saveProcessingStats = (fileSizeBytes, totalSeconds) => {
    const sizeMb = Math.max(fileSizeBytes / (1024 * 1024), 0.1);
    try {
      const raw = localStorage.getItem(PROCESSING_STATS_KEY);
      const stats = raw ? JSON.parse(raw) : {};
      const totalMb = (stats.totalMb || 0) + sizeMb;
      const totalSecondsAccum = (stats.totalSeconds || 0) + totalSeconds;
      localStorage.setItem(
        PROCESSING_STATS_KEY,
        JSON.stringify({ totalMb, totalSeconds: totalSecondsAccum })
      );
    } catch (error) {
      console.warn('Không thể lưu thống kê upload:', error);
    }
  };

  const startProcessingCountdown = (estimateSeconds) => {
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
    }

    processingStartRef.current = Date.now();
    setUploadEtaSeconds(Math.max(0, estimateSeconds));

    processingTimerRef.current = setInterval(() => {
      if (!processingStartRef.current) return;
      const elapsed = (Date.now() - processingStartRef.current) / 1000;
      const remaining = Math.max(0, Math.round(estimateSeconds - elapsed));
      setUploadEtaSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(processingTimerRef.current);
        processingTimerRef.current = null;
      }
    }, 1000);
  };

  // Cấu hình Axios để luôn gửi Token
  const api = axios.create({
    baseURL: API_URL,
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

  // Callback khi AI apply suggestion - reload graph
  const handleNotificationApply = async () => {
    if (selectedSubject) {
      await handleSelectSubject(selectedSubject);
      setReloadGraphTrigger(prev => prev + 1); // Trigger reload
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
    setUploadProgress(0);
    setUploadEtaSeconds(null);
    setUploadStatus('uploading');
    uploadStartRef.current = Date.now();
    processingEstimateRef.current = getProcessingEstimateSeconds(file.size);
    processingStartRef.current = null;
    if (processingTimerRef.current) {
      clearInterval(processingTimerRef.current);
      processingTimerRef.current = null;
    }
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
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 0;
          if (!total) return;
          const loaded = progressEvent.loaded || 0;
          const percent = Math.min(100, Math.round((loaded / total) * 100));
          setUploadProgress(percent);

          if (uploadStartRef.current && loaded > 0) {
            const elapsedSeconds = (Date.now() - uploadStartRef.current) / 1000;
            const totalSeconds = (elapsedSeconds * total) / loaded;
            const etaSeconds = Math.max(0, Math.round(totalSeconds - elapsedSeconds));
            const totalEta = Math.max(0, etaSeconds + (processingEstimateRef.current || 0));
            setUploadEtaSeconds(totalEta);
          }

          if (percent >= 100) {
            setUploadStatus('processing');
            if (!processingStartRef.current) {
              startProcessingCountdown(processingEstimateRef.current || 0);
            }
          }
        }
      });
      
      // Upload xong: cập nhật PDF và mở lên
      setPdfFile(file);
      setCurrentPage(1);
      localStorage.setItem('currentPage', '1');
      
      // Reload lại Graph
      await handleSelectSubject(selectedSubject);

      setUploadProgress(100);
      setUploadEtaSeconds(0);
      setUploadStatus('done');
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
        processingTimerRef.current = null;
      }
      if (uploadStartRef.current) {
        const totalSeconds = Math.round((Date.now() - uploadStartRef.current) / 1000);
        saveProcessingStats(file.size, totalSeconds);
      }
      setTimeout(() => {
        setUploadProgress(0);
        setUploadEtaSeconds(null);
        setUploadStatus('idle');
      }, 2000);
      
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi upload.");
      setLoading(false);
      setUploadStatus('error');
      setUploadEtaSeconds(null);
      if (processingTimerRef.current) {
        clearInterval(processingTimerRef.current);
        processingTimerRef.current = null;
      }
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

  const handleDeleteConcept = async (conceptNode) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa khái niệm này?')) return;
    
    try {
      if (!selectedSubject) return;

      const term = conceptNode?.name || conceptNode?.term;
      if (!term) return;

      await api.post('/concepts/delete-by-term', {
        subjectId: selectedSubject.id,
        term,
      });
      
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
    if (node.type === 'Source' || node.type === 'PersonalNotes' || node.type === 'Web_Article') return;
    setSelectedNode(node);
    localStorage.setItem('selectedNode', JSON.stringify(node));
    // Không tự động mở PDF - chỉ hiển thị thông tin
  }, []);

  const handleViewInDocument = (node) => {
    if (node?.sourceUrl) {
      window.open(node.sourceUrl, '_blank', 'noopener,noreferrer');
      return;
    }

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
    const fileUrl = uploadsUrl(doc.filePath.split('\\').pop());
    
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

  const handleSelectDocumentFromList = (doc) => {
    setPdfFile(doc.fileUrl);
    setCurrentPage(1);
    localStorage.setItem('currentPage', '1');
    setIsPdfOpen(true);
    localStorage.setItem('isPdfOpen', JSON.stringify(true));
    setIsDocumentListOpen(false);
  };

  const handleRequestSuggestions = async (noteText) => {
    if (!selectedSubject) return { suggestions: [], newConceptCandidates: [] };
    
    try {
      const res = await api.post('/concepts/suggest-links', {
        subjectId: selectedSubject.id,
        noteText,
        threshold: 0.6,
        limit: 5,
      });
      return res.data;
    } catch (error) {
      console.error('Lỗi gợi ý:', error);
      throw error;
    }
  };

  const handleCreateManualConcept = async (data) => {
    if (!selectedSubject) return;
    
    try {
      await api.post('/concepts/manual', {
        subjectId: selectedSubject.id,
        ...data,
      });
      
      // Refresh graph
      await handleSelectSubject(selectedSubject);
      alert('✅ Tạo khái niệm thành công!');
    } catch (error) {
      console.error('Lỗi tạo concept:', error);
      throw error;
    }
  };

  const handleSearchConcepts = async (term) => {
    if (!selectedSubject) return [];

    try {
      const res = await api.post('/concepts/search', {
        subjectId: selectedSubject.id,
        term,
      });
      return res.data || [];
    } catch (error) {
      console.error('Lỗi search:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!selectedSubject) return;

    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const debounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await handleSearchConcepts(query);
        setSearchResults(res || []);
      } catch (error) {
        console.error('Lỗi search:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, selectedSubject]);

  const handleSelectSearchResult = (item) => {
    const node = graphData.nodes.find((n) => n.name === item.term);
    if (node) {
      setSelectedNode(node);
      localStorage.setItem('selectedNode', JSON.stringify(node));
    } else {
      const fallbackNode = {
        id: item.term,
        name: item.term,
        definition: item.definition || 'Chưa có định nghĩa',
        type: 'Concept',
      };
      setSelectedNode(fallbackNode);
      localStorage.setItem('selectedNode', JSON.stringify(fallbackNode));
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  const handleUpdateConcept = async ({ currentTerm, newTerm, definition, example }) => {
    if (!selectedSubject) return;

    try {
      await api.post('/concepts/update-by-term', {
        subjectId: selectedSubject.id,
        currentTerm,
        newTerm,
        definition,
        example,
      });

      // Reload subject data to reflect changes
      await handleSelectSubject(selectedSubject);
      
      // Clear selected node and search to see fresh data
      setSelectedNode(null);
      setSearchQuery('');
      setSearchResults([]);
      
      alert('✅ Cập nhật khái niệm thành công!');
    } catch (error) {
      console.error('Lỗi cập nhật:', error);
      throw error;
    }
  };

  // Handle shared view route (no auth required)
  if (window.location.pathname.startsWith('/share/')) {
    const token = window.location.pathname.split('/share/')[1];
    if (token) {
      return <SharedView token={token} onClose={() => window.history.back()} />;
    }
  }

  if (window.location.pathname.startsWith('/verify-email')) {
    return <VerifyEmail />;
  }

  if (!user) return <AuthPage onLoginSuccess={(u) => setUser(u)} />;

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const getAvatarSrc = (avatarUrl) => toAbsoluteUrl(avatarUrl);

  // Nếu đang ở dashboard, hiển thị dashboard
  if (currentView === 'dashboard') {
    return <Dashboard 
      user={user} 
      onLogout={() => { localStorage.clear(); setUser(null); }}
      onReturnToApp={async (sharedSubject) => {
        if (sharedSubject && sharedSubject.subject && sharedSubject.subject.id) {
          // Check if user has access to this shared subject
          try {
            const accessRes = await api.get(`/subjects/${sharedSubject.subject.id}/access`);
            if (!accessRes.data.canAccess) {
              alert('Bạn không có quyền truy cập môn học này');
              setCurrentView('app');
              return;
            }
            
            // Set shared subject - mark as shared only if not owner
            const isOwner = accessRes.data.isOwner;
            const subjectToLoad = { 
              ...sharedSubject.subject, 
              isShared: !isOwner  // Only mark as shared for non-owners
            };
            setSelectedSubject(subjectToLoad);
            setLoading(true);
            try {
              const res = await api.get(`/subjects/${sharedSubject.subject.id}/graph`);
              setGraphData(res.data);
              if (res.data.documents) {
                setDocuments(res.data.documents);
              }
            } catch (e) { 
              console.error("Lỗi load shared graph:", e); 
            }
            setLoading(false);
          } catch (e) {
            console.error("Lỗi check access:", e);
            alert('Không thể kiểm tra quyền truy cập');
          }
        } else if (sharedSubject && sharedSubject.id) {
          setSelectedSubject(sharedSubject);
          setLoading(true);
          try {
            const res = await api.get(`/subjects/${sharedSubject.id}/graph`);
            setGraphData(res.data);
            if (res.data.documents) {
              setDocuments(res.data.documents);
            }
          } catch (e) {
            console.error("Lỗi load graph:", e);
          }
          setLoading(false);
        }
        setCurrentView('app');
      }}
      onUserUpdate={handleUserUpdate}
    />;
  }

  return (
    <div className="flex h-screen w-full bg-[#1e293b] text-white font-sans overflow-hidden">
      <Sidebar
        user={user}
        subjects={subjects}
        selectedSubject={selectedSubject}
        isCreatingSubject={isCreatingSubject}
        newSubjectName={newSubjectName}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onCreateSubjectStart={() => setIsCreatingSubject(true)}
        onCreateSubjectCancel={() => setIsCreatingSubject(false)}
        onCreateSubject={handleCreateSubject}
        onNewSubjectNameChange={setNewSubjectName}
        onSelectSubject={handleSelectSubject}
        onDeleteSubject={handleDeleteSubject}
        onOpenDashboard={() => setCurrentView('dashboard')}
        onLogout={() => { localStorage.clear(); setUser(null); }}
        getAvatarSrc={getAvatarSrc}
      />

      {/* 2. MAIN AREA */}
      <div className="flex-1 relative bg-[#1e293b] flex flex-col h-screen overflow-hidden">
        <SubjectHeader
          selectedSubject={selectedSubject}
          graphData={graphData}
          loading={loading}
          uploadProgress={uploadProgress}
          uploadEtaSeconds={uploadEtaSeconds}
          uploadStatus={uploadStatus}
          onLoadDocuments={loadDocuments}
          onFileUpload={handleFileUpload}
          onAddConcept={() => setIsAddConceptOpen(true)}
          onStartQuiz={() => setIsQuizOpen(true)}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          searchResults={searchResults}
          onSelectSearchResult={handleSelectSearchResult}
          isSearching={isSearching}
        />

        <GraphView
          selectedSubject={selectedSubject}
          graphData={graphData}
          graphRef={graphRef}
          selectedNode={selectedNode}
          onNodeClick={handleNodeClick}
        />

        {isQuizOpen && selectedSubject && (
          <QuizPanel
            subjectId={selectedSubject.id}
            subjectName={selectedSubject.name}
            token={token}
            onClose={() => setIsQuizOpen(false)}
          />
        )}
      </div>

      {/* 3. NODE INFO PANEL (Bên phải - Thông tin chi tiết) */}
      {selectedNode && selectedNode.type !== 'Source' && !isChatOpen && (
        <NodeInfoPanel
          selectedNode={selectedNode}
          onClose={() => {
            setSelectedNode(null);
            localStorage.removeItem('selectedNode');
          }}
          onViewInDocument={handleViewInDocument}
          onDeleteConcept={handleDeleteConcept}
          onUpdateConcept={handleUpdateConcept}
          onOpenDocumentList={() => selectedSubject && loadDocuments(selectedSubject.id)}
          isSharedView={selectedSubject?.isShared || false}
        />
      )}

      {/* 4. MODAL PDF (Khi click "Xem trong tài liệu") */}
      {isPdfOpen && pdfFile && (
        <PdfPanel
          pdfFile={pdfFile}
          currentPage={currentPage}
          onClose={() => setIsPdfOpen(false)}
        />
      )}

      {/* 5. AI CHAT PANEL */}
      {isChatOpen && selectedSubject && (
        <ChatPanel
          selectedSubjectName={selectedSubject.name}
          chatMessages={chatMessages}
          isChatLoading={isChatLoading}
          chatInput={chatInput}
          onChatInputChange={setChatInput}
          onSend={handleAskAI}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* 6. MODAL DANH SÁCH TÀI LIỆU */}
      {isDocumentListOpen && selectedSubject && (
        <DocumentListPanel
          documents={documents}
          onClose={() => setIsDocumentListOpen(false)}
          onSelectDocument={handleSelectDocumentFromList}
        />
      )}

      {/* 7. PANEL THÊM KHÁI NIỆM THỦ CÔNG */}
      {isAddConceptOpen && selectedSubject && (
        <AddConceptPanel
          selectedSubject={selectedSubject}
          documents={documents}
          onClose={() => setIsAddConceptOpen(false)}
          onCreateConcept={handleCreateManualConcept}
          onRequestSuggestions={handleRequestSuggestions}
          onSearchConcepts={handleSearchConcepts}
        />
      )}

      {/* 8. 🤖 AI AGENT NOTIFICATION CENTER */}
      <NotificationCenter
        selectedSubject={selectedSubject}
        token={token}
        onNotificationApply={handleNotificationApply}
      />

    </div>
  );
}

export default App;