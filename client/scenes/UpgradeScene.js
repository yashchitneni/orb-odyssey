class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
    }

    init(data) {
        // Data passed from the previous scene
        this.results = data.results || [];
        this.winner = data.winner || null;
        this.winType = data.winType || null;
        this.round = data.round || 1;
        this.seriesScores = data.seriesScores || {};
        this.myPlayerId = data.myPlayerId || this.game.socket?.id || null;
        this.roomId = data.roomId;
        this.playerId = data.playerId;
    }

    create() {
        this.upgradeCards = [];
        this.selectedCardGlow = null;
        this.selectedUpgrade = null;
        this.currentHoveredCard = null;

        // Try to load nebula background if available
        if (this.textures.exists('nebula')) {
            const nebula = this.add.image(ScaleHelper.centerX(), ScaleHelper.centerY(), 'nebula');
            nebula.setDisplaySize(ScaleHelper.width(), ScaleHelper.height());
            nebula.setAlpha(0.8);
        } else {
            // Fallback gradient background
            const bg = this.add.graphics();
            bg.fillGradientStyle(0x110022, 0x220033, 0x110022, 0x330044);
            bg.fillRect(0, 0, ScaleHelper.width(), ScaleHelper.height());
        }
        
        this.createStarfield();

        // Title
        this.add.text(ScaleHelper.centerX(), ScaleHelper.y(40), 'ROUND COMPLETE', { 
            fontSize: ScaleHelper.font('36px'), 
            fill: '#ffffff',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Round indicator
        this.add.text(ScaleHelper.centerX(), ScaleHelper.y(73), `Round ${this.round} of 5`, { 
            fontSize: ScaleHelper.font('18px'), 
            fill: '#88ddff'
        }).setOrigin(0.5);

        // Display winner from the previous round with personalized message
        const winnerData = this.results.find(p => p.id === this.winner);
        if (winnerData) {
            const winText = winnerData.id === this.myPlayerId ? 'You won the round!' : `${winnerData.name} wins the round!`;
            this.add.text(ScaleHelper.centerX(), ScaleHelper.y(100), winText, {
                fontSize: ScaleHelper.font('20px'), 
                fill: '#ffd700',
                fontWeight: 'bold'
            }).setOrigin(0.5);
        }
        
        // Show series scores
        let scoresText = 'Series Scores: ';
        Object.entries(this.seriesScores).forEach(([playerId, wins], index) => {
            const player = this.results.find(p => p.id === playerId);
            if (player) {
                scoresText += `${player.name}: ${wins}`;
                if (index < Object.keys(this.seriesScores).length - 1) {
                    scoresText += ' | ';
                }
            }
        });
        
        this.add.text(ScaleHelper.centerX(), ScaleHelper.y(120), scoresText, { fontSize: ScaleHelper.font('13px'), fill: '#88ddff' }).setOrigin(0.5);

        const isWinner = this.myPlayerId === this.winner;
        
        const upgradeTitle = isWinner ? 'Choose Your Upgrade' : 'Choose Your Curse';
        this.add.text(ScaleHelper.centerX(), ScaleHelper.y(147), upgradeTitle, {
            fontSize: ScaleHelper.font('24px'), 
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        this.createUpgradeCards(isWinner);

        // Ready button (disabled until upgrade selected) - increased spacing from cards
        this.readyButton = this.add.text(ScaleHelper.centerX(), ScaleHelper.y(460), '← Select an Upgrade/Curse Above →', {
            fontSize: ScaleHelper.font('18px'), 
            fill: '#666666',
            backgroundColor: '#222222',
            padding: { x: ScaleHelper.scale(16), y: ScaleHelper.scale(8) }
        }).setOrigin(0.5);
        
        // Text for selection feedback
        this.selectedUpgradeText = this.add.text(ScaleHelper.centerX(), ScaleHelper.y(430), '', {
            fontSize: ScaleHelper.font('14px'),
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // Player stats summary
        this.createStatsSummary();
        
        if (this.game.socket) {
            this.game.socket.once('nextRoundStart', (data) => {
                this.scene.start('GameArenaScene', {
                    roomId: this.roomId,
                    playerId: this.playerId,
                    round: data.currentRound || this.round + 1
                });
            });
        }
    }

    createStarfield() {
        for (let i = 0; i < 150; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, ScaleHelper.width()), Phaser.Math.Between(0, ScaleHelper.height()),
                Phaser.Math.FloatBetween(0.5, 3), 0xffffff, Phaser.Math.FloatBetween(0.2, 0.8)
            );
            this.tweens.add({
                targets: star, alpha: 0.1, duration: Phaser.Math.Between(1000, 3000),
                yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
            });
        }
    }

    createUpgradeCards(isWinner) {
        const upgrades = [
            { id: 'kinetic_plating', name: 'KINETIC PLATING', description: 'Lose 2 fewer crystals on collision', icon: '🛡️', color: 0x4444ff },
            { id: 'warp_coil', name: 'WARP COIL', description: '+15% movement speed', icon: '⚡', color: 0xffff00 },
            { id: 'efficiency_matrix', name: 'EFFICIENCY MATRIX', description: '-20% ability energy cost', icon: '🔋', color: 0x00ff00 }
        ];

        const curses = [
            { id: 'unstable_thrusters', name: 'UNSTABLE THRUSTERS', description: 'Higher top speed, but less control (more slidey)', icon: '💨', color: 0xff8844 },
            { id: 'crystal_corruption', name: 'CRYSTAL CORRUPTION', description: '15% of crystals are corrupt, draining energy if touched', icon: '💀', color: 0x88ff88 },
            { id: 'glass_cannon', name: 'GLASS CANNON', description: 'Lose MORE crystals when hit', icon: '💥', color: 0xff4444 }
        ];
        
        const options = isWinner ? upgrades : curses;

        const cardWidth = ScaleHelper.scale(220);
        const cardHeight = ScaleHelper.scale(200);
        const spacing = ScaleHelper.scale(50);
        const totalWidth = (cardWidth * 3) + (spacing * 2);
        const startX = (ScaleHelper.width() - totalWidth) / 2;

        options.forEach((option, index) => {
            const x = startX + index * (cardWidth + spacing) + cardWidth / 2;
            const y = ScaleHelper.y(200) + cardHeight / 2;

            const cardContainer = this.add.container(x, y);
            cardContainer.setSize(cardWidth, cardHeight);

            const cardBg = this.add.graphics();
            cardBg.fillStyle(0x2a2a2a);
            cardBg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, ScaleHelper.scale(15));
            cardBg.lineStyle(ScaleHelper.scale(4), option.color);
            cardBg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, ScaleHelper.scale(15));
            cardContainer.add(cardBg);

            const icon = this.add.text(0, ScaleHelper.scale(-70), option.icon, { fontSize: ScaleHelper.font('48px') }).setOrigin(0.5);
            cardContainer.add(icon);

            const name = this.add.text(0, ScaleHelper.scale(-25), option.name, { fontSize: ScaleHelper.font('18px'), fontWeight: 'bold', fill: '#ffffff', align: 'center', wordWrap: { width: cardWidth - ScaleHelper.scale(30) } }).setOrigin(0.5);
            cardContainer.add(name);

            const description = this.add.text(0, ScaleHelper.scale(25), option.description, { fontSize: ScaleHelper.font('15px'), fill: '#cccccc', align: 'center', wordWrap: { width: cardWidth - ScaleHelper.scale(30) } }).setOrigin(0.5);
            cardContainer.add(description);
            
            this.upgradeCards.push(cardContainer);

            // Store original position and scale
            cardContainer.originalY = y;
            cardContainer.originalScale = 1;
            
            // Precise hover detection matching visual card boundaries
            const hitArea = new Phaser.Geom.Rectangle(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight);
            cardContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
            
            // Add glow effect for hover
            const glowGraphics = this.add.graphics();
            glowGraphics.setAlpha(0);
            cardContainer.glowGraphics = glowGraphics;
            cardContainer.addAt(glowGraphics, 0); // Add behind card
            
            cardContainer.on('pointerover', () => {
                // Don't apply hover effect to the selected card
                if (this.selectedCard === cardContainer) return;
                
                this.input.setDefaultCursor('pointer');
                
                // Cancel any existing tweens on this card
                this.tweens.killTweensOf(cardContainer);
                this.tweens.killTweensOf(glowGraphics);
                
                // Smooth scale and lift animation
                this.tweens.add({ 
                    targets: cardContainer, 
                    scale: 1.05,
                    y: cardContainer.originalY - ScaleHelper.scale(8),
                    alpha: 1,
                    duration: 200,
                    ease: 'Power2'
                });
                
                // Glow effect
                glowGraphics.clear();
                glowGraphics.fillStyle(option.color, 0.3);
                glowGraphics.fillRoundedRect(-cardWidth/2 - ScaleHelper.scale(8), -cardHeight/2 - ScaleHelper.scale(8), cardWidth + ScaleHelper.scale(16), cardHeight + ScaleHelper.scale(16), ScaleHelper.scale(15));
                
                this.tweens.add({
                    targets: glowGraphics,
                    alpha: 1,
                    duration: 200
                });
                
                this.currentHoveredCard = cardContainer;
            });
            
            cardContainer.on('pointerout', () => {
                // Don't remove hover effect from the selected card
                if (this.selectedCard === cardContainer) return;
                
                this.input.setDefaultCursor('default');
                
                // Cancel any existing tweens
                this.tweens.killTweensOf(cardContainer);
                this.tweens.killTweensOf(glowGraphics);
                
                // Smooth return animation
                const targetAlpha = this.selectedCard && this.selectedCard !== cardContainer ? 0.6 : 1;
                const targetScale = this.selectedCard && this.selectedCard !== cardContainer ? 0.95 : 1;
                
                this.tweens.add({ 
                    targets: cardContainer, 
                    scale: targetScale,
                    y: cardContainer.originalY,
                    alpha: targetAlpha,
                    duration: 200,
                    ease: 'Power2'
                });
                
                this.tweens.add({
                    targets: glowGraphics,
                    alpha: 0,
                    duration: 200
                });
                
                if (this.currentHoveredCard === cardContainer) {
                    this.currentHoveredCard = null;
                }
            });
            
            cardContainer.on('pointerdown', () => {
                this.selectUpgrade(option, cardContainer);
            });
        });
    }

    createStatsSummary() {
        // Position stats panel on the right side with more separation from cards
        const statsWidth = ScaleHelper.scale(180);
        const statsHeight = ScaleHelper.scale(120);
        const statsX = ScaleHelper.width() - statsWidth - ScaleHelper.scale(30);
        const statsY = ScaleHelper.y(40);
        const statsPanel = this.add.graphics();
        statsPanel.fillStyle(0x1a1a1a, 0.9);
        statsPanel.fillRoundedRect(statsX, statsY, statsWidth, statsHeight, ScaleHelper.scale(10));
        statsPanel.lineStyle(ScaleHelper.scale(2), 0x666666);
        statsPanel.strokeRoundedRect(statsX, statsY, statsWidth, statsHeight, ScaleHelper.scale(10));
        
        this.add.text(statsX + statsWidth / 2, statsY + ScaleHelper.scale(18), 'Your Round Stats', { 
            fontSize: ScaleHelper.font('16px'), 
            fontWeight: 'bold', 
            fill: '#ffffff' 
        }).setOrigin(0.5);
        
        const myStats = this.results.find(p => p.id === this.myPlayerId);
        if (myStats) {
            const statsItems = [
                `Crystals: ${myStats.crystalsCollected || 0}`,
                `Max Level: ${myStats.level || 1}`,
                `Score: ${myStats.score || 0}`
            ];
            
            statsItems.forEach((stat, index) => {
                this.add.text(statsX + ScaleHelper.scale(10), statsY + ScaleHelper.scale(40) + (index * ScaleHelper.scale(22)), stat, { 
                    fontSize: ScaleHelper.font('14px'), 
                    fill: '#cccccc'
                });
            });
        }
    }
    
    selectUpgrade(upgrade, selectedCard) {
        // If clicking the same card, do nothing
        if (this.selectedCard === selectedCard) return;
        
        // If there was a previous selection, reset it
        if (this.selectedCard) {
            // Reset previous card
            this.tweens.killTweensOf(this.selectedCard);
            this.tweens.add({
                targets: this.selectedCard,
                scale: 1,
                y: this.selectedCard.originalY,
                alpha: 1,
                duration: 200,
                ease: 'Power2'
            });
            
            // Clear previous glow
            if (this.selectedCard.glowGraphics) {
                this.selectedCard.glowGraphics.clear();
                this.selectedCard.glowGraphics.setAlpha(0);
            }
        }

        // Store new selection
        this.selectedUpgrade = upgrade;
        this.selectedCard = selectedCard;
        console.log('[UPGRADE] Client selected:', this.selectedUpgrade);

        // Lock the selected card in hover state
        this.tweens.killTweensOf(selectedCard);
        this.tweens.add({
            targets: selectedCard,
            scale: 1.08,
            y: selectedCard.originalY - ScaleHelper.scale(10),
            duration: 300,
            ease: 'Power2'
        });
        
        // Enhanced selection glow
        if (selectedCard.glowGraphics) {
            selectedCard.glowGraphics.clear();
            selectedCard.glowGraphics.fillStyle(0xffffff, 0.5);
            const glowPadding = ScaleHelper.scale(10);
            const cardWidth = ScaleHelper.scale(220);
            const cardHeight = ScaleHelper.scale(200);
            selectedCard.glowGraphics.fillRoundedRect(-cardWidth/2 - glowPadding, -cardHeight/2 - glowPadding, cardWidth + glowPadding*2, cardHeight + glowPadding*2, ScaleHelper.scale(18));
            selectedCard.glowGraphics.setAlpha(1);
            
            // Pulsing effect
            this.tweens.add({
                targets: selectedCard.glowGraphics,
                alpha: 0.3,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
        
        // Fade out non-selected cards (but keep them interactive)
        this.upgradeCards.forEach(card => {
            if (card !== selectedCard) {
                this.tweens.killTweensOf(card);
                this.tweens.add({
                    targets: card,
                    alpha: 0.6,
                    scale: 0.95,
                    duration: 300
                });
            }
        });
        
        // Update ready button
        this.readyButton.setText('CONFIRM SELECTION →');
        this.readyButton.setFill('#00ff00');
        this.readyButton.setBackgroundColor('#003300');
        this.readyButton.setInteractive();
        this.readyButton.setScale(1.1);
        
        // Add hover effect to ready button
        this.readyButton.off('pointerover');
        this.readyButton.off('pointerout');
        this.readyButton.on('pointerover', () => {
            this.tweens.add({
                targets: this.readyButton,
                scale: 1.15,
                duration: 200
            });
        });
        this.readyButton.on('pointerout', () => {
            this.tweens.add({
                targets: this.readyButton,
                scale: 1.1,
                duration: 200
            });
        });
        
        this.readyButton.off('pointerdown');
        this.readyButton.on('pointerdown', () => this.startNextRound());
        
        // Update selection text
        this.selectedUpgradeText.setText(`Selected: ${upgrade.name}`);
        this.selectedUpgradeText.setFill(upgrade.color);
    }

    startNextRound() {
        if (this.game.socket && this.selectedUpgrade) {
            const selectionData = {
                upgradeId: this.selectedUpgrade.id,
                round: this.round
            };
            this.game.socket.emit('selectUpgrade', selectionData);
            console.log('[UPGRADE] Sent upgrade selection to server:', selectionData);

            this.game.socket.emit('readyForNextRound');
            
            this.readyButton.setText('Waiting for other players...');
            this.readyButton.setFill('#888888');
            this.readyButton.disableInteractive();
        }
    }
}