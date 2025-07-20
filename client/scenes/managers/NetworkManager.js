import { GAME_CONSTANTS } from '../../../shared/constants.js';

export default class NetworkManager {
    constructor(scene) {
        this.scene = scene;
        this.socket = scene.game.socket;
    }

    create() {
        if (this.socket) {
            this.setupSocketListeners();
            this.socket.emit('enterArena');
        }
    }

    setupSocketListeners() {
        this.socket.on('gameState', (data) => this.handleGameState(data));
        this.socket.on('gameStateDelta', (delta) => this.handleGameStateDelta(delta));
        this.socket.on('playerJoined', (player) => this.scene.events.emit('playerJoined', player));
        this.socket.on('playerLeft', (playerId) => this.scene.events.emit('playerLeft', playerId));
        this.socket.on('orbCollected', (data) => this.scene.events.emit('orbCollected', data));
        this.socket.on('crystalCollected', (data) => this.scene.events.emit('crystalCollected', data));
        this.socket.on('crystalSpawned', (crystal) => this.scene.events.emit('crystalSpawned', crystal));
        this.socket.on('playerLevelUp', (data) => this.scene.events.emit('playerLevelUp', data));
        this.socket.on('abilityUsed', (data) => this.scene.events.emit('serverAbilityUsed', data));
        this.socket.on('wallDestroyed', (wallId) => this.scene.events.emit('wallDestroyed', wallId));
        this.socket.on('collision', (data) => this.scene.events.emit('collision', data));
        this.socket.on('gameEnded', (results) => this.scene.events.emit('gameEnded', results));
        this.socket.on('nextRoundStart', (data) => this.scene.events.emit('nextRoundStart', data));
        this.socket.on('warmupEnd', () => this.scene.events.emit('warmupEnd'));
        this.socket.on('nebulaCore', (data) => this.scene.events.emit('nebulaCoreUpdate', data));
        this.socket.on('connect', () => this.scene.events.emit('connectionUpdate', true));
        this.socket.on('disconnect', () => this.scene.events.emit('connectionUpdate', false));
    }

    handleGameState(data) {
        this.scene.events.emit('gameStateUpdate', data);
    }

    handleGameStateDelta(delta) {
        // For now, treat delta as a full state update. Can be optimized later.
        this.scene.events.emit('gameStateUpdate', delta);
    }

    sendPlayerMove(moveData) {
        if (this.socket) this.socket.emit('playerMove', moveData);
    }

    sendUseAbility(abilityData) {
        if (this.socket) this.socket.emit('useAbility', abilityData);
    }

    destroy() {
        if (this.socket) {
            this.socket.off('gameState');
            this.socket.off('gameStateDelta');
            this.socket.off('playerJoined');
            this.socket.off('playerLeft');
            this.socket.off('orbCollected');
            this.socket.off('crystalCollected');
            this.socket.off('crystalSpawned');
            this.socket.off('playerLevelUp');
            this.socket.off('abilityUsed');
            this.socket.off('wallDestroyed');
            this.socket.off('collision');
            this.socket.off('gameEnded');
            this.socket.off('nextRoundStart');
            this.socket.off('warmupEnd');
            this.socket.off('nebulaCore');
            this.socket.off('connect');
            this.socket.off('disconnect');
        }
    }
}