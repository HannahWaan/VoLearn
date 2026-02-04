/**
 * VoLearn AI Practice Lab - Split View
 * Version: 1.0.0
 * 
 * Resizable split view cho Exercise (kéo thả điều chỉnh)
 */

class SplitView {
    constructor(options = {}) {
        this.container = null;
        this.leftPane = null;
        this.rightPane = null;
        this.divider = null;
        
        this.minLeftWidth = options.minLeftWidth || 300;
        this.minRightWidth = options.minRightWidth || 300;
        this.initialRatio = options.initialRatio || 0.5; // 50-50 default
        
        this.isDragging = false;
        this.startX = 0;
        this.startLeftWidth = 0;
        
        // Callbacks
        this.onResize = options.onResize || null;
        
        // Bind methods
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
    }
    
    /**
     * Initialize split view
     */
    init(containerId = 'split-view-container') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('Split view container not found:', containerId);
            return this;
        }
        
        this.leftPane = this.container.querySelector('.split-left');
        this.rightPane = this.container.querySelector('.split-right');
        this.divider = this.container.querySelector('.split-divider');
        
        if (!this.leftPane || !this.rightPane || !this.divider) {
            console.warn('Split view panes or divider not found');
            return this;
        }
        
        this.setupDivider();
        this.setInitialSizes();
        this.bindEvents();
        
        console.log('✅ SplitView initialized');
        return this;
    }
    
    /**
     * Setup divider element
     */
    setupDivider() {
        this.divider.innerHTML = `
            <div class="divider-handle">
                <i class="fas fa-grip-lines-vertical"></i>
            </div>
        `;
        this.divider.setAttribute('role', 'separator');
        this.divider.setAttribute('aria-valuenow', '50');
    }
    
    /**
     * Set initial sizes
     */
    setInitialSizes() {
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const availableWidth = containerWidth - dividerWidth;
        
        const leftWidth = Math.floor(availableWidth * this.initialRatio);
        
        this.leftPane.style.width = `${leftWidth}px`;
        this.rightPane.style.flex = '1';
    }
    
    /**
     * Bind events
     */
    bindEvents() {
        // Mouse events
        this.divider.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        
        // Touch events
        this.divider.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd);
        
        // Double click to reset
        this.divider.addEventListener('dblclick', () => this.reset());
        
        // Window resize
        window.addEventListener('resize', () => this.handleWindowResize());
    }
    
    /**
     * Mouse down handler
     */
    handleMouseDown(e) {
        e.preventDefault();
        this.startDragging(e.clientX);
    }
    
    /**
     * Touch start handler
     */
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.startDragging(touch.clientX);
    }
    
    /**
     * Start dragging
     */
    startDragging(clientX) {
        this.isDragging = true;
        this.startX = clientX;
        this.startLeftWidth = this.leftPane.offsetWidth;
        
        this.container.classList.add('dragging');
        this.divider.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }
    
    /**
     * Mouse move handler
     */
    handleMouseMove(e) {
        if (!this.isDragging) return;
        this.updateSizes(e.clientX);
    }
    
    /**
     * Touch move handler
     */
    handleTouchMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        this.updateSizes(touch.clientX);
    }
    
    /**
     * Update sizes during drag
     */
    updateSizes(clientX) {
        const delta = clientX - this.startX;
        let newLeftWidth = this.startLeftWidth + delta;
        
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const maxLeftWidth = containerWidth - dividerWidth - this.minRightWidth;
        
        // Clamp to min/max
        newLeftWidth = Math.max(this.minLeftWidth, Math.min(maxLeftWidth, newLeftWidth));
        
        this.leftPane.style.width = `${newLeftWidth}px`;
        
        // Update aria value
        const percentage = Math.round((newLeftWidth / (containerWidth - dividerWidth)) * 100);
        this.divider.setAttribute('aria-valuenow', percentage);
        
        if (this.onResize) {
            this.onResize({
                leftWidth: newLeftWidth,
                rightWidth: containerWidth - dividerWidth - newLeftWidth,
                ratio: newLeftWidth / (containerWidth - dividerWidth)
            });
        }
    }
    
    /**
     * Mouse up handler
     */
    handleMouseUp() {
        this.stopDragging();
    }
    
    /**
     * Touch end handler
     */
    handleTouchEnd() {
        this.stopDragging();
    }
    
    /**
     * Stop dragging
     */
    stopDragging() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.container.classList.remove('dragging');
        this.divider.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // Save preference
        this.savePreference();
    }
    
    /**
     * Handle window resize
     */
    handleWindowResize() {
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const currentLeftWidth = this.leftPane.offsetWidth;
        const maxLeftWidth = containerWidth - dividerWidth - this.minRightWidth;
        
        if (currentLeftWidth > maxLeftWidth) {
            this.leftPane.style.width = `${maxLeftWidth}px`;
        }
    }
    
    /**
     * Reset to initial ratio
     */
    reset() {
        this.setInitialSizes();
        this.savePreference();
    }
    
    /**
     * Set ratio programmatically
     */
    setRatio(ratio) {
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const availableWidth = containerWidth - dividerWidth;
        
        let leftWidth = Math.floor(availableWidth * ratio);
        leftWidth = Math.max(this.minLeftWidth, Math.min(availableWidth - this.minRightWidth, leftWidth));
        
        this.leftPane.style.width = `${leftWidth}px`;
        this.savePreference();
    }
    
    /**
     * Save preference to localStorage
     */
    savePreference() {
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const leftWidth = this.leftPane.offsetWidth;
        const ratio = leftWidth / (containerWidth - dividerWidth);
        
        localStorage.setItem('volearn_splitview_ratio', ratio.toString());
    }
    
    /**
     * Load preference from localStorage
     */
    loadPreference() {
        const saved = localStorage.getItem('volearn_splitview_ratio');
        if (saved) {
            const ratio = parseFloat(saved);
            if (!isNaN(ratio) && ratio > 0 && ratio < 1) {
                this.initialRatio = ratio;
            }
        }
    }
    
    /**
     * Toggle fullscreen for a pane
     */
    toggleFullscreen(pane = 'left') {
        if (pane === 'left') {
            this.rightPane.classList.toggle('hidden');
            this.divider.classList.toggle('hidden');
            if (this.rightPane.classList.contains('hidden')) {
                this.leftPane.style.width = '100%';
            } else {
                this.setInitialSizes();
            }
        } else {
            this.leftPane.classList.toggle('hidden');
            this.divider.classList.toggle('hidden');
            if (this.leftPane.classList.contains('hidden')) {
                this.rightPane.style.width = '100%';
            } else {
                this.setInitialSizes();
            }
        }
    }
    
    /**
     * Collapse left pane
     */
    collapseLeft() {
        this.leftPane.style.width = `${this.minLeftWidth}px`;
        this.savePreference();
    }
    
    /**
     * Collapse right pane
     */
    collapseRight() {
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const maxLeftWidth = containerWidth - dividerWidth - this.minRightWidth;
        this.leftPane.style.width = `${maxLeftWidth}px`;
        this.savePreference();
    }
    
    /**
     * Get current state
     */
    getState() {
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const leftWidth = this.leftPane.offsetWidth;
        
        return {
            leftWidth,
            rightWidth: containerWidth - dividerWidth - leftWidth,
            ratio: leftWidth / (containerWidth - dividerWidth),
            containerWidth
        };
    }
    
    /**
     * Destroy
     */
    destroy() {
        this.divider.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        this.divider.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
    }
}

// Export
export const splitView = new SplitView();
export default SplitView;
/**
 * VoLearn AI Practice Lab - Split View
 * Version: 1.0.0
 * 
 * Resizable split view cho Exercise (kéo thả điều chỉnh)
 */

class SplitView {
    constructor(options = {}) {
        this.container = null;
        this.leftPane = null;
        this.rightPane = null;
        this.divider = null;
        
        this.minLeftWidth = options.minLeftWidth || 300;
        this.minRightWidth = options.minRightWidth || 300;
        this.initialRatio = options.initialRatio || 0.5; // 50-50 default
        
        this.isDragging = false;
        this.startX = 0;
        this.startLeftWidth = 0;
        
        // Callbacks
        this.onResize = options.onResize || null;
        
        // Bind methods
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
    }
    
    /**
     * Initialize split view
     */
    init(containerId = 'split-view-container') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('Split view container not found:', containerId);
            return this;
        }
        
        this.leftPane = this.container.querySelector('.split-left');
        this.rightPane = this.container.querySelector('.split-right');
        this.divider = this.container.querySelector('.split-divider');
        
        if (!this.leftPane || !this.rightPane || !this.divider) {
            console.warn('Split view panes or divider not found');
            return this;
        }
        
        this.setupDivider();
        this.setInitialSizes();
        this.bindEvents();
        
        console.log('✅ SplitView initialized');
        return this;
    }
    
    /**
     * Setup divider element
     */
    setupDivider() {
        this.divider.innerHTML = `
            <div class="divider-handle">
                <i class="fas fa-grip-lines-vertical"></i>
            </div>
        `;
        this.divider.setAttribute('role', 'separator');
        this.divider.setAttribute('aria-valuenow', '50');
    }
    
    /**
     * Set initial sizes
     */
    setInitialSizes() {
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const availableWidth = containerWidth - dividerWidth;
        
        const leftWidth = Math.floor(availableWidth * this.initialRatio);
        
        this.leftPane.style.width = `${leftWidth}px`;
        this.rightPane.style.flex = '1';
    }
    
    /**
     * Bind events
     */
    bindEvents() {
        // Mouse events
        this.divider.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        
        // Touch events
        this.divider.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd);
        
        // Double click to reset
        this.divider.addEventListener('dblclick', () => this.reset());
        
        // Window resize
        window.addEventListener('resize', () => this.handleWindowResize());
    }
    
    /**
     * Mouse down handler
     */
    handleMouseDown(e) {
        e.preventDefault();
        this.startDragging(e.clientX);
    }
    
    /**
     * Touch start handler
     */
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.startDragging(touch.clientX);
    }
    
    /**
     * Start dragging
     */
    startDragging(clientX) {
        this.isDragging = true;
        this.startX = clientX;
        this.startLeftWidth = this.leftPane.offsetWidth;
        
        this.container.classList.add('dragging');
        this.divider.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }
    
    /**
     * Mouse move handler
     */
    handleMouseMove(e) {
        if (!this.isDragging) return;
        this.updateSizes(e.clientX);
    }
    
    /**
     * Touch move handler
     */
    handleTouchMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();
        const touch = e.touches[0];
        this.updateSizes(touch.clientX);
    }
    
    /**
     * Update sizes during drag
     */
    updateSizes(clientX) {
        const delta = clientX - this.startX;
        let newLeftWidth = this.startLeftWidth + delta;
        
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const maxLeftWidth = containerWidth - dividerWidth - this.minRightWidth;
        
        // Clamp to min/max
        newLeftWidth = Math.max(this.minLeftWidth, Math.min(maxLeftWidth, newLeftWidth));
        
        this.leftPane.style.width = `${newLeftWidth}px`;
        
        // Update aria value
        const percentage = Math.round((newLeftWidth / (containerWidth - dividerWidth)) * 100);
        this.divider.setAttribute('aria-valuenow', percentage);
        
        if (this.onResize) {
            this.onResize({
                leftWidth: newLeftWidth,
                rightWidth: containerWidth - dividerWidth - newLeftWidth,
                ratio: newLeftWidth / (containerWidth - dividerWidth)
            });
        }
    }
    
    /**
     * Mouse up handler
     */
    handleMouseUp() {
        this.stopDragging();
    }
    
    /**
     * Touch end handler
     */
    handleTouchEnd() {
        this.stopDragging();
    }
    
    /**
     * Stop dragging
     */
    stopDragging() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.container.classList.remove('dragging');
        this.divider.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        // Save preference
        this.savePreference();
    }
    
    /**
     * Handle window resize
     */
    handleWindowResize() {
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const currentLeftWidth = this.leftPane.offsetWidth;
        const maxLeftWidth = containerWidth - dividerWidth - this.minRightWidth;
        
        if (currentLeftWidth > maxLeftWidth) {
            this.leftPane.style.width = `${maxLeftWidth}px`;
        }
    }
    
    /**
     * Reset to initial ratio
     */
    reset() {
        this.setInitialSizes();
        this.savePreference();
    }
    
    /**
     * Set ratio programmatically
     */
    setRatio(ratio) {
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const availableWidth = containerWidth - dividerWidth;
        
        let leftWidth = Math.floor(availableWidth * ratio);
        leftWidth = Math.max(this.minLeftWidth, Math.min(availableWidth - this.minRightWidth, leftWidth));
        
        this.leftPane.style.width = `${leftWidth}px`;
        this.savePreference();
    }
    
    /**
     * Save preference to localStorage
     */
    savePreference() {
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const leftWidth = this.leftPane.offsetWidth;
        const ratio = leftWidth / (containerWidth - dividerWidth);
        
        localStorage.setItem('volearn_splitview_ratio', ratio.toString());
    }
    
    /**
     * Load preference from localStorage
     */
    loadPreference() {
        const saved = localStorage.getItem('volearn_splitview_ratio');
        if (saved) {
            const ratio = parseFloat(saved);
            if (!isNaN(ratio) && ratio > 0 && ratio < 1) {
                this.initialRatio = ratio;
            }
        }
    }
    
    /**
     * Toggle fullscreen for a pane
     */
    toggleFullscreen(pane = 'left') {
        if (pane === 'left') {
            this.rightPane.classList.toggle('hidden');
            this.divider.classList.toggle('hidden');
            if (this.rightPane.classList.contains('hidden')) {
                this.leftPane.style.width = '100%';
            } else {
                this.setInitialSizes();
            }
        } else {
            this.leftPane.classList.toggle('hidden');
            this.divider.classList.toggle('hidden');
            if (this.leftPane.classList.contains('hidden')) {
                this.rightPane.style.width = '100%';
            } else {
                this.setInitialSizes();
            }
        }
    }
    
    /**
     * Collapse left pane
     */
    collapseLeft() {
        this.leftPane.style.width = `${this.minLeftWidth}px`;
        this.savePreference();
    }
    
    /**
     * Collapse right pane
     */
    collapseRight() {
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const maxLeftWidth = containerWidth - dividerWidth - this.minRightWidth;
        this.leftPane.style.width = `${maxLeftWidth}px`;
        this.savePreference();
    }
    
    /**
     * Get current state
     */
    getState() {
        const containerWidth = this.container.offsetWidth;
        const dividerWidth = this.divider.offsetWidth || 12;
        const leftWidth = this.leftPane.offsetWidth;
        
        return {
            leftWidth,
            rightWidth: containerWidth - dividerWidth - leftWidth,
            ratio: leftWidth / (containerWidth - dividerWidth),
            containerWidth
        };
    }
    
    /**
     * Destroy
     */
    destroy() {
        this.divider.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        this.divider.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
    }
}

// Export
export const splitView = new SplitView();
export default SplitView;
