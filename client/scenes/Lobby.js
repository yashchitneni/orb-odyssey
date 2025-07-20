class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LobbyScene' });
        this.players = [];
        this.audioManager = null;
        this.roomId = null;
        this.playerId = null;
        this.isHost = false;
    }

    init(data) {
        this.roomId = data.roomId;
        this.playerId = data.playerId;
        this.isHost = data.isHost || false;
        this.isConnected = true; // Track connection status
    }

    create() {
        // Initialize audio manager
        if (!this.audioManager) {
            this.audioManager = new AudioManager(this);
        }
        
        // Start lobby background music
        this.audioManager.playMusic('LOBBY');
        
        // Create enhanced background
        this.createEnhancedBackground();
        
        // Main title with glow effect
        this.createTitle();
        
        // Status and waiting message
        this.createStatusPanel();

        // Enhanced player list panel
        this.createPlayerListPanel();

        // Enhanced start button
        this.createStartButton();
        
        // Game rules/info panel
        this.createGameInfoPanel();

        if (this.game.socket) {
            // Remove any existing listeners to prevent duplicates
            this.game.socket.off('playerList');
            this.game.socket.off('gameStart');
            this.game.socket.off('playerLeft');
            
            this.game.socket.on('playerList', (players) => {
                console.log('Received player list:', players);
                this.updatePlayerList(players);
            });

            this.game.socket.on('gameStart', () => {
                console.log('[LOBBY] Game starting! Room:', this.roomId, 'Player:', this.playerId);
                this.audioManager.stopMusic();
                this.scene.start('GameArenaScene', {
                    roomId: this.roomId,
                    playerId: this.playerId
                });
            });
            
            this.game.socket.on('playerLeft', (playerId) => {
                console.log('Player left:', playerId);
                // Request updated player list
                if (this.game.socket.connected) {
                    this.game.socket.emit('requestPlayerList');
                }
            });
            
            // Request player list on scene start
            console.log('Requesting initial player list for room:', this.roomId);
            this.game.socket.emit('requestPlayerList');
            
            // Add connection status listeners
            this.game.socket.on('connect', () => {
                this.updateConnectionStatus(true);
            });
            
            this.game.socket.on('disconnect', () => {
                this.updateConnectionStatus(false);
            });
        }
    }

    createEnhancedBackground() {
        // Enhanced gradient background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x000033, 0x001144, 0x000022, 0x002244);
        bg.fillRect(0, 0, 800, 600);
        
        // Enhanced starfield background with multiple layers
        this.createMultiLayerStarfield();
        
        // Add flowing nebula particles
        this.createFlowingNebula();
        
        // Add subtle animated grid
        this.createAnimatedGrid();
    }
    
    createMultiLayerStarfield() {
        const starConfig = GAME_CONSTANTS.VISUAL_EFFECTS.ENVIRONMENT.STARS;
        this.starfield = this.add.group();
        
        // Background stars (small, slow)
        for (let i = 0; i < starConfig.COUNT * 0.7; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                Phaser.Math.FloatBetween(0.5, 1.5),
                0xffffff,
                Phaser.Math.FloatBetween(0.2, 0.6)
            );
            this.starfield.add(star);
            
            // Slow twinkling
            this.tweens.add({
                targets: star,
                alpha: 0.1,
                duration: Phaser.Math.Between(2000, 4000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
        
        // Foreground stars (larger, faster)
        for (let i = 0; i < starConfig.COUNT * 0.3; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                Phaser.Math.FloatBetween(2, 4),
                0xffffff,
                Phaser.Math.FloatBetween(0.4, 0.9)
            );
            this.starfield.add(star);
            
            // Fast twinkling
            this.tweens.add({
                targets: star,
                alpha: 0.2,
                duration: Phaser.Math.Between(800, 1500),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }
    
    createFlowingNebula() {
        const nebulaConfig = GAME_CONSTANTS.VISUAL_EFFECTS.PARTICLES.AMBIENT_NEBULA;
        this.nebulaParticles = [];
        
        for (let i = 0; i < nebulaConfig.COUNT * 0.5; i++) {
            const particle = this.add.circle(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                Phaser.Math.Between(2, 8),
                Phaser.Utils.Array.GetRandom([0x4400ff, 0x6600ff, 0x8800ff]),
                Phaser.Math.FloatBetween(0.1, 0.3)
            );
            
            // Add flowing movement
            particle.velocity = {
                x: Phaser.Math.FloatBetween(-20, 20),
                y: Phaser.Math.FloatBetween(-30, 30)
            };
            
            // Add pulsing animation
            this.tweens.add({
                targets: particle,
                alpha: particle.alpha + 0.2,
                scaleX: 1.5,
                scaleY: 1.5,
                duration: Phaser.Math.Between(3000, 5000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Phaser.Math.Between(0, 2000)
            });
            
            this.nebulaParticles.push(particle);
        }
    }
    
    createAnimatedGrid() {
        // Subtle grid lines for sci-fi effect
        const gridGraphics = this.add.graphics();
        gridGraphics.lineStyle(1, 0x004488, 0.1);
        
        // Vertical lines
        for (let x = 0; x <= 800; x += 80) {
            gridGraphics.moveTo(x, 0);
            gridGraphics.lineTo(x, 600);
        }
        
        // Horizontal lines
        for (let y = 0; y <= 600; y += 60) {
            gridGraphics.moveTo(0, y);
            gridGraphics.lineTo(800, y);
        }
        
        gridGraphics.strokePath();
        
        // Animate grid opacity
        this.tweens.add({
            targets: gridGraphics,
            alpha: 0.05,
            duration: 4000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    createTitle() {
        // Main title
        this.titleText = this.add.text(400, 80, 'ORB ODYSSEY', {
            ...GAME_CONSTANTS.UI.FONTS.TITLE,
            fill: GAME_CONSTANTS.UI.COLORS.PRIMARY,
            stroke: GAME_CONSTANTS.UI.COLORS.BLACK,
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Title glow effect
        this.titleGlow = this.add.text(400, 100, 'ORB ODYSSEY', {
            ...GAME_CONSTANTS.UI.FONTS.TITLE,
            fill: GAME_CONSTANTS.UI.COLORS.GLOW,
            alpha: 0.5
        }).setOrigin(0.5);
        
        // Pulsing animation for title
        this.tweens.add({
            targets: [this.titleText, this.titleGlow],
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Subtitle
        this.add.text(400, 130, 'Multiplayer Crystal Collection Arena', {
            ...GAME_CONSTANTS.UI.FONTS.SUBTITLE,
            fill: GAME_CONSTANTS.UI.COLORS.WHITE,
            fontStyle: 'italic'
        }).setOrigin(0.5);
        
        // Room ID
        this.add.text(400, 160, `Room: ${this.roomId}`, {
            fontSize: '20px',
            fill: '#ffff00',
            fontWeight: 'bold'
        }).setOrigin(0.5);
    }
    
    createStatusPanel() {
        // Status panel background
        this.statusPanel = this.add.graphics();
        this.statusPanel.fillGradientStyle(0x2a2a2a, 0x2a2a2a, 0x1a1a1a, 0x1a1a1a);
        this.statusPanel.fillRoundedRect(250, 180, 300, 60, 12);
        this.statusPanel.lineStyle(2, 0x00ffff);
        this.statusPanel.strokeRoundedRect(250, 180, 300, 60, 12);
        
        // Status text
        this.statusText = this.add.text(400, 210, 'Waiting for players...', {
            ...GAME_CONSTANTS.UI.FONTS.BODY,
            fill: GAME_CONSTANTS.UI.COLORS.WARNING
        }).setOrigin(0.5);
        
        // Animated dots for waiting effect
        this.createWaitingAnimation();
    }
    
    createWaitingAnimation() {
        const dots = '   ';
        let dotCount = 0;
        
        this.waitingTimer = this.time.addEvent({
            delay: 500,
            callback: () => {
                dotCount = (dotCount + 1) % 4;
                const dotsDisplay = '.'.repeat(dotCount);
                this.statusText.setText('Waiting for players' + dotsDisplay);
            },
            loop: true
        });
    }
    
    createPlayerListPanel() {
        // Player list panel background
        this.playerPanel = this.add.graphics();
        this.playerPanel.fillStyle(0x1a1a1a, 0.9);
        this.playerPanel.fillRoundedRect(200, 260, 400, 200, 12);
        this.playerPanel.lineStyle(2, 0xff00ff);
        this.playerPanel.strokeRoundedRect(200, 260, 400, 200, 12);
        
        // Panel title
        this.add.text(400, 280, 'PLAYERS IN LOBBY', {
            fontSize: '20px',
            fontWeight: 'bold',
            fill: GAME_CONSTANTS.UI.COLORS.SECONDARY
        }).setOrigin(0.5);
        
        // Player list container
        this.playerListContainer = this.add.container(220, 310);
        
        // Column headers
        this.add.text(220, 300, 'Player', {
            fontSize: '16px',
            fontWeight: 'bold',
            fill: GAME_CONSTANTS.UI.COLORS.WHITE
        });
        this.add.text(450, 300, 'Status', {
            fontSize: '16px',
            fontWeight: 'bold',
            fill: GAME_CONSTANTS.UI.COLORS.WHITE
        });
        this.add.text(550, 300, 'Ready', {
            fontSize: '16px',
            fontWeight: 'bold',
            fill: GAME_CONSTANTS.UI.COLORS.WHITE
        });
    }
    
    createStartButton() {
        // Start button background
        this.startButtonBg = this.add.graphics();
        this.startButtonBg.fillGradientStyle(0x00ff00, 0x00aa00, 0x008800, 0x004400);
        this.startButtonBg.fillRoundedRect(300, 480, 200, 60, 16);
        this.startButtonBg.lineStyle(3, 0x00ffff);
        this.startButtonBg.strokeRoundedRect(300, 480, 200, 60, 16);
        
        // Start button text
        this.startButtonText = this.add.text(400, 510, 'START GAME', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            fill: GAME_CONSTANTS.UI.COLORS.WHITE,
            stroke: GAME_CONSTANTS.UI.COLORS.BLACK,
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Make button interactive
        this.startButtonBg.setInteractive(new Phaser.Geom.Rectangle(300, 480, 200, 60), Phaser.Geom.Rectangle.Contains);
        this.startButtonText.setInteractive();
        
        // Button hover effects
        [this.startButtonBg, this.startButtonText].forEach(element => {
            element.on('pointerover', () => {
                this.audioManager.playUISound('hover');
                this.tweens.add({
                    targets: [this.startButtonBg, this.startButtonText],
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 200
                });
            });
            
            element.on('pointerout', () => {
                this.tweens.add({
                    targets: [this.startButtonBg, this.startButtonText],
                    scaleX: 1,
                    scaleY: 1,
                    duration: 200
                });
            });
            
            element.on('pointerdown', () => {
                this.audioManager.playUISound('click');
                
                // Visual feedback
                this.tweens.add({
                    targets: [this.startButtonBg, this.startButtonText],
                    scaleX: 0.95,
                    scaleY: 0.95,
                    duration: 100,
                    yoyo: true
                });
                
                if (this.game.socket) {
                    this.game.socket.emit('startGame');
                }
            });
        });
        
        // Pulsing glow effect when ready
        this.startButtonGlow = this.add.graphics();
        this.startButtonGlow.fillStyle(0x00ff00, 0.3);
        this.startButtonGlow.fillRoundedRect(295, 475, 210, 70, 20);
        this.startButtonGlow.setVisible(false);
        
        this.tweens.add({
            targets: this.startButtonGlow,
            alpha: 0.6,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
    }
    
    createGameInfoPanel() {
        // Game info panel
        this.infoPanel = this.add.graphics();
        this.infoPanel.fillStyle(0x1a1a1a, 0.8);
        this.infoPanel.fillRoundedRect(50, 320, 120, 200, 8);
        this.infoPanel.lineStyle(1, 0x555555);
        this.infoPanel.strokeRoundedRect(50, 320, 120, 200, 8);
        
        // Game rules text
        const rulesText = `GAME RULES:

• Collect crystals
• Level up (1-4)
• Use abilities
• Control Nebula
• First to ${GAME_CONSTANTS.WIN_CONDITIONS.CRYSTAL_TARGET} wins!

CONTROLS:
WASD - Move
Q - Burst (L3+)
E - Wall (L4+)`;
        
        this.add.text(60, 330, rulesText, {
            fontSize: '11px',
            fill: GAME_CONSTANTS.UI.COLORS.WHITE,
            lineSpacing: 3,
            wordWrap: { width: 100 }
        });
        
        // Connection status
        this.connectionStatus = this.add.text(60, 540, '● Connected', {
            fontSize: '12px',
            fill: GAME_CONSTANTS.UI.COLORS.SUCCESS
        });
        
        // Back to menu button
        this.createBackButton();
    }
    
    createBackButton() {
        const backButton = this.add.text(700, 30, '← Back to Menu', {
            fontSize: '16px',
            fill: '#ffff00',
            backgroundColor: '#333300',
            padding: { x: 10, y: 5 }
        });
        
        backButton.setInteractive();
        
        backButton.on('pointerover', () => {
            this.audioManager.playUISound('hover');
            backButton.setScale(1.05);
        });
        
        backButton.on('pointerout', () => {
            backButton.setScale(1);
        });
        
        backButton.on('pointerdown', () => {
            this.audioManager.playUISound('click');
            if (this.game.socket) {
                this.game.socket.emit('leaveRoom');
            }
            this.audioManager.stopMusic();
            this.scene.start('MainMenuScene');
        });
    }

    updatePlayerList(players) {
        this.players = players;
        
        if (this.playerListContainer) {
            // Clear existing player list
            this.playerListContainer.removeAll(true);
            
            // Add players with enhanced display
            players.forEach((player, index) => {
                const yPos = index * 30;
                
                // Player indicator circle
                const indicator = this.add.circle(0, yPos + 10, 8, player.color || 0x00ff00);
                
                // Player name with host indicator
                const isHost = index === 0; // First player in list is the host
                const namePrefix = isHost ? '👑 ' : '';
                const nameText = this.add.text(20, yPos, namePrefix + (player.name || `Player ${index + 1}`), {
                    fontSize: '16px',
                    fill: isHost ? '#ffd700' : GAME_CONSTANTS.UI.COLORS.WHITE,
                    fontWeight: 'bold'
                });
                
                // Player status
                const statusText = this.add.text(230, yPos, 'Connected', {
                    fontSize: '14px',
                    fill: GAME_CONSTANTS.UI.COLORS.SUCCESS
                });
                
                // Ready indicator
                const readyIndicator = this.add.text(330, yPos, '✓', {
                    fontSize: '16px',
                    fill: GAME_CONSTANTS.UI.COLORS.SUCCESS
                });
                
                this.playerListContainer.add([indicator, nameText, statusText, readyIndicator]);
            });
            
            // Update start button based on multiple conditions
            let buttonText = 'START GAME';
            let canInteract = false;
            let buttonAlpha = 0.5;
            
            if (!this.isConnected) {
                buttonText = 'Disconnected';
                canInteract = false;
                buttonAlpha = 0.3;
            } else if (!this.isHost) {
                buttonText = 'Waiting for Host';
                canInteract = false;
                buttonAlpha = 0.5;
            } else if (players.length < 2) {
                buttonText = 'Waiting for Players...';
                canInteract = false;
                buttonAlpha = 0.5;
            } else {
                // Host with enough players
                buttonText = 'START GAME';
                canInteract = true;
                buttonAlpha = 1;
            }
            
            // Update button appearance
            this.startButtonText.setText(buttonText);
            this.startButtonGlow.setVisible(canInteract);
            this.startButtonBg.setAlpha(buttonAlpha);
            this.startButtonText.setAlpha(buttonAlpha);
            
            // Update button interactivity
            if (canInteract) {
                this.startButtonBg.setInteractive();
                this.startButtonText.setInteractive();
            } else {
                this.startButtonBg.disableInteractive();
                this.startButtonText.disableInteractive();
            }
            
            // Update status text
            if (canInteract && players.length >= 2) {
                this.statusText.setText('Ready to start!');
                this.statusText.setFill(GAME_CONSTANTS.UI.COLORS.SUCCESS);
                this.waitingTimer?.destroy();
                
                // Play notification sound when ready to start
                if (!this.wasReady) {
                    this.audioManager.playUISound('notification');
                    this.wasReady = true;
                }
            } else {
                this.statusText.setText('Need more players');
                this.statusText.setFill(GAME_CONSTANTS.UI.COLORS.WARNING);
                this.wasReady = false;
            }
        }
    }
    
    updateConnectionStatus(connected) {
        this.isConnected = connected;
        
        if (this.connectionStatus) {
            this.connectionStatus.setText(connected ? '● Connected' : '● Disconnected');
            this.connectionStatus.setFill(connected ? GAME_CONSTANTS.UI.COLORS.SUCCESS : GAME_CONSTANTS.UI.COLORS.DANGER);
        }
        
        // Update start button to reflect connection status
        if (this.players && this.startButtonText) {
            this.updatePlayerList(this.players);
        }
    }
    
    update(time, delta) {
        // Update flowing nebula particles
        if (this.nebulaParticles) {
            const deltaTime = delta / 1000;
            this.nebulaParticles.forEach(particle => {
                particle.x += particle.velocity.x * deltaTime;
                particle.y += particle.velocity.y * deltaTime;
                
                // Wrap around screen
                if (particle.x < -20) particle.x = 820;
                if (particle.x > 820) particle.x = -20;
                if (particle.y < -20) particle.y = 620;
                if (particle.y > 620) particle.y = -20;
            });
        }
    }

    shutdown() {
        if (this.waitingTimer) {
            this.waitingTimer.destroy();
        }
        
        if (this.audioManager) {
            this.audioManager.destroy();
        }
        
        if (this.game.socket) {
            this.game.socket.off('playerList');
            this.game.socket.off('gameStart');
            this.game.socket.off('playerLeft');
            this.game.socket.off('connect');
            this.game.socket.off('disconnect');
        }
    }
}