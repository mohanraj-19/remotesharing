/**
 * Remote Control Implementation
 * Handles mouse and keyboard control from remote user
 */

let mouseControlEnabled = false;
let keyboardControlEnabled = false;

const remoteVideoContainer = document.getElementById('remote-video');

/**
 * Toggle Mouse Control
 */
function toggleMouseControl() {
  mouseControlEnabled = !mouseControlEnabled;
  
  const btn = document.getElementById('toggle-mouse');
  if (btn) {
    btn.classList.toggle('active-control', mouseControlEnabled);
  }

  if (mouseControlEnabled) {
    setupMouseEventListeners();
    showNotification('Mouse control enabled', 'success');
  } else {
    removeMouseEventListeners();
    showNotification('Mouse control disabled', 'info');
  }
}

/**
 * Setup Mouse Event Listeners
 */
function setupMouseEventListeners() {
  if (!remoteVideoContainer) return;

  remoteVideoContainer.addEventListener('mousedown', handleRemoteMouseDown);
  remoteVideoContainer.addEventListener('mouseup', handleRemoteMouseUp);
  remoteVideoContainer.addEventListener('mousemove', handleRemoteMouseMove);
  remoteVideoContainer.addEventListener('wheel', handleRemoteScroll);
  remoteVideoContainer.addEventListener('contextmenu', (e) => e.preventDefault());

  console.log('Mouse event listeners attached');
}

/**
 * Remove Mouse Event Listeners
 */
function removeMouseEventListeners() {
  if (!remoteVideoContainer) return;

  remoteVideoContainer.removeEventListener('mousedown', handleRemoteMouseDown);
  remoteVideoContainer.removeEventListener('mouseup', handleRemoteMouseUp);
  remoteVideoContainer.removeEventListener('mousemove', handleRemoteMouseMove);
  remoteVideoContainer.removeEventListener('wheel', handleRemoteScroll);

  console.log('Mouse event listeners removed');
}

/**
 * Handle Remote Mouse Move
 */
let lastMouseMoveTime = 0;

function handleRemoteMouseMove(event) {
  // Throttle to avoid too many messages
  const now = Date.now();
  if (now - lastMouseMoveTime < 50) return;
  lastMouseMoveTime = now;

  const { x, y } = getRelativeMousePosition(event);

  sendRemoteControlAction('mouse-move', { x, y });
}

/**
 * Handle Remote Mouse Down
 */
function handleRemoteMouseDown(event) {
  event.preventDefault();
  
  const { x, y } = getRelativeMousePosition(event);
  const button = event.button; // 0: left, 1: middle, 2: right

  sendRemoteControlAction('mouse-down', { x, y, button });
}

/**
 * Handle Remote Mouse Up
 */
function handleRemoteMouseUp(event) {
  event.preventDefault();
  
  const { x, y } = getRelativeMousePosition(event);
  const button = event.button;

  sendRemoteControlAction('mouse-up', { x, y, button });
}

/**
 * Handle Remote Scroll
 */
function handleRemoteScroll(event) {
  event.preventDefault();
  
  const { x, y } = getRelativeMousePosition(event);
  const deltaY = event.deltaY > 0 ? -5 : 5; // Scroll direction

  sendRemoteControlAction('scroll', { x, y, delta: deltaY });
}

/**
 * Get Relative Mouse Position on video
 */
function getRelativeMousePosition(event) {
  const container = event.target;
  const rect = container.getBoundingClientRect();
  
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // Normalize to 0-1 range
  const normalizedX = Math.max(0, Math.min(1, x / rect.width));
  const normalizedY = Math.max(0, Math.min(1, y / rect.height));

  return {
    x: normalizedX,
    y: normalizedY,
    px: Math.round(x), // Pixel position
    py: Math.round(y)
  };
}

/**
 * Setup Keyboard Event Listeners
 */
function setupKeyboardEventListeners() {
  document.addEventListener('keydown', handleRemoteKeyDown);
  document.addEventListener('keyup', handleRemoteKeyUp);
  console.log('Keyboard event listeners attached');
}

/**
 * Remove Keyboard Event Listeners
 */
function removeKeyboardEventListeners() {
  document.removeEventListener('keydown', handleRemoteKeyDown);
  document.removeEventListener('keyup', handleRemoteKeyUp);
  console.log('Keyboard event listeners removed');
}

/**
 * Handle Remote Keyboard Down
 */
function handleRemoteKeyDown(event) {
  if (!keyboardControlEnabled) return;

  // Prevent browser shortcuts
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
  }

  const keyInfo = getKeyboardInfo(event);
  sendRemoteControlAction('key-down', keyInfo);
}

/**
 * Handle Remote Keyboard Up
 */
function handleRemoteKeyUp(event) {
  if (!keyboardControlEnabled) return;

  const keyInfo = getKeyboardInfo(event);
  sendRemoteControlAction('key-up', keyInfo);
}

/**
 * Send Remote Control Action
 */
function sendRemoteControlAction(action, data) {
  if (!socket || !socket.connected) {
    console.warn('Socket not connected');
    return;
  }

  socket.emit('remote-control-action', {
    targetUserID: connectedUserID,
    action,
    ...data
  });
}

/**
 * Handle Incoming Remote Control Action
 */
function handleRemoteControlAction(action, data) {
  console.log('Remote control action received:', action);

  switch (action) {
    case 'mouse-move':
      handleIncomingMouseMove(data);
      break;
    case 'mouse-down':
      handleIncomingMouseDown(data);
      break;
    case 'mouse-up':
      handleIncomingMouseUp(data);
      break;
    case 'scroll':
      handleIncomingScroll(data);
      break;
    case 'key-down':
      handleIncomingKeyDown(data);
      break;
    case 'key-up':
      handleIncomingKeyUp(data);
      break;
  }
}

// Implementation of actual remote control would require:
// - OS-level keyboard/mouse input simulation
// - This would require a native application or server-side daemon
// - For web-only solution, we can simulate in canvas or iframe

/**
 * Simulated Mouse Move (for visualization)
 */
function handleIncomingMouseMove(data) {
  if (remoteVideoContainer) {
    // You could draw a cursor on canvas here
    // This is just for visualization
  }
}

function handleIncomingMouseDown(data) {
  console.log('Remote mouse click at', data.x, data.y);
}

function handleIncomingMouseUp(data) {
  console.log('Remote mouse release');
}

function handleIncomingScroll(data) {
  console.log('Remote scroll', data.delta);
}

function handleIncomingKeyDown(data) {
  console.log('Remote key down:', data.key);
}

function handleIncomingKeyUp(data) {
  console.log('Remote key up:', data.key);
}

/**
 * Special Key Handling
 */
const SPECIAL_KEYS = {
  'Control': 'ctrl',
  'Alt': 'alt',
  'Shift': 'shift',
  'Meta': 'cmd',
  'Enter': 'enter',
  'Backspace': 'backspace',
  'Delete': 'delete',
  'Tab': 'tab',
  'Escape': 'esc',
  'ArrowUp': 'up',
  'ArrowDown': 'down',
  'ArrowLeft': 'left',
  'ArrowRight': 'right',
  ' ': 'space'
};

/**
 * Get keyboard shortcut string
 */
function getKeyCombination(event) {
  const keys = [];
  
  if (event.ctrlKey) keys.push('Ctrl');
  if (event.altKey) keys.push('Alt');
  if (event.shiftKey) keys.push('Shift');
  if (event.metaKey) keys.push('Cmd');
  
  const keyName = SPECIAL_KEYS[event.key] || event.key;
  keys.push(keyName);
  
  return keys.join('+');
}

/**
 * Send keyboard shortcut
 */
function sendKeyboardShortcut(combination) {
  sendRemoteControlAction('keyboard-shortcut', { combination });
}

// Listen for remote control events from Socket.IO
if (socket) {
  socket.off('remote-control-action');
  socket.on('remote-control-action', (data) => {
    console.log('Received remote control action:', data);
    handleRemoteControlAction(data.action, data);
  });
}

// Update control toggles
document.addEventListener('DOMContentLoaded', () => {
  // Setup keyboard control toggle
  document.addEventListener('keydown', (e) => {
    // Global keyboard shortcut to toggle control: Ctrl+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (currentState === APP_STATE.CONNECTED) {
        toggleKeyboardControl();
      }
    }

    // Global shortcut to toggle mouse: Ctrl+M
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault();
      if (currentState === APP_STATE.CONNECTED) {
        toggleMouseControl();
      }
    }
  });
});
