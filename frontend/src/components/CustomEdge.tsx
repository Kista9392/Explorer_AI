import React, { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { GitCommit, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
}: EdgeProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Sleek, glowing edge line */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isHovered ? '#2dd4bf' : 'rgba(255, 255, 255, 0.15)',
          strokeWidth: isHovered ? 2.5 : 1.5,
          transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
        }}
      />
      
      {/* Transparent thick line for easier hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={15}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan select-none z-30"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Elegant Circular Relationship Badge */}
          <div
            className={cn(
              "w-6 h-6 rounded-full bg-zinc-950/90 border flex items-center justify-center shadow-lg transition-all duration-300 cursor-help relative group",
              isHovered 
                ? "border-teal-400/80 shadow-teal-500/20 text-teal-400 scale-110" 
                : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300"
            )}
          >
            <GitCommit className="w-3.5 h-3.5" />

            {/* Glowing Aura ring when hovered */}
            {isHovered && (
              <span className="absolute inset-0 rounded-full border border-teal-400/30 animate-ping opacity-60 pointer-events-none" />
            )}
          </div>

          {/* Gorgeous glassmorphic hover tooltip for the full relationship detail */}
          <div
            className={cn(
              "absolute bottom-8 left-1/2 -translate-x-1/2 w-64 p-3.5 rounded-xl border bg-zinc-950/95 backdrop-blur-xl shadow-2xl transition-all duration-300 pointer-events-none z-50 text-left",
              isHovered
                ? "opacity-100 translate-y-0 scale-100 visibility-visible"
                : "opacity-0 translate-y-2 scale-95 visibility-hidden"
            )}
          >
            {/* Header Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl bg-gradient-to-r from-teal-500 via-emerald-400 to-indigo-600" />
            
            <p className="text-[9px] font-black text-teal-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-teal-400" />
              Connected Relationship
            </p>
            
            <p className="text-[11px] leading-relaxed text-zinc-300 font-medium">
              {label || "Explore the connection between these two conceptual nodes."}
            </p>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
