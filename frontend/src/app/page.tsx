'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  GitCommit,
  MessageSquare,
  Send,
  Play,
  Video,
  LogIn,
  LogOut,
  User,
  Shield,
  Globe,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

import { CustomNode } from '@/components/CustomNode';
import { CustomEdge } from '@/components/CustomEdge';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7860';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

// Extend the Window type to include google GSI
declare global {
  interface Window {
    google?: any;
  }
}

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

  // Conversational AI Chat Assistant States
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([
    { sender: 'assistant', text: 'Greetings, fellow explorer! I am your Explorer AI Assistant. Select any node on the knowledge graph to give me context, or ask me any conceptual query directly!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // YouTube Educational Videos States
  const [videos, setVideos] = useState<any[]>([]);
  const [isVideosLoading, setIsVideosLoading] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  // Regulatory Safety Block States
  const [safetyBlock, setSafetyBlock] = useState<any | null>(null);

  // Dynamic Detailed Concept Profile States
  const [selectedConceptProfile, setSelectedConceptProfile] = useState<any | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Google OAuth Authentication States
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Saved Chat Sessions & Stats States
  const [savedChats, setSavedChats] = useState<any[]>([]);
  const [isSavingChat, setIsSavingChat] = useState(false);
  const [profileStats, setProfileStats] = useState<any | null>(null);
  const [showStatsCard, setShowStatsCard] = useState(false);

  // Register Custom Node Types for React Flow
  const nodeTypes = useMemo(() => ({
    custom: CustomNode
  }), []);

  // Register Custom Edge Types for React Flow
  const edgeTypes = useMemo(() => ({
    custom: CustomEdge
  }), []);

  // Build auth headers helper
  const getAuthHeaders = useCallback(() => {
    if (!authToken) return {};
    return { Authorization: `Bearer ${authToken}` };
  }, [authToken]);

  // Google Sign-In callback handler
  const handleGoogleCallback = useCallback(async (response: any) => {
    const idToken = response.credential;
    if (!idToken) return;

    try {
      const res = await axios.post(`${API_BASE}/api/v1/auth/google`, { idToken });
      const userData = res.data;
      setAuthUser(userData);
      setAuthToken(idToken);
      localStorage.setItem('explorer_token', idToken);
      localStorage.setItem('explorer_user', JSON.stringify(userData));
    } catch (err) {
      console.error('Google auth failed', err);
    }
  }, []);

  // Sign out handler
  const handleSignOut = useCallback(() => {
    setAuthUser(null);
    setAuthToken(null);
    setShowProfileMenu(false);
    localStorage.removeItem('explorer_token');
    localStorage.removeItem('explorer_user');
    // Re-render Google button after sign out
    setTimeout(() => renderGoogleButton(), 300);
  }, []);

  // Render the native Google Sign-In button
  const renderGoogleButton = useCallback(() => {
    if (!window.google || !googleBtnRef.current || !GOOGLE_CLIENT_ID) return;
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'icon',
        shape: 'circle',
        theme: 'filled_black',
        size: 'large',
      });
    } catch (e) {
      console.error('Failed to render Google button', e);
    }
  }, [handleGoogleCallback]);

  // Restore cached session & initialize Google button
  useEffect(() => {
    // Try to restore cached session
    const cachedToken = localStorage.getItem('explorer_token');
    const cachedUser = localStorage.getItem('explorer_user');
    if (cachedToken && cachedUser) {
      try {
        setAuthUser(JSON.parse(cachedUser));
        setAuthToken(cachedToken);
      } catch { /* ignore corrupt cache */ }
    }

    // Wait for Google script to load, then render button
    const interval = setInterval(() => {
      if (window.google) {
        clearInterval(interval);
        renderGoogleButton();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [renderGoogleButton]);

  // Re-render the Google button when user logs out
  useEffect(() => {
    if (!authUser) {
      renderGoogleButton();
    }
  }, [authUser, renderGoogleButton]);

  // Fetch saved paths, saved chats, and profile stats on mount and when auth changes
  useEffect(() => {
    fetchSavedPaths();
    fetchSavedChats();
    fetchProfileStats();
  }, [authToken]);

  const fetchSavedPaths = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/v1/explore/paths`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      setSavedPaths(res.data || []);
    } catch (err) {
      console.error('Failed to load explorer paths', err);
    }
  };

  const fetchSavedChats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/v1/explore/chats`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      setSavedChats(res.data || []);
    } catch (err) {
      console.error('Failed to load saved chats', err);
    }
  };

  const fetchProfileStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/v1/explore/profile/stats`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      setProfileStats(res.data || null);
    } catch (err) {
      console.error('Failed to load profile stats', err);
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
        type: 'custom',
        animated: true
      }));

      setNodes(mappedNodes);
      setEdges(mappedEdges);
    } catch (err: any) {
      if (err.response?.data?.error === 'SafetyViolation') {
        setSafetyBlock(err.response.data);
      } else {
        console.error('Search exploration failed', err);
        alert('Failed to explore this topic. Please ensure the backend server is running and the Gemini API Key is valid.');
      }
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
        type: 'custom',
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
    } catch (err: any) {
      if (err.response?.data?.error === 'SafetyViolation') {
        setSafetyBlock(err.response.data);
      } else {
        console.error('Failed to expand concept node', err);
      }
      // Reset expansion loading indicator on failure
      setNodes((prevNodes) => prevNodes.map(n => n.id === nodeId ? {
        ...n,
        data: { ...n.data, isExpanded: false }
      } : n));
    }
  }, [setNodes, setEdges]);

  // Click handler when selecting any node in React Flow
  const onNodeClick = useCallback(async (_: any, node: any) => {
    setSelectedNode(node);
    setSelectedConceptProfile(null);
    setIsProfileLoading(true);

    try {
      const res = await axios.get(`${API_BASE}/api/v1/explore/concept?name=${encodeURIComponent(node.data.label)}`);
      setSelectedConceptProfile(res.data);
    } catch (err) {
      console.error('Failed to fetch detailed concept profile', err);
      // Fallback locally using whatever exists in node data
      setSelectedConceptProfile({
        name: node.data.label,
        summary: node.data.summary,
        historicalContext: "Historically, this concept evolved as a key pillar in its scientific field, driving major academic transitions.",
        realWorldImpact: "In the real world, this concept acts as a catalyst for advanced technological systems and research frameworks.",
        academicSignificance: "Academically, this node holds major educational significance, clarifying critical interdisciplinary ideas.",
        funFact: "This node represents a fascinating milestone on your visual curiosity map!"
      });
    } finally {
      setIsProfileLoading(false);
    }
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
      await axios.post(`${API_BASE}/api/v1/explore/paths`, pathPayload, {
        headers: getAuthHeaders()
      });
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

      // Re-map edges to use custom type dynamically
      const mappedEdges = (parsed.edges || []).map((e: any) => ({
        ...e,
        type: 'custom'
      }));

      setNodes(mappedNodes);
      setEdges(mappedEdges);
      setSelectedNode(null);
      setShowHistoryDrawer(false);
    } catch (err) {
      console.error('Failed to parse path data', err);
      alert('Corrupted path data.');
    }
  };

  // Save Current Chat Session
  const handleSaveChat = async () => {
    if (chatMessages.length <= 1 || isSavingChat) return;
    setIsSavingChat(true);
    try {
      const firstUserMsg = chatMessages.find(m => m.sender === 'user')?.text || 'AI Exploration Chat';
      const defaultTitle = firstUserMsg.length > 30 ? firstUserMsg.substring(0, 27) + '...' : firstUserMsg;
      const payload = { title: defaultTitle, chatData: JSON.stringify(chatMessages) };
      await axios.post(`${API_BASE}/api/v1/explore/chats`, payload, {
        headers: getAuthHeaders()
      });
      alert(`Chat session saved successfully!`);
      await fetchSavedChats();
      await fetchProfileStats();
    } catch (err) {
      console.error('Failed to save chat session', err);
      alert('Failed to save chat session.');
    } finally {
      setIsSavingChat(false);
    }
  };

  // Load Saved Chat Session
  const loadSavedChat = (chat: any) => {
    try {
      setChatMessages(JSON.parse(chat.chatData));
      setShowChat(true);
      setShowHistoryDrawer(false);
    } catch (err) {
      console.error('Failed to restore chat data', err);
      alert('Corrupted chat history.');
    }
  };

  // Scroll to bottom of chat whenever messages list updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, showChat]);

  const handleSendChatMessage = async (textToSend?: string) => {
    const rawText = textToSend || chatInput;
    if (!rawText.trim() || isChatLoading) return;

    const userMessage = { sender: 'user', text: rawText.trim() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    const queryTopic = selectedNode ? selectedNode.data.label : rawText.trim();

    try {
      // 1. Call Gemini Chat API
      const chatPromise = axios.post(`${API_BASE}/api/v1/explore/chat`, {
        message: rawText.trim(),
        conceptContext: selectedNode ? selectedNode.data.label : ''
      });

      // 2. Call YouTube search API in parallel
      const videosPromise = axios.get(`${API_BASE}/api/v1/explore/videos`, {
        params: { query: queryTopic }
      });

      const [chatRes, videosRes] = await Promise.all([chatPromise, videosPromise]);

      const assistantText = chatRes.data?.response || 'I am sorry, my analytical buffers encountered an anomaly. Please try again.';
      const fetchedVideos = videosRes.data || [];

      setChatMessages(prev => [...prev, { sender: 'assistant', text: assistantText, videos: fetchedVideos }]);
    } catch (err: any) {
      if (err.response?.data?.error === 'SafetyViolation') {
        setSafetyBlock(err.response.data);
      } else {
        console.error('Failed to chat with AI assistant', err);
        setChatMessages(prev => [...prev, { sender: 'assistant', text: 'Communication array offline. Please ensure the backend server is running and the Gemini API key is valid.' }]);
      }
    } finally {
      setIsChatLoading(false);
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

      {/* TOP-LEFT AUTH WIDGET: Google Sign-In / Profile Pill with nested Logout */}
      <div className="absolute top-6 left-6 z-20 animate-fade-in">
        {authUser ? (
          <div 
            onMouseEnter={() => setShowStatsCard(true)}
            onMouseLeave={() => setShowStatsCard(false)}
            className="relative"
          >
            {/* Profile Badge Pill */}
            <div className="flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-2xl border border-white/10 shadow-lg shadow-black/40 relative cursor-pointer select-none">
              {/* Glowing Indigo/Teal Aura avatar ring */}
              <div className="relative w-8 h-8 rounded-full group">
                <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 opacity-60 blur-sm group-hover:opacity-90 animate-pulse transition-opacity" />
                <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-teal-500 opacity-70" />
                {authUser.pictureUrl ? (
                  <img
                    src={authUser.pictureUrl}
                    alt={authUser.name}
                    className="relative w-full h-full rounded-full object-cover border border-zinc-950"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="relative w-full h-full rounded-full bg-zinc-900 border border-zinc-950 flex items-center justify-center text-xs font-black text-teal-400">
                    {authUser.name?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
                {/* Online status dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-zinc-950" />
              </div>

              {/* User details */}
              <div className="flex flex-col text-left max-w-[100px] overflow-hidden">
                <span className="text-[8px] font-black text-teal-400 uppercase tracking-widest leading-none mb-0.5">Explorer</span>
                <span className="text-xs font-bold text-white truncate leading-none">{authUser.name.split(' ')[0]}</span>
              </div>
            </div>

            {/* Account Stats Dropdown Hover Card */}
            <AnimatePresence>
              {showStatsCard && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-14 left-0 w-64 p-4 rounded-2xl bg-zinc-950/90 backdrop-blur-3xl border border-white/10 shadow-2xl z-50 flex flex-col space-y-3"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest leading-none mb-1">Account Stats</span>
                    <span className="text-xs font-bold text-white leading-none truncate">{authUser.name}</span>
                    <span className="text-[9px] text-zinc-500 mt-1 truncate">{authUser.email}</span>
                  </div>
                  
                  <hr className="border-white/10" />
                  
                  <div className="grid grid-cols-1 gap-2 text-[11px]">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/40 border border-white/5">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-teal-400" />
                        Saved Pathways
                      </span>
                      <span className="font-bold text-white font-mono">{profileStats?.savedPaths ?? 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/40 border border-white/5">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        AI Chats
                      </span>
                      <span className="font-bold text-white font-mono">{profileStats?.savedChats ?? 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/40 border border-white/5">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Network className="w-3.5 h-3.5 text-emerald-400" />
                        Knowledge Nodes
                      </span>
                      <span className="font-bold text-white font-mono">{profileStats?.discoveredNodes ?? 0}</span>
                    </div>
                  </div>

                  <hr className="border-white/10" />

                  <button
                    onClick={handleSignOut}
                    className="w-full py-2 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-xl text-xs font-bold text-red-400 cursor-pointer transition-all duration-200"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Google Sign-In Button Container (Unmounted when logged in) */
          <div
            ref={googleBtnRef}
            className="rounded-full overflow-hidden shadow-xl shadow-black/40 border border-white/10 hover:border-teal-500/30 transition-all"
            title="Sign in with Google"
          />
        )}
      </div>

      {/* TOP-RIGHT HISTORY SIDEBAR TOGGLE BUTTON */}
      <button
        onClick={() => setShowHistoryDrawer(true)}
        className="absolute top-6 right-6 z-20 p-3 bg-zinc-900/60 border border-white/10 hover:border-teal-500/40 rounded-2xl shadow-xl hover:bg-zinc-800/80 cursor-pointer transition-all duration-200"
        title="Path History"
      >
        <History className="w-5 h-5 text-zinc-400 hover:text-teal-400" />
      </button>

      {/* MAIN REACT FLOW GRAPH CANVAS */}
      <div className="w-full h-full relative z-10">
        {/* Futuristic glowing backdrop orbs for visual depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.05),rgba(99,102,241,0.05)_40%,transparent_75%)] pointer-events-none z-0 animate-pulse duration-[8000ms]" />

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
            edgeTypes={edgeTypes as any}
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

              {/* SAVED EXPLORATIONS & CHATS SECTIONS */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-6">
                {/* Explorations Section */}
                <div>
                  <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 select-none">
                    <Compass className="w-3.5 h-3.5" />
                    Explorations ({savedPaths.length})
                  </p>
                  <div className="space-y-2">
                    {savedPaths.length === 0 ? (
                      <p className="text-zinc-500 text-[11px] italic p-3 text-center rounded-xl border border-white/5 bg-zinc-900/10 select-none">No journeys saved yet.</p>
                    ) : (
                      savedPaths.map((path) => (
                        <div
                          key={path.id}
                          onClick={() => loadSavedPath(path)}
                          className="p-3 rounded-xl border border-white/5 hover:border-teal-500/20 bg-zinc-900/30 hover:bg-zinc-900/60 cursor-pointer flex items-center justify-between group transition-all"
                        >
                          <div className="overflow-hidden mr-2 text-left">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <h4 className="font-bold text-xs text-white group-hover:text-teal-400 transition-colors truncate">{path.title}</h4>
                              {path.user ? (
                                <span className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[7px] font-black text-indigo-400 uppercase tracking-wider">
                                  <Lock className="w-2 h-2" /> Personal
                                </span>
                              ) : (
                                <span className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-800 border border-white/5 rounded-full text-[7px] font-black text-zinc-500 uppercase tracking-wider">
                                  <Globe className="w-2 h-2" /> Public
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-zinc-500 mt-0.5">Created: {new Date(path.createdAt).toLocaleDateString()}</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-teal-400 transition-colors flex-shrink-0" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* AI Chats Section */}
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 select-none">
                    <MessageSquare className="w-3.5 h-3.5" />
                    AI Chats ({savedChats.length})
                  </p>
                  <div className="space-y-2">
                    {savedChats.length === 0 ? (
                      <p className="text-zinc-500 text-[11px] italic p-3 text-center rounded-xl border border-white/5 bg-zinc-900/10 select-none">No chats saved yet.</p>
                    ) : (
                      savedChats.map((chat) => (
                        <div
                          key={chat.id}
                          onClick={() => loadSavedChat(chat)}
                          className="p-3 rounded-xl border border-white/5 hover:border-indigo-500/20 bg-zinc-900/30 hover:bg-zinc-900/60 cursor-pointer flex items-center justify-between group transition-all"
                        >
                          <div className="overflow-hidden mr-2 text-left">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <h4 className="font-bold text-xs text-white group-hover:text-indigo-400 transition-colors truncate">{chat.title}</h4>
                              {chat.user ? (
                                <span className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[7px] font-black text-indigo-400 uppercase tracking-wider">
                                  <Lock className="w-2 h-2" /> Personal
                                </span>
                              ) : (
                                <span className="flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-800 border border-white/5 rounded-full text-[7px] font-black text-zinc-500 uppercase tracking-wider">
                                  <Globe className="w-2 h-2" /> Public
                                </span>
                              )}
                            </div>
                            <p className="text-[9px] text-zinc-500 mt-0.5">Created: {new Date(chat.createdAt).toLocaleDateString()}</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
              
              {isProfileLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                  <Loader2 className="w-8 h-8 text-teal-400 animate-spin glow-text-teal" />
                  <p className="text-xs text-zinc-500 italic animate-pulse text-center">Consulting Gemini for detailed conceptual profile...</p>
                </div>
              ) : selectedConceptProfile ? (
                <>
                  {/* Detailed Summary description */}
                  <div className="p-5 rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur-md mb-6 shadow-xl relative overflow-hidden leading-relaxed text-sm text-zinc-300 animate-fade-in">
                    {/* Decorative glow lines */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-500 to-indigo-600" />
                    {selectedConceptProfile.summary}
                  </div>

                  {/* EXPLORE TIMELINE / ADDITIONAL NOTES */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      Curiosity timeline
                    </p>
                    <div className="space-y-3.5 relative pl-4 border-l border-white/10">
                      <div className="relative">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-teal-400 ring-4 ring-teal-400/20" />
                        <h4 className="text-xs font-bold text-white">Historical Context</h4>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{selectedConceptProfile.historicalContext}</p>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" />
                        <h4 className="text-xs font-bold text-white">Real-world Impact</h4>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{selectedConceptProfile.realWorldImpact}</p>
                      </div>
                      <div className="relative">
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                        <h4 className="text-xs font-bold text-white">Academic Significance</h4>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{selectedConceptProfile.academicSignificance}</p>
                      </div>
                    </div>
                  </div>

                  {/* FUN FACT GLOWING GOLDEN BOX */}
                  {selectedConceptProfile.funFact && (
                    <div className="mt-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 relative overflow-hidden text-xs text-amber-300 leading-relaxed shadow-lg">
                      <div className="absolute top-0 left-0 w-[3px] h-full bg-amber-400" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                        Did You Know?
                      </p>
                      "{selectedConceptProfile.funFact}"
                    </div>
                  )}
                </>
              ) : (
                <div className="p-5 rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur-md mb-6 shadow-xl relative overflow-hidden leading-relaxed text-sm text-zinc-300">
                  {/* Decorative glow lines */}
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-500 to-indigo-600" />
                  {selectedNode.data.summary}
                </div>
              )}

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

      {/* FLOATING AI ASSISTANT TRIGGER BUTTON */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="absolute bottom-28 right-6 z-20 p-4 bg-gradient-to-r from-teal-500 to-indigo-600 border border-white/10 hover:border-teal-400 rounded-full shadow-2xl hover:scale-105 active:scale-95 cursor-pointer group transition-all duration-200"
        title="AI Assistant Chat"
      >
        <MessageSquare className="w-6 h-6 text-white group-hover:animate-pulse" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-teal-400 border border-zinc-950 animate-ping" />
      </button>

      {/* FLOATING AI ASSISTANT CHAT CONTAINER */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="absolute bottom-6 right-6 w-96 h-[520px] bg-zinc-950/80 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-3xl z-40 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/40">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                </span>
                <div>
                  <h3 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    Explorer AI Assistant
                  </h3>
                  {selectedNode ? (
                    <p className="text-[10px] text-zinc-400 truncate flex items-center gap-1 mt-0.5 max-w-[200px]">
                      <Cpu className="w-3 h-3 text-teal-400" />
                      Context: {selectedNode.data.label}
                    </p>
                  ) : (
                    <p className="text-[9px] text-zinc-500 italic mt-0.5">Broad conceptual focus</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {chatMessages.length > 1 && (
                   <button
                     onClick={handleSaveChat}
                     disabled={isSavingChat}
                     className="p-1.5 hover:bg-zinc-900 border border-transparent hover:border-teal-500/35 rounded-lg text-zinc-400 hover:text-teal-400 cursor-pointer disabled:opacity-40"
                     title="Save Chat Session"
                   >
                     {isSavingChat ? (
                       <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                     ) : (
                       <Bookmark className="w-4 h-4" />
                     )}
                   </button>
                )}
                <button
                  onClick={() => setShowChat(false)}
                  className="p-1.5 hover:bg-zinc-900 border border-transparent hover:border-white/10 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3.5 flex flex-col"
            >
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex flex-col max-w-[85%] text-xs space-y-1.5",
                    msg.sender === 'user' 
                      ? "self-end items-end animate-fade-in-right" 
                      : "self-start items-start animate-fade-in-left"
                  )}
                >
                  {/* Chat Message Text Bubble */}
                  <div
                    className={cn(
                      "px-3.5 py-2.5 rounded-2xl leading-relaxed whitespace-pre-line border shadow-lg",
                      msg.sender === 'user'
                        ? "bg-teal-500/10 border-teal-500/20 text-white rounded-tr-none text-left"
                        : "bg-zinc-900/50 border-white/5 text-zinc-300 rounded-tl-none text-left"
                    )}
                  >
                    {msg.text}
                  </div>

                  {/* Attached Multimedia 'Watch & Learn' video cards */}
                  {msg.sender === 'assistant' && msg.videos && msg.videos.length > 0 && (
                    <div className="w-full mt-1 p-2 rounded-2xl bg-zinc-900/30 border border-white/5 flex flex-col space-y-1.5 shadow-inner">
                      <div className="flex items-center gap-1 text-[8px] font-black text-teal-400 uppercase tracking-widest px-1">
                        <Video className="w-3 h-3 text-teal-400" />
                        Explore Further (Videos)
                      </div>
                      
                      <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth max-w-[270px]">
                        {msg.videos.map((vid: any) => (
                          <div
                            key={vid.videoId}
                            onClick={() => setActiveVideoId(vid.videoId)}
                            className="flex-shrink-0 w-24 group/vid relative cursor-pointer overflow-hidden rounded-lg border border-white/5 hover:border-teal-500/40 bg-zinc-950 transition-all duration-200"
                            title={vid.title}
                          >
                            {/* Thumbnail Overlay */}
                            <div className="w-full h-12 relative overflow-hidden bg-zinc-900">
                              {vid.thumbnailUrl && (
                                <img
                                  src={vid.thumbnailUrl}
                                  alt={vid.title}
                                  className="w-full h-full object-cover group-hover/vid:scale-105 transition-transform duration-200"
                                />
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/vid:opacity-100 transition-opacity">
                                <Play className="w-3.5 h-3.5 text-teal-400 fill-teal-400" />
                              </div>
                            </div>
                            {/* Title text */}
                            <div className="p-1">
                              <p className="text-[7.5px] text-white font-bold leading-tight line-clamp-1 truncate group-hover/vid:text-teal-400 transition-colors">
                                {vid.title}
                              </p>
                              <p className="text-[7px] text-zinc-500 truncate mt-0.5">{vid.channelTitle}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Animation */}
              {isChatLoading && (
                <div className="flex items-center gap-2 self-start bg-zinc-900/40 border border-white/5 rounded-2xl rounded-tl-none px-3.5 py-2.5 text-xs text-zinc-400">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
                  </span>
                  AI is formulating...
                </div>
              )}
            </div>

            {/* Quick Suggestions presets */}
            <div className="px-4 py-2 border-t border-white/5 bg-zinc-900/20 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
              {selectedNode ? (
                <>
                  <button
                    onClick={() => handleSendChatMessage("Explain this concept like I'm 5 years old.")}
                    className="flex-shrink-0 px-2.5 py-1 bg-zinc-900 border border-white/5 hover:border-teal-500/30 text-[10px] text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    👶 Explain like I'm 5
                  </button>
                  <button
                    onClick={() => handleSendChatMessage("What are some historical contradictions or paradoxes associated with this?")}
                    className="flex-shrink-0 px-2.5 py-1 bg-zinc-900 border border-white/5 hover:border-teal-500/30 text-[10px] text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    🏛️ Core Paradoxes
                  </button>
                  <button
                    onClick={() => handleSendChatMessage("Give me a futuristic outlook and upcoming predictions for this field.")}
                    className="flex-shrink-0 px-2.5 py-1 bg-zinc-900 border border-white/5 hover:border-teal-500/30 text-[10px] text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    🔮 Future Predictions
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleSendChatMessage("Suggest 3 highly abstract, interesting conceptual topics for me to search!")}
                    className="flex-shrink-0 px-2.5 py-1 bg-zinc-900 border border-white/5 hover:border-teal-500/30 text-[10px] text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    🛸 Suggest search ideas
                  </button>
                  <button
                    onClick={() => handleSendChatMessage("What are the capabilities of the Explorer AI visual knowledge graph?")}
                    className="flex-shrink-0 px-2.5 py-1 bg-zinc-900 border border-white/5 hover:border-teal-500/30 text-[10px] text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    🛠️ How does this app work?
                  </button>
                </>
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="p-3 bg-zinc-900/60 border-t border-white/10 flex items-center gap-2"
            >
              <input
                type="text"
                placeholder={selectedNode ? `Ask about ${selectedNode.data.label}...` : "Ask a general question..."}
                className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-0"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatLoading}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isChatLoading}
                className="p-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 disabled:opacity-40 disabled:hover:from-teal-500 text-white rounded-xl cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN YOUTUBE EMBED VIDEO PLAYER MODAL */}
      <AnimatePresence>
        {activeVideoId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setActiveVideoId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-4xl bg-zinc-950 border border-teal-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-teal-500/10 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Close button */}
              <button
                onClick={() => setActiveVideoId(null)}
                className="absolute top-4 right-4 z-50 p-2.5 bg-black/60 border border-white/10 hover:border-red-500/40 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer transition-all"
                title="Close Player"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Responsive Iframe Aspect Ratio Player */}
              <div className="w-full aspect-video bg-black">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENTERPRISE REGULATORY SAFETY VIOLATION WARNING OVERLAY */}
      <AnimatePresence>
        {safetyBlock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-zinc-950/80 border border-red-500/40 rounded-3xl p-8 text-center shadow-2xl shadow-red-500/10 flex flex-col items-center"
            >
              {/* Decorative Warning Neon Beacon */}
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-full mb-6 animate-pulse">
                <span className="relative flex h-8 w-8 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative text-red-500 font-black text-xl font-mono">!</span>
                </span>
              </div>

              {/* Title Header */}
              <h2 className="text-xl font-black text-red-400 uppercase tracking-wider mb-2">
                Concept Restriction Blocked
              </h2>
              <span className="text-[10px] font-black bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-full uppercase tracking-widest mb-6">
                Policy: {safetyBlock.category}
              </span>

              {/* Details text */}
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mb-8 text-zinc-300">
                {safetyBlock.message}
              </p>

              {/* Specialized emergency card if category is Self-Harm */}
              {safetyBlock.category === 'Self-Harm & Suicide' && (
                <div className="w-full p-4 border border-teal-500/20 bg-teal-500/5 rounded-2xl mb-8 text-left relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-teal-500" />
                  <h4 className="text-xs font-bold text-teal-400 mb-1">Compassionate Support Available</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    You do not have to go through this alone. The Suicide & Crisis Lifeline provides free, confidential, 24/7 support. Call or text <strong className="text-teal-400 font-mono">988</strong> to connect immediately.
                  </p>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setSafetyBlock(null)}
                className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-700 hover:from-red-600 hover:to-rose-800 text-white rounded-full font-bold text-xs shadow-md shadow-red-500/10 cursor-pointer active:scale-95 transition-all"
              >
                Back to Safety
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
