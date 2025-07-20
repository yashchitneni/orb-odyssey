const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [Preloader, MainMenuScene, LobbyScene, GameArenaScene, EndScreenScene, UpgradeScene]
};

const game = new Phaser.Game(config);

let socket;

function connectToServer() {
    socket = io('http://localhost:3000', {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 5000
    });
    
    socket.on('connect', () => {
        console.log('Connected to server');
        // Notify all scenes about connection
        if (game.scene.getScenes().find(s => s.scene.key === 'LobbyScene')) {
            const lobbyScene = game.scene.getScene('LobbyScene');
            if (lobbyScene && lobbyScene.updateConnectionStatus) {
                lobbyScene.updateConnectionStatus(true);
            }
        }
    });
    
    socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        // Notify all scenes about disconnection
        if (game.scene.getScenes().find(s => s.scene.key === 'LobbyScene')) {
            const lobbyScene = game.scene.getScene('LobbyScene');
            if (lobbyScene && lobbyScene.updateConnectionStatus) {
                lobbyScene.updateConnectionStatus(false);
            }
        }
    });
    
    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
    });
    
    socket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected after', attemptNumber, 'attempts');
    });
    
    socket.on('reconnect_failed', () => {
        console.error('Failed to reconnect to server');
    });
    
    game.socket = socket;
}

connectToServer();