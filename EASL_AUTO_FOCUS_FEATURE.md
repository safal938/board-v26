# EASL Auto-Focus Feature

## Overview

When a query is sent to the EASL interface via the `/api/send-to-easl` endpoint, the viewport automatically focuses on the EASL iframe, making it easier for users to see the response.

## Implementation

### Server-Side (api/server-redis.js)

The `/api/send-to-easl` endpoint now broadcasts two events:

1. **easl-query event**: Sends the query to the EASL iframe
2. **focus event**: Triggers viewport focus on the EASL iframe

```javascript
// POST /api/send-to-easl
app.post("/api/send-to-easl", (req, res) => {
  const { query, metadata } = req.body;

  // Broadcast query to EASL iframe
  sseClients.forEach((client) => {
    client.write(`event: easl-query\n`);
    client.write(`data: ${JSON.stringify({ query, metadata })}\n\n`);
  });

  // Broadcast focus event to center viewport on EASL iframe
  const focusPayload = {
    event: "focus",
    itemId: "iframe-item-easl-interface",
    focusOptions: {
      zoom: 1.0,
      highlight: false,
      duration: 1000,
      scrollIntoView: true,
    },
    timestamp: new Date().toISOString(),
  };
  broadcastSSE(focusPayload);

  res.json({
    success: true,
    message: "Query sent to EASL",
    query,
    metadata,
  });
});
```

### Client-Side (Canvas2.tsx)

Canvas2 already has a focus event listener that:
1. Selects the focused item
2. Centers the viewport on it with smooth animation

```typescript
es.addEventListener('focus', (event: any) => {
  try {
    const data = JSON.parse(event.data);
    console.log('🎯 Focus event received:', data);
    const itemId = data.objectId || data.itemId;
    if (itemId) {
      handleSelectItem(itemId);
      setTimeout(() => {
        centerOnItem(
          itemId, 
          data.focusOptions?.zoom || 0.8, 
          data.focusOptions?.duration || 1200
        );
      }, 100);
    }
  } catch (err) {
    console.error('❌ Error handling focus event:', err);
  }
});
```

## Focus Options

The focus event includes these options:

| Option | Value | Description |
|--------|-------|-------------|
| `zoom` | `1.0` | Zoom level (1.0 = 100%) |
| `highlight` | `false` | Whether to highlight the item |
| `duration` | `1000` | Animation duration in milliseconds |
| `scrollIntoView` | `true` | Whether to scroll the item into view |

## Usage

### API Call Example

```bash
curl -X POST http://localhost:3001/api/send-to-easl \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the DILI diagnosis for Sarah Miller?",
    "metadata": {
      "source": "clinical-workflow"
    }
  }'
```

### Response

```json
{
  "success": true,
  "message": "Query sent to EASL",
  "query": "What is the DILI diagnosis for Sarah Miller?",
  "metadata": {
    "source": "clinical-workflow"
  }
}
```

## User Experience Flow

1. **API Call**: External system calls `/api/send-to-easl` with a query
2. **Query Sent**: Query is sent to EASL iframe via SSE
3. **Auto-Focus**: Viewport automatically centers on EASL iframe
4. **User Sees**: User immediately sees the EASL interface where the response will appear
5. **Response**: EASL processes the query and displays the response

## Benefits

✅ **Better UX**: Users don't need to manually navigate to the EASL iframe
✅ **Automatic**: Focus happens automatically when query is sent
✅ **Smooth Animation**: Viewport smoothly pans to the iframe
✅ **Consistent**: Same behavior as when new items are added to the board

## EASL Iframe ID

The EASL iframe must have the ID: `iframe-item-easl-interface`

This is the standard ID used in the board items configuration.

## Testing

To test the auto-focus feature:

1. Start the server: `npm start`
2. Open the canvas in your browser
3. Send a query to EASL:
   ```bash
   curl -X POST http://localhost:3001/api/send-to-easl \
     -H "Content-Type: application/json" \
     -d '{"query": "Test query"}'
   ```
4. Observe the viewport automatically centering on the EASL iframe

## Related Features

- **New Item Focus**: Similar auto-focus when new items are added
- **Manual Focus**: `/api/focus` endpoint for manual focus control
- **SSE Events**: Real-time communication via Server-Sent Events

## Notes

- The focus event is broadcast to all connected clients
- The 100ms delay before centering allows the item selection to complete
- The zoom level is set to 1.0 (100%) for the EASL iframe
- The animation duration is 1000ms (1 second) for smooth transition
