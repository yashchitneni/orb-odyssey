class EndScreenScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndScreenScene' });
        this.audioManager = null;
    }

    init(data) {
        this.results = data.results || [];
        this.winner = data.winner || null;
        this.winType = data.winType || null;
        this.isPlayerWinner = data.isPlayerWinner || false;
    }

    create() {
        // Initialize audio manager
        if (!this.audioManager) {
            this.audioManager = new AudioManager(this);
        }
        
        // Play victory or defeat music based on whether the player won
        if (this.isPlayerWinner) {
            this.audioManager.playMusic('VICTORY');
        } else {
            this.audioManager.playMusic('DEFEAT');
        }
        // Background
        this.add.rectangle(400, 300, 800, 600, 0x000033);
        
        // Victory title based on win type
        const titleText = this.getVictoryTitle();
        this.add.text(400, 60, titleText, { 
            fontSize: '48px', 
            fill: '#fff',
            fontWeight: 'bold',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Winner announcement
        if (this.winner) {
            const winnerData = this.results.find(p => p.id === this.winner);
            if (winnerData) {
                const winText = this.getWinnerText(winnerData);
                this.add.text(400, 120, winText, { 
                    fontSize: '36px', 
                    fill: '#ffd700',
                    fontWeight: 'bold'
                }).setOrigin(0.5);
            }
        }
        
        // Story wrap-up
        const storyText = this.getStoryWrapUp();
        this.add.text(400, 170, storyText, { 
            fontSize: '18px', 
            fill: '#aaa',
            align: 'center',
            wordWrap: { width: 600 }
        }).setOrigin(0.5);

        this.add.text(400, 230, 'Final Results:', { 
            fontSize: '28px', 
            fill: '#fff' 
        }).setOrigin(0.5);

        let yPos = 280;
        this.results.forEach((player, index) => {
            const isWinner = player.id === this.winner;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            const text = `${medal} ${player.name}: ${player.crystalsCollected} crystals (Level ${player.level})`;
            
            this.add.text(400, yPos, text, { 
                fontSize: '24px', 
                fill: isWinner ? '#ffd700' : '#fff',
                fontWeight: isWinner ? 'bold' : 'normal'
            }).setOrigin(0.5);
            
            yPos += 35;
        });

        const playAgainButton = this.add.text(400, 500, 'Play Again', { 
            fontSize: '32px', 
            fill: '#0f0',
            backgroundColor: '#333',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        playAgainButton.setInteractive();
        
        // Add hover and click effects with audio
        playAgainButton.on('pointerover', () => {
            this.audioManager.playUISound('hover');
            this.tweens.add({
                targets: playAgainButton,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 200
            });
        });
        
        playAgainButton.on('pointerout', () => {
            this.tweens.add({
                targets: playAgainButton,
                scaleX: 1,
                scaleY: 1,
                duration: 200
            });
        });
        
        playAgainButton.on('pointerdown', () => {
            this.audioManager.playUISound('click');
            this.audioManager.stopMusic();
            this.scene.start('LobbyScene');
        });

        if (this.game.socket) {
            this.game.socket.emit('returnToLobby');
        }
    }
    
    getVictoryTitle() {
        if (!this.winType) return 'Game Over!';
        
        switch (this.winType) {
            case GAME_CONSTANTS.WIN_TYPES.CRYSTALS:
                return 'Crystal Champion!';
            case GAME_CONSTANTS.WIN_TYPES.NEBULA_CONTROL:
                return 'Nebula Master!';
            case GAME_CONSTANTS.WIN_TYPES.TIME_LIMIT:
                return 'Time\'s Up!';
            default:
                return 'Game Over!';
        }
    }
    
    getWinnerText(winnerData) {
        switch (this.winType) {
            case GAME_CONSTANTS.WIN_TYPES.CRYSTALS:
                return `${winnerData.name} collected 100 crystals!`;
            case GAME_CONSTANTS.WIN_TYPES.NEBULA_CONTROL:
                return `${winnerData.name} controlled the Nebula Core!`;
            case GAME_CONSTANTS.WIN_TYPES.TIME_LIMIT:
                return `${winnerData.name} had the most crystals!`;
            default:
                return `${winnerData.name} wins!`;
        }
    }
    
    getStoryWrapUp() {
        switch (this.winType) {
            case GAME_CONSTANTS.WIN_TYPES.CRYSTALS:
                return 'Through sheer determination and skill, the victor gathered enough cosmic energy to transcend the arena!';
            case GAME_CONSTANTS.WIN_TYPES.NEBULA_CONTROL:
                return 'By mastering the ancient Nebula Core, the champion has unlocked the secrets of the cosmos!';
            case GAME_CONSTANTS.WIN_TYPES.TIME_LIMIT:
                return 'As the cosmic storm subsides, the orb with the most energy emerges victorious!';
            default:
                return 'The cosmic battle has ended, and a champion has emerged!';
        }
    }
    
    shutdown() {
        if (this.audioManager) {
            this.audioManager.destroy();
        }
    }
}