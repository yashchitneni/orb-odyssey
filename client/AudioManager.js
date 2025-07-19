class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.masterVolume = 1.0;
        this.musicVolume = 0.7;
        this.sfxVolume = 0.8;
        this.muted = false;
        this.currentMusic = null;
        this.sounds = {};
    }

    preloadAudio() {
        console.log('Preloading audio assets...');
        // NOTE: The audio files listed in constants.js do not exist in the project yet.
        // This will cause 404 errors in the browser console, but it won't crash the game.
        
        // // Load Music
        // for (const musicKey in GAME_CONSTANTS.AUDIO.MUSIC) {
        //     const music = GAME_CONSTANTS.AUDIO.MUSIC[musicKey];
        //     if (music.URL) {
        //         this.scene.load.audio(music.KEY, music.URL);
        //     }
        // }

        // // Load SFX
        // for (const sfxKey in GAME_CONSTANTS.AUDIO.SFX) {
        //     const sfx = GAME_CONSTANTS.AUDIO.SFX[sfxKey];
        //     if (sfx.URL) {
        //         this.scene.load.audio(sfx.KEY, sfx.URL);
        //     }
        // }
    }

    playMusic(key, config = {}) {
        if (this.muted) return;

        const musicConfig = GAME_CONSTANTS.AUDIO.MUSIC[key];
        if (!musicConfig) {
            console.warn(`Music key not found in constants: ${key}`);
            return;
        }

        if (!this.scene.cache.audio.has(musicConfig.KEY)) {
            console.warn(`Music asset not loaded: ${musicConfig.KEY}`);
            return;
        }

        if (this.currentMusic && this.currentMusic.key === musicConfig.KEY && this.currentMusic.isPlaying) {
            return; // Already playing this track
        }
        
        if (this.currentMusic && this.currentMusic.isPlaying) {
            this.stopMusic();
        }

        const volume = (config.volume || musicConfig.VOLUME || 1) * this.musicVolume * this.masterVolume;
        this.currentMusic = this.scene.sound.add(musicConfig.KEY, {
            volume: volume,
            loop: config.loop !== undefined ? config.loop : musicConfig.LOOP
        });

        this.currentMusic.play();

        const fadeInDuration = config.fadeIn || musicConfig.FADE_IN || 0;
        if (fadeInDuration > 0) {
            this.currentMusic.setVolume(0);
            this.scene.tweens.add({
                targets: this.currentMusic,
                volume: { from: 0, to: volume },
                duration: fadeInDuration,
                ease: 'Linear'
            });
        }
    }

    stopMusic(fadeOutDuration) {
        if (this.currentMusic && this.currentMusic.isPlaying) {
            const duration = fadeOutDuration !== undefined ? fadeOutDuration : GAME_CONSTANTS.AUDIO.FADE_DURATION;
            this.scene.tweens.add({
                targets: this.currentMusic,
                volume: 0,
                duration: duration,
                onComplete: () => {
                    if (this.currentMusic) {
                        this.currentMusic.stop();
                        this.currentMusic.destroy();
                        this.currentMusic = null;
                    }
                }
            });
        }
    }

    playSound(key, config = {}) {
        if (this.muted) return;

        const sfxConfig = GAME_CONSTANTS.AUDIO.SFX[key];
        if (!sfxConfig) {
            console.warn(`SFX key not found in constants: ${key}`);
            return;
        }
        
        if (!this.scene.cache.audio.has(sfxConfig.KEY)) {
            console.warn(`SFX asset not loaded: ${sfxConfig.KEY}`);
            return;
        }

        const sound = this.scene.sound.add(sfxConfig.KEY, {
            volume: (config.volume || sfxConfig.VOLUME || 1) * this.sfxVolume * this.masterVolume,
            loop: config.loop || sfxConfig.LOOP || false
        });
        sound.play();
        return sound;
    }

    playUISound(type) {
        const keyMap = {
            'hover': 'UI_HOVER',
            'click': 'UI_CLICK',
            'notification': 'NOTIFICATION'
        };
        const key = keyMap[type];
        if (key) {
            this.playSound(key);
        } else {
            console.warn(`Unknown UI sound type: ${type}`);
        }
    }

    // Music methods
    playLobbyMusic() {
        this.playMusic('LOBBY');
    }

    playGameplayMusic() {
        this.playMusic('GAMEPLAY');
    }

    stopGameplayMusic() {
        if (this.currentMusic && this.currentMusic.key === GAME_CONSTANTS.AUDIO.MUSIC.GAMEPLAY.KEY) {
            this.stopMusic();
        }
    }

    // Sound effect methods
    playCrystalCollectionSound(isPowerCrystal = false) {
        const key = isPowerCrystal ? 'POWER_CRYSTAL_COLLECT' : 'CRYSTAL_COLLECT';
        this.playSound(key);
    }

    playCollisionSound(impactSpeed) {
        let key = 'COLLISION_LIGHT';
        const speedThreshold = GAME_CONSTANTS.COLLISION.SOUND_SPEED_THRESHOLD || 500;
        if (impactSpeed > speedThreshold * 0.66) {
            key = 'COLLISION_HEAVY';
        } else if (impactSpeed > speedThreshold * 0.33) {
            key = 'COLLISION_MEDIUM';
        }
        
        const volume = Phaser.Math.Clamp(
            (impactSpeed / speedThreshold),
            GAME_CONSTANTS.COLLISION.SOUND_VOLUME_MIN,
            GAME_CONSTANTS.COLLISION.SOUND_VOLUME_MAX
        );
        this.playSound(key, { volume });
    }

    playAbilitySound(abilityType) {
        const key = `ABILITY_${abilityType.toUpperCase()}`;
        this.playSound(key);
    }

    playLevelUpSound() {
        this.playSound('LEVEL_UP');
    }

    playGameStartSound() {
        this.playSound('GAME_START');
    }

    // Volume control methods
    setMasterVolume(volume) {
        this.masterVolume = Phaser.Math.Clamp(volume, 0, 1);
        this.updateAllVolumes();
    }

    setMusicVolume(volume) {
        this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
        if (this.currentMusic && this.currentMusic.isPlaying) {
            const musicKey = Object.keys(GAME_CONSTANTS.AUDIO.MUSIC).find(k => GAME_CONSTANTS.AUDIO.MUSIC[k].KEY === this.currentMusic.key);
            if (musicKey) {
                const musicConfig = GAME_CONSTANTS.AUDIO.MUSIC[musicKey];
                this.currentMusic.setVolume((musicConfig.VOLUME || 1) * this.musicVolume * this.masterVolume);
            }
        }
    }

    setSfxVolume(volume) {
        this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
    }

    toggleMute() {
        this.muted = !this.muted;
        this.scene.sound.mute = this.muted;
        return this.muted;
    }

    updateAllVolumes() {
        this.setMusicVolume(this.musicVolume);
    }

    getMasterVolume() {
        return this.masterVolume;
    }

    getMusicVolume() {
        return this.musicVolume;
    }

    getSfxVolume() {
        return this.sfxVolume;
    }

    isMuted() {
        return this.muted;
    }
    
    destroy() {
        if (this.scene && this.scene.sound) {
            this.scene.sound.stopAll();
        }
        this.currentMusic = null;
    }
}