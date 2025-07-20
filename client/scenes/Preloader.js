class Preloader extends BaseScene {
    constructor() {
        super({ key: 'Preloader' });
    }

    preload() {
        console.log('Preloading assets...');

        // Display loading bar (for 1200x800)
        let progressBar = this.add.graphics();
        let progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(ScaleHelper.x(240), ScaleHelper.y(225), ScaleHelper.x(320), ScaleHelper.y(50));

        let loadingText = this.make.text({
            x: ScaleHelper.centerX(),
            y: ScaleHelper.y(210),
            text: 'Loading...',
            style: {
                font: ScaleHelper.font('20px') + ' monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        let percentText = this.make.text({
            x: ScaleHelper.centerX(),
            y: ScaleHelper.y(250),
            text: '0%',
            style: {
                font: ScaleHelper.font('18px') + ' monospace',
                fill: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);

        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(ScaleHelper.x(250), ScaleHelper.y(235), ScaleHelper.x(300) * value, ScaleHelper.y(30));
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

        // Load actual assets if available
        // Check if nebula image exists in assets folder
        this.load.image('nebula', 'assets/nebula.png');
        
        // Load nebula video for game arena background
        console.log('[PRELOADER] Attempting to load video: assets/backgrounds/nebula.mp4');
        this.load.video('nebulaVideo', 'assets/backgrounds/nebula.mp4', 'loadeddata', false, true);
        
        // Add load event listeners for debugging
        this.load.on('filecomplete-video-nebulaVideo', () => {
            console.log('[PRELOADER] Video loaded successfully!');
        });
        
        this.load.on('loaderror', (file) => {
            if (file.key === 'nebulaVideo') {
                console.error('[PRELOADER] Failed to load video:', file.src, file);
            }
        });
        
        // Load orb sprites for players
        console.log('[PRELOADER] Loading orb sprites...');
        this.load.image('orb1', 'assets/sprites/orb1.png');
        this.load.image('orb2', 'assets/sprites/orb2.png');
        this.load.image('orb3', 'assets/sprites/orb3.png');
        
        // Add load event listeners for orb sprites
        this.load.on('filecomplete-image-orb1', () => {
            console.log('[PRELOADER] orb1.png loaded successfully!');
        });
        this.load.on('filecomplete-image-orb2', () => {
            console.log('[PRELOADER] orb2.png loaded successfully!');
        });
        this.load.on('filecomplete-image-orb3', () => {
            console.log('[PRELOADER] orb3.png loaded successfully!');
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