# Deployment Guide - Any Disk Remote Desktop

Complete guide for deploying Any Disk to production environments.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Production Setup](#production-setup)
4. [Cloud Deployment](#cloud-deployment)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Security Hardening](#security-hardening)

## 📦 Prerequisites

### System Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 512MB minimum, 2GB+ recommended
- **Disk**: 10GB free space minimum
- **Network**: Stable internet connection with open ports

### Software Requirements

```bash
# Node.js v14.0.0 or higher
node --version

# npm v6.0.0 or higher
npm --version

# curl (for testing)
curl --version

# OpenSSL (for certificate generation)
openssl version
```

## 🔧 Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd any-disk
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Self-Signed Certificates

```bash
npm run generate-certs
```

### 4. Run Development Server

```bash
npm run dev
```

Access at: `http://localhost:3000`

## 🚀 Production Setup

### 1. Install on Production Server

```bash
# SSH into your server
ssh user@your-server.com

# Clone repository
git clone <repository-url>
cd any-disk

# Install dependencies
npm install --production

# Install PM2 (process manager)
npm install -g pm2
```

### 2. Configure Environment

```bash
# Edit .env file
nano .env

# Set production values:
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
SSL_CERT_PATH=/path/to/fullchain.pem
SSL_KEY_PATH=/path/to/privkey.pem
STUN_SERVERS=stun:stun.l.google.com:19302
```

### 3. Generate Let's Encrypt Certificates

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d your-domain.com

# Update .env with certificate paths:
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
```

### 4. Setup PM2 Process Manager

```bash
# Start application
pm2 start server/server.js --name "any-disk"

# Setup auto-restart
pm2 startup
pm2 save

# Monitor
pm2 monit
```

### 5. Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/any-disk`:

```nginx
upstream any_disk {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss;
    gzip_vary on;
    gzip_comp_level 6;

    location / {
        proxy_pass http://any_disk;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }

    location /socket.io {
        proxy_pass http://any_disk/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/any-disk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Setup Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw enable

# Or iptables
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

## ☁️ Cloud Deployment

### AWS EC2 Deployment

#### 1. Launch EC2 Instance

```bash
# Use Ubuntu 20.04 LTS AMI
# Instance Type: t3.medium or larger
# Storage: 20GB+ gp3
# Security Group: Allow 80, 443 from 0.0.0.0/0
```

#### 2. Connect and Setup

```bash
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

#### 3. Deploy Application

Follow [Production Setup](#production-setup) steps above.

#### 4. Setup RDS or other Turn Server (optional)

For better NAT traversal, setup a dedicated TURN server.

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  any-disk:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - STUN_SERVERS=stun:stun.l.google.com:19302
    volumes:
      - ./certs:/app/certs
      - ./logs:/app/logs
    restart: always
    networks:
      - any-disk-net

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - any-disk
    networks:
      - any-disk-net

networks:
  any-disk-net:
    driver: bridge
```

Deploy:

```bash
docker-compose up -d
```

### Heroku Deployment

1. Install Heroku CLI: `npm install -g heroku`
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set environment: `heroku config:set NODE_ENV=production`
5. Deploy: `git push heroku main`

## 🔐 SSL/TLS Configuration

### Auto-Renewal with Certbot

```bash
# Test renewal
sudo certbot renew --dry-run

# Setup auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Check renewal cron job
sudo systemctl list-timers --all | grep certbot
```

### Self-Signed Certificate

For development only:

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

## ⚡ Performance Optimization

### 1. Enable Compression

Already configured in Nginx config above.

### 2. Optimize Node.js

```bash
# Use clustering
export NODE_CLUSTER_WORKERS=4
npm start
```

### 3. Load Balancing

Use Nginx upstream:

```nginx
upstream any_disk {
    least_conn;
    server localhost:3000 weight=1;
    server localhost:3001 weight=1;
    server localhost:3002 weight=1;
}
```

### 4. Database Connection Pooling

(If using database in future)

```js
// Connection pool settings
const pool = new ConnectionPool({
  max: 20,
  min: 5,
  acquire: 30000,
  idle: 30000
});
```

### 5. Caching

```js
// Cache static assets
app.use(express.static('public', {
  maxAge: '1d',
  etag: false
}));
```

## 📊 Monitoring & Maintenance

### 1. PM2 Monitoring

```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs any-disk

# Get info
pm2 info any-disk

# Start/Stop/Restart
pm2 start any-disk
pm2 stop any-disk
pm2 restart any-disk
```

### 2. Application Logging

```bash
# View logs
tail -f logs/app.log

# Rotate logs
logrotate -f /etc/logrotate.d/any-disk
```

### 3. System Monitoring

```bash
# CPU and Memory
top
htop
ps aux | grep node

# Disk usage
df -h
du -sh logs/

# Network connections
netstat -an | grep 3000
ss -an | grep 3000
```

### 4. Health Checks

```bash
# Curl health endpoint
curl https://your-domain.com/api/health

# Monitor with uptimerobot.com or similar service
```

## 🔒 Security Hardening

### 1. Disable Server Information

```js
// In server.js
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
});
```

### 2. Rate Limiting

Already implemented in middleware.

### 3. CORS Configuration

```js
const corsOptions = {
  origin: 'https://your-domain.com',
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### 4. Input Validation

```js
// Validate all inputs
if (!validateConnectionID(id)) {
  return res.status(400).json({ error: 'Invalid ID' });
}
```

### 5. Session Security

```js
// Secure session options
const sessionOptions = {
  secure: true,           // HTTPS only
  httpOnly: true,         // No JavaScript access
  sameSite: 'strict',     // CSRF protection
  maxAge: 1000 * 60 * 60  // 1 hour
};
```

### 6. Content Security Policy

```js
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
```

### 7. Regular Updates

```bash
# Update dependencies monthly
npm update

# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process
lsof -i :3000
# Kill process
kill -9 <PID>
```

### High Memory Usage

```bash
# Check for memory leaks
node --inspect server/server.js
# Use Chrome DevTools to debug
```

### Connection Issues

```bash
# Check open ports
netstat -tlnp
# Check firewall
sudo ufw status
# Check SSL
openssl s_client -connect your-domain.com:443
```

### Socket.IO Connection Refused

```bash
# Check Nginx proxy settings
# Ensure Connection: upgrade header is set
# Check WebSocket support
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" https://your-domain.com/socket.io/
```

## 📈 Scaling

For multiple instances:

1. Use Redis for session sharing
2. Implement load balancing
3. Setup database for connection logs
4. Use CDN for static assets
5. Monitor and auto-scale with cloud provider

## 📚 Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Docker Documentation](https://docs.docker.com/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## ✅ Deployment Checklist

- [ ] Install Node.js and npm
- [ ] Clone repository
- [ ] Install dependencies
- [ ] Configure .env file
- [ ] Generate SSL certificates
- [ ] Setup PM2
- [ ] Configure Nginx reverse proxy
- [ ] Setup firewall rules
- [ ] Test HTTPS connection
- [ ] Setup monitoring
- [ ] Configure backups
- [ ] Setup log rotation
- [ ] Test failover
- [ ] Setup alerting
- [ ] Document deployment
- [ ] Create deployment script
- [ ] Test disaster recovery

---

**Last Updated**: March 2024
