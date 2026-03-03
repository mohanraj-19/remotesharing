const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIO = require('socket.io');

const config = require('./config/config');
const Logger = require('./utils/logger');
const IDGenerator = require('./utils/idGenerator');
const apiRoutes = require('./routes/api');
const { rateLimit } = require('./middleware/auth');

const logger = new Logger(config.logging.file);

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(rateLimit());

// Store for active connections
const activeConnections = new Map();
const pendingRequests = new Map();
const connectionLogs = [];

/**
 * Connection Log Entry
 */
function logConnectionEvent(event, details) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details
  };
  connectionLogs.push(logEntry);
  
  // Keep only last 1000 logs
  if (connectionLogs.length > 1000) {
    connectionLogs.shift();
  }

  logger.logConnection(event, details.userID, details);
}

// API Routes
app.use(apiRoutes);

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Get connection logs
app.get('/api/logs', (req, res) => {
  res.json({
    success: true,
    logs: connectionLogs,
    count: connectionLogs.length
  });
});

// Create HTTP/HTTPS Server
let server;
if (config.ssl.enabled && fs.existsSync(config.ssl.certPath) && fs.existsSync(config.ssl.keyPath)) {
  const options = {
    key: fs.readFileSync(config.ssl.keyPath),
    cert: fs.readFileSync(config.ssl.certPath)
  };
  server = https.createServer(options, app);
  logger.info('HTTPS server created');
} else {
  server = http.createServer(app);
  logger.info('HTTP server created (use HTTPS in production)');
}

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

/**
 * Socket.IO Events Handler
 */
io.on('connection', (socket) => {
  const sessionID = IDGenerator.generateSessionID();
  const peerID = IDGenerator.generatePeerID();

  logger.info('New socket connection', { socketID: socket.id, sessionID, peerID });

  // Send initial connection info
  socket.emit('connection-info', {
    socketID: socket.id,
    sessionID,
    peerID,
    iceServers: config.webrtc.iceServers
  });

  // Register user with unique ID
  socket.on('register-user', (data) => {
    const { userID, displayName } = data || {};
    
    if (!userID) {
      socket.emit('error', { message: 'User ID required' });
      return;
    }

    socket.userID = userID;
    socket.displayName = displayName || 'Anonymous';
    socket.join(`user-${userID}`);

    activeConnections.set(socket.id, {
      socketID: socket.id,
      userID,
      displayName: socket.displayName,
      connectedAt: new Date().toISOString(),
      connectedTo: null,
      status: 'idle'
    });

    logConnectionEvent('user-registered', {
      userID,
      displayName: socket.displayName,
      socketID: socket.id
    });

    socket.emit('registration-success', { userID, sessionID });
  });

  // Request connection to another user
  socket.on('request-connection', (data) => {
    const { targetUserID, sourceUserID: requestSourceUserID } = data || {};
    const sourceUserID = socket.userID || requestSourceUserID;

    if (sourceUserID && !socket.userID) {
      socket.userID = sourceUserID;
      socket.join(`user-${sourceUserID}`);
    }

    if (!sourceUserID || !targetUserID) {
      socket.emit('error', { message: 'Missing user IDs' });
      return;
    }

    logConnectionEvent('connection-request-sent', {
      userID: sourceUserID,
      targetUserID,
      socketID: socket.id
    });

    // Send connection request to target user
    io.to(`user-${targetUserID}`).emit('incoming-connection-request', {
      fromUserID: sourceUserID,
      fromSocketID: socket.id,
      timestamp: new Date().toISOString()
    });

    // Store pending request
    pendingRequests.set(`${sourceUserID}-${targetUserID}`, {
      fromUserID: sourceUserID,
      toUserID: targetUserID,
      fromSocketID: socket.id,
      timestamp: Date.now()
    });

    socket.emit('connection-request-sent', { targetUserID });
  });

  // Accept connection request
  socket.on('accept-connection', (data) => {
    const { fromUserID } = data;
    const targetUserID = socket.userID;

    logConnectionEvent('connection-accepted', {
      userID: targetUserID,
      acceptedFrom: fromUserID,
      socketID: socket.id
    });

    // Notify the initiating user
    io.to(`user-${fromUserID}`).emit('connection-accepted', {
      byUserID: targetUserID,
      bySocketID: socket.id
    });

    // Update connection status
    const connectionKey = Object.keys(activeConnections).find(
      key => activeConnections.get(key).userID === fromUserID
    );
    
    if (connectionKey) {
      activeConnections.get(connectionKey).status = 'connected';
      activeConnections.get(connectionKey).connectedTo = targetUserID;
    }

    const currentConnection = activeConnections.get(socket.id);
    if (currentConnection) {
      currentConnection.status = 'connected';
      currentConnection.connectedTo = fromUserID;
    }

    socket.emit('connection-established', { withUserID: fromUserID });
  });

  // Reject connection request
  socket.on('reject-connection', (data) => {
    const { fromUserID } = data;
    const targetUserID = socket.userID;

    logConnectionEvent('connection-rejected', {
      userID: targetUserID,
      rejectedFrom: fromUserID,
      socketID: socket.id
    });

    io.to(`user-${fromUserID}`).emit('connection-rejected', {
      byUserID: targetUserID,
      reason: data.reason || 'User rejected connection'
    });

    socket.emit('rejection-sent', { toUserID: fromUserID });
  });

  // WebRTC Signaling
  socket.on('webrtc-offer', (data) => {
    const { targetUserID, offer } = data;
    const sourceUserID = socket.userID;

    logger.debug('WebRTC offer received', { sourceUserID, targetUserID });

    io.to(`user-${targetUserID}`).emit('webrtc-offer', {
      fromUserID: sourceUserID,
      offer
    });
  });

  socket.on('webrtc-answer', (data) => {
    const { targetUserID, answer } = data;
    const sourceUserID = socket.userID;

    logger.debug('WebRTC answer received', { sourceUserID, targetUserID });

    io.to(`user-${targetUserID}`).emit('webrtc-answer', {
      fromUserID: sourceUserID,
      answer
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    const { targetUserID, candidate } = data;
    const sourceUserID = socket.userID;

    io.to(`user-${targetUserID}`).emit('webrtc-ice-candidate', {
      fromUserID: sourceUserID,
      candidate
    });
  });

  // Remote Control Events
  socket.on('remote-control-action', (data) => {
    const { targetUserID, action, x, y, key, button } = data;
    const sourceUserID = socket.userID;

    logger.logRemoteControl(action, sourceUserID, targetUserID, {
      x,
      y,
      key,
      button
    });

    io.to(`user-${targetUserID}`).emit('remote-control-action', {
      fromUserID: sourceUserID,
      action,
      x,
      y,
      key,
      button,
      timestamp: Date.now()
    });
  });

  // File Transfer
  socket.on('start-file-transfer', (data) => {
    const { targetUserID, fileName, fileSize, fileID } = data;
    const sourceUserID = socket.userID;

    logger.logFileTransfer('started', sourceUserID, targetUserID, fileName, fileSize);

    io.to(`user-${targetUserID}`).emit('file-transfer-request', {
      fromUserID: sourceUserID,
      fileName,
      fileSize,
      fileID,
      timestamp: Date.now()
    });
  });

  socket.on('file-transfer-chunk', (data) => {
    const { targetUserID, fileID, chunk, chunkIndex, totalChunks } = data;
    const sourceUserID = socket.userID;

    io.to(`user-${targetUserID}`).emit('file-transfer-chunk', {
      fromUserID: sourceUserID,
      fileID,
      chunk,
      chunkIndex,
      totalChunks
    });
  });

  socket.on('file-transfer-complete', (data) => {
    const { targetUserID, fileID, fileName } = data;
    const sourceUserID = socket.userID;

    logger.logFileTransfer('completed', sourceUserID, targetUserID, fileName, 0);

    io.to(`user-${targetUserID}`).emit('file-transfer-complete', {
      fromUserID: sourceUserID,
      fileID,
      fileName
    });
  });

  // Chat Messages
  socket.on('chat-message', (data) => {
    const { targetUserID, message } = data;
    const sourceUserID = socket.userID;

    logger.info('Chat message sent', {
      from: sourceUserID,
      to: targetUserID,
      length: message.length
    });

    io.to(`user-${targetUserID}`).emit('chat-message', {
      fromUserID: sourceUserID,
      fromDisplayName: socket.displayName,
      message,
      timestamp: new Date().toISOString()
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const userID = socket.userID;

    activeConnections.delete(socket.id);

    logConnectionEvent('user-disconnected', {
      userID,
      socketID: socket.id
    });

    logger.info('User disconnected', { userID, socketID: socket.id });

    // Notify others
    io.emit('user-status-changed', {
      userID,
      status: 'offline'
    });
  });

  // Error handling
  socket.on('error', (error) => {
    logger.error('Socket error', {
      socketID: socket.id,
      userID: socket.userID,
      error: error.message || error
    });
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

// Start Server
const PORT = config.port;
const HOST = config.host;

server.listen(PORT, HOST, () => {
  logger.success(`Server running at http${config.ssl.enabled ? 's' : ''}://${HOST}:${PORT}`, {
    environment: config.nodeEnv,
    port: PORT
  });

  console.log('\n========== Any Disk Server Started ==========');
  console.log(`Protocol: ${config.ssl.enabled ? 'HTTPS' : 'HTTP'}`);
  console.log(`Host: ${HOST}`);
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log('==========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.success('Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

module.exports = server;
