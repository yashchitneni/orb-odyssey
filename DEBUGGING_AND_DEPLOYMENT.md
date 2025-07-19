# Orb Odyssey - Debugging & Deployment Guide

## 🐞 Debugging Disconnection Issues

### Common Causes of Disconnections

1. **Server Crashes** (Most Common)
   - Missing constants references (e.g., `LEVEL_THRESHOLDS` → `LEVELS.THRESHOLDS`)
   - Null/undefined player references
   - Division by zero in physics calculations
   - Array index out of bounds

2. **Network Issues**
   - Client timeout (default Socket.io timeout is too short)
   - CORS blocking connections
   - Firewall/antivirus blocking websockets

3. **Memory Leaks**
   - Unreleased game objects
   - Event listeners not cleaned up
   - Timers/intervals not cleared

### How to Debug

#### 1. Enable Server Logging
```bash
# Run with full logging
npm run test-server

# This creates server.log file with all output
tail -f server.log  # Watch logs in real-time
```

#### 2. Check Browser Console
Open Chrome DevTools (F12) and look for:
- Red error messages
- Network tab → WS (WebSocket) → Check for disconnection reasons
- Console warnings about missing resources

#### 3. Common Error Fixes

**Error: "Cannot read property 'x' of undefined"**
```javascript
// Bad
player.x = 100;

// Good
if (player) {
    player.x = 100;
}
```

**Error: "LEVEL_THRESHOLDS is not defined"**
```javascript
// This was fixed - it should be:
GAME_CONSTANTS.LEVELS.THRESHOLDS[level]
```

**Error: Socket disconnects immediately**
- Check if port 3000 is already in use
- Ensure server is actually running
- Check firewall settings

### Server Stability Improvements Made

1. **Global Error Handlers**
   - Catches uncaught exceptions
   - Prevents server from crashing
   - Logs errors for debugging

2. **Try-Catch Blocks**
   - Around updateGame() function
   - Around all socket event handlers
   - Around physics calculations

3. **Input Validation**
   - Checks for null/undefined players
   - Validates movement data
   - Sanitizes ability usage

4. **Connection Settings**
   ```javascript
   // Client reconnection settings
   {
       reconnection: true,
       reconnectionAttempts: 5,
       reconnectionDelay: 1000,
       timeout: 5000
   }
   
   // Server stability settings
   {
       pingTimeout: 60000,
       pingInterval: 25000
   }
   ```

## 🌐 Making Your Game Accessible Online

### Option 1: Local Network (Quick Testing)

1. **Find your local IP address:**
   ```bash
   # Mac/Linux
   ifconfig | grep inet
   
   # Look for something like 192.168.1.100
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Share with friends on same network:**
   - Give them: `http://YOUR_IP:3000`
   - Example: `http://192.168.1.100:3000`

### Option 2: Ngrok (Temporary Public Access)

1. **Install ngrok:**
   ```bash
   # Mac with Homebrew
   brew install ngrok
   
   # Or download from https://ngrok.com
   ```

2. **Start your server:**
   ```bash
   npm start
   ```

3. **Create public tunnel:**
   ```bash
   ngrok http 3000
   ```

4. **Share the URL:**
   - Ngrok gives you: `https://abc123.ngrok.io`
   - Anyone can access your game at this URL
   - Free tier has limitations

### Option 3: Deploy to Render (Free Hosting)

1. **Prepare for deployment:**
   
   Create `.gitignore`:
   ```
   node_modules/
   server.log
   .env
   ```

   Update `server/server.js`:
   ```javascript
   const PORT = process.env.PORT || 3000;
   ```

2. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

3. **Deploy on Render:**
   - Go to [render.com](https://render.com)
   - New → Web Service
   - Connect GitHub repo
   - Settings:
     - Build Command: `npm install`
     - Start Command: `npm start`
   - Deploy!

### Option 4: Deploy to Heroku (Paid)

1. **Install Heroku CLI**
2. **Create `Procfile`:**
   ```
   web: node server/server.js
   ```

3. **Deploy:**
   ```bash
   heroku create your-game-name
   git push heroku main
   heroku open
   ```

### Option 5: VPS Deployment (Full Control)

1. **Get a VPS** (DigitalOcean, Linode, AWS EC2)

2. **Setup server:**
   ```bash
   # SSH into server
   ssh root@your-server-ip
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 (keeps server running)
   npm install -g pm2
   
   # Clone your repo
   git clone YOUR_REPO_URL
   cd orb-odyssey
   npm install
   
   # Start with PM2
   pm2 start server/server.js --name orb-odyssey
   pm2 save
   pm2 startup
   ```

3. **Setup Nginx (optional but recommended):**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
       }
   }
   ```

## 🔧 Production Considerations

### 1. Environment Variables
Create `.env` file:
```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-secret-key
```

### 2. Security
- Use HTTPS (required for WebSockets in production)
- Add rate limiting
- Validate all inputs
- Use environment variables for secrets

### 3. Performance
- Enable gzip compression
- Use CDN for static assets
- Implement proper caching
- Monitor memory usage

### 4. Monitoring
```javascript
// Add to server.js
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        players: Object.keys(gameState.players).length,
        uptime: process.uptime()
    });
});
```

## 📊 Testing Server Stability

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Create test script (load-test.yml)
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - engine: "socketio"
    flow:
      - emit:
          channel: "joinLobby"
      - think: 5
      - emit:
          channel: "playerMove"
          data:
            ax: 1
            ay: 0
      - think: 1

# Run test
artillery run load-test.yml
```

### Monitoring Tools
1. **PM2 Monitoring:**
   ```bash
   pm2 monit
   ```

2. **Server Logs:**
   ```bash
   pm2 logs orb-odyssey
   ```

3. **System Resources:**
   ```bash
   htop  # CPU/Memory usage
   ```

## 🚀 Quick Start Commands

```bash
# Development
npm run dev          # Auto-restart on changes

# Debugging
npm run debug        # Enable Node.js debugger
npm run test-server  # Run with logging

# Production
npm run production   # Run in production mode

# Check if server is running
curl http://localhost:3000/health
```

## ⚠️ Troubleshooting Checklist

- [ ] Is the server actually running? (`ps aux | grep node`)
- [ ] Is port 3000 available? (`lsof -i :3000`)
- [ ] Are there any errors in server.log?
- [ ] Check browser console for client-side errors
- [ ] Try a different browser
- [ ] Disable antivirus/firewall temporarily
- [ ] Check if constants.js is loaded properly
- [ ] Verify all file paths are correct
- [ ] Test with a single player first

## 📝 Debug Commands

```bash
# Kill all Node processes
pkill -f node

# Find what's using port 3000
lsof -ti:3000

# Watch server logs
tail -f server.log

# Check Node.js version (should be 14+)
node --version

# Clear npm cache if having issues
npm cache clean --force
```

Remember: Most disconnection issues are caused by server crashes due to unhandled errors. Always check the server logs first!