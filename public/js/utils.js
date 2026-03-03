/**
 * Utility functions for Any Desk
 */

/**
 * Display notification
 */
function showNotification(message, type = 'info', duration = 3000) {
  const notification = document.getElementById('notification');
  
  notification.textContent = message;
  notification.className = `notification show ${type}`;
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, duration);
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  const text = element.value || element.textContent;
  
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Copied to clipboard!', 'success', 2000);
  }).catch(err => {
    showNotification('Failed to copy', 'error');
    console.error('Clipboard error:', err);
  });
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format time duration
 */
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get current timestamp
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Validate connection ID format
 */
function validateConnectionID(id) {
  const regex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return regex.test(id);
}

/**
 * Show screen
 */
function showScreen(screenId) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  
  // Show target screen
  document.getElementById(screenId).classList.add('active');
}

/**
 * Get element safe
 */
function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`Element with ID "${id}" not found`);
  }
  return element;
}

/**
 * Create element with attributes
 */
function createElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'class') {
      element.className = value;
    } else if (key === 'style') {
      Object.entries(value).forEach(([prop, val]) => {
        element.style[prop] = val;
      });
    } else {
      element.setAttribute(key, value);
    }
  });
  
  if (content) {
    if (typeof content === 'string') {
      element.textContent = content;
    } else {
      element.appendChild(content);
    }
  }
  
  return element;
}

/**
 * Debounce function
 */
function debounce(func, delay = 300) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit = 300) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Check if browser supports WebRTC
 */
function isWebRTCSupported() {
  const hasGetUserMedia = !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
  
  const hasGetDisplayMedia = !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getDisplayMedia
  );
  
  const hasPeerConnection = !!(
    window.RTCPeerConnection ||
    window.webkitRTCPeerConnection ||
    window.mozRTCPeerConnection
  );
  
  return hasGetUserMedia && hasGetDisplayMedia && hasPeerConnection;
}

/**
 * Check browser capabilities
 */
function checkBrowserCapabilities() {
  const capabilities = {
    webrtc: isWebRTCSupported(),
    websockets: 'WebSocket' in window,
    localStorage: 'localStorage' in window,
    serviceWorker: 'serviceWorker' in navigator
  };
  
  console.log('Browser Capabilities:', capabilities);
  
  if (!capabilities.webrtc) {
    showNotification('WebRTC not supported in your browser', 'warning');
  }
  
  return capabilities;
}

/**
 * Get device info
 */
function getDeviceInfo() {
  const ua = navigator.userAgent;
  
  return {
    browser: ua,
    platform: navigator.platform,
    language: navigator.language,
    online: navigator.onLine,
    cores: navigator.hardwareConcurrency || 'Unknown',
    memory: navigator.deviceMemory || 'Unknown',
    connection: navigator.connection?.effectiveType || 'Unknown'
  };
}

/**
 * Request full screen
 */
function requestFullScreen(element = document.documentElement) {
  if (element.requestFullscreen) {
    element.requestFullscreen();
  } else if (element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if (element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if (element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}

/**
 * Exit full screen
 */
function exitFullScreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen();
  }
}

/**
 * Get screen dimensions
 */
function getScreenDimensions() {
  return {
    width: window.screen.width,
    height: window.screen.height,
    availWidth: window.screen.availWidth,
    availHeight: window.screen.availHeight,
    colorDepth: window.screen.colorDepth,
    pixelDepth: window.screen.pixelDepth
  };
}

/**
 * Detect platform
 */
function getPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('linux')) return 'linux';
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'ios';
  
  return 'unknown';
}

/**
 * Keyboard event handler
 */
function getKeyboardInfo(event) {
  return {
    key: event.key,
    code: event.code,
    keyCode: event.keyCode,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    metaKey: event.metaKey
  };
}

/**
 * Mouse event handler
 */
function getMouseInfo(event) {
  return {
    x: event.clientX,
    y: event.clientY,
    screenX: event.screenX,
    screenY: event.screenY,
    button: event.button,
    buttons: event.buttons,
    type: event.type
  };
}

/**
 * Download file
 */
function downloadFile(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Local storage wrapper
 */
const storage = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },
  
  get: (key, defaultValue = null) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error('Storage error:', e);
      return defaultValue;
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Storage error:', e);
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Storage error:', e);
    }
  }
};

/**
 * Initialize app
 */
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  console.log('Browser Capabilities:', checkBrowserCapabilities());
  console.log('Device Info:', getDeviceInfo());
  console.log('Platform:', getPlatform());
  console.log('Screen:', getScreenDimensions());
});
