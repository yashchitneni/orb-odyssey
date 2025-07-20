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
    winType: null,
    // Multi-round tracking
    currentRound: 0,
    totalRounds: 5,
    roundWinners: [],
    playerUpgrades: {},
    seriesScores: {} // Track wins per player
};

let playerIdCounter = 1;
let orbIdCounter = 1;
let crystalIdCounter = 1;
let roomIdCounter = 1;

// Room management
const rooms = new Map();

class Room {
    constructor(id, hostSocketId) {
        this.id = id;
        this.hostSocketId = hostSocketId;
        this.players = {};
        this.gameState = {
            players: {},
            orbs: {},
            crystals: {},
            gameStarted: false,
            gamePhase: 'waiting',
            warmupTime: 0,
            gameTime: 0,
            lastUpdate: Date.now(),
            nebulaCore: {
                controllingPlayer: null,
                controlStartTime: null,
                controlTime: 0
            },
            winner: null,
            winType: null,
            currentRound: 0,
            totalRounds: 5,
            roundWinners: [],
            playerUpgrades: {},
            seriesScores: {},
            playersReady: {},
            targetCrystalType: null,
            crystalTypes: ['crystal', 'crystal1', 'crystal2', 'crystal3', 'crystal4', 'crystal5']
        };
    }
    
    addPlayer(playerId, playerData) {
        this.players[playerId] = playerData;
        this.gameState.players[playerId] = playerData;
    }
    
    removePlayer(playerId) {
        delete this.players[playerId];
        delete this.gameState.players[playerId];
        
        // If host leaves, assign new host or delete room
        if (Object.keys(this.players).length === 0) {
            return true; // Delete room
        }
        
        if (this.hostSocketId === this.players[playerId]?.socketId) {
            // Assign new host
            const newHost = Object.values(this.players)[0];
            if (newHost) {
                this.hostSocketId = newHost.socketId;
            }
        }
        
        return false; // Don't delete room
    }
    
    startGame() {
        this.gameState.gameStarted = true;
        this.gameState.gamePhase = 'warmup';
        this.gameState.warmupTime = GAME_CONSTANTS.WIN_CONDITIONS.WARMUP_DURATION;
        this.gameState.gameTime = GAME_CONSTANTS.WIN_CONDITIONS.GAME_DURATION;
        this.gameState.winner = null;
        this.gameState.winType = null;
        
        // Initialize series if first round
        if (this.gameState.currentRound === 0) {
            this.gameState.currentRound = 1;
            this.gameState.roundWinners = [];
            this.gameState.seriesScores = {};
            for (const playerId in this.gameState.players) {
                this.gameState.seriesScores[playerId] = 0;
            }
        }
        
        // Set target crystal type for this round (deterministic based on round number)
        const targetIndex = (this.gameState.currentRound - 1) % this.gameState.crystalTypes.length;
        this.gameState.targetCrystalType = this.gameState.crystalTypes[targetIndex];
        console.log(`[ROOM ${this.id}] Round ${this.gameState.currentRound} - Target crystal: ${this.gameState.targetCrystalType}`);
        
        // Initialize game objects for this room
        this.initializeOrbs();
        this.initializeCrystals();
        
        // Reset player positions and stats
        for (const playerId in this.gameState.players) {
            const player = this.gameState.players[playerId];
            player.score = 0;
            player.crystalsCollected = 0;
            player.level = 1;
            player.abilities.burst.available = false;
            player.abilities.burst.cooldown = 0;
            player.abilities.wall.available = false;
            player.abilities.wall.cooldown = 0;
            player.energy = GAME_CONSTANTS.ENERGY.MAX;
            player.energyRegenTimer = 0;
            player.walls = [];
            player.collisionImmunity = 0;
            player.x = Math.random() * GAME_CONSTANTS.WORLD_WIDTH;
            player.y = Math.random() * GAME_CONSTANTS.WORLD_HEIGHT;
            player.vx = 0;
            player.vy = 0;
            player.ax = 0;
            player.ay = 0;
        }
        
        // Start the room's update loop
        this.startUpdateLoop();
    }
    
    startUpdateLoop() {
        // Clear any existing update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Start update loop for this room
        this.updateInterval = setInterval(() => {
            this.update();
        }, 1000 / 60); // 60 FPS update rate
        
        // Start broadcast loop for this room
        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
        }
        
        this.broadcastInterval = setInterval(() => {
            this.broadcastGameState();
        }, 1000 / 30); // 30 FPS broadcast rate
    }
    
    stopUpdateLoop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
            this.broadcastInterval = null;
        }
    }
    
    update() {
        if (!this.gameState.gameStarted) return;
        
        const now = Date.now();
        const deltaTime = (now - this.gameState.lastUpdate) / 1000;
        this.gameState.lastUpdate = now;
        
        // Sanity check for deltaTime
        if (deltaTime > 1 || deltaTime < 0) {
            console.warn(`Room ${this.id}: Unusual deltaTime detected: ${deltaTime}. Clamping to safe range.`);
            return;
        }
        
        // Handle warmup phase
        if (this.gameState.gamePhase === 'warmup') {
            this.gameState.warmupTime -= deltaTime * 1000;
            if (this.gameState.warmupTime <= 0) {
                this.gameState.gamePhase = 'playing';
                io.to(this.id).emit('warmupEnd');
            }
            return; // Don't update game logic during warmup
        }
        
        // Update game timer
        this.gameState.gameTime -= deltaTime * 1000;
        
        if (this.gameState.gameTime <= 0) {
            this.endGame();
            return;
        }
        
        // Update players
        for (const playerId in this.gameState.players) {
            const player = this.gameState.players[playerId];
            this.updatePlayer(player, deltaTime);
        }
        
        // Check collisions
        this.checkCollisions();
    }
    
    updatePlayer(player, deltaTime) {
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
            
            // Limit to max speed (including level bonus and upgrade multiplier)
            const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
            const levelSpeedMultiplier = GAME_CONSTANTS.LEVELS.SPEED_MULTIPLIERS[player.level - 1] || 1;
            const upgradeSpeedMultiplier = player.speedMultiplier || 1;
            const maxSpeed = GAME_CONSTANTS.PLAYER_SPEED * levelSpeedMultiplier * upgradeSpeedMultiplier;
            if (speed > maxSpeed) {
                player.vx = (player.vx / speed) * maxSpeed;
                player.vy = (player.vy / speed) * maxSpeed;
            }
        }
        
        // Apply drag (with curse modifier)
        const drag = GAME_CONSTANTS.PLAYER_DRAG * (player.dragModifier || 1);
        player.vx *= Math.pow(drag, deltaTime * 60);
        player.vy *= Math.pow(drag, deltaTime * 60);
        
        // Stop if velocity is too small
        if (Math.abs(player.vx) < GAME_CONSTANTS.MIN_VELOCITY) player.vx = 0;
        if (Math.abs(player.vy) < GAME_CONSTANTS.MIN_VELOCITY) player.vy = 0;
        
        // Update position
        if (player.vx !== 0 || player.vy !== 0) {
            const distanceMoved = Math.sqrt(player.vx * player.vx + player.vy * player.vy) * deltaTime;
            player.totalDistanceTraveled = (player.totalDistanceTraveled || 0) + distanceMoved;
            
            player.x += player.vx * deltaTime;
            player.y += player.vy * deltaTime;
            
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
        }
    }
    
    checkCollisions() {
        // Check crystal collisions
        for (const playerId in this.gameState.players) {
            const player = this.gameState.players[playerId];
            
            // Check crystal collection
            for (const crystalId in this.gameState.crystals) {
                const crystal = this.gameState.crystals[crystalId];
                const dx = player.x - crystal.x;
                const dy = player.y - crystal.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < GAME_CONSTANTS.PLAYER_RADIUS + GAME_CONSTANTS.CRYSTAL_RADIUS) {
                    // Collect crystal
                    const crystalPosition = { x: crystal.x, y: crystal.y };
                    
                    // Only award points if it's the target crystal type or a power crystal
                    let pointsAwarded = false;
                    if (crystal.isPowerCrystal || crystal.isTargetCrystal) {
                        player.score += crystal.value;
                        player.crystalsCollected += 1;
                        pointsAwarded = true;
                        console.log(`[CRYSTAL] Player ${player.name} collected ${crystal.isPowerCrystal ? 'power' : 'target'} crystal (type: ${crystal.crystalType})`);
                    } else {
                        console.log(`[CRYSTAL] Player ${player.name} collected wrong crystal type: ${crystal.crystalType} (target was: ${this.gameState.targetCrystalType})`);
                    }
                    
                    // Check for level up (only if points were awarded)
                    const previousLevel = player.level;
                    let leveledUp = false;
                    
                    if (pointsAwarded) {
                        let newLevel = 1;
                        if (player.crystalsCollected >= GAME_CONSTANTS.LEVELS.THRESHOLDS[3]) { // 80 for L4
                            newLevel = 4;
                        } else if (player.crystalsCollected >= GAME_CONSTANTS.LEVELS.THRESHOLDS[2]) { // 50 for L3
                            newLevel = 3;
                        } else if (player.crystalsCollected >= GAME_CONSTANTS.LEVELS.THRESHOLDS[1]) { // 20 for L2
                            newLevel = 2;
                        }
                        player.level = newLevel;
                        leveledUp = player.level > previousLevel;
                        
                        // Update abilities based on level
                        if (player.level >= GAME_CONSTANTS.ABILITIES.BURST.UNLOCK_LEVEL) {
                            player.abilities.burst.available = true;
                        }
                        if (player.level >= GAME_CONSTANTS.ABILITIES.WALL.UNLOCK_LEVEL) {
                            player.abilities.wall.available = true;
                        }
                    }
                    
                    // Delete crystal
                    delete this.gameState.crystals[crystalId];
                    
                    // Emit crystal collected event
                    io.to(this.id).emit('crystalCollected', {
                        crystalId,
                        playerId,
                        isPowerCrystal: crystal.isPowerCrystal,
                        isTargetCrystal: crystal.isTargetCrystal,
                        crystalType: crystal.crystalType,
                        pointsAwarded: pointsAwarded,
                        value: crystal.value,
                        crystalsCollected: player.crystalsCollected,
                        level: player.level,
                        leveledUp: leveledUp,
                        position: crystalPosition
                    });
                    
                    // Check win condition
                    if (player.crystalsCollected >= GAME_CONSTANTS.WIN_CONDITIONS.CRYSTAL_TARGET) {
                        this.endGame(player.id, GAME_CONSTANTS.WIN_TYPES.CRYSTALS);
                        return;
                    }
                    
                    // Respawn crystal after delay
                    const respawnDelay = Math.random() *
                        (GAME_CONSTANTS.CRYSTAL_RESPAWN_MAX - GAME_CONSTANTS.CRYSTAL_RESPAWN_MIN) +
                        GAME_CONSTANTS.CRYSTAL_RESPAWN_MIN;
                    
                    setTimeout(() => {
                        if (this.gameState.gameStarted) {
                            this.spawnCrystal();
                        }
                    }, respawnDelay);
                }
            }
            
            // Check orb collection
            for (const orbId in this.gameState.orbs) {
                const orb = this.gameState.orbs[orbId];
                const dx = player.x - orb.x;
                const dy = player.y - orb.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < GAME_CONSTANTS.PLAYER_RADIUS + GAME_CONSTANTS.ORB_RADIUS) {
                    player.score += GAME_CONSTANTS.POINTS_PER_ORB;
                    const orbPosition = { x: orb.x, y: orb.y };
                    delete this.gameState.orbs[orbId];
                    
                    io.to(this.id).emit('orbCollected', {
                        orbId,
                        playerId,
                        newScore: player.score,
                        position: orbPosition
                    });
                    
                    // Respawn orb
                    setTimeout(() => {
                        if (this.gameState.gameStarted) {
                            this.spawnOrb();
                        }
                    }, GAME_CONSTANTS.ORB_SPAWN_DELAY);
                }
            }
        }
        
        // Check player-player collisions
        const playerIds = Object.keys(this.gameState.players);
        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                const playerA = this.gameState.players[playerIds[i]];
                const playerB = this.gameState.players[playerIds[j]];

                if (!playerA || !playerB) continue;

                // Check for collision immunity
                if (playerA.collisionImmunity > 0 || playerB.collisionImmunity > 0) {
                    continue;
                }

                const radiusA = GAME_CONSTANTS.PLAYER_RADIUS * (GAME_CONSTANTS.LEVELS.SIZE_MULTIPLIERS[playerA.level - 1] || 1);
                const radiusB = GAME_CONSTANTS.PLAYER_RADIUS * (GAME_CONSTANTS.LEVELS.SIZE_MULTIPLIERS[playerB.level - 1] || 1);

                const dx = playerB.x - playerA.x;
                const dy = playerB.y - playerA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < radiusA + radiusB && distance > 0) {
                    // --- Collision Detected ---

                    // 1. Resolve Overlap
                    const overlap = (radiusA + radiusB) - distance;
                    const overlapX = (dx / distance) * overlap;
                    const overlapY = (dy / distance) * overlap;

                    playerA.x -= overlapX / 2;
                    playerA.y -= overlapY / 2;
                    playerB.x += overlapX / 2;
                    playerB.y += overlapY / 2;

                    // 2. Calculate Collision Physics (Bounce)
                    const nx = dx / distance;
                    const ny = dy / distance;
                    const rvx = playerA.vx - playerB.vx;
                    const rvy = playerA.vy - playerB.vy;
                    const velAlongNormal = rvx * nx + rvy * ny;

                    if (velAlongNormal > 0) continue; // Already moving apart

                    const impulse = -(1 + GAME_CONSTANTS.COLLISION.ELASTICITY) * velAlongNormal;
                    const impulseX = impulse * nx;
                    const impulseY = impulse * ny;

                    playerA.vx += impulseX;
                    playerA.vy += impulseY;
                    playerB.vx -= impulseX;
                    playerB.vy -= impulseY;

                    // 3. Handle Crystal Dropping
                    let loser = null, winner = null;
                    if (playerA.level > playerB.level) {
                        loser = playerB; winner = playerA;
                    } else if (playerB.level > playerA.level) {
                        loser = playerA; winner = playerB;
                    } else {
                        // Levels are equal, decide by speed. Add a small tolerance to prevent ties from random floating point inaccuracies.
                        const speedA = Math.sqrt(playerA.vx * playerA.vx + playerA.vy * playerA.vy);
                        const speedB = Math.sqrt(playerB.vx * playerB.vx + playerB.vy * playerB.vy);
                        
                        if (speedA > speedB + 1) { // Player A is clearly faster
                            loser = playerB;
                            winner = playerA;
                        } else if (speedB > speedA + 1) { // Player B is clearly faster
                            loser = playerA;
                            winner = playerB;
                        }
                        // Otherwise, speeds are too similar; it's a draw, no crystals dropped.
                    }

                    // Only proceed with crystal dropping if there was a clear loser
                    if (loser) {
                        const dropReduction = loser.crystalDropReduction || 0;
                        const crystalsToDrop = Math.max(0, GAME_CONSTANTS.COLLISION.CRYSTAL_DROP_COUNT - dropReduction);
                        const actualDropCount = Math.min(loser.crystalsCollected, crystalsToDrop);
                        
                        const droppedCrystals = [];
                        if (actualDropCount > 0) {
                            loser.crystalsCollected -= actualDropCount;
                            loser.totalCrystalsDropped = (loser.totalCrystalsDropped || 0) + actualDropCount;
                            
                            // Check for level down
                            const previousLevel = loser.level;
                            let newLevel = 1;
                            if (loser.crystalsCollected >= GAME_CONSTANTS.LEVELS.THRESHOLDS[3]) newLevel = 4;
                            else if (loser.crystalsCollected >= GAME_CONSTANTS.LEVELS.THRESHOLDS[2]) newLevel = 3;
                            else if (loser.crystalsCollected >= GAME_CONSTANTS.LEVELS.THRESHOLDS[1]) newLevel = 2;
                            loser.level = newLevel;

                            if (loser.level < previousLevel) {
                                if (loser.level < GAME_CONSTANTS.ABILITIES.BURST.UNLOCK_LEVEL) loser.abilities.burst.available = false;
                                if (loser.level < GAME_CONSTANTS.ABILITIES.WALL.UNLOCK_LEVEL) loser.abilities.wall.available = false;
                            }

                            // Spawn dropped crystals
                            for (let k = 0; k < actualDropCount; k++) {
                                const angle = Math.random() * Math.PI * 2;
                                const scatterRadius = GAME_CONSTANTS.COLLISION.CRYSTAL_SCATTER_RADIUS * (0.5 + Math.random() * 0.5);
                                const crystalId = 'crystal_' + crystalIdCounter++;
                                
                                const newCrystal = {
                                    id: crystalId,
                                    x: loser.x + Math.cos(angle) * scatterRadius,
                                    y: loser.y + Math.sin(angle) * scatterRadius,
                                    isPowerCrystal: false,
                                    value: GAME_CONSTANTS.POINTS_PER_CRYSTAL
                                };
                                this.gameState.crystals[crystalId] = newCrystal;
                                droppedCrystals.push(newCrystal);
                                io.to(this.id).emit('crystalSpawned', newCrystal);
                            }
                        }
                        
                        // 5. Emit Collision Event to Clients (only if there's a loser)
                        const impactSpeed = Math.abs(velAlongNormal);
                        io.to(this.id).emit('collision', {
                            players: [playerA.id, playerB.id],
                            position: { x: playerA.x + dx / 2, y: playerA.y + dy / 2 },
                            impactSpeed: impactSpeed,
                            droppedCrystalIds: droppedCrystals.map(c => c.id),
                            loserId: loser.id
                        });
                    }

                    // 4. Apply Collision Immunity regardless of who lost crystals
                    playerA.collisionImmunity = GAME_CONSTANTS.COLLISION.IMMUNITY_DURATION;
                    playerB.collisionImmunity = GAME_CONSTANTS.COLLISION.IMMUNITY_DURATION;
                }
            }
        }
    }
    
    spawnOrb() {
        const orbId = 'orb_' + orbIdCounter++;
        this.gameState.orbs[orbId] = {
            id: orbId,
            x: Math.random() * (GAME_CONSTANTS.WORLD_WIDTH - 100) + 50,
            y: Math.random() * (GAME_CONSTANTS.WORLD_HEIGHT - 100) + 50
        };
        io.to(this.id).emit('orbSpawned', this.gameState.orbs[orbId]);
    }
    
    spawnCrystal() {
        const crystalId = 'crystal_' + crystalIdCounter++;
        const isPowerCrystal = Math.random() < GAME_CONSTANTS.POWER_CRYSTAL_CHANCE;
        
        // Assign crystal type - 40% chance of being the target crystal, 60% chance of being a decoy
        let crystalType;
        if (!isPowerCrystal && Math.random() < 0.4) {
            // Make it the target crystal
            crystalType = this.gameState.targetCrystalType;
        } else {
            // Make it a random crystal type (could still randomly be the target)
            const typeIndex = Math.floor(Math.random() * this.gameState.crystalTypes.length);
            crystalType = this.gameState.crystalTypes[typeIndex];
        }
        
        // Check if this crystal is the target type
        const isTargetCrystal = crystalType === this.gameState.targetCrystalType;
        
        this.gameState.crystals[crystalId] = {
            id: crystalId,
            x: Math.random() * (GAME_CONSTANTS.WORLD_WIDTH - 100) + 50,
            y: Math.random() * (GAME_CONSTANTS.WORLD_HEIGHT - 100) + 50,
            isPowerCrystal: isPowerCrystal,
            crystalType: crystalType,
            isTargetCrystal: isTargetCrystal,
            value: isPowerCrystal ? GAME_CONSTANTS.POINTS_PER_POWER_CRYSTAL : GAME_CONSTANTS.POINTS_PER_CRYSTAL
        };
        io.to(this.id).emit('crystalSpawned', this.gameState.crystals[crystalId]);
    }
    
    broadcastGameState() {
        // Get all sockets in this room
        const roomSockets = io.sockets.adapter.rooms.get(this.id);
        if (!roomSockets) return;
        
        // Send game state to each player with their specific ID
        roomSockets.forEach(socketId => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket && socket.playerId) {
                socket.emit('gameState', {
                    myId: socket.playerId,
                    players: this.gameState.players,
                    orbs: this.gameState.orbs,
                    crystals: this.gameState.crystals,
                    gameTime: this.gameState.gameTime,
                    gamePhase: this.gameState.gamePhase,
                    warmupTime: this.gameState.warmupTime,
                    nebulaCore: this.gameState.nebulaCore,
                    currentRound: this.gameState.currentRound,
                    seriesScores: this.gameState.seriesScores,
                    targetCrystalType: this.gameState.targetCrystalType
                });
            }
        });
    }
    
    endGame(winnerId = null, winType = null) {
        this.gameState.gameStarted = false;
        this.gameState.gamePhase = 'ended';
        
        // Stop update loops
        this.stopUpdateLoop();
        
        // Determine winner if not already set
        if (!winnerId && !winType) {
            // Time limit reached - find highest scorer
            const sortedPlayers = Object.values(this.gameState.players)
                .sort((a, b) => b.crystalsCollected - a.crystalsCollected);
            if (sortedPlayers.length > 0) {
                winnerId = sortedPlayers[0].id;
                winType = GAME_CONSTANTS.WIN_TYPES.TIME_LIMIT;
            }
        }
        
        this.gameState.winner = winnerId;
        this.gameState.winType = winType;
        
        // Track round winner
        if (winnerId) {
            this.gameState.roundWinners.push(winnerId);
            this.gameState.seriesScores[winnerId] = (this.gameState.seriesScores[winnerId] || 0) + 1;
        }
        
        const playerResults = Object.values(this.gameState.players)
            .sort((a, b) => b.crystalsCollected - a.crystalsCollected)
            .map(player => ({
                id: player.id,
                name: player.name,
                score: player.score,
                crystalsCollected: player.crystalsCollected,
                level: player.level
            }));
        
        // Check if series is over
        const seriesWinner = Object.entries(this.gameState.seriesScores).find(([id, wins]) => wins >= 3);
        const isSeriesOver = seriesWinner || this.gameState.currentRound >= this.gameState.totalRounds;
        
        io.to(this.id).emit('gameEnded', {
            players: playerResults,
            winner: winnerId,
            winType: winType,
            currentRound: this.gameState.currentRound,
            totalRounds: this.gameState.totalRounds,
            seriesScores: this.gameState.seriesScores,
            isSeriesOver: isSeriesOver,
            seriesWinner: seriesWinner ? seriesWinner[0] : null
        });
        
        // Clear game objects
        this.gameState.orbs = {};
        this.gameState.crystals = {};
        this.gameState.gameTime = 0;
    }
    
    startNextRound() {
        if (this.gameState.gamePhase !== 'ended') return;

        this.gameState.currentRound++;
        
        // Set target crystal type for the new round (deterministic based on round number)
        const targetIndex = (this.gameState.currentRound - 1) % this.gameState.crystalTypes.length;
        this.gameState.targetCrystalType = this.gameState.crystalTypes[targetIndex];
        console.log(`[ROOM ${this.id}] Round ${this.gameState.currentRound} - Target crystal: ${this.gameState.targetCrystalType}`);
        
        // Reset game phase and timers
        this.gameState.gameStarted = true;
        this.gameState.gamePhase = 'warmup';
        this.gameState.warmupTime = GAME_CONSTANTS.WIN_CONDITIONS.WARMUP_DURATION;
        this.gameState.gameTime = GAME_CONSTANTS.WIN_CONDITIONS.GAME_DURATION;
        this.gameState.winner = null;
        this.gameState.winType = null;
        this.gameState.playersReady = {}; // Reset ready state

        // Initialize game objects for this room
        this.initializeOrbs();
        this.initializeCrystals();
        
        // Reset player positions and stats for the new round
        for (const playerId in this.gameState.players) {
            const player = this.gameState.players[playerId];
            player.score = 0;
            player.crystalsCollected = 0;
            player.level = 1;
            player.abilities.burst.available = false;
            player.abilities.burst.cooldown = 0;
            player.abilities.wall.available = false;
            player.abilities.wall.cooldown = 0;
            player.energy = GAME_CONSTANTS.ENERGY.MAX;
            player.energyRegenTimer = 0;
            player.walls = [];
            player.collisionImmunity = 0;
            player.x = Math.random() * GAME_CONSTANTS.WORLD_WIDTH;
            player.y = Math.random() * GAME_CONSTANTS.WORLD_HEIGHT;
            player.vx = 0;
            player.vy = 0;
            player.ax = 0;
            player.ay = 0;
        }

        // Notify clients to start next round
        io.to(this.id).emit('nextRoundStart', {
            currentRound: this.gameState.currentRound
        });

        // Restart the room's update loop
        this.startUpdateLoop();
    }
    
    initializeOrbs() {
        for (let i = 0; i < GAME_CONSTANTS.ORB_COUNT; i++) {
            const orbId = 'orb_' + orbIdCounter++;
            this.gameState.orbs[orbId] = {
                id: orbId,
                x: Math.random() * (GAME_CONSTANTS.WORLD_WIDTH - 100) + 50,
                y: Math.random() * (GAME_CONSTANTS.WORLD_HEIGHT - 100) + 50
            };
        }
    }
    
    initializeCrystals() {
        const crystalCount = Math.floor(Math.random() * 
            (GAME_CONSTANTS.CRYSTAL_COUNT_MAX - GAME_CONSTANTS.CRYSTAL_COUNT_MIN + 1)) + 
            GAME_CONSTANTS.CRYSTAL_COUNT_MIN;
        
        for (let i = 0; i < crystalCount; i++) {
            const crystalId = 'crystal_' + crystalIdCounter++;
            const isPowerCrystal = Math.random() < GAME_CONSTANTS.POWER_CRYSTAL_CHANCE;
            
            this.gameState.crystals[crystalId] = {
                id: crystalId,
                x: Math.random() * (GAME_CONSTANTS.WORLD_WIDTH - 100) + 50,
                y: Math.random() * (GAME_CONSTANTS.WORLD_HEIGHT - 100) + 50,
                isPowerCrystal: isPowerCrystal,
                value: isPowerCrystal ? GAME_CONSTANTS.POINTS_PER_POWER_CRYSTAL : GAME_CONSTANTS.POINTS_PER_CRYSTAL
            };
        }
    }
}

function createRoom(hostSocketId) {
    const roomId = `room_${roomIdCounter++}`;
    const room = new Room(roomId, hostSocketId);
    rooms.set(roomId, room);
    return room;
}

function getRoomList() {
    const roomList = [];
    for (const [roomId, room] of rooms) {
        const hostPlayer = Object.values(room.players).find(p => p.socketId === room.hostSocketId);
        roomList.push({
            id: roomId,
            playerCount: Object.keys(room.players).length,
            maxPlayers: 8,
            status: room.gameState.gamePhase === 'waiting' ? 'waiting' : 
                    room.gameState.gamePhase === 'warmup' ? 'starting' :
                    room.gameState.gamePhase === 'playing' ? 'playing' : 'ended',
            hostId: room.hostSocketId,
            hostName: hostPlayer ? hostPlayer.name : 'Unknown'
        });
    }
    return roomList;
}

// Legacy functions removed - all game logic now handled per-room


io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    socket.playerId = null;
    socket.roomId = null;
    
    // Send room list when player connects
    socket.on('getRoomList', () => {
        socket.emit('roomList', getRoomList());
    });
    
    // Create a new room
    socket.on('createRoom', (data) => {
        const room = createRoom(socket.id);
        const playerId = 'player_' + playerIdCounter++;
        
        console.log(`[CREATE ROOM] Socket ${socket.id} creating room ${room.id}`);
        console.log(`[CREATE ROOM] Player name: ${data.playerName}, Player ID: ${playerId}`);
        
        const playerData = {
            id: playerId,
            socketId: socket.id,
            name: data.playerName || 'Player ' + playerIdCounter,
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
            collisionImmunity: 0,
            // Upgrade properties
            speedMultiplier: 1,
            crystalDropReduction: 0,
            energyCostReduction: 0,
            dragModifier: 1,
            hasCrystalCorruption: false,
            crystalStealBonus: 0,
            // Stats tracking
            totalCrystalsDropped: 0,
            totalDamageDealt: 0,
            totalDistanceTraveled: 0,
            abilitiesUsed: 0
        };
        
        room.addPlayer(playerId, playerData);
        socket.playerId = playerId;
        socket.roomId = room.id;
        socket.join(room.id);
        
        socket.emit('roomCreated', { roomId: room.id, playerId: playerId });
        
        // Send player list after a brief delay to ensure scene transition
        setTimeout(() => {
            socket.emit('playerList', Object.values(room.players).map(p => ({
                id: p.id,
                name: p.name,
                color: p.color
            })));
        }, 100);
        
        // Notify all clients about new room
        io.emit('roomListUpdate', getRoomList());
    });
    
    // Join an existing room
    socket.on('joinRoom', (data) => {
        const room = rooms.get(data.roomId);
        console.log(`[JOIN ROOM] Socket ${socket.id} joining room ${data.roomId}`);
        console.log(`[JOIN ROOM] Player name: ${data.playerName}`);
        
        if (!room) {
            socket.emit('joinRoomError', { message: 'Room not found' });
            return;
        }
        
        if (room.gameState.gamePhase !== 'waiting') {
            socket.emit('joinRoomError', { message: 'Game already in progress' });
            return;
        }
        
        if (Object.keys(room.players).length >= 8) {
            socket.emit('joinRoomError', { message: 'Room is full' });
            return;
        }
        
        const playerId = 'player_' + playerIdCounter++;
        console.log(`[JOIN ROOM] Assigned Player ID: ${playerId}`);
        
        const playerData = {
            id: playerId,
            socketId: socket.id,
            name: data.playerName || 'Player ' + playerIdCounter,
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
            collisionImmunity: 0,
            // Upgrade properties
            speedMultiplier: 1,
            crystalDropReduction: 0,
            energyCostReduction: 0,
            dragModifier: 1,
            hasCrystalCorruption: false,
            crystalStealBonus: 0,
            // Stats tracking
            totalCrystalsDropped: 0,
            totalDamageDealt: 0,
            totalDistanceTraveled: 0,
            abilitiesUsed: 0
        };
        
        room.addPlayer(playerId, playerData);
        socket.playerId = playerId;
        socket.roomId = room.id;
        socket.join(room.id);
        
        socket.emit('roomJoined', { roomId: room.id, playerId: playerId });
        
        // Notify all players in room
        io.to(room.id).emit('playerList', Object.values(room.players).map(p => ({
            id: p.id,
            name: p.name,
            color: p.color
        })));
        
        // Update room list for all clients
        io.emit('roomListUpdate', getRoomList());
    });
    
    // Leave current room
    socket.on('leaveRoom', () => {
        if (socket.roomId && socket.playerId) {
            const room = rooms.get(socket.roomId);
            if (room) {
                socket.leave(socket.roomId);
                const shouldRemoveRoom = room.removePlayer(socket.playerId);
                
                if (shouldRemoveRoom) {
                    rooms.delete(socket.roomId);
                } else {
                    // Notify remaining players
                    io.to(room.id).emit('playerLeft', socket.playerId);
                    io.to(room.id).emit('playerList', Object.values(room.players).map(p => ({
                        id: p.id,
                        name: p.name,
                        color: p.color
                    })));
                }
                
                // Update room list for all clients
                io.emit('roomListUpdate', getRoomList());
            }
            
            socket.roomId = null;
            socket.playerId = null;
        }
    });
    
    // Handle request for player list
    socket.on('requestPlayerList', () => {
        if (socket.roomId) {
            const room = rooms.get(socket.roomId);
            if (room) {
                socket.emit('playerList', Object.values(room.players).map(p => ({
                    id: p.id,
                    name: p.name,
                    color: p.color,
                    isHost: p.socketId === room.hostSocketId
                })));
            }
        }
    });
    
    socket.on('startGame', () => {
        console.log(`[START GAME] Socket ${socket.id} attempting to start game`);
        console.log(`[START GAME] Room ID: ${socket.roomId}, Player ID: ${socket.playerId}`);
        
        if (!socket.roomId || !socket.playerId) {
            console.error(`[START GAME] Missing roomId or playerId`);
            return;
        }
        
        const room = rooms.get(socket.roomId);
        if (!room) {
            console.error(`[START GAME] Room not found`);
            return;
        }
        
        console.log(`[START GAME] Host socket: ${room.hostSocketId}, Current socket: ${socket.id}`);
        console.log(`[START GAME] Players in room:`, Object.keys(room.players));
        
        // Only host can start the game
        if (room.hostSocketId !== socket.id) {
            console.log(`[START GAME] Non-host tried to start game`);
            socket.emit('error', { message: 'Only the host can start the game' });
            return;
        }
        
        // Need minimum players
        if (Object.keys(room.players).length < 2) {
            console.log(`[START GAME] Not enough players: ${Object.keys(room.players).length}`);
            socket.emit('error', { message: 'Need at least 2 players to start' });
            return;
        }
        
        if (!room.gameState.gameStarted) {
            console.log(`[START GAME] Starting game for room ${room.id}`);
            room.startGame();
            io.to(room.id).emit('gameStart');
            
            // Update room list for all clients
            io.emit('roomListUpdate', getRoomList());
        }
    });
    
    socket.on('enterArena', () => {
        console.log(`[ENTER ARENA] Socket ${socket.id} entering arena`);
        console.log(`[ENTER ARENA] Room ID: ${socket.roomId}, Player ID: ${socket.playerId}`);
        
        if (!socket.roomId || !socket.playerId) {
            console.error(`[ENTER ARENA] Missing roomId or playerId for socket ${socket.id}`);
            return;
        }
        
        const room = rooms.get(socket.roomId);
        if (!room) {
            console.error(`[ENTER ARENA] Room ${socket.roomId} not found`);
            return;
        }
        
        console.log(`[ENTER ARENA] Room state - Phase: ${room.gameState.gamePhase}, Players: ${Object.keys(room.gameState.players).length}`);
        console.log(`[ENTER ARENA] Orbs: ${Object.keys(room.gameState.orbs).length}, Crystals: ${Object.keys(room.gameState.crystals).length}`);
        
        socket.emit('gameState', {
            myId: socket.playerId,
            players: room.gameState.players,
            orbs: room.gameState.orbs,
            crystals: room.gameState.crystals,
            gameTime: room.gameState.gameTime,
            gamePhase: room.gameState.gamePhase,
            warmupTime: room.gameState.warmupTime,
            nebulaCore: room.gameState.nebulaCore
        });
    });
    
    socket.on('playerMove', (data) => {
        try {
            if (!socket.roomId || !socket.playerId) return;
            
            const room = rooms.get(socket.roomId);
            if (!room || !room.gameState.players[socket.playerId]) {
                console.warn(`Invalid player move from ${socket.id}`);
                return;
            }
            
            room.gameState.players[socket.playerId].ax = data.ax || 0;
            room.gameState.players[socket.playerId].ay = data.ay || 0;
        } catch (error) {
            console.error('[playerMove] Error:', error);
        }
    });
    
    socket.on('useAbility', (data) => {
        // Get the correct room and its game state
        if (!socket.roomId || !socket.playerId) return;
        const room = rooms.get(socket.roomId);
        if (!room || !room.gameState.gameStarted) return;

        const player = room.gameState.players[socket.playerId];
        if (!player) return;
        
        const abilityName = typeof data === 'string' ? data : data.type;
        const ability = player.abilities[abilityName];
        if (!ability || !ability.available || ability.cooldown > 0) return;
        
        // Check energy
        const energyCost = GAME_CONSTANTS.ABILITIES[abilityName.toUpperCase()].ENERGY_COST;
        if (player.energy < energyCost) return;
        
        // Track ability usage
        player.abilitiesUsed = (player.abilitiesUsed || 0) + 1;
        
        // Apply energy cost reduction from upgrades
        const reduction = player.energyCostReduction || 0;
        const actualEnergyCost = Math.floor(energyCost * (1 - reduction));
        
        // Check if player has enough energy with reduction
        if (player.energy < actualEnergyCost) return;
        
        switch(abilityName) {
            case 'burst':
                // Deduct energy and set cooldown
                player.energy -= actualEnergyCost;
                player.energyRegenTimer = GAME_CONSTANTS.ENERGY.REGEN_DELAY;
                ability.cooldown = GAME_CONSTANTS.ABILITIES.BURST.COOLDOWN;
                
                // Apply burst effect - push nearby players and make them drop crystals
                const burstRadius = GAME_CONSTANTS.ABILITIES.BURST.RADIUS;
                const burstForce = GAME_CONSTANTS.ABILITIES.BURST.FORCE_BASE * 
                                 Math.pow(GAME_CONSTANTS.ABILITIES.BURST.FORCE_SCALE, player.level - 1);
                
                for (const targetId in room.gameState.players) {
                    if (targetId === socket.playerId) continue;
                    
                    const target = room.gameState.players[targetId];
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
                            
                            room.gameState.crystals[crystalId] = {
                                id: crystalId,
                                x: target.x + Math.cos(angle) * radius,
                                y: target.y + Math.sin(angle) * radius,
                                isPowerCrystal: false,
                                value: GAME_CONSTANTS.POINTS_PER_CRYSTAL
                            };
                            
                            io.to(room.id).emit('crystalSpawned', room.gameState.crystals[crystalId]);
                        }
                        
                        // Notify about crystal drop
                        io.to(room.id).emit('crystalsDropped', {
                            playerId: targetId,
                            count: dropCount,
                            position: { x: target.x, y: target.y }
                        });
                    }
                }
                
                // Destroy nearby walls
                for (const otherPlayerId in room.gameState.players) {
                    const otherPlayer = room.gameState.players[otherPlayerId];
                    otherPlayer.walls = otherPlayer.walls.filter(wall => {
                        const dx = wall.x - player.x;
                        const dy = wall.y - player.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < burstRadius) {
                            io.to(room.id).emit('wallDestroyed', { wallId: wall.id, playerId: otherPlayerId });
                            return false;
                        }
                        return true;
                    });
                }
                
                // Notify all players in the room
                io.to(room.id).emit('abilityUsed', {
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
                    io.to(room.id).emit('wallDestroyed', { wallId: oldWall.id, playerId: socket.playerId });
                }
                
                // Deduct energy and set cooldown (with reduction)
                player.energy -= actualEnergyCost;
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
                
                // Notify all players in the room
                io.to(room.id).emit('abilityUsed', {
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
        // Get the room
        if (!socket.roomId || !socket.playerId) return;
        const room = rooms.get(socket.roomId);
        if (!room) return;
        
        // Reset series tracking when returning to lobby
        if (room.gameState.gamePhase === 'ended' && room.gameState.currentRound > 0) {
            // Check if series is actually over
            const seriesWinner = Object.entries(room.gameState.seriesScores).find(([id, wins]) => wins >= 3);
            const isSeriesOver = seriesWinner || room.gameState.currentRound >= room.gameState.totalRounds;
            
            if (isSeriesOver) {
                // Reset series tracking for new game
                room.gameState.currentRound = 0;
                room.gameState.roundWinners = [];
                room.gameState.playerUpgrades = {};
                room.gameState.seriesScores = {};
            }
        }
        
        const playerList = Object.values(room.gameState.players).map(p => ({
            id: p.id,
            name: p.name
        }));
        socket.emit('playerList', playerList);
    });
    
    socket.on('selectUpgrade', (data) => {
        // Get the room
        if (!socket.roomId || !socket.playerId) return;
        const room = rooms.get(socket.roomId);
        if (!room) return;
        
        // Store player's upgrade
        if (!room.gameState.playerUpgrades[socket.playerId]) {
            room.gameState.playerUpgrades[socket.playerId] = [];
        }
        room.gameState.playerUpgrades[socket.playerId].push({
            upgradeId: data.upgradeId,
            round: room.gameState.currentRound
        });
        
        // Apply upgrade effects
        const player = room.gameState.players[socket.playerId];
        if (player) {
            let logMessage = `[UPGRADE] Player ${player.name} (${socket.playerId}) applied '${data.upgradeId}'.`;
            switch(data.upgradeId) {
                // --- UPGRADES ---
                case 'kinetic_plating':
                    player.crystalDropReduction = (player.crystalDropReduction || 0) + 2;
                    logMessage += ` New crystalDropReduction: ${player.crystalDropReduction}`;
                    break;
                case 'warp_coil':
                    player.speedMultiplier = (player.speedMultiplier || 1) * 1.15;
                    logMessage += ` New speedMultiplier: ${player.speedMultiplier.toFixed(2)}`;
                    break;
                case 'efficiency_matrix':
                    player.energyCostReduction = (player.energyCostReduction || 0) + 0.2;
                    logMessage += ` New energyCostReduction: ${player.energyCostReduction.toFixed(2)}`;
                    break;
                // --- CURSES ---
                case 'unstable_thrusters':
                    player.dragModifier = (player.dragModifier || 1) * 0.95; // Less drag = more slidey
                    logMessage += ` New dragModifier: ${player.dragModifier.toFixed(2)}`;
                    break;
                case 'crystal_corruption':
                    player.hasCrystalCorruption = true;
                    logMessage += ` Player now has Crystal Corruption.`;
                    break;
                case 'glass_cannon':
                    // Note: a negative reduction means you lose MORE crystals.
                    player.crystalDropReduction = (player.crystalDropReduction || 0) - 2;
                    logMessage += ` Player is now a Glass Cannon.`;
                    break;
            }
            console.log(logMessage);
        }
        
        // The check for starting the next round is now handled by the 'readyForNextRound' event.
    });
    
    socket.on('readyForNextRound', () => {
        // Get the room
        if (!socket.roomId || !socket.playerId) return;
        const room = rooms.get(socket.roomId);
        if (!room) return;
        
        // Mark player as ready for next round
        if (!room.gameState.playersReady) {
            room.gameState.playersReady = {};
        }
        room.gameState.playersReady[socket.playerId] = true;
        
        // Check if all players are ready
        const activePlayers = Object.keys(room.gameState.players).length;
        const readyPlayers = Object.keys(room.gameState.playersReady).length;
        
        if (readyPlayers >= activePlayers) {
            room.startNextRound();
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        
        if (socket.roomId && socket.playerId) {
            const room = rooms.get(socket.roomId);
            if (room) {
                const shouldRemoveRoom = room.removePlayer(socket.playerId);
                
                if (shouldRemoveRoom) {
                    rooms.delete(socket.roomId);
                } else {
                    // Notify remaining players
                    io.to(room.id).emit('playerLeft', socket.playerId);
                    io.to(room.id).emit('playerList', Object.values(room.players).map(p => ({
                        id: p.id,
                        name: p.name
                    })));
                }
                
                // Update room list for all clients
                io.emit('roomListUpdate', getRoomList());
            }
        }
    });
    
    // Performance monitoring endpoint
    socket.on('getPerformanceStats', () => {
        socket.emit('performanceStats', performanceMonitor.getStats());
    });
});

// Legacy functions removed - all game logic now handled per-room

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