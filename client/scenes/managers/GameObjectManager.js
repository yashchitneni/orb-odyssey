import { ScaleHelper } from '../../helpers/ScaleHelper.js';
import { GAME_CONSTANTS } from '../../../shared/constants.js';

export default class GameObjectManager {
    constructor(scene) {
        this.scene = scene;
        this.players = {};
        this.orbs = {};
        this.crystals = {};
        this.walls = {};
    }

    // --- Player Management ---
    addPlayer(playerId, playerData) {
        if (this.players[playerId]) return;

        const orb = this.scene.add.sprite(playerData.x, playerData.y, 'orb');
        orb.setTint(playerData.color || 0x00ff00);
        orb.setOrigin(0.5);

        const nameText = this.scene.add.text(playerData.x, playerData.y - ScaleHelper.scale(30), playerData.name || `Player ${playerId.substr(-4)}`, {
            fontSize: ScaleHelper.font('12px'),
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: ScaleHelper.scale(2)
        }).setOrigin(0.5);

        let youText = null;
        if (playerId === this.scene.myId) {
            youText = this.scene.add.text(playerData.x, playerData.y - 45, 'YOU', {
                fontSize: '14px', fill: '#ffff00', stroke: '#000000',
                strokeThickness: 3, fontWeight: 'bold'
            }).setOrigin(0.5);
            orb.setScale(1.1);
            this.scene.tweens.add({
                targets: orb, alpha: 0.7, duration: 500,
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        }
        
        this.players[playerId] = {
            orb, nameText, youText,
            id: playerId,
            name: playerData.name || `Player ${playerId.substr(-4)}`,
            crystalsCollected: playerData.crystalsCollected || 0,
            level: playerData.level || 1,
            ...playerData
        };

        this.updatePlayerLevel(playerId, playerData.level);
        this.scene.events.emit('playerAdded', { playerId, playerData });
    }

    updatePlayer(playerId, playerData) {
        const player = this.players[playerId];
        if (!player || !player.orb) return;

        player.orb.x = playerData.x;
        player.orb.y = playerData.y;
        
        if (player.nameText) {
            player.nameText.x = player.orb.x;
            player.nameText.y = player.orb.y - 30;
        }
        if (player.youText) {
            player.youText.x = player.orb.x;
            player.youText.y = player.orb.y - 45;
        }
        
        if (playerData.level !== undefined && player.level !== playerData.level) {
            this.updatePlayerLevel(playerId, playerData.level);
        }
        
        if (playerData.crystalsCollected !== undefined) {
            this.updatePlayerCrystals(playerId, playerData.crystalsCollected);
        }

        // Update all properties
        Object.assign(this.players[playerId], playerData);
    }

    removePlayer(playerId) {
        if (this.players[playerId]) {
            const player = this.players[playerId];
            if (player.orb) player.orb.destroy();
            if (player.nameText) player.nameText.destroy();
            if (player.youText) player.youText.destroy();
            delete this.players[playerId];
            this.scene.events.emit('playerRemoved', playerId);
        }
    }

    updatePlayerCrystals(playerId, crystals) {
        const player = this.players[playerId];
        if (player) {
            player.crystalsCollected = crystals;
        }
        if (playerId === this.scene.myId) {
            this.scene.events.emit('myCrystalsUpdated', { crystals, level: player.level });
        }
    }

    updatePlayerLevel(playerId, level) {
        const player = this.players[playerId];
        if (player && player.orb) {
            player.level = level;
            const levelConfig = GAME_CONSTANTS.LEVELS;
            const sizeMultiplier = levelConfig.SIZE_MULTIPLIERS[level - 1] || 1;
            
            this.scene.tweens.add({
                targets: player.orb,
                scale: sizeMultiplier,
                duration: GAME_CONSTANTS.VISUAL_EFFECTS.ANIMATIONS.ORB_SIZE_TRANSITION.DURATION,
                ease: GAME_CONSTANTS.VISUAL_EFFECTS.ANIMATIONS.ORB_SIZE_TRANSITION.EASE
            });

            if (level >= 3) {
                this.scene.events.emit('playerLevelHighEnoughForParticles', playerId);
            }
        }
    }

    // --- Orb Management ---
    addOrb(orbId, orbData) {
        if (this.orbs[orbId]) return;
        const orb = this.scene.add.sprite(orbData.x, orbData.y, 'orb');
        orb.setTint(0xffff00).setScale(0.4).setOrigin(0.5);
        this.scene.tweens.add({
            targets: orb, scaleX: 0.45, scaleY: 0.45, duration: 1000,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
        this.orbs[orbId] = orb;
    }

    removeOrb(orbId) {
        if (this.orbs[orbId]) {
            this.orbs[orbId].destroy();
            delete this.orbs[orbId];
        }
    }

    // --- Crystal Management ---
    addCrystal(crystalId, crystalData) {
        if (this.crystals[crystalId]) return;
        const color = crystalData.isPowerCrystal ? 0xff00ff : 0x00ffff;
        const crystal = this.scene.add.sprite(crystalData.x, crystalData.y, 'crystal');
        crystal.setTint(color).setOrigin(0.5);
        const scale = crystalData.isPowerCrystal ? 0.4 : 0.3;
        crystal.setScale(scale);
        this.scene.tweens.add({
            targets: crystal, scale: crystal.scale * 1.05, alpha: 0.7,
            duration: crystalData.isPowerCrystal ? 800 : 1200,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
        if (crystalData.isPowerCrystal) {
            this.scene.tweens.add({
                targets: crystal, rotation: Math.PI * 2, duration: 2000,
                repeat: -1, ease: 'Linear'
            });
        }
        this.crystals[crystalId] = crystal;
    }

    removeCrystal(crystalId) {
        if (this.crystals[crystalId]) {
            this.crystals[crystalId].destroy();
            delete this.crystals[crystalId];
        }
    }

    // --- Wall Management ---
    addWall(data) {
        if (this.walls[data.wallId]) return;
        const wallLength = GAME_CONSTANTS.ABILITIES.WALL.WALL_LENGTH;
        const wallWidth = 20;
        const wall = this.scene.add.rectangle(data.position.x, data.position.y, wallLength, wallWidth, 0x00ffff, 0.7);
        wall.setRotation(data.angle).setStrokeStyle(2, 0x00aaaa);
        const aura = this.scene.add.rectangle(data.position.x, data.position.y, wallLength + 10, wallWidth + 10, 0x00ffff, 0.2);
        aura.setRotation(data.angle);
        this.walls[data.wallId] = { wall, aura };
        this.scene.time.delayedCall(GAME_CONSTANTS.ABILITIES.WALL.DURATION, () => this.removeWall(data.wallId));
    }

    removeWall(wallId) {
        if (this.walls[wallId]) {
            if (this.walls[wallId].wall) this.walls[wallId].wall.destroy();
            if (this.walls[wallId].aura) this.walls[wallId].aura.destroy();
            delete this.walls[wallId];
        }
    }

    destroy() {
        Object.values(this.players).forEach(p => {
            if (p.orb) p.orb.destroy();
            if (p.nameText) p.nameText.destroy();
            if (p.youText) p.youText.destroy();
        });
        Object.values(this.orbs).forEach(o => o.destroy());
        Object.values(this.crystals).forEach(c => c.destroy());
        Object.values(this.walls).forEach(w => {
            if (w.wall) w.wall.destroy();
            if (w.aura) w.aura.destroy();
        });
        this.players = {};
        this.orbs = {};
        this.crystals = {};
        this.walls = {};
    }
}