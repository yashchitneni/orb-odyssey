class EndScreenScene extends BaseScene {
    constructor() {
        super({ key: 'EndScreenScene' });
        this.audioManager = null;
    }

    init(data) {
        this.results = data.results || [];
        this.winner = data.winner || null;
        this.winType = data.winType || null;
        this.isPlayerWinner = data.isPlayerWinner || false;
        this.isFinalScreen = data.isFinalScreen || false;
        this.seriesScores = data.seriesScores || {};
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
        this.add.rectangle(ScaleHelper.centerX(), ScaleHelper.centerY(), ScaleHelper.width(), ScaleHelper.height(), 0x000033);
        
        // Victory title based on win type and whether it's final
        const titleText = this.isFinalScreen ? 'SERIES COMPLETE!' : this.getVictoryTitle();
        this.add.text(ScaleHelper.centerX(), ScaleHelper.y(60), titleText, { 
            fontSize: ScaleHelper.font('48px'), 
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
                this.add.text(ScaleHelper.centerX(), ScaleHelper.y(120), winText, { 
                    fontSize: ScaleHelper.font('36px'), 
                    fill: '#ffd700',
                    fontWeight: 'bold'
                }).setOrigin(0.5);
            }
        }
        
        // Story wrap-up
        const storyText = this.getStoryWrapUp();
        this.add.text(ScaleHelper.centerX(), ScaleHelper.y(170), storyText, { 
            fontSize: ScaleHelper.font('18px'), 
            fill: '#aaa',
            align: 'center',
            wordWrap: { width: ScaleHelper.x(600) }
        }).setOrigin(0.5);

        // Show series scores if it's the final screen
        let yPos = ScaleHelper.y(230);
        if (this.isFinalScreen && this.seriesScores) {
            let scoresY = ScaleHelper.y(200);
            this.add.text(ScaleHelper.centerX(), scoresY, 'Series Results:', { 
                fontSize: ScaleHelper.font('32px'), 
                fill: '#fff',
                fontWeight: 'bold'
            }).setOrigin(0.5);
            
            scoresY += ScaleHelper.y(40);
            const sortedScores = Object.entries(this.seriesScores).sort((a, b) => b[1] - a[1]);
            
            sortedScores.forEach(([playerId, wins], index) => {
                const player = this.results.find(p => p.id === playerId);
                if (player) {
                    const medal = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                    const text = `${medal} ${player.name}: ${wins} rounds won`;
                    
                    this.add.text(ScaleHelper.centerX(), scoresY, text, { 
                        fontSize: ScaleHelper.font('24px'), 
                        fill: index === 0 ? '#ffd700' : '#fff',
                        fontWeight: index === 0 ? 'bold' : 'normal'
                    }).setOrigin(0.5);
                    
                    scoresY += ScaleHelper.y(35);
                }
            });
            
            scoresY += ScaleHelper.y(20);
            yPos = scoresY;
        }
        
        this.add.text(ScaleHelper.centerX(), yPos, this.isFinalScreen ? 'Stats from Final Round:' : 'Final Results:', {
            fontSize: ScaleHelper.font('28px'), 
            fill: '#fff' 
        }).setOrigin(0.5);

        yPos = yPos + ScaleHelper.y(50);
        this.results.forEach((player, index) => {
            const isWinner = player.id === this.winner;
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
            const text = `${medal} ${player.name}: ${player.crystalsCollected} crystals (Level ${player.level})`;
            
            this.add.text(ScaleHelper.centerX(), yPos, text, { 
                fontSize: ScaleHelper.font('24px'), 
                fill: isWinner ? '#ffd700' : '#fff',
                fontWeight: isWinner ? 'bold' : 'normal'
            }).setOrigin(0.5);
            
            yPos += ScaleHelper.y(35);
        });

        const playAgainButton = this.add.text(ScaleHelper.centerX(), ScaleHelper.y(500), 'Play Again', { 
            fontSize: ScaleHelper.font('32px'), 
            fill: '#0f0',
            backgroundColor: '#333',
            padding: { x: ScaleHelper.scale(20), y: ScaleHelper.scale(10) }
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
            
            if (this.isFinalScreen) {
                // Series is over, return to lobby
                this.scene.start('LobbyScene');
            } else {
                // This shouldn't happen - EndScreen should only be shown at series end
                // But as a fallback, go to lobby
                this.scene.start('LobbyScene');
            }
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
                return `${winnerData.name} collected ${GAME_CONSTANTS.WIN_CONDITIONS.CRYSTAL_TARGET} crystals!`;
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