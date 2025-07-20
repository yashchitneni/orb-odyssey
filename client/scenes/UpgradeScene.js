class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
    }

    init(data) {
        // Data passed from the EndScreen
        this.results = data.results || [];
        this.winner = data.winner || null;
        this.winType = data.winType || null;
        this.round = data.round || 1;
        this.playerUpgrades = data.playerUpgrades || {};
        this.seriesScores = data.seriesScores || {};
        this.myPlayerId = this.game.socket?.id || null;
        this.myPlayerId = data.myPlayerId || this.game.socket?.id || null;
        this.roomId = data.roomId;
        this.playerId = data.playerId;
    }

    create() {
        // Background with gradient
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x110022, 0x220033, 0x110022, 0x330044);
        bg.fillRect(0, 0, 800, 600);
        
        // Animated background stars
        this.createStarfield();

        // Title
        this.add.text(400, 60, 'ROUND COMPLETE', { 
            fontSize: '48px', 
            fill: '#ffffff',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Round indicator
        this.add.text(400, 110, `Round ${this.round} of 5`, { 
            fontSize: '24px', 
            fill: '#88ddff'
        }).setOrigin(0.5);

        // Display winner from the previous round
        const winnerData = this.results.find(p => p.id === this.winner);
        if (winnerData) {
            this.add.text(400, 150, `${winnerData.name} wins the round!`, { 
                fontSize: '28px', 
                fill: '#ffd700',
                fontWeight: 'bold'
            }).setOrigin(0.5);
        }
        
        // Show series scores
        let scoresText = 'Series Scores: ';
        Object.entries(this.seriesScores).forEach(([playerId, wins], index) => {
            const player = this.results.find(p => p.id === playerId);
            if (player) {
                scoresText += `${player.name}: ${wins} wins`;
                if (index < Object.keys(this.seriesScores).length - 1) {
                    scoresText += ' | ';
                }
            }
        });
        
        this.add.text(400, 180, scoresText, {
            fontSize: '16px',
            fill: '#88ddff'
        }).setOrigin(0.5);

        // Upgrade selection title
        this.add.text(400, 220, 'Choose Your Upgrade', { 
            fontSize: '32px', 
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // Create upgrade cards
        this.createUpgradeCards();

        // Ready button (disabled until upgrade selected)
        this.readyButton = this.add.text(400, 530, 'Select an Upgrade First', { 
            fontSize: '24px', 
            fill: '#666666',
            backgroundColor: '#222222',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);
        
        // Player stats summary
        this.createStatsSummary();
        
        // Listen for next round start event
        if (this.game.socket) {
            this.game.socket.once('nextRoundStart', (data) => {
                console.log('Next round starting:', data);
                // Transition to game arena with room and player data
                this.scene.start('GameArenaScene', {
                    roomId: this.roomId,
                    playerId: this.playerId
                });
            });
        }
    }

    createStarfield() {
        for (let i = 0; i < 100; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                Phaser.Math.FloatBetween(0.5, 2),
                0xffffff,
                Phaser.Math.FloatBetween(0.2, 0.8)
            );
            
            this.tweens.add({
                targets: star,
                alpha: 0.1,
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createUpgradeCards() {
        const upgrades = [
            {
                id: 'kinetic_plating',
                name: 'KINETIC PLATING',
                description: 'Lose 2 fewer crystals on collision',
                icon: '🛡️',
                color: 0x4444ff
            },
            {
                id: 'warp_coil',
                name: 'WARP COIL',
                description: '+15% movement speed',
                icon: '⚡',
                color: 0xffff00
            },
            {
                id: 'efficiency_matrix',
                name: 'EFFICIENCY MATRIX',
                description: '-20% ability energy cost',
                icon: '🔋',
                color: 0x00ff00
            }
        ];

        const cardWidth = 200;
        const cardHeight = 250;
        const spacing = 20;
        const startX = 400 - (cardWidth * 1.5 + spacing);

        upgrades.forEach((upgrade, index) => {
            const x = startX + index * (cardWidth + spacing);
            const y = 280;

            // Card background
            const card = this.add.graphics();
            card.fillStyle(0x2a2a2a);
            card.fillRoundedRect(x, y, cardWidth, cardHeight, 12);
            card.lineStyle(3, upgrade.color);
            card.strokeRoundedRect(x, y, cardWidth, cardHeight, 12);

            // Icon
            this.add.text(x + cardWidth/2, y + 40, upgrade.icon, {
                fontSize: '48px'
            }).setOrigin(0.5);

            // Name
            this.add.text(x + cardWidth/2, y + 90, upgrade.name, {
                fontSize: '18px',
                fontWeight: 'bold',
                fill: '#ffffff',
                align: 'center',
                wordWrap: { width: cardWidth - 20 }
            }).setOrigin(0.5);

            // Description
            this.add.text(x + cardWidth/2, y + 150, upgrade.description, {
                fontSize: '14px',
                fill: '#cccccc',
                align: 'center',
                wordWrap: { width: cardWidth - 20 }
            }).setOrigin(0.5);

            // Make card interactive
            const hitArea = this.add.rectangle(x + cardWidth/2, y + cardHeight/2, cardWidth, cardHeight, 0x000000, 0);
            hitArea.setInteractive();

            // Hover effects
            hitArea.on('pointerover', () => {
                this.tweens.add({
                    targets: card,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 200
                });
            });

            hitArea.on('pointerout', () => {
                this.tweens.add({
                    targets: card,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 200
                });
            });

            // Selection
            hitArea.on('pointerdown', () => {
                this.selectUpgrade(upgrade);
            });
        });
    }

    createStatsSummary() {
        // Larger stats panel with more info
        const statsX = 50;
        const statsY = 350;
        
        const statsPanel = this.add.graphics();
        statsPanel.fillStyle(0x1a1a1a, 0.8);
        statsPanel.fillRoundedRect(statsX, statsY, 200, 200, 8);
        
        this.add.text(statsX + 100, statsY + 15, 'Your Round Stats', {
            fontSize: '16px',
            fontWeight: 'bold',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // Show detailed stats from the round
        const myStats = this.results.find(p => p.id === this.myPlayerId);
        if (myStats) {
            let statsText = `Crystals Collected: ${myStats.crystalsCollected || 0}
Max Level: ${myStats.maxLevel || myStats.level || 1}
Score: ${myStats.score || 0}`;
            
            // Add additional stats if available
            if (myStats.totalCrystalsDropped !== undefined) {
                statsText += `\nCrystals Lost: ${myStats.totalCrystalsDropped}`;
            }
            if (myStats.abilitiesUsed !== undefined) {
                statsText += `\nAbilities Used: ${myStats.abilitiesUsed}`;
            }
            if (myStats.totalDistanceTraveled !== undefined) {
                const distance = Math.floor(myStats.totalDistanceTraveled / 100);
                statsText += `\nDistance: ${distance}m`;
            }
            
            // Show current upgrades
            if (myStats.upgrades && myStats.upgrades.length > 0) {
                statsText += '\n\nCurrent Upgrades:';
                myStats.upgrades.forEach(upgrade => {
                    const upgradeName = this.getUpgradeName(upgrade.upgradeId);
                    statsText += `\n• ${upgradeName}`;
                });
            }
            
            this.add.text(statsX + 10, statsY + 35, statsText, {
                fontSize: '11px',
                fill: '#aaaaaa',
                lineSpacing: 4,
                wordWrap: { width: 180 }
            });
        }
    }
    
    getUpgradeName(upgradeId) {
        const names = {
            'kinetic_plating': 'Kinetic Plating',
            'warp_coil': 'Warp Coil',
            'efficiency_matrix': 'Efficiency Matrix'
        };
        return names[upgradeId] || upgradeId;
    }

    selectUpgrade(upgrade) {
        this.selectedUpgrade = upgrade;
        
        // Update ready button
        this.readyButton.setText('Ready for Next Round');
        this.readyButton.setFill('#00ff00');
        this.readyButton.setBackgroundColor('#003300');
        this.readyButton.setInteractive();
        
        this.readyButton.off('pointerdown');
        this.readyButton.on('pointerdown', () => {
            this.startNextRound();
        });
        
        // Visual feedback
        this.add.text(400, 490, `Selected: ${upgrade.name}`, {
            fontSize: '18px',
            fill: upgrade.color
        }).setOrigin(0.5);
    }

    startNextRound() {
        if (this.game.socket) {
            // Store the upgrade for this player
            this.game.socket.emit('selectUpgrade', {
                upgradeId: this.selectedUpgrade.id,
                round: this.round
            });
            
            // Wait for server to start next round
            this.readyButton.setText('Waiting for other players...');
            this.readyButton.setFill('#888888');
            this.readyButton.disableInteractive();
        }
    }
}