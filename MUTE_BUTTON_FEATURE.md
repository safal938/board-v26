# Mute Button Feature

## Overview

Added a mute/unmute button to control the agent's audio state. The button is positioned between the Plus button and the Reset button in the bottom-right control panel.

## Features

### Visual States

**Unmuted (Active)**
- 🎤 Green background (`#10b981`)
- Mic icon (Mic)
- Tooltip: "Mute Agent"

**Muted**
- 🔇 Red background (`#ef4444`)
- Mic off icon (MicOff)
- Tooltip: "Unmute Agent"

### Functionality

- **Click to toggle**: Clicking the button toggles between muted and unmuted states
- **API Integration**: Sends POST request to `https://api2.medforce-ai.com/mute`
- **Visual feedback**: Success/error modals show operation result
- **Hover effects**: Button lifts slightly on hover with enhanced shadow

## API Integration

### Endpoint
```
POST https://api2.medforce-ai.com/mute
```

### Request
```json
{}
```

### Response
The response is logged to console and triggers a success/error modal.

## Implementation Details

### State Management
```typescript
const [isMuted, setIsMuted] = useState(false);
```

### Handler Function
```typescript
const handleToggleMute = useCallback(async () => {
  try {
    const response = await fetch('https://api2.medforce-ai.com/mute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    if (!response.ok) throw new Error('Failed to toggle mute');
    
    const result = await response.json();
    setIsMuted(!isMuted);
    
    // Show success modal
    setAlertModal({
      isOpen: true,
      message: `Agent ${!isMuted ? 'muted' : 'unmuted'} successfully`,
      type: 'success'
    });
  } catch (error) {
    // Show error modal
    setAlertModal({
      isOpen: true,
      message: 'Failed to toggle mute. Please try again.',
      type: 'error'
    });
  }
}, [isMuted]);
```

## Button Position

The button is located in the bottom-right control panel:

```
┌─────────────────┐
│   Add Menu      │ (dropdown)
└─────────────────┘
┌─────────────────┐
│   Plus Button   │ (Add items)
└─────────────────┘
┌─────────────────┐
│  Mute Button    │ ← NEW
└─────────────────┘
┌─────────────────┐
│  Reset Button   │ (Delete all)
└─────────────────┘
```

## Styling

### Unmuted State
- Background: Green (`#10b981`)
- Shadow: `0 2px 8px rgba(16, 185, 129, 0.3)`
- Hover shadow: `0 4px 12px rgba(16, 185, 129, 0.4)`

### Muted State
- Background: Red (`#ef4444`)
- Shadow: `0 2px 8px rgba(239, 68, 68, 0.3)`
- Hover shadow: `0 4px 12px rgba(239, 68, 68, 0.4)`

### Common Styles
- Size: 44px × 44px
- Border radius: 8px
- Icon size: 20px
- Transition: all 0.2s ease
- Hover effect: translateY(-1px)

## User Experience

1. **Initial State**: Button shows green with Mic icon (unmuted)
2. **Click to Mute**: 
   - Button turns red
   - Icon changes to MicOff
   - API request sent
   - Success modal appears: "Agent muted successfully"
3. **Click to Unmute**:
   - Button turns green
   - Icon changes to Mic
   - API request sent
   - Success modal appears: "Agent unmuted successfully"
4. **Error Handling**: If API fails, error modal shows: "Failed to toggle mute. Please try again."

## Icons Used

- **Mic** (lucide-react): Shown when unmuted
- **MicOff** (lucide-react): Shown when muted

## Testing

To test the mute button:

1. Click the green mic button
2. Verify it turns red and shows MicOff icon
3. Check console for API request log
4. Verify success modal appears
5. Click again to unmute
6. Verify it turns green and shows Mic icon

## Future Enhancements

Possible improvements:
- Add loading state during API call
- Persist mute state in localStorage
- Add keyboard shortcut (e.g., Ctrl+M)
- Show mute status in other parts of the UI
- Add sound effect on toggle
- Sync mute state across multiple tabs
