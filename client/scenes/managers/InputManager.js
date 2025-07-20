import { ScaleHelper } from '../../helpers/ScaleHelper.js';

export default class InputManager {
    constructor(scene) {
        this.scene = scene;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.inputVector = { x: 0, y: 0 };
        this.lastInputVector = { x: 0, y: 0 };
        this.mouseDown = false;
        this.touchStartPos = null;
    }

    create() {
        this.setupControls();
        this.setupPerformanceHotkeys();
    }

    update(delta) {
        this.updatePlayerMovement();
    }

    setupControls() {
        this.cursors = this.scene.input.keyboard.createCursorKeys();
        this.wasd = this.scene.input.keyboard.addKeys('W,S,A,D');
        this.qKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.eKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.mKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);

        this.scene.input.on('pointerdown', this.handlePointerDown, this);
        this.scene.input.on('pointermove', this.handlePointerMove, this);
        this.scene.input.on('pointerup', this.handlePointerUp, this);

        if (this.isMobile) {
            this.createVirtualJoystick();
        }
    }

    createVirtualJoystick() {
        const joystickX = ScaleHelper.x(80);
        const joystickY = ScaleHelper.height() - ScaleHelper.scale(80);
        const baseRadius = ScaleHelper.scale(40);
        const thumbRadius = ScaleHelper.scale(20);

        this.joystickBase = this.scene.add.circle(joystickX, joystickY, baseRadius, 0x333333, 0.5).setStrokeStyle(ScaleHelper.scale(2), 0x666666);
        this.joystickThumb = this.scene.add.circle(joystickX, joystickY, thumbRadius, 0x666666).setInteractive();
        
        this.virtualJoystick = {
            base: this.joystickBase, thumb: this.joystickThumb,
            baseX: joystickX, baseY: joystickY, isDragging: false, deadZone: 5
        };

        this.scene.input.setDraggable(this.joystickThumb);
        this.joystickThumb.on('dragstart', () => { this.virtualJoystick.isDragging = true; });
        this.joystickThumb.on('drag', (p, x, y) => this.updateVirtualJoystick(x, y));
        this.joystickThumb.on('dragend', () => {
            this.virtualJoystick.isDragging = false;
            this.joystickThumb.setPosition(this.virtualJoystick.baseX, this.virtualJoystick.baseY);
            this.inputVector = { x: 0, y: 0 };
        });
    }

    updateVirtualJoystick(x, y) {
        const { baseX, baseY, deadZone } = this.virtualJoystick;
        const maxDistance = ScaleHelper.scale(35);
        const distance = Phaser.Math.Distance.Between(baseX, baseY, x, y);

        if (distance <= maxDistance) {
            this.joystickThumb.setPosition(x, y);
        } else {
            const angle = Phaser.Math.Angle.Between(baseX, baseY, x, y);
            this.joystickThumb.setPosition(baseX + Math.cos(angle) * maxDistance, baseY + Math.sin(angle) * maxDistance);
        }

        if (distance > deadZone) {
            this.inputVector = { x: (this.joystickThumb.x - baseX) / maxDistance, y: (this.joystickThumb.y - baseY) / maxDistance };
        } else {
            this.inputVector = { x: 0, y: 0 };
        }
    }

    handlePointerDown(pointer) {
        if (this.isMobile && this.virtualJoystick && Phaser.Math.Distance.Between(pointer.x, pointer.y, this.virtualJoystick.baseX, this.virtualJoystick.baseY) < ScaleHelper.scale(60)) {
            return;
        }
        this.mouseDown = true;
        this.touchStartPos = { x: pointer.x, y: pointer.y };
    }

    handlePointerMove(pointer) {
        if (!this.mouseDown || !this.touchStartPos) return;
        if (this.isMobile && this.virtualJoystick && this.virtualJoystick.isDragging) return;
        const dx = pointer.x - this.touchStartPos.x, dy = pointer.y - this.touchStartPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > 10) {
            this.inputVector = { x: Math.max(-1, Math.min(1, dx / 100)), y: Math.max(-1, Math.min(1, dy / 100)) };
        }
    }

    handlePointerUp() {
        this.mouseDown = false;
        this.touchStartPos = null;
        if (!this.isMobile || !this.virtualJoystick || !this.virtualJoystick.isDragging) {
            this.inputVector = { x: 0, y: 0 };
        }
    }

    updatePlayerMovement() {
        if (!this.scene.myId || this.scene.gamePhase !== 'playing') return;

        let moveX = 0, moveY = 0;
        if (this.cursors.left.isDown || this.wasd.A.isDown) moveX -= 1;
        if (this.cursors.right.isDown || this.wasd.D.isDown) moveX += 1;
        if (this.cursors.up.isDown || this.wasd.W.isDown) moveY -= 1;
        if (this.cursors.down.isDown || this.wasd.S.isDown) moveY += 1;

        moveX += this.inputVector.x;
        moveY += this.inputVector.y;

        if (moveX !== 0 && moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= length;
            moveY /= length;
        }

        if (Phaser.Input.Keyboard.JustDown(this.qKey)) this.scene.events.emit('useAbility', { type: 'burst' });
        if (Phaser.Input.Keyboard.JustDown(this.eKey)) this.scene.events.emit('useAbility', { type: 'wall' });
        if (Phaser.Input.Keyboard.JustDown(this.mKey)) this.scene.events.emit('toggleAudioSettings');

        if (moveX !== this.lastInputVector.x || moveY !== this.lastInputVector.y) {
            this.scene.events.emit('playerMove', { ax: moveX, ay: moveY });
            this.lastInputVector = { x: moveX, y: moveY };
        }
    }

    setupPerformanceHotkeys() {
        this.scene.input.keyboard.on('keydown-F1', () => this.scene.events.emit('togglePerformanceStats'));
        console.log('Performance hotkeys enabled (F1 to toggle stats)');
    }

    destroy() {
        this.scene.input.off('pointerdown', this.handlePointerDown, this);
        this.scene.input.off('pointermove', this.handlePointerMove, this);
        this.scene.input.off('pointerup', this.handlePointerUp, this);
        if (this.joystickThumb) this.joystickThumb.off('drag');
    }
}