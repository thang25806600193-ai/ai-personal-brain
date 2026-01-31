import React, { useState, useRef, useCallback, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import axios from 'axios';
import { Upload, BrainCircuit, Loader2, BookOpen, X, Maximize2, Minimize2, FileText } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import * as d3 from 'd3-force';

// CSS
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import './App.css'; // CSS cho animation

// Worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [docInfo, setDocInfo] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPdfOpen, setIsPdfOpen] = useState(false); // Trạng thái mở/đóng PDF
  
  const graphRef = useRef();

  // --- LOGIC HIGHLIGHT (Tô vàng rực rỡ) ---
  const textRenderer = useCallback(
    (textItem) => {
      if (!selectedNode || !selectedNode.name) return textItem.str;
      const highlightTerm = selectedNode.name.trim();
      if (!highlightTerm) return textItem.str;
      
      // Escape ký tự đặc biệt trong regex
      const escapedTerm = highlightTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      const parts = textItem.str.split(regex);
      
      if (parts.length === 1) return textItem.str;
      
      return parts.map((part, index) => 
        regex.test(part) ? (
            <span 
              key={index} 
              style={{ 
                backgroundColor: '#fbbf24', // Vàng rực
                color: '#000', 
                fontWeight: 'bold',
                padding: '2px 4px',
                borderRadius: '2px',
                boxShadow: '0 0 8px rgba(251, 191, 36, 0.6)',
                animation: 'pulse 2s ease-in-out infinite'
              }}
            >
                {part}
            </span>
        ) : part
      );
    },
    [selectedNode]
  );

  // --- LOGIC GRAPH VẬT LÝ ---
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
        const fg = graphRef.current;
        fg.d3Force('charge', d3.forceManyBody().strength(-300));
        fg.d3Force('link').distance(100);
        fg.d3Force('center', d3.forceCenter().strength(0.5));
        fg.d3ReheatSimulation();
    }
  }, [graphData]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setPdfFile(file);
    setCurrentPage(1);
    setIsPdfOpen(false); // Upload xong chưa mở PDF vội, để ngắm Graph đã

    const formData = new FormData();
    formData.append('pdfFile', file);
    formData.append('subjectId', 'demo-subject');

    try {
      const response = await axios.post('http://localhost:5000/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { extractedConcepts, document } = response.data;
      setDocInfo(document);

      // Tạo Node Gốc là Tên Môn Học / Tài liệu
      const nodes = [{ id: 'ROOT', name: document.title, val: 40, color: '#ef4444', type: 'Source' }];
      const links = [];
      
      extractedConcepts.forEach((concept) => {
        nodes.push({
          id: concept.term,
          name: concept.term,
          definition: concept.definition,
          page: concept.pageNumber || 1,
          val: 15,
          color: '#3b82f6',
          type: 'Concept'
        });
        links.push({ source: 'ROOT', target: concept.term });
      });

      setGraphData({ nodes, links });
      setLoading(false);
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Lỗi upload.");
      setLoading(false);
    }
  };

  // --- KHI CLICK VÀO NODE ---
  const handleNodeClick = useCallback(node => {
    if (node.id === 'ROOT') return; // Click vào gốc thì không làm gì (hoặc có thể hiện thông tin chung)
    
    setSelectedNode(node);
    
    // 1. Mở Modal PDF lên
    setIsPdfOpen(true);

    // 2. Chuyển đến trang
    if (node.page) {
        setCurrentPage(node.page);
    }

    // 3. Zoom nhẹ vào node đó trên Graph
    if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 1000);
        graphRef.current.zoom(2, 2000);
    }
  }, []);

  return (
    <div className="relative h-screen w-full bg-[#020617] text-white overflow-hidden font-sans">
      
      {/* 1. LỚP NỀN: KNOWLEDGE GRAPH (Full màn hình) */}
      <div className="absolute inset-0 z-0">
         <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel="name"
            nodeColor={node => node.color}
            nodeRelSize={8}
            linkColor={() => 'rgba(255,255,255,0.15)'}
            backgroundColor="#020617"
            onNodeClick={handleNodeClick}
            // Vẽ thêm text bên cạnh node để dễ đọc
            nodeCanvasObject={(node, ctx, globalScale) => {
                const label = node.name;
                const fontSize = 12/globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                if (node.id === selectedNode?.id) ctx.fillStyle = 'rgba(59, 130, 246, 0.9)'; // Highlight node đang chọn
                
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.val ? node.val * 0.4 : 5, 0, 2 * Math.PI, false);
                ctx.fillStyle = node.color;
                ctx.fill();

                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = node.id === 'ROOT' ? '#fff' : 'rgba(255,255,255,0.8)';
                ctx.fillText(label, node.x, node.y + (node.val ? node.val * 0.5 : 8));
            }}
        />
      </div>

      {/* 2. HEADER NỔI (Control Panel) */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-6 pointer-events-none">
         <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-lg">
                <BrainCircuit className="text-white w-6 h-6" />
            </div>
            <div>
                <h1 className="text-lg font-bold text-white">AI Personal Brain</h1>
                <p className="text-xs text-slate-400">{docInfo ? docInfo.title : 'Chưa có dữ liệu'}</p>
            </div>
         </div>

         <div className="pointer-events-auto">
            <label className="cursor-pointer bg-white text-slate-900 hover:bg-blue-50 px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all transform hover:scale-105">
                {loading ? <Loader2 className="animate-spin"/> : <Upload size={20} />} 
                {loading ? 'Đang phân tích...' : 'Nạp kiến thức mới'}
                <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
            </label>
         </div>
      </div>

      {/* 3. MODAL PDF (Chỉ hiện khi click vào Node) */}
      {isPdfOpen && pdfFile && (
        <div className="absolute right-6 top-24 bottom-6 w-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden animate-in slide-in-from-right-10 duration-300">
            {/* Header Modal */}
            <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
                <div className="flex items-center gap-2 text-blue-400 font-bold">
                    <FileText size={18} />
                    <span>Nguồn kiến thức</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 bg-slate-700 px-2 py-1 rounded">Trang {currentPage}</span>
                    <button onClick={() => setIsPdfOpen(false)} className="hover:bg-slate-700 p-1 rounded-full transition">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Nội dung PDF */}
            <div className="flex-1 overflow-auto p-4 bg-slate-500/10 custom-scrollbar flex justify-center">
                <Document
                    file={pdfFile}
                    loading={<div className="text-white mt-10">Đang tải trang...</div>}
                    className="shadow-2xl"
                >
                    <Page 
                        pageNumber={currentPage} 
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        customTextRenderer={textRenderer}
                        width={450} 
                        className="bg-white text-black shadow-lg rounded-sm overflow-hidden"
                    />
                </Document>
            </div>

            {/* Footer Modal: Định nghĩa ngắn */}
            {selectedNode && (
                <div className="bg-slate-800 p-4 border-t border-slate-700">
                    <h3 className="text-yellow-400 font-bold mb-1 text-sm">{selectedNode.name}</h3>
                    <p className="text-slate-300 text-xs leading-relaxed">{selectedNode.definition}</p>
                </div>
            )}
        </div>
      )}

      {/* 4. HƯỚNG DẪN BAN ĐẦU (Nếu chưa chọn file) */}
      {!docInfo && !loading && (
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
            <div className="text-center opacity-30">
                <BrainCircuit size={120} className="mx-auto mb-4" />
                <h2 className="text-3xl font-bold">Upload tài liệu để tạo não bộ</h2>
            </div>
        </div>
      )}

    </div>
  );
}

export default App;