/**
 * Main Application Handler
 */

let socket;
let sessionID;
let userID;
let myConnectionID;
let connectedUserID;
let pendingTargetUserID;
let connectionStartTime;
let connectionTimer;

const APP_STATE = {
  IDLE: 'idle',
  WAITING: 'waiting',
  REQUESTING: 'requesting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected'
};

let currentState = APP_STATE.IDLE;

/**
 * Initialize Socket.IO connection
 */
function initializeSocket() {
  socket = io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  // Connection events
  socket.on('connect', () => {
    console.log('Connected to server:', socket.id);
    updateStatusIndicator(true);
    showNotification('Connected to server', 'success');

    if (myConnectionID) {
      registerUser();
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    updateStatusIndicator(false);
    showNotification('Disconnected from server', 'warning');
  });

  socket.on('connection-info', (data) => {
    console.log('Connection info received:', data);
    sessionID = data.sessionID;
    // Store ICE servers globally for WebRTC
    window.iceServers = data.iceServers;
  });

  socket.on('registration-success', (data) => {
    console.log('Registration successful:', data);
    userID = data.userID;
    updateUserIDDisplay();

    if (pendingTargetUserID) {
      const queuedTarget = pendingTargetUserID;
      pendingTargetUserID = null;
      connectedUserID = queuedTarget;
      socket.emit('request-connection', {
        targetUserID: queuedTarget,
        sourceUserID: userID
      });
      console.log('Queued connection request sent to:', queuedTarget);
    }
  });

  // Connection request events
  socket.on('incoming-connection-request', (data) => {
    console.log('Incoming connection request:', data);
    handleIncomingRequest(data);
  });

  socket.on('webrtc-offer', (data) => {
    console.log('WebRTC offer received from:', data.fromUserID);
    connectedUserID = data.fromUserID;
    handleWebRTCOffer(data.offer);
  });

  socket.on('webrtc-answer', (data) => {
    console.log('WebRTC answer received from:', data.fromUserID);
    connectedUserID = data.fromUserID;
    handleWebRTCAnswer(data.answer);
  });

  socket.on('webrtc-ice-candidate', (data) => {
    addICECandidate(data.candidate);
  });

  socket.on('remote-control-action', (data) => {
    handleRemoteControlAction(data.action, data);
  });

  socket.on('file-transfer-request', handleFileTransferRequest);
  socket.on('file-transfer-chunk', handleFileTransferChunk);
  socket.on('file-transfer-complete', handleFileTransferComplete);
  socket.on('chat-message', (data) => {
    addChatMessage(data);

    if (storage.get('soundEnabled', true)) {
      playNotificationSound();
    }
  });

  socket.on('connection-accepted', (data) => {
    console.log('Connection accepted:', data);
    connectedUserID = data.byUserID;
    currentState = APP_STATE.CONNECTED;
    initializeWebRTC('caller');
    updateConnectionUI(data.byUserID);
    showScreen('remote-screen');
    startConnectionTimer();
  });

  socket.on('connection-rejected', (data) => {
    console.log('Connection rejected:', data);
    showNotification(data.reason || 'Connection rejected', 'warning');
    currentState = APP_STATE.IDLE;
    showScreen('auth-screen');
  });

  socket.on('connection-request-sent', (data) => {
    console.log('Connection request sent:', data);
    currentState = APP_STATE.REQUESTING;
    showNotification('Connection request sent', 'info');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
    showNotification(error.message || 'Connection error', 'error');
  });
}

/**
 * Register user on server
 */
function registerUser() {
  if (!socket || !socket.connected) {
    return;
  }

  if (!myConnectionID) {
    return;
  }

  const displayName = storage.get('displayName', 'Anonymous');
  
  socket.emit('register-user', {
    userID: myConnectionID,
    displayName: displayName
  });
}

/**
 * Update status indicator
 */
function updateStatusIndicator(isOnline) {
  const indicator = document.getElementById('status-indicator');
  if (indicator) {
    if (isOnline) {
      indicator.textContent = 'Online';
      indicator.classList.add('online');
      indicator.classList.remove('offline');
    } else {
      indicator.textContent = 'Offline';
      indicator.classList.remove('online');
      indicator.classList.add('offline');
    }
  }
}

/**
 * Update user ID display
 */
function updateUserIDDisplay() {
  const userIdDisplay = document.getElementById('user-id-display');
  const myIdInput = document.getElementById('my-id');
  
  if (userIdDisplay && myConnectionID) {
    userIdDisplay.textContent = `ID: ${myConnectionID}`;
  }
  
  if (myIdInput) {
    myIdInput.value = myConnectionID || '';
  }
}

/**
 * Fetch configuration from server
 */
async function fetchServerConfig() {
  try {
    const response = await fetch('/api/config');
    const data = await response.json();
    
    if (data.success) {
      window.iceServers = data.iceServers;
      window.maxFileSize = data.maxFileSize;
      window.chunkSize = data.chunkSize;
      console.log('Server config fetched:', data);
    }
  } catch (error) {
    console.error('Failed to fetch server config:', error);
  }
}

/**
 * Generate new ID
 */
async function generateNewID() {
  try {
    const response = await fetch('/api/generate-id', {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      myConnectionID = data.connectionID;
      userID = myConnectionID;
      sessionID = data.sessionID;
      updateUserIDDisplay();
      showNotification('New ID generated', 'success');
      storage.set('myConnectionID', myConnectionID);
      storage.set('sessionID', sessionID);
      registerUser();
    }
  } catch (error) {
    console.error('Error generating ID:', error);
    showNotification('Failed to generate ID', 'error');
  }
}

/**
 * Connect to user
 */
function connectToUser() {
  const connectIdInput = document.getElementById('connect-id');
  const targetID = connectIdInput.value.toUpperCase();
  
  if (!targetID) {
    showNotification('Please enter a connection ID', 'warning');
    return;
  }
  
  if (!validateConnectionID(targetID)) {
    showNotification('Invalid connection ID format', 'error');
    return;
  }
  
  if (!socket || !socket.connected) {
    showNotification('Not connected to server', 'error');
    return;
  }

  if (!userID) {
    pendingTargetUserID = targetID;
    registerUser();
    showNotification('Registering your ID, please wait...', 'info');
    return;
  }
  
  connectedUserID = targetID;
  socket.emit('request-connection', {
    targetUserID: targetID,
    sourceUserID: userID
  });
  
  console.log('Connection request sent to:', targetID);
}

/**
 * Handle incoming connection request
 */
function handleIncomingRequest(data) {
  connectedUserID = data.fromUserID;
  const autoAccept = storage.get('autoAccept', false);
  
  if (autoAccept) {
    acceptConnection();
  } else {
    showRequestScreen(data.fromUserID);
  }
}

/**
 * Show request screen
 */
function showRequestScreen(fromUserID) {
  const requestFromUser = document.getElementById('request-from-user');
  requestFromUser.textContent = `User ${fromUserID} is requesting to connect`;
  
  currentState = APP_STATE.WAITING;
  showScreen('request-screen');
  
  // Play notification sound if enabled
  if (storage.get('soundEnabled', true)) {
    playNotificationSound();
  }
}

/**
 * Accept connection
 */
function acceptConnection() {
  if (!socket || !socket.connected) {
    showNotification('Not connected to server', 'error');
    return;
  }

  if (!connectedUserID) {
    showNotification('Missing requester ID. Ask them to reconnect.', 'error');
    return;
  }
  
  socket.emit('accept-connection', {
    fromUserID: connectedUserID
  });
  
  currentState = APP_STATE.CONNECTED;
  initializeWebRTC('callee');
  updateConnectionUI(connectedUserID);
  showScreen('remote-screen');
  startConnectionTimer();
}

/**
 * Reject connection
 */
function rejectConnection() {
  if (!socket || !socket.connected) {
    showNotification('Not connected to server', 'error');
    return;
  }

  if (!connectedUserID) {
    showNotification('Missing requester ID. Ask them to reconnect.', 'error');
    return;
  }
  
  socket.emit('reject-connection', {
    fromUserID: connectedUserID,
    reason: 'User rejected connection'
  });
  
  currentState = APP_STATE.IDLE;
  showScreen('auth-screen');
}

/**
 * End connection
 */
function endConnection() {
  if (confirm('Are you sure you want to end this connection?')) {
    closeWebRTCConnection();
    currentState = APP_STATE.IDLE;
    connectedUserID = null;
    showScreen('auth-screen');
    showNotification('Connection ended', 'info');
  }
}

/**
 * Update connection UI
 */
function updateConnectionUI(userID) {
  const connectedTo = document.getElementById('connected-to');
  if (connectedTo) {
    connectedTo.textContent = userID;
  }
}

/**
 * Start connection timer
 */
function startConnectionTimer() {
  connectionStartTime = Date.now();
  
  clearInterval(connectionTimer);
  connectionTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - connectionStartTime) / 1000);
    const connectionTimeElem = document.getElementById('connection-time');
    
    if (connectionTimeElem) {
      connectionTimeElem.textContent = formatTime(elapsed);
    }
  }, 1000);
}

/**
 * Stop connection timer
 */
function stopConnectionTimer() {
  clearInterval(connectionTimer);
  const connectionTimeElem = document.getElementById('connection-time');
  if (connectionTimeElem) {
    connectionTimeElem.textContent = '00:00';
  }
}

/**
 * Toggle settings
 */
function toggleSettings() {
  const currentScreen = document.querySelector('.screen.active').id;
  
  if (currentScreen === 'settings-screen') {
    showScreen('auth-screen');
  } else if (currentScreen === 'auth-screen') {
    loadSettingsUI();
    showScreen('settings-screen');
  } else {
    loadSettingsUI();
    showScreen('settings-screen');
  }
}

/**
 * Load settings into UI
 */
function loadSettingsUI() {
  const displayName = document.getElementById('display-name');
  const autoAccept = document.getElementById('auto-accept');
  const soundEnabled = document.getElementById('sound-enabled');
  const videoQuality = document.getElementById('video-quality');
  const frameRate = document.getElementById('frame-rate');
  
  if (displayName) displayName.value = storage.get('displayName', 'Anonymous');
  if (autoAccept) autoAccept.checked = storage.get('autoAccept', false);
  if (soundEnabled) soundEnabled.checked = storage.get('soundEnabled', true);
  if (videoQuality) videoQuality.value = storage.get('videoQuality', 'medium');
  if (frameRate) frameRate.value = storage.get('frameRate', 30);
}

/**
 * Save settings
 */
function saveSettings() {
  const displayName = document.getElementById('display-name');
  const autoAccept = document.getElementById('auto-accept');
  const soundEnabled = document.getElementById('sound-enabled');
  const videoQuality = document.getElementById('video-quality');
  const frameRate = document.getElementById('frame-rate');
  
  if (displayName) storage.set('displayName', displayName.value);
  if (autoAccept) storage.set('autoAccept', autoAccept.checked);
  if (soundEnabled) storage.set('soundEnabled', soundEnabled.checked);
  if (videoQuality) storage.set('videoQuality', videoQuality.value);
  if (frameRate) storage.set('frameRate', frameRate.value);
  
  showNotification('Settings saved', 'success');
  showScreen('auth-screen');
  
  // Re-register user with new display name
  registerUser();
}

/**
 * Play notification sound
 */
function playNotificationSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 1000;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

/**
 * Get connection logs from server
 */
async function getConnectionLogs() {
  try {
    const response = await fetch('/api/logs');
    const data = await response.json();
    
    if (data.success) {
      console.log('Connection logs:', data.logs);
      return data.logs;
    }
  } catch (error) {
    console.error('Failed to fetch logs:', error);
  }
  
  return [];
}

/**
 * Initialize Application
 */
async function initializeApp() {
  console.log('Initializing Any Disk application...');
  
  // Check browser support
  if (!isWebRTCSupported()) {
    showNotification('Your browser does not support WebRTC', 'error');
    return;
  }
  
  // Fetch server config
  await fetchServerConfig();
  
  // Initialize Socket.IO
  initializeSocket();
  
  // Generate or load connection ID
  myConnectionID = storage.get('myConnectionID');
  
  if (!myConnectionID) {
    await generateNewID();
  } else {
    userID = myConnectionID;
    updateUserIDDisplay();
    sessionID = storage.get('sessionID');
    registerUser();
  }
  
  // Load saved settings
  loadSettingsUI();
  
  console.log('Initialization complete');
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Handle page close
window.addEventListener('beforeunload', (event) => {
  if (currentState === APP_STATE.CONNECTED) {
    event.preventDefault();
    event.returnValue = '';
  }
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('Page hidden');
  } else {
    console.log('Page visible');
  }
});
