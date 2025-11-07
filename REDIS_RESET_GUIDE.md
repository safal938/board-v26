# Redis Storage Reset Guide

## Quick Reset Methods

### Method 1: Using the Reset Script (Easiest)

```bash
./reset-redis.sh
```

Then choose an option:
1. Reload from static file (full reset)
2. Clear all dynamic items
3. Clear Task Management Zone only
4. Reset EASL conversation history

### Method 2: Direct API Calls

#### Option A: Reload from Static File (Full Reset)
Resets Redis to the original `boardItems.json` content:

```bash
curl -X POST http://localhost:3001/api/reload-board-items \
  -H "Content-Type: application/json"
```

**What it does:**
- Clears Redis storage
- Loads fresh data from `src/data/boardItems.json`
- Resets to initial state

#### Option B: Clear All Dynamic Items
Removes all API-added items but keeps static items:

```bash
curl -X DELETE http://localhost:3001/api/dynamic-items
```

**What it removes:**
- Todos and Enhanced Todos
- Agent Results
- Lab Results
- Doctor's Notes
- Images
- Dashboard Components

**What it keeps:**
- Raw EHR Data
- Single Encounter Documents
- Static components from boardItems.json

#### Option C: Clear Task Management Zone Only
Removes only items from the Task Management Zone:

```bash
curl -X DELETE http://localhost:3001/api/task-zone
```

#### Option D: Reset EASL Conversation History
Clears only the EASL chat history:

```bash
curl -X POST http://localhost:3001/api/easl-reset \
  -H "Content-Type: application/json"
```

### Method 3: Direct Redis Commands

If you have Redis CLI access:

```bash
# Connect to Redis
redis-cli -u $REDIS_URL

# Delete the boardItems key
DEL boardItems

# Or flush entire database (CAUTION!)
FLUSHDB
```

### Method 4: Using Redis GUI

If using a Redis GUI (like RedisInsight):
1. Connect to your Redis instance
2. Find the `boardItems` key
3. Delete it
4. Restart the server to reload from static file

## Environment Variables

Make sure your `.env` file has the Redis URL:

```env
REDIS_URL=redis://localhost:6379
# or
REDIS_URL=redis://your-redis-host:6379
```

## What Happens After Reset?

1. **Server Restart**: The server will reload data from `src/data/boardItems.json`
2. **Frontend Refresh**: Refresh the browser to see the reset state
3. **SSE Reconnection**: SSE clients will reconnect automatically

## Verification

Check if reset was successful:

```bash
# Get current item count
curl -s http://localhost:3001/api/board-items | jq 'length'

# Get item types
curl -s http://localhost:3001/api/board-items | jq '[.[] | .type] | unique'
```

## Common Use Cases

### 1. Development Reset
Reset to clean state during development:
```bash
curl -X POST http://localhost:3001/api/reload-board-items \
  -H "Content-Type: application/json"
```

### 2. Clear Test Data
Remove all test items but keep static data:
```bash
curl -X DELETE http://localhost:3001/api/dynamic-items
```

### 3. Clear Specific Zone
Remove items from a specific zone:
```bash
curl -X DELETE http://localhost:3001/api/task-zone
```

### 4. Reset Chat History
Clear EASL conversation history:
```bash
curl -X POST http://localhost:3001/api/easl-reset \
  -H "Content-Type: application/json"
```

## Troubleshooting

### Redis Not Connected
If you see "Redis not available" errors:
1. Check if Redis is running: `redis-cli ping`
2. Verify REDIS_URL in `.env`
3. Check Redis connection logs in server console

### Items Not Resetting
1. Make sure the server is running
2. Check server logs for errors
3. Verify the API endpoint is accessible
4. Try restarting the server

### Frontend Not Updating
1. Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)
2. Clear browser cache
3. Check browser console for SSE connection

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/reload-board-items` | POST | Full reset from static file |
| `/api/dynamic-items` | DELETE | Clear all dynamic items |
| `/api/task-zone` | DELETE | Clear Task Management Zone |
| `/api/easl-reset` | POST | Reset EASL chat history |
| `/api/reset-cache` | POST | Force reload (legacy) |

## Safety Notes

⚠️ **Warning**: These operations cannot be undone!

- Always backup important data before resetting
- In production, consider using Redis snapshots
- Test reset procedures in development first
- Document any custom data before clearing

## Automated Reset

For automated testing or CI/CD:

```bash
#!/bin/bash
# reset-for-testing.sh

echo "Resetting Redis for testing..."
curl -X POST http://localhost:3001/api/reload-board-items \
  -H "Content-Type: application/json" \
  --silent --output /dev/null

echo "Waiting for reset to complete..."
sleep 2

echo "Verifying reset..."
ITEM_COUNT=$(curl -s http://localhost:3001/api/board-items | jq 'length')
echo "Current item count: $ITEM_COUNT"

if [ "$ITEM_COUNT" -gt 0 ]; then
  echo "✅ Reset successful"
  exit 0
else
  echo "❌ Reset failed"
  exit 1
fi
```

## Related Documentation

- [API Commands](API-COMMANDS.md)
- [Redis Changes Summary](documentation/REDIS_CHANGES_SUMMARY.md)
- [Server Documentation](api/server-redis.js)
