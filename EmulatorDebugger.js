    class EmulatorDebugger {
        constructor(scene) {
            this.scene = scene;
            this.windows = [];
            this.advancedMode = false;
            this.currentTab = 'RAM';
            this.scrollPosition = 0;
            this.contentLines = [];
            this.visibleLines = 20; // Adjust based on your window size and font
            this.isVisible = false;
            this.switchOffX = 0;
            this.switchOnX = 0;
        }
        toggleDebugWindows() {
            if (!this.isVisible) {
                this.createDebugWindows();
            } else {
                this.destroyWindows();
            }
            this.isVisible = !this.isVisible;
        }
        createDebugWindows() {
            // Create the first debug window for registers and flags
            const window1 = this.createWindow(10, 10, 300, 200);
            window1.addText('registers', 20, 20);
            window1.addText('flags', 170, 20);
            // Create the second debug window for general information
            const window2 = this.createWindow(490, 10, 300, 200);
            window2.addText('general', 20, 20);
            // Create the third debug window at the bottom left, taller
            const window3 = this.createWindow(10, 480, 300, 110);
            window3.addText('advancedMode', 20, 20, 'Advanced Mode: off', {
                font: '18px Arial',
                fill: '#ffffff'
            });
            this.createAdvancedModeSwitch(window3);
        }
        createWindow(x, y, width, height) {
            const window = new this.DebugWindow(this.scene, x, y, width, height);
            this.windows.push(window);
            return window;
        }
        destroyWindows() {
            this.windows.forEach(window => window.destroy());
            this.windows = [];
        }
        createAdvancedModeSwitch(window) {
            const switchWidth = 60;
            const switchHeight = 30;
            const switchX = window.x + window.width / 2;
            const switchY = window.y + 70;
            const switchBackground = this.scene.add.rectangle(switchX, switchY, switchWidth, switchHeight, 0x555555);
            const switchKnob = this.scene.add.circle(switchX - switchWidth / 4, switchY, switchHeight / 2, 0xffffff);
            switchBackground.setInteractive();
            switchBackground.on('pointerdown', this.toggleAdvancedMode, this);
            window.addElement('switchBackground', switchBackground);
            window.addElement('switchKnob', switchKnob);
            // Store the switch positions for animation
            this.switchOffX = switchX - switchWidth / 4;
            this.switchOnX = switchX + switchWidth / 4;
        }
        updateAdvancedModeSwitch() {
            if (this.windows[2]) {
                const switchBackground = this.windows[2].elements['switchBackground'];
                const switchKnob = this.windows[2].elements['switchKnob'];
                if (switchBackground && switchKnob) {
                    // Animate background color
                    this.scene.tweens.addCounter({
                        from: this.advancedMode ? 0x555555 : 0x00ff00,
                        to: this.advancedMode ? 0x00ff00 : 0x555555,
                        duration: 200,
                        onUpdate: (tween) => {
                            const value = Math.floor(tween.getValue());
                            switchBackground.fillColor = value;
                        }
                    });
                    // Animate knob position
                    this.scene.tweens.add({
                        targets: switchKnob,
                        x: this.advancedMode ? this.switchOnX : this.switchOffX,
                        duration: 200,
                        ease: 'Power2'
                    });
                }
            }
        }
        updateWindows(emulator) {
            if (this.windows.length === 0) return;
            // Update registers and flags
            const registers = emulator.cpu.getRegisterState();
            const flags = emulator.cpu.getFlagState();
            let registerText = 'Registers:\n';
            for (const [key, value] of Object.entries(registers)) {
                registerText += `${key.toUpperCase()}: ${value.toString(16).padStart(2, '0')}\n`;
            }
            let flagText = 'Flags:\n';
            for (const [key, value] of Object.entries(flags)) {
                flagText += `${key.toUpperCase()}: ${value ? '1' : '0'}\n`;
            }
            this.windows[0].setText('registers', registerText);
            this.windows[0].setText('flags', flagText);
            // Update general information
            let generalText = 'General Info:\n';
            generalText += `Cycles: ${emulator.cyclesExecuted}\n`;
            generalText += `Game Loaded: ${emulator.gameLoaded ? 'Yes' : 'No'}\n`;
            generalText += `RAM Size: ${emulator.memory.ram.length} bytes\n`;
            generalText += `ROM Size: ${emulator.memory.rom.length} bytes\n`;
            generalText += `VRAM Size: ${emulator.gpu.vram.length} bytes\n`;
            generalText += `CRAM Size: ${emulator.gpu.colorPalette.length * 2} bytes\n`;
            if (emulator.gameInfo) {
                generalText += `Game: ${emulator.gameInfo.name}\n`;
                generalText += `Size: ${emulator.gameInfo.size} bytes\n`;
            }
            this.windows[1].setText('general', generalText);
            // Update advanced mode text
            if (this.windows[2]) {
                this.windows[2].setText('advancedMode', `Advanced Mode: ${this.advancedMode ? 'on' : 'off'}`);
            }
            // Update advanced window
            if (this.advancedMode) {
                this.updateAdvancedWindow(emulator);
            }
        }
        toggleAdvancedMode() {
            this.advancedMode = !this.advancedMode;
            if (this.windows[2]) {
                this.windows[2].setText('advancedMode', `Advanced Mode: ${this.advancedMode ? 'on' : 'off'}`);
                this.updateAdvancedModeSwitch();
            }
            if (this.advancedMode) {
                this.createAdvancedWindow();
            } else if (this.windows.length === 4) {
                this.windows[3].destroy();
                this.windows.pop();
            }
        }
        createAdvancedWindow() {
            if (this.windows.length < 4) {
                const window4 = this.createWindow(320, 220, 460, 370);
                window4.addText('tabTitle', 20, 20, 'RAM', {
                    font: '18px Arial',
                    fill: '#ffffff'
                });
                const tabWidth = 100;
                const tabHeight = 30;
                const tabY = window4.y + 10;
                const tabs = ['RAM', 'VRAM', 'CRAM', 'ROM'];
                tabs.forEach((tab, index) => {
                    const tabX = window4.x + 20 + (tabWidth + 10) * index;
                    const tabBackground = this.scene.add.rectangle(tabX, tabY, tabWidth, tabHeight, 0x333333);
                    const tabText = this.scene.add.text(tabX, tabY, tab, {
                        font: '14px Arial',
                        fill: '#ffffff'
                    });
                    tabText.setOrigin(0.5);
                    tabBackground.setInteractive();
                    tabBackground.on('pointerdown', () => this.switchTab(tab));
                    window4.addElement(`tab_${tab}_bg`, tabBackground);
                    window4.addElement(`tab_${tab}_text`, tabText);
                });
                window4.addText('content', 20, 60, '', {
                    font: '12px Courier',
                    fill: '#ffffff'
                });
                // Add scroll functionality
                this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
                    if (this.advancedMode) {
                        this.scrollPosition += deltaY > 0 ? 1 : -1;
                        this.scrollPosition = Phaser.Math.Clamp(this.scrollPosition, 0, Math.max(0, this.contentLines.length - this.visibleLines));
                        this.updateAdvancedWindow(this.scene.emulator);
                    }
                });
            }
        }
        switchTab(tab) {
            this.currentTab = tab;
            this.scrollPosition = 0;
            if (this.windows[3]) {
                this.windows[3].setText('tabTitle', tab);
                this.updateAdvancedWindow(this.scene.emulator);
            }
        }
        updateAdvancedWindow(emulator) {
            if (this.windows[3]) {
                switch (this.currentTab) {
                    case 'RAM':
                        this.contentLines = this.formatMemoryDump(emulator.memory.ram, 0, emulator.memory.ram.length).split('\n');
                        break;
                    case 'VRAM':
                        this.contentLines = this.formatMemoryDump(emulator.gpu.vram, 0, emulator.gpu.vram.length).split('\n');
                        break;
                    case 'CRAM':
                        this.contentLines = this.formatColorRAM(emulator.gpu.colorPalette, 0, emulator.gpu.colorPalette.length).split('\n');
                        break;
                    case 'ROM':
                        this.contentLines = this.formatMemoryDump(emulator.memory.rom, 0, emulator.memory.rom.length).split('\n');
                        break;
                }
                const visibleContent = this.contentLines.slice(this.scrollPosition, this.scrollPosition + this.visibleLines).join('\n');
                this.windows[3].setText('content', visibleContent);
            }
        }
        formatMemoryDump(memory, start, length) {
            let result = '';
            for (let i = start; i < start + length; i += 16) {
                result += i.toString(16).padStart(4, '0') + ': ';
                for (let j = 0; j < 16; j++) {
                    if (i + j < memory.length) {
                        result += memory[i + j].toString(16).padStart(2, '0') + ' ';
                    }
                }
                result += '\n';
            }
            return result;
        }
        formatColorRAM(colorPalette, start, length) {
            let result = '';
            for (let i = start; i < start + length; i += 4) {
                result += i.toString(16).padStart(4, '0') + ': ';
                for (let j = 0; j < 4; j++) {
                    if (i + j < colorPalette.length) {
                        result += colorPalette[i + j].toString(16).padStart(3, '0') + ' ';
                    }
                }
                result += '\n';
            }
            return result;
        }
        DebugWindow = class {
            constructor(scene, x, y, width, height) {
                this.scene = scene;
                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;
                this.window = scene.add.graphics();
                this.window.fillStyle(0x000000, 0.8);
                this.window.fillRect(x, y, width, height);
                this.texts = {};
                this.elements = {};
            }
            addText(key, x, y, text = '', style = {
                font: '12px Arial',
                fill: '#ffffff'
            }) {
                this.texts[key] = this.scene.add.text(this.x + x, this.y + y, text, style);
            }
            setText(key, text) {
                if (this.texts[key]) {
                    this.texts[key].setText(text);
                }
            }
            addElement(key, element) {
                this.elements[key] = element;
            }
            destroy() {
                this.window.destroy();
                Object.values(this.texts).forEach(text => text.destroy());
                Object.values(this.elements).forEach(element => element.destroy());
            }
        }
    }
    class Example extends Phaser.Scene {
        constructor() {
            super();
            this.debugger = null;
        }
        create() {
            // Set the background color to black
            this.cameras.main.setBackgroundColor('#000000');
            // Create the emulator
            this.emulator = new Emulator(this);
            // Reset the emulator
            this.emulator.reset();
            // Create debugger
            this.debugger = new EmulatorDebugger(this);
            // Add key listener for 'R'
            this.input.keyboard.on('keydown-R', () => this.debugger.toggleDebugWindows());
            // Set up 60 FPS timer
            this.time.addEvent({
                delay: 1000 / 60,
                callback: this.runFrame,
                callbackScope: this,
                loop: true
            });
        }
        runFrame() {
            // Run a single step of the emulator
            this.emulator.step();
            // Render the screen only if it has changed
            if (this.emulator.gpu.isDirty) {
                this.emulator.gpu.renderScreen();
            }
            // Update debug windows
            if (this.debugger.isVisible) {
                this.debugger.updateWindows(this.emulator);
            }
        }
    }
export default EmulatorDebugger;