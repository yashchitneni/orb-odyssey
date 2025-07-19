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
            this.scene.start('LobbyScene');
        });

        // Load all assets here
        // Backgrounds
        this.load.image('nebula', 'assets/backgrounds/nebula.png');

        // Sprites
        this.load.image('orb', 'assets/sprites/orb.png');
        this.load.image('crystal', 'assets/sprites/crystal.png');

        // Particles
        this.load.image('particle', 'assets/particles/particle.png');
        
        // Audio
        this.audioManager = new AudioManager(this);
        this.audioManager.preloadAudio();
    }
}