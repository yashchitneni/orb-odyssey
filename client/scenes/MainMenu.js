class MainMenuScene extends BaseScene {
    constructor() {
        super({ key: 'MainMenuScene' });
        this.audioManager = null;
        this.rooms = [];
        this.refreshTimer = null;
    }

    create() {
        // Initialize audio manager
        if (!this.audioManager) {
            this.audioManager = new AudioManager(this);
        }
        
        // Start main menu music
        this.audioManager.playMusic('LOBBY');
        
        // Create enhanced background
        this.createEnhancedBackground();
        
        // Main title
        this.createTitle();
        
        // Player name input
        this.createNameInput();
        
        // Room list panel
        this.createRoomListPanel();
        
        // Control buttons
        this.createControlButtons();
        
        // Connection status
        this.createConnectionStatus();
        
        // Socket listeners
        this.setupSocketListeners();
        
        // Request initial room list
        if (this.game.socket && this.game.socket.connected) {
            this.game.socket.emit('getRoomList');
        }
        
        // Auto-refresh room list every 5 seconds
        this.refreshTimer = this.time.addEvent({
            delay: 5000,
            callback: this.refreshRoomList,
            callbackScope: this,
            loop: true
        });
    }
    
    createEnhancedBackground() {
        // Gradient background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x000033, 0x001144, 0x000022, 0x002244);
        bg.fillRect(0, 0, ScaleHelper.width(), ScaleHelper.height());
        
        // Animated starfield
        this.createStarfield();
    }
    
    createStarfield() {
        for (let i = 0; i < 200; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, ScaleHelper.width()),
                Phaser.Math.Between(0, ScaleHelper.height()),
                Phaser.Math.FloatBetween(0.5, 2),
                0xffffff,
                Phaser.Math.FloatBetween(0.2, 0.8)
            );
            
            this.tweens.add({
                targets: star,
                alpha: 0.1,
                duration: Phaser.Math.Between(2000, 4000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }
    
    createTitle() {
        // Main title
        this.add.text(ScaleHelper.centerX(), ScaleHelper.y(60), 'ORB ODYSSEY', {
            fontSize: ScaleHelper.font('48px'),
            fontFamily: 'Arial Black',
            fill: '#00ffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Subtitle
        this.add.text(ScaleHelper.centerX(), ScaleHelper.y(95), 'Multiplayer Crystal Arena', {
            fontSize: ScaleHelper.font('20px'),
            fill: '#ffffff',
            fontStyle: 'italic'
        }).setOrigin(0.5);
    }
    
    createNameInput() {
        // Name input background
        const inputBg = this.add.graphics();
        inputBg.fillStyle(0x2a2a2a, 0.8);
        inputBg.fillRoundedRect(ScaleHelper.x(250), ScaleHelper.y(130), ScaleHelper.x(300), ScaleHelper.y(50), 10);
        inputBg.lineStyle(2, 0x00ffff);
        inputBg.strokeRoundedRect(ScaleHelper.x(250), ScaleHelper.y(130), ScaleHelper.x(300), ScaleHelper.y(50), 10);
        
        // Label
        this.add.text(ScaleHelper.x(250), ScaleHelper.y(110), 'Your Name:', {
            fontSize: ScaleHelper.font('16px'),
            fill: '#ffffff'
        });
        
        // Name display
        this.playerNameText = this.add.text(ScaleHelper.centerX(), ScaleHelper.y(155), 'Player' + Math.floor(Math.random() * 1000), {
            fontSize: ScaleHelper.font('20px'),
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // Store player name with random suffix to avoid duplicates
        this.playerName = this.playerNameText.text;
        
        // Make the input area interactive for changing name
        const hitArea = new Phaser.Geom.Rectangle(ScaleHelper.x(250), ScaleHelper.y(130), ScaleHelper.x(300), ScaleHelper.y(50));
        inputBg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        inputBg.on('pointerdown', () => {
            // Simple name change with random suffix
            const names = ['Orb', 'Crystal', 'Nova', 'Star', 'Cosmic', 'Nebula', 'Photon', 'Quasar'];
            const randomName = names[Math.floor(Math.random() * names.length)];
            this.playerName = randomName + Math.floor(Math.random() * 1000);
            this.playerNameText.setText(this.playerName);
            
            // Visual feedback
            this.tweens.add({
                targets: this.playerNameText,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 100,
                yoyo: true
            });
        });
        
        // Add click instruction
        this.add.text(ScaleHelper.centerX(), ScaleHelper.y(180), 'Click to change name', {
            fontSize: ScaleHelper.font('12px'),
            fill: '#888888',
            fontStyle: 'italic'
        }).setOrigin(0.5);
    }
    
    createRoomListPanel() {
        // Room list panel background
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x1a1a1a, 0.9);
        panelBg.fillRoundedRect(ScaleHelper.x(100), ScaleHelper.y(200), ScaleHelper.x(600), ScaleHelper.y(240), 12);
        panelBg.lineStyle(2, 0xff00ff);
        panelBg.strokeRoundedRect(ScaleHelper.x(100), ScaleHelper.y(200), ScaleHelper.x(600), ScaleHelper.y(240), 12);
        
        // Panel title
        this.add.text(ScaleHelper.centerX(), ScaleHelper.y(220), 'AVAILABLE ROOMS', {
            fontSize: ScaleHelper.font('24px'),
            fontWeight: 'bold',
            fill: '#ff00ff'
        }).setOrigin(0.5);
        
        // Column headers
        const headerY = ScaleHelper.y(245);
        this.add.text(ScaleHelper.x(130), headerY, 'Room', {
            fontSize: ScaleHelper.font('16px'),
            fontWeight: 'bold',
            fill: '#ffffff'
        });
        this.add.text(ScaleHelper.x(280), headerY, 'Host', {
            fontSize: ScaleHelper.font('16px'),
            fontWeight: 'bold',
            fill: '#ffffff'
        });
        this.add.text(ScaleHelper.x(420), headerY, 'Players', {
            fontSize: ScaleHelper.font('16px'),
            fontWeight: 'bold',
            fill: '#ffffff'
        });
        this.add.text(ScaleHelper.x(520), headerY, 'Status', {
            fontSize: ScaleHelper.font('16px'),
            fontWeight: 'bold',
            fill: '#ffffff'
        });
        
        // Room list container
        this.roomListContainer = this.add.container(ScaleHelper.x(110), ScaleHelper.y(270));
        
        // No rooms message
        this.noRoomsText = this.add.text(ScaleHelper.centerX(), ScaleHelper.y(350), 'No rooms available - Create one!', {
            fontSize: ScaleHelper.font('18px'),
            fill: '#888888',
            fontStyle: 'italic'
        }).setOrigin(0.5);
    }
    
    createControlButtons() {
        // Create Room button
        this.createRoomButton = this.createButton(ScaleHelper.x(200), ScaleHelper.y(480), 'CREATE ROOM', () => {
            this.createNewRoom();
        });
        
        // Refresh button
        this.refreshButton = this.createButton(ScaleHelper.centerX(), ScaleHelper.y(480), 'REFRESH', () => {
            this.refreshRoomList();
        });
        
        // Spectate button (future feature)
        this.spectateButton = this.createButton(ScaleHelper.x(600), ScaleHelper.y(480), 'SPECTATE', () => {
            console.log('Spectate mode not yet implemented');
        });
        this.spectateButton.setAlpha(0.5); // Disabled for now
    }
    
    createButton(x, y, text, callback) {
        const buttonBg = this.add.graphics();
        const btnWidth = ScaleHelper.x(180);
        const btnHeight = ScaleHelper.y(60);
        buttonBg.fillGradientStyle(0x00aa00, 0x008800, 0x006600, 0x004400);
        buttonBg.fillRoundedRect(x - btnWidth/2, y - btnHeight/2, btnWidth, btnHeight, 12);
        buttonBg.lineStyle(2, 0x00ffff);
        buttonBg.strokeRoundedRect(x - btnWidth/2, y - btnHeight/2, btnWidth, btnHeight, 12);
        
        const buttonText = this.add.text(x, y, text, {
            fontSize: ScaleHelper.font('18px'),
            fontWeight: 'bold',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // Make interactive
        const hitArea = new Phaser.Geom.Rectangle(x - btnWidth/2, y - btnHeight/2, btnWidth, btnHeight);
        buttonBg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        
        buttonBg.on('pointerover', () => {
            this.audioManager.playUISound('hover');
            this.tweens.add({
                targets: [buttonBg, buttonText],
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 200
            });
        });
        
        buttonBg.on('pointerout', () => {
            this.tweens.add({
                targets: [buttonBg, buttonText],
                scaleX: 1,
                scaleY: 1,
                duration: 200
            });
        });
        
        buttonBg.on('pointerdown', () => {
            this.audioManager.playUISound('click');
            callback();
        });
        
        return buttonBg;
    }
    
    createConnectionStatus() {
        this.connectionStatus = this.add.text(ScaleHelper.x(15), ScaleHelper.height() - ScaleHelper.y(25), '● Connected', {
            fontSize: ScaleHelper.font('14px'),
            fill: '#00ff00'
        });
    }
    
    setupSocketListeners() {
        if (!this.game.socket) return;
        
        this.game.socket.on('roomList', (rooms) => {
            this.updateRoomList(rooms);
        });
        
        this.game.socket.on('roomListUpdate', (rooms) => {
            this.updateRoomList(rooms);
        });
        
        this.game.socket.on('roomCreated', (data) => {
            this.audioManager.stopMusic();
            this.scene.start('LobbyScene', {
                roomId: data.roomId,
                playerId: data.playerId,
                isHost: true
            });
        });
        
        this.game.socket.on('roomJoined', (data) => {
            this.audioManager.stopMusic();
            this.scene.start('LobbyScene', {
                roomId: data.roomId,
                playerId: data.playerId,
                isHost: false
            });
        });
        
        this.game.socket.on('joinRoomError', (data) => {
            this.showError(data.message);
        });
        
        this.game.socket.on('connect', () => {
            this.updateConnectionStatus(true);
            this.refreshRoomList();
        });
        
        this.game.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
        });
    }
    
    updateRoomList(rooms) {
        this.rooms = rooms;
        
        // Clear existing room list
        this.roomListContainer.removeAll(true);
        
        if (rooms.length === 0) {
            this.noRoomsText.setVisible(true);
            return;
        }
        
        this.noRoomsText.setVisible(false);
        
        // Display rooms
        rooms.forEach((room, index) => {
            if (index >= 6) return; // Display up to 6 rooms with increased height
            
            const yPos = index * ScaleHelper.y(35);
            
            // Room ID
            const roomText = this.add.text(ScaleHelper.x(20), yPos, room.id, {
                fontSize: ScaleHelper.font('14px'),
                fill: '#ffffff'
            });
            
            // Host name
            const hostText = this.add.text(ScaleHelper.x(170), yPos, room.hostName, {
                fontSize: ScaleHelper.font('14px'),
                fill: '#aaaaaa'
            });
            
            // Player count
            const playerCountText = this.add.text(ScaleHelper.x(310), yPos, `${room.playerCount}/${room.maxPlayers}`, {
                fontSize: ScaleHelper.font('14px'),
                fill: room.playerCount >= room.maxPlayers ? '#ff0000' : '#00ff00'
            });
            
            // Status
            const statusColor = room.status === 'waiting' ? '#00ff00' :
                              room.status === 'playing' ? '#ffff00' : '#ff0000';
            const statusText = this.add.text(ScaleHelper.x(410), yPos, room.status.toUpperCase(), {
                fontSize: ScaleHelper.font('14px'),
                fill: statusColor,
                fontWeight: 'bold'
            });
            
            // Join button (only for waiting rooms)
            if (room.status === 'waiting' && room.playerCount < room.maxPlayers) {
                const joinButton = this.add.text(ScaleHelper.x(550), yPos, 'JOIN', {
                    fontSize: ScaleHelper.font('14px'),
                    fill: '#00ffff',
                    backgroundColor: '#003333',
                    padding: { x: 10, y: 5 }
                });
                
                joinButton.setInteractive();
                joinButton.on('pointerover', () => {
                    this.audioManager.playUISound('hover');
                    joinButton.setScale(1.1);
                });
                joinButton.on('pointerout', () => {
                    joinButton.setScale(1);
                });
                joinButton.on('pointerdown', () => {
                    this.audioManager.playUISound('click');
                    this.joinRoom(room.id);
                });
                
                this.roomListContainer.add(joinButton);
            }
            
            this.roomListContainer.add([roomText, hostText, playerCountText, statusText]);
        });
    }
    
    createNewRoom() {
        if (!this.game.socket || !this.game.socket.connected) {
            this.showError('Not connected to server');
            return;
        }
        
        this.game.socket.emit('createRoom', { playerName: this.playerName });
    }
    
    joinRoom(roomId) {
        if (!this.game.socket || !this.game.socket.connected) {
            this.showError('Not connected to server');
            return;
        }
        
        this.game.socket.emit('joinRoom', {
            roomId: roomId,
            playerName: this.playerName
        });
    }
    
    refreshRoomList() {
        if (this.game.socket && this.game.socket.connected) {
            this.game.socket.emit('getRoomList');
        }
    }
    
    showError(message) {
        const errorText = this.add.text(ScaleHelper.centerX(), ScaleHelper.centerY(), message, {
            fontSize: ScaleHelper.font('20px'),
            fill: '#ff0000',
            backgroundColor: '#330000',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: errorText,
            alpha: 0,
            duration: 2000,
            delay: 2000,
            onComplete: () => errorText.destroy()
        });
    }
    
    updateConnectionStatus(connected) {
        this.connectionStatus.setText(connected ? '● Connected' : '● Disconnected');
        this.connectionStatus.setFill(connected ? '#00ff00' : '#ff0000');
    }
    
    shutdown() {
        if (this.refreshTimer) {
            this.refreshTimer.destroy();
        }
        
        if (this.audioManager) {
            this.audioManager.destroy();
        }
        
        if (this.game.socket) {
            this.game.socket.off('roomList');
            this.game.socket.off('roomListUpdate');
            this.game.socket.off('roomCreated');
            this.game.socket.off('roomJoined');
            this.game.socket.off('joinRoomError');
        }
    }
}