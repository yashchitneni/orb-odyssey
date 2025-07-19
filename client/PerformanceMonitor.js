class PerformanceMonitor {
    constructor(scene) {
        this.scene = scene;
        this.enabled = true;
        this.stats = {
            fps: 60,
            frameTime: 16.67,
            memoryMB: 0,
            networkLatency: 0,
            objectCount: 0,
            drawCalls: 0
        };
        
        this.fpsHistory = new Array(60).fill(60);
        this.frameTimeHistory = new Array(60).fill(16.67);
        this.networkHistory = new Array(30).fill(0);
        
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.networkPingStart = 0;
        
        // Display elements
        this.displayContainer = null;
        this.fpsText = null;
        this.memoryText = null;
        this.networkText = null;
        this.objectText = null;
        
        this.createDisplay();
        this.startMonitoring();
    }
    
    createDisplay() {
        // Create performance display
        this.displayContainer = this.scene.add.container(10, 10);
        this.displayContainer.setScrollFactor(0);
        this.displayContainer.setDepth(10000);
        
        const bgGraphics = this.scene.add.graphics();
        bgGraphics.fillStyle(0x000000, 0.7);
        bgGraphics.fillRoundedRect(0, 0, 200, 120, 5);
        bgGraphics.lineStyle(1, 0x00ff00, 0.8);
        bgGraphics.strokeRoundedRect(0, 0, 200, 120, 5);
        this.displayContainer.add(bgGraphics);
        
        this.fpsText = this.scene.add.text(10, 10, 'FPS: 60', {
            fontSize: '12px',
            fill: '#00ff00',
            fontFamily: 'monospace'
        });
        this.displayContainer.add(this.fpsText);
        
        this.memoryText = this.scene.add.text(10, 30, 'Memory: 0 MB', {
            fontSize: '12px',
            fill: '#00ffff',
            fontFamily: 'monospace'
        });
        this.displayContainer.add(this.memoryText);
        
        this.networkText = this.scene.add.text(10, 50, 'Ping: 0 ms', {
            fontSize: '12px',
            fill: '#ffff00',
            fontFamily: 'monospace'
        });
        this.displayContainer.add(this.networkText);
        
        this.objectText = this.scene.add.text(10, 70, 'Objects: 0', {
            fontSize: '12px',
            fill: '#ff00ff',
            fontFamily: 'monospace'
        });
        this.displayContainer.add(this.objectText);
        
        // FPS Graph
        this.fpsGraph = this.scene.add.graphics();
        this.fpsGraph.setPosition(10, 90);
        this.displayContainer.add(this.fpsGraph);
        
        // Toggle visibility with F1
        this.scene.input.keyboard.on('keydown-F1', () => {
            this.toggleDisplay();
        });
        
        // Initially hidden
        this.displayContainer.setVisible(false);
    }
    
    startMonitoring() {
        // Monitor FPS and frame time
        this.scene.time.addEvent({
            delay: 1000 / 60, // 60 FPS
            callback: this.updateFrameStats,
            callbackScope: this,
            loop: true
        });
        
        // Update display every second
        this.scene.time.addEvent({
            delay: 1000,
            callback: this.updateDisplay,
            callbackScope: this,
            loop: true
        });
        
        // Network ping test every 5 seconds
        this.scene.time.addEvent({
            delay: 5000,
            callback: this.pingNetwork,
            callbackScope: this,
            loop: true
        });
        
        // Memory monitoring (if available)
        if (performance.memory) {
            this.scene.time.addEvent({
                delay: 2000,
                callback: this.updateMemoryStats,
                callbackScope: this,
                loop: true
            });
        }
    }
    
    updateFrameStats() {
        const now = performance.now();
        const frameTime = now - this.lastFrameTime;
        this.lastFrameTime = now;
        
        this.frameCount++;
        
        // Calculate FPS
        const fps = Math.round(1000 / frameTime);
        
        // Update history
        this.fpsHistory.shift();
        this.fpsHistory.push(fps);
        
        this.frameTimeHistory.shift();
        this.frameTimeHistory.push(frameTime);
        
        // Update stats
        this.stats.fps = fps;
        this.stats.frameTime = frameTime;
        
        // Count objects in scene
        this.updateObjectCount();
    }
    
    updateObjectCount() {
        let count = 0;
        
        // Count game objects
        if (this.scene.players) count += Object.keys(this.scene.players).length;
        if (this.scene.orbs) count += Object.keys(this.scene.orbs).length;
        if (this.scene.crystals) count += Object.keys(this.scene.crystals).length;
        if (this.scene.trails) count += Object.keys(this.scene.trails).length;
        
        // Count particles
        if (this.scene.ambientParticles) count += this.scene.ambientParticles.length;
        if (this.scene.orbTrails) count += Object.keys(this.scene.orbTrails).length;
        
        this.stats.objectCount = count;
    }
    
    updateMemoryStats() {
        if (performance.memory) {
            this.stats.memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
        }
    }
    
    pingNetwork() {
        if (this.scene.game.socket && this.scene.game.socket.connected) {
            this.networkPingStart = performance.now();
            this.scene.game.socket.emit('ping');
        }
    }
    
    onPongReceived() {
        if (this.networkPingStart > 0) {
            const latency = Math.round(performance.now() - this.networkPingStart);
            this.networkHistory.shift();
            this.networkHistory.push(latency);
            this.stats.networkLatency = latency;
            this.networkPingStart = 0;
        }
    }
    
    updateDisplay() {
        if (!this.displayContainer.visible) return;
        
        // Average FPS over last second
        const avgFps = Math.round(this.fpsHistory.reduce((a, b) => a + b) / this.fpsHistory.length);
        const avgFrameTime = Math.round(this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length * 100) / 100;
        const avgPing = Math.round(this.networkHistory.reduce((a, b) => a + b) / this.networkHistory.length);
        
        // Color code based on performance\n        const fpsColor = avgFps >= 50 ? '#00ff00' : avgFps >= 30 ? '#ffff00' : '#ff0000';\n        const pingColor = avgPing <= 50 ? '#00ff00' : avgPing <= 150 ? '#ffff00' : '#ff0000';\n        const memoryColor = this.stats.memoryMB <= 50 ? '#00ffff' : this.stats.memoryMB <= 100 ? '#ffff00' : '#ff0000';\n        \n        this.fpsText.setText(`FPS: ${avgFps} (${avgFrameTime}ms)`);\n        this.fpsText.setColor(fpsColor);\n        \n        this.memoryText.setText(`Memory: ${this.stats.memoryMB} MB`);\n        this.memoryText.setColor(memoryColor);\n        \n        this.networkText.setText(`Ping: ${avgPing} ms`);\n        this.networkText.setColor(pingColor);\n        \n        this.objectText.setText(`Objects: ${this.stats.objectCount}`);\n        \n        this.updateFpsGraph();\n    }\n    \n    updateFpsGraph() {\n        this.fpsGraph.clear();\n        \n        // Draw FPS history graph\n        const graphWidth = 180;\n        const graphHeight = 20;\n        const maxFps = 120;\n        \n        this.fpsGraph.lineStyle(1, 0x00ff00, 0.8);\n        \n        for (let i = 0; i < this.fpsHistory.length - 1; i++) {\n            const x1 = (i / this.fpsHistory.length) * graphWidth;\n            const y1 = graphHeight - (this.fpsHistory[i] / maxFps) * graphHeight;\n            const x2 = ((i + 1) / this.fpsHistory.length) * graphWidth;\n            const y2 = graphHeight - (this.fpsHistory[i + 1] / maxFps) * graphHeight;\n            \n            this.fpsGraph.lineBetween(x1, y1, x2, y2);\n        }\n        \n        // Draw target FPS line\n        this.fpsGraph.lineStyle(1, 0x888888, 0.5);\n        const targetY = graphHeight - (60 / maxFps) * graphHeight;\n        this.fpsGraph.lineBetween(0, targetY, graphWidth, targetY);\n    }\n    \n    toggleDisplay() {\n        this.displayContainer.setVisible(!this.displayContainer.visible);\n    }\n    \n    getStats() {\n        return { ...this.stats };\n    }\n    \n    getAverageStats() {\n        return {\n            avgFps: Math.round(this.fpsHistory.reduce((a, b) => a + b) / this.fpsHistory.length),\n            avgFrameTime: Math.round(this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length * 100) / 100,\n            avgPing: Math.round(this.networkHistory.reduce((a, b) => a + b) / this.networkHistory.length),\n            memoryMB: this.stats.memoryMB,\n            objectCount: this.stats.objectCount\n        };\n    }\n    \n    destroy() {\n        if (this.displayContainer) {\n            this.displayContainer.destroy();\n        }\n    }\n}\n\nif (typeof module !== 'undefined' && module.exports) {\n    module.exports = PerformanceMonitor;\n}