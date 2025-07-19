const GAME_CONSTANTS = {
    WORLD_WIDTH: 800,
    WORLD_HEIGHT: 600,
    PLAYER_RADIUS: 20,
    ORB_RADIUS: 10,
    PLAYER_SPEED: 200,
    GAME_DURATION: 120,
    ORB_COUNT: 20,
    ORB_SPAWN_DELAY: 1000,
    POINTS_PER_ORB: 10,
    SERVER_UPDATE_RATE: 50,
    PORT: 3000,
    
    // Physics constants
    PLAYER_ACCELERATION: 400,
    PLAYER_DRAG: 0.97,
    ACCELERATION_TIME: 0.5,
    BOUNCE_DAMPING: 0.7,
    MIN_VELOCITY: 5,
    
    // Visual constants
    TRAIL_LENGTH: 10,
    TRAIL_FADE_RATE: 0.95,
    ROTATION_SPEED: 0.1,
    
    // Control constants
    TOUCH_SENSITIVITY: 1.5,
    MOUSE_DRAG_THRESHOLD: 10,
    VIRTUAL_JOYSTICK_SIZE: 120,
    VIRTUAL_JOYSTICK_DEAD_ZONE: 0.15,
    
    // Crystal constants
    CRYSTAL_COUNT_MIN: 10,
    CRYSTAL_COUNT_MAX: 15,
    CRYSTAL_RADIUS: 8,
    CRYSTAL_RESPAWN_MIN: 5000, // 5 seconds
    CRYSTAL_RESPAWN_MAX: 15000, // 15 seconds
    POINTS_PER_CRYSTAL: 10,
    POINTS_PER_POWER_CRYSTAL: 50, // 5x regular crystal value
    POWER_CRYSTAL_CHANCE: 0.05, // 5% chance
    CRYSTAL_GLOW_RADIUS: 1.5, // Multiplier for glow effect
    CRYSTAL_PULSE_SCALE: 1.3, // Max scale for pulsing animation
    CRYSTAL_PULSE_DURATION: 800, // Duration of pulse animation
    
    // Level system constants
    LEVELS: {
        THRESHOLDS: [0, 20, 50, 80, 100], // Index represents level-1
        BASE_SIZE: 20,
        SIZE_MULTIPLIERS: [1, 1.5, 2, 2.5], // Index represents level-1
        SPEED_MULTIPLIERS: [1, 1.2, 1.3, 1.4], // Index represents level-1
        GLOW_MULTIPLIERS: [1, 1.3, 1.6, 2] // Index represents level-1
    },
    
    // Ability constants
    ABILITIES: {
        BURST: {
            UNLOCK_LEVEL: 3,
            COOLDOWN: 10000, // 10 seconds
            DURATION: 500,
            RADIUS: 200, // Radius of energy wave
            FORCE_BASE: 300, // Base push force
            FORCE_SCALE: 1.2, // Force multiplier per level
            CRYSTAL_DROP_MIN: 5,
            CRYSTAL_DROP_MAX: 10,
            ENERGY_COST: 30
        },
        WALL: {
            UNLOCK_LEVEL: 4,
            COOLDOWN: 15000, // 15 seconds
            DURATION: 5000, // 5 seconds
            WALL_LENGTH: 100,
            WALL_WIDTH: 20,
            MAX_WALLS: 2,
            ENERGY_COST: 50
        }
    },
    
    // Energy system constants
    ENERGY: {
        MAX: 100,
        REGEN_RATE: 5, // Energy per second
        REGEN_DELAY: 2000 // Delay after using ability before regen starts
    },
    
    // Nebula Core constants
    NEBULA_CORE: {
        UNLOCK_LEVEL: 4,
        X: 400, // Center of arena
        Y: 300,
        RADIUS: 100,
        CRYSTAL_SPAWN_MULTIPLIER: 2,
        CONTROL_TIME: 30000 // 30 seconds to win by control
    },
    
    // Win condition constants
    WIN_CONDITIONS: {
        CRYSTAL_TARGET: 100, // Primary win condition
        GAME_DURATION: 600000, // 10 minutes in milliseconds
        WARMUP_DURATION: 10000 // 10 seconds warmup
    },
    
    // Win types for end screen
    WIN_TYPES: {
        CRYSTALS: 'crystals',
        NEBULA_CONTROL: 'nebula_control',
        TIME_LIMIT: 'time_limit'
    },
    
    // Collision constants
    COLLISION: {
        ELASTICITY: 0.8, // Energy retained after collision
        FORCE_MULTIPLIER: 2.5, // Base collision force multiplier
        SIZE_ADVANTAGE: 1.5, // Additional force multiplier for larger orb
        CRYSTAL_DROP_COUNT: 5, // Crystals dropped on collision
        CRYSTAL_SCATTER_RADIUS: 50, // Radius for dropped crystal scatter
        IMMUNITY_DURATION: 1000, // Milliseconds of collision immunity
        MIN_COLLISION_SPEED: 50, // Minimum relative speed for collision
        SCREEN_SHAKE_INTENSITY: 10, // Pixels of screen shake
        SCREEN_SHAKE_DURATION: 300, // Duration of screen shake
        IMPACT_PARTICLE_COUNT: 15, // Number of particles on impact
        FLASH_DURATION: 200, // Duration of collision flash effect
        SOUND_VOLUME_MIN: 0.3, // Minimum collision sound volume
        SOUND_VOLUME_MAX: 1.0, // Maximum collision sound volume
        SOUND_SPEED_THRESHOLD: 500 // Speed for max volume
    },
    
    // Visual effects constants
    VISUAL_EFFECTS: {
        PARTICLES: {
            AMBIENT_NEBULA: {
                COUNT: 50,
                MIN_SIZE: 1,
                MAX_SIZE: 4,
                MIN_SPEED: 10,
                MAX_SPEED: 30,
                COLORS: [0x4400ff, 0x6600ff, 0x8800ff, 0xaa00ff],
                FADE_DURATION: 3000
            },
            ORB_TRAIL: {
                COUNT: 8,
                SIZE: 3,
                FADE_RATE: 0.92,
                SPAWN_RATE: 100
            },
            CRYSTAL_EXPLOSION: {
                COUNT: 15,
                SIZE: 2,
                SPEED: 120,
                FADE_DURATION: 800
            },
            ABILITY_BURST: {
                COUNT: 25,
                SIZE: 5,
                SPEED: 200,
                FADE_DURATION: 600
            },
            LEVEL_UP: {
                COUNT: 30,
                SIZE: 4,
                SPEED: 150,
                FADE_DURATION: 1200
            }
        },
        LIGHTING: {
            ORB_GLOW: {
                INTENSITY: 0.4,
                RADIUS_MULTIPLIER: 2.5,
                PULSE_SPEED: 1.5
            },
            CRYSTAL_GLOW: {
                INTENSITY: 0.5,
                RADIUS_MULTIPLIER: 3.0,
                PULSE_SPEED: 2.0
            },
            NEBULA_CORE_GLOW: {
                INTENSITY: 0.3,
                RADIUS_MULTIPLIER: 1.8,
                PULSE_SPEED: 0.8
            },
            PLAYER_GLOW: {
                INTENSITY: 0.35,
                RADIUS_MULTIPLIER: 1.4,
                PULSE_SPEED: 1.2
            }
        },
        ANIMATIONS: {
            CRYSTAL_RESPAWN: {
                DURATION: 800,
                SCALE_FROM: 0,
                SCALE_TO: 1.2,
                PARTICLES: 12
            },
            ORB_SIZE_TRANSITION: {
                DURATION: 500,
                EASE: 'Back.easeOut'
            },
            FLOATING_TEXT: {
                DURATION: 1500,
                RISE_DISTANCE: 60,
                FADE_DELAY: 500
            },
            VICTORY_CELEBRATION: {
                PARTICLE_COUNT: 50,
                DURATION: 3000,
                FIREWORK_COUNT: 8
            }
        },
        SCREEN_EFFECTS: {
            SHAKE: {
                COLLISION_INTENSITY: 0.02,
                ABILITY_INTENSITY: 0.015,
                LEVEL_UP_INTENSITY: 0.01,
                DURATION: 300
            },
            FLASH: {
                COLLISION_COLOR: 0xffffff,
                ABILITY_COLOR: 0xffff00,
                LEVEL_UP_COLOR: 0x00ff00,
                INTENSITY: 0.6,
                DURATION: 150
            }
        },
        ENVIRONMENT: {
            STARS: {
                COUNT: 150,
                MIN_SIZE: 0.5,
                MAX_SIZE: 2.5,
                TWINKLE_SPEED: 2000,
                MOVEMENT_SPEED: 5
            },
            NEBULA_MOVEMENT: {
                SPEED: 0.3,
                WAVE_AMPLITUDE: 2,
                WAVE_FREQUENCY: 0.001
            }
        }
    },
    
    // UI styling constants
    UI: {
        COLORS: {
            PRIMARY: '#00ffff',
            SECONDARY: '#ff00ff',
            SUCCESS: '#00ff00',
            WARNING: '#ffff00',
            DANGER: '#ff0000',
            WHITE: '#ffffff',
            BLACK: '#000000',
            DARK_BG: '#1a1a1a',
            PANEL_BG: '#2a2a2a',
            GLOW: '#88ddff'
        },
        FONTS: {
            TITLE: { fontSize: '48px', fontFamily: 'Arial Black' },
            SUBTITLE: { fontSize: '24px', fontFamily: 'Arial' },
            BODY: { fontSize: '18px', fontFamily: 'Arial' },
            SMALL: { fontSize: '14px', fontFamily: 'Arial' },
            HUD: { fontSize: '20px', fontFamily: 'Arial', fontWeight: 'bold' }
        },
        GRADIENTS: {
            HEALTH_FULL: [0x00ff00, 0x88ff00],
            HEALTH_MID: [0xffff00, 0xff8800],
            HEALTH_LOW: [0xff8800, 0xff0000],
            ENERGY: [0x00ffff, 0x0088ff],
            XP: [0x8800ff, 0xff00ff]
        },
        PANELS: {
            PADDING: 16,
            BORDER_RADIUS: 8,
            BORDER_WIDTH: 2,
            SHADOW_OFFSET: 4
        },
        ANIMATIONS: {
            FADE_DURATION: 300,
            SLIDE_DURATION: 400,
            PULSE_DURATION: 1000,
            GLOW_DURATION: 2000
        },
        MOBILE: {
            SCALE_FACTOR: 0.8,
            MIN_TOUCH_SIZE: 44,
            SAFE_AREA_PADDING: 20
        }
    },
    
    // Performance monitoring constants
    PERFORMANCE: {
        FPS_TARGET: 60,
        FPS_WARNING_THRESHOLD: 30,
        FPS_CRITICAL_THRESHOLD: 15,
        MEMORY_WARNING_MB: 100,
        MEMORY_CRITICAL_MB: 200,
        NETWORK_LATENCY_WARNING: 150,
        NETWORK_LATENCY_CRITICAL: 300,
        UPDATE_RATE_ADAPTIVE: {
            HIGH_PERF: 16.67, // 60 FPS
            MEDIUM_PERF: 33.33, // 30 FPS
            LOW_PERF: 50 // 20 FPS
        },
        OBJECT_POOL_SIZES: {
            PARTICLES: 1000,
            TRAILS: 500,
            FLOATING_TEXT: 100,
            SOUND_INSTANCES: 50
        },
        CLIENT_PREDICTION: {
            ENABLED: true,
            RECONCILIATION_THRESHOLD: 10, // pixels
            INTERPOLATION_BUFFER: 100 // ms
        },
        DELTA_COMPRESSION: {
            POSITION_THRESHOLD: 2, // pixels
            VELOCITY_THRESHOLD: 5, // units/s
            ANGLE_THRESHOLD: 0.1 // radians
        }
    },
    
    // Audio system constants
    AUDIO: {
        VOLUMES: {
            MASTER: 1.0,
            MUSIC: 0.7,
            SFX: 0.8
        },
        FADE_DURATION: 1000,
        CROSSFADE_DURATION: 2000,
        PRELOAD_TIMEOUT: 10000,
        MUSIC: {
            LOBBY: {
                KEY: 'lobbyMusic',
                URL: 'assets/audio/music/ambient-space-lobby.ogg',
                VOLUME: 0.6,
                LOOP: true,
                FADE_IN: 2000
            },
            GAMEPLAY: {
                KEY: 'gameplayMusic',
                URL: 'assets/audio/music/dynamic-gameplay.ogg',
                VOLUME: 0.5,
                LOOP: true,
                FADE_IN: 1500,
                ADAPTIVE_LAYERS: {
                    BASE: 'gameplayMusicBase',
                    INTENSITY: 'gameplayMusicIntense',
                    VICTORY: 'gameplayMusicVictory'
                }
            },
            VICTORY: {
                KEY: 'victoryMusic',
                URL: 'assets/audio/music/victory-theme.ogg',
                VOLUME: 0.8,
                LOOP: false,
                FADE_IN: 500
            },
            DEFEAT: {
                KEY: 'defeatMusic',
                URL: 'assets/audio/music/defeat-theme.ogg',
                VOLUME: 0.7,
                LOOP: false,
                FADE_IN: 500
            }
        },
        SFX: {
            CRYSTAL_COLLECT: {
                KEY: 'crystalCollect',
                URL: 'assets/audio/sfx/crystal-collect.ogg',
                VOLUME: 0.6,
                VARIATIONS: 3
            },
            POWER_CRYSTAL_COLLECT: {
                KEY: 'powerCrystalCollect',
                URL: 'assets/audio/sfx/power-crystal-collect.ogg',
                VOLUME: 0.8,
                VARIATIONS: 2
            },
            COLLISION_LIGHT: {
                KEY: 'collisionLight',
                URL: 'assets/audio/sfx/collision-light.ogg',
                VOLUME: 0.4,
                VARIATIONS: 3
            },
            COLLISION_MEDIUM: {
                KEY: 'collisionMedium',
                URL: 'assets/audio/sfx/collision-medium.ogg',
                VOLUME: 0.6,
                VARIATIONS: 3
            },
            COLLISION_HEAVY: {
                KEY: 'collisionHeavy',
                URL: 'assets/audio/sfx/collision-heavy.ogg',
                VOLUME: 0.8,
                VARIATIONS: 3
            },
            ABILITY_BURST: {
                KEY: 'abilityBurst',
                URL: 'assets/audio/sfx/ability-burst.ogg',
                VOLUME: 0.7,
                VARIATIONS: 2
            },
            ABILITY_WALL: {
                KEY: 'abilityWall',
                URL: 'assets/audio/sfx/ability-wall.ogg',
                VOLUME: 0.6,
                VARIATIONS: 2
            },
            LEVEL_UP: {
                KEY: 'levelUp',
                URL: 'assets/audio/sfx/level-up.ogg',
                VOLUME: 0.7,
                VARIATIONS: 1
            },
            UI_CLICK: {
                KEY: 'uiClick',
                URL: 'assets/audio/sfx/ui-click.ogg',
                VOLUME: 0.5,
                VARIATIONS: 2
            },
            UI_HOVER: {
                KEY: 'uiHover',
                URL: 'assets/audio/sfx/ui-hover.ogg',
                VOLUME: 0.3,
                VARIATIONS: 1
            },
            NOTIFICATION: {
                KEY: 'notification',
                URL: 'assets/audio/sfx/notification.ogg',
                VOLUME: 0.6,
                VARIATIONS: 2
            },
            NEBULA_CONTROL_START: {
                KEY: 'nebulaControlStart',
                URL: 'assets/audio/sfx/nebula-control-start.ogg',
                VOLUME: 0.8,
                VARIATIONS: 1
            },
            NEBULA_CONTROL_LOOP: {
                KEY: 'nebulaControlLoop',
                URL: 'assets/audio/sfx/nebula-control-loop.ogg',
                VOLUME: 0.5,
                LOOP: true,
                VARIATIONS: 1
            },
            WARMUP_COUNTDOWN: {
                KEY: 'warmupCountdown',
                URL: 'assets/audio/sfx/warmup-countdown.ogg',
                VOLUME: 0.7,
                VARIATIONS: 1
            },
            GAME_START: {
                KEY: 'gameStart',
                URL: 'assets/audio/sfx/game-start.ogg',
                VOLUME: 0.8,
                VARIATIONS: 1
            }
        },
        SPATIAL: {
            MAX_DISTANCE: 400,
            REFERENCE_DISTANCE: 100,
            ROLLOFF_FACTOR: 2
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GAME_CONSTANTS;
}