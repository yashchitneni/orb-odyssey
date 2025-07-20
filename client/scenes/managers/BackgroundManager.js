import { ScaleHelper } from '../../helpers/ScaleHelper.js';
import { GAME_CONSTANTS } from '../../../shared/constants.js';

export default class BackgroundManager {
    constructor(scene) {
        this.scene = scene;
        this.backgroundStars = [];
        this.ambientParticles = [];
        this.nebulaAnimationTime = 0;
    }

    create() {
        this.createEnhancedBackground();
    }

    update(time, delta) {
        const deltaTime = delta / 1000;
        this.nebulaAnimationTime += deltaTime;
        this.updateBackgroundStars(deltaTime);
        this.updateAmbientParticles(deltaTime);
    }

    createEnhancedBackground() {
        this.createGradientBackground();
        
        if (this.scene.cache.video.exists('nebulaVideo')) {
            try {
                this.nebulaVideo = this.scene.add.video(ScaleHelper.centerX(), ScaleHelper.centerY(), 'nebulaVideo');
                this.nebulaVideo.setDepth(-10);
                this.nebulaVideo.setVolume(0);
                this.nebulaVideo.setAlpha(0.6);
                
                const videoElement = this.nebulaVideo.video;

                const scaleVideo = () => {
                    if (!videoElement || videoElement.videoWidth === 0) return;
                    const scaleX = ScaleHelper.width() / videoElement.videoWidth;
                    const scaleY = ScaleHelper.height() / videoElement.videoHeight;
                    const scale = Math.max(scaleX, scaleY);
                    this.nebulaVideo.setScale(scale);
                };

                if (videoElement && videoElement.readyState >= videoElement.HAVE_METADATA) {
                    scaleVideo();
                } else if (videoElement) {
                    videoElement.addEventListener('loadedmetadata', scaleVideo, { once: true });
                }

                try {
                    this.nebulaVideo.play(true);
                } catch (error) {
                    console.error('[VIDEO] Could not play video automatically:', error);
                    this.showPlayButton();
                }

            } catch (error) {
                console.error('[VIDEO] Error creating video object:', error);
            }
        }
        
        this.createAnimatedStarfield();
        this.createNebulaParticles();
    }

    createGradientBackground() {
        const bg = this.scene.add.graphics();
        bg.fillGradientStyle(0x110033, 0x220044, 0x000022, 0x330055);
        bg.fillRect(0, 0, ScaleHelper.width(), ScaleHelper.height());
    }

    showPlayButton() {
        const playButton = this.scene.add.text(ScaleHelper.centerX(), ScaleHelper.centerY(), '▶ Click to Play Background', {
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

    createAnimatedStarfield() {
        const starConfig = GAME_CONSTANTS.VISUAL_EFFECTS.ENVIRONMENT.STARS;
        for (let i = 0; i < starConfig.COUNT; i++) {
            const star = this.scene.add.circle(
                Phaser.Math.Between(0, ScaleHelper.width()), Phaser.Math.Between(0, ScaleHelper.height()),
                Phaser.Math.FloatBetween(starConfig.MIN_SIZE, starConfig.MAX_SIZE),
                0xffffff, Phaser.Math.FloatBetween(0.3, 1.0)
            );
            this.scene.tweens.add({
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
            const particle = this.scene.add.circle(
                Phaser.Math.Between(0, ScaleHelper.width()), Phaser.Math.Between(0, ScaleHelper.height()),
                Phaser.Math.Between(nebulaConfig.MIN_SIZE, nebulaConfig.MAX_SIZE),
                Phaser.Utils.Array.GetRandom(nebulaConfig.COLORS),
                Phaser.Math.FloatBetween(0.1, 0.4)
            );
            particle.velocity = {
                x: Phaser.Math.Between(-nebulaConfig.MAX_SPEED, nebulaConfig.MAX_SPEED),
                y: Phaser.Math.Between(-nebulaConfig.MAX_SPEED, nebulaConfig.MAX_SPEED)
            };
            this.scene.tweens.add({
                targets: particle, alpha: particle.alpha + 0.2, scaleX: 1.3, scaleY: 1.3,
                duration: nebulaConfig.FADE_DURATION, yoyo: true, repeat: -1,
                ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 2000)
            });
            this.ambientParticles.push(particle);
        }
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

    destroy() {
        if (this.nebulaVideo) {
            this.nebulaVideo.stop();
            this.nebulaVideo.destroy();
        }
    }
}