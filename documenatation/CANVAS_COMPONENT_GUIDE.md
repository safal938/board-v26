# Canvas Component - Comprehensive Documentation

## Overview

The Canvas component (`src/components/Canvas.tsx`) is the core infinite canvas workspace that manages board items, zones, viewport navigation, and real-time synchronization with the backend. It provides pan/zoom functionality, collision detection, auto-positioning, and SSE-based live updates.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Props](#component-props)
3. [State Management](#state-management)
4. [Viewport System](#viewport-system)
5. [Zone System](#zone-system)
6. [Item Positioning](#item-positioning)
7. [Backend Integration](#backend-integration)
8. [SSE Real-Time Updates](#sse-real-time-updates)
9. [User Interactions](#user-interactions)
10. [API Integration](#api-integration)
11. [EASL Integration](#easl-integration)
12. [Board Reset System](#board-reset-system)

---

## Architecture Overview

### Component Structure

```
Canvas
├── CanvasContainer (viewport container)
│   ├── CanvasContent (transformable content)
│   │   ├── ZoneContainer[] (visual zones)
│   │   └── BoardItem[] (draggable items)
│   ├── ZoomControls (UI controls)
│   └── Modals (confirmation dialogs)
```

### Key Technologies

- **React**: Component framework
- **Styled Components**: CSS-in-JS styling
- **Framer Motion**: Animations and transitions
- **SSE (Server-Sent Events)**: Real-time updates
- **Redis**: Persistent storage backend

---

## Component Props

```typescript
interface CanvasProps {
  items: BoardItem[];              // Array of board items to render
  selectedItemId: string | null;   // Currently selected item ID
  onUpdateItem: (id: string, updates: Partial<BoardItem>) => void;
  onDeleteItem: (id: string) => void;
  onSelectItem: (id: string | null) => void;
  onFocusRequest?: (itemId: string) => void;
  onAddItem?: (item: BoardItem) => void;
  onResetBoard?: () => void;       // Callback to reload items after reset
}
```

### BoardItem Type

```typescript
interface BoardItem {
  id: string;
  type: 'todo' | 'agent' | 'lab-result' | 'doctor-note' | 'ehr-data' | 'component';
  x: number;
  y: number;
  width: number;
  height: number | 'auto';
  content?: any;
  color?: string;
  rotation?: number;
  
  // Type-specific data
  todoData?: TodoData;
  agentData?: AgentData;
  labResultData?: LabResultData;
  noteData?: NoteData;
  ehrData?: EHRData;
  
  createdAt: string;
  updatedAt: string;
}
```

---

## State Management

### Local State

```typescript
// Viewport state - controls pan and zoom
const [viewport, setViewport] = useState({ 
  x: 0,      // X translation
  y: 0,      // Y translation
  zoom: 1    // Zoom level (0.1 to 3)
});

// Panning state
const [isDragging, setIsDragging] = useState(false);
const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

// Modal state
const [showResetModal, setShowResetModal] = useState(false);
const [showResultModal, setShowResultModal] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null);
```

### Refs

```typescript
const canvasRef = useRef(null);           // Canvas DOM element
const animationFrameRef = useRef(null);   // Animation frame ID for smooth transitions
```

---

## Viewport System

### Coordinate System

The canvas uses a **world coordinate system** where:
- Items have fixed world coordinates (x, y)
- Viewport transforms world coords to screen coords
- Formula: `screenX = worldX * zoom + viewportX`

### Viewport Transform

```typescript
const updateViewport = useCallback((newViewport) => {
  setViewport(newViewport);
  if (canvasRef.current) {
    canvasRef.current.style.transform = 
      `translate(${newViewport.x}px, ${newViewport.y}px) scale(${newViewport.zoom})`;
  }
}, []);
```

### Pan Controls

**Mouse Panning:**
- Left-click on empty canvas + drag
- Middle mouse button + drag
- Global mouse event listeners for smooth panning

**Implementation:**
```typescript
const handleMouseDown = (e) => {
  if (e.button === 0 || e.button === 1) {
    if (e.target === e.currentTarget || e.target.closest('[data-item-id]') === null) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setLastPanPoint({ x: viewport.x, y: viewport.y });
    }
  }
};
```

### Zoom Controls

**Mouse Wheel Zoom:**
- Zooms around cursor position
- Maintains world point under cursor

```typescript
const handleWheel = (e) => {
  e.preventDefault();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.1, Math.min(3, viewport.zoom * factor));
  
  // Keep world point under cursor fixed
  const worldX = (mouseX - viewport.x) / viewport.zoom;
  const worldY = (mouseY - viewport.y) / viewport.zoom;
  const newX = mouseX - worldX * newZoom;
  const newY = mouseY - worldY * newZoom;
  
  updateViewport({ x: newX, y: newY, zoom: newZoom });
};
```

**Button Zoom:**
- Zooms around viewport center
- `+` button: zoom in (max 3x)
- `−` button: zoom out (min 0.1x)

### Focus Animation

**3-Step Animation System:**

```typescript
const centerOnItem = (itemId, finalZoom = 0.8, duration = 1200) => {
  // Step 1: Zoom out (30% of current zoom)
  // Step 2: Pan to target item center
  // Step 3: Zoom in to final zoom level
  
  const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  // Smooth animation using requestAnimationFrame
};
```

**Sub-Element Focus:**
```typescript
const centerOnSubElement = (itemId, subElementSelector, finalZoom = 1.2) => {
  // Finds sub-element using data-focus-id attribute
  // Calculates sub-element center in world coordinates
  // Animates to center on specific element within item
};
```

### Keyboard Shortcuts

- `Ctrl+R`: Reset viewport to origin (0, 0, zoom 1)
- `Ctrl+F`: Focus on first item

---

## Zone System

### Zone Configuration

Zones are loaded from `src/data/zone-config.json`:

```json
{
  "zones": [
    {
      "name": "task-management-zone",
      "label": "Task Management Zone",
      "x": 4200,
      "y": 0,
      "width": 2000,
      "height": 2100,
      "color": "#0891b2",
      "gradient": "linear-gradient(135deg, rgba(8, 145, 178, 0.05), rgba(6, 182, 212, 0.1))"
    }
  ]
}
```

### Zone Rendering

```typescript
{zoneConfig.zones.map((zone) => (
  <ZoneContainer
    key={zone.name}
    style={{
      left: zone.x,
      top: zone.y,
      width: zone.width,
      height: zone.height,
      borderColor: zone.color,
    }}
    color={zone.color}
    gradient={zone.gradient}
  >
    <ZoneLabel>{zone.label}</ZoneLabel>
  </ZoneContainer>
))}
```

### Zone Types

1. **Task Management Zone** (4200, 0) - Todo items
2. **Retrieved Data Zone** (4200, -4600) - EHR data, lab results
3. **Doctor's Note Zone** (4200, -2300) - Doctor's notes
4. **Adverse Event Zone** (0, 0) - Analytics
5. **Data Zone** (0, -1300) - General data
6. **Raw EHR Data Zone** (0, -4600) - Raw patient data
7. **Web Interface Zone** (-2200, 0) - EASL iframe

---

## Item Positioning

### Auto-Positioning System

The backend (`server-redis.js`) handles auto-positioning when items are created without explicit coordinates.

**Zone-Specific Positioning Functions:**

#### Task Management Zone
```javascript
const findTaskZonePosition = (newItem, existingItems) => {
  const padding = 60;
  const colWidth = 520;
  const maxColumns = 3;
  
  // Create column height tracker
  const columns = Array(maxColumns).fill(startY);
  
  // Place existing items into columns
  taskZoneItems.forEach((item) => {
    const col = Math.floor((item.x - startX) / (colWidth + padding));
    const itemBottom = item.y + estimateItemHeight(item) + padding;
    if (itemBottom > columns[col]) {
      columns[col] = itemBottom;
    }
  });
  
  // Find column with most space
  const bestCol = columns.indexOf(Math.min(...columns));
  return { x: startX + bestCol * (colWidth + padding), y: columns[bestCol] };
};
```

#### Doctor's Note Zone
```javascript
const findDoctorsNotePosition = (newItem, existingItems) => {
  const rowHeight = 620;
  const colWidth = 470;
  
  // Grid-based positioning (left-to-right, top-to-bottom)
  const grid = Array(maxRows).fill(null).map(() => Array(maxCols).fill(false));
  
  // Mark occupied positions
  noteZoneItems.forEach((item) => {
    const col = Math.floor((item.x - ZONE.x) / colWidth);
    const row = Math.floor((item.y - ZONE.y) / rowHeight);
    grid[row][col] = true;
  });
  
  // Find first available position
  for (let row = 0; row < maxRows; row++) {
    for (let col = 0; col < maxCols; col++) {
      if (!grid[row][col]) {
        return { x: ZONE.x + col * colWidth, y: ZONE.y + row * rowHeight };
      }
    }
  }
};
```

#### Retrieved Data Zone
```javascript
const findRetrievedDataZonePosition = (newItem, existingItems) => {
  // Similar grid-based system for EHR data and lab results
  // Handles items with type: 'ehr-data', 'lab-result', 'patient-data'
};
```

### Height Estimation

```javascript
const estimateItemHeight = (item) => {
  if (item.height !== 'auto') return item.height;
  
  if (item.type === 'todo' && item.todoData) {
    const baseHeight = 120;
    const mainTodoHeight = 50;
    const subTodoHeight = 30;
    
    let totalHeight = baseHeight;
    item.todoData.todos.forEach((todo) => {
      totalHeight += mainTodoHeight;
      totalHeight += (todo.subTodos?.length || 0) * subTodoHeight;
    });
    
    return Math.min(Math.max(totalHeight, 200), 1200);
  }
  
  return 450; // Default fallback
};
```

---

## Backend Integration

### API Base URL Configuration

```typescript
const API_BASE_URL = 
  process.env.REACT_APP_API_BASE_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : window.location.origin);
```

### Storage Architecture

**Redis (Primary):**
- Persistent storage across all Vercel instances
- Key: `boardItems`
- Value: JSON array of all board items

**Static File (Fallback):**
- `api/data/boardItems.json`
- Used when Redis unavailable
- Initial data source

### Data Flow

```
Frontend (Canvas.tsx)
    ↓ HTTP Request
Backend (server-redis.js)
    ↓ Read/Write
Redis Database
    ↓ Pub/Sub
All Vercel Instances
    ↓ SSE
All Connected Clients
```

---

## SSE Real-Time Updates

### Connection Setup

```typescript
// In parent component (App.tsx)
useEffect(() => {
  const eventSource = new EventSource(`${API_BASE_URL}/api/events`);
  
  eventSource.addEventListener('new-item', (event) => {
    const data = JSON.parse(event.data);
    setItems(prev => [...prev, data.item]);
  });
  
  eventSource.addEventListener('focus', (event) => {
    const data = JSON.parse(event.data);
    if (window.centerOnItem) {
      window.centerOnItem(data.itemId, data.focusOptions?.zoom);
    }
  });
  
  return () => eventSource.close();
}, []);
```

### Event Types

**1. new-item**
```json
{
  "event": "new-item",
  "item": { /* full item object */ },
  "timestamp": "2025-11-04T10:30:00.000Z",
  "action": "created"
}
```

**2. focus**
```json
{
  "event": "focus",
  "itemId": "item-123",
  "subElement": "task-1",
  "focusOptions": {
    "zoom": 1.2,
    "duration": 1200
  }
}
```

**3. items-reset**
```json
{
  "event": "items-reset",
  "message": "Dynamic items cleared",
  "removedCount": 15,
  "remainingCount": 5
}
```

### Backend SSE Implementation

```javascript
// server-redis.js
const sseClients = new Set();

app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  sseClients.add(res);
  
  // Heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  }, 15000);
  
  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

const broadcastSSE = async (message) => {
  const eventType = message.event || "new-item";
  const data = { ...message };
  delete data.event;
  
  // Broadcast to local clients
  for (const client of sseClients) {
    client.write(`event: ${eventType}\n`);
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
  
  // Publish to Redis for cross-instance delivery
  if (redisPublisher?.isReady) {
    await redisPublisher.publish('sse-events', JSON.stringify({
      event: eventType,
      data: data,
      timestamp: Date.now()
    }));
  }
};
```

### Redis Pub/Sub for Multi-Instance

```javascript
// Subscriber receives events from other instances
await redisSubscriber.subscribe('sse-events', (message) => {
  const { event, data } = JSON.parse(message);
  
  // Broadcast to all local SSE clients
  for (const client of sseClients) {
    client.write(`event: ${event}\n`);
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  }
});
```

---

## User Interactions

### Adding Items

**Doctor's Note Button:**
```typescript
const handleAddNote = async () => {
  const response = await fetch(`${API_BASE_URL}/api/doctor-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: '' })
  });
  
  if (response.ok) {
    const data = await response.json();
    // Auto-focus on new note
    setTimeout(() => {
      window.centerOnItem(data.item.id, 1.0, 1200);
    }, 300);
  }
};
```

### Board Reset

**Reset Flow:**
```typescript
const handleResetBoard = async () => {
  setShowResetModal(false);
  setIsDeleting(true);
  
  // Filter items to delete (exclude 'raw' and 'single-encounter')
  const itemsToDelete = items.filter((item) => {
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
  
  // Batch delete to avoid race conditions
  const response = await fetch(`${API_BASE_URL}/api/board-items/batch-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemIds: itemsToDelete.map(i => i.id) })
  });
  
  // Reset EASL conversation history
  await fetch(`${API_BASE_URL}/api/easl-reset`, { method: 'POST' });
  
  onResetBoard(); // Trigger reload
  setIsDeleting(false);
  setShowResultModal(true);
};
```

### Item Selection

```typescript
const handleCanvasClick = (e) => {
  if (e.target === canvasRef.current) {
    onSelectItem(null); // Deselect when clicking empty canvas
  }
};
```

---

## API Integration

### Create Todo Item

**Endpoint:** `POST /api/todos`

```typescript
// Request
{
  "title": "Patient Follow-up Tasks",
  "description": "Tasks for patient care",
  "todo_items": [
    { "text": "Review lab results", "status": "todo" },
    { "text": "Schedule follow-up", "status": "in_progress" }
  ]
}

// Response
{
  "id": "item-1730720400000-abc123",
  "type": "todo",
  "x": 4260,
  "y": 60,
  "width": 420,
  "height": 250,
  "todoData": { /* ... */ },
  "createdAt": "2025-11-04T10:30:00.000Z"
}
```

### Create Agent Result

**Endpoint:** `POST /api/agents`

```typescript
// Request
{
  "title": "Analysis Result",
  "content": "Patient shows improvement...",
  "zone": "task-management-zone"  // Optional zone parameter
}

// Response
{
  "id": "item-1730720400000-def456",
  "type": "agent",
  "x": 4260,
  "y": 310,
  "width": 520,
  "height": 300,
  "agentData": {
    "title": "Analysis Result",
    "markdown": "Patient shows improvement..."
  }
}
```

### Create Lab Result

**Endpoint:** `POST /api/lab-results`

```typescript
// Request
{
  "parameter": "Hemoglobin",
  "value": 13.5,
  "unit": "g/dL",
  "status": "optimal",
  "range": { "min": 12, "max": 16 },
  "trend": "stable"
}

// Auto-positioned in Retrieved Data Zone
```

### Create Doctor's Note

**Endpoint:** `POST /api/doctor-notes`

```typescript
// Request
{
  "content": "Patient assessment notes..."
}

// Auto-positioned in Doctor's Note Zone
```

### Focus on Item

**Endpoint:** `POST /api/focus`

```typescript
// Request
{
  "itemId": "item-123",
  "subElement": "task-1",  // Optional
  "focusOptions": {
    "zoom": 1.2,
    "duration": 1200
  }
}

// Broadcasts SSE event to all clients
// Canvas receives event and calls centerOnItem()
```

### Batch Delete

**Endpoint:** `POST /api/board-items/batch-delete`

```typescript
// Request
{
  "itemIds": ["item-1", "item-2", "item-3"]
}

// Response
{
  "message": "Successfully deleted 3 items",
  "deletedCount": 3,
  "remainingCount": 12,
  "deletedIds": ["item-1", "item-2", "item-3"]
}
```

---

## EASL Integration

### Sending Queries to EASL

```typescript
const sendQueryToEASL = (query: string, metadata?: any) => {
  const easlIframe = document.querySelector(
    '[data-item-id="iframe-item-easl-interface"] iframe'
  ) as HTMLIFrameElement;
  
  if (!easlIframe?.contentWindow) {
    console.error('❌ EASL iframe not found');
    return;
  }
  
  easlIframe.contentWindow.postMessage({
    type: 'CANVAS_QUERY',
    payload: {
      query: query,
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    }
  }, 'https://easl-board.vercel.app');
};

// Expose globally
window.sendQueryToEASL = sendQueryToEASL;
```

### Receiving EASL Responses

```typescript
useEffect(() => {
  const handleEASLResponse = (event: MessageEvent) => {
    if (event.origin !== 'https://easl-board.vercel.app') return;
    
    if (event.data?.type === 'EASL_RESPONSE') {
      const { response, timestamp } = event.data.payload;
      console.log('📥 Received response from EASL:', response);
      // Handle response (create board item, show notification, etc.)
    }
  };
  
  window.addEventListener('message', handleEASLResponse);
  return () => window.removeEventListener('message', handleEASLResponse);
}, []);
```

### EASL Conversation History

**Save Response:** `POST /api/easl-response`
```typescript
{
  "response_type": "complete",
  "query": "What are the patient's vitals?",
  "response": "The patient's current vitals are...",
  "metadata": {}
}
```

**Get History:** `GET /api/easl-history?limit=10`

**Reset History:** `POST /api/easl-reset`

---

## Board Reset System

### Reset Modal

```typescript
<AnimatePresence>
  {showResetModal && (
    <ModalOverlay onClick={() => setShowResetModal(false)}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalTitle>⚠️ Reset Board</ModalTitle>
        <ModalText>This will delete ALL API-added items</ModalText>
        
        <ModalList>
          <li>Todos and Enhanced Todos</li>
          <li>Agent Results</li>
          <li>Doctor's Notes</li>
          <li>Lab Results</li>
        </ModalList>
        
        <ModalWarning>⚠️ This action CANNOT be undone!</ModalWarning>
        
        <ModalButtons>
          <ModalButton variant="secondary" onClick={() => setShowResetModal(false)}>
            Cancel
          </ModalButton>
          <ModalButton variant="danger" onClick={handleResetBoard}>
            Delete All Items
          </ModalButton>
        </ModalButtons>
      </ModalContent>
    </ModalOverlay>
  )}
</AnimatePresence>
```

### Items Preserved During Reset

- Items with IDs containing `'raw'`
- Items with IDs containing `'single-encounter'`
- Static items from `boardItems.json`

### Items Deleted During Reset

- Items starting with `'enhanced'`
- Items starting with `'item'`
- Items starting with `'doctor-note'`
- All API-created todos, agents, lab results

---

## Global Window Functions

The Canvas component exposes several functions globally for external access:

```typescript
// Focus on item with animation
window.centerOnItem(itemId: string, zoom?: number, duration?: number)

// Focus on sub-element within item
window.centerOnSubElement(itemId: string, selector: string, zoom?: number, duration?: number)

// Place item at viewport center
window.placeItemAtViewportCenter(itemId: string)

// Get viewport center in world coordinates
window.getViewportCenterWorld() => { x: number, y: number, zoom: number }

// Send query to EASL iframe
window.sendQueryToEASL(query: string, metadata?: any)
```

---

## Performance Optimizations

### Animation Frame Management

```typescript
// Cancel ongoing animations before starting new ones
if (animationFrameRef.current !== null) {
  cancelAnimationFrame(animationFrameRef.current);
  animationFrameRef.current = null;
}

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };
}, []);
```

### Memoized Callbacks

All event handlers use `useCallback` to prevent unnecessary re-renders:

```typescript
const handleZoomIn = useCallback(() => {
  // Zoom logic
}, [viewport, updateViewport]);
```

### Efficient Item Rendering

```typescript
<AnimatePresence>
  {items.map((item) => (
    <BoardItem
      key={item.id}
      item={item}
      isSelected={selectedItemId === item.id}
      onUpdate={onUpdateItem}
      onDelete={onDeleteItem}
      onSelect={onSelectItem}
      zoom={viewport.zoom}
    />
  ))}
</AnimatePresence>
```

---

## Error Handling

### API Error Handling

```typescript
try {
  const response = await fetch(`${API_BASE_URL}/api/doctor-notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: '' })
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Note created:', data.item.id);
  }
} catch (error) {
  console.error('❌ Failed to create note:', error);
}
```

### SSE Connection Resilience

```typescript
// Backend heartbeat keeps connection alive
const heartbeat = setInterval(() => {
  try {
    res.write(`event: ping\ndata: ${Date.now()}\n\n`);
  } catch (err) {
    clearInterval(heartbeat);
  }
}, 15000);
```

---

## Best Practices

### 1. Always Use Batch Operations
```typescript
// ❌ Bad: Multiple individual deletes
items.forEach(item => {
  await fetch(`/api/board-items/${item.id}`, { method: 'DELETE' });
});

// ✅ Good: Single batch delete
await fetch('/api/board-items/batch-delete', {
  method: 'POST',
  body: JSON.stringify({ itemIds: items.map(i => i.id) })
});
```

### 2. Let Backend Handle Positioning
```typescript
// ❌ Bad: Calculate position in frontend
const x = 4260;
const y = calculateNextPosition();

// ✅ Good: Let backend auto-position
await fetch('/api/todos', {
  method: 'POST',
  body: JSON.stringify({ title, todo_items })
  // No x, y provided - backend handles it
});
```

### 3. Use SSE for Real-Time Updates
```typescript
// ✅ Good: SSE automatically updates all clients
// No need to manually refresh or poll
```

### 4. Cleanup Event Listeners
```typescript
useEffect(() => {
  const handler = (e) => { /* ... */ };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

---

## Troubleshooting

### Items Not Appearing

1. Check Redis connection: `GET /api/health`
2. Verify item in storage: `GET /api/board-items`
3. Check SSE connection: Browser DevTools → Network → EventStream
4. Verify zone coordinates match item position

### Focus Not Working

1. Ensure `window.centerOnItem` is defined
2. Check item exists in items array
3. Verify item has valid x, y coordinates
4. Check for animation conflicts (cancel existing animations)

### Positioning Issues

1. Verify zone boundaries in `zone-config.json`
2. Check `estimateItemHeight` for item type
3. Ensure backend positioning functions are called
4. Review collision detection logic

### SSE Connection Lost

1. Check heartbeat in Network tab (should ping every 15s)
2. Verify CORS headers on backend
3. Check Redis Pub/Sub connection
4. Restart SSE connection on error

---

## Summary

The Canvas component is a sophisticated infinite canvas system that provides:

- **Smooth pan/zoom navigation** with mouse and keyboard controls
- **Zone-based organization** with visual boundaries and auto-positioning
- **Real-time synchronization** via SSE and Redis Pub/Sub
- **Collision-free placement** with intelligent positioning algorithms
- **Focus animations** for smooth navigation to items and sub-elements
- **EASL integration** for AI-powered interactions
- **Batch operations** for efficient data management
- **Multi-instance support** via Redis for serverless deployment

The tight integration with `server-redis.js` ensures data consistency, real-time updates across all clients, and persistent storage for production use.
