import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
  Node,
  NodeProps,
  useReactFlow,
} from 'reactflow';
import styled from 'styled-components';
import 'reactflow/dist/style.css';
import zoneConfig from '../data/zone-config.json';
import boardItemsData from '../data/boardItems.json';
import BoardItem from './BoardItem';
import TriageFlowNode from './TriageFlowNode';

interface ZoneContainerProps {
  color: string;
  gradient?: string;
}

const ZoneContainer = styled.div<ZoneContainerProps>`
  position: absolute;
  border: ${zoneConfig.settings.borderWidth}px solid ${props => props.color};
  border-radius: ${zoneConfig.settings.borderRadius}px;
  background: ${props => props.gradient || props.color};
  box-shadow: ${zoneConfig.settings.boxShadow};
  pointer-events: none;
  z-index: 1;
  transition: all 0.3s ease;
`;

const ZoneLabel = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  background: ${zoneConfig.settings.labelBackgroundColor};
  padding: ${zoneConfig.settings.labelPadding};
  border-radius: 8px;
  font-size: ${zoneConfig.settings.labelFontSize}px;
  font-weight: ${zoneConfig.settings.labelFontWeight};
  color: ${zoneConfig.settings.labelTextColor};
  pointer-events: none;
  z-index: 2;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const ZonesLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
`;

const ReactFlowWrapper = styled.div`
  width: 100%;
  height: 100%;
  
  /* Custom selection styling for nodes */
  .react-flow__node.selected {
    .react-flow__node-default,
    & > div {
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5), 0 8px 24px rgba(0, 0, 0, 0.2) !important;
    }
  }
  
  /* Remove default ReactFlow selection styling */
  .react-flow__node.selected .react-flow__handle {
    background: #3b82f6;
  }
`;

// Wrapper to override BoardItem's absolute positioning for ReactFlow
const NodeWrapper = styled.div`
  position: relative !important;
  width: fit-content;
  height: fit-content;
  
  /* Override BoardItem's absolute positioning */
  & > div {
    position: relative !important;
    left: 0 !important;
    top: 0 !important;
    transform: none !important;
  }
`;

// Custom node component that renders board items using the actual BoardItem component
function CustomBoardNode({ data }: NodeProps) {
  const item = data.item;
  
  return (
    <NodeWrapper>
      <BoardItem
        item={item}
        isSelected={data.isSelected || false}
        onUpdate={data.onUpdate}
        onDelete={data.onDelete}
        onSelect={data.onSelect}
        zoom={1}
      />
    </NodeWrapper>
  );
}

// Custom zone node component
function ZoneNode({ data }: NodeProps) {
  const zone = data.zone;
  
  return (
    <div
      style={{
        width: zone.width,
        height: zone.height,
        border: `${zoneConfig.settings.borderWidth}px solid ${zone.color}`,
        borderRadius: `${zoneConfig.settings.borderRadius}px`,
        background: zone.gradient || zone.color,
        boxShadow: zoneConfig.settings.boxShadow,
        pointerEvents: 'none',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          background: zoneConfig.settings.labelBackgroundColor,
          padding: zoneConfig.settings.labelPadding,
          borderRadius: '8px',
          fontSize: `${zoneConfig.settings.labelFontSize}px`,
          fontWeight: zoneConfig.settings.labelFontWeight,
          color: zoneConfig.settings.labelTextColor,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        {zone.label}
      </div>
    </div>
  );
}

function Canvas2() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    deletedCount: number;
    remainingCount?: number;
    error?: string;
  } | null>(null);
  const reactFlowInstance = useRef<any>(null);

  // Get API base URL
  const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL ||
    (window.location.hostname === "localhost"
      ? "http://localhost:3001"
      : window.location.origin);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Handlers for BoardItem
  const handleUpdateItem = useCallback((id: string, updates: any) => {
    // Update items state
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );

    // Update nodes
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              item: { ...node.data.item, ...updates },
            },
            position: updates.x !== undefined && updates.y !== undefined 
              ? { x: updates.x, y: updates.y }
              : node.position,
          };
        }
        return node;
      })
    );

    // Sync updates to backend
    if (
      updates.height !== undefined ||
      updates.noteData !== undefined ||
      updates.content !== undefined
    ) {
      fetch(`${API_BASE_URL}/api/board-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).catch((err) => {
        console.error('Failed to sync update to backend:', err);
      });
    }
  }, [setNodes, API_BASE_URL]);

  const handleDeleteItem = useCallback(async (id: string) => {
    // Optimistically update UI
    setItems((prev) => prev.filter((item) => item.id !== id));
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setSelectedItemId((current) => current === id ? null : current);

    // Sync deletion to backend
    try {
      const response = await fetch(`${API_BASE_URL}/api/board-items/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('Failed to delete item from backend:', response.status);
      } else {
        console.log(`✅ Item ${id} deleted successfully`);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }, [setNodes, API_BASE_URL]);

  const handleSelectItem = useCallback((id: string | null) => {
    setSelectedItemId(id);
    
    // Sync selected item to backend
    if (id) {
      fetch(`${API_BASE_URL}/api/selected-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedItemId: id }),
      }).catch((err) => {
        console.error('Failed to sync selected item:', err);
      });
    }
  }, [API_BASE_URL]);

  // Handle ReactFlow node selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Only handle boardItem nodes, not zones
    if (node.type === 'boardItem') {
      console.log('🖱️ Node clicked:', node.id);
      handleSelectItem(node.id);
    }
  }, [handleSelectItem]);

  // Handle canvas click (deselect)
  const onPaneClick = useCallback(() => {
    console.log('🖱️ Canvas clicked - deselecting');
    handleSelectItem(null);
  }, [handleSelectItem]);

  // Define custom node types
  const nodeTypes = useMemo(() => ({
    boardItem: CustomBoardNode,
    zone: ZoneNode,
    triageFlow: TriageFlowNode,
  }), []);

  // Load items from backend on mount
  useEffect(() => {
    const loadItems = async () => {
      try {
        // Start with static data
        let allItems = [...boardItemsData];
        
        // Try to load from backend API
        try {
          const response = await fetch(`${API_BASE_URL}/api/board-items`);
          if (response.ok) {
            const apiItems = await response.json();
            const staticIds = new Set(boardItemsData.map((item: any) => item.id));
            const uniqueApiItems = apiItems.filter((item: any) => !staticIds.has(item.id));
            allItems = [...boardItemsData, ...uniqueApiItems];
            console.log('✅ Loaded items from backend:', allItems.length);
          }
        } catch (apiError) {
          console.log('⚠️ API not available, using only static data');
        }

        setItems(allItems);

        // Create zone nodes
        const zoneNodes: Node[] = zoneConfig.zones.map((zone) => ({
          id: `zone-${zone.name}`,
          type: 'zone',
          position: { x: zone.x, y: zone.y },
          data: { zone },
          draggable: false,
          selectable: false,
          zIndex: -1,
        }));



        // Create item nodes
        const itemNodes: Node[] = allItems.map((item: any) => ({
          id: item.id,
          type: 'boardItem',
          position: { x: item.x, y: item.y },
          data: { 
            item: item,
            isSelected: false,
            onUpdate: handleUpdateItem,
            onDelete: handleDeleteItem,
            onSelect: handleSelectItem,
          },
          draggable: true,
          selectable: true,
          zIndex: 1,
        }));

        console.log('🎨 Creating nodes:', {
          zones: zoneNodes.length,
          items: itemNodes.length,
          total: zoneNodes.length + itemNodes.length
        });
        
        setNodes([...zoneNodes, ...itemNodes]);
      } catch (error) {
        console.error('❌ Error loading items:', error);
      }
    };

    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SSE connection for real-time updates
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectDelay = 30000;

    const connect = () => {
      try {
        const sseUrl = `${API_BASE_URL}/api/events`;
        console.log(`🔌 Connecting to SSE:`, sseUrl);
        es = new EventSource(sseUrl);

        es.addEventListener('connected', (event: any) => {
          console.log('✅ Connected to SSE');
          reconnectAttempts = 0;
        });

        es.addEventListener('ping', (event: any) => {
          console.log('💓 SSE heartbeat');
        });

        es.addEventListener('focus', (event: any) => {
          try {
            const data = JSON.parse(event.data);
            console.log('🎯 Focus event received:', data);
            const itemId = data.objectId || data.itemId;
            if (itemId) {
              handleSelectItem(itemId);
              setTimeout(() => {
                centerOnItem(itemId, data.focusOptions?.zoom || 0.8, data.focusOptions?.duration || 1200);
              }, 100);
            }
          } catch (err) {
            console.error('❌ Error handling focus event:', err);
          }
        });

        es.addEventListener('new-item', (event: any) => {
          try {
            const data = JSON.parse(event.data);
            const newItem = data.item;
            if (!newItem) return;

            console.log('📦 New item received:', newItem.id);

            // Add to items state
            setItems((prev) => {
              if (prev.some((it) => it.id === newItem.id)) return prev;
              return [...prev, newItem];
            });

            // Add to nodes
            setNodes((nds) => {
              if (nds.some((n) => n.id === newItem.id)) return nds;
              
              const newNode: Node = {
                id: newItem.id,
                type: 'boardItem',
                position: { x: newItem.x, y: newItem.y },
                data: {
                  item: newItem,
                  isSelected: false,
                  onUpdate: handleUpdateItem,
                  onDelete: handleDeleteItem,
                  onSelect: handleSelectItem,
                },
                draggable: true,
                selectable: true,
                zIndex: 1,
              };

              return [...nds, newNode];
            });

            // Auto-focus on new item - use longer delay to ensure node is rendered
            setTimeout(() => {
              if (!reactFlowInstance.current) {
                console.warn('⚠️ ReactFlow instance not ready for focus');
                return;
              }

              const zoomLevel = newItem.type === 'doctor-note' ? 1.0 : 0.8;
              
              // Calculate center position directly
              const itemWidth = newItem.width || 200;
              const itemHeight = newItem.height === 'auto' ? 400 : (newItem.height || 200);
              const x = newItem.x + itemWidth / 2;
              const y = newItem.y + itemHeight / 2;

              console.log(`🎯 Auto-focusing on new item ${newItem.id} at (${x}, ${y}) with zoom ${zoomLevel}`);
              reactFlowInstance.current.setCenter(x, y, { zoom: zoomLevel, duration: 1200 });
            }, 800);
          } catch (err) {
            console.error('❌ Error handling new-item event:', err);
          }
        });

        es.addEventListener('easl-query', (event: any) => {
          try {
            const { query, metadata } = JSON.parse(event.data);
            console.log('📨 EASL query event received:', query);
            sendQueryToEASL(query, metadata);
          } catch (err) {
            console.error('❌ Error handling easl-query event:', err);
          }
        });

        es.onerror = (error) => {
          console.error('❌ SSE connection error:', error);
          es?.close();
          
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), maxReconnectDelay);
          console.log(`🔄 Reconnecting in ${delay / 1000}s...`);
          reconnectTimeout = setTimeout(connect, delay);
        };

        es.onopen = () => {
          console.log('🌐 SSE connection opened');
          reconnectAttempts = 0;
        };
      } catch (error) {
        console.error('❌ Error creating SSE connection:', error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) {
        console.log('🔌 Closing SSE connection');
        es.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE_URL]);

  // Center on item function for ReactFlow
  const centerOnItem = useCallback((itemId: string, finalZoom = 0.8, duration = 1200) => {
    if (!reactFlowInstance.current) {
      console.warn('⚠️ ReactFlow instance not ready');
      return;
    }

    // Try to find node first
    let node = nodes.find((n) => n.id === itemId);
    let item = items.find((i) => i.id === itemId);

    // If node not found in state, try to get it from ReactFlow directly
    if (!node && reactFlowInstance.current.getNode) {
      node = reactFlowInstance.current.getNode(itemId);
    }

    if (!node) {
      console.warn(`⚠️ Node not found: ${itemId}`);
      return;
    }

    // Get item dimensions
    let itemWidth = 200;
    let itemHeight = 200;

    if (item) {
      itemWidth = item.width || 200;
      itemHeight = item.height === 'auto' ? 400 : (item.height || 200);
    } else if (node.data?.item) {
      // Get dimensions from node data
      itemWidth = node.data.item.width || 200;
      itemHeight = node.data.item.height === 'auto' ? 400 : (node.data.item.height || 200);
    }

    // Calculate center position
    const x = node.position.x + itemWidth / 2;
    const y = node.position.y + itemHeight / 2;

    // Animate to center
    reactFlowInstance.current.setCenter(x, y, { zoom: finalZoom, duration });
    
    console.log(`🎯 Centered on item ${itemId} at (${x}, ${y}) with zoom ${finalZoom}`);
  }, [nodes, items]);

  // Send query to EASL iframe
  const sendQueryToEASL = useCallback((query: string, metadata?: any) => {
    const easlIframe = document.querySelector('[data-item-id="iframe-item-easl-interface"] iframe') as HTMLIFrameElement;
    
    if (!easlIframe || !easlIframe.contentWindow) {
      console.error('❌ EASL iframe not found');
      return;
    }

    const message = {
      type: 'CANVAS_QUERY',
      payload: {
        query: query,
        timestamp: new Date().toISOString(),
        metadata: metadata || {}
      }
    };

    easlIframe.contentWindow.postMessage(message, 'https://easl-board.vercel.app');
    console.log('📤 Sent query to EASL:', query);
  }, []);

  // Center on sub-element within an item
  const centerOnSubElement = useCallback((itemId: string, subElementSelector: string, finalZoom = 1.2, duration = 1200) => {
    const node = nodes.find((n) => n.id === itemId);
    if (!node || !reactFlowInstance.current) return;

    // Find the sub-element in the DOM
    const subElement = document.querySelector(`[data-focus-id="${subElementSelector}"]`);
    if (!subElement) {
      console.warn(`⚠️ Sub-element not found: ${subElementSelector}, centering on parent item`);
      centerOnItem(itemId, finalZoom, duration);
      return;
    }

    // Get sub-element bounding rect
    const subRect = subElement.getBoundingClientRect();
    
    // Calculate center of sub-element in world coordinates
    // This is approximate - ReactFlow handles its own coordinate system
    const x = node.position.x + (subRect.width / 2);
    const y = node.position.y + (subRect.height / 2);

    reactFlowInstance.current.setCenter(x, y, { zoom: finalZoom, duration });
    
    // Add highlight to sub-element
    setTimeout(() => {
      subElement.classList.add('focus-highlighted');
      setTimeout(() => {
        subElement.classList.remove('focus-highlighted');
      }, duration);
    }, 100);

    console.log(`🎯 Centered on sub-element ${subElementSelector} in item ${itemId}`);
  }, [nodes, centerOnItem]);

  // Place item at viewport center
  const placeItemAtViewportCenter = useCallback(async (itemId: string) => {
    if (!reactFlowInstance.current) return;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    // Get current viewport center
    const viewport = reactFlowInstance.current.getViewport();
    const bounds = reactFlowInstance.current.getBounds();
    
    // Calculate center in world coordinates
    const centerX = (bounds.width / 2 - viewport.x) / viewport.zoom;
    const centerY = (bounds.height / 2 - viewport.y) / viewport.zoom;

    // Calculate new position (center item at viewport center)
    const newX = Math.round(centerX - (item.width || 0) / 2);
    const newY = Math.round(centerY - (item.height || 0) / 2);

    // Update item
    handleUpdateItem(itemId, { x: newX, y: newY });

    console.log(`📍 Placed item ${itemId} at viewport center (${newX}, ${newY})`);
  }, [items, handleUpdateItem]);

  // Get viewport center in world coordinates
  const getViewportCenterWorld = useCallback(() => {
    if (!reactFlowInstance.current) return null;

    const viewport = reactFlowInstance.current.getViewport();
    const bounds = reactFlowInstance.current.getBounds();
    
    const x = (bounds.width / 2 - viewport.x) / viewport.zoom;
    const y = (bounds.height / 2 - viewport.y) / viewport.zoom;
    
    return { x, y, zoom: viewport.zoom };
  }, []);

  // Add new note function
  const handleAddNote = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/doctor-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '' })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Note created:', data.item.id);
        
        // Note will be added via SSE event
      }
    } catch (error) {
      console.error('❌ Failed to create note:', error);
    }
  }, [API_BASE_URL]);

  // Reset board function
  const handleResetBoard = useCallback(async () => {
    try {
      console.log('🗑️ Resetting board...');
      setShowResetModal(false);
      setIsDeleting(true);
      
      // Filter items to delete (exclude 'raw' and 'single-encounter' items)
      const itemsToDelete = items.filter((item: any) => {
        const id = item.id || '';
        if (id.includes('raw') || id.includes('single-encounter')) {
          return false;
        }
        return (
          id.startsWith('enhanced') ||
          id.startsWith('item') ||
          id.startsWith('doctor-note')
        );
      });
      
      console.log(`🗑️ Deleting ${itemsToDelete.length} items...`);
      
      if (itemsToDelete.length === 0) {
        console.log('⚠️ No items to delete');
        setIsDeleting(false);
        setDeleteResult({
          success: false,
          deletedCount: 0,
          error: 'No items to delete'
        });
        setShowResultModal(true);
        return;
      }
      
      const itemIds = itemsToDelete.map(item => item.id);
      
      // Use batch delete endpoint
      const response = await fetch(`${API_BASE_URL}/api/board-items/batch-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to batch delete items');
      }
      
      const result = await response.json();
      console.log(`✅ Batch delete complete:`, result);
      
      // Reset EASL conversation history
      try {
        const easlResetResponse = await fetch(`${API_BASE_URL}/api/easl-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (easlResetResponse.ok) {
          console.log(`✅ EASL conversation history reset`);
        }
      } catch (easlError) {
        console.warn('⚠️ Error resetting EASL conversation history:', easlError);
      }
      
      // Update state - remove deleted items but keep zones
      const deletedIdsSet = new Set(itemIds);
      setItems((prev) => prev.filter((item) => !deletedIdsSet.has(item.id)));
      setNodes((nds) => nds.filter((node) => {
        // Keep zones (they start with 'zone-')
        if (node.id.startsWith('zone-')) return true;
        // Keep items that weren't deleted
        return !deletedIdsSet.has(node.id);
      }));
      
      setIsDeleting(false);
      setDeleteResult({
        success: true,
        deletedCount: result.deletedCount,
        remainingCount: result.remainingCount
      });
      setShowResultModal(true);
      
    } catch (error) {
      console.error('❌ Error resetting board:', error);
      setIsDeleting(false);
      setDeleteResult({
        success: false,
        deletedCount: 0,
        error: 'Failed to reset board. Check console for details.'
      });
      setShowResultModal(true);
    }
  }, [API_BASE_URL, items]);

  // Listen for responses from EASL iframe
  useEffect(() => {
    const handleEASLResponse = (event: MessageEvent) => {
      // Security check
      if (event.origin !== 'https://easl-board.vercel.app') {
        return;
      }

      if (event.data?.type === 'EASL_RESPONSE') {
        const { response, timestamp } = event.data.payload;
        console.log('📥 Received response from EASL:', response);
        // Handle the response (could create a board item, show notification, etc.)
      }
    };

    window.addEventListener('message', handleEASLResponse);
    
    return () => {
      window.removeEventListener('message', handleEASLResponse);
    };
  }, []);

  // Update nodes when selection changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        // Don't modify zone nodes
        if (node.type === 'zone') return node;
        
        // Update isSelected in data for boardItem nodes
        return {
          ...node,
          data: {
            ...node.data,
            isSelected: node.id === selectedItemId,
          },
          // Add ReactFlow's selected property for visual feedback
          selected: node.id === selectedItemId,
        };
      })
    );
  }, [selectedItemId, setNodes]);

  // Expose functions globally
  useEffect(() => {
    (window as any).centerOnItem = centerOnItem;
    (window as any).centerOnSubElement = centerOnSubElement;
    (window as any).sendQueryToEASL = sendQueryToEASL;
    (window as any).placeItemAtViewportCenter = placeItemAtViewportCenter;
    (window as any).getViewportCenterWorld = getViewportCenterWorld;
    (window as any).getSelectedItem = () => {
      if (!selectedItemId) return null;
      return items.find((item) => item.id === selectedItemId) || null;
    };
  }, [centerOnItem, centerOnSubElement, sendQueryToEASL, placeItemAtViewportCenter, getViewportCenterWorld, selectedItemId, items]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        // Reset viewport
        if (reactFlowInstance.current) {
          reactFlowInstance.current.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 800 });
        }
      }
      if (e.key === 'f' && e.ctrlKey) {
        e.preventDefault();
        // Focus on first item
        if (items.length > 0) {
          centerOnItem(items[0].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [items, centerOnItem]);

  console.log('Canvas2 rendering with nodes:', nodes.length);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <ReactFlowWrapper>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            reactFlowInstance.current = instance;
            console.log('✅ ReactFlow instance initialized');
          }}
          fitView
          minZoom={0.01}
          maxZoom={4}
          defaultViewport={{ x: 0, y: 0, zoom: 0.15 }}
          proOptions={{ hideAttribution: true }}
          selectNodesOnDrag={false}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>
      </ReactFlowWrapper>
      
      {/* Control Buttons */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 1000,
      }}>
        <button
          onClick={handleAddNote}
          style={{
            width: '44px',
            height: '44px',
            border: 'none',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(6, 182, 212, 0.3)',
            transition: 'all 0.2s ease',
          }}
          title="Add Doctor's Note"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(6, 182, 212, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(6, 182, 212, 0.3)';
          }}
        >
          📝
        </button>
        <button
          onClick={() => setShowResetModal(true)}
          style={{
            width: '44px',
            height: '44px',
            border: 'none',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #ffffff 0%, #ffffff 100%)',
            color: 'black',
            fontSize: '20px',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(149, 147, 147, 0.4)',
            transition: 'all 0.2s ease',
          }}
          title="Reset Board (Delete All API Items)"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(220, 38, 38, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(149, 147, 147, 0.4)';
          }}
        >
          ✕
        </button>
      </div>
      
      

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowResetModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 600, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>⚠️</span> Reset Board
            </h2>
            
            <p style={{ margin: '0 0 12px 0', fontSize: '16px', lineHeight: 1.6, color: '#374151' }}>
              This will delete <strong>ALL API-added items</strong> from the board.
            </p>
            
            <p style={{ margin: '12px 0', fontSize: '16px', fontWeight: 600, color: '#374151' }}>
              Items that will be deleted:
            </p>
            <ul style={{ margin: '12px 0', paddingLeft: '24px', color: '#374151' }}>
              <li style={{ margin: '6px 0', fontSize: '15px' }}>Todos and Enhanced Todos</li>
              <li style={{ margin: '6px 0', fontSize: '15px' }}>Agent Results</li>
              <li style={{ margin: '6px 0', fontSize: '15px' }}>Doctor's Notes</li>
              <li style={{ margin: '6px 0', fontSize: '15px' }}>Lab Results</li>
            </ul>
            
            <p style={{ margin: '12px 0', fontSize: '16px', fontWeight: 600, color: '#374151' }}>
              Items that will remain:
            </p>
            <ul style={{ margin: '12px 0', paddingLeft: '24px', color: '#374151' }}>
              <li style={{ margin: '6px 0', fontSize: '15px' }}>Raw EHR Data</li>
              <li style={{ margin: '6px 0', fontSize: '15px' }}>Single Encounter Data</li>
            </ul>
            
            <div style={{ background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '8px', padding: '16px', margin: '20px 0', color: '#991b1b', fontWeight: 500, fontSize: '15px' }}>
              ⚠️ This action CANNOT be undone!
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowResetModal(false)}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#f3f4f6',
                  color: '#374151',
                  transition: 'all 0.2s ease',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetBoard}
                disabled={isDeleting}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                  color: 'white',
                  opacity: isDeleting ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete All Items'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Result Modal */}
      {showResultModal && deleteResult && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowResultModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: 600, color: deleteResult.success ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>{deleteResult.success ? '✅' : '❌'}</span>
              {deleteResult.success ? 'Board Reset Complete' : 'Reset Failed'}
            </h2>
            
            {deleteResult.success ? (
              <>
                <p style={{ margin: '0 0 12px 0', fontSize: '16px', lineHeight: 1.6, color: '#374151' }}>
                  Successfully deleted <strong>{deleteResult.deletedCount}</strong> items from the board.
                </p>
                {deleteResult.remainingCount !== undefined && (
                  <p style={{ margin: '0 0 12px 0', fontSize: '16px', lineHeight: 1.6, color: '#374151' }}>
                    <strong>{deleteResult.remainingCount}</strong> items remaining on the board.
                  </p>
                )}
              </>
            ) : (
              <p style={{ margin: '0 0 12px 0', fontSize: '16px', lineHeight: 1.6, color: '#991b1b' }}>
                {deleteResult.error || 'An error occurred while deleting items.'}
              </p>
            )}
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowResultModal(false)}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#f3f4f6',
                  color: '#374151',
                  transition: 'all 0.2s ease',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Canvas2;
