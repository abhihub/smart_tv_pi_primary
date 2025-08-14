/**
 * TV Remote Navigation System
 * Supports arrow keys, Enter, Escape, and other TV remote buttons
 */

class TVRemoteController {
    constructor() {
        this.focusableElements = [];
        this.currentFocusIndex = 0;
        this.isEnabled = true;
        this.gridColumns = 3; // Default grid layout
        this.stableMode = false; // When true, prevents auto-refresh from MutationObserver
        
        // Key mappings for different remote types
        this.keyMappings = {
            // Standard Arrow keys
            'ArrowUp': 'up',
            'ArrowDown': 'down', 
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            
            // Enter/Select keys
            'Enter': 'select',
            'NumpadEnter': 'select',
            ' ': 'select', // Spacebar
            
            // Back/Exit keys
            'Escape': 'back',
            'Backspace': 'back',
            
            // TV Remote Media Keys
            'MediaPlayPause': 'select',
            'MediaPlay': 'select',
            'MediaPause': 'select',
            'MediaStop': 'back',
            'MediaTrackNext': 'right',
            'MediaTrackPrevious': 'left',
            'MediaFastForward': 'right',
            'MediaRewind': 'left',
            
            // TV Remote specific keys
            'ChannelUp': 'up',
            'ChannelDown': 'down',
            'VolumeUp': 'up',
            'VolumeDown': 'down',
            'VolumeMute': 'select',
            
            // HDMI-CEC Remote codes (as key codes)
            'F1': 'back',      // Often mapped to back/exit
            'F2': 'select',    // Often mapped to OK/select
            'F3': 'menu',      // Menu button
            'F4': 'home',      // Home button
            
            // Additional remote codes that might be sent
            'Home': 'home',
            'Menu': 'menu',
            'Info': 'info',
            'Guide': 'menu',
            'Exit': 'back',
            'Return': 'back',
            'Back': 'back',
            'Select': 'select',
            'OK': 'select',
            
            // Number keys (for direct selection)
            '0': 'number0', '1': 'number1', '2': 'number2', 
            '3': 'number3', '4': 'number4', '5': 'number5',
            '6': 'number6', '7': 'number7', '8': 'number8', '9': 'number9',
            
            // Keypad numbers
            'Numpad0': 'number0', 'Numpad1': 'number1', 'Numpad2': 'number2',
            'Numpad3': 'number3', 'Numpad4': 'number4', 'Numpad5': 'number5',
            'Numpad6': 'number6', 'Numpad7': 'number7', 'Numpad8': 'number8', 'Numpad9': 'number9'
        };
        
        // KeyCode mappings for TV remotes that don't send proper key names
        this.keyCodeMappings = {
            // Common TV remote keyCodes
            13: 'select',    // Enter
            27: 'back',      // Escape
            37: 'left',      // Left arrow
            38: 'up',        // Up arrow  
            39: 'right',     // Right arrow
            40: 'down',      // Down arrow
            32: 'select',    // Space
            8: 'back',       // Backspace
            
            // Function keys often used by TV remotes
            112: 'back',     // F1
            113: 'select',   // F2  
            114: 'menu',     // F3
            115: 'home',     // F4
            
            // Number keys
            48: 'number0', 49: 'number1', 50: 'number2', 51: 'number3', 52: 'number4',
            53: 'number5', 54: 'number6', 55: 'number7', 56: 'number8', 57: 'number9',
            
            // TV remote specific codes (varies by manufacturer)
            // Samsung TV remote
            403: 'select',   // Red button (Enter)
            404: 'back',     // Green button (Back)
            405: 'menu',     // Yellow button (Menu)
            406: 'info',     // Blue button (Info)
            
            // LG TV remote
            461: 'back',     // Back
            13: 'select',    // OK
            
            // Common media keys
            179: 'select',   // Play/Pause
            178: 'back',     // Stop
            176: 'right',    // Next
            177: 'left',     // Previous
        };
        
        this.init();
    }
    
    init() {
        console.log('🎮 TV Remote Controller initialized');
        this.setupEventListeners();
        this.scanFocusableElements();
        this.setInitialFocus();
    }
    
    setupEventListeners() {
        // Primary keydown listener for all key events
        document.addEventListener('keydown', (event) => {
            if (!this.isEnabled) return;
            
            // Log all key events for debugging TV remote
            console.log(`🎮 Key event - key: "${event.key}", code: "${event.code}", keyCode: ${event.keyCode}, which: ${event.which}`);
            
            const action = this.keyMappings[event.key];
            if (action) {
                event.preventDefault();
                event.stopPropagation();
                console.log(`🎮 Remote key: ${event.key} → ${action}`);
                this.handleAction(action);
                return;
            }
            
            // Try alternative mappings by keyCode for TV remotes
            const keyCodeAction = this.getActionByKeyCode(event.keyCode);
            if (keyCodeAction) {
                event.preventDefault();
                event.stopPropagation();
                console.log(`🎮 Remote keyCode: ${event.keyCode} → ${keyCodeAction}`);
                this.handleAction(keyCodeAction);
                return;
            }
            
            // Log unmapped keys for TV remote debugging
            console.log(`🎮 Unmapped key: "${event.key}" (code: ${event.code}, keyCode: ${event.keyCode})`);
        });
        
        // Additional listener for input events (some TV remotes use this)
        document.addEventListener('input', (event) => {
            console.log('🎮 Input event:', event);
        });
        
        // Gamepad API for some TV remotes that appear as gamepads
        this.setupGamepadSupport();
        
        // Handle mouse clicks (still allow mouse for development)
        document.addEventListener('click', (event) => {
            const clickedElement = event.target.closest('[data-focusable]');
            if (clickedElement) {
                const index = this.focusableElements.indexOf(clickedElement);
                if (index !== -1) {
                    this.setFocus(index);
                }
            }
        });
        
        // Re-scan when page changes
        window.addEventListener('load', () => {
            setTimeout(() => this.scanFocusableElements(), 100);
        });
    }
    
    scanFocusableElements() {
        // Find all focusable elements
        this.focusableElements = Array.from(document.querySelectorAll([
            '[data-focusable]',
            '.card[onclick]',
            '.card[href]', 
            'button:not([disabled])',
            'a[href]',
            '.control-btn',
            '.call-btn',
            '.back-btn'
        ].join(',')));
        
        // Add data-focusable attribute if missing
        this.focusableElements.forEach((element, index) => {
            if (!element.hasAttribute('data-focusable')) {
                element.setAttribute('data-focusable', 'true');
            }
            element.setAttribute('data-focus-index', index);
        });
        
        // Auto-detect grid layout
        this.detectGridLayout();
    }
    
    detectGridLayout() {
        // Try to detect grid layout from CSS
        const container = document.querySelector('.grid, .cards-grid, .users-grid');
        if (container) {
            const computedStyle = window.getComputedStyle(container);
            const gridTemplateColumns = computedStyle.gridTemplateColumns;
            if (gridTemplateColumns && gridTemplateColumns !== 'none') {
                this.gridColumns = gridTemplateColumns.split(' ').length;
            }
        }
    }
    
    setInitialFocus() {
        if (this.focusableElements.length > 0) {
            this.setFocus(0);
        }
    }
    
    setFocus(index) {
        // Remove focus from all elements
        this.focusableElements.forEach(el => {
            el.classList.remove('tv-focused');
            el.setAttribute('tabindex', '-1');
        });
        
        // Set focus to target element
        if (index >= 0 && index < this.focusableElements.length) {
            this.currentFocusIndex = index;
            const element = this.focusableElements[index];
            
            element.classList.add('tv-focused');
            element.setAttribute('tabindex', '0');
            element.focus();
            
            // Scroll into view if needed
            element.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'center'
            });
        }
    }
    
    handleAction(action) {
        switch (action) {
            case 'up':
                this.navigateUp();
                break;
            case 'down':
                this.navigateDown();
                break;
            case 'left':
                this.navigateLeft();
                break;
            case 'right':
                this.navigateRight();
                break;
            case 'select':
                this.activateElement();
                break;
            case 'back':
                this.goBack();
                break;
            case 'number1':
            case 'number2':
            case 'number3':
            case 'number4':
            case 'number5':
            case 'number6':
                this.selectByNumber(parseInt(action.slice(-1)));
                break;
        }
    }
    
    navigateUp() {
        const newIndex = this.currentFocusIndex - this.gridColumns;
        if (newIndex >= 0) {
            this.setFocus(newIndex);
        } else {
            // Wrap to bottom
            const bottomRowStart = Math.floor((this.focusableElements.length - 1) / this.gridColumns) * this.gridColumns;
            const column = this.currentFocusIndex % this.gridColumns;
            const targetIndex = Math.min(bottomRowStart + column, this.focusableElements.length - 1);
            this.setFocus(targetIndex);
        }
    }
    
    navigateDown() {
        const newIndex = this.currentFocusIndex + this.gridColumns;
        if (newIndex < this.focusableElements.length) {
            this.setFocus(newIndex);
        } else {
            // Wrap to top
            const column = this.currentFocusIndex % this.gridColumns;
            this.setFocus(column);
        }
    }
    
    navigateLeft() {
        if (this.currentFocusIndex > 0) {
            this.setFocus(this.currentFocusIndex - 1);
        } else {
            // Wrap to end
            this.setFocus(this.focusableElements.length - 1);
        }
    }
    
    navigateRight() {
        if (this.currentFocusIndex < this.focusableElements.length - 1) {
            this.setFocus(this.currentFocusIndex + 1);
        } else {
            // Wrap to beginning
            this.setFocus(0);
        }
    }
    
    activateElement() {
        const element = this.focusableElements[this.currentFocusIndex];
        if (!element) return;
        
        
        // Add visual feedback
        element.classList.add('tv-focused', 'pulse');
        setTimeout(() => element.classList.remove('pulse'), 600);
        
        // Try different activation methods in order of preference
        if (element.tagName === 'BUTTON') {
            // Direct button click
            element.click();
        } else if (element.onclick) {
            // Element has onclick handler
            element.onclick();
        } else if (element.href) {
            // Link navigation
            window.location.href = element.href;
        } else if (element.getAttribute('data-app')) {
            // Homepage tiles with data-app attribute
            const app = element.getAttribute('data-app');
            window.location.href = `${app}.html`;
        } else {
            // Fallback: dispatch click event
            element.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            }));
        }
    }
    
    goBack() {
        // Look for back button first
        const backBtn = document.querySelector('.back-btn, [data-action="back"]');
        if (backBtn) {
            backBtn.click();
            return;
        }
        
        // Try browser back
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // Go to homepage
            window.location.href = 'homepage.html';
        }
    }
    
    selectByNumber(number) {
        const targetIndex = number - 1;
        if (targetIndex >= 0 && targetIndex < this.focusableElements.length) {
            this.setFocus(targetIndex);
            // Auto-activate after short delay
            setTimeout(() => this.activateElement(), 300);
        }
    }
    
    // Public methods for page-specific control
    enable() {
        this.isEnabled = true;
    }
    
    disable() {
        this.isEnabled = false;
    }
    
    refresh() {
        // Don't rescan if focus is currently constrained to avoid breaking containment
        if (this.originalFocusableElements) {
            // Just re-index the current constrained elements
            this.focusableElements.forEach((element, index) => {
                element.setAttribute('data-focus-index', index);
            });
        } else {
            this.scanFocusableElements();
            this.setInitialFocus();
        }
    }
    
    setGridColumns(columns) {
        this.gridColumns = columns;
    }

    // Enable stable mode to prevent auto-refresh (useful for video calls)
    enableStableMode() {
        this.stableMode = true;
        console.log('🎮 🔒 Stable mode enabled - auto-refresh disabled');
    }

    // Disable stable mode to restore auto-refresh
    disableStableMode() {
        this.stableMode = false;
        console.log('🎮 🔓 Stable mode disabled - auto-refresh restored');
    }

    // Constrain focus to only elements within a specific container
    constrainFocusToContainer(container) {
        if (!container) {
            console.log('🎮 ❌ No container provided for focus constraint');
            return;
        }
        
        console.log('🎮 🔒 Constraining focus to container:', container.id || container.className);
        console.log('🎮 🔒 Original focusable elements count:', this.focusableElements.length);
        
        // Store original state
        this.originalFocusableElements = [...this.focusableElements];
        this.originalCurrentFocusIndex = this.currentFocusIndex;
        
        console.log('🎮 🔒 Stored original state - elements:', this.originalFocusableElements.length, 'index:', this.originalCurrentFocusIndex);
        
        // Only include focusable elements within the container
        const originalElements = this.focusableElements;
        this.focusableElements = this.focusableElements.filter(element => 
            container.contains(element)
        );
        
        console.log('🎮 🔒 Filtered elements:', this.focusableElements.map(el => ({
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            textContent: el.textContent?.substring(0, 30)
        })));
        
        // Re-index the filtered elements
        this.focusableElements.forEach((element, index) => {
            element.setAttribute('data-focus-index', index);
        });
        
        console.log(`🎮 🔒 ✅ Focus constrained from ${originalElements.length} to ${this.focusableElements.length} elements`);
        
        // Set focus to first element in container
        if (this.focusableElements.length > 0) {
            console.log('🎮 🔒 Setting focus to first element in container');
            this.setFocus(0);
        } else {
            console.log('🎮 🔒 ❌ No focusable elements found in container!');
        }
    }
    
    // Restore original focus scope
    restoreOriginalFocusScope() {
        console.log('🎮 🔓 Restoring original focus scope');
        
        if (this.originalFocusableElements) {
            console.log('🎮 🔓 Restoring from:', this.focusableElements.length, 'to:', this.originalFocusableElements.length, 'elements');
            
            this.focusableElements = [...this.originalFocusableElements];
            
            // Re-index all elements
            this.focusableElements.forEach((element, index) => {
                element.setAttribute('data-focus-index', index);
            });
            
            console.log(`🎮 🔓 Focus scope restored to ${this.focusableElements.length} elements`);
            
            // Restore previous focus or set to first element
            const targetIndex = this.originalCurrentFocusIndex || 0;
            console.log(`🎮 🔓 Restoring focus to index: ${targetIndex}`);
            
            if (targetIndex < this.focusableElements.length) {
                this.setFocus(targetIndex);
            } else {
                console.log(`🎮 🔓 Target index ${targetIndex} out of range, setting to 0`);
                this.setFocus(0);
            }
            
            // Clear stored state
            this.originalFocusableElements = null;
            this.originalCurrentFocusIndex = null;
            
            console.log('🎮 🔓 ✅ Original focus scope restored successfully');
        } else {
            console.log('🎮 🔓 ❌ No original focus state to restore');
        }
    }
    
    getActionByKeyCode(keyCode) {
        return this.keyCodeMappings[keyCode];
    }
    
    setupGamepadSupport() {
        // Some TV remotes appear as gamepads
        window.addEventListener('gamepadconnected', (event) => {
            console.log('🎮 Gamepad connected:', event.gamepad);
            this.pollGamepad();
        });
        
        this.gamepadInterval = null;
    }
    
    pollGamepad() {
        if (this.gamepadInterval) return;
        
        this.gamepadInterval = setInterval(() => {
            const gamepads = navigator.getGamepads();
            for (let gamepad of gamepads) {
                if (gamepad) {
                    this.handleGamepadInput(gamepad);
                }
            }
        }, 100);
    }
    
    handleGamepadInput(gamepad) {
        // Map gamepad buttons to actions
        if (gamepad.buttons[0].pressed) { // A button
            this.handleAction('select');
        }
        if (gamepad.buttons[1].pressed) { // B button  
            this.handleAction('back');
        }
        
        // D-pad or analog stick
        if (gamepad.axes[0] < -0.5) this.handleAction('left');
        if (gamepad.axes[0] > 0.5) this.handleAction('right');
        if (gamepad.axes[1] < -0.5) this.handleAction('up');
        if (gamepad.axes[1] > 0.5) this.handleAction('down');
    }
}

// Global instance
window.tvRemote = new TVRemoteController();

// Auto-refresh when page content changes (but ignore video-related changes)
const observer = new MutationObserver((mutations) => {
    if (!window.tvRemote) return;
    
    // Filter out mutations that are video-related or focus-related to prevent constant refreshing
    const relevantMutations = mutations.filter(mutation => {
        // Ignore mutations to video elements and their containers
        if (mutation.target.tagName === 'VIDEO') return false;
        if (mutation.target.classList?.contains('participant-video')) return false;
        if (mutation.target.classList?.contains('participant')) return false;
        if (mutation.target.classList?.contains('video-container')) return false;
        if (mutation.target.id === 'videoContainer') return false;
        
        // Ignore focus-related attribute changes to prevent refresh cycles
        if (mutation.type === 'attributes') {
            if (mutation.attributeName === 'tabindex') {
                console.log('🎮 🚫 Ignoring tabindex attribute change to prevent refresh cycle');
                return false;
            }
            if (mutation.attributeName === 'class' && mutation.target.hasAttribute('data-focusable')) {
                // Check if this is just a tv-focused class change
                const target = mutation.target;
                if (target.classList.contains('tv-focused') || mutation.oldValue?.includes('tv-focused')) {
                    console.log('🎮 🚫 Ignoring tv-focused class change to prevent refresh cycle');
                    return false;
                }
            }
        }
        
        // Ignore mutations where added/removed nodes are video-related
        const hasVideoChanges = Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes))
            .some(node => {
                if (node.nodeType !== Node.ELEMENT_NODE) return false;
                const element = node;
                return element.tagName === 'VIDEO' || 
                       element.classList?.contains('participant-video') ||
                       element.classList?.contains('participant') ||
                       element.id?.startsWith('participant-');
            });
        
        if (hasVideoChanges) {
            console.log('🎮 🚫 Ignoring video-related mutation to prevent focus loss');
            return false;
        }
        
        return true;
    });
    
    // Only refresh if there are relevant mutations and not in stable mode
    if (relevantMutations.length > 0) {
        if (window.tvRemote.stableMode) {
            console.log('🎮 🔒 Stable mode: Ignoring mutations to preserve focus');
            return;
        }
        
        clearTimeout(window.tvRemote.refreshTimeout);
        window.tvRemote.refreshTimeout = setTimeout(() => {
            console.log('🎮 🔄 MutationObserver triggered refresh');
            window.tvRemote.refresh(); // Use refresh() instead of scanFocusableElements()
        }, 500);
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true
});