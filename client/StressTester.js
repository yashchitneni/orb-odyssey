class StressTester {
    constructor(scene) {
        this.scene = scene;
        this.isRunning = false;
        this.testResults = {};
        this.testBots = [];
        this.stressLevel = 'medium'; // low, medium, high, extreme
    }
    
    startStressTest(level = 'medium') {
        if (this.isRunning) {
            console.warn('Stress test already running');
            return;
        }
        
        this.stressLevel = level;
        this.isRunning = true;
        this.testResults = {
            startTime: Date.now(),
            level: level,
            fpsHistory: [],
            memoryHistory: [],
            networkHistory: [],
            crashed: false,
            duration: 0
        };
        
        console.log(`Starting ${level} stress test...`);
        
        // Create test scenarios based on level
        switch (level) {
            case 'low':
                this.runLowStressTest();
                break;
            case 'medium':
                this.runMediumStressTest();
                break;
            case 'high':
                this.runHighStressTest();
                break;
            case 'extreme':
                this.runExtremeStressTest();
                break;
        }
        
        // Monitor performance during test
        this.monitoringInterval = setInterval(() => {
            this.recordPerformanceMetrics();
        }, 1000);
        
        // Auto-stop after timeout
        const timeout = this.getTestTimeout(level);
        this.testTimeout = setTimeout(() => {
            this.stopStressTest();
        }, timeout);
    }
    
    stopStressTest() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        // Clear intervals and timeouts
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        if (this.testTimeout) {
            clearTimeout(this.testTimeout);
        }
        
        // Clean up test objects
        this.cleanupTestObjects();
        
        // Calculate final results
        this.testResults.duration = Date.now() - this.testResults.startTime;
        this.testResults.avgFps = this.calculateAverage(this.testResults.fpsHistory);\n        this.testResults.avgMemory = this.calculateAverage(this.testResults.memoryHistory);\n        this.testResults.avgNetwork = this.calculateAverage(this.testResults.networkHistory);\n        \n        console.log('Stress test completed:', this.testResults);\n        return this.testResults;\n    }\n    \n    runLowStressTest() {\n        // Spawn additional visual effects\n        this.spawnTestParticles(50);\n        this.simulatePlayerMovement(2);\n    }\n    \n    runMediumStressTest() {\n        // More particles and effects\n        this.spawnTestParticles(200);\n        this.simulatePlayerMovement(5);\n        this.spawnTestObjects(20, 30);\n    }\n    \n    runHighStressTest() {\n        // Heavy particle load\n        this.spawnTestParticles(500);\n        this.simulatePlayerMovement(10);\n        this.spawnTestObjects(50, 75);\n        this.simulateNetworkSpam();\n    }\n    \n    runExtremeStressTest() {\n        // Maximum stress\n        this.spawnTestParticles(1000);\n        this.simulatePlayerMovement(20);\n        this.spawnTestObjects(100, 150);\n        this.simulateNetworkSpam();\n        this.simulateMemoryPressure();\n    }\n    \n    spawnTestParticles(count) {\n        console.log(`Spawning ${count} test particles`);\n        \n        for (let i = 0; i < count; i++) {\n            const x = Math.random() * GAME_CONSTANTS.WORLD_WIDTH;\n            const y = Math.random() * GAME_CONSTANTS.WORLD_HEIGHT;\n            const color = Math.random() * 0xffffff;\n            \n            const particle = this.scene.add.circle(x, y, 2 + Math.random() * 5, color);\n            particle.setAlpha(0.3 + Math.random() * 0.7);\n            \n            // Animate particles\n            this.scene.tweens.add({\n                targets: particle,\n                x: x + (Math.random() - 0.5) * 200,\n                y: y + (Math.random() - 0.5) * 200,\n                alpha: 0,\n                duration: 2000 + Math.random() * 3000,\n                ease: 'Power2',\n                onComplete: () => {\n                    particle.destroy();\n                }\n            });\n            \n            this.testBots.push(particle);\n        }\n    }\n    \n    simulatePlayerMovement(botCount) {\n        console.log(`Simulating ${botCount} bot players`);\n        \n        for (let i = 0; i < botCount; i++) {\n            const bot = {\n                x: Math.random() * GAME_CONSTANTS.WORLD_WIDTH,\n                y: Math.random() * GAME_CONSTANTS.WORLD_HEIGHT,\n                vx: (Math.random() - 0.5) * 100,\n                vy: (Math.random() - 0.5) * 100,\n                sprite: null\n            };\n            \n            // Create visual representation\n            bot.sprite = this.scene.add.circle(bot.x, bot.y, 15, 0xff0000);\n            bot.sprite.setAlpha(0.5);\n            \n            // Move bot around\n            const moveBot = () => {\n                if (!this.isRunning) return;\n                \n                bot.x += bot.vx * 0.016;\n                bot.y += bot.vy * 0.016;\n                \n                // Bounce off walls\n                if (bot.x <= 0 || bot.x >= GAME_CONSTANTS.WORLD_WIDTH) {\n                    bot.vx *= -1;\n                }\n                if (bot.y <= 0 || bot.y >= GAME_CONSTANTS.WORLD_HEIGHT) {\n                    bot.vy *= -1;\n                }\n                \n                bot.sprite.setPosition(bot.x, bot.y);\n                \n                // Random direction changes\n                if (Math.random() < 0.02) {\n                    bot.vx = (Math.random() - 0.5) * 150;\n                    bot.vy = (Math.random() - 0.5) * 150;\n                }\n                \n                requestAnimationFrame(moveBot);\n            };\n            \n            moveBot();\n            this.testBots.push(bot);\n        }\n    }\n    \n    spawnTestObjects(orbCount, crystalCount) {\n        console.log(`Spawning ${orbCount} test orbs and ${crystalCount} test crystals`);\n        \n        // Spawn fake orbs\n        for (let i = 0; i < orbCount; i++) {\n            const x = Math.random() * GAME_CONSTANTS.WORLD_WIDTH;\n            const y = Math.random() * GAME_CONSTANTS.WORLD_HEIGHT;\n            \n            const orb = this.scene.add.circle(x, y, GAME_CONSTANTS.ORB_RADIUS, 0x00ff00);\n            orb.setAlpha(0.7);\n            \n            // Add glow effect\n            const glow = this.scene.add.circle(x, y, GAME_CONSTANTS.ORB_RADIUS * 2, 0x00ff00, 0.2);\n            \n            this.testBots.push(orb, glow);\n        }\n        \n        // Spawn fake crystals\n        for (let i = 0; i < crystalCount; i++) {\n            const x = Math.random() * GAME_CONSTANTS.WORLD_WIDTH;\n            const y = Math.random() * GAME_CONSTANTS.WORLD_HEIGHT;\n            const isPowerCrystal = Math.random() < 0.1;\n            \n            const crystal = this.scene.add.circle(x, y, GAME_CONSTANTS.CRYSTAL_RADIUS, \n                isPowerCrystal ? 0xff00ff : 0x00ffff);\n            crystal.setAlpha(0.8);\n            \n            // Pulsing animation\n            this.scene.tweens.add({\n                targets: crystal,\n                scaleX: 1.3,\n                scaleY: 1.3,\n                duration: 800,\n                yoyo: true,\n                repeat: -1,\n                ease: 'Sine.easeInOut'\n            });\n            \n            this.testBots.push(crystal);\n        }\n    }\n    \n    simulateNetworkSpam() {\n        console.log('Simulating network spam');\n        \n        const spamInterval = setInterval(() => {\n            if (!this.isRunning) {\n                clearInterval(spamInterval);\n                return;\n            }\n            \n            // Send multiple rapid updates\n            for (let i = 0; i < 10; i++) {\n                if (this.scene.game.socket && this.scene.game.socket.connected) {\n                    this.scene.game.socket.emit('playerMove', {\n                        ax: Math.random() - 0.5,\n                        ay: Math.random() - 0.5\n                    });\n                }\n            }\n        }, 50);\n        \n        this.testBots.push({ cleanup: () => clearInterval(spamInterval) });\n    }\n    \n    simulateMemoryPressure() {\n        console.log('Simulating memory pressure');\n        \n        const memoryHogs = [];\n        \n        const createMemoryHog = () => {\n            if (!this.isRunning) return;\n            \n            // Create large arrays to consume memory\n            const hog = new Array(100000).fill(Math.random());\n            memoryHogs.push(hog);\n            \n            // Create DOM elements\n            const element = document.createElement('div');\n            element.style.position = 'absolute';\n            element.style.left = '-9999px';\n            element.innerHTML = 'x'.repeat(1000);\n            document.body.appendChild(element);\n            \n            memoryHogs.push(element);\n            \n            // Limit memory pressure\n            if (memoryHogs.length > 500) {\n                const old = memoryHogs.shift();\n                if (old && old.remove) {\n                    old.remove();\n                }\n            }\n            \n            setTimeout(createMemoryHog, 100);\n        };\n        \n        createMemoryHog();\n        \n        this.testBots.push({\n            cleanup: () => {\n                memoryHogs.forEach(hog => {\n                    if (hog && hog.remove) {\n                        hog.remove();\n                    }\n                });\n                memoryHogs.length = 0;\n            }\n        });\n    }\n    \n    recordPerformanceMetrics() {\n        if (this.scene.performanceMonitor) {\n            const stats = this.scene.performanceMonitor.getAverageStats();\n            \n            this.testResults.fpsHistory.push(stats.avgFps || 0);\n            this.testResults.memoryHistory.push(stats.memoryMB || 0);\n            this.testResults.networkHistory.push(stats.avgPing || 0);\n        }\n        \n        // Check for crash conditions\n        const currentFps = this.testResults.fpsHistory[this.testResults.fpsHistory.length - 1];\n        if (currentFps < 5) {\n            console.warn('Critical FPS detected, stopping stress test');\n            this.testResults.crashed = true;\n            this.stopStressTest();\n        }\n    }\n    \n    cleanupTestObjects() {\n        console.log('Cleaning up test objects');\n        \n        this.testBots.forEach(bot => {\n            if (bot && bot.sprite && bot.sprite.destroy) {\n                bot.sprite.destroy();\n            } else if (bot && bot.destroy) {\n                bot.destroy();\n            } else if (bot && bot.cleanup) {\n                bot.cleanup();\n            }\n        });\n        \n        this.testBots = [];\n    }\n    \n    getTestTimeout(level) {\n        switch (level) {\n            case 'low': return 30000; // 30 seconds\n            case 'medium': return 60000; // 1 minute\n            case 'high': return 120000; // 2 minutes\n            case 'extreme': return 180000; // 3 minutes\n            default: return 60000;\n        }\n    }\n    \n    calculateAverage(array) {\n        if (array.length === 0) return 0;\n        return array.reduce((sum, val) => sum + val, 0) / array.length;\n    }\n    \n    // Quick test methods\n    quickFpsTest() {\n        console.log('Running quick FPS test...');\n        this.startStressTest('medium');\n        setTimeout(() => {\n            const results = this.stopStressTest();\n            console.log(`Quick FPS Test Results: Avg FPS: ${results.avgFps?.toFixed(1)}`);\n        }, 10000);\n    }\n    \n    quickMemoryTest() {\n        console.log('Running quick memory test...');\n        this.startStressTest('high');\n        setTimeout(() => {\n            const results = this.stopStressTest();\n            console.log(`Quick Memory Test Results: Avg Memory: ${results.avgMemory?.toFixed(1)} MB`);\n        }, 15000);\n    }\n    \n    getRecommendations(results) {\n        const recommendations = [];\n        \n        if (results.avgFps < 30) {\n            recommendations.push('Consider reducing particle effects or visual quality');\n        }\n        \n        if (results.avgMemory > 100) {\n            recommendations.push('Memory usage is high, implement more aggressive cleanup');\n        }\n        \n        if (results.avgNetwork > 200) {\n            recommendations.push('Network latency is high, optimize server communication');\n        }\n        \n        if (results.crashed) {\n            recommendations.push('Game crashed during stress test, review critical code paths');\n        }\n        \n        return recommendations;\n    }\n}\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = StressTester;\n}