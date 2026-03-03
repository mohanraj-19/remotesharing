require('dotenv').config();

module.exports = {
  // Server Configuration
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'localhost',
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // WebRTC Configuration
  webrtc: {
    iceServers: [
      {
        urls: (process.env.STUN_SERVERS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302').split(',')
      },
      // TURN server configuration (optional)
      ...(process.env.TURN_SERVER_URL ? [{
        urls: [process.env.TURN_SERVER_URL],
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD
      }] : [])
    ]
  },

  // SSL Configuration
  ssl: {
    certPath: process.env.SSL_CERT_PATH || './certs/server.crt',
    keyPath: process.env.SSL_KEY_PATH || './certs/server.key',
    enabled: process.env.NODE_ENV === 'production'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  },

  // Session Configuration
  session: {
    timeout: parseInt(process.env.SESSION_TIMEOUT || 3600000), // 1 hour
    maxConnections: 1000
  },

  // File Transfer Configuration
  fileTransfer: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || 1073741824), // 1GB
    chunkSize: 64 * 1024 // 64KB chunks
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }
};
