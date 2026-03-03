# Any Disk - Remote Desktop Web Application

A full-featured remote desktop web application similar to AnyDesk, built with Node.js, Express, Socket.IO, and WebRTC.

## 🚀 Features

### Core Features
- **Unique ID Generation System**: Generate unique connection IDs in AnyDesk format (XXXX-XXXX-XXXX)
- **Screen Sharing**: Real-time screen capture using WebRTC getDisplayMedia API
- **Remote Control**: Mouse and keyboard control of remote desktop
- **File Transfer**: Seamless file transfer between connected peers
- **Chat**: Real-time messaging between users
- **Connection Permission System**: Accept/Reject connection requests
- **Connection Logs**: Track all connection events and actions
- **Secure HTTPS**: Built-in support for SSL/TLS encryption
- **Mobile Responsive**: Fully responsive design for all devices

### Advanced Features
- **WebRTC Signaling**: Peer-to-peer communication using Socket.IO
- **STUN/TURN Servers**: Configurable ICE servers for NAT traversal
- **Connection Statistics**: Real-time monitoring of bitrate, latency, and connection quality
- **Settings Management**: Customizable display settings and preferences
- **Auto-Accept Connections**: Option to automatically accept incoming requests
- **Notification System**: Toast notifications with sound alerts

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Real-time Communication**: Socket.IO
- **Peer-to-Peer**: WebRTC
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Security**: HTTPS/TLS, session management
- **Logging**: Custom logger with file support

## 📋 Prerequisites

- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- Modern web browser with WebRTC support (Chrome, Firefox, Edge, Safari)
- For HTTPS: SSL/TLS certificates or ability to generate self-signed certificates

## 💾 Installation

### 1. Clone or Download the Project

```bash
cd any-disk
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate SSL Certificates (Optional but Recommended)

For development/testing with self-signed certificates:

```bash
npm run generate-certs
```

For production, use Let's Encrypt or a proper Certificate Authority.

### 4. Configure Environment Variables

Edit the `.env` file:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# WebRTC Configuration
STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=username
TURN_PASSWORD=password

# Security
SSL_CERT_PATH=./certs/server.crt
SSL_KEY_PATH=./certs/server.key

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Session timeout (in milliseconds)
SESSION_TIMEOUT=3600000

# Max file transfer size (in bytes)
MAX_FILE_SIZE=1073741824
```

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
```

This uses nodemon for auto-restart on file changes.

### Production Mode

```bash
npm start
```

The application will start at:
- HTTP: `http://localhost:3000`
- HTTPS: `https://localhost:3000` (if certificates exist)

## 📱 How to Use

### Getting Started

1. **Access the Application**: Open `http://localhost:3000` in your browser
2. **Generate Your ID**: Click "Generate New" to get a unique connection ID (displayed on screen)
3. **Share Your ID**: Provide this ID to the person you want to connect with

### Connecting

**Option 1: Receive Connection**
1. Wait for others to provide their ID
2. Enter their ID in the "Connect to Someone" field
3. Click "Connect"
4. Other person will see a connection request and can accept/reject

**Option 2: Accept Incoming Request**
1. When someone connects to you, accept the request
2. Connection is established
3. Screen sharing begins automatically

### During Connection

- **Remote Control**: Click the keyboard/mouse icons to enable control
- **File Transfer**: Click the file icon to choose a file to send
- **Chat**: Click the chat icon to send messages
- **Settings**: Click ⚙️ to adjust display quality and other settings
- **Connection Stats**: View real-time statistics in the sidebar

## 🏗️ Project Structure

```
any-disk/
├── server/
│   ├── server.js                 # Main server file
│   ├── config/
│   │   └── config.js            # Configuration management
│   ├── utils/
│   │   ├── idGenerator.js       # Unique ID generation
│   │   ├── logger.js            # Logging system
│   │   └── sslCerts.js          # SSL certificate generation
│   ├── middleware/
│   │   └── auth.js              # Authentication & rate limiting
│   └── routes/
│       └── api.js               # API endpoints
├── public/
│   ├── index.html               # Main HTML template
│   ├── css/
│   │   ├── style.css            # Main styling
│   │   └── responsive.css       # Mobile responsive styles
│   ├── js/
│   │   ├── app.js               # Main application logic
│   │   ├── utils.js             # Utility functions
│   │   ├── webrtc.js            # WebRTC peer connection
│   │   ├── screenShare.js       # Screen sharing logic
│   │   ├── remoteControl.js     # Remote mouse/keyboard control
│   │   ├── fileTransfer.js      # File transfer handling
│   │   └── chat.js              # Chat functionality
│   └── assets/                  # Static assets
├── logs/                        # Application logs
├── certs/                       # SSL certificates (generated)
├── .env                         # Environment variables
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies
└── README.md                    # This file
```

## 🔐 How WebRTC Works Internally

### 1. **Signaling Channel (Using Socket.IO)**
- Browser A wants to connect to Browser B
- Browser A sends a SDP Offer through Socket.IO to Browser B
- Browser B responds with a SDP Answer
- Both sides exchange ICE candidates through Socket.IO
- Once candidates are exchanged, WebRTC can establish a direct connection

### 2. **STUN Servers**
- Help both peers discover their public IP addresses
- Lightweight protocol (no relay needed)
- Used when peers can communicate directly
- Every 50ms, candidates are collected and sent

### 3. **TURN Servers**
- Acts as a relay server when direct connection fails
- Necessary for peers behind symmetric NAT or corporate firewalls
- Relays all traffic (higher bandwidth cost)
- Used as fallback when STUN-discovered connection fails

### 4. **Connection Flow Diagram**

```
Caller                           Network                        Answerer
  |                                |                               |
  |---Create Offer SDP------------>|                               |
  |                                |----Signaling (Socket.IO)----->|
  |                                |                               |
  |                                |<---Create Answer SDP----------|
  |<---Signaling (Socket.IO)--------|                               |
  |                                |                               |
  |---ICE Candidate 1 ----------->|                               |
  |                                |---ICE Candidate 1 (Signal)-->|
  |                                |                               |
  |                                |<--ICE Candidate 2 (Signal)---|
  |<---ICE Candidate 2-------------|                               |
  |                                |                               |
  |                                |===Direct P2P Connection===|
  |                                |   (STUN/TURN if needed)    |
  |                                |                               |
  |============== WebRTC Data Channel Established ===============|
  |                                |                               |
  |-------Screen Capture Stream--->|                               |
  |<-------Remote Control Input----|                               |
  |
```

### 5. **ICE Candidate Process**

1. **Host Candidates**: Local network interfaces
2. **Server Reflexive Candidates**: Public IP via STUN
3. **Peer Reflexive Candidates**: Learned during connectivity checks
4. **Relay Candidates**: Public addressed via TURN server

Each candidate is a potential connection path. WebRTC tries them in order of preference and uses the best working one.

### 6. **Media Stream Flow**

```
Sender (Screen Capture)          WebRTC Stack          Receiver (Display)
  |                                 |                          |
  |--getUserDisplay/Screen -------->|                          |
  |<--MediaStream returned----------|                          |
  |                                 |                          |
  |--Add Track to PeerConnection--->|                          |
  |                                 |--Encode Video------------|
  |                                 |--Transmit via UDP------->|
  |                                 |--Jitter Buffer--------->|
  |                                 |--Decode Video--------->|
  |                                 |--Display on Video Tag-->|
```

### 7. **Codec Negotiation**

During SDP offer/answer:
- Both peers list supported codecs
- Common codec selected (VP9, H.264, VP8 for video)
- Bitrate and frame rate agreed upon
- Bandwidth utilization optimized based on codec

### 8. **Connection Parameters**

**Video Encoding Options**:
- Low: 1280x720 @ 15-24 fps, ~500 kbps
- Medium: 1920x1080 @ 30 fps, ~2500 kbps  
- High: 2560x1440 @ 30 fps, ~5000 kbps

**Ice Candidate Types**:
- `srflx`: Server reflexive (STUN)
- `host`: Local network interface
- `relay`: TURN server relay
- `prflx`: Peer reflexive (discovered during connectivity)

## 📊 API Endpoints

### Generate Connection ID
```
POST /api/generate-id
Response: { connectionID, sessionID, timestamp }
```

### Validate Connection ID
```
POST /api/validate-id
Body: { connectionID }
Response: { isValid, connectionID }
```

### Get Connection Status
```
GET /api/status/:connectionID
Response: { status, connectionID, timestamp }
```

### Get Server Configuration
```
GET /api/config
Response: { iceServers, maxFileSize, chunkSize }
```

### Get Connection Logs
```
GET /api/logs
Response: { logs[], count }
```

### Health Check
```
GET /api/health
Response: { status, uptime, timestamp }
```

## 🔧 Socket.IO Events

### Client → Server

- `register-user`: Register user with display name
- `request-connection`: Request connection to another user
- `accept-connection`: Accept incoming connection request
- `reject-connection`: Reject connection request
- `webrtc-offer`: Send WebRTC offer
- `webrtc-answer`: Send WebRTC answer
- `webrtc-ice-candidate`: Send ICE candidate
- `remote-control-action`: Send mouse/keyboard input
- `file-transfer-chunk`: Send file data chunk
- `chat-message`: Send chat message

### Server → Client

- `connection-info`: Initial connection details
- `registration-success`: User registration confirmed
- `incoming-connection-request`: New connection request
- `connection-accepted`: Connection accepted by peer
- `connection-rejected`: Connection rejected by peer
- `webrtc-offer`: Receive WebRTC offer
- `webrtc-answer`: Receive WebRTC answer
- `webrtc-ice-candidate`: Receive ICE candidate
- `remote-control-action`: Receive remote control input
- `file-transfer-request`: Incoming file transfer
- `file-transfer-chunk`: File data chunk received
- `file-transfer-complete`: File transfer finished
- `chat-message`: Chat message received

## ⚙️ Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment mode |
| `PORT` | 3000 | Server port |
| `HOST` | localhost | Server host |
| `STUN_SERVERS` | Google STUN | STUN server URLs |
| `TURN_SERVER_URL` | - | TURN server address |
| `TURN_USERNAME` | - | TURN server username |
| `TURN_PASSWORD` | - | TURN server password |
| `SSL_CERT_PATH` | ./certs/server.crt | SSL certificate path |
| `SSL_KEY_PATH` | ./certs/server.key | SSL key path |
| `LOG_LEVEL` | info | Logging level |
| `LOG_FILE` | ./logs/app.log | Log file path |
| `SESSION_TIMEOUT` | 3600000 | Session timeout (ms) |
| `MAX_FILE_SIZE` | 1073741824 | Max file size (bytes) |

## 🌐 Deployment Guide

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

## 🔒 Security Considerations

1. **HTTPS Only**: Always use HTTPS in production
2. **STUN/TURN Servers**: Use your own TURN server in production
3. **Rate Limiting**: Built-in rate limiting enabled
4. **Validate Input**: All inputs are validated
5. **Session Management**: Automatic session timeout
6. **CORS**: Configure CORS for production domains
7. **Firewall**: Open only necessary ports (3000, TURN)

## 🐛 Troubleshooting

### Screen sharing not working
- Check browser permissions
- Ensure HTTPS is used
- Verify WebRTC support in browser

### Connection fails
- Check firewall settings
- Verify STUN/TURN server configuration
- Check network connectivity
- Look at browser console for errors

### Slow connection
- Monitor bitrate in connection stats
- Reduce video quality in settings
- Check Internet speed
- Use TURN server if direct connection fails

### Camera/Microphone not working
- Grant browser permissions
- Check if devices are in use by other applications
- Verify hardware is connected

## 📚 Additional Resources

- [WebRTC Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Express.js Guide](https://expressjs.com/)
- [STUN/TURN Servers](https://www.maxmind.com/en/stun-turn-servers)

## 📄 License

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests.

## 📞 Support

For issues and questions, please create an issue on the repository.

## 🙏 Acknowledgments

- Built with WebRTC for peer-to-peer communication
- Socket.IO for real-time signaling
- Express.js for server framework
- Inspired by AnyDesk and similar remote desktop applications
