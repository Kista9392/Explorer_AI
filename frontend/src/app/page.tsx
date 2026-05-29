'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { 
  Search, 
  Compass, 
  History, 
  Save, 
  Network, 
  ChevronRight, 
  Cpu, 
  Loader2, 
  X, 
  Bookmark, 
  ChevronLeft, 
  Sparkles,
  RefreshCw,
  GitCommit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

import { CustomNode } from '@/components/CustomNode';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7860';

export default function ExplorerPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  
  // Custom Path History States
  const [savedPaths, setSavedPaths] = useState<any[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [pathTitle, setPathTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Register Custom Node Types for React Flow
  const nodeTypes = useMemo(() => ({
    custom: CustomNode
  }), []);

  // Fetch saved path journeys on mount
  useEffect(() => {
    fetchSavedPaths();
  }, []);

  const fetchSavedPaths = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/v1/explore/paths`);
      setSavedPaths(res.data || []);
    } catch (err) {
      console.error('Failed to load explorer paths', err);
    }
  };

  // Perform Initial Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || isLoading) return;

    setIsLoading(true);
    setSelectedNode(null);
    try {
      const res = await axios.post(`${API_BASE}/api/v1/explore/search`, {
        query: searchQuery.trim()
      });
      
      const { nodes: returnedNodes, edges: returnedEdges } = res.data;

      // Map returned nodes to React Flow custom node structure
      const mappedNodes = returnedNodes.map((n: any) => ({
        id: n.id,
        type: 'custom',
        data: {
          label: n.label,
          summary: n.summary,
          isExpanded: false,
          onExpand: handleExpandNode
        },
        position: { x: n.x, y: n.y }
      }));

      // Map returned edges to React Flow edge structure
      const mappedEdges = returnedEdges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: 'default',
        animated: true
      }));

      setNodes(mappedNodes);
      setEdges(mappedEdges);
    } catch (err) {
      console.error('Search exploration failed', err);
      alert('Failed to explore this topic. Please ensure the backend server is running and the Gemini API Key is valid.');
    } finally {
      setIsLoading(false);
    }
  };

  // Expand Node Handler (Called when user clicks + inside a Node)
  const handleExpandNode = useCallback(async (nodeId: string, nodeLabel: string) => {
    // 1. Locate the clicked parent node coordinates
    let parentX = 0;
    let parentY = 0;

    setNodes((prevNodes) => {
      const found = prevNodes.find(n => n.id === nodeId);
      if (found) {
        parentX = found.position.x;
        parentY = found.position.y;
      }
      // Instantly mark parent node as expanded to show loading ping indicator
      return prevNodes.map(n => n.id === nodeId ? {
        ...n,
        data: { ...n.data, isExpanded: true }
      } : n);
    });

    try {
      // Call expand endpoint on backend with coordinates
      const res = await axios.post(`${API_BASE}/api/v1/explore/expand`, {
        concept: nodeLabel,
        x: parentX,
        y: parentY
      });

      const { nodes: returnedNodes, edges: returnedEdges } = res.data;

      // Map expanded nodes
      const newNodes = returnedNodes.map((n: any) => ({
        id: n.id,
        type: 'custom',
        data: {
          label: n.label,
          summary: n.summary,
          isExpanded: false,
          onExpand: handleExpandNode
        },
        position: { x: n.x, y: n.y }
      }));

      // Map expanded edges
      const newEdges = returnedEdges.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: 'default',
        animated: true
      }));

      // Merge nodes ensuring no duplicate overlays
      setNodes((prevNodes) => {
        const merged = [...prevNodes];
        newNodes.forEach((node: any) => {
          if (!merged.some(n => n.id === node.id)) {
            merged.push(node);
          }
        });
        return merged;
      });

      // Merge edges ensuring uniqueness
      setEdges((prevEdges) => {
        const merged = [...prevEdges];
        newEdges.forEach((edge: any) => {
          if (!merged.some(e => e.id === edge.id)) {
            merged.push(edge);
          }
        });
        return merged;
      });
    } catch (err) {
      console.error('Failed to expand concept node', err);
      // Reset expansion loading indicator on failure
      setNodes((prevNodes) => prevNodes.map(n => n.id === nodeId ? {
        ...n,
        data: { ...n.data, isExpanded: false }
      } : n));
    }
  }, [setNodes, setEdges]);

  // Click handler when selecting any node in React Flow
  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node);
  }, []);

  // Save Current Exploration Journey Path
  const handleSavePath = async () => {
    if (!pathTitle.trim() || nodes.length === 0 || isSaving) return;

    setIsSaving(true);
    try {
      const pathPayload = {
        title: pathTitle.trim(),
        pathData: JSON.stringify({ nodes, edges })
      };
      await axios.post(`${API_BASE}/api/v1/explore/paths`, pathPayload);
      setPathTitle('');
      await fetchSavedPaths();
    } catch (err) {
      console.error('Failed to save exploration path', err);
      alert('Failed to save path.');
    } finally {
      setIsSaving(false);
    }
  };

  // Load Saved Pathway onto Canvas
  const loadSavedPath = (path: any) => {
    try {
      const parsed = JSON.parse(path.pathData);
      
      // Re-map nodes to bind the expand callback function dynamically!
      const mappedNodes = (parsed.nodes || []).map((n: any) => ({
        ...n,
        data: {
          ...n.data,
          onExpand: handleExpandNode
        }
      }));

      setNodes(mappedNodes);
      setEdges(parsed.edges || []);
      setSelectedNode(null);
      setShowHistoryDrawer(false);
    } catch (err) {
      console.error('Failed to parse path data', err);
      alert('Corrupted path data.');
    }
  };

  return (
    <div className="w-screen h-screen relative bg-zinc-950 text-white overflow-hidden futuristic-grid">
      
      {/* Sci-Fi Glow Particles Overlay */}
      <div className="absolute inset-0 bg-radial-gradient from-teal-500/5 via-transparent to-transparent pointer-events-none -z-10" />

      {/* TOP FLOATING SEARCH BAR */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4">
        <form onSubmit={handleSearch} className="relative flex items-center shadow-2xl shadow-black/80 rounded-full border border-white/10 bg-zinc-950/70 backdrop-blur-xl px-4 py-3 group focus-within:border-teal-500/50 transition-all duration-300">
          <Search className="w-5 h-5 text-zinc-400 group-focus-within:text-teal-400 transition-colors mr-3" />
          <input
            type="text"
            placeholder="Search an idea (e.g. Black Holes, Stoicism, Simulation Theory)..."
            className="w-full bg-transparent border-none text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
          />
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-teal-400 animate-spin flex-shrink-0" />
          ) : (
            <button
              type="submit"
              className="px-4 py-1.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white rounded-full font-bold text-xs shadow-md shadow-teal-500/10 cursor-pointer active:scale-95 transition-all whitespace-nowrap"
            >
              Explore
            </button>
          )}
        </form>
      </div>

      {/* LEFT HISTORY SIDEBAR TOGGLE BUTTON */}
      <button
        onClick={() => setShowHistoryDrawer(true)}
        className="absolute top-6 left-6 z-20 p-3 bg-zinc-900/60 border border-white/10 hover:border-teal-500/40 rounded-2xl shadow-xl hover:bg-zinc-800/80 cursor-pointer transition-all duration-200"
        title="Path History"
      >
        <History className="w-5 h-5 text-zinc-400 hover:text-teal-400" />
      </button>

      {/* MAIN REACT FLOW GRAPH CANVAS */}
      <div className="w-full h-full relative z-10">
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto z-10 pointer-events-none">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-3xl mb-4"
            >
              <Compass className="w-12 h-12 text-teal-400 animate-spin-slow glow-text-teal" />
            </motion.div>
            <h2 className="text-xl font-black text-white glow-text-teal mb-2 tracking-tight">Explorer AI</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Enter any event, philosopher, scientific breakthrough, or abstract theory at the top to discover its visual universe and travel infinitely down the rabbit hole.
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes as any}
            onNodeClick={onNodeClick}
            fitView
            colorMode="dark"
            minZoom={0.2}
            maxZoom={2.0}
          >
            <Background color="#ffffff" gap={20} size={1} variant={BackgroundVariant.Dots} className="opacity-15" />
            <Controls className="!bg-zinc-950 !border-white/10 !rounded-xl !p-1 shadow-2xl !z-20" />
            <MiniMap 
              nodeColor="#18181b" 
              nodeStrokeColor="#27272a" 
              maskColor="rgba(9, 9, 11, 0.7)"
              className="!bg-zinc-950 !border-white/10 !rounded-xl shadow-2xl !z-20 !right-6 !bottom-6" 
            />
          </ReactFlow>
        )}
      </div>

      {/* LEFT EXPLORATION HISTORY PATHS DRAWER */}
      <AnimatePresence>
        {showHistoryDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryDrawer(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-80 bg-zinc-950/80 backdrop-blur-2xl border-r border-white/10 shadow-2xl z-40 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-white text-base tracking-tight flex items-center gap-2">
                  <Compass className="w-5 h-5 text-teal-400 animate-pulse" />
                  Your Journeys
                </h3>
                <button
                  onClick={() => setShowHistoryDrawer(false)}
                  className="p-1.5 hover:bg-zinc-900 border border-transparent hover:border-white/10 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SAVE CURRENT JOURNEY MODULE */}
              {nodes.length > 0 && (
                <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 mb-6">
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-2 flex items-center gap-1">
                    <Save className="w-3.5 h-3.5 text-teal-400" />
                    Save Active Path
                  </p>
                  <input
                    type="text"
                    placeholder="Journey name (e.g. Relativity path)..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 mb-3"
                    value={pathTitle}
                    onChange={(e) => setPathTitle(e.target.value)}
                  />
                  <button
                    onClick={handleSavePath}
                    disabled={!pathTitle.trim() || isSaving}
                    className="w-full py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md disabled:opacity-40"
                  >
                    {isSaving ? 'Saving Journey...' : 'Save Path'}
                  </button>
                </div>
              )}

              {/* SAVED JOURNEYS LIST */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Saved Explorations</p>
                {savedPaths.length === 0 ? (
                  <p className="text-zinc-500 text-xs italic p-4 text-center">No journeys saved yet.</p>
                ) : (
                  savedPaths.map((path) => (
                    <div
                      key={path.id}
                      onClick={() => loadSavedPath(path)}
                      className="p-3.5 rounded-xl border border-white/5 hover:border-teal-500/20 bg-zinc-900/30 hover:bg-zinc-900/60 cursor-pointer flex items-center justify-between group transition-all"
                    >
                      <div className="overflow-hidden mr-2">
                        <h4 className="font-bold text-xs text-white group-hover:text-teal-400 transition-colors truncate">{path.title}</h4>
                        <p className="text-[9px] text-zinc-500 mt-0.5">Created: {new Date(path.createdAt).toLocaleDateString()}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-teal-400 transition-colors" />
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* RIGHT NODE DETAILS DRAWER PANEL */}
      <AnimatePresence>
        {selectedNode && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNode(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm z-30"
            />
            {/* Details Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-96 bg-zinc-950/80 backdrop-blur-2xl border-l border-white/10 shadow-2xl z-40 p-8 flex flex-col overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                  Intelligent Summary
                </span>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1.5 hover:bg-zinc-900 border border-transparent hover:border-white/10 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title Concept Header */}
              <h2 className="text-2xl font-black text-white glow-text-teal tracking-tight mb-4">{selectedNode.data.label}</h2>
              
              {/* Detailed Summary description */}
              <div className="p-5 rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur-md mb-6 shadow-xl relative overflow-hidden leading-relaxed text-sm text-zinc-300">
                {/* Decorative glow lines */}
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-500 to-indigo-600" />
                {selectedNode.data.summary}
              </div>

              {/* EXPLORE TIMELINE / ADDITIONAL NOTES */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Curiosity timeline
                </p>
                <div className="space-y-3.5 relative pl-4 border-l border-white/10">
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-teal-400 ring-4 ring-teal-400/20" />
                    <h4 className="text-xs font-bold text-white">Historical Context</h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Emerged as a major intellectual connection in academic and experimental scientific literature, altering classic conceptual models.</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" />
                    <h4 className="text-xs font-bold text-white">Real-world Impact</h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Drives modern research architectures, technological frameworks, and fundamental philosophical perspectives on consciousness and nature.</p>
                  </div>
                </div>
              </div>

              {/* BUTTON TO EXPAND PATH FROM DRAWER */}
              {!selectedNode.data.isExpanded && (
                <button
                  onClick={() => {
                    handleExpandNode(selectedNode.id, selectedNode.data.label);
                    // Update state inside sidebar dynamically
                    setSelectedNode((prev: any) => ({
                      ...prev,
                      data: { ...prev.data, isExpanded: true }
                    }));
                  }}
                  className="w-full mt-auto py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-lg shadow-teal-500/5 flex items-center justify-center gap-2"
                >
                  <Network className="w-4 h-4 text-white" />
                  Expand Connected Branches
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
