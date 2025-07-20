import { ScaleHelper } from '../../helpers/ScaleHelper.js';
import { GAME_CONSTANTS } from '../../../shared/constants.js';

export default class VFXManager {
    constructor(scene) {
        this.scene = scene;
        this.floatingTexts = [];
        this.orbTrails = {};
        this.playerParticles = {};
    }

    create() {
        // Any initial setup for VFX
    }

    update(time, delta) {
        this.updateFloatingTexts();
        this.updateOrbTrails();
        this.updatePlayerParticles();
    }

    // --- Trail Effects ---
    initializeOrbTrail(orbId) {
        const player = this.scene.gameObjectManager.players[orbId];
        if (!player) return;
        this.orbTrails[orbId] = {
            particles: [],
            lastPosition: { x: player.orb.x, y: player.orb.y },
            timer: 0
        };
    }

    updateOrbTrails() {
        const trailConfig = GAME_CONSTANTS.VISUAL_EFFECTS.PARTICLES.ORB_TRAIL;
        
        Object.keys(this.scene.gameObjectManager.players).forEach(orbId => {
            const player = this.scene.gameObjectManager.players[orbId];
            const trail = this.orbTrails[orbId];
            
            if (player && player.orb && trail) {
                const orb = player.orb;
                const dx = orb.x - trail.lastPosition.x;
                const dy = orb.y - trail.lastPosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 5) {
                    const particle = this.scene.add.circle(orb.x, orb.y, trailConfig.SIZE, this.getLevelColorHex(player.level || 1), 0.6);
                    trail.particles.push(particle);
                    trail.lastPosition = { x: orb.x, y: orb.y };
                    
                    if (trail.particles.length > trailConfig.COUNT) {
                        const oldParticle = trail.particles.shift();
                        if (oldParticle && oldParticle.active) oldParticle.destroy();
                    }
                }
                
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
                trail.particles = trail.particles.filter(p => p !== null);
            }
        });
    }
    
    // --- Player Level Effects ---
    addPlayerParticles(playerId) {
        if (this.playerParticles[playerId]) return;
        
        const player = this.scene.gameObjectManager.players[playerId];
        if (!player || !player.orb) return;
        
        const particles = [];
        const particleCount = player.level >= 4 ? 6 : 4;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.scene.add.circle(player.orb.x, player.orb.y, 3, 0xffffff);
            particle.angle = (i / particleCount) * 360;
            const baseRadius = (player.orb.width * player.orb.scaleX) / 2;
            particle.orbitRadius = baseRadius + 15;
            particles.push(particle);
        }
        
        this.playerParticles[playerId] = particles;
    }

    updatePlayerParticles() {
        Object.keys(this.playerParticles).forEach(playerId => {
            const player = this.scene.gameObjectManager.players[playerId];
            const particles = this.playerParticles[playerId];
            
            if (player && player.orb && particles) {
                particles.forEach((particle) => {
                    if (particle && particle.active) {
                        particle.angle += 2;
                        const radians = Phaser.Math.DegToRad(particle.angle);
                        particle.x = player.orb.x + Math.cos(radians) * particle.orbitRadius;
                        particle.y = player.orb.y + Math.sin(radians) * particle.orbitRadius;
                    }
                });
            }
        });
    }

    removePlayerParticles(playerId) {
        if (this.playerParticles[playerId]) {
            this.playerParticles[playerId].forEach(p => p.destroy());
            delete this.playerParticles[playerId];
        }
    }

    // --- General Effects ---
    updateFloatingTexts() {
        this.floatingTexts = this.floatingTexts.filter(text => {
            if (text.alpha <= 0 || !text.active) {
                text.destroy();
                return false;
            }
            return true;
        });
    }

    createFloatingText(x, y, text, color = '#ffffff', size = '24px') {
        const config = GAME_CONSTANTS.VISUAL_EFFECTS.ANIMATIONS.FLOATING_TEXT;
        const floatingText = this.scene.add.text(x, y, text, {
            fontSize: ScaleHelper.font(size), fill: color, fontWeight: 'bold',
            stroke: '#000000', strokeThickness: ScaleHelper.scale(2)
        }).setOrigin(0.5);
        this.scene.tweens.add({
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
            const particle = this.scene.add.circle(x, y, config.SIZE, color);
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed, y: y + Math.sin(angle) * speed,
                scale: 0, alpha: 0, duration: config.FADE_DURATION,
                onComplete: () => particle.destroy()
            });
        }
    }

    createScreenFlash(color, intensity = 0.6, duration = 150) {
        const flash = this.scene.add.rectangle(ScaleHelper.centerX(), ScaleHelper.centerY(), ScaleHelper.width(), ScaleHelper.height(), color, intensity);
        flash.setDepth(1000);
        this.scene.tweens.add({
            targets: flash, alpha: 0, duration: duration,
            onComplete: () => flash.destroy()
        });
        return flash;
    }

    createShockwave(x, y, intensity) {
        const shockwave = this.scene.add.circle(x, y, ScaleHelper.scale(1), 0xffffff, 0);
        shockwave.setStrokeStyle(ScaleHelper.scale(3), 0xffffff);
        this.scene.tweens.add({
            targets: shockwave, radius: ScaleHelper.scale(100) + (intensity / 10),
            alpha: { from: 0.8, to: 0 }, duration: 500, ease: 'Power2',
            onComplete: () => shockwave.destroy()
        });
        return shockwave;
    }

    // --- Game Event Effects ---
    onCollision(data) {
        const config = GAME_CONSTANTS.VISUAL_EFFECTS.SCREEN_EFFECTS;
        const shakeIntensity = Math.min(data.impactSpeed / 1000, 1) * config.SHAKE.COLLISION_INTENSITY;
        this.scene.cameras.main.shake(config.SHAKE.DURATION, shakeIntensity);
        this.createScreenFlash(config.FLASH.COLLISION_COLOR, config.FLASH.INTENSITY, config.FLASH.DURATION);
        const explosionConfig = GAME_CONSTANTS.VISUAL_EFFECTS.PARTICLES.CRYSTAL_EXPLOSION;
        this.createParticleExplosion(data.position.x, data.position.y, explosionConfig, 0xffffff);
        this.createShockwave(data.position.x, data.position.y, data.impactSpeed);

        if (data.loserId === this.scene.myId && data.droppedCrystalIds && data.droppedCrystalIds.length > 0) {
            const player = this.scene.gameObjectManager.players[data.loserId];
            if (player && player.orb) {
                this.createFloatingText(player.orb.x, player.orb.y - ScaleHelper.scale(40), `-${data.droppedCrystalIds.length} crystals!`, GAME_CONSTANTS.UI.COLORS.DANGER);
            }
        }
    }

    onLevelUp(playerId, newLevel) {
        const player = this.scene.gameObjectManager.players[playerId];
        if (!player || !player.orb) return;
        
        const config = GAME_CONSTANTS.VISUAL_EFFECTS;
        
        if (playerId === this.scene.myId) {
            this.scene.cameras.main.shake(config.SCREEN_EFFECTS.SHAKE.DURATION, config.SCREEN_EFFECTS.SHAKE.LEVEL_UP_INTENSITY);
            this.createScreenFlash(config.SCREEN_EFFECTS.FLASH.LEVEL_UP_COLOR, config.SCREEN_EFFECTS.FLASH.INTENSITY);
            this.createFloatingText(player.orb.x, player.orb.y - ScaleHelper.scale(50), `Level ${newLevel}!`, this.getLevelColor(newLevel));
        }
        
        const levelUpConfig = config.PARTICLES.LEVEL_UP;
        const levelColor = this.getLevelColorHex(newLevel);
        this.createParticleExplosion(player.orb.x, player.orb.y, levelUpConfig, levelColor);
        this.createFloatingText(player.orb.x, player.orb.y - ScaleHelper.scale(50), 'LEVEL UP!', this.getLevelColor(newLevel), '32px');
        this.createLevelUpRing(player.orb.x, player.orb.y, levelColor);
    }

    createLevelUpRing(x, y, color) {
        const ring = this.scene.add.circle(x, y, ScaleHelper.scale(20), color, 0);
        ring.setStrokeStyle(ScaleHelper.scale(4), color);
        this.scene.tweens.add({
            targets: ring, radius: ScaleHelper.scale(120), alpha: { from: 1, to: 0 },
            duration: 1000, ease: 'Power2', onComplete: () => ring.destroy()
        });
        return ring;
    }
    
    onCrystalRespawn(crystalData) {
        const config = GAME_CONSTANTS.VISUAL_EFFECTS.ANIMATIONS.CRYSTAL_RESPAWN;
        const color = crystalData.isPowerCrystal ? 0xff00ff : 0x00ffff;
        
        this.createParticleExplosion(crystalData.x, crystalData.y, {
            COUNT: config.PARTICLES, SIZE: 2, SPEED: 60, FADE_DURATION: config.DURATION
        }, color);
        
        const ring = this.scene.add.circle(crystalData.x, crystalData.y, 1, color, 0);
        ring.setStrokeStyle(2, color);
        this.scene.tweens.add({
            targets: ring, radius: 40, alpha: { from: 0.8, to: 0 },
            duration: config.DURATION, ease: 'Power2', onComplete: () => ring.destroy()
        });
    }

    onAbilityUsed(data) {
        switch (data.ability) {
            case 'burst':
                this.createAdvancedBurstEffect(data);
                break;
            case 'wall':
                this.createAdvancedWallEffect(data);
                break;
        }
    }

    createAdvancedBurstEffect(data) {
        const config = GAME_CONSTANTS.VISUAL_EFFECTS;
        if (data.playerId === this.scene.myId) {
            this.scene.cameras.main.shake(config.SCREEN_EFFECTS.SHAKE.DURATION, config.SCREEN_EFFECTS.SHAKE.ABILITY_INTENSITY);
            this.createScreenFlash(config.SCREEN_EFFECTS.FLASH.ABILITY_COLOR, config.SCREEN_EFFECTS.FLASH.INTENSITY);
        }
        for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(i * 100, () => {
                const wave = this.scene.add.circle(data.position.x, data.position.y, 1, 0xffff00, 0);
                wave.setStrokeStyle(3 - i, 0xffff00);
                this.scene.tweens.add({
                    targets: wave, radius: GAME_CONSTANTS.ABILITIES.BURST.RADIUS + (i * 20),
                    alpha: { from: 0.8 - (i * 0.2), to: 0 }, duration: 600 + (i * 100),
                    ease: 'Power2', onComplete: () => wave.destroy()
                });
            });
        }
        const burstConfig = config.PARTICLES.ABILITY_BURST;
        this.createParticleExplosion(data.position.x, data.position.y, burstConfig, 0xffff00);
    }
    
    createAdvancedWallEffect(data) {
        const buildup = this.scene.add.circle(data.position.x, data.position.y, 5, 0x00ffff, 0.8);
        this.scene.tweens.add({
            targets: buildup, scaleX: 3, scaleY: 3, alpha: 0, duration: 200,
            onComplete: () => buildup.destroy()
        });
        this.createWallParticleStream(data);
    }
    
    createWallParticleStream(data) {
        const wallLength = GAME_CONSTANTS.ABILITIES.WALL.WALL_LENGTH;
        for (let i = 0; i < 10; i++) {
            const offset = (i / 10 - 0.5) * wallLength;
            const particleX = data.position.x + Math.cos(data.angle) * offset;
            const particleY = data.position.y + Math.sin(data.angle) * offset;
            const particle = this.scene.add.circle(particleX, particleY, 3, 0x00ffff);
            this.scene.tweens.add({
                targets: particle, alpha: 0, scaleX: 2, scaleY: 2, duration: 1000,
                onComplete: () => particle.destroy()
            });
        }
    }

    onOrbCollected(data) {
        if (data.position) {
            const config = GAME_CONSTANTS.VISUAL_EFFECTS.PARTICLES.CRYSTAL_EXPLOSION;
            this.createParticleExplosion(data.position.x, data.position.y, config, 0xffff00);
        }
    }

    onCrystalCollected(data) {
        if (data.position) {
            const config = GAME_CONSTANTS.VISUAL_EFFECTS.PARTICLES.CRYSTAL_EXPLOSION;
            const color = data.isPowerCrystal ? 0xff00ff : 0x00ffff;
            const particleCount = data.isPowerCrystal ? config.COUNT * 2 : config.COUNT;
            this.createParticleExplosion(data.position.x, data.position.y, { ...config, COUNT: particleCount }, color);
            if (data.isPowerCrystal) {
                this.createFloatingText(data.position.x, data.position.y - ScaleHelper.scale(20), `+${GAME_CONSTANTS.POINTS_PER_POWER_CRYSTAL}`, GAME_CONSTANTS.UI.COLORS.DANGER, '20px');
            }
        }
    }
    
    getLevelColor(level) {
        const colors = [GAME_CONSTANTS.UI.COLORS.SUCCESS, GAME_CONSTANTS.UI.COLORS.PRIMARY, GAME_CONSTANTS.UI.COLORS.WARNING, GAME_CONSTANTS.UI.COLORS.DANGER];
        return colors[level - 1] || colors[3];
    }

    getLevelColorHex(level) {
        const colors = [0x00ff00, 0x00ffff, 0xffff00, 0xff00ff];
        return colors[level - 1] || colors[3];
    }

    destroy() {
        this.floatingTexts.forEach(t => t.destroy());
        Object.values(this.orbTrails).forEach(trail => trail.particles.forEach(p => p.destroy()));
        Object.values(this.playerParticles).forEach(particles => particles.forEach(p => p.destroy()));
    }
}