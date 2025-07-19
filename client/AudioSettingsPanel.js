class AudioSettingsPanel {
    constructor(scene, audioManager) {
        this.scene = scene;
        this.audioManager = audioManager;
        this.isVisible = false;
        this.panel = null;
        this.elements = [];
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        if (this.isVisible) return;
        
        this.createPanel();
        this.isVisible = true;
    }

    hide() {
        if (!this.isVisible) return;
        
        this.destroyPanel();
        this.isVisible = false;
    }

    createPanel() {
        // Create a simple overlay panel
        const panelWidth = 300;
        const panelHeight = 200;
        const x = 400 - panelWidth / 2;
        const y = 300 - panelHeight / 2;

        // Background overlay
        this.overlay = this.scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
        this.overlay.setInteractive();
        this.overlay.on('pointerdown', () => this.hide());

        // Panel background
        this.panel = this.scene.add.graphics();
        this.panel.fillStyle(0x2a2a2a);
        this.panel.fillRoundedRect(x, y, panelWidth, panelHeight, 12);
        this.panel.lineStyle(2, 0x00ffff);
        this.panel.strokeRoundedRect(x, y, panelWidth, panelHeight, 12);

        // Title
        const title = this.scene.add.text(400, y + 30, 'Audio Settings', {
            fontSize: '24px',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Master volume text
        const masterText = this.scene.add.text(x + 20, y + 70, `Master Volume: ${Math.round(this.audioManager.getMasterVolume() * 100)}%`, {
            fontSize: '16px',
            fill: '#ffffff'
        });

        // Music volume text
        const musicText = this.scene.add.text(x + 20, y + 100, `Music Volume: ${Math.round(this.audioManager.getMusicVolume() * 100)}%`, {
            fontSize: '16px',
            fill: '#ffffff'
        });

        // SFX volume text
        const sfxText = this.scene.add.text(x + 20, y + 130, `SFX Volume: ${Math.round(this.audioManager.getSfxVolume() * 100)}%`, {
            fontSize: '16px',
            fill: '#ffffff'
        });

        // Close button
        const closeButton = this.scene.add.text(400, y + panelHeight - 30, 'Close (Press M)', {
            fontSize: '16px',
            fill: '#00ffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        closeButton.setInteractive();
        closeButton.on('pointerdown', () => this.hide());

        // Store elements for cleanup
        this.elements = [this.overlay, this.panel, title, masterText, musicText, sfxText, closeButton];
    }

    destroyPanel() {
        this.elements.forEach(element => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        this.elements = [];
        this.panel = null;
        this.overlay = null;
    }
}