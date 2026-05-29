import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Network, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CustomNodeData = {
  label: string;
  summary: string;
  isExpanded?: boolean;
  onExpand?: (id: string, label: string) => void;
};

export const CustomNode = memo(({ id, data, selected }: any) => {
  const nodeData = data as CustomNodeData;

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-2xl border text-left glass-panel transition-all duration-300 w-60 relative group shadow-lg",
        selected
          ? "border-teal-400 ring-2 ring-teal-400/20 shadow-teal-500/10"
          : "border-white/10 hover:border-white/20 hover:shadow-indigo-500/5 hover:-translate-y-0.5"
      )}
    >
      {/* Glow highlight effects */}
      <div 
        className={cn(
          "absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none blur-sm -z-10 bg-gradient-to-r",
          selected ? "from-teal-500/20 to-indigo-500/20" : "from-zinc-800/10 to-zinc-700/10"
        )} 
      />

      {/* Target handle on top */}
      <Handle
        type="target"
        position={Position.Top}
        className="!border-zinc-700 !bg-zinc-950 !w-2 !h-2"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5 flex items-center gap-1">
            <Network className="w-3 h-3 text-teal-400 animate-pulse" />
            Concept Node
          </p>
          <h4 className="font-bold text-sm text-white truncate">{nodeData.label}</h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed truncate mt-1">{nodeData.summary}</p>
        </div>

        {/* Expand Branch Button */}
        {nodeData.onExpand && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onExpand?.(id, nodeData.label);
            }}
            className={cn(
              "p-1.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-teal-500/40 hover:bg-teal-500/5 transition-all self-center cursor-pointer",
              nodeData.isExpanded && "bg-teal-500/10 text-teal-400 border-teal-500/20 pointer-events-none"
            )}
            title={nodeData.isExpanded ? "Expanded" : "Expand Path"}
          >
            {nodeData.isExpanded ? (
              <span className="w-3.5 h-3.5 block rounded-full border-2 border-teal-400/80 animate-ping" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Source handle on bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!border-zinc-700 !bg-zinc-950 !w-2 !h-2"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
