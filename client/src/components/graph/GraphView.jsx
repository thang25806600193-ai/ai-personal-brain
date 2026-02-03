import React, { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { BrainCircuit } from 'lucide-react';

export default function GraphView({
  selectedSubject,
  graphData,
  graphRef,
  selectedNode,
  onNodeClick,
}) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

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
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={size.width}
          height={size.height}
          nodeLabel={() => ''}
          nodeColor={node => node.color}
          nodeRelSize={8}
          linkColor={() => 'rgba(255,255,255,0.1)'}
          backgroundColor="#020617"
          onNodeClick={onNodeClick}
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

            ctx.font = `${fontSize}px Sans-Serif`;
            while (ctx.measureText(label).width > maxWidth && fontSize > 8 / globalScale) {
              fontSize -= 1 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
            }

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
  );
}