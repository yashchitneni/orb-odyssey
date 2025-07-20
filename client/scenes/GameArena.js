class GameArenaScene extends BaseScene {
    constructor() {
        super({ key: 'GameArenaScene' });
        this.players = {};
        this.orbs = {};
        this.crystals = {};
        this.myId = null;
        this.roomId = null;
        this.trails = {};
        this.inputVector = { x: 0, y: 0 };
        this.mouseDown = false;
        this.touchStartPos = null;
        this.virtualJoystick = null;
        this.joystickBase = null;
        this.joystickThumb = null;
        this.isMobile = false;
        this.clientPrediction = {};
        this.playerLevels = {};
        this.playerParticles = {};
        this.nebulaCore = null;
        this.abilities = {
            burst: { available: false, cooldown: 0 },
            wall: { available: false, cooldown: 0 }
        };
        this.energy = 100;
        this.walls = {};
        this.audioManager = null;
        this.gameTime = 600; // 10 minutes
        this.gamePhase = 'waiting';
        this.roundEndTime = null;
        this.warmupEndTime = null;
        this.nebulaCoreController = null;
        this.nebulaCoreControlTime = 0;
        this.performanceMonitor = null;
        this.stressTester = null;
        this.objectPool = null;
        this.updateCounter = 0;
        this.particleEffectsEnabled = true;
        this.particleEffectsReduced = false;
        this.currentPerformanceMode = 'high';
        this.cullingActive = false;
        this.backgroundStars = [];
        this.ambientParticles = [];
        this.floatingTexts = [];
        this.nebulaAnimationTime = 0;
        this.orbTrails = {};
        this.audioSettingsPanel = null;
        this.clientPredictionEnabled = true;
        this.lastInputVector = { x: 0, y: 0 };
        this.seriesScores = {};
        this.currentRound = 1;
    }

    init(data) {
        // Reset all game state when scene starts/restarts
        this.players = {};
        this.orbs = {};
        this.crystals = {};
        this.myId = data?.playerId || null;
        this.roomId = data?.roomId || null;
        
        this.trails = {};
        this.inputVector = { x: 0, y: 0 };
        this.walls = [];
        this.updateCounter = 0;
        this.currentPerformanceMode = 'medium';
        this.energy = 100;
        this.lastInputVector = { x: 0, y: 0 };
        this.seriesScores = {};
        this.currentRound = 1;
        
        // Clean up any existing tweens
        if (this.tweens) {
            this.tweens.killAll();
        }
    }

    preload() {
        this.load.video('nebulaVideo', 'assets/backgrounds/nebula.mp4', 'loadeddata', false, true);
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.audioManager = new AudioManager(this);
        // Simplified performance monitoring
        this.performanceMonitor = {
            startMonitoring: () => {},
            update: () => {},
            toggleDisplay: () => {},
            getAverageStats: () => ({ avgFps: 60 })
        };
        this.stressTester = {
            quickFpsTest: () => {},
            quickMemoryTest: () => {},
            startStressTest: (level) => {},
            stopStressTest: () => ({ result: 'test completed' }),
            getRecommendations: () => 'No recommendations',
            isRunning: false
        };
        this.objectPool = {
            cleanup: () => {},
            getAllStats: () => ({})
        };
    }

    create() {
        this.createEnhancedBackground();
        this.initializeVisualEffects();
        this.createHUD();
        this.createUI();
        this.setupControls();
        this.setupSocketListeners();
        this.setupPerformanceHotkeys();
        
        if (this.isMobile) {
            this.adjustHUDForMobile();
        }

        this.audioManager.playGameplayMusic();
        this.performanceMonitor.startMonitoring();

        if (this.game.socket) {
            this.game.socket.emit('enterArena');
        }
    }

    update(time, delta) {
        this.updateVisualEffects(delta);
        this.updatePlayerMovement(delta);
        this.updateOrbTrails();
        this.updatePerformanceOptimizations();
        this.updateAbilityCooldowns(delta);
        this.updateMobileAbilityButtons();
        this.performanceMonitor.update(time, delta);
    }

    createHUD() {
        // Crystal counter
        this.crystalText = this.add.text(ScaleHelper.x(15), ScaleHelper.y(15), 'Crystals: 0', {
            fontSize: ScaleHelper.font('20px'),
            fill: GAME_CONSTANTS.UI.COLORS.PRIMARY,
            stroke: GAME_CONSTANTS.UI.COLORS.BLACK,
            strokeThickness: ScaleHelper.scale(2)
        });

        // Level indicator
        this.levelText = this.add.text(ScaleHelper.x(15), ScaleHelper.y(75), 'Level: 1', {
            fontSize: ScaleHelper.font('18px'),
            fill: GAME_CONSTANTS.UI.COLORS.SUCCESS,
            stroke: GAME_CONSTANTS.UI.COLORS.BLACK,
            strokeThickness: ScaleHelper.scale(2)
        });

        // Game timer
        this.timeText = this.add.text(ScaleHelper.centerX(), ScaleHelper.y(15), 'Time: 10:00', {
            fontSize: ScaleHelper.font('20px'),
            fill: GAME_CONSTANTS.UI.COLORS.WHITE,
            stroke: GAME_CONSTANTS.UI.COLORS.BLACK,
            strokeThickness: ScaleHelper.scale(2)
        }).setOrigin(0.5, 0);

        // Connection status
        this.connectionStatus = this.add.text(ScaleHelper.x(15), ScaleHelper.height() - ScaleHelper.scale(30), '● Connected', {
            fontSize: ScaleHelper.font('14px'),
            fill: GAME_CONSTANTS.UI.COLORS.SUCCESS
        });

        this.createProgressBar();
        this.createEnergyBar();
        this.createAbilityDisplay();
        this.createWinConditionPanel();
        this.createPlayerListPanel();
        this.createControlsHelpPanel();
        
        if (!this.isMobile) {
            this.createMinimap();
        }
    }

    createProgressBar() {
        const x = ScaleHelper.x(15);
        const y = ScaleHelper.y(105);
        const width = ScaleHelper.scale(280);
        const height = ScaleHelper.scale(12);

        this.progressBarBg = this.add.graphics();
        this.progressBarBg.fillStyle(0x333333);
        this.progressBarBg.fillRoundedRect(x, y, width, height, ScaleHelper.scale(6));
        this.progressBarBg.lineStyle(ScaleHelper.scale(2), 0x555555);
        this.progressBarBg.strokeRoundedRect(x, y, width, height, ScaleHelper.scale(6));

        this.progressBar = this.add.graphics();
        this.updateProgressBar(0, 20);
    }

    updateProgressBar(current, target) {
        const x = ScaleHelper.x(15);
        const y = ScaleHelper.y(105);
        const width = ScaleHelper.scale(280);
        const height = ScaleHelper.scale(12);
        const progress = Math.min(current / target, 1);
        const barWidth = (width - ScaleHelper.scale(4)) * progress;

        this.progressBar.clear();
        if (barWidth > 0) {
            // Use XP gradient since PROGRESS gradient doesn't exist
            const colors = GAME_CONSTANTS.UI.GRADIENTS.XP;
            this.progressBar.fillGradientStyle(colors[0], colors[1], colors[0], colors[1]);
            this.progressBar.fillRoundedRect(x + ScaleHelper.scale(2), y + ScaleHelper.scale(2), barWidth, height - ScaleHelper.scale(4), ScaleHelper.scale(4));
        }
    }

    createEnergyBar() {
        const x = ScaleHelper.x(15);
        const y = ScaleHelper.y(140);
        const width = ScaleHelper.scale(280);
        const height = ScaleHelper.scale(15);

        this.energyBarBg = this.add.graphics();
        this.energyBarBg.fillStyle(0x1a1a1a);
        this.energyBarBg.fillRoundedRect(x, y, width, height, ScaleHelper.scale(7));
        this.energyBarBg.lineStyle(ScaleHelper.scale(2), 0x333333);
        this.energyBarBg.strokeRoundedRect(x, y, width, height, ScaleHelper.scale(7));

        this.energyBar = this.add.graphics();
        
        this.energyText = this.add.text(x + ScaleHelper.scale(10), y + height + ScaleHelper.scale(5), 'Energy: 100/100', {
            fontSize: ScaleHelper.font('14px'),
            fill: GAME_CONSTANTS.UI.COLORS.PRIMARY
        });
        
        this.updateEnergyBar(100, 100);
    }

    updateEnergyBar(current, max) {
        const x = ScaleHelper.x(15);
        const y = ScaleHelper.y(140);
        const width = ScaleHelper.scale(280);
        const height = ScaleHelper.scale(15);
        const progress = Math.min(current / max, 1);
        const barWidth = width * progress;
        
        this.energyBar.clear();
        
        if (barWidth > 0) {
            const colors = GAME_CONSTANTS.UI.GRADIENTS.ENERGY;
            this.energyBar.fillGradientStyle(colors[0], colors[1], colors[0], colors[1]);
            this.energyBar.fillRoundedRect(x + ScaleHelper.scale(2), y + ScaleHelper.scale(2), barWidth - ScaleHelper.scale(4), height - ScaleHelper.scale(4), ScaleHelper.scale(5));
        }
        
        this.energyText.setText(`Energy: ${Math.floor(current)}/${max}`);
    }

    createAbilityDisplay() {
        this.abilityText = this.add.text(ScaleHelper.x(15), ScaleHelper.y(180), '', {
            fontSize: ScaleHelper.font('16px'),
            fill: GAME_CONSTANTS.UI.COLORS.WARNING,
            stroke: GAME_CONSTANTS.UI.COLORS.BLACK,
            strokeThickness: ScaleHelper.scale(1)
        });
        this.updateAbilityDisplay();
    }

    updateAbilityDisplay() {
        let abilityInfo = [];
        
        // Get energy cost reduction if available
        const player = this.players[this.myId];
        const reduction = player?.energyCostReduction || 0;
        
        if (this.abilities.burst.available) {
            const baseCost = GAME_CONSTANTS.ABILITIES.BURST.ENERGY_COST;
            const actualCost = Math.floor(baseCost * (1 - reduction));
            const burstColor = this.energy >= actualCost && this.abilities.burst.cooldown === 0 ?
                              GAME_CONSTANTS.UI.COLORS.SUCCESS : GAME_CONSTANTS.UI.COLORS.DANGER;
            const burstStatus = this.abilities.burst.cooldown > 0 ? 
                               `(${Math.ceil(this.abilities.burst.cooldown / 1000)}s)` : 
                               this.energy >= actualCost ? `(${actualCost}E)` : '(No Energy)';
            abilityInfo.push(`Q: Burst ${burstStatus}`);
        }
        
        if (this.abilities.wall.available) {
            const baseCost = GAME_CONSTANTS.ABILITIES.WALL.ENERGY_COST;
            const actualCost = Math.floor(baseCost * (1 - reduction));
            const wallColor = this.energy >= actualCost && this.abilities.wall.cooldown === 0 ?
                             GAME_CONSTANTS.UI.COLORS.SUCCESS : GAME_CONSTANTS.UI.COLORS.DANGER;
            const wallStatus = this.abilities.wall.cooldown > 0 ? 
                              `(${Math.ceil(this.abilities.wall.cooldown / 1000)}s)` : 
                              this.energy >= actualCost ? `(${actualCost}E)` : '(No Energy)';
            abilityInfo.push(`E: Wall ${wallStatus}`);
        }
        
        this.abilityText.setText(abilityInfo.join('  '));
    }

    createUI() {
        // Any additional UI elements
    }

    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');
        
        // Ability keys
        this.qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

        // Mouse/Touch controls
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);

        if (this.isMobile) {
            this.createVirtualJoystick();
        }
    }

    createVirtualJoystick() {
        const joystickX = ScaleHelper.x(80);
        const joystickY = ScaleHelper.height() - ScaleHelper.scale(80);
        const baseRadius = ScaleHelper.scale(40);
        const thumbRadius = ScaleHelper.scale(20);

        this.joystickBase = this.add.circle(joystickX, joystickY, baseRadius, 0x333333, 0.5);
        this.joystickBase.setStrokeStyle(ScaleHelper.scale(2), 0x666666);
        
        this.joystickThumb = this.add.circle(joystickX, joystickY, thumbRadius, 0x666666);
        this.joystickThumb.setInteractive();
        
        this.virtualJoystick = {
            base: this.joystickBase,
            thumb: this.joystickThumb,
            baseX: joystickX,
            baseY: joystickY,
            isDragging: false,
            deadZone: 5
        };

        this.input.setDraggable(this.joystickThumb);
        
        this.joystickThumb.on('dragstart', () => {
            this.virtualJoystick.isDragging = true;
        });

        this.joystickThumb.on('drag', (pointer, dragX, dragY) => {
            this.updateVirtualJoystick(dragX, dragY);
        });

        this.joystickThumb.on('dragend', () => {
            this.virtualJoystick.isDragging = false;
            this.joystickThumb.setPosition(this.virtualJoystick.baseX, this.virtualJoystick.baseY);
            this.inputVector = { x: 0, y: 0 };
        });
    }

    updateVirtualJoystick(x, y) {
        const baseX = this.virtualJoystick.baseX;
        const baseY = this.virtualJoystick.baseY;
        const maxDistance = ScaleHelper.scale(35);
        
        const distance = Phaser.Math.Distance.Between(baseX, baseY, x, y);
        
        if (distance <= maxDistance) {
            this.joystickThumb.setPosition(x, y);
        } else {
            const angle = Phaser.Math.Angle.Between(baseX, baseY, x, y);
            const newX = baseX + Math.cos(angle) * maxDistance;
            const newY = baseY + Math.sin(angle) * maxDistance;
            this.joystickThumb.setPosition(newX, newY);
        }

        if (distance > this.virtualJoystick.deadZone) {
            const clampedDistance = Math.min(distance, maxDistance);
            const normalizedX = (this.joystickThumb.x - baseX) / maxDistance;
            const normalizedY = (this.joystickThumb.y - baseY) / maxDistance;
            
            this.inputVector = {
                x: normalizedX,
                y: normalizedY
            };
        } else {
            this.inputVector = { x: 0, y: 0 };
        }
    }

    handlePointerDown(pointer) {
        if (this.isMobile && this.virtualJoystick && 
            Phaser.Math.Distance.Between(pointer.x, pointer.y, this.virtualJoystick.baseX, this.virtualJoystick.baseY) < ScaleHelper.scale(60)) {
            return;
        }

        this.mouseDown = true;
        this.touchStartPos = { x: pointer.x, y: pointer.y };
    }

    handlePointerMove(pointer) {
        if (!this.mouseDown || !this.touchStartPos) return;
        if (this.isMobile && this.virtualJoystick && this.virtualJoystick.isDragging) return;

        const dx = pointer.x - this.touchStartPos.x;
        const dy = pointer.y - this.touchStartPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 10) {
            this.inputVector = {
                x: Math.max(-1, Math.min(1, dx / 100)),
                y: Math.max(-1, Math.min(1, dy / 100))
            };
        }
    }

    handlePointerUp() {
        this.mouseDown = false;
        this.touchStartPos = null;
        if (!this.isMobile || !this.virtualJoystick || !this.virtualJoystick.isDragging) {
            this.inputVector = { x: 0, y: 0 };
        }
    }

    updatePlayerMovement(delta) {
        if (!this.myId || this.gamePhase !== 'playing') {
            return;
        }

        let moveX = 0;
        let moveY = 0;

        // Keyboard input
        if (this.cursors.left.isDown || this.wasd.A.isDown) moveX -= 1;
        if (this.cursors.right.isDown || this.wasd.D.isDown) moveX += 1;
        if (this.cursors.up.isDown || this.wasd.W.isDown) moveY -= 1;
        if (this.cursors.down.isDown || this.wasd.S.isDown) moveY += 1;

        // Mouse/Touch input
        moveX += this.inputVector.x;
        moveY += this.inputVector.y;

        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= length;
            moveY /= length;
        }

        // Handle abilities
        if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
            this.useAbility('burst');
        }
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.useAbility('wall');
        }
        if (Phaser.Input.Keyboard.JustDown(this.mKey)) {
            this.toggleAudioSettings();
        }

        if (moveX !== this.lastInputVector.x || moveY !== this.lastInputVector.y) {
            this.game.socket.emit('playerMove', { ax: moveX, ay: moveY });
            this.lastInputVector.x = moveX;
            this.lastInputVector.y = moveY;
        }
    }

    useAbility(abilityType) {
        if (!this.abilities[abilityType].available || this.abilities[abilityType].cooldown > 0) {
            return;
        }

        // Get energy cost with any reductions applied
        const baseCost = GAME_CONSTANTS.ABILITIES[abilityType.toUpperCase()].ENERGY_COST;
        const player = this.players[this.myId];
        const reduction = player?.energyCostReduction || 0;
        const energyCost = Math.floor(baseCost * (1 - reduction));
        
        if (this.energy < energyCost) {
            return;
        }

        let abilityData = { type: abilityType };

        if (abilityType === 'wall') {
            const player = this.players[this.myId];
            if (player) {
                let angle = 0;
                if (this.touchStartPos) {
                    angle = Phaser.Math.Angle.Between(player.x, player.y, this.touchStartPos.x, this.touchStartPos.y);
                } else {
                    angle = Math.random() * Math.PI * 2;
                }
                abilityData.angle = angle;
                abilityData.position = { x: player.x, y: player.y };
            }
        }

        this.game.socket.emit('useAbility', abilityData);
        this.audioManager.playAbilitySound(abilityType);
    }

    toggleAudioSettings() {
        if (!this.audioSettingsPanel) {
            this.audioSettingsPanel = new AudioSettingsPanel(this, this.audioManager);
        }
        this.audioSettingsPanel.toggle();
    }

    updateAbilityCooldowns(delta) {
        Object.keys(this.abilities).forEach(abilityType => {
            if (this.abilities[abilityType].cooldown > 0) {
                this.abilities[abilityType].cooldown = Math.max(0, this.abilities[abilityType].cooldown - delta);
            }
        });
        this.updateAbilityDisplay();
    }

    setupSocketListeners() {
        if (!this.game.socket) return;

        this.game.socket.on('gameState', (data) => {
            this.updateGameState(data);
        });

        this.game.socket.on('gameStateDelta', (delta) => {
            this.updateGameStateDelta(delta);
        });

        this.game.socket.on('playerJoined', (player) => {
            this.addPlayer(player.id, player);
        });

        this.game.socket.on('playerLeft', (playerId) => {
            this.removePlayer(playerId);
        });

        this.game.socket.on('orbCollected', (data) => {
            this.removeOrb(data.orbId);
            this.updatePlayerScore(data.playerId, data.newScore);
            if (data.position) {
                this.createCollectionEffect(data.position);
            }
        });

        this.game.socket.on('crystalCollected', (data) => {
            this.removeCrystal(data.crystalId);
            this.updatePlayerCrystals(data.playerId, data.crystalsCollected);
            
            // Safeguard: Only create effect if position data exists
            if (data.position && data.position.x !== undefined && data.position.y !== undefined) {
                this.createCrystalCollectionEffect(data.position, data.isPowerCrystal);
            } else {
                console.warn('Crystal collected but position data missing:', data);
            }
            
            if (data.playerId === this.myId) {
                this.audioManager.playCrystalCollectionSound(data.isPowerCrystal);
            }
        });

        this.game.socket.on('crystalSpawned', (crystal) => {
            this.addCrystal(crystal.id, crystal);
            this.enhanceCrystalRespawnEffect(crystal.x, crystal.y, crystal.isPowerCrystal);
        });

        this.game.socket.on('playerLevelUp', (data) => {
            this.updatePlayerLevel(data.playerId, data.level);
            this.enhanceLevelUpEffects(data.playerId, data.level);
            if (data.playerId === this.myId) {
                this.audioManager.playLevelUpSound();
                this.createFloatingText(this.players[this.myId].x, this.players[this.myId].y - ScaleHelper.scale(50), `Level ${data.level}!`, this.getLevelColor(data.level));
            }
        });

        this.game.socket.on('abilityUsed', (data) => {
            this.handleAbilityUsed(data);
        });

        this.game.socket.on('wallDestroyed', (wallId) => {
            this.removeWall(wallId);
        });

        this.game.socket.on('collision', (data) => {
            this.handleCollision(data);
        });

        this.game.socket.on('gameEnded', (results) => {
            this.audioManager.stopGameplayMusic();
            
            // Check if series is over
            if (results.isSeriesOver) {
                // Go to final end screen
                this.scene.start('EndScreenScene', { 
                    results: results.players, 
                    winner: results.seriesWinner || results.winner, 
                    winType: results.winType, 
                    isPlayerWinner: results.seriesWinner === this.myId || results.winner === this.myId,
                    isFinalScreen: true,
                    seriesScores: results.seriesScores
                });
            } else {
                // Go to upgrade screen for next round
                this.scene.start('UpgradeScene', { 
                    results: results.players, 
                    winner: results.winner,
                    winType: results.winType,
                    round: results.currentRound,
                    seriesScores: results.seriesScores,
                    roomId: this.roomId,
                    playerId: this.myId,
                    myPlayerId: this.myId
                });
            }
        });
        
        this.game.socket.on('nextRoundStart', (data) => {
            // Re-initialize the scene for next round
            this.scene.restart();
        });

        this.game.socket.on('warmupEnd', () => {
            this.gamePhase = 'playing';

            // Explicitly destroy countdown elements to prevent overlap
            if (this.countdownText) {
                this.countdownText.destroy();
                this.countdownText = null;
            }
            if (this.countdownTimer) {
                this.countdownTimer.destroy();
                this.countdownTimer = null;
            }

            this.showGameStateIndicator('playing');
            this.audioManager.playGameStartSound();
        });

        this.game.socket.on('nebulaCore', (data) => {
            this.updateNebulaCoreControl(data);
        });

        this.game.socket.on('connect', () => {
            this.updateConnectionStatus(true);
        });

        this.game.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
        });
    }

    updateGameState(data) {
        // Only update myId if the server sends a valid one
        if (data.myId) {
            this.myId = data.myId;
        }
        
        // Update players
        Object.keys(data.players).forEach(playerId => {
            if (!this.players[playerId]) {
                this.addPlayer(playerId, data.players[playerId]);
            } else {
                this.updatePlayer(playerId, data.players[playerId]);
            }
        });

        // Update orbs
        Object.keys(data.orbs).forEach(orbId => {
            if (!this.orbs[orbId]) {
                this.addOrb(orbId, data.orbs[orbId]);
            }
        });

        // Update crystals
        Object.keys(data.crystals).forEach(crystalId => {
            if (!this.crystals[crystalId]) {
                this.addCrystal(crystalId, data.crystals[crystalId]);
            }
        });

        // Update walls
        if (data.walls) {
            this.updateWalls(data.walls);
        }

        // Update game time
        if (data.gameTime !== undefined) {
            this.updateGameTime(data.gameTime);
        }

        // Update player's own data
        if (this.myId && data.players[this.myId]) {
            const myData = data.players[this.myId];
            this.updatePlayerCrystals(this.myId, myData.crystalsCollected);
            this.updatePlayerLevel(this.myId, myData.level);
            if (myData.energy !== undefined) {
                this.energy = myData.energy;
                this.updateEnergyBar(this.energy, 100);
            }
        }

        // Update game phase
        if (data.gamePhase && this.gamePhase !== data.gamePhase) {
            this.gamePhase = data.gamePhase;
            this.showGameStateIndicator(this.gamePhase);
            
            // Start countdown for warmup
            if (this.gamePhase === 'warmup' && data.warmupTime) {
                this.startWarmupCountdown(data.warmupTime);
            }
        } else if (data.gamePhase) {
            // If phase is the same, just update internal state without triggering new animations
            this.gamePhase = data.gamePhase;
        }

        // Update nebula core
        if (data.nebulaCore) {
            this.updateNebulaCoreControl(data.nebulaCore);
        }

        if (data.currentRound) {
            this.currentRound = data.currentRound;
            this.updateWinConditionPanel();
        }

        if (data.seriesScores) {
            this.seriesScores = data.seriesScores;
        }
        
        this.updatePlayerList(data.players);
    }

    addPlayer(playerId, playerData) {
        if (this.players[playerId]) return;

        const orb = this.add.sprite(playerData.x, playerData.y, 'orb');
        orb.setTint(playerData.color || 0x00ff00);
        orb.setOrigin(0.5);
        
        // Add player name label
        const nameText = this.add.text(playerData.x, playerData.y - ScaleHelper.scale(30), playerData.name || `Player ${playerId.substr(-4)}`, {
            fontSize: ScaleHelper.font('12px'),
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: ScaleHelper.scale(2)
        }).setOrigin(0.5);
        
        // Add "YOU" indicator for the current player
        if (playerId === this.myId) {
            const youText = this.add.text(playerData.x, playerData.y - 45, 'YOU', {
                fontSize: '14px',
                fill: '#ffff00',
                stroke: '#000000',
                strokeThickness: 3,
                fontWeight: 'bold'
            }).setOrigin(0.5);
            orb.youText = youText;
            
            // Add glowing effect for player's own orb
            orb.setScale(1.1);
            this.tweens.add({
                targets: orb,
                alpha: 0.7,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
        
        this.players[playerId] = orb;
        orb.nameText = nameText;
        orb.playerId = playerId;
        orb.playerName = playerData.name || `Player ${playerId.substr(-4)}`;
        orb.vx = playerData.vx || 0;
        orb.vy = playerData.vy || 0;
        orb.crystalsCollected = playerData.crystalsCollected || 0;
        orb.level = playerData.level || 1;

        this.initializeOrbTrail(playerId);
        this.updatePlayerLevel(playerId, orb.level);
    }

    updatePlayer(playerId, playerData) {
        const player = this.players[playerId];
        if (!player) return;

        player.x = playerData.x;
        player.y = playerData.y;
        player.vx = playerData.vx || 0;
        player.vy = playerData.vy || 0;
        
        // Update name label position
        if (player.nameText) {
            player.nameText.x = player.x;
            player.nameText.y = player.y - 30;
        }
        
        // Update "YOU" text position
        if (player.youText) {
            player.youText.x = player.x;
            player.youText.y = player.y - 45;
        }
        
        if (playerData.level !== undefined && player.level !== playerData.level) {
            this.updatePlayerLevel(playerId, playerData.level);
        }
        
        if (playerData.crystalsCollected !== undefined) {
            this.updatePlayerCrystals(playerId, playerData.crystalsCollected);
        }
    }

    removePlayer(playerId) {
        if (this.players[playerId]) {
            const player = this.players[playerId];
            
            // Clean up name text
            if (player.nameText) {
                player.nameText.destroy();
            }
            
            // Clean up "YOU" text
            if (player.youText) {
                player.youText.destroy();
            }
            
            player.destroy();
            delete this.players[playerId];
        }
        if (this.orbTrails[playerId]) {
            delete this.orbTrails[playerId];
        }
        if (this.playerParticles[playerId]) {
            this.playerParticles[playerId].forEach(particle => {
                if (particle && particle.destroy) particle.destroy();
            });
            delete this.playerParticles[playerId];
        }
    }

    addOrb(orbId, orbData) {
        if (this.orbs[orbId]) return;

        const orb = this.add.sprite(orbData.x, orbData.y, 'orb');
        orb.setTint(0xffff00);
        orb.setScale(0.4); // Smaller than players
        orb.setOrigin(0.5);
        
        this.tweens.add({
            targets: orb,
            scaleX: 0.45,
            scaleY: 0.45,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.orbs[orbId] = orb;
        orb.orbId = orbId;
    }

    removeOrb(orbId) {
        if (this.orbs[orbId]) {
            this.orbs[orbId].destroy();
            delete this.orbs[orbId];
        }
    }

    updatePlayerScore(playerId, score) {
        const player = this.players[playerId];
        if (player) {
            player.score = score;
        }
    }

    addCrystal(crystalId, crystalData) {
        if (this.crystals[crystalId]) return;

        const color = crystalData.isPowerCrystal ? 0xff00ff : 0x00ffff;
        
        const crystal = this.add.sprite(crystalData.x, crystalData.y, 'crystal');
        crystal.setTint(color);
        crystal.setOrigin(0.5);

        const scale = crystalData.isPowerCrystal ? 0.4 : 0.3;  // Reduced from 0.6/0.5
        crystal.setScale(scale);
        
        // Pulsing effect
        this.tweens.add({
            targets: crystal,
            scale: crystal.scale * 1.05,  // Reduced from 1.1 for subtler pulse
            alpha: 0.7,
            duration: crystalData.isPowerCrystal ? 800 : 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Power crystals rotate
        if (crystalData.isPowerCrystal) {
            this.tweens.add({
                targets: crystal,
                rotation: Math.PI * 2,
                duration: 2000,
                repeat: -1,
                ease: 'Linear'
            });
        }

        this.crystals[crystalId] = crystal;
        crystal.crystalId = crystalId;
        crystal.isPowerCrystal = crystalData.isPowerCrystal;
    }

    removeCrystal(crystalId) {
        if (this.crystals[crystalId]) {
            this.crystals[crystalId].destroy();
            delete this.crystals[crystalId];
        }
    }

    updatePlayerCrystals(playerId, crystals) {
        if (playerId === this.myId) {
            this.crystalText.setText(`Crystals: ${crystals}`);
            
            // Update progress bar based on level
            const level = this.playerLevels[playerId] || 1;
            const levelThresholds = GAME_CONSTANTS.LEVELS.THRESHOLDS;
            const currentThreshold = levelThresholds[level - 1] || 0;
            const nextThreshold = levelThresholds[level] || 100;
            
            this.updateProgressBar(crystals - currentThreshold, nextThreshold - currentThreshold);
            
            // Color change when approaching 100
            if (crystals >= 90) {
                this.crystalText.setFill(GAME_CONSTANTS.UI.COLORS.WARNING);
            } else if (crystals >= 80) {
                this.crystalText.setFill(GAME_CONSTANTS.UI.COLORS.SUCCESS);
            } else {
                this.crystalText.setFill(GAME_CONSTANTS.UI.COLORS.PRIMARY);
            }
        }
        
        const player = this.players[playerId];
        if (player) {
            player.crystalsCollected = crystals;
        }
    }

    updatePlayerLevel(playerId, level) {
        this.playerLevels[playerId] = level;
        
        if (playerId === this.myId) {
            this.levelText.setText(`Level: ${level}`);
            this.levelText.setFill(this.getLevelColor(level));
            
            // Update available abilities
            this.abilities.burst.available = level >= 3;
            this.abilities.wall.available = level >= 4;
            
            // Show ability unlock notifications
            if (level === 3 && !this.abilities.burst.notified) {
                this.createFloatingText(ScaleHelper.centerX(), ScaleHelper.centerY() - ScaleHelper.scale(100), 'Burst Ability Unlocked! Press Q', GAME_CONSTANTS.UI.COLORS.WARNING, '24px');
                this.abilities.burst.notified = true;
            }
            if (level === 4 && !this.abilities.wall.notified) {
                this.createFloatingText(ScaleHelper.centerX(), ScaleHelper.centerY() - ScaleHelper.scale(100), 'Wall Ability Unlocked! Press E', GAME_CONSTANTS.UI.COLORS.WARNING, '24px');
                this.abilities.wall.notified = true;
                // Show nebula core
                this.showNebulaCore();
            }
        }
        
        // Update player visual based on level
        const player = this.players[playerId];
        if (player) {
            player.level = level;
            const levelConfig = GAME_CONSTANTS.LEVELS;
            const sizeMultiplier = levelConfig.SIZE_MULTIPLIERS[level - 1] || 1;
            
            // Smooth size transition
            this.tweens.add({
                targets: player,
                scale: sizeMultiplier,
                duration: GAME_CONSTANTS.VISUAL_EFFECTS.ANIMATIONS.ORB_SIZE_TRANSITION.DURATION,
                ease: GAME_CONSTANTS.VISUAL_EFFECTS.ANIMATIONS.ORB_SIZE_TRANSITION.EASE
            });
            
            // Add orbiting particles for level 3+
            if (level >= 3) {
                this.addPlayerParticles(playerId);
            }
        }
    }

    getLevelColor(level) {
        const colors = [
            GAME_CONSTANTS.UI.COLORS.SUCCESS,  // Level 1
            GAME_CONSTANTS.UI.COLORS.PRIMARY,  // Level 2
            GAME_CONSTANTS.UI.COLORS.WARNING,  // Level 3
            GAME_CONSTANTS.UI.COLORS.DANGER    // Level 4
        ];
        return colors[level - 1] || colors[3];
    }

    getLevelColorHex(level) {
        const colors = [0x00ff00, 0x00ffff, 0xffff00, 0xff00ff];
        return colors[level - 1] || colors[3];
    }

    addPlayerParticles(playerId) {
        if (this.playerParticles[playerId]) return;
        
        const player = this.players[playerId];
        if (!player) return;
        
        const particles = [];
        const particleCount = player.level >= 4 ? 6 : 4;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.add.circle(player.x, player.y, 3, 0xffffff);
            particle.angle = (i / particleCount) * 360;
            const baseRadius = (player.width * player.scaleX) / 2; // Approximate radius from scaled sprite
            particle.orbitRadius = baseRadius + 15;
            particles.push(particle);
        }
        
        this.playerParticles[playerId] = particles;
    }

    updatePlayerParticles() {
        Object.keys(this.playerParticles).forEach(playerId => {
            const player = this.players[playerId];
            const particles = this.playerParticles[playerId];
            
            if (player && particles) {
                particles.forEach((particle, index) => {
                    if (particle && particle.active) {
                        particle.angle += 2;
                        const radians = Phaser.Math.DegToRad(particle.angle);
                        particle.x = player.x + Math.cos(radians) * particle.orbitRadius;
                        particle.y = player.y + Math.sin(radians) * particle.orbitRadius;
                    }
                });
            }
        });
    }

    showNebulaCore() {
        if (this.nebulaCore) return;
        
        const x = GAME_CONSTANTS.NEBULA_CORE.X;
        const y = GAME_CONSTANTS.NEBULA_CORE.Y;
        const radius = GAME_CONSTANTS.NEBULA_CORE.RADIUS;
        
        this.nebulaCore = this.add.circle(x, y, radius, 0x8000ff, 0.3);
        this.nebulaCore.setStrokeStyle(ScaleHelper.scale(3), 0xff00ff);
        
        // Pulsing effect
        this.tweens.add({
            targets: this.nebulaCore,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0.6,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Core label
        this.nebulaCoreText = this.add.text(x, y - radius - 30, 'NEBULA CORE', {
            fontSize: '18px',
            fill: GAME_CONSTANTS.UI.COLORS.DANGER,
            stroke: GAME_CONSTANTS.UI.COLORS.BLACK,
            strokeThickness: ScaleHelper.scale(2),
            fontWeight: 'bold'
        }).setOrigin(0.5);
    }

    updateGameTime(timeRemaining) {
        this.gameTime = timeRemaining;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        this.timeText.setText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
        
        // Change color when time is running out
        if (timeRemaining <= 60) {
            this.timeText.setFill(GAME_CONSTANTS.UI.COLORS.DANGER);
        } else if (timeRemaining <= 180) {
            this.timeText.setFill(GAME_CONSTANTS.UI.COLORS.WARNING);
        } else {
            this.timeText.setFill(GAME_CONSTANTS.UI.COLORS.WHITE);
        }
    }

    handleAbilityUsed(data) {
        const player = this.players[data.playerId];
        if (!player) return;
        
        if (data.playerId === this.myId) {
            const energyCost = GAME_CONSTANTS.ABILITIES[data.type.toUpperCase()].ENERGY_COST;
            this.energy = Math.max(0, this.energy - energyCost);
            this.updateEnergyBar(this.energy, 100);
            
            const cooldownTime = GAME_CONSTANTS.ABILITIES[data.type.toUpperCase()].COOLDOWN;
            this.abilities[data.type].cooldown = cooldownTime;
        }
        
        switch (data.type) {
            case 'burst':
                this.createAdvancedBurstEffect(data);
                break;
            case 'wall':
                this.createWall(data);
                this.createAdvancedWallEffect(data);
                break;
        }
    }

    createWall(data) {
        const wallLength = GAME_CONSTANTS.ABILITIES.WALL.WALL_LENGTH;
        const wallWidth = 20;
        
        const startX = data.position.x - Math.cos(data.angle) * (wallLength / 2);
        const startY = data.position.y - Math.sin(data.angle) * (wallLength / 2);
        const endX = data.position.x + Math.cos(data.angle) * (wallLength / 2);
        const endY = data.position.y + Math.sin(data.angle) * (wallLength / 2);
        
        const wall = this.add.rectangle(data.position.x, data.position.y, wallLength, wallWidth, 0x00ffff, 0.7);
        wall.setRotation(data.angle);
        wall.setStrokeStyle(2, 0x00aaaa);
        
        // Glowing aura
        const aura = this.add.rectangle(data.position.x, data.position.y, wallLength + 10, wallWidth + 10, 0x00ffff, 0.2);
        aura.setRotation(data.angle);
        
        this.walls[data.wallId] = { wall, aura };
        
        // Auto-destruction after duration
        this.time.delayedCall(GAME_CONSTANTS.ABILITIES.WALL.DURATION, () => {
            this.removeWall(data.wallId);
        });
    }

    removeWall(wallId) {
        if (this.walls[wallId]) {
            if (this.walls[wallId].wall) this.walls[wallId].wall.destroy();
            if (this.walls[wallId].aura) this.walls[wallId].aura.destroy();
            delete this.walls[wallId];
        }
    }

    updateWalls(wallsData) {
        // Remove walls that no longer exist
        Object.keys(this.walls).forEach(wallId => {
            if (!wallsData[wallId]) {
                this.removeWall(wallId);
            }
        });
        
        // Add new walls
        Object.keys(wallsData).forEach(wallId => {
            if (!this.walls[wallId]) {
                this.createWall({ ...wallsData[wallId], wallId });
            }
        });
    }

    handleCollision(data) {
        this.enhanceCollisionEffects(data);
        this.audioManager.playCollisionSound(data.impactSpeed);

        if (data.loserId === this.myId && data.droppedCrystalIds && data.droppedCrystalIds.length > 0) {
            // Player who lost crystals gets a notification
            const player = this.players[data.loserId];
            if (player) {
                this.createFloatingText(player.x, player.y - ScaleHelper.scale(40), `-${data.droppedCrystalIds.length} crystals!`, GAME_CONSTANTS.UI.COLORS.DANGER);
            }
        }
    }

    updateNebulaCoreControl(data) {
        this.nebulaCoreController = data.controllerId;
        this.nebulaCoreControlTime = data.controlTime;
        
        if (data.controllerId) {
            // Show control indicator
            if (!this.nebulaCoreControlText) {
                this.nebulaCoreControlText = this.add.text(400, 120, '', {
                    fontSize: '18px',
                    fill: GAME_CONSTANTS.UI.COLORS.WARNING,
                    stroke: GAME_CONSTANTS.UI.COLORS.BLACK,
                    strokeThickness: ScaleHelper.scale(2),
                    fontWeight: 'bold'
                }).setOrigin(0.5);
            }
            
            const controllerName = data.controllerId === this.myId ? 'You' : 'Another player';
            const timeLeft = Math.ceil((30000 - data.controlTime) / 1000);
            this.nebulaCoreControlText.setText(`${controllerName} controlling core (${timeLeft}s)`);
            this.nebulaCoreControlText.setVisible(true);
        } else {
            if (this.nebulaCoreControlText) {
                this.nebulaCoreControlText.setVisible(false);
            }
        }
    }

    createCollectionEffect(position) {
        // Use crystal explosion effect for orbs since ORB_COLLECTION doesn't exist
        const config = GAME_CONSTANTS.VISUAL_EFFECTS.PARTICLES.CRYSTAL_EXPLOSION;
        this.createParticleExplosion(position.x, position.y, config, 0xffff00);
    }

    createCrystalCollectionEffect(position, isPowerCrystal) {
        const config = GAME_CONSTANTS.VISUAL_EFFECTS.PARTICLES.CRYSTAL_EXPLOSION;
        const color = isPowerCrystal ? 0xff00ff : 0x00ffff;
        const particleCount = isPowerCrystal ? config.COUNT * 2 : config.COUNT;
        
        this.createParticleExplosion(position.x, position.y, { ...config, COUNT: particleCount }, color);
        
        if (isPowerCrystal) {
            this.createFloatingText(position.x, position.y - ScaleHelper.scale(20), '+50', GAME_CONSTANTS.UI.COLORS.DANGER, '20px');
        }
    }

    // Visual Effects Methods
    createEnhancedBackground() {
        // Always create gradient background first
        this.createGradientBackground();
        
        // Then try to add video on top if available
        console.log('[VIDEO] Attempting to add video background...');
        
        if (this.cache.video.exists('nebulaVideo')) {
            console.log('[VIDEO] Video found in cache!');
            
            try {
                // Create video element at depth 0 (background)
                this.nebulaVideo = this.add.video(ScaleHelper.centerX(), ScaleHelper.centerY(), 'nebulaVideo');
                this.nebulaVideo.setDepth(-10); // Ensure it's behind everything
                
                // Set video properties
                this.nebulaVideo.setVolume(0); // Mute the video
                this.nebulaVideo.setAlpha(0.6); // More transparency to see game better
                
                // Try different methods to make the video work
                this.time.delayedCall(250, () => {
                    if (this.nebulaVideo) {
                        console.log('[VIDEO] Attempting to play video...');
                        
                        // Try to get video dimensions
                        const videoElement = this.nebulaVideo.video;
                        if (videoElement) {
                            // Wait for video metadata to load
                            videoElement.addEventListener('loadedmetadata', () => {
                                console.log('[VIDEO] Metadata loaded:', videoElement.videoWidth, 'x', videoElement.videoHeight);
                                
                                // Calculate scale
                                const scaleX = ScaleHelper.width() / videoElement.videoWidth;
                                const scaleY = ScaleHelper.height() / videoElement.videoHeight;
                                const scale = Math.max(scaleX, scaleY);
                                
                                this.nebulaVideo.setScale(scale);
                                
                                // Play the video (Phaser video doesn't return promise)
                                try {
                                    this.nebulaVideo.play();
                                    console.log('[VIDEO] Video playing');
                                } catch (error) {
                                    console.log('[VIDEO] Video play failed:', error);
                                }
                            });
                            
                            // Also try to play immediately
                            try {
                                this.nebulaVideo.play();
                            } catch (e) {
                                // Ignore initial play errors
                            }
                        }
                    }
                });
                
                console.log('[VIDEO] Video element created');
            } catch (error) {
                console.error('[VIDEO] Error creating video:', error);
            }
        } else {
            console.log('[VIDEO] Video not found in cache');
        }
        
        // Always create these effects
        this.createAnimatedStarfield();
        this.createNebulaParticles();
    }
    
    createGradientBackground() {
        // Fallback gradient background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x110033, 0x220044, 0x000022, 0x330055);
        bg.fillRect(0, 0, ScaleHelper.width(), ScaleHelper.height());
    }
    
    showPlayButton() {
        // Show a play button if autoplay is blocked
        const playButton = this.add.text(ScaleHelper.centerX(), ScaleHelper.centerY(), '▶ Click to Play Background', {
            fontSize: ScaleHelper.font('24px'),
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();
        
        playButton.on('pointerdown', () => {
            if (this.nebulaVideo) {
                this.nebulaVideo.play();
                playButton.destroy();
            }
        });
    }
    
    reverseVideo() {
        // Simplified for now - just loop the video
        if (this.nebulaVideo) {
            console.log('[VIDEO] Restarting video...');
            this.nebulaVideo.seekTo(0);
            this.nebulaVideo.play();
        }
    }
    
    createAnimatedStarfield() {
        const starConfig = GAME_CONSTANTS.VISUAL_EFFECTS.ENVIRONMENT.STARS;
        for (let i = 0; i < starConfig.COUNT; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, ScaleHelper.width()), Phaser.Math.Between(0, ScaleHelper.height()),
                Phaser.Math.FloatBetween(starConfig.MIN_SIZE, starConfig.MAX_SIZE),
                0xffffff, Phaser.Math.FloatBetween(0.3, 1.0)
            );
            this.tweens.add({
                targets: star, alpha: 0.1,
                duration: Phaser.Math.Between(starConfig.TWINKLE_SPEED / 2, starConfig.TWINKLE_SPEED * 2),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
            star.initialX = star.x; star.initialY = star.y;
            star.moveAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            this.backgroundStars.push(star);
        }
    }
    
    createNebulaParticles() {
        const nebulaConfig = GAME_CONSTANTS.VISUAL_EFFECTS.PARTICLES.AMBIENT_NEBULA;
        for (let i = 0; i < nebulaConfig.COUNT; i++) {
            const particle = this.add.circle(
                Phaser.Math.Between(0, ScaleHelper.width()), Phaser.Math.Between(0, ScaleHelper.height()),
                Phaser.Math.Between(nebulaConfig.MIN_SIZE, nebulaConfig.MAX_SIZE),
                Phaser.Utils.Array.GetRandom(nebulaConfig.COLORS),
                Phaser.Math.FloatBetween(0.1, 0.4)
            );
            particle.velocity = {
                x: Phaser.Math.Between(-nebulaConfig.MAX_SPEED, nebulaConfig.MAX_SPEED),
                y: Phaser.Math.Between(-nebulaConfig.MAX_SPEED, nebulaConfig.MAX_SPEED)
            };
            this.tweens.add({
                targets: particle, alpha: particle.alpha + 0.2, scaleX: 1.3, scaleY: 1.3,
                duration: nebulaConfig.FADE_DURATION, yoyo: true, repeat: -1,
                ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 2000)
            });
            this.ambientParticles.push(particle);
        }
    }
    
    initializeVisualEffects() {
        this.visualEffectsGroup = this.add.group();
        this.orbTrailTimers = {};
    }
    
    updateVisualEffects(delta) {
        const deltaTime = delta / 1000;
        this.nebulaAnimationTime += deltaTime;
        this.updateBackgroundStars(deltaTime);
        this.updateAmbientParticles(deltaTime);
        this.updateFloatingTexts();
        this.updatePlayerParticles();
    }
    
    updateBackgroundStars(deltaTime) {
        const movement = GAME_CONSTANTS.VISUAL_EFFECTS.ENVIRONMENT.NEBULA_MOVEMENT;
        this.backgroundStars.forEach(star => {
            star.x = star.initialX + Math.sin(this.nebulaAnimationTime * movement.SPEED + star.moveAngle) * movement.WAVE_AMPLITUDE;
            star.y = star.initialY + Math.cos(this.nebulaAnimationTime * movement.SPEED + star.moveAngle) * movement.WAVE_AMPLITUDE;
            if (star.x < -10) star.x = ScaleHelper.width() + 10; if (star.x > ScaleHelper.width() + 10) star.x = -10;
            if (star.y < -10) star.y = ScaleHelper.height() + 10; if (star.y > ScaleHelper.height() + 10) star.y = -10;
        });
    }
    
    updateAmbientParticles(deltaTime) {
        this.ambientParticles.forEach(particle => {
            particle.x += particle.velocity.x * deltaTime;
            particle.y += particle.velocity.y * deltaTime;
            if (particle.x < -20) particle.x = ScaleHelper.width() + 20; if (particle.x > ScaleHelper.width() + 20) particle.x = -20;
            if (particle.y < -20) particle.y = ScaleHelper.height() + 20; if (particle.y > ScaleHelper.height() + 20) particle.y = -20;
        });
    }
    
    updateFloatingTexts() {
        this.floatingTexts = this.floatingTexts.filter(text => {
            if (text.alpha <= 0 || !text.active) { text.destroy(); return false; }
            return true;
        });
    }
    
    createFloatingText(x, y, text, color = '#ffffff', size = '24px') {
        const config = GAME_CONSTANTS.VISUAL_EFFECTS.ANIMATIONS.FLOATING_TEXT;
        const floatingText = this.add.text(x, y, text, {
            fontSize: ScaleHelper.font(size), fill: color, fontWeight: 'bold',
            stroke: '#000000', strokeThickness: ScaleHelper.scale(2)
        }).setOrigin(0.5);
        this.tweens.add({
            targets: floatingText, y: y - ScaleHelper.scale(config.RISE_DISTANCE), alpha: 0,
            duration: config.DURATION, delay: config.FADE_DELAY, ease: 'Power2',
            onComplete: () => {
                floatingText.destroy();
                this.floatingTexts = this.floatingTexts.filter(t => t !== floatingText);
            }
        });
        this.floatingTexts.push(floatingText);
        return floatingText;
    }
    
    createParticleExplosion(x, y, config, color = 0xffffff) {
        for (let i = 0; i < config.COUNT; i++) {
            const angle = (i / config.COUNT) * Math.PI * 2;
            const speed = config.SPEED + Math.random() * (config.SPEED * 0.5);
            const particle = this.add.circle(x, y, config.SIZE, color);
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed, y: y + Math.sin(angle) * speed,
                scale: 0, alpha: 0, duration: config.FADE_DURATION,
                onComplete: () => particle.destroy()
            });
        }
    }
    
    createScreenFlash(color, intensity = 0.6, duration = 150) {
        const flash = this.add.rectangle(ScaleHelper.centerX(), ScaleHelper.centerY(), ScaleHelper.width(), ScaleHelper.height(), color, intensity);
        flash.setDepth(1000);
        this.tweens.add({
            targets: flash, alpha: 0, duration: duration,
            onComplete: () => flash.destroy()
        });
        return flash;
    }
    
    createShockwave(x, y, intensity) {
        const shockwave = this.add.circle(x, y, ScaleHelper.scale(1), 0xffffff, 0);
        shockwave.setStrokeStyle(ScaleHelper.scale(3), 0xffffff);
        this.tweens.add({
            targets: shockwave, radius: ScaleHelper.scale(100) + (intensity / 10),
            alpha: { from: 0.8, to: 0 }, duration: 500, ease: 'Power2',
            onComplete: () => shockwave.destroy()
        });
        return shockwave;
    }

    enhanceCollisionEffects(data) {
        const config = GAME_CONSTANTS.VISUAL_EFFECTS.SCREEN_EFFECTS;
        
        // Enhanced screen shake
        const shakeIntensity = Math.min(data.impactSpeed / 1000, 1) * config.SHAKE.COLLISION_INTENSITY;
        this.cameras.main.shake(config.SHAKE.DURATION, shakeIntensity);
        
        // Screen flash
        this.createScreenFlash(config.FLASH.COLLISION_COLOR, config.FLASH.INTENSITY, config.FLASH.DURATION);
        
        // Enhanced particle explosion at collision point
        const explosionConfig = GAME_CONSTANTS.VISUAL_EFFECTS.PARTICLES.CRYSTAL_EXPLOSION;
        this.createParticleExplosion(data.position.x, data.position.y, explosionConfig, 0xffffff);
        
        // Shockwave effect
        this.createShockwave(data.position.x, data.position.y, data.impactSpeed);
    }
    
    enhanceLevelUpEffects(playerId, newLevel) {
        const player = this.players[playerId];
        if (!player) return;
        
        const config = GAME_CONSTANTS.VISUAL_EFFECTS;
        
        // Screen effects for local player
        if (playerId === this.myId) {
            this.cameras.main.shake(config.SCREEN_EFFECTS.SHAKE.DURATION, config.SCREEN_EFFECTS.SHAKE.LEVEL_UP_INTENSITY);
            this.createScreenFlash(config.SCREEN_EFFECTS.FLASH.LEVEL_UP_COLOR, config.SCREEN_EFFECTS.FLASH.INTENSITY);
        }
        
        // Enhanced particle explosion
        const levelUpConfig = config.PARTICLES.LEVEL_UP;
        const levelColor = this.getLevelColorHex(newLevel);
        this.createParticleExplosion(player.x, player.y, levelUpConfig, levelColor);
        
        // Floating text
        this.createFloatingText(player.x, player.y - ScaleHelper.scale(50), 'LEVEL UP!', this.getLevelColor(newLevel), '32px');
        
        // Ring expansion effect
        this.createLevelUpRing(player.x, player.y, levelColor);
    }
    
    createLevelUpRing(x, y, color) {
        const ring = this.add.circle(x, y, ScaleHelper.scale(20), color, 0);
        ring.setStrokeStyle(ScaleHelper.scale(4), color);
        
        this.tweens.add({
            targets: ring,
            radius: ScaleHelper.scale(120),
            alpha: { from: 1, to: 0 },
            duration: 1000,
            ease: 'Power2',
            onComplete: () => ring.destroy()
        });
        
        return ring;
    }
    
    enhanceCrystalRespawnEffect(x, y, isPowerCrystal) {
        const config = GAME_CONSTANTS.VISUAL_EFFECTS.ANIMATIONS.CRYSTAL_RESPAWN;
        const color = isPowerCrystal ? 0xff00ff : 0x00ffff;
        
        // Spawn particles
        this.createParticleExplosion(x, y, {
            COUNT: config.PARTICLES,
            SIZE: 2,
            SPEED: 60,
            FADE_DURATION: config.DURATION
        }, color);
        
        // Create expanding ring
        const ring = this.add.circle(x, y, 1, color, 0);
        ring.setStrokeStyle(2, color);
        
        this.tweens.add({
            targets: ring,
            radius: 40,
            alpha: { from: 0.8, to: 0 },
            duration: config.DURATION,
            ease: 'Power2',
            onComplete: () => ring.destroy()
        });
    }

    createAdvancedBurstEffect(data) {
        const config = GAME_CONSTANTS.VISUAL_EFFECTS;
        
        // Screen effects
        if (data.playerId === this.myId) {
            this.cameras.main.shake(config.SCREEN_EFFECTS.SHAKE.DURATION, config.SCREEN_EFFECTS.SHAKE.ABILITY_INTENSITY);
            this.createScreenFlash(config.SCREEN_EFFECTS.FLASH.ABILITY_COLOR, config.SCREEN_EFFECTS.FLASH.INTENSITY);
        }
        
        // Multiple expanding waves
        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 100, () => {
                const wave = this.add.circle(data.position.x, data.position.y, 1, 0xffff00, 0);
                wave.setStrokeStyle(3 - i, 0xffff00);
                
                this.tweens.add({
                    targets: wave,
                    radius: GAME_CONSTANTS.ABILITIES.BURST.RADIUS + (i * 20),
                    alpha: { from: 0.8 - (i * 0.2), to: 0 },
                    duration: 600 + (i * 100),
                    ease: 'Power2',
                    onComplete: () => wave.destroy()
                });
            });
        }
        
        // Enhanced particle explosion
        const burstConfig = config.PARTICLES.ABILITY_BURST;
        this.createParticleExplosion(data.position.x, data.position.y, burstConfig, 0xffff00);
    }
    
    createAdvancedWallEffect(data) {
        // Energy buildup effect before wall appears
        const buildup = this.add.circle(data.position.x, data.position.y, 5, 0x00ffff, 0.8);
        
        this.tweens.add({
            targets: buildup,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                buildup.destroy();
            }
        });
        
        // Particle stream effect along wall
        this.createWallParticleStream(data);
    }
    
    createWallParticleStream(data) {
        const wallLength = GAME_CONSTANTS.ABILITIES.WALL.WALL_LENGTH;
        const particleCount = 10;
        
        for (let i = 0; i < particleCount; i++) {
            const offset = (i / particleCount - 0.5) * wallLength;
            const particleX = data.position.x + Math.cos(data.angle) * offset;
            const particleY = data.position.y + Math.sin(data.angle) * offset;
            
            const particle = this.add.circle(particleX, particleY, 3, 0x00ffff);
            
            this.tweens.add({
                targets: particle,
                alpha: 0,
                scaleX: 2,
                scaleY: 2,
                duration: 1000,
                onComplete: () => particle.destroy()
            });
        }
    }

    initializeOrbTrail(orbId) {
        // Create trail system for orb
        this.orbTrails[orbId] = {
            particles: [],
            lastPosition: { x: this.players[orbId].x, y: this.players[orbId].y },
            timer: 0
        };
    }
    
    updateOrbTrails() {
        const trailConfig = GAME_CONSTANTS.VISUAL_EFFECTS.PARTICLES.ORB_TRAIL;
        
        Object.keys(this.players).forEach(orbId => {
            const orb = this.players[orbId];
            const trail = this.orbTrails[orbId];
            
            if (orb && trail) {
                // Check if orb has moved enough to spawn new trail particle
                const dx = orb.x - trail.lastPosition.x;
                const dy = orb.y - trail.lastPosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 5) {
                    // Spawn new trail particle
                    const particle = this.add.circle(orb.x, orb.y, trailConfig.SIZE, this.getLevelColorHex(orb.level || 1), 0.6);
                    trail.particles.push(particle);
                    trail.lastPosition = { x: orb.x, y: orb.y };
                    
                    // Limit trail length
                    if (trail.particles.length > trailConfig.COUNT) {
                        const oldParticle = trail.particles.shift();
                        if (oldParticle && oldParticle.active) {
                            oldParticle.destroy();
                        }
                    }
                }
                
                // Update existing particles
                trail.particles.forEach((particle, index) => {
                    if (particle && particle.active) {
                        particle.alpha *= trailConfig.FADE_RATE;
                        particle.scale *= 0.98;
                        
                        if (particle.alpha < 0.05) {
                            particle.destroy();
                            trail.particles[index] = null;
                        }
                    }
                });
                
                // Clean up null particles
                trail.particles = trail.particles.filter(p => p !== null);
            }
        });
    }

    // Additional UI methods
    createWinConditionPanel() {
        const panelWidth = ScaleHelper.scale(400);
        const panelHeight = ScaleHelper.scale(60);
        const x = ScaleHelper.centerX() - panelWidth / 2;
        const y = ScaleHelper.y(10);
        
        // Panel background
        this.winPanel = this.add.graphics();
        this.winPanel.fillGradientStyle(0x2a2a2a, 0x2a2a2a, 0x1a1a1a, 0x1a1a1a);
        this.winPanel.fillRoundedRect(x, y, panelWidth, panelHeight, ScaleHelper.scale(12));
        this.winPanel.lineStyle(ScaleHelper.scale(2), 0xff00ff);
        this.winPanel.strokeRoundedRect(x, y, panelWidth, panelHeight, ScaleHelper.scale(12));
        
        // Round Info Text
        this.roundInfoText = this.add.text(ScaleHelper.centerX(), y + ScaleHelper.scale(20), `Round ${this.currentRound} / 5`, {
            fontSize: ScaleHelper.font('22px'),
            fontFamily: 'Arial Black',
            fill: GAME_CONSTANTS.UI.COLORS.WHITE,
            stroke: GAME_CONSTANTS.UI.COLORS.BLACK,
            strokeThickness: ScaleHelper.scale(2)
        }).setOrigin(0.5);

        // Win condition text
        this.winConditionText = this.add.text(ScaleHelper.centerX(), y + ScaleHelper.scale(45), `First to ${GAME_CONSTANTS.WIN_CONDITIONS.CRYSTAL_TARGET} crystals wins!`, {
            fontSize: ScaleHelper.font('16px'),
            fontFamily: 'Arial',
            fill: GAME_CONSTANTS.UI.COLORS.PRIMARY,
        }).setOrigin(0.5);
    }
    
    updateWinConditionPanel() {
        if (this.roundInfoText) {
            this.roundInfoText.setText(`Round ${this.currentRound} / 5`);
        }
    }
    
    createPlayerListPanel() {
        if (this.isMobile) return; // Skip on mobile to save space
        
        const panelWidth = ScaleHelper.scale(200);
        const panelHeight = ScaleHelper.scale(150);
        const x = ScaleHelper.x(600);
        const y = ScaleHelper.y(80);
        
        // Panel background
        this.playerPanel = this.add.graphics();
        this.playerPanel.fillStyle(0x1a1a1a, 0.9);
        this.playerPanel.fillRoundedRect(x, y, panelWidth, panelHeight, ScaleHelper.scale(8));
        this.playerPanel.lineStyle(ScaleHelper.scale(1), 0x00ffff);
        this.playerPanel.strokeRoundedRect(x, y, panelWidth, panelHeight, ScaleHelper.scale(8));
        
        // Title
        this.add.text(x + ScaleHelper.scale(100), y + ScaleHelper.scale(10), 'Players', {
            ...GAME_CONSTANTS.UI.FONTS.BODY,
            fontSize: ScaleHelper.font(GAME_CONSTANTS.UI.FONTS.BODY.fontSize),
            fill: GAME_CONSTANTS.UI.COLORS.PRIMARY,
            fontWeight: 'bold'
        }).setOrigin(0.5, 0);
        
        // Column Headers
        this.add.text(x + ScaleHelper.scale(10), y + ScaleHelper.scale(35), 'Player', { fontSize: ScaleHelper.font('12px'), fill: '#ccc' });
        this.add.text(x + ScaleHelper.scale(110), y + ScaleHelper.scale(35), 'Wins', { fontSize: ScaleHelper.font('12px'), fill: '#ccc' });
        this.add.text(x + ScaleHelper.scale(150), y + ScaleHelper.scale(35), 'Crystals', { fontSize: ScaleHelper.font('12px'), fill: '#ccc' });

        // Player list container
        this.playerListContainer = this.add.container(x + ScaleHelper.scale(10), y + ScaleHelper.scale(55));
    }
    
    updatePlayerList(players) {
        if (!this.playerListContainer) return;
        
        // Clear existing list
        this.playerListContainer.removeAll(true);
        
        // Convert to array and handle both server data and sprite objects
        const playerArray = [];
        Object.entries(players).forEach(([id, player]) => {
            // Handle sprite objects (from this.players)
            if (player.playerId) {
                playerArray.push({
                    id: player.playerId,
                    name: player.playerName || `Player ${player.playerId.substr(-4)}`,
                    level: player.level || 1,
                    crystalsCollected: player.crystalsCollected || 0
                });
            } 
            // Handle server data objects
            else {
                playerArray.push({
                    id: player.id || id,
                    name: player.name || `Player ${(player.id || id).substr(-4)}`,
                    level: player.level || 1,
                    crystalsCollected: player.crystalsCollected || 0
                });
            }
        });
        
        // Sort by series wins, then by current round crystals
        const sortedPlayers = playerArray.sort((a, b) => {
            const winsA = this.seriesScores[a.id] || 0;
            const winsB = this.seriesScores[b.id] || 0;
            if (winsB !== winsA) {
                return winsB - winsA;
            }
            return b.crystalsCollected - a.crystalsCollected;
        });
        
        // Add players with their stats
        sortedPlayers.forEach((player, index) => {
            const yPos = index * ScaleHelper.scale(20);
            const isMe = player.id === this.myId;
            const wins = this.seriesScores[player.id] || 0;
            
            // Display text - only show "You" for the actual current player
            const displayText = isMe ? 'You' : player.name;
            
            // Player name/indicator
            const playerText = this.add.text(0, yPos, displayText, {
                fontSize: ScaleHelper.font('14px'),
                fill: isMe ? GAME_CONSTANTS.UI.COLORS.WARNING : GAME_CONSTANTS.UI.COLORS.WHITE,
                fontWeight: isMe ? 'bold' : 'normal'
            });
            
            // Wins count
            const winsText = this.add.text(ScaleHelper.scale(110), yPos, `🏆 ${wins}`, {
                fontSize: ScaleHelper.font('12px'),
                fill: '#ffd700'
            });
            
            // Crystal count
            const crystalText = this.add.text(ScaleHelper.scale(150), yPos, `${player.crystalsCollected}`, {
                fontSize: ScaleHelper.font('12px'),
                fill: GAME_CONSTANTS.UI.COLORS.PRIMARY
            });
            
            this.playerListContainer.add([playerText, winsText, crystalText]);
        });
    }
    
    createMinimap() {
        const minimapSize = ScaleHelper.scale(120);
        const x = ScaleHelper.x(670);
        const y = ScaleHelper.y(250);
        
        // Minimap background
        this.minimapBg = this.add.graphics();
        this.minimapBg.fillStyle(0x000000, 0.7);
        this.minimapBg.fillRect(x, y, minimapSize, minimapSize * (GAME_CONSTANTS.WORLD_HEIGHT / GAME_CONSTANTS.WORLD_WIDTH));
        this.minimapBg.lineStyle(ScaleHelper.scale(1), 0x00ffff);
        this.minimapBg.strokeRect(x, y, minimapSize, minimapSize * (GAME_CONSTANTS.WORLD_HEIGHT / GAME_CONSTANTS.WORLD_WIDTH));
        
        // Minimap objects container
        this.minimapContainer = this.add.container(x, y);
        
        // Add title
        this.add.text(x + minimapSize / 2, y - ScaleHelper.scale(20), 'Map', {
            fontSize: ScaleHelper.font('14px'),
            fill: GAME_CONSTANTS.UI.COLORS.PRIMARY
        }).setOrigin(0.5);
    }
    
    updateMinimap() {
        if (!this.minimapContainer) return;
        
        const minimapSize = ScaleHelper.scale(120);
        const scaleX = minimapSize / GAME_CONSTANTS.WORLD_WIDTH;
        const scaleY = (minimapSize * (GAME_CONSTANTS.WORLD_HEIGHT / GAME_CONSTANTS.WORLD_WIDTH)) / GAME_CONSTANTS.WORLD_HEIGHT;
        
        // Clear existing minimap objects
        this.minimapContainer.removeAll(true);
        
        // Add players to minimap
        Object.values(this.players).forEach(player => {
            const x = player.x * scaleX;
            const y = player.y * scaleY;
            const isMe = player.playerId === this.myId;
            
            const dot = this.add.circle(x, y, isMe ? 3 : 2, isMe ? 0xffff00 : player.fillColor);
            this.minimapContainer.add(dot);
        });
        
        // Add crystals to minimap
        Object.values(this.crystals).forEach(crystal => {
            const x = crystal.x * scaleX;
            const y = crystal.y * scaleY;
            const dot = this.add.circle(x, y, 1, crystal.isPowerCrystal ? 0xff00ff : 0x00ffff);
            this.minimapContainer.add(dot);
        });
    }
    
    createControlsHelpPanel() {
        const panelWidth = this.isMobile ? ScaleHelper.scale(280) : ScaleHelper.scale(320);
        const panelHeight = this.isMobile ? ScaleHelper.scale(80) : ScaleHelper.scale(100);
        const x = this.isMobile ? ScaleHelper.x(10) : ScaleHelper.x(450);
        const y = this.isMobile ? ScaleHelper.y(470) : ScaleHelper.y(480);
        
        // Panel background
        this.controlsPanel = this.add.graphics();
        this.controlsPanel.fillStyle(0x1a1a1a, 0.8);
        this.controlsPanel.fillRoundedRect(x, y, panelWidth, panelHeight, ScaleHelper.scale(8));
        this.controlsPanel.lineStyle(ScaleHelper.scale(1), 0x555555);
        this.controlsPanel.strokeRoundedRect(x, y, panelWidth, panelHeight, ScaleHelper.scale(8));
        
        // Controls text
        const controlsText = this.isMobile ? 
            'Touch and drag to move\nTap for abilities when unlocked' :
            'WASD/Arrow Keys: Move\nQ: Energy Burst (L3+)  E: Energy Wall (L4+)\nM: Audio Settings';
            
        this.controlsText = this.add.text(x + ScaleHelper.scale(10), y + ScaleHelper.scale(10), controlsText, {
            fontSize: this.isMobile ? ScaleHelper.font('12px') : ScaleHelper.font('14px'),
            fill: GAME_CONSTANTS.UI.COLORS.WHITE,
            lineSpacing: 5
        });
        
        // Initially hidden, show briefly on game start
        this.controlsPanel.setAlpha(0);
        this.controlsText.setAlpha(0);
        
        // Show controls for 5 seconds at start
        this.time.delayedCall(1000, () => {
            this.tweens.add({
                targets: [this.controlsPanel, this.controlsText],
                alpha: 1,
                duration: GAME_CONSTANTS.UI.ANIMATIONS.FADE_DURATION,
                onComplete: () => {
                    this.time.delayedCall(5000, () => {
                        this.tweens.add({
                            targets: [this.controlsPanel, this.controlsText],
                            alpha: 0,
                            duration: GAME_CONSTANTS.UI.ANIMATIONS.FADE_DURATION
                        });
                    });
                }
            });
        });
    }
    
    adjustHUDForMobile() {
        if (!this.isMobile) return;
        
        const scale = GAME_CONSTANTS.UI.MOBILE.SCALE_FACTOR;
        const padding = GAME_CONSTANTS.UI.MOBILE.SAFE_AREA_PADDING;
        
        // Scale down HUD elements for mobile
        [this.crystalText, this.timeText, this.levelText, 
         this.abilityText, this.energyText].forEach(element => {
            if (element) {
                element.setScale(scale);
            }
        });
        
        // Adjust positions for safe areas
        if (this.connectionStatus) {
            this.connectionStatus.setPosition(padding, ScaleHelper.height() - ScaleHelper.scale(30));
        }
        
        // Ensure touch-friendly ability buttons
        this.createMobileAbilityButtons();
    }
    
    createMobileAbilityButtons() {
        if (!this.isMobile) return;
        
        const buttonSize = Math.max(GAME_CONSTANTS.UI.MOBILE.MIN_TOUCH_SIZE, ScaleHelper.scale(50));
        const spacing = ScaleHelper.scale(70);
        const startY = ScaleHelper.height() - ScaleHelper.scale(140);
        
        // Burst ability button
        this.burstButton = this.add.circle(ScaleHelper.width() - ScaleHelper.scale(80), startY, buttonSize / 2, 0xffff00, 0.7);
        this.burstButton.setStrokeStyle(ScaleHelper.scale(2), 0xffffff);
        this.burstButton.setInteractive();
        this.burstButton.on('pointerdown', () => {
            if (this.abilities.burst.available && this.abilities.burst.cooldown === 0) {
                this.useAbility('burst');
            }
        });
        
        this.burstButtonText = this.add.text(ScaleHelper.width() - ScaleHelper.scale(80), startY, 'Q', {
            fontSize: ScaleHelper.font('20px'),
            fill: GAME_CONSTANTS.UI.COLORS.BLACK,
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Wall ability button
        this.wallButton = this.add.circle(ScaleHelper.width() - ScaleHelper.scale(80), startY - spacing, buttonSize / 2, 0x00ffff, 0.7);
        this.wallButton.setStrokeStyle(ScaleHelper.scale(2), 0xffffff);
        this.wallButton.setInteractive();
        this.wallButton.on('pointerdown', () => {
            if (this.abilities.wall.available && this.abilities.wall.cooldown === 0) {
                this.useAbility('wall');
            }
        });
        
        this.wallButtonText = this.add.text(ScaleHelper.width() - ScaleHelper.scale(80), startY - spacing, 'E', {
            fontSize: ScaleHelper.font('20px'),
            fill: GAME_CONSTANTS.UI.COLORS.BLACK,
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Initially hide buttons until abilities are unlocked
        [this.burstButton, this.burstButtonText].forEach(obj => obj.setVisible(false));
        [this.wallButton, this.wallButtonText].forEach(obj => obj.setVisible(false));
    }
    
    updateMobileAbilityButtons() {
        if (!this.isMobile) return;
        
        // Update burst button
        if (this.abilities.burst.available) {
            this.burstButton.setVisible(true);
            this.burstButtonText.setVisible(true);
            
            const canUse = this.energy >= GAME_CONSTANTS.ABILITIES.BURST.ENERGY_COST && this.abilities.burst.cooldown === 0;
            this.burstButton.setAlpha(canUse ? 1 : 0.4);
            
            if (this.abilities.burst.cooldown > 0) {
                const seconds = Math.ceil(this.abilities.burst.cooldown / 1000);
                this.burstButtonText.setText(seconds.toString());
            } else {
                this.burstButtonText.setText('Q');
            }
        }
        
        // Update wall button
        if (this.abilities.wall.available) {
            this.wallButton.setVisible(true);
            this.wallButtonText.setVisible(true);
            
            const canUse = this.energy >= GAME_CONSTANTS.ABILITIES.WALL.ENERGY_COST && this.abilities.wall.cooldown === 0;
            this.wallButton.setAlpha(canUse ? 1 : 0.4);
            
            if (this.abilities.wall.cooldown > 0) {
                const seconds = Math.ceil(this.abilities.wall.cooldown / 1000);
                this.wallButtonText.setText(seconds.toString());
            } else {
                this.wallButtonText.setText('E');
            }
        }
    }
    
    showGameStateIndicator(state) {
        // Prevent showing the same state indicator multiple times
        if (this.lastShownGameState === state) {
            return;
        }
        this.lastShownGameState = state;
        
        let text, color;
        
        switch(state) {
            case 'warmup':
                // Don't show static text for warmup - countdown will handle it
                if (this.gameStateIndicator) {
                    this.gameStateIndicator.destroy();
                }
                return;
            case 'playing':
                text = 'GO!';
                color = GAME_CONSTANTS.UI.COLORS.SUCCESS;
                console.log('[GAME] Showing GO! message');
                break;
            case 'ended':
                text = 'ROUND ENDED';
                color = GAME_CONSTANTS.UI.COLORS.DANGER;
                break;
            default:
                return;
        }
        
        if (this.gameStateIndicator) {
            this.gameStateIndicator.destroy();
        }
        
        this.gameStateIndicator = this.add.text(ScaleHelper.centerX(), ScaleHelper.y(200), text, {
            fontSize: ScaleHelper.font('48px'),
            fontWeight: 'bold',
            fill: color,
            stroke: GAME_CONSTANTS.UI.COLORS.BLACK,
            strokeThickness: ScaleHelper.scale(4)
        }).setOrigin(0.5);
        
        // Fade out "GO!" text after showing
        if (state === 'playing') {
            this.gameStateIndicator.setScale(0.5);
            this.tweens.add({
                targets: this.gameStateIndicator,
                alpha: 0,
                scale: 2.5,
                duration: 1500,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    if (this.gameStateIndicator) {
                        this.gameStateIndicator.destroy();
                        this.gameStateIndicator = null;
                    }
                }
            });
        }
        
        // Auto-hide after 3 seconds if not warmup
        if (state !== 'warmup') {
            this.time.delayedCall(3000, () => {
                if (this.gameStateIndicator) {
                    this.tweens.add({
                        targets: this.gameStateIndicator,
                        alpha: 0,
                        duration: GAME_CONSTANTS.UI.ANIMATIONS.FADE_DURATION,
                        onComplete: () => this.gameStateIndicator.destroy()
                    });
                }
            });
        }
    }
    
    startWarmupCountdown(warmupTime) {
        // Clean up existing countdown
        if (this.countdownText) {
            this.countdownText.destroy();
        }
        if (this.countdownTimer) {
            this.countdownTimer.destroy();
        }
        
        // Create countdown display
        this.countdownText = this.add.text(ScaleHelper.centerX(), ScaleHelper.y(200), 'Get Ready!', {
            fontSize: ScaleHelper.font('48px'),
            fontWeight: 'bold',
            fill: GAME_CONSTANTS.UI.COLORS.WARNING,
            stroke: GAME_CONSTANTS.UI.COLORS.BLACK,
            strokeThickness: ScaleHelper.scale(4)
        }).setOrigin(0.5);
        
        let timeLeft = Math.ceil(warmupTime / 1000);
        
        // Update countdown every second
        this.countdownTimer = this.time.addEvent({
            delay: 1000,
            callback: () => {
                timeLeft--;
                
                if (timeLeft > 3) {
                    this.countdownText.setText('Get Ready!');
                } else if (timeLeft > 0) {
                    this.countdownText.setText(timeLeft.toString());
                    // Add scale animation for countdown numbers
                    this.tweens.add({
                        targets: this.countdownText,
                        scaleX: 1.2,
                        scaleY: 1.2,
                        duration: 200,
                        yoyo: true
                    });
                } else {
                    this.countdownText.destroy();
                    this.countdownTimer.destroy();
                }
            },
            callbackScope: this,
            loop: true
        });
    }
    
    updateConnectionStatus(connected) {
        if (this.connectionStatus) {
            this.connectionStatus.setText(connected ? '● Connected' : '● Disconnected');
            this.connectionStatus.setFill(connected ? GAME_CONSTANTS.UI.COLORS.SUCCESS : GAME_CONSTANTS.UI.COLORS.DANGER);
        }
    }

    // Performance monitoring shortcuts
    showPerformanceStats() {
        if (this.performanceMonitor) {
            this.performanceMonitor.toggleDisplay();
        }
    }
    
    getPerformanceReport() {
        if (!this.performanceMonitor) return null;
        
        return {
            client: this.performanceMonitor.getAverageStats(),
            objectPools: this.objectPool ? this.objectPool.getAllStats() : {},
            cullingActive: this.cullingActive,
            performanceMode: this.currentPerformanceMode
        };
    }
    
    setupPerformanceHotkeys() {
        // F1 - Toggle performance monitor
        this.input.keyboard.on('keydown-F1', () => {
            this.showPerformanceStats();
        });
        
        // F2 - Quick FPS test
        this.input.keyboard.on('keydown-F2', () => {
            if (this.stressTester) {
                this.stressTester.quickFpsTest();
            }
        });
        
        // F3 - Quick memory test
        this.input.keyboard.on('keydown-F3', () => {
            if (this.stressTester) {
                this.stressTester.quickMemoryTest();
            }
        });
        
        // F4 - Start medium stress test
        this.input.keyboard.on('keydown-F4', () => {
            if (this.stressTester) {
                this.stressTester.startStressTest('medium');
            }
        });
        
        // F5 - Start high stress test
        this.input.keyboard.on('keydown-F5', () => {
            if (this.stressTester) {
                this.stressTester.startStressTest('high');
            }
        });
        
        // F6 - Stop stress test
        this.input.keyboard.on('keydown-F6', () => {
            if (this.stressTester && this.stressTester.isRunning) {
                const results = this.stressTester.stopStressTest();
                console.log('Stress test results:', results);
                console.log('Recommendations:', this.stressTester.getRecommendations(results));
            }
        });
        
        // F7 - Manual memory cleanup
        this.input.keyboard.on('keydown-F7', () => {
            this.performMemoryCleanup();
        });
        
        // F8 - Toggle performance mode
        this.input.keyboard.on('keydown-F8', () => {
            const modes = ['low', 'medium', 'high'];
            const currentIndex = modes.indexOf(this.currentPerformanceMode || 'high');
            const nextMode = modes[(currentIndex + 1) % modes.length];
            this.setPerformanceMode(nextMode);
        });
        
        // F9 - Get performance report
        this.input.keyboard.on('keydown-F9', () => {
            const report = this.getPerformanceReport();
            console.log('Performance Report:', report);
        });
        
        // F10 - Server performance stats request
        this.input.keyboard.on('keydown-F10', () => {
            if (this.game.socket && this.game.socket.connected) {
                this.game.socket.emit('getPerformanceStats');
                this.game.socket.once('performanceStats', (stats) => {
                    console.log('Server Performance Stats:', stats);
                });
            }
        });
        
        console.log('Performance hotkeys enabled:');
        console.log('F1: Toggle performance monitor');
        console.log('F2: Quick FPS test');
        console.log('F3: Quick memory test');
        console.log('F4: Medium stress test');
        console.log('F5: High stress test');
        console.log('F6: Stop stress test');
        console.log('F7: Manual memory cleanup');
        console.log('F8: Toggle performance mode');
        console.log('F9: Get performance report');
        console.log('F10: Server performance stats');
    }

    // Performance optimizations
    updatePerformanceOptimizations() {
        this.updateCounter++;
        
        // Adaptive quality based on performance
        if (this.performanceMonitor) {
            const stats = this.performanceMonitor.getAverageStats();
            
            if (stats.avgFps < GAME_CONSTANTS.PERFORMANCE.FPS_CRITICAL_THRESHOLD) {
                this.setPerformanceMode('low');
            } else if (stats.avgFps < GAME_CONSTANTS.PERFORMANCE.FPS_WARNING_THRESHOLD) {
                this.setPerformanceMode('medium');
            } else {
                this.setPerformanceMode('high');
            }
        }
        
        // Object culling for objects outside view
        this.performObjectCulling();
        
        // Memory cleanup every 10 seconds
        if (this.updateCounter % 100 === 0) {
            this.performMemoryCleanup();
        }
        
        // Update minimap less frequently
        if (!this.isMobile && this.updateCounter % 10 === 0 && this.updateMinimap) {
            this.updateMinimap();
        }
        
        // Update player list less frequently
        if (!this.isMobile && this.updateCounter % 30 === 0 && this.updatePlayerList) {
            this.updatePlayerList(this.players);
        }
    }
    
    setPerformanceMode(mode) {
        if (this.currentPerformanceMode === mode) return;
        this.currentPerformanceMode = mode;
        
        switch (mode) {
            case 'low':
                // Disable non-essential visual effects
                this.disableParticleEffects();
                break;
                
            case 'medium':
                // Reduce particle count
                this.reduceParticleEffects();
                break;
                
            case 'high':
                // Enable all effects
                this.enableAllEffects();
                break;
        }
        
        console.log(`Performance mode set to: ${mode}`);
    }
    
    performObjectCulling() {
        const camera = this.cameras.main;
        const bounds = {
            left: camera.scrollX - 100,
            right: camera.scrollX + camera.width + 100,
            top: camera.scrollY - 100,
            bottom: camera.scrollY + camera.height + 100
        };
        
        // Cull particles outside view
        if (this.ambientParticles) {
            this.ambientParticles.forEach(particle => {
                if (particle && particle.x !== undefined) {
                    if (particle.x < bounds.left || particle.x > bounds.right ||
                        particle.y < bounds.top || particle.y > bounds.bottom) {
                        particle.setVisible(false);
                    } else {
                        particle.setVisible(true);
                    }
                }
            });
        }
        
        // Cull trail particles
        if (this.orbTrails) {
            Object.values(this.orbTrails).forEach(trail => {
                if (trail.particles && Array.isArray(trail.particles)) {
                    trail.particles.forEach(particle => {
                        if (particle && particle.x !== undefined) {
                            if (particle.x < bounds.left || particle.x > bounds.right ||
                                particle.y < bounds.top || particle.y > bounds.bottom) {
                                particle.setVisible(false);
                            } else {
                                particle.setVisible(true);
                            }
                        }
                    });
                }
            });
        }
    }
    
    performMemoryCleanup() {
        // Clean up object pools
        if (this.objectPool) {
            this.objectPool.cleanup();
        }
        
        // Clean up unused tweens
        this.tweens.killAll();
    }
    
    disableParticleEffects() {
        this.particleEffectsEnabled = false;
        if (this.ambientParticles) {
            this.ambientParticles.forEach(particle => {
                if (particle && particle.setVisible) {
                    particle.setVisible(false);
                }
            });
        }
    }
    
    reduceParticleEffects() {
        this.particleEffectsEnabled = true;
        this.particleEffectsReduced = true;
    }
    
    enableAllEffects() {
        this.particleEffectsEnabled = true;
        this.particleEffectsReduced = false;
        if (this.ambientParticles) {
            this.ambientParticles.forEach(particle => {
                if (particle && particle.setVisible) {
                    particle.setVisible(true);
                }
            });
        }
    }

    // Delta compression update handling
    updateGameStateDelta(delta) {
        // Handle delta compression updates
        if (delta.playerDeltas) {
            delta.playerDeltas.forEach(playerDelta => {
                const player = this.players[playerDelta.id];
                if (player) {
                    // Apply delta changes with interpolation
                    if (playerDelta.x !== undefined) {
                        if (this.clientPredictionEnabled && playerDelta.id === this.myId) {
                            // Client-side prediction reconciliation
                            const threshold = GAME_CONSTANTS.PERFORMANCE.CLIENT_PREDICTION.RECONCILIATION_THRESHOLD;
                            if (Math.abs(player.x - playerDelta.x) > threshold) {
                                this.tweens.add({
                                    targets: player,
                                    x: playerDelta.x,
                                    duration: 100,
                                    ease: 'Linear'
                                });
                            }
                        } else {
                            player.x = playerDelta.x;
                        }
                    }
                    
                    if (playerDelta.y !== undefined) {
                        if (this.clientPredictionEnabled && playerDelta.id === this.myId) {
                            const threshold = GAME_CONSTANTS.PERFORMANCE.CLIENT_PREDICTION.RECONCILIATION_THRESHOLD;
                            if (Math.abs(player.y - playerDelta.y) > threshold) {
                                this.tweens.add({
                                    targets: player,
                                    y: playerDelta.y,
                                    duration: 100,
                                    ease: 'Linear'
                                });
                            }
                        } else {
                            player.y = playerDelta.y;
                        }
                    }
                    
                    // Update other properties
                    if (playerDelta.vx !== undefined) player.vx = playerDelta.vx;
                    if (playerDelta.vy !== undefined) player.vy = playerDelta.vy;
                    if (playerDelta.level !== undefined && this.updatePlayerLevel) {
                        this.updatePlayerLevel(playerDelta.id, playerDelta.level);
                    }
                    if (playerDelta.crystalsCollected !== undefined && this.updatePlayerCrystals) {
                        this.updatePlayerCrystals(playerDelta.id, playerDelta.crystalsCollected);
                    }
                    if (playerDelta.energy !== undefined && playerDelta.id === this.myId) {
                        this.energy = playerDelta.energy;
                        this.updateEnergyBar(this.energy, 100);
                    }
                    
                    // Store upgrade properties
                    if (playerDelta.speedMultiplier !== undefined) player.speedMultiplier = playerDelta.speedMultiplier;
                    if (playerDelta.crystalDropReduction !== undefined) player.crystalDropReduction = playerDelta.crystalDropReduction;
                    if (playerDelta.energyCostReduction !== undefined) player.energyCostReduction = playerDelta.energyCostReduction;
                }
            });
        }
        
        // Handle full updates for orbs and crystals (less frequent)
        if (delta.orbs) {
            Object.values(delta.orbs).forEach(orb => {
                if (!this.orbs[orb.id]) {
                    this.addOrb(orb.id, orb);
                }
            });
        }
        
        if (delta.crystals) {
            Object.values(delta.crystals).forEach(crystal => {
                if (!this.crystals[crystal.id]) {
                    this.addCrystal(crystal.id, crystal);
                }
            });
        }
        
        // Update game time and other state
        if (delta.time !== undefined && this.updateGameTime) {
            this.updateGameTime(delta.time);
        }
        
        if (delta.gamePhase && this.gamePhase !== delta.gamePhase) {
            this.gamePhase = delta.gamePhase;
            if (this.showGameStateIndicator) {
                this.showGameStateIndicator(delta.gamePhase);
            }
        }
        
        if (delta.walls && this.updateWalls) {
            this.updateWalls(delta.walls);
        }
        
        if (delta.nebulaCore && this.updateNebulaCoreControl) {
            this.updateNebulaCoreControl(delta.nebulaCore);
        }
    }
    
    shutdown() {
        // Clean up video resources
        if (this.nebulaVideo) {
            this.nebulaVideo.stop();
            this.nebulaVideo.destroy();
            this.nebulaVideo = null;
        }
        
        if (this.reverseVideoTimer) {
            this.reverseVideoTimer.destroy();
            this.reverseVideoTimer = null;
        }
        
        // Clean up socket listeners
        if (this.game.socket) {
            this.game.socket.off('gameState');
            this.game.socket.off('playerJoined');
            this.game.socket.off('playerLeft');
            this.game.socket.off('roundComplete');
            this.game.socket.off('gameOver');
            this.game.socket.off('wallCreated');
            this.game.socket.off('wallRemoved');
        }
        
        // Call parent shutdown
        super.shutdown();
    }
}