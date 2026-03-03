/**
 * WebRTC Peer Connection Handler
 * Explanation of WebRTC Internal Workings:
 * 
 * 1. SDP (Session Description Protocol): Text protocol for describing multimedia sessions
 *    - Offers and Answers contain media types, codecs, bandwidth, IP/port combinations
 * 
 * 2. ICE (Interactive Connectivity Establishment): Mechanism to find the best path between peers
 *    - Uses STUN servers to discover public IP addresses
 *    - Uses TURN servers as relay when direct connection fails
 * 
 * 3. Signaling: Out-of-band communication to exchange SDP and ICE candidates
 *    - Not part of WebRTC spec - we use Socket.IO for this
 *    - Establishes the connection, WebRTC maintains it
 * 
 * 4. Connection Flow:
 *    Caller: createOffer() → setLocalDescription() → send via signaling channel
 *    Receiver: receives offer → setRemoteDescription() → createAnswer() → setLocalDescription() → send answer
 *    Both: ICE candidates exchanged → connection established → media streams flow
 */

let peerConnection;
let dataChannel;
let localStream;
let remoteStream;
let signalingState = 'stable';

const RTC_CONFIG = {
  iceServers: window.iceServers || [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
  ],
  iceCandidatePoolSize: 10
};

/**
 * Initialize WebRTC Peer Connection
 */
function initializeWebRTC(role) {
  console.log('Initializing WebRTC as', role);
  
  try {
    // Create RTCPeerConnection
    peerConnection = new (window.RTCPeerConnection ||
                         window.webkitRTCPeerConnection ||
                         window.mozRTCPeerConnection)({
      iceServers: RTC_CONFIG.iceServers,
      iceCandidatePoolSize: RTC_CONFIG.iceCandidatePoolSize
    });

    // Handle ICE candidates
    peerConnection.addEventListener('icecandidate', handleICECandidate);
    
    // Handle connection state changes
    peerConnection.addEventListener('connectionstatechange', handleConnectionStateChange);
    peerConnection.addEventListener('iceconnectionstatechange', handleICEConnectionStateChange);
    peerConnection.addEventListener('signalingstatechange', handleSignalingStateChange);
    
    // Handle remote stream
    peerConnection.addEventListener('track', handleRemoteTrack);
    
    // Create data channel for control messages
    if (role === 'caller') {
      dataChannel = peerConnection.createDataChannel('control');
      setupDataChannel(dataChannel);
    } else {
      peerConnection.addEventListener('datachannel', (event) => {
        dataChannel = event.channel;
        setupDataChannel(dataChannel);
      });
    }

    // Start screen sharing
    startScreenCapture();

    // If caller, create and send offer
    if (role === 'caller') {
      createOffer();
    }

    showNotification('WebRTC connection initialized', 'info');
  } catch (error) {
    console.error('Error initializing WebRTC:', error);
    showNotification('Failed to initialize WebRTC', 'error');
  }
}

/**
 * Create WebRTC Offer
 */
async function createOffer() {
  try {
    console.log('Creating WebRTC offer...');
    
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: true
    });

    await peerConnection.setLocalDescription(offer);
    signalingState = 'have-local-offer';

    // Send offer to remote peer via signaling channel
    socket.emit('webrtc-offer', {
      targetUserID: connectedUserID,
      offer: offer
    });

    console.log('WebRTC offer sent');
  } catch (error) {
    console.error('Error creating offer:', error);
    showNotification('Failed to create WebRTC offer', 'error');
  }
}

/**
 * Handle WebRTC Offer
 */
async function handleWebRTCOffer(offer) {
  try {
    console.log('Handling WebRTC offer...');

    if (signalingState !== 'stable') {
      console.warn('Signaling state not stable, ignoring offer');
      return;
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    signalingState = 'have-remote-offer';

    // Create answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    signalingState = 'stable';

    // Send answer back
    socket.emit('webrtc-answer', {
      targetUserID: connectedUserID,
      answer: answer
    });

    console.log('WebRTC answer sent');
  } catch (error) {
    console.error('Error handling offer:', error);
    showNotification('Failed to handle WebRTC offer', 'error');
  }
}

/**
 * Handle WebRTC Answer
 */
async function handleWebRTCAnswer(answer) {
  try {
    console.log('Handling WebRTC answer...');

    if (peerConnection.signalingState !== 'have-local-offer') {
      console.warn('Not in correct signaling state for answer');
      return;
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log('WebRTC connection ready');
  } catch (error) {
    console.error('Error handling answer:', error);
    showNotification('Failed to handle WebRTC answer', 'error');
  }
}

/**
 * Handle ICE Candidate
 */
async function handleICECandidate(event) {
  if (event.candidate) {
    console.log('New ICE candidate:', event.candidate);

    // Send ICE candidate to remote peer
    socket.emit('webrtc-ice-candidate', {
      targetUserID: connectedUserID,
      candidate: event.candidate
    });
  } else {
    console.log('ICE gathering completed');
  }
}

/**
 * Add ICE Candidate
 */
async function addICECandidate(candidate) {
  try {
    if (!peerConnection) {
      console.warn('Peer connection not initialized');
      return;
    }

    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    console.log('ICE candidate added');
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
  }
}

/**
 * Handle Remote Track (video/audio stream)
 */
function handleRemoteTrack(event) {
  console.log('Remote track received:', event.track);

  if (event.streams && event.streams[0]) {
    remoteStream = event.streams[0];
    
    const remoteVideo = document.getElementById('remote-video');
    if (remoteVideo) {
      remoteVideo.srcObject = remoteStream;
      const loadingIndicator = document.getElementById('screen-loading');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    }

    showNotification('Remote screen shared', 'success');
  }
}

/**
 * Handle Connection State Change
 */
function handleConnectionStateChange() {
  console.log('Connection state changed:', peerConnection.connectionState);

  switch (peerConnection.connectionState) {
    case 'connected':
      console.log('Peers connected');
      showNotification('Connected to peer', 'success');
      break;
    case 'disconnected':
      console.log('Peers disconnected');
      showNotification('Disconnected from peer', 'warning');
      break;
    case 'failed':
      console.log('Connection failed');
      showNotification('Connection failed', 'error');
      closeWebRTCConnection();
      break;
    case 'closed':
      console.log('Connection closed');
      break;
  }
}

/**
 * Handle ICE Connection State Change
 */
function handleICEConnectionStateChange() {
  console.log('ICE connection state changed:', peerConnection.iceConnectionState);

  // Update statistics
  updateWebRTCStats();
}

/**
 * Handle Signaling State Change
 */
function handleSignalingStateChange() {
  console.log('Signaling state changed:', peerConnection.signalingState);
  signalingState = peerConnection.signalingState;
}

/**
 * Setup Data Channel
 */
function setupDataChannel(dc) {
  console.log('Setting up data channel:', dc.label);

  dc.addEventListener('message', (event) => {
    console.log('Data channel message:', event.data);
    
    try {
      const message = JSON.parse(event.data);
      handleDataChannelMessage(message);
    } catch (e) {
      console.error('Invalid message on data channel:', e);
    }
  });

  dc.addEventListener('error', (error) => {
    console.error('Data channel error:', error);
  });

  dc.addEventListener('open', () => {
    console.log('Data channel opened');
  });

  dc.addEventListener('close', () => {
    console.log('Data channel closed');
  });
}

/**
 * Send Data Channel Message
 */
function sendDataChannelMessage(message) {
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(JSON.stringify(message));
  } else {
    console.warn('Data channel not ready:', dataChannel?.readyState);
  }
}

/**
 * Handle Data Channel Message
 */
function handleDataChannelMessage(message) {
  console.log('Data channel message received:', message.type);

  switch (message.type) {
    case 'info':
      console.log('Peer info:', message.data);
      break;
    case 'ping':
      sendDataChannelMessage({ type: 'pong', timestamp: Date.now() });
      break;
    case 'pong':
      calculateLatency(message.timestamp);
      break;
  }
}

/**
 * Calculate latency
 */
function calculateLatency(remoteTimestamp) {
  const latency = Date.now() - remoteTimestamp;
  const latencyElem = document.getElementById('latency');
  
  if (latencyElem) {
    latencyElem.textContent = `${latency} ms`;
  }
}

/**
 * Update WebRTC Statistics
 */
async function updateWebRTCStats() {
  if (!peerConnection) return;

  try {
    const stats = await peerConnection.getStats();

    stats.forEach(report => {
      if (report.type === 'inbound-rtp') {
        if (report.mediaType === 'video') {
          const bytesReceived = report.bytesReceived;
          const packetsLost = report.packetsLost;
          
          console.log('Inbound video stats:', {
            bytesReceived,
            packetsLost,
            jitter: report.jitter
          });

          // Update bitrate calculation
          updateBitrateCalculation(bytesReceived);
        }
      }

      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        console.log('ICE candidate pair stats:', {
          currentRoundTripTime: report.currentRoundTripTime,
          availableOutgoingBitrate: report.availableOutgoingBitrate
        });
      }
    });
  } catch (error) {
    console.error('Error getting stats:', error);
  }
}

let lastBytesReceived = 0;
let lastStatsTime = Date.now();

/**
 * Update bitrate calculation
 */
function updateBitrateCalculation(bytesReceived) {
  const currentTime = Date.now();
  const timeDiff = (currentTime - lastStatsTime) / 1000; // in seconds
  const bytesDiff = bytesReceived - lastBytesReceived;
  
  if (timeDiff > 0) {
    const bitrate = (bytesDiff * 8) / timeDiff / 1000; // in kbps
    const bitrateElem = document.getElementById('bitrate');
    
    if (bitrateElem) {
      bitrateElem.textContent = `${Math.round(bitrate)} kbps`;
    }
  }

  lastBytesReceived = bytesReceived;
  lastStatsTime = currentTime;
}

/**
 * Close WebRTC Connection
 */
function closeWebRTCConnection() {
  console.log('Closing WebRTC connection...');

  if (dataChannel) {
    dataChannel.close();
  }

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  const remoteVideo = document.getElementById('remote-video');
  if (remoteVideo) {
    remoteVideo.srcObject = null;
  }

  stopConnectionTimer();
}

/**
 * Send heartbeat/ping
 */
setInterval(() => {
  if (dataChannel && dataChannel.readyState === 'open') {
    sendDataChannelMessage({
      type: 'ping',
      timestamp: Date.now()
    });
  }
}, 5000);

// WebRTC event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Listen for WebRTC events from Socket.IO
  if (socket) {
    socket.off('webrtc-offer');
    socket.off('webrtc-answer');
    socket.off('webrtc-ice-candidate');

    socket.on('webrtc-offer', (data) => {
      console.log('WebRTC offer received from:', data.fromUserID);
      handleWebRTCOffer(data.offer);
    });

    socket.on('webrtc-answer', (data) => {
      console.log('WebRTC answer received from:', data.fromUserID);
      handleWebRTCAnswer(data.answer);
    });

    socket.on('webrtc-ice-candidate', (data) => {
      console.log('WebRTC ICE candidate received from:', data.fromUserID);
      addICECandidate(data.candidate);
    });
  }
});
