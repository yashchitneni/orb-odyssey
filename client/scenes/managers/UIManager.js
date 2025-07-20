import { ScaleHelper } from '../../helpers/ScaleHelper.js';
import { GAME_CONSTANTS } from '../../../shared/constants.js';

class AudioSettingsPanel {
    constructor(scene, audioManager) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.panel = this.scene.add.container(ScaleHelper.centerX(), ScaleHelper.centerY());
        this.panel.setVisible(false);

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.8);
        bg.fillRoundedRect(-150, -100, 300, 200, 16);
        this.panel.add(bg);

        const title = this.scene.add.text(0, -80, 'Audio Settings', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
        this.panel.add(title);
        
        // This is a dummy implementation
        const musicLabel = this.scene.add.text(-100, -20, 'Music', { fontSize: '18px', fill: '#fff' });
        this.panel.add(musicLabel);
        
        const sfxLabel = this.scene.add.text(-100, 20, 'SFX', { fontSize: '18px', fill: '#fff' });
        this.panel.add(sfxLabel);
    }

    toggle() {
        this.panel.setVisible(!this.panel.visible);
    }
}

export default class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    create() {
        this.createHUD();
        this.createUI();
        if (this.isMobile) {
            this.adjustHUDForMobile();
        }
    }

    update(delta) {
        this.updateAbilityDisplay();
        if (this.isMobile) this.updateMobileAbilityButtons();
    }

    // --- HUD Creation ---
    createHUD() {
        this.crystalText = this.scene.add.text(ScaleHelper.x(15), ScaleHelper.y(15), 'Crystals: 0', { fontSize: ScaleHelper.font('20px'), fill: GAME_CONSTANTS.UI.COLORS.PRIMARY, stroke: GAME_CONSTANTS.UI.COLORS.BLACK, strokeThickness: ScaleHelper.scale(2) });
        this.levelText = this.scene.add.text(ScaleHelper.x(15), ScaleHelper.y(75), 'Level: 1', { fontSize: ScaleHelper.font('18px'), fill: GAME_CONSTANTS.UI.COLORS.SUCCESS, stroke: GAME_CONSTANTS.UI.COLORS.BLACK, strokeThickness: ScaleHelper.scale(2) });
        this.timeText = this.scene.add.text(ScaleHelper.centerX(), ScaleHelper.y(15), 'Time: 10:00', { fontSize: ScaleHelper.font('20px'), fill: GAME_CONSTANTS.UI.COLORS.WHITE, stroke: GAME_CONSTANTS.UI.COLORS.BLACK, strokeThickness: ScaleHelper.scale(2) }).setOrigin(0.5, 0);
        this.connectionStatus = this.scene.add.text(ScaleHelper.x(15), ScaleHelper.height() - ScaleHelper.scale(30), '● Connected', { fontSize: ScaleHelper.font('14px'), fill: GAME_CONSTANTS.UI.COLORS.SUCCESS });

        this.createProgressBar();
        this.createEnergyBar();
        this.createAbilityDisplay();
    }

    createProgressBar() {
        const x = ScaleHelper.x(15), y = ScaleHelper.y(105), width = ScaleHelper.scale(280), height = ScaleHelper.scale(12);
        this.progressBarBg = this.scene.add.graphics().fillStyle(0x333333).fillRoundedRect(x, y, width, height, ScaleHelper.scale(6));
        this.progressBarBg.lineStyle(ScaleHelper.scale(2), 0x555555).strokeRoundedRect(x, y, width, height, ScaleHelper.scale(6));
        this.progressBar = this.scene.add.graphics();
        this.updateProgressBar(0, 20);
    }

    updateProgressBar(current, target) {
        const x = ScaleHelper.x(15), y = ScaleHelper.y(105), width = ScaleHelper.scale(280), height = ScaleHelper.scale(12);
        const progress = Math.min(current / target, 1);
        const barWidth = (width - ScaleHelper.scale(4)) * progress;
        this.progressBar.clear();
        if (barWidth > 0) {
            const colors = GAME_CONSTANTS.UI.GRADIENTS.XP;
            this.progressBar.fillGradientStyle(colors[0], colors[1], colors[0], colors[1]);
            this.progressBar.fillRoundedRect(x + ScaleHelper.scale(2), y + ScaleHelper.scale(2), barWidth, height - ScaleHelper.scale(4), ScaleHelper.scale(4));
        }
    }

    createEnergyBar() {
        const x = ScaleHelper.x(15), y = ScaleHelper.y(140), width = ScaleHelper.scale(280), height = ScaleHelper.scale(15);
        this.energyBarBg = this.scene.add.graphics().fillStyle(0x1a1a1a).fillRoundedRect(x, y, width, height, ScaleHelper.scale(7));
        this.energyBarBg.lineStyle(ScaleHelper.scale(2), 0x333333).strokeRoundedRect(x, y, width, height, ScaleHelper.scale(7));
        this.energyBar = this.scene.add.graphics();
        this.energyText = this.scene.add.text(x + ScaleHelper.scale(10), y + height + ScaleHelper.scale(5), 'Energy: 100/100', { fontSize: ScaleHelper.font('14px'), fill: GAME_CONSTANTS.UI.COLORS.PRIMARY });
        this.updateEnergyBar(100, 100);
    }

    updateEnergyBar(current, max) {
        const x = ScaleHelper.x(15), y = ScaleHelper.y(140), width = ScaleHelper.scale(280), height = ScaleHelper.scale(15);
        const progress = Math.min(current / max, 1), barWidth = width * progress;
        this.energyBar.clear();
        if (barWidth > 0) {
            const colors = GAME_CONSTANTS.UI.GRADIENTS.ENERGY;
            this.energyBar.fillGradientStyle(colors[0], colors[1], colors[0], colors[1]);
            this.energyBar.fillRoundedRect(x + ScaleHelper.scale(2), y + ScaleHelper.scale(2), barWidth - ScaleHelper.scale(4), height - ScaleHelper.scale(4), ScaleHelper.scale(5));
        }
        this.energyText.setText(`Energy: ${Math.floor(current)}/${max}`);
    }

    createAbilityDisplay() {
        this.abilityText = this.scene.add.text(ScaleHelper.x(15), ScaleHelper.y(180), '', { fontSize: ScaleHelper.font('16px'), fill: GAME_CONSTANTS.UI.COLORS.WARNING, stroke: GAME_CONSTANTS.UI.COLORS.BLACK, strokeThickness: ScaleHelper.scale(1) });
        this.updateAbilityDisplay();
    }

    updateAbilityDisplay() {
        let abilityInfo = [];
        const player = this.scene.gameObjectManager.players[this.scene.myId];
        const reduction = player?.energyCostReduction || 0;
        const energy = this.scene.energy;
        const abilities = this.scene.abilities;

        if (abilities.burst.available) {
            const baseCost = GAME_CONSTANTS.ABILITIES.BURST.ENERGY_COST, actualCost = Math.floor(baseCost * (1 - reduction));
            const burstStatus = abilities.burst.cooldown > 0 ? `(${Math.ceil(abilities.burst.cooldown / 1000)}s)` : energy >= actualCost ? `(${actualCost}E)` : '(No Energy)';
            abilityInfo.push(`Q: Burst ${burstStatus}`);
        }
        if (abilities.wall.available) {
            const baseCost = GAME_CONSTANTS.ABILITIES.WALL.ENERGY_COST, actualCost = Math.floor(baseCost * (1 - reduction));
            const wallStatus = abilities.wall.cooldown > 0 ? `(${Math.ceil(abilities.wall.cooldown / 1000)}s)` : energy >= actualCost ? `(${actualCost}E)` : '(No Energy)';
            abilityInfo.push(`E: Wall ${wallStatus}`);
        }
        this.abilityText.setText(abilityInfo.join('  '));
    }

    // --- UI Panels ---
    createUI() {
        this.createWinConditionPanel();
        this.createPlayerListPanel();
        this.createControlsHelpPanel();
        if (!this.isMobile) this.createMinimap();
    }
    
    createWinConditionPanel() {
        const panelWidth = ScaleHelper.scale(400), panelHeight = ScaleHelper.scale(60), x = ScaleHelper.centerX() - panelWidth / 2, y = ScaleHelper.y(10);
        this.winPanel = this.scene.add.graphics().fillGradientStyle(0x2a2a2a, 0x2a2a2a, 0x1a1a1a, 0x1a1a1a).fillRoundedRect(x, y, panelWidth, panelHeight, ScaleHelper.scale(12));
        this.winPanel.lineStyle(ScaleHelper.scale(2), 0xff00ff).strokeRoundedRect(x, y, panelWidth, panelHeight, ScaleHelper.scale(12));
        this.roundInfoText = this.scene.add.text(ScaleHelper.centerX(), y + ScaleHelper.scale(20), `Round 1 / 5`, { fontSize: ScaleHelper.font('22px'), fontFamily: 'Arial Black', fill: GAME_CONSTANTS.UI.COLORS.WHITE, stroke: GAME_CONSTANTS.UI.COLORS.BLACK, strokeThickness: ScaleHelper.scale(2) }).setOrigin(0.5);
        this.winConditionText = this.scene.add.text(ScaleHelper.centerX(), y + ScaleHelper.scale(45), `First to ${GAME_CONSTANTS.WIN_CONDITIONS.CRYSTAL_TARGET} crystals wins!`, { fontSize: ScaleHelper.font('16px'), fontFamily: 'Arial', fill: GAME_CONSTANTS.UI.COLORS.PRIMARY, }).setOrigin(0.5);
    }

    updateWinConditionPanel() {
        if (this.roundInfoText) this.roundInfoText.setText(`Round ${this.scene.currentRound} / 5`);
    }

    createPlayerListPanel() {
        if (this.isMobile) return;
        const panelWidth = ScaleHelper.scale(200), panelHeight = ScaleHelper.scale(150), x = ScaleHelper.x(600), y = ScaleHelper.y(80);
        this.playerPanel = this.scene.add.graphics().fillStyle(0x1a1a1a, 0.9).fillRoundedRect(x, y, panelWidth, panelHeight, ScaleHelper.scale(8));
        this.playerPanel.lineStyle(ScaleHelper.scale(1), 0x00ffff).strokeRoundedRect(x, y, panelWidth, panelHeight, ScaleHelper.scale(8));
        this.scene.add.text(x + ScaleHelper.scale(100), y + ScaleHelper.scale(10), 'Players', { ...GAME_CONSTANTS.UI.FONTS.BODY, fontSize: ScaleHelper.font(GAME_CONSTANTS.UI.FONTS.BODY.fontSize), fill: GAME_CONSTANTS.UI.COLORS.PRIMARY, fontWeight: 'bold' }).setOrigin(0.5, 0);
        this.scene.add.text(x + ScaleHelper.scale(10), y + ScaleHelper.scale(35), 'Player', { fontSize: ScaleHelper.font('12px'), fill: '#ccc' });
        this.scene.add.text(x + ScaleHelper.scale(110), y + ScaleHelper.scale(35), 'Wins', { fontSize: ScaleHelper.font('12px'), fill: '#ccc' });
        this.scene.add.text(x + ScaleHelper.scale(150), y + ScaleHelper.scale(35), 'Crystals', { fontSize: ScaleHelper.font('12px'), fill: '#ccc' });
        this.playerListContainer = this.scene.add.container(x + ScaleHelper.scale(10), y + ScaleHelper.scale(55));
    }

    updatePlayerList(players) {
        if (!this.playerListContainer) return;
        this.playerListContainer.removeAll(true);
        const playerArray = Object.values(players);
        const sortedPlayers = playerArray.sort((a, b) => {
            const winsA = this.scene.seriesScores[a.id] || 0;
            const winsB = this.scene.seriesScores[b.id] || 0;
            if (winsB !== winsA) return winsB - winsA;
            return b.crystalsCollected - a.crystalsCollected;
        });
        sortedPlayers.forEach((player, index) => {
            const yPos = index * ScaleHelper.scale(20), isMe = player.id === this.scene.myId, wins = this.scene.seriesScores[player.id] || 0;
            const displayText = isMe ? 'You' : player.name;
            const playerText = this.scene.add.text(0, yPos, displayText, { fontSize: ScaleHelper.font('14px'), fill: isMe ? GAME_CONSTANTS.UI.COLORS.WARNING : GAME_CONSTANTS.UI.COLORS.WHITE, fontWeight: isMe ? 'bold' : 'normal' });
            const winsText = this.scene.add.text(ScaleHelper.scale(110), yPos, `🏆 ${wins}`, { fontSize: ScaleHelper.font('12px'), fill: '#ffd700' });
            const crystalText = this.scene.add.text(ScaleHelper.scale(150), yPos, `${player.crystalsCollected}`, { fontSize: ScaleHelper.font('12px'), fill: GAME_CONSTANTS.UI.COLORS.PRIMARY });
            this.playerListContainer.add([playerText, winsText, crystalText]);
        });
    }

    createMinimap() {
        const minimapSize = ScaleHelper.scale(120), x = ScaleHelper.x(670), y = ScaleHelper.y(250);
        this.minimapBg = this.scene.add.graphics().fillStyle(0x000000, 0.7).fillRect(x, y, minimapSize, minimapSize * (GAME_CONSTANTS.WORLD_HEIGHT / GAME_CONSTANTS.WORLD_WIDTH));
        this.minimapBg.lineStyle(ScaleHelper.scale(1), 0x00ffff).strokeRect(x, y, minimapSize, minimapSize * (GAME_CONSTANTS.WORLD_HEIGHT / GAME_CONSTANTS.WORLD_WIDTH));
        this.minimapContainer = this.scene.add.container(x, y);
        this.scene.add.text(x + minimapSize / 2, y - ScaleHelper.scale(20), 'Map', { fontSize: ScaleHelper.font('14px'), fill: GAME_CONSTANTS.UI.COLORS.PRIMARY }).setOrigin(0.5);
    }

    updateMinimap() {
        if (!this.minimapContainer) return;
        const minimapSize = ScaleHelper.scale(120);
        const scaleX = minimapSize / GAME_CONSTANTS.WORLD_WIDTH;
        const scaleY = (minimapSize * (GAME_CONSTANTS.WORLD_HEIGHT / GAME_CONSTANTS.WORLD_WIDTH)) / GAME_CONSTANTS.WORLD_HEIGHT;
        this.minimapContainer.removeAll(true);
        Object.values(this.scene.gameObjectManager.players).forEach(player => {
            if (!player.orb) return;
            const x = player.orb.x * scaleX, y = player.orb.y * scaleY, isMe = player.id === this.scene.myId;
            const dot = this.scene.add.circle(x, y, isMe ? 3 : 2, isMe ? 0xffff00 : player.orb.tintTopLeft);
            this.minimapContainer.add(dot);
        });
        Object.values(this.scene.gameObjectManager.crystals).forEach(crystal => {
            const x = crystal.x * scaleX, y = crystal.y * scaleY;
            const dot = this.scene.add.circle(x, y, 1, crystal.isPowerCrystal ? 0xff00ff : 0x00ffff);
            this.minimapContainer.add(dot);
        });
    }

    createControlsHelpPanel() {
        const panelWidth = this.isMobile ? ScaleHelper.scale(280) : ScaleHelper.scale(320), panelHeight = this.isMobile ? ScaleHelper.scale(80) : ScaleHelper.scale(100);
        const x = this.isMobile ? ScaleHelper.x(10) : ScaleHelper.x(450), y = this.isMobile ? ScaleHelper.y(470) : ScaleHelper.y(480);
        this.controlsPanel = this.scene.add.graphics().fillStyle(0x1a1a1a, 0.8).fillRoundedRect(x, y, panelWidth, panelHeight, ScaleHelper.scale(8));
        this.controlsPanel.lineStyle(ScaleHelper.scale(1), 0x555555).strokeRoundedRect(x, y, panelWidth, panelHeight, ScaleHelper.scale(8));
        const controlsTextContent = this.isMobile ? 'Touch and drag to move\nTap for abilities when unlocked' : 'WASD/Arrow Keys: Move\nQ: Energy Burst (L3+)  E: Energy Wall (L4+)\nM: Audio Settings';
        this.controlsText = this.scene.add.text(x + ScaleHelper.scale(10), y + ScaleHelper.scale(10), controlsTextContent, { fontSize: this.isMobile ? ScaleHelper.font('12px') : ScaleHelper.font('14px'), fill: GAME_CONSTANTS.UI.COLORS.WHITE, lineSpacing: 5 });
        this.controlsPanel.setAlpha(0); this.controlsText.setAlpha(0);
        this.scene.time.delayedCall(1000, () => {
            this.scene.tweens.add({ targets: [this.controlsPanel, this.controlsText], alpha: 1, duration: GAME_CONSTANTS.UI.ANIMATIONS.FADE_DURATION,
                onComplete: () => this.scene.time.delayedCall(5000, () => this.scene.tweens.add({ targets: [this.controlsPanel, this.controlsText], alpha: 0, duration: GAME_CONSTANTS.UI.ANIMATIONS.FADE_DURATION }))
            });
        });
    }

    // --- Mobile UI ---
    adjustHUDForMobile() {
        if (!this.isMobile) return;
        const scale = GAME_CONSTANTS.UI.MOBILE.SCALE_FACTOR, padding = GAME_CONSTANTS.UI.MOBILE.SAFE_AREA_PADDING;
        [this.crystalText, this.timeText, this.levelText, this.abilityText, this.energyText].forEach(element => {
            if (element) element.setScale(scale);
        });
        if (this.connectionStatus) this.connectionStatus.setPosition(padding, ScaleHelper.height() - ScaleHelper.scale(30));
        this.createMobileAbilityButtons();
    }

    createMobileAbilityButtons() {
        if (!this.isMobile) return;
        const buttonSize = Math.max(GAME_CONSTANTS.UI.MOBILE.MIN_TOUCH_SIZE, ScaleHelper.scale(50)), spacing = ScaleHelper.scale(70), startY = ScaleHelper.height() - ScaleHelper.scale(140);
        this.burstButton = this.scene.add.circle(ScaleHelper.width() - ScaleHelper.scale(80), startY, buttonSize / 2, 0xffff00, 0.7).setStrokeStyle(ScaleHelper.scale(2), 0xffffff).setInteractive();
        this.burstButton.on('pointerdown', () => this.scene.events.emit('abilityUsed', { type: 'burst' }));
        this.burstButtonText = this.scene.add.text(ScaleHelper.width() - ScaleHelper.scale(80), startY, 'Q', { fontSize: ScaleHelper.font('20px'), fill: GAME_CONSTANTS.UI.COLORS.BLACK, fontWeight: 'bold' }).setOrigin(0.5);
        this.wallButton = this.scene.add.circle(ScaleHelper.width() - ScaleHelper.scale(80), startY - spacing, buttonSize / 2, 0x00ffff, 0.7).setStrokeStyle(ScaleHelper.scale(2), 0xffffff).setInteractive();
        this.wallButton.on('pointerdown', () => this.scene.events.emit('abilityUsed', { type: 'wall' }));
        this.wallButtonText = this.scene.add.text(ScaleHelper.width() - ScaleHelper.scale(80), startY - spacing, 'E', { fontSize: ScaleHelper.font('20px'), fill: GAME_CONSTANTS.UI.COLORS.BLACK, fontWeight: 'bold' }).setOrigin(0.5);
        [this.burstButton, this.burstButtonText, this.wallButton, this.wallButtonText].forEach(obj => obj.setVisible(false));
    }

    updateMobileAbilityButtons() {
        if (!this.isMobile) return;
        const energy = this.scene.energy, abilities = this.scene.abilities;
        if (abilities.burst.available) {
            this.burstButton.setVisible(true); this.burstButtonText.setVisible(true);
            const canUse = energy >= GAME_CONSTANTS.ABILITIES.BURST.ENERGY_COST && abilities.burst.cooldown === 0;
            this.burstButton.setAlpha(canUse ? 1 : 0.4);
            this.burstButtonText.setText(abilities.burst.cooldown > 0 ? Math.ceil(abilities.burst.cooldown / 1000).toString() : 'Q');
        }
        if (abilities.wall.available) {
            this.wallButton.setVisible(true); this.wallButtonText.setVisible(true);
            const canUse = energy >= GAME_CONSTANTS.ABILITIES.WALL.ENERGY_COST && abilities.wall.cooldown === 0;
            this.wallButton.setAlpha(canUse ? 1 : 0.4);
            this.wallButtonText.setText(abilities.wall.cooldown > 0 ? Math.ceil(abilities.wall.cooldown / 1000).toString() : 'E');
        }
    }

    // --- State Indicators ---
    showGameStateIndicator(state) {
        if (this.lastShownGameState === state) return;
        this.lastShownGameState = state;
        let text, color;
        switch(state) {
            case 'warmup': if (this.gameStateIndicator) this.gameStateIndicator.destroy(); return;
            case 'playing': text = 'GO!'; color = GAME_CONSTANTS.UI.COLORS.SUCCESS; break;
            case 'ended': text = 'ROUND ENDED'; color = GAME_CONSTANTS.UI.COLORS.DANGER; break;
            default: return;
        }
        if (this.gameStateIndicator) this.gameStateIndicator.destroy();
        this.gameStateIndicator = this.scene.add.text(ScaleHelper.centerX(), ScaleHelper.y(200), text, { fontSize: ScaleHelper.font('48px'), fontWeight: 'bold', fill: color, stroke: GAME_CONSTANTS.UI.COLORS.BLACK, strokeThickness: ScaleHelper.scale(4) }).setOrigin(0.5);
        if (state === 'playing') {
            this.gameStateIndicator.setScale(0.5);
            this.scene.tweens.add({ targets: this.gameStateIndicator, alpha: 0, scale: 2.5, duration: 1500, ease: 'Cubic.easeOut', onComplete: () => { if (this.gameStateIndicator) this.gameStateIndicator.destroy(); this.gameStateIndicator = null; } });
        }
        if (state !== 'warmup') {
            this.scene.time.delayedCall(3000, () => { if (this.gameStateIndicator) this.scene.tweens.add({ targets: this.gameStateIndicator, alpha: 0, duration: GAME_CONSTANTS.UI.ANIMATIONS.FADE_DURATION, onComplete: () => this.gameStateIndicator.destroy() }); });
        }
    }

    startWarmupCountdown(warmupTime) {
        if (this.countdownText) this.countdownText.destroy();
        if (this.countdownTimer) this.countdownTimer.destroy();
        this.countdownText = this.scene.add.text(ScaleHelper.centerX(), ScaleHelper.y(200), 'Get Ready!', { fontSize: ScaleHelper.font('48px'), fontWeight: 'bold', fill: GAME_CONSTANTS.UI.COLORS.WARNING, stroke: GAME_CONSTANTS.UI.COLORS.BLACK, strokeThickness: ScaleHelper.scale(4) }).setOrigin(0.5);
        let timeLeft = Math.ceil(warmupTime / 1000);
        this.countdownTimer = this.scene.time.addEvent({ delay: 1000, callback: () => {
            timeLeft--;
            if (timeLeft > 3) this.countdownText.setText('Get Ready!');
            else if (timeLeft > 0) {
                this.countdownText.setText(timeLeft.toString());
                this.scene.tweens.add({ targets: this.countdownText, scaleX: 1.2, scaleY: 1.2, duration: 200, yoyo: true });
            } else {
                this.countdownText.destroy();
                this.countdownTimer.destroy();
            }
        }, callbackScope: this, loop: true });
    }

    updateConnectionStatus(connected) {
        if (this.connectionStatus) {
            this.connectionStatus.setText(connected ? '● Connected' : '● Disconnected');
            this.connectionStatus.setFill(connected ? GAME_CONSTANTS.UI.COLORS.SUCCESS : GAME_CONSTANTS.UI.COLORS.DANGER);
        }
    }

    onMyCrystalsUpdated({ crystals, level }) {
        this.crystalText.setText(`Crystals: ${crystals}`);
        const levelThresholds = GAME_CONSTANTS.LEVELS.THRESHOLDS;
        const currentThreshold = levelThresholds[level - 1] || 0;
        const nextThreshold = levelThresholds[level] || 100;
        this.updateProgressBar(crystals - currentThreshold, nextThreshold - currentThreshold);
        if (crystals >= 90) this.crystalText.setFill(GAME_CONSTANTS.UI.COLORS.WARNING);
        else if (crystals >= 80) this.crystalText.setFill(GAME_CONSTANTS.UI.COLORS.SUCCESS);
        else this.crystalText.setFill(GAME_CONSTANTS.UI.COLORS.PRIMARY);
    }
    
    onMyLevelUpdated(level) {
        this.levelText.setText(`Level: ${level}`);
        this.levelText.setFill(this.getLevelColor(level));

        if (level === 3 && !this.scene.abilities.burst.notified) {
            this.scene.vfxManager.createFloatingText(ScaleHelper.centerX(), ScaleHelper.centerY() - ScaleHelper.scale(100), 'Burst Ability Unlocked! Press Q', GAME_CONSTANTS.UI.COLORS.WARNING, '24px');
        }
        if (level === 4 && !this.scene.abilities.wall.notified) {
            this.scene.vfxManager.createFloatingText(ScaleHelper.centerX(), ScaleHelper.centerY() - ScaleHelper.scale(100), 'Wall Ability Unlocked! Press E', GAME_CONSTANTS.UI.COLORS.WARNING, '24px');
            this.showNebulaCore();
        }
    }

    showNebulaCore() {
        if (this.nebulaCore) return;
        const { X, Y, RADIUS } = GAME_CONSTANTS.NEBULA_CORE;
        this.nebulaCore = this.scene.add.circle(X, Y, RADIUS, 0x8000ff, 0.3).setStrokeStyle(ScaleHelper.scale(3), 0xff00ff);
        this.scene.tweens.add({ targets: this.nebulaCore, scaleX: 1.2, scaleY: 1.2, alpha: 0.6, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.nebulaCoreText = this.scene.add.text(X, Y - RADIUS - 30, 'NEBULA CORE', { fontSize: '18px', fill: GAME_CONSTANTS.UI.COLORS.DANGER, stroke: GAME_CONSTANTS.UI.COLORS.BLACK, strokeThickness: ScaleHelper.scale(2), fontWeight: 'bold' }).setOrigin(0.5);
    }

    updateNebulaCoreControl(data) {
        if (data.controllerId) {
            if (!this.nebulaCoreControlText) {
                this.nebulaCoreControlText = this.scene.add.text(400, 120, '', { fontSize: '18px', fill: GAME_CONSTANTS.UI.COLORS.WARNING, stroke: GAME_CONSTANTS.UI.COLORS.BLACK, strokeThickness: ScaleHelper.scale(2), fontWeight: 'bold' }).setOrigin(0.5);
            }
            const controllerName = data.controllerId === this.scene.myId ? 'You' : this.scene.gameObjectManager.players[data.controllerId]?.name || 'Another player';
            const timeLeft = Math.ceil((30000 - data.controlTime) / 1000);
            this.nebulaCoreControlText.setText(`${controllerName} controlling core (${timeLeft}s)`).setVisible(true);
        } else if (this.nebulaCoreControlText) {
            this.nebulaCoreControlText.setVisible(false);
        }
    }

    toggleAudioSettings() {
        if (!this.audioSettingsPanel) {
            this.audioSettingsPanel = new AudioSettingsPanel(this.scene, this.scene.audioManager);
        }
        this.audioSettingsPanel.toggle();
    }
    
    updateGameTime(timeRemaining) {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        this.timeText.setText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
        if (timeRemaining <= 60) this.timeText.setFill(GAME_CONSTANTS.UI.COLORS.DANGER);
        else if (timeRemaining <= 180) this.timeText.setFill(GAME_CONSTANTS.UI.COLORS.WARNING);
        else this.timeText.setFill(GAME_CONSTANTS.UI.COLORS.WHITE);
    }

    getLevelColor(level) {
        const colors = [GAME_CONSTANTS.UI.COLORS.SUCCESS, GAME_CONSTANTS.UI.COLORS.PRIMARY, GAME_CONSTANTS.UI.COLORS.WARNING, GAME_CONSTANTS.UI.COLORS.DANGER];
        return colors[level - 1] || colors[3];
    }

    destroy() {
        // Destroy all UI elements to prevent memory leaks
        this.crystalText?.destroy();
        this.levelText?.destroy();
        this.timeText?.destroy();
        this.connectionStatus?.destroy();
        this.progressBarBg?.destroy();
        this.progressBar?.destroy();
        this.energyBarBg?.destroy();
        this.energyBar?.destroy();
        this.energyText?.destroy();
        this.abilityText?.destroy();
        this.winPanel?.destroy();
        this.roundInfoText?.destroy();
        this.winConditionText?.destroy();
        this.playerPanel?.destroy();
        this.playerListContainer?.destroy();
        this.minimapBg?.destroy();
        this.minimapContainer?.destroy();
        this.controlsPanel?.destroy();
        this.controlsText?.destroy();
        this.burstButton?.destroy();
        this.burstButtonText?.destroy();
        this.wallButton?.destroy();
        this.wallButtonText?.destroy();
        this.gameStateIndicator?.destroy();
        this.countdownText?.destroy();
        this.countdownTimer?.destroy();
        this.nebulaCore?.destroy();
        this.nebulaCoreText?.destroy();
        this.nebulaCoreControlText?.destroy();
        this.audioSettingsPanel?.panel.destroy();
    }
}