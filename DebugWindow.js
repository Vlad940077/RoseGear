       class DebugWindow {
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
