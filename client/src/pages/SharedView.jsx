import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3-force';
import { ArrowLeft, Loader2 } from 'lucide-react';
import GraphView from '../components/graph/GraphView';
import NodeInfoPanel from '../components/panels/NodeInfoPanel';

export default function SharedView({ token, onClose }) {
  const [shareInfo, setShareInfo] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [error, setError] = useState('');
  const graphRef = useRef();

  const handleNodeClick = (node) => {
    console.log('Node clicked:', node);
    setSelectedNode(node);
  };

  useEffect(() => {
    console.log('Selected node changed:', selectedNode);
  }, [selectedNode]);

  useEffect(() => {
    fetchSharedData();
  }, [token]);

  const fetchSharedData = async () => {
    setLoading(true);
    setError('');

    try {
      // Get share info
      const infoRes = await fetch(`http://localhost:5000/api/shares/${token}`);
      if (!infoRes.ok) {
        throw new Error('Link chia sẻ không hợp lệ hoặc đã hết hạn');
      }
      const info = await infoRes.json();
      setShareInfo(info);
      console.log('Share info:', info);
      console.log('Subject from info:', info.subject);

      // Get graph data
      const graphRes = await fetch(`http://localhost:5000/api/shares/${token}/graph`);
      if (!graphRes.ok) {
        throw new Error('Không thể tải dữ liệu chia sẻ');
      }
      const graph = await graphRes.json();
      console.log('Graph data:', graph);
      setGraphData(graph);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải dữ liệu chia sẻ');
      console.error('Error fetching shared data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#020617]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={48} className="text-blue-400 animate-spin" />
          <p className="text-slate-400">Đang tải dữ liệu chia sẻ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#020617]">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Lỗi</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#020617] text-white font-sans overflow-hidden">
      {/* HEADER BANNER */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-gradient-to-r from-amber-900/50 to-orange-900/50 border-b border-amber-700/50 px-6 py-3 flex items-center gap-3 backdrop-blur-sm">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-amber-200 hover:text-amber-100 transition"
        >
          <ArrowLeft size={20} />
          <span className="font-semibold">Quay lại</span>
        </button>
        <div className="flex-1">
          <p className="text-sm text-amber-200">
            📌 Đang xem chia sẻ từ <span className="font-bold">{shareInfo?.subject?.ownerName}</span> • <span className="font-semibold">{shareInfo?.subject?.name}</span> {shareInfo?.shareType === 'public' ? '(công khai)' : '(riêng tư)'}
          </p>
        </div>
        <div className="text-xs text-amber-300/70">
          {graphData?.nodes?.filter(n => n.type === 'Concept').length || 0} khái niệm • {graphData?.nodes?.filter(n => n.type === 'Source').length || 0} tài liệu
        </div>
      </div>

      {/* MAIN CONTENT (with padding for banner) */}
      <div className="flex-1 pt-16 flex overflow-hidden" style={{ height: '100vh' }}>
        {/* GRAPH VIEW */}
        <div className="flex-1 relative" style={{ minHeight: '500px' }}>
          <GraphView
            selectedSubject={{ id: 'shared', name: shareInfo?.subject?.name || 'Shared' }}
            graphData={graphData}
            selectedNode={selectedNode}
            onNodeClick={handleNodeClick}
            graphRef={graphRef}
          />
        </div>

        {/* RIGHT PANEL - NODE INFO (READ-ONLY) */}
        {selectedNode && (
          <NodeInfoPanel
            selectedNode={selectedNode}
            onClose={() => setSelectedNode(null)}
            isSharedView={true}
          />
        )}
      </div>
    </div>
  );
}
