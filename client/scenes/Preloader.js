class Preloader extends Phaser.Scene {
    constructor() {
        super({ key: 'Preloader' });
    }

    preload() {
        console.log('Preloading assets...');

        // Display loading bar
        let progressBar = this.add.graphics();
        let progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(240, 270, 320, 50);

        let loadingText = this.make.text({
            x: 400,
            y: 250,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        let percentText = this.make.text({
            x: 400,
            y: 295,
            text: '0%',
            style: {
                font: '18px monospace',
                fill: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);

        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(250, 280, 300 * value, 30);
        });

        this.load.on('complete', () => {
            console.log('Preloading complete.');
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
            this.createPlaceholderAssets();
            this.scene.start('MainMenuScene');
        });

        // Since we don't have actual asset files, we'll create placeholders
        // In production, you would load actual sprite files here
        
        // Audio (if AudioManager exists)
        if (typeof AudioManager !== 'undefined') {
            this.audioManager = new AudioManager(this);
            this.audioManager.preloadAudio();
        }
    }
    
    createPlaceholderAssets() {
        // Create placeholder orb sprite
        const orbGraphics = this.add.graphics();
        orbGraphics.fillStyle(0x00ff00);
        orbGraphics.fillCircle(16, 16, 16);
        orbGraphics.generateTexture('orb', 32, 32);
        orbGraphics.destroy();
        
        // Create placeholder crystal sprite
        const crystalGraphics = this.add.graphics();
        crystalGraphics.fillStyle(0x00ffff);
        crystalGraphics.beginPath();
        crystalGraphics.moveTo(16, 0);
        crystalGraphics.lineTo(24, 12);
        crystalGraphics.lineTo(20, 24);
        crystalGraphics.lineTo(12, 24);
        crystalGraphics.lineTo(8, 12);
        crystalGraphics.closePath();
        crystalGraphics.fillPath();
        crystalGraphics.generateTexture('crystal', 32, 32);
        crystalGraphics.destroy();
        
        // Create placeholder particle sprite
        const particleGraphics = this.add.graphics();
        particleGraphics.fillStyle(0xffffff);
        particleGraphics.fillCircle(4, 4, 4);
        particleGraphics.generateTexture('particle', 8, 8);
        particleGraphics.destroy();
    }
}