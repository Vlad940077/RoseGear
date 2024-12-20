        class EmulatorDebugger {
            constructor(scene) {
                this.scene = scene;
                this.windows = [];
                this.advancedMode = false;
                this.currentTab = 'RAM';
                this.scrollPosition = 0;
                this.contentLines = [];
                this.visibleLines = 20;
                this.isVisible = false;
                this.switchOffX = 0;
                this.switchOnX = 0;
                this.romViewScrollPosition = 0;
                this.romViewVisibleLines = 20;
                this.lastEmulatorState = null;
                this.lastRegisters = null;
                this.lastFlags = null;
                this.lastGeneralInfo = null;
                this.lastShadowRegisters = null;
            }
            initialize() {
                if (this.scene && this.scene.input) {
                    this.scene.input.on('wheel', this.handleWheel, this);
                } else {
                    console.warn('Scene or input not ready. Wheel event listener not added.');
                }
            }
            handleWheel(pointer, gameObjects, deltaX, deltaY, deltaZ) {
                if (this.advancedMode && this.windows[3]) {
                    const scrollAmount = deltaY > 0 ? 1 : -1;
                    if (this.currentTab === 'ROM') {
                        this.romViewScrollPosition = Math.max(0, this.romViewScrollPosition + scrollAmount);
                        const totalLines = Math.ceil(this.scene.emulator.memory.rom.length / 16);
                        this.romViewScrollPosition = Math.min(this.romViewScrollPosition, totalLines - this.romViewVisibleLines);
                    } else {
                        this.scrollPosition = Math.max(0, this.scrollPosition + scrollAmount);
                        this.scrollPosition = Math.min(this.scrollPosition, Math.max(0, this.contentLines.length - this.visibleLines));
                    }
                    this.updateAdvancedWindow(this.scene.emulator);
                }
            }
            toggleDebugWindows() {
                this.isVisible = !this.isVisible;
                if (this.isVisible) {
                    this.createDebugWindows();
                } else {
                    this.destroyWindows();
                }
            }
            createDebugWindows() {
                this.windows = [
                    this.createRegisterFlagWindow(),
                    this.createGeneralInfoWindow(),
                    this.createAdvancedModeWindow()
                ];
                if (this.advancedMode) {
                    this.createAdvancedWindow();
                }
            }
            createRegisterFlagWindow() {
                const window = this.createWindow(10, 10, 300, 200);
                window.addText('registers', 20, 20, 'Registers:\n');
                window.addText('flags', 170, 20, 'Flags:\n');
                return window;
            }
            createGeneralInfoWindow() {
                const window = this.createWindow(490, 10, 300, 200);
                window.addText('general', 20, 20, 'General Info:\nNo game loaded');
                return window;
            }
            createAdvancedModeWindow() {
                const window = this.createWindow(10, 480, 300, 110);
                window.addText('advancedMode', 20, 20, 'Advanced Mode: off', {
                    font: '18px Arial',
                    fill: '#ffffff'
                });
                this.createAdvancedModeSwitch(window);
                return window;
            }
            createWindow(x, y, width, height) {
                return new DebugWindow(this.scene, x, y, width, height);
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
                this.switchOffX = switchX - switchWidth / 4;
                this.switchOnX = switchX + switchWidth / 4;
            }
            updateAdvancedModeSwitch() {
                if (this.windows[2]) {
                    const switchBackground = this.windows[2].elements['switchBackground'];
                    const switchKnob = this.windows[2].elements['switchKnob'];
                    if (switchBackground && switchKnob) {
                        this.scene.tweens.addCounter({
                            from: this.advancedMode ? 0x555555 : 0x00ff00,
                            to: this.advancedMode ? 0x00ff00 : 0x555555,
                            duration: 200,
                            onUpdate: (tween) => {
                                const value = Math.floor(tween.getValue());
                                switchBackground.fillColor = value;
                            }
                        });
                        this.scene.tweens.add({
                            targets: switchKnob,
                            x: this.advancedMode ? this.switchOnX : this.switchOffX,
                            duration: 200,
                            ease: 'Power2'
                        });
                    }
                }
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
                this.updateRegisterFlagWindow(emulator);
                this.updateGeneralInfoWindow(emulator);
                this.updateAdvancedModeWindow();
                if (this.advancedMode && this.windows.length === 4) {
                    this.updateAdvancedWindow(emulator);
                }
                this.lastEmulatorState = emulator;
            }
            updateRegisterFlagWindow(emulator) {
                const registers = emulator.cpu.getRegisterState();
                const shadowRegisters = emulator.cpu.getShadowRegisterState();
                const flags = emulator.cpu.getFlagState();

                if (JSON.stringify(registers) !== JSON.stringify(this.lastRegisters) ||
                    JSON.stringify(shadowRegisters) !== JSON.stringify(this.lastShadowRegisters) ||
                    JSON.stringify(flags) !== JSON.stringify(this.lastFlags)) {

                    let registerText = 'Registers:\n' + this.formatRegisters(registers);
                    registerText += '\nShadow Registers:\n' + this.formatRegisters(shadowRegisters, true);
                    let flagText = 'Flags:\n' + this.formatFlags(flags);

                    this.windows[0].setText('registers', registerText);
                    this.windows[0].setText('flags', flagText);

                    this.lastRegisters = registers;
                    this.lastShadowRegisters = shadowRegisters;
                    this.lastFlags = flags;
                }
            }
            updateGeneralInfoWindow(emulator) {
                const generalInfo = this.getGeneralInfo(emulator);
                let generalText = this.formatGeneralInfo(generalInfo);
                this.windows[1].setText('general', generalText);
                this.lastGeneralInfo = generalInfo;
            }
            updateAdvancedModeWindow() {
                if (this.windows[2]) {
                    this.windows[2].setText('advancedMode', `Advanced Mode: ${this.advancedMode ? 'on' : 'off'}`);
                }
            }
            formatRegisters(registers, isShadow = false) {
                return Object.entries(registers)
                    .map(([key, value]) => `${key.toUpperCase()}${isShadow ? "'" : ''}: ${value.toString(16).padStart(2, '0')}`)
                    .join('\n');
            }
            formatFlags(flags) {
                return Object.entries(flags)
                    .map(([key, value]) => `${key.toUpperCase()}: ${value ? '1' : '0'}`)
                    .join('\n');
            }
            getGeneralInfo(emulator) {
                return {
                    cycles: emulator.cpu.clock.t,
                    gameLoaded: emulator.gameLoaded,
                    ramSize: emulator.memory.ram.length,
                    romSize: emulator.memory.rom.length,
                    vramSize: emulator.vdp.vram.length,
                    cramSize: emulator.vdp.cram.length,
                    gameName: emulator.gameInfo ? emulator.gameInfo.name : null,
                    gameSize: emulator.gameInfo ? emulator.gameInfo.size : null
                };
            }
            formatGeneralInfo(info) {
                let text = 'General Info:\n';
                text += `Cycles: ${info.cycles}\n`;
                text += `Game Loaded: ${info.gameLoaded ? 'Yes' : 'No'}\n`;
                text += `RAM Size: ${info.ramSize} bytes\n`;
                text += `ROM Size: ${info.romSize} bytes\n`;
                text += `VRAM Size: ${info.vramSize} bytes\n`;
                text += `CRAM Size: ${info.cramSize} bytes\n`;
                if (info.gameName) {
                    text += `Game: ${info.gameName}\n`;
                    text += `Size: ${info.gameSize} bytes\n`;
                } else {
                    text += 'No game loaded\n';
                }
                return text;
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
                this.updateWindows(this.lastEmulatorState);
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
                    this.windows[3].setScrollbarPosition(this.romViewScrollPosition / (totalLines - this.romViewVisibleLines));
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
                    this.windows.push(window4);
                    window4.addText('tabTitle', 20, 20, 'RAM', {
                        font: '18px Arial',
                        fill: '#ffffff'
                    });
                    this.createAdvancedTabs(window4);
                    window4.addText('content', 20, 60, '', {
                        font: '12px Courier',
                        fill: '#ffffff'
                    });
                    this.updateAdvancedWindow(this.lastEmulatorState);
                }
            }
            createAdvancedTabs(window) {
                const tabWidth = 100;
                const tabHeight = 30;
                const tabY = window.y + 10;
                const tabs = ['RAM', 'VRAM', 'CRAM', 'ROM'];
                tabs.forEach((tab, index) => {
                    const tabX = window.x + 20 + (tabWidth + 10) * index;
                    const tabBackground = this.scene.add.rectangle(tabX, tabY, tabWidth, tabHeight, 0x333333);
                    const tabText = this.scene.add.text(tabX, tabY, tab, {
                        font: '14px Arial',
                        fill: '#ffffff'
                    });
                    tabText.setOrigin(0.5);
                    tabBackground.setInteractive();
                    tabBackground.on('pointerdown', () => this.switchTab(tab));
                    window.addElement(`tab_${tab}_bg`, tabBackground);
                    window.addElement(`tab_${tab}_text`, tabText);
                });
            }
            switchTab(tab) {
                this.currentTab = tab;
                this.scrollPosition = 0;
                if (this.windows[3]) {
                    this.windows[3].setText('tabTitle', tab);
                    this.updateAdvancedWindow(this.lastEmulatorState);
                }
            }
            updateAdvancedWindow(emulator) {
                if (this.windows[3] && emulator) {
                    if (this.currentTab === 'ROM') {
                        this.updateROMView(emulator);
                    } else {
                        let content = '';
                        switch (this.currentTab) {
                            case 'RAM':
                                content = this.formatMemoryDump(emulator.memory.ram, 0, emulator.memory.ram.length);
                                break;
                            case 'VRAM':
                                if (emulator.vdp && emulator.vdp.vram) {
                                    content = this.formatMemoryDump(emulator.vdp.vram, 0, emulator.vdp.vram.length);
                                } else {
                                    content = 'VRAM not available';
                                }
                                break;
                            case 'CRAM':
                                if (emulator.vdp && emulator.vdp.cram) {
                                    content = this.formatColorRAM(emulator.vdp.cram, 0, emulator.vdp.cram.length);
                                } else {
                                    content = 'CRAM not available';
                                }
                                break;
                        }
                        this.contentLines = content.split('\n');
                        const visibleContent = this.contentLines.slice(this.scrollPosition, this.scrollPosition + this.visibleLines).join('\n');
                        this.windows[3].setText('content', visibleContent);
                        this.windows[3].setText('tabTitle', this.currentTab);

                        // Update scroll bar
                        const totalLines = this.contentLines.length;
                        this.windows[3].setScrollbarRange(totalLines, this.visibleLines);
                        this.windows[3].setScrollbarPosition(this.scrollPosition / (totalLines - this.visibleLines));
                    }
                }
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
        }
export { EmulatorDebugger };
