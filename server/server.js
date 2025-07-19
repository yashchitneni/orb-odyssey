const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const GAME_CONSTANTS = require('../shared/constants');

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.frameTime = 0;
        this.frameCount = 0;
        this.lastTime = Date.now();
        this.currentFPS = 60;
        this.memoryUsage = 0;
        this.networkStats = {
            messagesSent: 0,
            messagesReceived: 0,
            bytesOut: 0,
            bytesIn: 0,
            lastReset: Date.now()
        };
    }
    
    updateFrame() {
        const now = Date.now();
        this.frameTime = now - this.lastTime;
        this.lastTime = now;
        this.frameCount++;
        
        if (this.frameCount % 60 === 0) {
            this.currentFPS = Math.round(1000 / this.frameTime);
            this.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        }
    }
    
    getStats() {
        return {
            fps: this.currentFPS,
            frameTime: this.frameTime,
            memory: this.memoryUsage,
            network: this.networkStats,
            playerCount: Object.keys(gameState.players).length
        };
    }
}

// Object pool for reusable objects
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 100) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = new Set();
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(createFn());
        }
    }
    
    get() {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.createFn();
        }
        this.active.add(obj);
        return obj;
    }
    
    release(obj) {
        if (this.active.has(obj)) {
            this.resetFn(obj);
            this.active.delete(obj);
            this.pool.push(obj);
        }
    }
    
    releaseAll() {
        this.active.forEach(obj => {
            this.resetFn(obj);
            this.pool.push(obj);
        });
        this.active.clear();
    }
}

// Delta compression for network optimization
class DeltaCompressor {
    constructor() {
        this.lastStates = {};
    }
    
    compressPlayerState(playerId, currentState) {
        const lastState = this.lastStates[playerId];
        if (!lastState) {
            this.lastStates[playerId] = {...currentState};
            return currentState;
        }
        
        const delta = {};
        let hasChanges = false;
        
        // Position compression
        if (Math.abs(currentState.x - lastState.x) > GAME_CONSTANTS.PERFORMANCE.DELTA_COMPRESSION.POSITION_THRESHOLD) {
            delta.x = currentState.x;
            lastState.x = currentState.x;
            hasChanges = true;
        }
        
        if (Math.abs(currentState.y - lastState.y) > GAME_CONSTANTS.PERFORMANCE.DELTA_COMPRESSION.POSITION_THRESHOLD) {
            delta.y = currentState.y;
            lastState.y = currentState.y;
            hasChanges = true;
        }
        
        // Velocity compression
        if (Math.abs(currentState.vx - lastState.vx) > GAME_CONSTANTS.PERFORMANCE.DELTA_COMPRESSION.VELOCITY_THRESHOLD) {
            delta.vx = currentState.vx;
            lastState.vx = currentState.vx;
            hasChanges = true;
        }
        
        if (Math.abs(currentState.vy - lastState.vy) > GAME_CONSTANTS.PERFORMANCE.DELTA_COMPRESSION.VELOCITY_THRESHOLD) {
            delta.vy = currentState.vy;
            lastState.vy = currentState.vy;
            hasChanges = true;
        }
        
        // Always include critical data
        if (currentState.level !== lastState.level || 
            currentState.crystalsCollected !== lastState.crystalsCollected ||
            currentState.energy !== lastState.energy) {
            delta.level = currentState.level;
            delta.crystalsCollected = currentState.crystalsCollected;
            delta.energy = currentState.energy;
            lastState.level = currentState.level;
            lastState.crystalsCollected = currentState.crystalsCollected;
            lastState.energy = currentState.energy;
            hasChanges = true;
        }
        
        return hasChanges ? { id: playerId, ...delta } : null;
    }
    
    clearPlayer(playerId) {
        delete this.lastStates[playerId];
    }
}

const performanceMonitor = new PerformanceMonitor();
const deltaCompressor = new DeltaCompressor();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

app.use(express.static(path.join(__dirname, '../client')));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/shared', express.static(path.join(__dirname, '../shared')));

const gameState = {
    players: {},
    orbs: {},
    crystals: {},
    gameStarted: false,
    gamePhase: 'waiting', // 'waiting', 'warmup', 'playing', 'ended'
    warmupTime: 0,
    gameTime: 0,
    lastUpdate: Date.now(),
    nebulaCore: {
        controllingPlayer: null,
        controlStartTime: null,
        controlTime: 0
    },
    winner: null,
    winType: null
};

let playerIdCounter = 1;
let orbIdCounter = 1;
let crystalIdCounter = 1;

function generateOrb() {
    const orbId = 'orb_' + orbIdCounter++;
    gameState.orbs[orbId] = {
        id: orbId,
        x: Math.random() * (GAME_CONSTANTS.WORLD_WIDTH - 100) + 50,
        y: Math.random() * (GAME_CONSTANTS.WORLD_HEIGHT - 100) + 50
    };
    io.emit('orbSpawned', gameState.orbs[orbId]);
}

function generateCrystal(forceNebulaCore = false) {
    const crystalId = 'crystal_' + crystalIdCounter++;
    const isPowerCrystal = Math.random() < GAME_CONSTANTS.POWER_CRYSTAL_CHANCE;
    
    let x, y;
    
    // Check if any player has reached level 4 for Nebula Core spawning
    const hasLevel4Player = Object.values(gameState.players).some(p => p.level >= 4);
    
    if (forceNebulaCore || (hasLevel4Player && Math.random() < 0.5)) {
        // Spawn in Nebula Core zone
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * GAME_CONSTANTS.NEBULA_CORE.RADIUS;
        x = GAME_CONSTANTS.NEBULA_CORE.X + Math.cos(angle) * radius;
        y = GAME_CONSTANTS.NEBULA_CORE.Y + Math.sin(angle) * radius;
    } else {
        // Normal spawn
        x = Math.random() * (GAME_CONSTANTS.WORLD_WIDTH - 100) + 50;
        y = Math.random() * (GAME_CONSTANTS.WORLD_HEIGHT - 100) + 50;
    }
    
    gameState.crystals[crystalId] = {
        id: crystalId,
        x: x,
        y: y,
        isPowerCrystal: isPowerCrystal,
        value: isPowerCrystal ? GAME_CONSTANTS.POINTS_PER_POWER_CRYSTAL : GAME_CONSTANTS.POINTS_PER_CRYSTAL
    };
    io.emit('crystalSpawned', gameState.crystals[crystalId]);
}

function initializeOrbs() {
    for (let i = 0; i < GAME_CONSTANTS.ORB_COUNT; i++) {
        generateOrb();
    }
}

function initializeCrystals() {
    const crystalCount = Math.floor(Math.random() * 
        (GAME_CONSTANTS.CRYSTAL_COUNT_MAX - GAME_CONSTANTS.CRYSTAL_COUNT_MIN + 1)) + 
        GAME_CONSTANTS.CRYSTAL_COUNT_MIN;
    
    for (let i = 0; i < crystalCount; i++) {
        generateCrystal();
    }
}

function startGame() {
    gameState.gameStarted = true;
    gameState.gamePhase = 'warmup';
    gameState.warmupTime = GAME_CONSTANTS.WIN_CONDITIONS.WARMUP_DURATION;
    gameState.gameTime = GAME_CONSTANTS.WIN_CONDITIONS.GAME_DURATION;
    gameState.winner = null;
    gameState.winType = null;
    gameState.nebulaCore.controllingPlayer = null;
    gameState.nebulaCore.controlStartTime = null;
    gameState.nebulaCore.controlTime = 0;
    initializeOrbs();
    initializeCrystals();
    
    for (const playerId in gameState.players) {
        gameState.players[playerId].score = 0;
        gameState.players[playerId].crystalsCollected = 0;
        gameState.players[playerId].level = 1;
        gameState.players[playerId].abilities.burst.available = false;
        gameState.players[playerId].abilities.burst.cooldown = 0;
        gameState.players[playerId].abilities.wall.available = false;
        gameState.players[playerId].abilities.wall.cooldown = 0;
        gameState.players[playerId].energy = GAME_CONSTANTS.ENERGY.MAX;
        gameState.players[playerId].energyRegenTimer = 0;
        gameState.players[playerId].walls = [];
        gameState.players[playerId].collisionImmunity = 0;
        gameState.players[playerId].x = Math.random() * GAME_CONSTANTS.WORLD_WIDTH;
        gameState.players[playerId].y = Math.random() * GAME_CONSTANTS.WORLD_HEIGHT;
    }
    
    io.emit('gameStart');
}

function endGame(winnerId = null, winType = null) {
    gameState.gameStarted = false;
    gameState.gamePhase = 'ended';
    
    // Determine winner if not already set
    if (!winnerId && !winType) {
        // Time limit reached - find highest scorer
        const sortedPlayers = Object.values(gameState.players)
            .sort((a, b) => b.crystalsCollected - a.crystalsCollected);
        if (sortedPlayers.length > 0) {
            winnerId = sortedPlayers[0].id;
            winType = GAME_CONSTANTS.WIN_TYPES.TIME_LIMIT;
        }
    }
    
    gameState.winner = winnerId;
    gameState.winType = winType;
    
    const playerResults = Object.values(gameState.players)
        .sort((a, b) => b.crystalsCollected - a.crystalsCollected)
        .map(player => ({
            id: player.id,
            name: player.name,
            score: player.score,
            crystalsCollected: player.crystalsCollected,
            level: player.level
        }));
    
    io.emit('gameEnded', {
        players: playerResults,
        winner: winnerId,
        winType: winType
    });
    
    gameState.orbs = {};
    gameState.crystals = {};
    gameState.gameTime = 0;
}

function updateGame() {
    try {
        if (!gameState.gameStarted) return;
        
        const now = Date.now();
        const deltaTime = (now - gameState.lastUpdate) / 1000;
        gameState.lastUpdate = now;
        
        // Sanity check for deltaTime
        if (deltaTime > 1 || deltaTime < 0) {
            console.warn(`Unusual deltaTime detected: ${deltaTime}. Clamping to safe range.`);
            return;
        }
    
    // Handle warmup phase
    if (gameState.gamePhase === 'warmup') {
        gameState.warmupTime -= deltaTime * 1000;
        if (gameState.warmupTime <= 0) {
            gameState.gamePhase = 'playing';
            io.emit('warmupEnd');
        }
        return; // Don't update game logic during warmup
    }
    
    // Update game timer
    gameState.gameTime -= deltaTime * 1000;
    
    if (gameState.gameTime <= 0) {
        endGame();
        return;
    }
    
    // Check Nebula Core control (only for level 4+ players)
    checkNebulaControl(deltaTime);
    
    // Check win conditions
    checkWinConditions();
    
    for (const playerId in gameState.players) {
        const player = gameState.players[playerId];
        
        // Update collision immunity
        if (player.collisionImmunity > 0) {
            player.collisionImmunity = Math.max(0, player.collisionImmunity - deltaTime * 1000);
        }
        
        // Update ability cooldowns
        if (player.abilities.burst.cooldown > 0) {
            player.abilities.burst.cooldown = Math.max(0, player.abilities.burst.cooldown - deltaTime * 1000);
        }
        if (player.abilities.wall.cooldown > 0) {
            player.abilities.wall.cooldown = Math.max(0, player.abilities.wall.cooldown - deltaTime * 1000);
        }
        
        // Update energy regeneration
        if (player.energyRegenTimer > 0) {
            player.energyRegenTimer = Math.max(0, player.energyRegenTimer - deltaTime * 1000);
        } else {
            player.energy = Math.min(GAME_CONSTANTS.ENERGY.MAX, player.energy + GAME_CONSTANTS.ENERGY.REGEN_RATE * deltaTime);
        }
        
        // Update walls duration
        player.walls = player.walls.filter(wall => {
            wall.duration -= deltaTime * 1000;
            return wall.duration > 0;
        });
        
        // Update velocity based on acceleration
        if (player.ax !== 0 || player.ay !== 0) {
            player.vx += player.ax * GAME_CONSTANTS.PLAYER_ACCELERATION * deltaTime;
            player.vy += player.ay * GAME_CONSTANTS.PLAYER_ACCELERATION * deltaTime;
            
            // Limit to max speed (accounting for level multiplier)
            const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
            const maxSpeed = GAME_CONSTANTS.PLAYER_SPEED * (GAME_CONSTANTS.LEVELS.SPEED_MULTIPLIERS[player.level - 1] || 1);
            if (speed > maxSpeed) {
                player.vx = (player.vx / speed) * maxSpeed;
                player.vy = (player.vy / speed) * maxSpeed;
            }
        }
        
        // Apply drag
        player.vx *= Math.pow(GAME_CONSTANTS.PLAYER_DRAG, deltaTime * 60);
        player.vy *= Math.pow(GAME_CONSTANTS.PLAYER_DRAG, deltaTime * 60);
        
        // Stop if velocity is too small
        if (Math.abs(player.vx) < GAME_CONSTANTS.MIN_VELOCITY) player.vx = 0;
        if (Math.abs(player.vy) < GAME_CONSTANTS.MIN_VELOCITY) player.vy = 0;
        
        // Update position
        if (player.vx !== 0 || player.vy !== 0) {
            const oldX = player.x;
            const oldY = player.y;
            
            player.x += player.vx * deltaTime;
            player.y += player.vy * deltaTime;
            
            // Check wall collisions
            for (const otherPlayerId in gameState.players) {
                const otherPlayer = gameState.players[otherPlayerId];
                for (const wall of otherPlayer.walls) {
                    // Simple rectangle collision for wall
                    const wallLeft = wall.x - GAME_CONSTANTS.ABILITIES.WALL.WALL_LENGTH / 2;
                    const wallRight = wall.x + GAME_CONSTANTS.ABILITIES.WALL.WALL_LENGTH / 2;
                    const wallTop = wall.y - GAME_CONSTANTS.ABILITIES.WALL.WALL_WIDTH / 2;
                    const wallBottom = wall.y + GAME_CONSTANTS.ABILITIES.WALL.WALL_WIDTH / 2;
                    
                    // Check if player collides with wall
                    if (player.x + GAME_CONSTANTS.PLAYER_RADIUS > wallLeft &&
                        player.x - GAME_CONSTANTS.PLAYER_RADIUS < wallRight &&
                        player.y + GAME_CONSTANTS.PLAYER_RADIUS > wallTop &&
                        player.y - GAME_CONSTANTS.PLAYER_RADIUS < wallBottom) {
                        
                        // Push player back
                        player.x = oldX;
                        player.y = oldY;
                        player.vx *= -GAME_CONSTANTS.BOUNCE_DAMPING;
                        player.vy *= -GAME_CONSTANTS.BOUNCE_DAMPING;
                    }
                }
            }
            
            // Bounce off boundaries
            if (player.x <= GAME_CONSTANTS.PLAYER_RADIUS || 
                player.x >= GAME_CONSTANTS.WORLD_WIDTH - GAME_CONSTANTS.PLAYER_RADIUS) {
                player.x = Math.max(GAME_CONSTANTS.PLAYER_RADIUS, 
                           Math.min(GAME_CONSTANTS.WORLD_WIDTH - GAME_CONSTANTS.PLAYER_RADIUS, player.x));
                player.vx *= -GAME_CONSTANTS.BOUNCE_DAMPING;
            }
            
            if (player.y <= GAME_CONSTANTS.PLAYER_RADIUS || 
                player.y >= GAME_CONSTANTS.WORLD_HEIGHT - GAME_CONSTANTS.PLAYER_RADIUS) {
                player.y = Math.max(GAME_CONSTANTS.PLAYER_RADIUS, 
                           Math.min(GAME_CONSTANTS.WORLD_HEIGHT - GAME_CONSTANTS.PLAYER_RADIUS, player.y));
                player.vy *= -GAME_CONSTANTS.BOUNCE_DAMPING;
            }
            
            // Check player-to-player collisions
            if (player.collisionImmunity <= 0) {
                for (const otherPlayerId in gameState.players) {
                    if (otherPlayerId === playerId) continue;
                    
                    const otherPlayer = gameState.players[otherPlayerId];
                    if (otherPlayer.collisionImmunity > 0) continue;
                    
                    const dx = otherPlayer.x - player.x;
                    const dy = otherPlayer.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    const playerRadius = GAME_CONSTANTS.PLAYER_RADIUS * (GAME_CONSTANTS.LEVELS.SIZE_MULTIPLIERS[player.level - 1] || 1);
                    const otherRadius = GAME_CONSTANTS.PLAYER_RADIUS * (GAME_CONSTANTS.LEVELS.SIZE_MULTIPLIERS[otherPlayer.level - 1] || 1);
                    
                    if (distance < playerRadius + otherRadius) {
                        // Calculate relative velocity
                        const relativeVx = player.vx - otherPlayer.vx;
                        const relativeVy = player.vy - otherPlayer.vy;
                        const relativeSpeed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);
                        
                        // Only process collision if players are moving towards each other fast enough
                        if (relativeSpeed > GAME_CONSTANTS.COLLISION.MIN_COLLISION_SPEED) {
                            // Calculate collision normal
                            const normalX = dx / distance;
                            const normalY = dy / distance;
                            
                            // Calculate masses based on level
                            const playerMass = player.level;
                            const otherMass = otherPlayer.level;
                            const totalMass = playerMass + otherMass;
                            
                            // Calculate collision impulse using elastic collision formula
                            const relativeVelocity = relativeVx * normalX + relativeVy * normalY;
                            const impulse = 2 * relativeVelocity / totalMass * GAME_CONSTANTS.COLLISION.ELASTICITY;
                            
                            // Apply force multiplier for more dramatic collisions
                            const forceMultiplier = GAME_CONSTANTS.COLLISION.FORCE_MULTIPLIER;
                            
                            // Larger orb gets advantage
                            const playerAdvantage = player.level > otherPlayer.level ? GAME_CONSTANTS.COLLISION.SIZE_ADVANTAGE : 1;
                            const otherAdvantage = otherPlayer.level > player.level ? GAME_CONSTANTS.COLLISION.SIZE_ADVANTAGE : 1;
                            
                            // Apply velocity changes
                            player.vx -= impulse * otherMass * normalX * forceMultiplier / playerAdvantage;
                            player.vy -= impulse * otherMass * normalY * forceMultiplier / playerAdvantage;
                            otherPlayer.vx += impulse * playerMass * normalX * forceMultiplier / otherAdvantage;
                            otherPlayer.vy += impulse * playerMass * normalY * forceMultiplier / otherAdvantage;
                            
                            // Separate overlapping players
                            const overlap = (playerRadius + otherRadius) - distance;
                            const separationX = normalX * overlap * 0.5;
                            const separationY = normalY * overlap * 0.5;
                            
                            player.x -= separationX;
                            player.y -= separationY;
                            otherPlayer.x += separationX;
                            otherPlayer.y += separationY;
                            
                            // Smaller player drops crystals
                            let smallerPlayer, largerPlayer;
                            if (player.level < otherPlayer.level) {
                                smallerPlayer = player;
                                largerPlayer = otherPlayer;
                            } else if (otherPlayer.level < player.level) {
                                smallerPlayer = otherPlayer;
                                largerPlayer = player;
                            } else {
                                // Same level - use random or who has more crystals
                                smallerPlayer = player.crystalsCollected < otherPlayer.crystalsCollected ? player : otherPlayer;
                                largerPlayer = smallerPlayer === player ? otherPlayer : player;
                            }
                            
                            // Drop crystals from smaller player
                            let actualCrystalsDropped = 0;
                            if (smallerPlayer.crystalsCollected > 0) {
                                actualCrystalsDropped = Math.min(GAME_CONSTANTS.COLLISION.CRYSTAL_DROP_COUNT, 
                                                              smallerPlayer.crystalsCollected);
                                
                                for (let i = 0; i < actualCrystalsDropped; i++) {
                                    const angle = (i / actualCrystalsDropped) * Math.PI * 2 + Math.random() * 0.5;
                                    const radius = 20 + Math.random() * GAME_CONSTANTS.COLLISION.CRYSTAL_SCATTER_RADIUS;
                                    const crystalId = 'crystal_' + crystalIdCounter++;
                                    
                                    gameState.crystals[crystalId] = {
                                        id: crystalId,
                                        x: Math.max(GAME_CONSTANTS.CRYSTAL_RADIUS, 
                                            Math.min(GAME_CONSTANTS.WORLD_WIDTH - GAME_CONSTANTS.CRYSTAL_RADIUS,
                                            smallerPlayer.x + Math.cos(angle) * radius)),
                                        y: Math.max(GAME_CONSTANTS.CRYSTAL_RADIUS,
                                            Math.min(GAME_CONSTANTS.WORLD_HEIGHT - GAME_CONSTANTS.CRYSTAL_RADIUS,
                                            smallerPlayer.y + Math.sin(angle) * radius)),
                                        isPowerCrystal: false,
                                        value: GAME_CONSTANTS.POINTS_PER_CRYSTAL
                                    };
                                    
                                    io.emit('crystalSpawned', gameState.crystals[crystalId]);
                                }
                                
                                // Update smaller player's crystal count
                                smallerPlayer.crystalsCollected = Math.max(0, smallerPlayer.crystalsCollected - actualCrystalsDropped);
                                
                                // Recalculate level
                                let newLevel = 1;
                                for (let level = 4; level >= 1; level--) {
                                    if (smallerPlayer.crystalsCollected >= GAME_CONSTANTS.LEVELS.THRESHOLDS[level]) {
                                        newLevel = level;
                                        break;
                                    }
                                }
                                smallerPlayer.level = newLevel;
                            }
                            
                            // Set collision immunity to prevent spam
                            player.collisionImmunity = GAME_CONSTANTS.COLLISION.IMMUNITY_DURATION;
                            otherPlayer.collisionImmunity = GAME_CONSTANTS.COLLISION.IMMUNITY_DURATION;
                            
                            io.emit('playerCollision', {
                                player1Id: playerId,
                                player2Id: otherPlayerId,
                                position: {
                                    x: (player.x + otherPlayer.x) / 2,
                                    y: (player.y + otherPlayer.y) / 2
                                },
                                impactSpeed: relativeSpeed,
                                crystalsDropped: actualCrystalsDropped,
                                smallerPlayerId: smallerPlayer === player ? playerId : otherPlayerId
                            });
                        }
                    }
                }
            }
            
            // Update rotation based on movement direction
            if (player.vx !== 0 || player.vy !== 0) {
                player.rotation = Math.atan2(player.vy, player.vx);
            }
        }
        
        for (const orbId in gameState.orbs) {
            const orb = gameState.orbs[orbId];
            const dx = player.x - orb.x;
            const dy = player.y - orb.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < GAME_CONSTANTS.PLAYER_RADIUS + GAME_CONSTANTS.ORB_RADIUS) {
                player.score += GAME_CONSTANTS.POINTS_PER_ORB;
                const orbPosition = { x: orb.x, y: orb.y };
                delete gameState.orbs[orbId];
                io.emit('orbCollected', {
                    orbId,
                    playerId,
                    newScore: player.score,
                    position: orbPosition
                });
                
                setTimeout(() => {
                    if (gameState.gameStarted) {
                        generateOrb();
                    }
                }, GAME_CONSTANTS.ORB_SPAWN_DELAY);
            }
        }
        
        // Check crystal collisions
        for (const crystalId in gameState.crystals) {
            const crystal = gameState.crystals[crystalId];
            const dx = player.x - crystal.x;
            const dy = player.y - crystal.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < GAME_CONSTANTS.PLAYER_RADIUS + GAME_CONSTANTS.CRYSTAL_RADIUS) {
                player.score += crystal.value;
                player.crystalsCollected += 1;
                
                // Store crystal position before any operations
                const crystalPosition = { x: crystal.x, y: crystal.y };
                
                // Check for level up
                const previousLevel = player.level;
                for (let level = 4; level >= 1; level--) {
                    if (player.crystalsCollected >= GAME_CONSTANTS.LEVELS.THRESHOLDS[level]) {
                        player.level = level;
                        break;
                    }
                }
                
                // Update abilities based on level
                if (player.level >= GAME_CONSTANTS.ABILITIES.BURST.UNLOCK_LEVEL) {
                    player.abilities.burst.available = true;
                }
                if (player.level >= GAME_CONSTANTS.ABILITIES.WALL.UNLOCK_LEVEL) {
                    player.abilities.wall.available = true;
                }
                
                // Delete crystal from game state
                delete gameState.crystals[crystalId];
                
                // Emit crystal collected event with position
                io.emit('crystalCollected', { 
                    crystalId, 
                    playerId,
                    isPowerCrystal: crystal.isPowerCrystal,
                    value: crystal.value,
                    crystalsCollected: player.crystalsCollected,
                    level: player.level,
                    leveledUp: player.level > previousLevel,
                    position: crystalPosition  // Always include position
                });
                
                // Check for crystal win condition AFTER emitting the event
                if (player.crystalsCollected >= GAME_CONSTANTS.WIN_CONDITIONS.CRYSTAL_TARGET) {
                    endGame(player.id, GAME_CONSTANTS.WIN_TYPES.CRYSTALS);
                    return;
                }
                
                // Respawn crystal after random delay
                const respawnDelay = Math.random() * 
                    (GAME_CONSTANTS.CRYSTAL_RESPAWN_MAX - GAME_CONSTANTS.CRYSTAL_RESPAWN_MIN) + 
                    GAME_CONSTANTS.CRYSTAL_RESPAWN_MIN;
                
                setTimeout(() => {
                    if (gameState.gameStarted) {
                        generateCrystal();
                    }
                }, respawnDelay);
            }
        }
    }
    } catch (error) {
        console.error('[updateGame] Critical error:', error);
        console.error('Stack trace:', error.stack);
        console.error('Game state at crash:', {
            players: Object.keys(gameState.players).length,
            crystals: Object.keys(gameState.crystals).length,
            orbs: Object.keys(gameState.orbs).length,
            phase: gameState.gamePhase
        });
    }
}

// Adaptive update rate based on performance
let currentUpdateRate = GAME_CONSTANTS.SERVER_UPDATE_RATE;
let updateInterval;

function setAdaptiveUpdateRate() {
    const stats = performanceMonitor.getStats();
    let newRate = GAME_CONSTANTS.SERVER_UPDATE_RATE;
    
    if (stats.fps < GAME_CONSTANTS.PERFORMANCE.FPS_CRITICAL_THRESHOLD) {
        newRate = GAME_CONSTANTS.PERFORMANCE.UPDATE_RATE_ADAPTIVE.LOW_PERF;
    } else if (stats.fps < GAME_CONSTANTS.PERFORMANCE.FPS_WARNING_THRESHOLD) {
        newRate = GAME_CONSTANTS.PERFORMANCE.UPDATE_RATE_ADAPTIVE.MEDIUM_PERF;
    } else {
        newRate = GAME_CONSTANTS.PERFORMANCE.UPDATE_RATE_ADAPTIVE.HIGH_PERF;
    }
    
    if (newRate !== currentUpdateRate) {
        currentUpdateRate = newRate;
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        updateInterval = setInterval(() => {
            performanceMonitor.updateFrame();
            updateGame();
        }, currentUpdateRate);
        console.log(`Adaptive update rate changed to ${currentUpdateRate}ms (${Math.round(1000/currentUpdateRate)} FPS)`);
    }
}

updateInterval = setInterval(() => {
    performanceMonitor.updateFrame();
    updateGame();
}, currentUpdateRate);

// Check performance every 5 seconds
setInterval(setAdaptiveUpdateRate, 5000);

// Optimized game state broadcasting with delta compression
setInterval(() => {
    if (gameState.gameStarted) {
        // Only send deltas for player positions
        const playerDeltas = [];
        for (const playerId in gameState.players) {
            const delta = deltaCompressor.compressPlayerState(playerId, gameState.players[playerId]);
            if (delta) {
                playerDeltas.push(delta);
            }
        }
        
        // Only broadcast if there are changes or critical updates needed
        if (playerDeltas.length > 0 || gameState.gamePhase === 'warmup') {
            const allWalls = {};
            for (const playerId in gameState.players) {
                if (gameState.players[playerId].walls.length > 0) {
                    allWalls[playerId] = gameState.players[playerId].walls;
                }
            }
            
            const gameStateUpdate = {
                playerDeltas,
                time: gameState.gameTime,
                gamePhase: gameState.gamePhase,
                nebulaCore: gameState.nebulaCore
            };
            
            // Add optional data only when needed
            if (Object.keys(allWalls).length > 0) {
                gameStateUpdate.walls = allWalls;
            }
            
            if (gameState.gamePhase === 'warmup') {
                gameStateUpdate.warmupTime = gameState.warmupTime;
            }
            
            // Send full orbs and crystals state less frequently (every 5th update)
            if (performanceMonitor.frameCount % 5 === 0) {
                gameStateUpdate.orbs = gameState.orbs;
                gameStateUpdate.crystals = gameState.crystals;
            }
            
            io.emit('gameStateDelta', gameStateUpdate);
        }
    }
}, Math.max(GAME_CONSTANTS.SERVER_UPDATE_RATE, 33)); // Cap at 30 FPS for broadcasting

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    const playerId = 'player_' + playerIdCounter++;
    gameState.players[playerId] = {
        id: playerId,
        socketId: socket.id,
        name: 'Player ' + playerIdCounter,
        x: GAME_CONSTANTS.WORLD_WIDTH / 2,
        y: GAME_CONSTANTS.WORLD_HEIGHT / 2,
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        score: 0,
        color: Math.floor(Math.random() * 0xffffff),
        rotation: 0,
        crystalsCollected: 0,
        level: 1,
        abilities: {
            burst: { available: false, cooldown: 0 },
            wall: { available: false, cooldown: 0 }
        },
        energy: GAME_CONSTANTS.ENERGY.MAX,
        energyRegenTimer: 0,
        walls: [],
        collisionImmunity: 0
    };
    
    socket.playerId = playerId;
    
    socket.on('joinLobby', () => {
        const playerList = Object.values(gameState.players).map(p => ({
            id: p.id,
            name: p.name
        }));
        io.emit('playerList', playerList);
    });
    
    socket.on('startGame', () => {
        if (!gameState.gameStarted && Object.keys(gameState.players).length >= 1) {
            startGame();
        }
    });
    
    socket.on('enterArena', () => {
        socket.emit('gameState', {
            myId: socket.playerId,
            players: gameState.players,
            orbs: gameState.orbs,
            crystals: gameState.crystals,
            time: gameState.gameTime,
            gamePhase: gameState.gamePhase,
            warmupTime: gameState.warmupTime,
            nebulaCore: gameState.nebulaCore
        });
    });
    
    socket.on('playerMove', (data) => {
        try {
            if (!socket.playerId || !gameState.players[socket.playerId]) {
                console.warn(`Invalid player move from ${socket.id}`);
                return;
            }
            gameState.players[socket.playerId].ax = data.ax || 0;
            gameState.players[socket.playerId].ay = data.ay || 0;
        } catch (error) {
            console.error('[playerMove] Error:', error);
        }
    });
    
    socket.on('useAbility', (data) => {
        const player = gameState.players[socket.playerId];
        if (!player) return;
        
        const abilityName = typeof data === 'string' ? data : data.type;
        const ability = player.abilities[abilityName];
        if (!ability || !ability.available || ability.cooldown > 0) return;
        
        // Check energy
        const energyCost = GAME_CONSTANTS.ABILITIES[abilityName.toUpperCase()].ENERGY_COST;
        if (player.energy < energyCost) return;
        
        switch(abilityName) {
            case 'burst':
                // Deduct energy and set cooldown
                player.energy -= energyCost;
                player.energyRegenTimer = GAME_CONSTANTS.ENERGY.REGEN_DELAY;
                ability.cooldown = GAME_CONSTANTS.ABILITIES.BURST.COOLDOWN;
                
                // Apply burst effect - push nearby players and make them drop crystals
                const burstRadius = GAME_CONSTANTS.ABILITIES.BURST.RADIUS;
                const burstForce = GAME_CONSTANTS.ABILITIES.BURST.FORCE_BASE * 
                                 Math.pow(GAME_CONSTANTS.ABILITIES.BURST.FORCE_SCALE, player.level - 1);
                
                for (const targetId in gameState.players) {
                    if (targetId === socket.playerId) continue;
                    
                    const target = gameState.players[targetId];
                    const dx = target.x - player.x;
                    const dy = target.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < burstRadius) {
                        // Apply push force
                        const force = burstForce * (1 - distance / burstRadius);
                        const pushX = (dx / distance) * force;
                        const pushY = (dy / distance) * force;
                        
                        target.vx += pushX;
                        target.vy += pushY;
                        
                        // Make target drop crystals
                        const dropCount = Math.floor(Math.random() * 
                            (GAME_CONSTANTS.ABILITIES.BURST.CRYSTAL_DROP_MAX - 
                             GAME_CONSTANTS.ABILITIES.BURST.CRYSTAL_DROP_MIN + 1)) + 
                            GAME_CONSTANTS.ABILITIES.BURST.CRYSTAL_DROP_MIN;
                        
                        for (let i = 0; i < dropCount; i++) {
                            const angle = (i / dropCount) * Math.PI * 2;
                            const radius = 30 + Math.random() * 20;
                            const crystalId = 'crystal_' + crystalIdCounter++;
                            
                            gameState.crystals[crystalId] = {
                                id: crystalId,
                                x: target.x + Math.cos(angle) * radius,
                                y: target.y + Math.sin(angle) * radius,
                                isPowerCrystal: false,
                                value: GAME_CONSTANTS.POINTS_PER_CRYSTAL
                            };
                            
                            io.emit('crystalSpawned', gameState.crystals[crystalId]);
                        }
                        
                        // Notify about crystal drop
                        io.emit('crystalsDropped', {
                            playerId: targetId,
                            count: dropCount,
                            position: { x: target.x, y: target.y }
                        });
                    }
                }
                
                // Destroy nearby walls
                for (const otherPlayerId in gameState.players) {
                    const otherPlayer = gameState.players[otherPlayerId];
                    otherPlayer.walls = otherPlayer.walls.filter(wall => {
                        const dx = wall.x - player.x;
                        const dy = wall.y - player.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < burstRadius) {
                            io.emit('wallDestroyed', { wallId: wall.id, playerId: otherPlayerId });
                            return false;
                        }
                        return true;
                    });
                }
                
                // Notify all players
                io.emit('abilityUsed', {
                    playerId: socket.playerId,
                    ability: 'burst',
                    duration: GAME_CONSTANTS.ABILITIES.BURST.DURATION,
                    position: { x: player.x, y: player.y }
                });
                break;
                
            case 'wall':
                // Check wall count limit
                if (player.walls.length >= GAME_CONSTANTS.ABILITIES.WALL.MAX_WALLS) {
                    // Remove oldest wall
                    const oldWall = player.walls.shift();
                    io.emit('wallDestroyed', { wallId: oldWall.id, playerId: socket.playerId });
                }
                
                // Deduct energy and set cooldown
                player.energy -= energyCost;
                player.energyRegenTimer = GAME_CONSTANTS.ENERGY.REGEN_DELAY;
                ability.cooldown = GAME_CONSTANTS.ABILITIES.WALL.COOLDOWN;
                
                // Calculate wall position and orientation
                const direction = data.direction || { x: 1, y: 0 };
                const wallDistance = 50; // Distance from player
                const wallX = player.x + direction.x * wallDistance;
                const wallY = player.y + direction.y * wallDistance;
                const wallAngle = Math.atan2(direction.y, direction.x);
                
                // Create wall
                const wall = {
                    id: 'wall_' + Date.now() + '_' + socket.playerId,
                    x: wallX,
                    y: wallY,
                    angle: wallAngle,
                    duration: GAME_CONSTANTS.ABILITIES.WALL.DURATION
                };
                
                player.walls.push(wall);
                
                // Notify all players
                io.emit('abilityUsed', {
                    playerId: socket.playerId,
                    ability: 'wall',
                    duration: GAME_CONSTANTS.ABILITIES.WALL.DURATION,
                    position: { x: wallX, y: wallY },
                    angle: wallAngle,
                    wallId: wall.id
                });
                break;
        }
    });
    
    socket.on('returnToLobby', () => {
        const playerList = Object.values(gameState.players).map(p => ({
            id: p.id,
            name: p.name
        }));
        socket.emit('playerList', playerList);
    });
    
    socket.on('selectUpgrade', (data) => {
        console.log(`Player ${socket.playerId} selected upgrade: ${data.upgradeId} for round ${data.round}`);
        // TODO: Store upgrade selections for multi-round gameplay
    });
    
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        if (socket.playerId && gameState.players[socket.playerId]) {
            deltaCompressor.clearPlayer(socket.playerId);
            delete gameState.players[socket.playerId];
            io.emit('playerLeft', socket.playerId);
            
            const playerList = Object.values(gameState.players).map(p => ({
                id: p.id,
                name: p.name
            }));
            io.emit('playerList', playerList);
        }
    });
    
    // Performance monitoring endpoint
    socket.on('getPerformanceStats', () => {
        socket.emit('performanceStats', performanceMonitor.getStats());
    });
});

function checkNebulaControl(deltaTime) {
    // Find which player is in the Nebula Core (if any)
    let playerInCore = null;
    for (const playerId in gameState.players) {
        const player = gameState.players[playerId];
        if (player.level < 4) continue; // Only level 4+ can control
        
        const dx = player.x - GAME_CONSTANTS.NEBULA_CORE.X;
        const dy = player.y - GAME_CONSTANTS.NEBULA_CORE.Y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < GAME_CONSTANTS.NEBULA_CORE.RADIUS) {
            playerInCore = playerId;
            break;
        }
    }
    
    // Update control state
    if (playerInCore !== gameState.nebulaCore.controllingPlayer) {
        // Control changed
        if (playerInCore) {
            // New player entered
            gameState.nebulaCore.controllingPlayer = playerInCore;
            gameState.nebulaCore.controlStartTime = Date.now();
            gameState.nebulaCore.controlTime = 0;
            io.emit('nebulaCoreControl', {
                playerId: playerInCore,
                controlTime: 0
            });
        } else {
            // Player left
            gameState.nebulaCore.controllingPlayer = null;
            gameState.nebulaCore.controlStartTime = null;
            gameState.nebulaCore.controlTime = 0;
            io.emit('nebulaCoreControl', {
                playerId: null,
                controlTime: 0
            });
        }
    } else if (playerInCore) {
        // Continue control
        gameState.nebulaCore.controlTime += deltaTime * 1000;
        
        // Check for Nebula Core win
        if (gameState.nebulaCore.controlTime >= GAME_CONSTANTS.NEBULA_CORE.CONTROL_TIME) {
            endGame(playerInCore, GAME_CONSTANTS.WIN_TYPES.NEBULA_CONTROL);
        }
    }
}

function checkWinConditions() {
    // Crystal win condition is checked when crystals are collected
    // Nebula Core win is checked in checkNebulaControl
    // Time limit is checked in updateGame
}

// Global error handlers to prevent server crashes
process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION:', error);
    console.error('Stack:', error.stack);
    // Don't exit - try to keep the server running
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
    // Don't exit - try to keep the server running
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

server.listen(GAME_CONSTANTS.PORT, () => {
    console.log(`Orb Odyssey server running on port ${GAME_CONSTANTS.PORT}`);
    console.log(`Client: http://localhost:${GAME_CONSTANTS.PORT}`);
    console.log('\n=== Server Started Successfully ===');
    console.log('Error handling: ENABLED');
    console.log('Auto-recovery: ENABLED');
    console.log('==================================\n');
});