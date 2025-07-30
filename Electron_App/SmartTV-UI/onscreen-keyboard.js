/**
 * Onscreen Keyboard for SmartTV
 * Designed for mobile remote control navigation
 */

class OnscreenKeyboard {
    constructor() {
        this.isVisible = false;
        this.targetInput = null;
        this.currentLayout = 'lowercase';
        this.keyboardElement = null;
        this.shiftPressed = false;
        
        // Keyboard layouts
        this.layouts = {
            lowercase: [
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
                ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
                ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
                ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
                ['symbols', 'space', 'done']
            ],
            uppercase: [
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
                ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
                ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
                ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'backspace'],
                ['symbols', 'space', 'done']
            ],
            symbols: [
                ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
                ['-', '_', '=', '+', '[', ']', '{', '}', '\\', '|'],
                [';', ':', '"', "'", '<', '>', ',', '.', '?', '/'],
                ['shift', '~', '`', ' ', ' ', ' ', ' ', ' ', 'backspace'],
                ['letters', 'space', 'done']
            ]
        };
        
        this.createKeyboard();
    }
    
    createKeyboard() {
        console.log('⌨️ Creating onscreen keyboard');
        
        // Create keyboard container
        this.keyboardElement = document.createElement('div');
        this.keyboardElement.id = 'onscreen-keyboard';
        this.keyboardElement.className = 'onscreen-keyboard hidden';
        
        // Add CSS styles
        this.addKeyboardStyles();
        
        // Create keyboard layout
        this.buildLayout();
        
        // Add to body
        document.body.appendChild(this.keyboardElement);
        
        console.log('✅ Onscreen keyboard created');
    }
    
    addKeyboardStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .onscreen-keyboard {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
                border-top: 3px solid rgba(102, 126, 234, 0.6);
                padding: 20px;
                z-index: 10000;
                transform: translateY(100%);
                transition: transform 0.3s ease;
                box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(10px);
            }
            
            .onscreen-keyboard.visible {
                transform: translateY(0);
            }
            
            .onscreen-keyboard.hidden {
                transform: translateY(100%);
            }
            
            .keyboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .keyboard-title {
                color: white;
                font-size: 18px;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .input-preview {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                padding: 10px 15px;
                color: white;
                font-family: monospace;
                font-size: 16px;
                min-width: 300px;
                max-width: 500px;
                word-break: break-all;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .keyboard-rows {
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: 800px;
                margin: 0 auto;
            }
            
            .keyboard-row {
                display: flex;
                justify-content: center;
                gap: 8px;
            }
            
            .keyboard-key {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                color: white;
                font-size: 16px;
                font-weight: bold;
                padding: 12px;
                min-width: 45px;
                min-height: 45px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                user-select: none;
                position: relative;
                outline: none;
            }
            
            .keyboard-key:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.4);
                transform: translateY(-2px);
            }
            
            .keyboard-key.focused {
                border-color: #667eea !important;
                background: rgba(102, 126, 234, 0.3) !important;
                box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.5) !important;
                transform: scale(1.1) !important;
            }
            
            .keyboard-key.special {
                background: rgba(102, 126, 234, 0.2);
                border-color: rgba(102, 126, 234, 0.4);
                font-size: 14px;
            }
            
            .keyboard-key.special:hover {
                background: rgba(102, 126, 234, 0.4);
            }
            
            .keyboard-key.space {
                min-width: 200px;
            }
            
            .keyboard-key.shift.active {
                background: rgba(255, 255, 0, 0.3);
                border-color: rgba(255, 255, 0, 0.6);
            }
            
            .keyboard-key.backspace {
                background: rgba(248, 113, 113, 0.2);
                border-color: rgba(248, 113, 113, 0.4);
            }
            
            .keyboard-key.done {
                background: rgba(34, 197, 94, 0.2);
                border-color: rgba(34, 197, 94, 0.4);
            }
            
            .keyboard-instructions {
                text-align: center;
                color: rgba(255, 255, 255, 0.7);
                font-size: 14px;
                margin-top: 10px;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    buildLayout() {
        const layout = this.layouts[this.currentLayout];
        
        this.keyboardElement.innerHTML = `
            <div class="keyboard-header">
                <div class="keyboard-title">
                    ⌨️ Onscreen Keyboard
                </div>
                <div class="input-preview" id="keyboard-preview"></div>
            </div>
            <div class="keyboard-rows" id="keyboard-rows">
            </div>
            <div class="keyboard-instructions">
                Use your mobile remote to navigate and select keys
            </div>
        `;
        
        const rowsContainer = this.keyboardElement.querySelector('#keyboard-rows');
        
        layout.forEach((row, rowIndex) => {
            const rowElement = document.createElement('div');
            rowElement.className = 'keyboard-row';
            
            row.forEach((key, keyIndex) => {
                const keyElement = document.createElement('button');
                keyElement.className = 'keyboard-key';
                keyElement.setAttribute('tabindex', '0');
                keyElement.setAttribute('data-key', key);
                keyElement.setAttribute('data-row', rowIndex);
                keyElement.setAttribute('data-col', keyIndex);
                
                // Style special keys
                if (['shift', 'backspace', 'done', 'symbols', 'letters', 'space'].includes(key)) {
                    keyElement.classList.add('special');
                    
                    if (key === 'space') {
                        keyElement.classList.add('space');
                    } else if (key === 'shift') {
                        keyElement.classList.add('shift');
                        if (this.shiftPressed) {
                            keyElement.classList.add('active');
                        }
                    } else if (key === 'backspace') {
                        keyElement.classList.add('backspace');
                    } else if (key === 'done') {
                        keyElement.classList.add('done');
                    }
                }
                
                // Set key display text
                keyElement.textContent = this.getKeyDisplayText(key);
                
                // Add click handler
                keyElement.addEventListener('click', () => this.handleKeyPress(key));
                
                rowElement.appendChild(keyElement);
            });
            
            rowsContainer.appendChild(rowElement);
        });
        
        this.updatePreview();
    }
    
    getKeyDisplayText(key) {
        const keyMap = {
            'space': 'Space',
            'backspace': '⌫',
            'shift': '⇧',
            'done': '✓ Done',
            'symbols': '!@#',
            'letters': 'ABC'
        };
        
        return keyMap[key] || key;
    }
    
    handleKeyPress(key) {
        console.log('⌨️ Key pressed:', key);
        
        if (!this.targetInput) {
            console.warn('⌨️ No target input set');
            return;
        }
        
        switch (key) {
            case 'shift':
                this.toggleShift();
                break;
            case 'backspace':
                this.handleBackspace();
                break;
            case 'space':
                this.insertText(' ');
                break;
            case 'done':
                this.hide();
                break;
            case 'symbols':
                this.switchLayout('symbols');
                break;
            case 'letters':
                this.switchLayout(this.shiftPressed ? 'uppercase' : 'lowercase');
                break;
            default:
                this.insertText(key);
                // Auto-shift off after typing a character
                if (this.shiftPressed && this.currentLayout !== 'symbols') {
                    this.toggleShift();
                }
                break;
        }
        
        this.updatePreview();
        
        // Refresh navigation to maintain focus
        if (typeof refreshNavigation === 'function') {
            setTimeout(() => refreshNavigation(), 50);
        }
    }
    
    toggleShift() {
        this.shiftPressed = !this.shiftPressed;
        
        if (this.currentLayout === 'lowercase') {
            this.switchLayout('uppercase');
        } else if (this.currentLayout === 'uppercase') {
            this.switchLayout('lowercase');
        }
        
        console.log('⌨️ Shift toggled:', this.shiftPressed);
    }
    
    switchLayout(layout) {
        if (layout === 'uppercase') {
            this.currentLayout = 'uppercase';
            this.shiftPressed = true;
        } else if (layout === 'lowercase') {
            this.currentLayout = 'lowercase';
            this.shiftPressed = false;
        } else {
            this.currentLayout = layout;
        }
        
        this.buildLayout();
        console.log('⌨️ Switched to layout:', this.currentLayout);
    }
    
    insertText(text) {
        if (!this.targetInput) return;
        
        const currentValue = this.targetInput.value;
        const selectionStart = this.targetInput.selectionStart || currentValue.length;
        const selectionEnd = this.targetInput.selectionEnd || currentValue.length;
        
        const newValue = currentValue.substring(0, selectionStart) + 
                        text + 
                        currentValue.substring(selectionEnd);
        
        this.targetInput.value = newValue;
        
        // Set cursor position after inserted text
        const newCursorPos = selectionStart + text.length;
        this.targetInput.setSelectionRange(newCursorPos, newCursorPos);
        
        // Trigger input event
        this.targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    handleBackspace() {
        if (!this.targetInput) return;
        
        const currentValue = this.targetInput.value;
        const selectionStart = this.targetInput.selectionStart || currentValue.length;
        const selectionEnd = this.targetInput.selectionEnd || currentValue.length;
        
        if (selectionStart !== selectionEnd) {
            // Delete selected text
            const newValue = currentValue.substring(0, selectionStart) + 
                            currentValue.substring(selectionEnd);
            this.targetInput.value = newValue;
            this.targetInput.setSelectionRange(selectionStart, selectionStart);
        } else if (selectionStart > 0) {
            // Delete character before cursor
            const newValue = currentValue.substring(0, selectionStart - 1) + 
                            currentValue.substring(selectionStart);
            this.targetInput.value = newValue;
            this.targetInput.setSelectionRange(selectionStart - 1, selectionStart - 1);
        }
        
        // Trigger input event
        this.targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    updatePreview() {
        const preview = this.keyboardElement.querySelector('#keyboard-preview');
        if (preview && this.targetInput) {
            const value = this.targetInput.value;
            preview.textContent = value || 'Enter password...';
            
            // Show cursor position with |
            if (value) {
                const cursorPos = this.targetInput.selectionStart || value.length;
                const beforeCursor = value.substring(0, cursorPos);
                const afterCursor = value.substring(cursorPos);
                preview.innerHTML = `${beforeCursor}<span style="background: #667eea; color: white;">|</span>${afterCursor}`;
            }
        }
    }
    
    show(inputElement) {
        console.log('⌨️ Showing onscreen keyboard');
        
        this.targetInput = inputElement;
        this.isVisible = true;
        
        // Reset to lowercase layout
        this.currentLayout = 'lowercase';
        this.shiftPressed = false;
        this.buildLayout();
        
        // Show keyboard
        this.keyboardElement.classList.remove('hidden');
        this.keyboardElement.classList.add('visible');
        
        // Update preview
        this.updatePreview();
        
        // Refresh navigation to include keyboard keys
        if (typeof refreshNavigation === 'function') {
            setTimeout(() => refreshNavigation(), 200);
        }
    }
    
    hide() {
        console.log('⌨️ Hiding onscreen keyboard');
        
        this.isVisible = false;
        this.keyboardElement.classList.remove('visible');
        this.keyboardElement.classList.add('hidden');
        
        // Clear target input
        this.targetInput = null;
        
        // Refresh navigation to remove keyboard keys
        if (typeof refreshNavigation === 'function') {
            setTimeout(() => refreshNavigation(), 200);
        }
    }
    
    isKeyboardVisible() {
        return this.isVisible;
    }
}

// Create global instance
window.onscreenKeyboard = new OnscreenKeyboard();

// Global functions for easy access
window.showKeyboard = function(inputElement) {
    if (window.onscreenKeyboard) {
        window.onscreenKeyboard.show(inputElement);
    }
};

window.hideKeyboard = function() {
    if (window.onscreenKeyboard) {
        window.onscreenKeyboard.hide();
    }
};

console.log('⌨️ Onscreen Keyboard System loaded');