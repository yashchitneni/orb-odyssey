class BaseScene extends Phaser.Scene {
    constructor(config) {
        super(config);
    }

    createViewportBorder() {
        // Create a sci-fi monitor/viewport border effect
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Outer border graphics
        const border = this.add.graphics();
        border.setDepth(1000); // Always on top
        
        // Main border frame
        border.lineStyle(4, 0x00ffff, 1);
        border.strokeRect(3, 3, width - 6, height - 6);
        
        // Inner glow
        border.lineStyle(3, 0x0088ff, 0.5);
        border.strokeRect(7, 7, width - 14, height - 14);
        
        // Corner accents
        const cornerSize = ScaleHelper.scale(20);
        border.lineStyle(5, 0x00ffff, 1);
        
        // Top-left corner
        border.beginPath();
        border.moveTo(0, cornerSize);
        border.lineTo(0, 0);
        border.lineTo(cornerSize, 0);
        border.stroke();
        
        // Top-right corner
        border.beginPath();
        border.moveTo(width - cornerSize, 0);
        border.lineTo(width, 0);
        border.lineTo(width, cornerSize);
        border.stroke();
        
        // Bottom-left corner
        border.beginPath();
        border.moveTo(0, height - cornerSize);
        border.lineTo(0, height);
        border.lineTo(cornerSize, height);
        border.stroke();
        
        // Bottom-right corner
        border.beginPath();
        border.moveTo(width - cornerSize, height);
        border.lineTo(width, height);
        border.lineTo(width, height - cornerSize);
        border.stroke();
        
        // Add HUD elements
        this.createHUDElements(border, width, height);
        
        // Pulsing effect for the border
        this.tweens.add({
            targets: border,
            alpha: 0.7,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    createHUDElements(border, width, height) {
        // Top HUD bar
        border.fillStyle(0x001122, 0.8);
        border.fillRect(10, 10, width - 20, 25);
        
        // Bottom HUD bar
        border.fillStyle(0x001122, 0.8);
        border.fillRect(10, height - 35, width - 20, 25);
        
        // System status text (top-left)
        this.add.text(ScaleHelper.x(15), ScaleHelper.y(12), 'SYSTEM ONLINE', {
            fontSize: ScaleHelper.font('10px'),
            fill: '#00ff00',
            fontFamily: 'monospace'
        }).setDepth(1001);
        
        // Scene indicator (top-right)
        const sceneText = this.getSceneDisplayName();
        this.add.text(width - ScaleHelper.x(15), ScaleHelper.y(12), sceneText, {
            fontSize: ScaleHelper.font('10px'),
            fill: '#00ffff',
            fontFamily: 'monospace'
        }).setOrigin(1, 0).setDepth(1001);
        
        // Grid overlay for tech feel
        const gridSize = ScaleHelper.scale(50);
        border.lineStyle(1, 0x003366, 0.1);
        
        // Vertical lines
        for (let x = gridSize; x < width; x += gridSize) {
            border.moveTo(x, 0);
            border.lineTo(x, height);
        }
        
        // Horizontal lines
        for (let y = gridSize; y < height; y += gridSize) {
            border.moveTo(0, y);
            border.lineTo(width, y);
        }
        
        border.strokePath();
        
        // Scanline effect
        const scanline = this.add.rectangle(width/2, 0, width, 3, 0x00ffff, 0.2);
        scanline.setDepth(999);
        
        this.tweens.add({
            targets: scanline,
            y: height + 3,
            duration: 4000,
            repeat: -1,
            ease: 'Linear'
        });
    }
    
    getSceneDisplayName() {
        const sceneNames = {
            'MainMenuScene': 'MAIN MENU',
            'LobbyScene': 'LOBBY',
            'GameArenaScene': 'ARENA',
            'UpgradeScene': 'UPGRADE',
            'EndScreenScene': 'RESULTS',
            'Preloader': 'LOADING'
        };
        
        return sceneNames[this.scene.key] || 'UNKNOWN';
    }
}