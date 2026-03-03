# Quick Start Guide - Any Disk

Get Any Disk up and running in minutes!

## ⚡ 5-Minute Quick Start

### 1. Prerequisites

```bash
# Check Node.js is installed
node --version  # Should be v14+
npm --version   # Should be v6+
```

If not installed, download from [nodejs.org](https://nodejs.org)

### 2. Installation

```bash
# Navigate to project directory
cd any-disk

# Install dependencies
npm install

# Generate self-signed certificates (for development)
npm run generate-certs

# Start the server
npm start
```

### 3. Access Application

Open your browser and go to:
```
http://localhost:3000
```

## 🎯 First Connection

### User A (Sender)
1. Open application
2. Click "Generate New" to get your unique ID (e.g., `ABCD-EFGH-IJKL`)
3. Share this ID with User B

### User B (Receiver)
1. Open application
2. Enter User A's ID in the "Connect to Someone" field
3. Click "Connect"

### User A (Sender)
1. Accept the connection request
2. Screen sharing starts automatically!

## 📁 Project Files Overview

```
any-disk/
│
├── server/
│   ├── server.js                      # Main server application
│   ├── config/config.js               # App configuration
│   ├── utils/                         # Utility functions
│   ├── middleware/auth.js             # Authentication
│   └── routes/api.js                  # API endpoints
│
├── public/
│   ├── index.html                     # Main web page
│   ├── css/
│   │   ├── style.css                  # Styling
│   │   └── responsive.css             # Mobile responsive
│   └── js/
│       ├── app.js                     # Main app logic
│       ├── webrtc.js                  # Peer connection
│       ├── screenShare.js             # Screen capture
│       ├── remoteControl.js           # Mouse/keyboard
│       ├── fileTransfer.js            # File transfer
│       ├── chat.js                    # Messaging
│       └── utils.js                   # Helper functions
│
├── logs/                              # Application logs
├── certs/                             # SSL certificates
├── .env                               # Configuration
├── package.json                       # Dependencies
├── README.md                          # Full documentation
└── DEPLOYMENT_GUIDE.md               # Production setup
```

## 🔧 Command Reference

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start

# Generate SSL certificates
npm run generate-certs
```

## 🎨 Features Overview

### Screen Sharing
- Real-time screen capture
- Configurable quality (Low/Medium/High)
- Adjustable frame rate (15/24/30 FPS)

### Remote Control
- **Mouse**: Move cursor, click, scroll, right-click
- **Keyboard**: Full keyboard input with special keys
- **Toggle**: Enable/disable individual controls

### File Transfer
- Send files up to 1GB
- Automatic chunking for reliability
- Progress tracking
- Auto-download on receive

### Chat
- Real-time messaging
- Message history
- Searchable conversations
- Export chat logs

### Connection Stats
- Real-time bitrate monitoring
- Latency measurement
- Connection time tracking
- Signal strength

## 🛠️ Configuration

Edit `.env` file to customize:

```env
# Server Settings
PORT=3000                    # Change server port
NODE_ENV=production         # Set environment

# WebRTC (for NAT traversal)
STUN_SERVERS=...            # STUN server list
TURN_SERVER_URL=...         # TURN server address

# File Transfer
MAX_FILE_SIZE=1073741824    # Max 1GB per file

# Logging
LOG_LEVEL=info             # debug, info, warn, error
LOG_FILE=./logs/app.log    # Log file location
```

## 🌐 Network Configuration

### For Local Network
```
No additional setup needed!
Works between devices on same network.
```

### For Internet (Remote Connection)

1. **Router Port Forwarding**:
   - Forward port 3000 to your computer
   - Map external port to internal 3000

2. **Use HTTPS** (recommended):
   ```bash
   # Generate certificates with Let's Encrypt
   npm run generate-certs
   ```

3. **Configure STUN/TURN** in `.env`:
   - Add public STUN servers
   - Setup TURN for symmetric NAT

## 📱 Mobile Access

Open in mobile browser:
```
http://your-computer-ip:3000
```

App is fully responsive!

## 🔒 Security Tips

1. **Always Use HTTPS** in production
2. **Share IDs Securely** - Use encrypted channels
3. **Enable Auto-Accept** only with trusted users
4. **Monitor Logs** for suspicious activity
5. **Update Node.js** regularly

## 🐛 Common Issues

### "Screen Sharing Not Supported"
- Use Chrome, Firefox, Edge, or Safari (latest versions)
- Ensure HTTPS is used (security requirement)

### "Connection Failed"
- Check firewall settings
- Verify both users have stable internet
- Try refreshing the page
- Check browser console for errors

### "File Transfer Stuck"
- Check file size (must be < 1GB)
- Verify disk space on receiving end
- Check both connections are stable

### "Slow Video"
- Reduce video quality in settings
- Lower frame rate
- Close other applications
- Check network speed

## 📊 Performance Tips

1. **Lower video quality** for slower connections
2. **Reduce frame rate** to save bandwidth
3. **Close unused tabs** to free memory
4. **Use wired Ethernet** instead of WiFi for stability
5. **Enable compression** in browser settings

## 🌟 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Toggle Keyboard Control |
| `Ctrl+M` | Toggle Mouse Control |
| `ESC` | Clear Settings Panel |

## 📚 Learn More

- 🔗 [Full README](README.md) - Complete documentation
- 🚀 [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production setup
- 📖 [WebRTC Docs](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- 💬 [Socket.IO Docs](https://socket.io/docs/)

## 💡 Tips & Tricks

### Efficient Screen Sharing
- Share app window instead of full screen (less bandwidth)
- Close unnecessary windows before connecting
- Keep receiver at 720p resolution for balance

### Better File Transfer
- Compress files before sending (ZIP/RAR)
- Transfer one large file instead of many small ones
- Use wired connection for large files

### Remote Control
- Hover over remote screen to see exact position
- Use keyboard shortcuts for common actions
- Enable only needed controls to reduce latency

## 🎓 Understanding the Tech

### What is WebRTC?
- Real-time communication technology
- Peer-to-peer (direct connection between devices)
- Secure and encrypted
- No server relay needed (usually)

### What is Socket.IO?
- Real-time bidirectional communication
- Used for signaling (setting up connections)
- Handles connection setup messages
- Bridges gap when direct connection not possible

### How Screen Sharing Works?
1. One user captures their screen
2. Screen data is encoded into video
3. Video is sent through peer connection
4. Receiver decodes and displays

## 🚀 Next Steps

1. **Try basic connection** between two devices
2. **Test file transfer** with small files first
3. **Practice remote control** (mouse then keyboard)
4. **Use chat** for communication
5. **Setup production** when comfortable

## 📞 Need Help?

### Check Logs
```bash
# View real-time logs
tail -f logs/app.log

# Check for errors
grep ERROR logs/app.log
```

### Debug in Browser
1. Press `F12` to open Developer Tools
2. Go to Console tab
3. Look for error messages
4. Check Network tab for connection issues

### Common Error Messages

| Error | Solution |
|-------|----------|
| "WebRTC not supported" | Update browser |
| "CORS error" | Check if server running |
| "Connection timeout" | Check firewall/router |
| "Permission denied" | Grant browser permissions |

## 📈 Troubleshooting Checklist

- [ ] Browser updated to latest version
- [ ] JavaScript enabled in browser
- [ ] No firewall blocking port 3000
- [ ] Both users on same/accessible network
- [ ] Connection ID entered correctly
- [ ] HTTPS used on production
- [ ] Server is running (`npm start`)
- [ ] Checked browser console for errors

## 🎉 You're Ready!

Start sharing screens and collaborating remotely!

---

**Questions?** Check README.md for complete documentation.
