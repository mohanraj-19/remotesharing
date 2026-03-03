/**
 * Screen Sharing Implementation
 * Uses getDisplayMedia API for capturing screen
 */

let captureStream;
let screenTrack;
let isScreenSharing = false;

/**
 * Start Screen Capture
 */
async function startScreenCapture() {
  try {
    console.log('Starting screen capture...');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      showNotification('Screen sharing not supported in your browser', 'error');
      return;
    }

    // Request screen capture
    const displayMediaOptions = {
      video: {
        cursor: 'always'
      },
      audio: false
    };

    captureStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
    
    console.log('Screen capture started');
    showNotification('Screen sharing started', 'success');

    // Get video track
    const videoTracks = captureStream.getVideoTracks();
    if (videoTracks.length === 0) {
      throw new Error('No video tracks obtained from screen capture');
    }

    screenTrack = videoTracks[0];
    isScreenSharing = true;

    // Handle track end (user stops screen share)
    screenTrack.addEventListener('ended', handleScreenCaptureEnded);

    // Add track to peer connection
    if (peerConnection) {
      const sender = peerConnection.addTrack(screenTrack, captureStream);
      
      // Listen for track changes
      screenTrack.addEventListener('mute', () => {
        console.log('Screen track muted');
      });

      screenTrack.addEventListener('unmute', () => {
        console.log('Screen track unmuted');
      });

      // Update encoding parameters for better quality
      await updateScreenShareQuality();
    }

  } catch (error) {
    if (error.name === 'NotAllowedError') {
      console.log('Screen capture permission denied by user');
      showNotification('Screen capture permission denied', 'info');
    } else if (error.name === 'NotFoundError') {
      console.error('No suitable screen capture source found');
      showNotification('No screen capture source found', 'error');
    } else {
      console.error('Error starting screen capture:', error);
      showNotification('Failed to start screen sharing', 'error');
    }
    isScreenSharing = false;
  }
}

/**
 * Handle Screen Capture Ended
 */
function handleScreenCaptureEnded() {
  console.log('Screen capture ended');
  isScreenSharing = false;
  showNotification('Screen sharing stopped', 'info');

  // Optionally end connection when user stops sharing
  // endConnection();
}

/**
 * Update Screen Share Quality
 */
async function updateScreenShareQuality() {
  try {
    const videoQuality = storage.get('videoQuality', 'medium');
    const frameRate = parseInt(storage.get('frameRate', 30));

    const qualitySettings = {
      low: { width: 1280, height: 720 },
      medium: { width: 1920, height: 1080 },
      high: { width: 2560, height: 1440 }
    };

    const settings = qualitySettings[videoQuality] || qualitySettings.medium;

    if (peerConnection) {
      const senders = peerConnection.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');

      if (videoSender) {
        const params = videoSender.getParameters();
        
        if (!params.encodings) {
          params.encodings = [{}];
        }

        params.encodings[0].width = settings.width;
        params.encodings[0].height = settings.height;
        params.encodings[0].frameRate = frameRate;
        params.encodings[0].maxBitrate = 2500000; // 2.5 Mbps

        await videoSender.setParameters(params);
        console.log('Screen share quality updated:', settings);
      }
    }
  } catch (error) {
    console.error('Error updating screen quality:', error);
  }
}

/**
 * Stop Screen Capture
 */
function stopScreenCapture() {
  if (captureStream) {
    captureStream.getTracks().forEach(track => {
      track.stop();
    });
    captureStream = null;
    screenTrack = null;
    isScreenSharing = false;
    console.log('Screen capture stopped');
  }
}

/**
 * Switch to Canvas Capture (for screen recording with overlays)
 */
async function startCanvasCapture() {
  try {
    console.log('Starting canvas capture...');

    // This would be used if we want to capture with overlays
    const remoteCanvas = document.getElementById('remote-canvas');
    
    if (!remoteCanvas) {
      console.error('Canvas element not found');
      return;
    }

    const canvasStream = remoteCanvas.captureStream(30); // 30 FPS
    
    if (peerConnection) {
      const videoTracks = canvasStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const sender = peerConnection.addTrack(videoTracks[0], canvasStream);
        console.log('Canvas capture started');
      }
    }
  } catch (error) {
    console.error('Error starting canvas capture:', error);
  }
}

/**
 * Get Screen Share Statistics
 */
async function getScreenShareStats() {
  if (!peerConnection) return null;

  try {
    const stats = await peerConnection.getStats();
    const screenStats = {
      resolution: {},
      frameRate: 0,
      bitrate: 0
    };

    stats.forEach(report => {
      if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
        screenStats.frameRate = report.framesPerSecond || 0;
        screenStats.bytesSent = report.bytesSent || 0;
        screenStats.framesSent = report.framesSent || 0;
      }

      if (report.type === 'video' && report.remoteCandidate) {
        // This is outdated stats format, just for compatibility
      }

      if (report.type === 'selected-candidate-pair') {
        screenStats.bytesReceived = report.bytesReceived || 0;
      }
    });

    return screenStats;
  } catch (error) {
    console.error('Error getting screen share stats:', error);
    return null;
  }
}

/**
 * Check if screen sharing is supported
 */
function isScreenSharingSupported() {
  return !!(
    navigator.mediaDevices &&
    (navigator.mediaDevices.getDisplayMedia ||
     navigator.mediaDevices.webkitGetDisplayMedia)
  );
}

/**
 * Request Screen Permission
 */
async function requestScreenPermission() {
  try {
    if (!isScreenSharingSupported()) {
      showNotification('Screen sharing not supported', 'error');
      return false;
    }

    // Try to capture a test frame to check permission
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: false
    });

    // Stop it immediately - we're just checking permission
    stream.getTracks().forEach(track => track.stop());
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Handle Keyboard Control Toggle
 */
let keyboardControlEnabled = false;

function toggleKeyboardControl() {
  keyboardControlEnabled = !keyboardControlEnabled;
  
  const btn = document.getElementById('toggle-keyboard');
  if (btn) {
    btn.classList.toggle('active-control', keyboardControlEnabled);
  }

  if (keyboardControlEnabled) {
    showNotification('Keyboard control enabled', 'success');
  } else {
    showNotification('Keyboard control disabled', 'info');
  }
}

/**
 * Initialize screen sharing UI
 */
document.addEventListener('DOMContentLoaded', () => {
  if (isScreenSharingSupported()) {
    console.log('Screen sharing is supported');
  } else {
    console.warn('Screen sharing is not supported');
  }
});
