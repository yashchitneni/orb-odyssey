const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 800,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [Preloader, MainMenuScene, LobbyScene, GameArenaScene, EndScreenScene, UpgradeScene],
    callbacks: {
        postBoot: function (game) {
            // Add global border effect to all scenes
            game.scene.scenes.forEach(scene => {
                scene.events.on('create', function() {
                    if (scene.createViewportBorder) {
                        scene.createViewportBorder();
                    }
                });
            });
        }
    }
};

const game = new Phaser.Game(config);

let socket;

function connectToServer() {
    // Determine server URL based on environment
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const serverUrl = isDevelopment 
        ? 'http://localhost:3000' 
        : 'https://orb-odyssey-server.onrender.com';
    
    console.log(`Connecting to ${isDevelopment ? 'local' : 'production'} server:`, serverUrl);
    
    socket = io(serverUrl, {
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