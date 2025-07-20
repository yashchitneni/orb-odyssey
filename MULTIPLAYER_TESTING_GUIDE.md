# Multiplayer Testing Guide for Orb Odyssey

## Quick Start Testing

### 1. Start the Server
```bash
cd server
node server.js
```
You should see: `Orb Odyssey server running on port 3000`

### 2. Open Multiple Browser Windows
To simulate multiple players, you need multiple browser instances:

**Option A: Different Browsers**
- Open `http://localhost:3000` in Chrome
- Open `http://localhost:3000` in Firefox
- Open `http://localhost:3000` in Edge/Safari

**Option B: Incognito/Private Windows**
- Open `http://localhost:3000` in normal Chrome window
- Open `http://localhost:3000` in Chrome Incognito window (Ctrl+Shift+N)
- Each incognito window is treated as a separate player

**Option C: Multiple Profiles**
- Use Chrome profiles (click profile icon → Add → Guest)
- Each profile can be a different player

### 3. Test Room Creation and Joining

**Player 1 (Host):**
1. In the first browser window, click to change your name (optional)
2. Click "CREATE ROOM"
3. You'll be taken to the lobby
4. You should see your name in the player list with a crown (👑) icon

**Player 2:**
1. In the second browser window, change your name
2. You should see the room created by Player 1 in the room list
3. Click "JOIN" next to the room
4. You'll be taken to the same lobby
5. Both players should now see each other in the player list

### 4. Starting the Game
- Only the host (Player 1) can start the game
- The "START GAME" button will become active when 2+ players are in the room
- Click "START GAME" to begin

## Common Issues and Solutions

### Issue: Player name not showing in lobby
**Fixed in latest update!** The server now properly broadcasts player lists.

### Issue: Can't see other player's room
**Solutions:**
- Click "REFRESH" button
- Check that both browsers are connected (green dot in bottom left)
- Make sure you're on `http://localhost:3000` (not `file://`)

### Issue: Can't join room
**Possible causes:**
- Room is full (8 players max)
- Game already started
- Connection issues

### Issue: Multiple tabs acting as same player
**Solution:** Use incognito/private windows or different browsers

## Testing Different Scenarios

### 1. Test Host Transfer
1. Create room with Player 1
2. Join with Player 2
3. Player 1 clicks "Back to Menu"
4. Player 2 should become new host

### 2. Test Mid-Game Disconnect
1. Start a game with 2+ players
2. Close one browser window
3. Other players should continue playing
4. Disconnected player's orb should disappear

### 3. Test Room Full
1. Create a room
2. Have 7 other players join (8 total)
3. 9th player should see room as full

### 4. Test Multiple Rooms
1. Player 1 creates Room A
2. Player 2 creates Room B
3. Player 3 should see both rooms
4. Player 3 can choose which to join

## Debug Tips

### Browser Console
Press F12 to open developer console and check for:
- Connection status messages
- Socket.io events
- Error messages

### Network Tab
In F12 Developer Tools → Network tab:
- Look for WebSocket connections
- Check for "socket.io" requests
- Should show "101 Switching Protocols" for successful connection

### Server Console
Watch the server terminal for:
- "Player connected" messages
- Room creation/joining logs
- Any error messages

## Performance Testing

### Stress Test with Multiple Players
1. Open 4-8 browser windows
2. Have all join the same room
3. Start the game
4. Monitor performance (press F1 in game)

### Network Latency Simulation
Use Chrome DevTools:
1. F12 → Network tab
2. Click throttling dropdown
3. Select "Slow 3G" to simulate poor connection
4. Test gameplay responsiveness

## Advanced Testing

### Using Different Devices
1. Find your local IP:
   - Windows: `ipconfig` → IPv4 Address
   - Mac/Linux: `ifconfig` → inet addr
2. On other devices (phone/tablet/other computer):
   - Connect to same WiFi
   - Open `http://YOUR_IP:3000`
   - Can now play across devices!

### Port Forwarding (Playing with Friends)
1. Forward port 3000 on your router
2. Share your public IP with friends
3. They connect to `http://YOUR_PUBLIC_IP:3000`

**Note:** For production, use proper hosting (Render, Heroku, etc.)

## Quick Test Checklist

- [ ] Server starts without errors
- [ ] Can create a room
- [ ] Name appears in lobby with crown icon
- [ ] Second player can see and join room
- [ ] Both players visible in lobby
- [ ] Only host can start game
- [ ] Game starts for both players
- [ ] Movement syncs between players
- [ ] Crystals collected by one player disappear for others
- [ ] Collision between players works
- [ ] Game ends properly
- [ ] Can return to lobby and play again

## Troubleshooting Connection Issues

If you can't connect:
1. Check server is running (`node server.js`)
2. Check using `http://` not `https://`
3. Check firewall isn't blocking port 3000
4. Try `http://127.0.0.1:3000` instead of `localhost`
5. Restart server and refresh browsers

Happy Testing! 🎮