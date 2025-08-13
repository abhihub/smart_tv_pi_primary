/**
 * Universal Navigation System for Smart TV
 * This script provides consistent keyboard navigation across all pages
 */

class UniversalNavigation {
    constructor() {
        this.focusableElements = [];
        this.currentFocusIndex = 0;
        this.initialized = false;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    init() {
        //console.log('🎮 Initializing Universal Navigation');
        
        // Check if there's already a navigation system (like on homepage)
        if (this.hasExistingNavigation()) {
            //console.log('🎮 Existing navigation detected, Universal Navigation will be passive');
            this.isPassive = true;
            return;
        }
        
        this.updateFocusableElements();
        this.setupKeyboardListeners();
        this.setupMutationObserver();
        this.initialized = true;
        
        // Set initial focus if elements are available
        if (this.focusableElements.length > 0) {
            this.setFocus(0);
        }
    }
    
    hasExistingNavigation() {
        // Check if homepage navigation exists
        if (typeof currentFocus !== 'undefined' || 
            document.querySelector('.tiles-container') || 
            window.location.pathname.includes('homepage.html')) {
            //console.log('🎮 Homepage navigation detected');
            return true;
        }
        
        // Check for other existing navigation systems
        const existingListeners = document._eventListeners;
        if (existingListeners && existingListeners.keydown) {
            //console.log('🎮 Existing keydown listeners detected');
            return existingListeners.keydown.length > 0;
        }
        
        //console.log('🎮 No existing navigation detected, will initialize universal nav');
        return false;
    }
    
    updateFocusableElements() {
        // Define focusable element selectors
        const selectors = [
            'button:not([disabled])',
            'a[href]',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '.tile', // Homepage tiles
            '.focusable', // Custom focusable elements
            '.network-item', // WiFi network items
            '.keyboard-key' // Onscreen keyboard keys
        ].join(', ');
        
        // Get all focusable elements
        const elements = Array.from(document.querySelectorAll(selectors))
            .filter(el => {
                // Filter out hidden elements
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       el.offsetParent !== null;
            });
        
        this.focusableElements = elements;
        //console.log(`🎮 Found ${this.focusableElements.length} focusable elements on ${window.location.pathname}`);
        
        // Debug: Log the first few elements
        if (this.focusableElements.length > 0) {
            //console.log('🎮 First few focusable elements:', 
                this.focusableElements.slice(0, 3).map(el => 
                    `${el.tagName}${el.className ? '.' + el.className.split(' ')[0] : ''}${el.id ? '#' + el.id : ''}`
                )
            );
        }
        
        // Ensure current focus index is valid
        if (this.currentFocusIndex >= this.focusableElements.length) {
            this.currentFocusIndex = Math.max(0, this.focusableElements.length - 1);
        }
    }
    
    setupKeyboardListeners() {
        //console.log('🎮 Setting up keyboard listeners for universal navigation');
        document.addEventListener('keydown', (event) => {
            //console.log('🎮 Universal nav received key:', event.key, 'passive:', this.isPassive);
            
            // Don't interfere if in passive mode
            if (this.isPassive) {
                //console.log('🎮 In passive mode, ignoring key');
                return;
            }
            
            // Don't interfere if user is typing in an input field
            if (event.target.tagName === 'INPUT' || 
                event.target.tagName === 'TEXTAREA' || 
                event.target.isContentEditable) {
               //console.log('🎮 User typing in input field, ignoring key');
                return;
            }
            
            //console.log('🎮 Processing navigation key:', event.key);
            
            switch (event.key) {
                case 'ArrowRight':
                    event.preventDefault();
                    this.navigateNext();
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    this.navigatePrevious();
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    this.navigateDown();
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    this.navigateUp();
                    break;
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    this.activateCurrentElement();
                    break;
                case 'Escape':
                    event.preventDefault();
                    this.handleEscape();
                    break;
            }
        });
    }
    
    setupMutationObserver() {
        // Watch for DOM changes to update focusable elements
        const observer = new MutationObserver(() => {
            this.updateFocusableElements();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'disabled', 'hidden']
        });
    }
    
    navigateNext() {
        if (this.focusableElements.length === 0) return;
        
        this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
        this.setFocus(this.currentFocusIndex);
    }
    
    navigatePrevious() {
        if (this.focusableElements.length === 0) return;
        
        this.currentFocusIndex = (this.currentFocusIndex - 1 + this.focusableElements.length) % this.focusableElements.length;
        this.setFocus(this.currentFocusIndex);
    }
    
    navigateDown() {
        // For grid layouts, try to move 3 positions down (like homepage)
        // Otherwise, just move to next element
        if (this.focusableElements.length === 0) return;
        
        const gridJump = 3;
        let newIndex = this.currentFocusIndex + gridJump;
        
        if (newIndex >= this.focusableElements.length) {
            // If we can't jump by grid, just go to next element
            newIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
        }
        
        this.currentFocusIndex = newIndex;
        this.setFocus(this.currentFocusIndex);
    }
    
    navigateUp() {
        // For grid layouts, try to move 3 positions up (like homepage)
        // Otherwise, just move to previous element
        if (this.focusableElements.length === 0) return;
        
        const gridJump = 3;
        let newIndex = this.currentFocusIndex - gridJump;
        
        if (newIndex < 0) {
            // If we can't jump by grid, just go to previous element
            newIndex = (this.currentFocusIndex - 1 + this.focusableElements.length) % this.focusableElements.length;
        }
        
        this.currentFocusIndex = newIndex;
        this.setFocus(this.currentFocusIndex);
    }
    
    setFocus(index) {
        if (index < 0 || index >= this.focusableElements.length) return;
        
        // Remove focus from all elements
        this.focusableElements.forEach(el => {
            el.classList.remove('focused');
            el.blur();
        });
        
        // Set focus on target element
        const targetElement = this.focusableElements[index];
        targetElement.focus();
        targetElement.classList.add('focused');
        
        // Scroll into view if needed
        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });
        
        this.currentFocusIndex = index;
        //console.log(`🎮 Focus set to element ${index}: ${targetElement.tagName}${targetElement.className ? '.' + targetElement.className : ''}`);
    }
    
    activateCurrentElement() {
        if (this.currentFocusIndex < 0 || this.currentFocusIndex >= this.focusableElements.length) return;
        
        const element = this.focusableElements[this.currentFocusIndex];
        
        if (element.tagName === 'BUTTON' || element.tagName === 'A') {
            element.click();
        } else if (element.tagName === 'INPUT') {
            if (element.type === 'checkbox' || element.type === 'radio') {
                element.click();
            } else {
                // For text inputs, just focus them (user can start typing)
                element.focus();
            }
        } else if (element.classList.contains('tile')) {
            // Handle homepage tiles
            element.click();
        } else {
            // For other elements, try clicking
            element.click();
        }
        
        //console.log(`🎮 Activated element: ${element.tagName}`);
    }
    
    handleEscape() {
        // Go back to previous page or close modals
        const modals = document.querySelectorAll('.modal, .update-modal, [style*="display: block"]');
        const openModal = Array.from(modals).find(modal => {
            const style = window.getComputedStyle(modal);
            return style.display === 'block' || style.display === 'flex';
        });
        
        if (openModal) {
            // Close modal
            openModal.style.display = 'none';
            // Try to trigger close function if available
            if (typeof closeModal === 'function') {
                closeModal();
            }
        } else {
            // Go back
            if (typeof goBack === 'function') {
                goBack();
            } else if (window.history.length > 1) {
                window.history.back();
            } else {
                // Go to homepage
                window.location.href = 'homepage.html';
            }
        }
    }
    
    // Public method to refresh focusable elements (useful after dynamic content changes)
    refresh() {
        this.updateFocusableElements();
        if (this.focusableElements.length > 0 && this.currentFocusIndex >= 0) {
            this.setFocus(Math.min(this.currentFocusIndex, this.focusableElements.length - 1));
        }
    }
    
    // Public method to refresh navigation when content changes
    refreshNavigation() {
        //console.log('🎮 Refreshing navigation due to content change');
        this.refresh();
    }
    
    // Public method to set focus to a specific element
    focusElement(element) {
        const index = this.focusableElements.indexOf(element);
        if (index !== -1) {
            this.setFocus(index);
        }
    }
}

// Create global instance
window.universalNav = new UniversalNavigation();

// Global function to refresh navigation (can be called from any page)
window.refreshNavigation = function() {
    if (window.universalNav) {
        window.universalNav.refreshNavigation();
    }
};

// Add CSS for focused elements
const navStyle = document.createElement('style');
navStyle.textContent = `
    .focused {
        outline: 3px solid #667eea !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 1px rgba(102, 126, 234, 0.5) !important;
        transition: all 0.2s ease !important;
    }
    
    button.focused, 
    .tile.focused {
        transform: scale(1.05) !important;
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4) !important;
    }
`;
document.head.appendChild(navStyle);

//console.log('🎮 Universal Navigation System loaded');