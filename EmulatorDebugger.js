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
                this.romViewScrollPosition = 0;
                this.romViewVisibleLines = 20; // Adjust this based on your window size
                this.lastEmulatorState = null;
                this.lastRegisters = null;
                this.lastFlags = null;
                this.lastGeneralInfo = null;
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
                window1.addText('registers', 20, 20, 'Registers:\n');
                window1.addText('flags', 170, 20, 'Flags:\n');

                // Create the second debug window for general information
                const window2 = this.createWindow(490, 10, 300, 200);
                window2.addText('general', 20, 20, 'General Info:\nNo game loaded');

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
                // Update registers, shadow registers, and flags only if they've changed
                const registers = emulator.cpu.getRegisterState();
                const shadowRegisters = emulator.cpu.getShadowRegisterState();
                const flags = emulator.cpu.getFlagState();
                if (JSON.stringify(registers) !== JSON.stringify(this.lastRegisters) ||
                    JSON.stringify(shadowRegisters) !== JSON.stringify(this.lastShadowRegisters) ||
                    JSON.stringify(flags) !== JSON.stringify(this.lastFlags)) {
                    let registerText = 'Registers:\n';
                    for (const [key, value] of Object.entries(registers)) {
                        registerText += `${key.toUpperCase()}: ${value.toString(16).padStart(2, '0')}\n`;
                    }
                    registerText += '\nShadow Registers:\n';
                    for (const [key, value] of Object.entries(shadowRegisters)) {
                        registerText += `${key.toUpperCase()}': ${value.toString(16).padStart(2, '0')}\n`;
                    }
                    let flagText = 'Flags:\n';
                    for (const [key, value] of Object.entries(flags)) {
                        flagText += `${key.toUpperCase()}: ${value ? '1' : '0'}\n`;
                    }
                    this.windows[0].setText('registers', registerText);
                    this.windows[0].setText('flags', flagText);
                    this.lastRegisters = registers;
                    this.lastShadowRegisters = shadowRegisters;
                    this.lastFlags = flags;
                }
                // Update general information
                const generalInfo = {
                    cycles: emulator.cpu.clock.t,
                    gameLoaded: emulator.gameLoaded,
                    ramSize: emulator.memory.ram.length,
                    romSize: emulator.memory.rom.length,
                    vramSize: emulator.vdp.vram.length,
                    cramSize: emulator.vdp.cram.length,
                    gameName: emulator.gameInfo ? emulator.gameInfo.name : null,
                    gameSize: emulator.gameInfo ? emulator.gameInfo.size : null
                };
                let generalText = 'General Info:\n';
                generalText += `Cycles: ${generalInfo.cycles}\n`;
                generalText += `Game Loaded: ${generalInfo.gameLoaded ? 'Yes' : 'No'}\n`;
                generalText += `RAM Size: ${generalInfo.ramSize} bytes\n`;
                generalText += `ROM Size: ${generalInfo.romSize} bytes\n`;
                generalText += `VRAM Size: ${generalInfo.vramSize} bytes\n`;
                generalText += `CRAM Size: ${generalInfo.cramSize} bytes\n`;
                if (generalInfo.gameName) {
                    generalText += `Game: ${generalInfo.gameName}\n`;
                    generalText += `Size: ${generalInfo.gameSize} bytes\n`;
                } else {
                    generalText += 'No game loaded\n';
                }
                this.windows[1].setText('general', generalText);
                this.lastGeneralInfo = generalInfo;
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
                            if (this.currentTab === 'ROM') {
                                this.romViewScrollPosition += deltaY > 0 ? 1 : -1;
                                const totalLines = Math.ceil(this.scene.emulator.memory.rom.length / 16);
                                this.romViewScrollPosition = Phaser.Math.Clamp(this.romViewScrollPosition, 0, Math.max(0, totalLines - this.romViewVisibleLines));
                            } else {
                                this.scrollPosition += deltaY > 0 ? 1 : -1;
                                this.scrollPosition = Phaser.Math.Clamp(this.scrollPosition, 0, Math.max(0, this.contentLines.length - this.visibleLines));
                            }
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
                            if (emulator.vdp && emulator.vdp.vram) {
                                this.contentLines = this.formatMemoryDump(emulator.vdp.vram, 0, emulator.vdp.vram.length).split('\n');
                            } else {
                                this.contentLines = ['VRAM not available'];
                            }
                            break;
                        case 'CRAM':
                            if (emulator.vdp && emulator.vdp.cram) {
                                this.contentLines = this.formatColorRAM(emulator.vdp.cram, 0, emulator.vdp.cram.length).split('\n');
                            } else {
                                this.contentLines = ['CRAM not available'];
                            }
                            break;
                        case 'ROM':
                            this.updateROMView(emulator);
                            return; // Exit early as ROM view is handled separately
                    }
                    const visibleContent = this.contentLines.slice(this.scrollPosition, this.scrollPosition + this.visibleLines).join('\n');
                    this.windows[3].setText('content', visibleContent);
                }
                this.lastEmulatorState = emulator;
            }

            updateROMView(emulator) {
                if (this.currentTab === 'ROM' && this.windows[3]) {
                    const startAddress = this.romViewScrollPosition * 16;
                    const endAddress = Math.min(startAddress + this.romViewVisibleLines * 16, emulator.memory.rom.length);

                    const visibleContent = this.formatMemoryDump(emulator.memory.rom, startAddress, endAddress);
                    this.windows[3].setText('content', visibleContent);

                    // Update scroll bar
                    const totalLines = Math.ceil(emulator.memory.rom.length / 16);
                    this.windows[3].setScrollbarRange(totalLines, this.romViewVisibleLines);
                    this.windows[3].setScrollbarPosition(this.romViewScrollPosition);
                }
            }

            formatMemoryDump(memory, start, end) {
                let output = '';
                for (let i = start; i < end; i += 16) {
                    output += `${i.toString(16).padStart(6, '0')}: `;
                    for (let j = 0; j < 16 && i + j < end; j++) {
                        output += memory[i + j].toString(16).padStart(2, '0') + ' ';
                    }
                    output += '\n';
                }
                return output.trim();
            }
            formatColorRAM(cram, start, end) {
                if (!cram) return 'CRAM data not available';
                let output = '';
                for (let i = start; i < end; i += 8) {
                    output += `${i.toString(16).padStart(4, '0')}: `;
                    for (let j = 0; j < 8 && i + j < end; j++) {
                        const color = cram[i + j];
                        output += (color !== undefined ? color.toString(16).padStart(4, '0') : '????') + ' ';
                    }
                    output += '\n';
                }
                return output.trim();
            }
            handleScroll(scrollPosition) {
                if (this.currentTab === 'ROM') {
                    this.romViewScrollPosition = scrollPosition;
                    this.updateAdvancedWindow(this.lastEmulatorState);
                }
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
                    this.scrollbar = null;
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
                setScrollbarRange(total, visible) {
                    if (!this.scrollbar) {
                        this.scrollbar = this.scene.add.graphics();
                    }
                    this.scrollbar.clear();
                    this.scrollbar.fillStyle(0x888888, 1);
                    this.scrollbar.fillRect(this.x + this.width - 10, this.y, 10, this.height);

                    const scrollThumbHeight = Math.max(20, (visible / total) * this.height);
                    this.scrollbar.fillStyle(0xcccccc, 1);
                    this.scrollbar.fillRect(this.x + this.width - 10, this.y, 10, scrollThumbHeight);
                }
                setScrollbarPosition(position) {
                    if (this.scrollbar) {
                        const scrollThumbHeight = this.scrollbar.height;
                        const maxY = this.height - scrollThumbHeight;
                        const y = (position / (this.total - this.visible)) * maxY;
                        this.scrollbar.y = this.y + y;
                    }
                }
                destroy() {
                    this.window.destroy();
                    Object.values(this.texts).forEach(text => text.destroy());
                    Object.values(this.elements).forEach(element => element.destroy());
                    if (this.scrollbar) {
                        this.scrollbar.destroy();
                    }
                }
            }
        }
=======
export default EmulatorDebugger;
