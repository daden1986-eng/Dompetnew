
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

// Define types locally to avoid circular dependencies
type DeviceType = 'router' | 'switch' | 'server' | 'pc' | 'cloud' | 'ap' | 'olt' | 'firewall' | 'modem' | 'htb';
type ToolMode = 'select' | 'link' | 'pan' | DeviceType;

interface NetworkNode {
  id: string;
  type: DeviceType;
  x: number;
  y: number;
  name: string;
  ip: string;
  status: 'up' | 'down' | 'warning';
}

interface NetworkLink {
  id: string;
  source: string;
  target: string;
  label?: string;
  color?: string;
  width?: number;
}

interface ViewState {
    scale: number;
    x: number;
    y: number;
}

// Global declaration for SweetAlert2
declare const Swal: any;

// Storage Keys
const STORAGE_KEY_NODES = 'sidompet_topo_v3_nodes';
const STORAGE_KEY_LINKS = 'sidompet_topo_v3_links';
const STORAGE_KEY_BG = 'sidompet_topo_v3_bg';
const STORAGE_KEY_VIEW = 'sidompet_topo_v3_view';

// Utility to check localStorage
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__test_localStorage__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

// Icons Component Map
const Icons: Record<DeviceType, React.FC<{ className?: string }>> = {
  router: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="12" r="10" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 7l10 10M17 7l-10 10" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  switch: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="2" y="6" width="20" height="12" rx="2" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
      <path d="M6 10l3 4M9 10l-3 4M15 10l3 4M18 10l-3 4" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  server: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M4 4h16v16H4z" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
      <line x1="4" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="2"/>
      <line x1="4" y1="16" x2="20" y2="16" stroke="currentColor" strokeWidth="2"/>
      <circle cx="16" cy="7" r="1" fill="currentColor"/>
      <circle cx="16" cy="13" r="1" fill="currentColor"/>
      <circle cx="16" cy="19" r="1" fill="currentColor"/>
    </svg>
  ),
  pc: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M2 4h20v12H2z" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
      <path d="M8 16l-2 4h12l-2-4" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  cloud: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  ap: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
       <circle cx="12" cy="12" r="10" fillOpacity="0.1" stroke="currentColor" strokeWidth="2"/>
       <circle cx="12" cy="12" r="2" fill="currentColor"/>
       <path d="M12 6c3.31 0 6 2.69 6 6M6 12c0-3.31 2.69-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  olt: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="1" stroke="currentColor" strokeWidth="2" fillOpacity="0.2"/>
      <path d="M4 8h16M4 12h16M4 16h16" stroke="currentColor" strokeWidth="1"/>
      <rect x="6" y="6" width="2" height="12" fill="currentColor"/>
    </svg>
  ),
  firewall: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 7v10M8 11h8" stroke="currentColor" strokeWidth="2"/>
      </svg>
  ),
  modem: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="7" y="3" width="10" height="18" rx="2" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
      <path d="M10 21h4" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="7" r="1" fill="currentColor"/>
      <circle cx="12" cy="10" r="1" fill="currentColor"/>
      <circle cx="12" cy="13" r="1" fill="currentColor"/>
      <path d="M12 16v2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  htb: ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="2" y="8" width="20" height="8" rx="1" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
      <rect x="15" y="10" width="4" height="4" stroke="currentColor" strokeWidth="1"/>
      <circle cx="7" cy="12" r="1.5" fill="currentColor"/>
      <path d="M5 8V6a2 2 0 012-2h10a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/>
      <text x="11" y="14" fontSize="4" textAnchor="middle" fill="currentColor" fontWeight="bold">HTB</text>
    </svg>
  )
};

// Tooltip Component
const Tooltip: React.FC<{ text: string, children: React.ReactNode }> = ({ text, children }) => (
    <div className="group relative flex items-center">
        {children}
        <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-gray-700 z-50 pointer-events-none shadow-lg">
            {text}
            <span className="absolute top-1/2 right-full -mt-1 -mr-[1px] border-4 border-transparent border-r-gray-700"></span>
        </span>
    </div>
);

const TopologyPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [backgroundImg, setBackgroundImg] = useState<string | null>(null);
  
  // Viewport State (Zoom/Pan)
  const [viewState, setViewState] = useState<ViewState>({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState<{ x: number, y: number } | null>(null);
  
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  
  // Selection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  
  // Interaction
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  // We store the initial mouse diff relative to node pos, divided by scale
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load Data
  useEffect(() => {
    if (isLocalStorageAvailable()) {
      try {
        const savedNodes = localStorage.getItem(STORAGE_KEY_NODES);
        const savedLinks = localStorage.getItem(STORAGE_KEY_LINKS);
        const savedBg = localStorage.getItem(STORAGE_KEY_BG);
        const savedView = localStorage.getItem(STORAGE_KEY_VIEW);
        
        if (savedNodes) setNodes(JSON.parse(savedNodes));
        if (savedLinks) setLinks(JSON.parse(savedLinks));
        if (savedBg) setBackgroundImg(savedBg);
        if (savedView) setViewState(JSON.parse(savedView));
      } catch (e) {
        console.error("Failed to load topology", e);
      }
    }
  }, []);

  // Save Data
  useEffect(() => {
    if (isLocalStorageAvailable()) {
      localStorage.setItem(STORAGE_KEY_NODES, JSON.stringify(nodes));
      localStorage.setItem(STORAGE_KEY_LINKS, JSON.stringify(links));
      localStorage.setItem(STORAGE_KEY_VIEW, JSON.stringify(viewState));
      if (backgroundImg) {
          localStorage.setItem(STORAGE_KEY_BG, backgroundImg);
      } else {
          localStorage.removeItem(STORAGE_KEY_BG);
      }
    }
  }, [nodes, links, backgroundImg, viewState]);

  // --- Zoom & Pan Logic ---

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation(); // Stop page scrolling
    // If ctrl is pressed or simple scroll for zoom
    const zoomIntensity = 0.001;
    const newScale = Math.min(Math.max(0.1, viewState.scale - e.deltaY * zoomIntensity), 5);
    
    // Simple zoom towards center (improving this to zoom to mouse is complex, sticking to simple)
    setViewState(prev => ({ ...prev, scale: newScale }));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
      // Middle mouse or Spacebar mode or Pan tool
      if (e.button === 1 || toolMode === 'pan') {
          setIsPanning(true);
          setLastPanPosition({ x: e.clientX, y: e.clientY });
          return;
      }
      
      // Standard Click
      if (e.target !== canvasRef.current && (e.target as HTMLElement).id !== 'grid-layer') return;
      
      if (toolMode === 'select') {
          setSelectedNodeId(null);
          setSelectedLinkId(null);
      } else if (toolMode === 'link') {
          setLinkingSourceId(null);
      } else if (!['select', 'link', 'pan'].includes(toolMode)) {
          // Add Node
          if (!canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          
          // Calculate coordinate in the "World Space" accounting for pan/zoom
          const rawX = e.clientX - rect.left;
          const rawY = e.clientY - rect.top;
          
          const worldX = (rawX - viewState.x) / viewState.scale;
          const worldY = (rawY - viewState.y) / viewState.scale;

          const type = toolMode as DeviceType;
          const newNode: NetworkNode = {
            id: `node-${Date.now()}`,
            type,
            x: worldX - 24, // Center icon
            y: worldY - 24,
            name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            ip: '192.168.1.1',
            status: 'up',
          };

          setNodes([...nodes, newNode]);
          setToolMode('select');
      }
  };

  // --- Node Logic ---

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();

    if (toolMode === 'link') {
        if (linkingSourceId === null) {
            setLinkingSourceId(nodeId);
        } else if (linkingSourceId !== nodeId) {
            // Check for existing link
            const exists = links.some(l => 
                (l.source === linkingSourceId && l.target === nodeId) ||
                (l.source === nodeId && l.target === linkingSourceId)
            );
            
            if (!exists) {
                setLinks([...links, {
                    id: `link-${Date.now()}`,
                    source: linkingSourceId,
                    target: nodeId,
                    color: '#94a3b8',
                    width: 2
                }]);
            }
            setLinkingSourceId(null);
        }
        return;
    }

    if (toolMode === 'select') {
        setSelectedNodeId(nodeId);
        setSelectedLinkId(null);
        setDraggedNodeId(nodeId);
        
        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            // Mouse pos relative to canvas
            const rawX = e.clientX - rect.left;
            const rawY = e.clientY - rect.top;
            
            // World pos of mouse
            const mouseWorldX = (rawX - viewState.x) / viewState.scale;
            const mouseWorldY = (rawY - viewState.y) / viewState.scale;
            
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                setDragOffset({
                    x: mouseWorldX - node.x,
                    y: mouseWorldY - node.y
                });
            }
        }
    }
  };

  // --- Global Move/Up ---

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning && lastPanPosition) {
        const dx = e.clientX - lastPanPosition.x;
        const dy = e.clientY - lastPanPosition.y;
        setViewState(prev => ({
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy
        }));
        setLastPanPosition({ x: e.clientX, y: e.clientY });
        return;
    }

    if (draggedNodeId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      // Convert to world space
      const worldX = (rawX - viewState.x) / viewState.scale;
      const worldY = (rawY - viewState.y) / viewState.scale;

      const newX = worldX - dragOffset.x;
      const newY = worldY - dragOffset.y;

      setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x: newX, y: newY } : n));
    }
  }, [draggedNodeId, dragOffset, isPanning, lastPanPosition, viewState]);

  const handleMouseUp = useCallback(() => {
    setDraggedNodeId(null);
    setIsPanning(false);
    setLastPanPosition(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // --- Helpers ---

  const handleLinkClick = (e: React.MouseEvent, linkId: string) => {
      e.stopPropagation();
      if (toolMode === 'select') {
          setSelectedLinkId(linkId);
          setSelectedNodeId(null);
      }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) setBackgroundImg(ev.target.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const deleteSelected = () => {
      if (selectedNodeId) {
          setNodes(nodes.filter(n => n.id !== selectedNodeId));
          setLinks(links.filter(l => l.source !== selectedNodeId && l.target !== selectedNodeId));
          setSelectedNodeId(null);
      } else if (selectedLinkId) {
          setLinks(links.filter(l => l.id !== selectedLinkId));
          setSelectedLinkId(null);
      }
  };

  const getNodeCenter = (nodeId: string) => {
      const node = nodes.find(n => n.id === nodeId);
      return node ? { x: node.x + 24, y: node.y + 24 } : { x: 0, y: 0 };
  };

  const selectedNodeData = nodes.find(n => n.id === selectedNodeId);
  const selectedLinkData = links.find(l => l.id === selectedLinkId);

  return (
    <div className="flex flex-col h-screen text-white overflow-hidden relative select-none">
      <div className="absolute inset-0 bg-gray-900 z-0"></div>

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 flex justify-between items-center z-20 shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Kembali</span>
          </button>
          <div className="h-6 w-px bg-gray-600"></div>
          <h1 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-500">
            Simulator Topologi
          </h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
             <div className="hidden sm:flex items-center gap-2">
                 <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-xs px-3 py-1.5 rounded transition-colors border border-gray-600">
                    Upload Peta / Map
                    <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
                </label>
                {backgroundImg && (
                    <button onClick={() => setBackgroundImg(null)} className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-500/30 rounded bg-red-500/10">
                        Hapus Peta
                    </button>
                )}
            </div>
            
             <button 
                onClick={() => setViewState({ scale: 1, x: 0, y: 0 })}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded border border-gray-600"
            >
                Reset View
            </button>

            <button 
                onClick={() => {
                    Swal.fire({
                        title: 'Reset Canvas?',
                        text: "Semua data topologi akan dihapus.",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        confirmButtonText: 'Reset',
                        cancelButtonText: 'Batal',
                         customClass: { popup: '!bg-gray-800 !text-white', title: '!text-white' }
                    }).then((result: any) => {
                        if (result.isConfirmed) {
                            setNodes([]);
                            setLinks([]);
                            setBackgroundImg(null);
                            setViewState({ scale: 1, x: 0, y: 0 });
                        }
                    });
                }}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-500/30 rounded bg-red-500/10"
            >
                Reset All
            </button>
        </div>
      </div>

      <div className="flex-grow flex z-10 relative overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 z-30">
            <Tooltip text="Select & Move (V)">
                <button
                    onClick={() => setToolMode('select')}
                    className={`p-2.5 rounded-lg transition-all ${toolMode === 'select' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                </button>
            </Tooltip>

             <Tooltip text="Pan Map (Space)">
                <button
                    onClick={() => setToolMode('pan')}
                    className={`p-2.5 rounded-lg transition-all ${toolMode === 'pan' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </button>
            </Tooltip>
            
            <Tooltip text="Connect (L)">
                <button
                    onClick={() => {
                        setToolMode('link');
                        setLinkingSourceId(null);
                    }}
                    className={`p-2.5 rounded-lg transition-all ${toolMode === 'link' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700'}`}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </button>
            </Tooltip>

            <div className="w-10 h-px bg-gray-600 my-2"></div>

            {(['router', 'switch', 'olt', 'server', 'pc', 'ap', 'firewall', 'cloud', 'modem', 'htb'] as DeviceType[]).map(type => (
                 <Tooltip key={type} text={type.charAt(0).toUpperCase() + type.slice(1)}>
                    <button
                        onClick={() => setToolMode(type)}
                        className={`p-2.5 rounded-lg transition-all ${toolMode === type ? 'bg-sky-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-700'}`}
                    >
                        {React.createElement(Icons[type], { className: 'w-6 h-6' })}
                    </button>
                </Tooltip>
            ))}
        </div>

        {/* Main Canvas Area */}
        <div 
            ref={canvasRef}
            className={`flex-grow relative bg-gray-900 overflow-hidden ${toolMode === 'pan' || isPanning ? 'cursor-move' : toolMode === 'link' ? 'cursor-crosshair' : 'cursor-default'}`}
            onWheel={handleWheel}
            onMouseDown={handleCanvasMouseDown}
        >
            {/* TRANSFORM CONTAINER: Everything inside here scales and moves together */}
            <div 
                className="origin-top-left absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ 
                    transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})` 
                }}
            >
                 {/* 1. Background Layer (Map) */}
                <div className="absolute inset-0 pointer-events-none" id="grid-layer" style={{ width: '5000px', height: '5000px' }}>
                    {backgroundImg ? (
                        <img 
                            src={backgroundImg} 
                            className="absolute top-0 left-0 max-w-none opacity-50" 
                            alt="Background map"
                            style={{ pointerEvents: 'none' }} 
                        />
                    ) : (
                        <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    )}
                </div>

                {/* 2. Link Layer (SVG) */}
                <svg className="absolute top-0 left-0 w-[5000px] h-[5000px] overflow-visible pointer-events-none">
                     {links.map(link => {
                        const sPos = getNodeCenter(link.source);
                        const tPos = getNodeCenter(link.target);
                        if (!sPos || !tPos) return null;

                        const isSelected = selectedLinkId === link.id;

                        return (
                            <g key={link.id} className="pointer-events-auto cursor-pointer group" onClick={(e) => handleLinkClick(e, link.id)}>
                                {/* Transparent Hit Area (Thick) */}
                                <line 
                                    x1={sPos.x} y1={sPos.y} 
                                    x2={tPos.x} y2={tPos.y} 
                                    stroke="transparent" 
                                    strokeWidth="15" 
                                />
                                {/* Visible Link */}
                                <line 
                                    x1={sPos.x} y1={sPos.y} 
                                    x2={tPos.x} y2={tPos.y} 
                                    stroke={isSelected ? '#38bdf8' : (link.color || '#94a3b8')} 
                                    strokeWidth={isSelected ? (link.width || 2) + 2 : (link.width || 2)} 
                                    className="transition-all duration-200"
                                    opacity={0.8}
                                />
                                {link.label && (
                                    <g>
                                        <rect 
                                            x={(sPos.x + tPos.x) / 2 - (link.label.length * 3 + 6)} 
                                            y={(sPos.y + tPos.y) / 2 - 9} 
                                            width={link.label.length * 6 + 12} 
                                            height="18" 
                                            fill="#1f2937" 
                                            rx="4"
                                            stroke={isSelected ? '#38bdf8' : '#374151'}
                                        />
                                        <text 
                                            x={(sPos.x + tPos.x) / 2} 
                                            y={(sPos.y + tPos.y) / 2} 
                                            fill="white" 
                                            fontSize="10" 
                                            textAnchor="middle" 
                                            dy="3"
                                            fontWeight="bold"
                                        >
                                            {link.label}
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                     {/* Render Temporary Link Line when Linking */}
                     {toolMode === 'link' && linkingSourceId && (
                        <circle cx={getNodeCenter(linkingSourceId).x} cy={getNodeCenter(linkingSourceId).y} r="6" fill="#4ade80" className="animate-ping opacity-75" />
                    )}
                </svg>

                {/* 3. Node Layer */}
                <div className="absolute top-0 left-0 w-[5000px] h-[5000px] pointer-events-none">
                     {nodes.map(node => {
                        const isSelected = selectedNodeId === node.id;
                        const isSource = linkingSourceId === node.id;
                        
                        return (
                            <div
                                key={node.id}
                                className="absolute flex flex-col items-center group pointer-events-auto"
                                style={{ 
                                    transform: `translate(${node.x}px, ${node.y}px)`,
                                    width: '48px',
                                    height: '48px',
                                    cursor: toolMode === 'link' ? 'crosshair' : toolMode === 'pan' ? 'grab' : 'grab',
                                    zIndex: isSelected ? 30 : 10
                                }}
                                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                                onMouseEnter={() => setHoveredNodeId(node.id)}
                                onMouseLeave={() => setHoveredNodeId(null)}
                            >
                                <div className={`
                                    relative w-12 h-12 flex items-center justify-center rounded-lg shadow-xl transition-all duration-200
                                    ${isSelected ? 'bg-sky-700 ring-2 ring-sky-400 scale-110' : 'bg-gray-800 hover:bg-gray-700'}
                                    ${isSource ? 'ring-2 ring-green-400 animate-pulse' : ''}
                                `}>
                                    {React.createElement(Icons[node.type], { 
                                        className: `w-8 h-8 ${
                                            node.status === 'down' ? 'text-red-500' : 
                                            node.status === 'warning' ? 'text-yellow-500' : 'text-green-500'
                                        }` 
                                    })}
                                    
                                    <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-gray-900 
                                        ${node.status === 'up' ? 'bg-green-500' : node.status === 'down' ? 'bg-red-500' : 'bg-yellow-500'}
                                    `}></div>
                                </div>

                                <div className="absolute top-14 left-1/2 -translate-x-1/2 flex flex-col items-center whitespace-nowrap z-40">
                                    <span className="text-[10px] font-bold text-white bg-gray-900/90 px-2 py-0.5 rounded border border-gray-700 shadow-sm">{node.name}</span>
                                    <span className="text-[9px] text-gray-300 bg-gray-900/90 px-1.5 py-0.5 rounded mt-0.5 border border-gray-700">{node.ip}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Hint Box */}
            <div className="absolute bottom-4 left-4 bg-gray-800/95 p-3 rounded-lg border border-gray-700 text-xs text-gray-300 pointer-events-none select-none z-10 backdrop-blur-sm shadow-xl max-w-xs">
                <p><span className="font-bold text-sky-400">Mode:</span> {toolMode === 'select' ? 'Select & Move' : toolMode === 'link' ? 'Connect Link' : toolMode === 'pan' ? 'Pan View' : `Add ${toolMode}`}</p>
                <div className="mt-1 space-y-0.5 opacity-80">
                     <p>🖱️ Scroll untuk Zoom</p>
                     <p>🖱️ Klik Tengah / Spasi + Drag untuk Geser Peta</p>
                     <p>📍 Upload peta untuk background lokasi.</p>
                </div>
            </div>
            
            <div className="absolute top-4 right-4 bg-gray-800/90 p-2 rounded text-xs font-mono text-gray-400 border border-gray-700 pointer-events-none">
                Zoom: {(viewState.scale * 100).toFixed(0)}%
            </div>
        </div>

        {/* Properties Panel */}
        {(selectedNodeId || selectedLinkId) && (
            <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col shadow-2xl z-30 animate-slideRight">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-750">
                    <h3 className="font-bold text-white tracking-wide">{selectedNodeId ? 'Device Config' : 'Link Config'}</h3>
                    <button onClick={() => { setSelectedNodeId(null); setSelectedLinkId(null); }} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="p-5 space-y-5 overflow-y-auto flex-grow">
                    {selectedNodeData && (
                        <>
                             <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Device Name</label>
                                <input 
                                    type="text" 
                                    value={selectedNodeData.name}
                                    onChange={(e) => setNodes(nodes.map(n => n.id === selectedNodeId ? { ...n, name: e.target.value } : n))}
                                    className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">IP Address</label>
                                <input 
                                    type="text" 
                                    value={selectedNodeData.ip}
                                    onChange={(e) => setNodes(nodes.map(n => n.id === selectedNodeId ? { ...n, ip: e.target.value } : n))}
                                    className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Status</label>
                                <select 
                                    value={selectedNodeData.status}
                                    onChange={(e) => setNodes(nodes.map(n => n.id === selectedNodeId ? { ...n, status: e.target.value as any } : n))}
                                    className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                                >
                                    <option value="up">🟢 UP (Online)</option>
                                    <option value="down">🔴 DOWN (Offline)</option>
                                    <option value="warning">🟡 WARNING (Issues)</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Device Type</label>
                                <select 
                                    value={selectedNodeData.type}
                                    onChange={(e) => setNodes(nodes.map(n => n.id === selectedNodeId ? { ...n, type: e.target.value as DeviceType } : n))}
                                    className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 uppercase"
                                >
                                    {Object.keys(Icons).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {selectedLinkData && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Label (Bandwidth/Distance)</label>
                                <input 
                                    type="text" 
                                    value={selectedLinkData.label || ''}
                                    placeholder="e.g. 1Gbps / 10km"
                                    onChange={(e) => setLinks(links.map(l => l.id === selectedLinkId ? { ...l, label: e.target.value } : l))}
                                    className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Link Color</label>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="color" 
                                        value={selectedLinkData.color || '#94a3b8'}
                                        onChange={(e) => setLinks(links.map(l => l.id === selectedLinkId ? { ...l, color: e.target.value } : l))}
                                        className="h-10 w-14 bg-transparent border-0 p-0 cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-500">{selectedLinkData.color || '#94a3b8'}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Line Thickness</label>
                                <input 
                                    type="range" min="1" max="8"
                                    value={selectedLinkData.width || 2}
                                    onChange={(e) => setLinks(links.map(l => l.id === selectedLinkId ? { ...l, width: parseInt(e.target.value) } : l))}
                                    className="w-full accent-sky-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Thin</span>
                                    <span>Thick</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-5 border-t border-gray-700 bg-gray-900/30 mt-auto">
                    <button 
                        onClick={deleteSelected}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium py-3 rounded-md border border-red-500/30 transition-all flex items-center justify-center gap-2 group"
                    >
                        <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete {selectedNodeId ? 'Device' : 'Connection'}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default TopologyPage;
