import React, { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { BrainCircuit, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

export default function GraphView({
  selectedSubject,
  graphData,
  graphRef,
  selectedNode,
  onNodeClick,
}) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);

  const drawRoundedRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const getNodeGeometry = (node) => {
    const isSourceNode = node.type === 'Source' || node.type === 'Web_Article';
    const nodeSize = Math.max(node.val ? node.val * 0.75 : 10, 9);
    return {
      isSourceNode,
      nodeSize,
      width: isSourceNode ? nodeSize * 2.4 : nodeSize * 2,
      height: isSourceNode ? nodeSize * 1.8 : nodeSize * 2,
      radius: nodeSize,
    };
  };

  console.log('GraphView render:', { selectedSubject, graphData, size });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      const { clientWidth, clientHeight } = containerRef.current;
      setSize({ width: clientWidth, height: clientHeight });
    };

    updateSize();

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden">
      {selectedSubject ? (
        <>
          <ForceGraph2D
            key={`graph-${graphData?.nodes?.length || 0}-${graphData?.links?.length || 0}`}
            ref={graphRef}
            graphData={graphData}
            width={size.width || 800}
            height={size.height || 600}
            nodeLabel={() => ''}
            nodeColor={node => node.color}
            nodeRelSize={14}
            linkColor={() => 'rgba(255,255,255,0.14)'}
            backgroundColor="#1e293b"
            onNodeClick={onNodeClick}
            onNodeHover={(node) => setHoveredNode(node || null)}
            nodePointerAreaPaint={(node, color, ctx) => {
              const { isSourceNode, width, height, radius } = getNodeGeometry(node);
              ctx.fillStyle = color;

              // Keep click target tighter than visual size to avoid selecting nearby nodes.
              if (isSourceNode) {
                const hitWidth = width * 0.82;
                const hitHeight = height * 0.82;
                drawRoundedRect(
                  ctx,
                  node.x - hitWidth / 2,
                  node.y - hitHeight / 2,
                  hitWidth,
                  hitHeight,
                  5
                );
                ctx.fill();
                return;
              }

              ctx.beginPath();
              ctx.arc(node.x, node.y, radius * 0.78, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const label = node.name || '';
              const { isSourceNode, width, height, radius } = getNodeGeometry(node);
              const isHovered = hoveredNode?.id === node.id;
              const isSelected = node.id === selectedNode?.id;
              const isWebArticle = node.type === 'Web_Article';

              const baseFontSize = (isHovered ? 20 : 16) / globalScale;

              if (isSourceNode) {
                ctx.fillStyle = isWebArticle ? '#C4B5FD' : '#FDBA74';
                drawRoundedRect(ctx, node.x - width / 2, node.y - height / 2, width, height, 6 / globalScale);
                ctx.fill();

                ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)';
                ctx.lineWidth = isSelected ? 2.2 / globalScale : 1.2 / globalScale;
                ctx.stroke();

                ctx.font = `${Math.max(11 / globalScale, 8 / globalScale)}px Sans-Serif`;
                ctx.fillStyle = isWebArticle ? 'rgba(49, 46, 129, 0.95)' : 'rgba(15, 23, 42, 0.95)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(isWebArticle ? '🌐' : '📄', node.x, node.y - height * 0.15);
              } else {
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = '#22D3EE';
                ctx.shadowColor = 'rgba(34, 211, 238, 0.55)';
                ctx.shadowBlur = (isHovered ? 24 : 16) / globalScale;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.42)';
                ctx.lineWidth = (isSelected ? 2.4 : 1.4) / globalScale;
                ctx.stroke();
              }

              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              const maxWidth = isSourceNode ? width * 0.78 : radius * 1.8;
              let fontSize = baseFontSize;

              ctx.font = `${fontSize}px Sans-Serif`;
              while (ctx.measureText(label).width > maxWidth && fontSize > 10 / globalScale) {
                fontSize -= 1 / globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
              }

              const words = label.split(' ');
              const lines = [];
              let currentLine = '';

              words.forEach((word) => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                if (ctx.measureText(testLine).width <= maxWidth) {
                  currentLine = testLine;
                } else {
                  if (currentLine) lines.push(currentLine);
                  currentLine = word;
                }
              });
              if (currentLine) lines.push(currentLine);

              const displayLines = lines.slice(0, 2);
              if (lines.length > 2) {
                const last = displayLines[1];
                let trimmed = last;
                while (ctx.measureText(`${trimmed}…`).width > maxWidth && trimmed.length > 1) {
                  trimmed = trimmed.slice(0, -1);
                }
                displayLines[1] = `${trimmed}…`;
              }

              ctx.fillStyle = isSourceNode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)';
              const lineHeight = fontSize * 1.1;
              const textOffsetY = isSourceNode ? node.y + height * 0.18 : node.y;
              const startY = textOffsetY - (displayLines.length - 1) * lineHeight * 0.5;
              displayLines.forEach((line, i) => {
                ctx.fillText(line, node.x, startY + i * lineHeight);
              });
            }}
          />

          {hoveredNode && (
            <div className="absolute top-4 left-4 max-w-sm p-3 rounded-xl bg-slate-900/90 border border-slate-600 shadow-2xl backdrop-blur-sm pointer-events-none">
              <p className="text-xs uppercase tracking-wide text-cyan-300 mb-1">
                {hoveredNode.type === 'Source' ? 'Tài liệu PDF' : (hoveredNode.type === 'Web_Article' ? 'Nguồn Web' : 'Khái niệm')}
              </p>
              <p className="text-white font-semibold text-sm">{hoveredNode.name}</p>
              {hoveredNode.definition && hoveredNode.type !== 'Source' && (
                <p className="text-slate-300 text-xs mt-1 line-clamp-3">{hoveredNode.definition}</p>
              )}
            </div>
          )}

          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button
              onClick={() => {
                const currentZoom = graphRef?.current?.zoom?.() || 1;
                graphRef?.current?.zoom?.(Math.min(currentZoom * 1.2, 8), 250);
              }}
              className="w-10 h-10 rounded-lg bg-slate-900/90 border border-slate-600 text-white hover:bg-slate-800 transition flex items-center justify-center"
              title="Phóng to"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => {
                const currentZoom = graphRef?.current?.zoom?.() || 1;
                graphRef?.current?.zoom?.(Math.max(currentZoom / 1.2, 0.25), 250);
              }}
              className="w-10 h-10 rounded-lg bg-slate-900/90 border border-slate-600 text-white hover:bg-slate-800 transition flex items-center justify-center"
              title="Thu nhỏ"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={() => graphRef?.current?.zoomToFit?.(400, 70)}
              className="w-10 h-10 rounded-lg bg-slate-900/90 border border-slate-600 text-white hover:bg-slate-800 transition flex items-center justify-center"
              title="Đặt lại"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 text-xs text-slate-300 bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-1.5 pointer-events-none">
            Kéo để di chuyển • Cuộn để thu phóng
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <BrainCircuit size={200} />
        </div>
      )}
    </div>
  );
}