/**
 * VidPOD Rundown Editor - Mobile Touch & Drag-Drop Enhancement
 * Phase 5: Touch-optimized drag and drop for mobile devices
 */

class RundownTouchMobile {
    constructor(editor) {
        this.editor = editor;
        this.touchState = {
            isDragging: false,
            startY: 0,
            startX: 0,
            currentY: 0,
            currentX: 0,
            draggedElement: null,
            draggedId: null,
            scrollContainer: null,
            autoScrollInterval: null,
            touchIdentifier: null,
            initialTouchTime: 0,
            longPressTimer: null,
            dropZones: [],
            activeDropZone: null
        };

        this.options = {
            longPressDuration: 500,
            scrollSpeed: 5,
            scrollThreshold: 50,
            dragThreshold: 10,
            vibrationEnabled: true
        };

        this.init();
    }

    init() {
        console.log('🔧 Initializing mobile touch controls...');
        
        this.setupTouchEventListeners();
        this.setupGestureSupport();
        this.setupAccessibilityFeatures();
        
        console.log('✅ Mobile touch controls initialized');
    }

    setupTouchEventListeners() {
        const segmentsList = document.getElementById('segmentsList');
        if (!segmentsList) return;

        // Use passive listeners for better performance
        segmentsList.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        segmentsList.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        segmentsList.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        segmentsList.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });

        // Handle context menu for long press
        segmentsList.addEventListener('contextmenu', this.handleContextMenu.bind(this));

        // Setup scroll container
        this.touchState.scrollContainer = segmentsList.closest('.segments-list') || 
                                         segmentsList.closest('.editor-content') || 
                                         document.body;
    }

    setupGestureSupport() {
        // Prevent default iOS zoom and bounce
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Prevent default drag behavior on images and links
        document.addEventListener('dragstart', (e) => {
            if (this.touchState.isDragging) {
                e.preventDefault();
            }
        });
    }

    setupAccessibilityFeatures() {
        // Add ARIA attributes for screen readers
        const segments = document.querySelectorAll('.segment-item');
        segments.forEach((segment, index) => {
            segment.setAttribute('role', 'listitem');
            segment.setAttribute('aria-label', `Segment ${index + 1}. Draggable.`);
            segment.setAttribute('tabindex', '0');
            
            // Add keyboard support
            segment.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
        });

        // Add instructions for screen readers
        const segmentsList = document.getElementById('segmentsList');
        if (segmentsList) {
            segmentsList.setAttribute('aria-label', 'Rundown segments list. Use touch and hold to drag segments to reorder.');
        }
    }

    handleKeyboardNavigation(e) {
        const segment = e.currentTarget;
        const segments = Array.from(document.querySelectorAll('.segment-item'));
        const currentIndex = segments.indexOf(segment);

        switch(e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    segments[currentIndex - 1].focus();
                }
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < segments.length - 1) {
                    segments[currentIndex + 1].focus();
                }
                break;
                
            case ' ':
            case 'Enter':
                e.preventDefault();
                this.toggleSegmentSelection(segment);
                break;
                
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                this.showSegmentDeleteConfirmation(segment);
                break;
        }
    }

    handleTouchStart(e) {
        // Only handle single finger touches
        if (e.touches.length !== 1) return;

        const touch = e.touches[0];
        const segmentItem = touch.target.closest('.segment-item');
        
        if (!segmentItem) return;

        // Store initial touch state
        this.touchState.startY = touch.clientY;
        this.touchState.startX = touch.clientX;
        this.touchState.currentY = touch.clientY;
        this.touchState.currentX = touch.clientX;
        this.touchState.touchIdentifier = touch.identifier;
        this.touchState.initialTouchTime = Date.now();
        this.touchState.draggedElement = segmentItem;
        this.touchState.draggedId = segmentItem.dataset.segmentId;

        // Start long press timer
        this.touchState.longPressTimer = setTimeout(() => {
            this.startDragMode(segmentItem, touch);
        }, this.options.longPressDuration);

        // Prevent default to avoid scrolling
        e.preventDefault();
    }

    handleTouchMove(e) {
        if (!this.touchState.longPressTimer && !this.touchState.isDragging) return;

        const touch = Array.from(e.touches).find(t => t.identifier === this.touchState.touchIdentifier);
        if (!touch) return;

        this.touchState.currentY = touch.clientY;
        this.touchState.currentX = touch.clientX;

        const deltaY = Math.abs(touch.clientY - this.touchState.startY);
        const deltaX = Math.abs(touch.clientX - this.touchState.startX);

        // If moved too much before long press, cancel drag
        if (!this.touchState.isDragging && (deltaY > this.options.dragThreshold || deltaX > this.options.dragThreshold)) {
            this.cancelDragMode();
            return;
        }

        // If in drag mode, update drag position
        if (this.touchState.isDragging) {
            this.updateDragPosition(touch);
            this.handleAutoScroll(touch);
            this.updateDropZones(touch);
            e.preventDefault();
        }
    }

    handleTouchEnd(e) {
        if (this.touchState.isDragging) {
            this.endDragMode();
        } else {
            this.cancelDragMode();
            
            // Handle tap if it was quick and didn't move much
            const touchDuration = Date.now() - this.touchState.initialTouchTime;
            const deltaY = Math.abs(this.touchState.currentY - this.touchState.startY);
            const deltaX = Math.abs(this.touchState.currentX - this.touchState.startX);
            
            if (touchDuration < 300 && deltaY < this.options.dragThreshold && deltaX < this.options.dragThreshold) {
                this.handleTap(this.touchState.draggedElement);
            }
        }

        this.resetTouchState();
        e.preventDefault();
    }

    handleTouchCancel(e) {
        if (this.touchState.isDragging) {
            this.cancelDragMode();
        }
        this.resetTouchState();
    }

    handleContextMenu(e) {
        if (this.touchState.isDragging) {
            e.preventDefault();
        }
    }

    startDragMode(segmentItem, touch) {
        console.log('🔧 Starting mobile drag mode for segment:', this.touchState.draggedId);
        
        this.touchState.isDragging = true;
        
        // Add drag styling
        segmentItem.classList.add('dragging');
        
        // Create drag ghost element
        this.createDragGhost(segmentItem);
        
        // Setup drop zones
        this.setupDropZones();
        
        // Provide haptic feedback if available
        this.provideFeedback('start');
        
        // Update ARIA attributes
        segmentItem.setAttribute('aria-grabbed', 'true');
        
        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
    }

    createDragGhost(segmentItem) {
        const ghost = segmentItem.cloneNode(true);
        ghost.classList.add('drag-ghost');
        ghost.style.position = 'fixed';
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '1000';
        ghost.style.opacity = '0.8';
        ghost.style.transform = 'rotate(2deg) scale(1.05)';
        ghost.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
        ghost.style.borderRadius = '12px';
        
        document.body.appendChild(ghost);
        this.touchState.dragGhost = ghost;
        
        this.updateDragPosition({ clientX: this.touchState.currentX, clientY: this.touchState.currentY });
    }

    updateDragPosition(touch) {
        if (!this.touchState.dragGhost) return;
        
        const rect = this.touchState.dragGhost.getBoundingClientRect();
        const x = touch.clientX - (rect.width / 2);
        const y = touch.clientY - (rect.height / 2);
        
        this.touchState.dragGhost.style.left = `${x}px`;
        this.touchState.dragGhost.style.top = `${y}px`;
    }

    setupDropZones() {
        const segments = document.querySelectorAll('.segment-item:not(.dragging)');
        this.touchState.dropZones = [];
        
        segments.forEach((segment) => {
            const rect = segment.getBoundingClientRect();
            this.touchState.dropZones.push({
                element: segment,
                rect: rect,
                top: rect.top,
                bottom: rect.bottom,
                center: rect.top + (rect.height / 2)
            });
        });
    }

    updateDropZones(touch) {
        let closestZone = null;
        let closestDistance = Infinity;
        
        // Clear previous drop indicators
        document.querySelectorAll('.drop-indicator').forEach(indicator => {
            indicator.classList.remove('active');
        });
        
        // Find closest drop zone
        this.touchState.dropZones.forEach((zone) => {
            const distance = Math.abs(touch.clientY - zone.center);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestZone = zone;
            }
        });
        
        if (closestZone && closestDistance < 100) {
            this.touchState.activeDropZone = closestZone;
            this.showDropIndicator(closestZone, touch);
        } else {
            this.touchState.activeDropZone = null;
        }
    }

    showDropIndicator(zone, touch) {
        let indicator = zone.element.querySelector('.drop-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'drop-indicator';
            zone.element.insertAdjacentElement('afterend', indicator);
        }
        
        // Position indicator based on touch position
        const insertBefore = touch.clientY < zone.center;
        if (insertBefore) {
            zone.element.insertAdjacentElement('beforebegin', indicator);
        } else {
            zone.element.insertAdjacentElement('afterend', indicator);
        }
        
        indicator.classList.add('active');
    }

    handleAutoScroll(touch) {
        const scrollContainer = this.touchState.scrollContainer;
        const containerRect = scrollContainer.getBoundingClientRect();
        const threshold = this.options.scrollThreshold;
        
        // Clear existing scroll timer
        if (this.touchState.autoScrollInterval) {
            clearInterval(this.touchState.autoScrollInterval);
            this.touchState.autoScrollInterval = null;
        }
        
        let scrollDirection = 0;
        
        // Check if we need to scroll up
        if (touch.clientY < containerRect.top + threshold) {
            scrollDirection = -1;
        }
        // Check if we need to scroll down
        else if (touch.clientY > containerRect.bottom - threshold) {
            scrollDirection = 1;
        }
        
        if (scrollDirection !== 0) {
            this.touchState.autoScrollInterval = setInterval(() => {
                scrollContainer.scrollBy(0, scrollDirection * this.options.scrollSpeed);
                
                // Update drop zones after scroll
                this.setupDropZones();
                this.updateDropZones(touch);
            }, 16); // ~60fps
        }
    }

    endDragMode() {
        console.log('🔧 Ending mobile drag mode');
        
        if (this.touchState.activeDropZone) {
            this.performDrop();
            this.provideFeedback('success');
        } else {
            this.provideFeedback('cancel');
        }
        
        this.cleanupDragMode();
    }

    performDrop() {
        const draggedElement = this.touchState.draggedElement;
        const targetZone = this.touchState.activeDropZone;
        
        if (!draggedElement || !targetZone) return;
        
        // Get current and target indices
        const segments = Array.from(document.querySelectorAll('.segment-item:not(.dragging)'));
        const targetIndex = segments.indexOf(targetZone.element);
        const currentIndex = Array.from(document.querySelectorAll('.segment-item')).indexOf(draggedElement);
        
        // Calculate new position
        let newIndex = targetIndex;
        if (currentIndex < targetIndex) {
            newIndex = targetIndex + 1;
        }
        
        console.log(`📱 Moving segment from ${currentIndex} to ${newIndex}`);
        
        // Perform the move via the editor
        if (this.editor && this.editor.moveSegment) {
            this.editor.moveSegment(this.touchState.draggedId, newIndex);
        }
    }

    cleanupDragMode() {
        // Remove drag styling
        if (this.touchState.draggedElement) {
            this.touchState.draggedElement.classList.remove('dragging');
            this.touchState.draggedElement.setAttribute('aria-grabbed', 'false');
        }
        
        // Remove drag ghost
        if (this.touchState.dragGhost) {
            this.touchState.dragGhost.remove();
            this.touchState.dragGhost = null;
        }
        
        // Clear drop indicators
        document.querySelectorAll('.drop-indicator').forEach(indicator => {
            indicator.classList.remove('active');
        });
        
        // Clear auto scroll
        if (this.touchState.autoScrollInterval) {
            clearInterval(this.touchState.autoScrollInterval);
            this.touchState.autoScrollInterval = null;
        }
        
        // Restore text selection
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
    }

    cancelDragMode() {
        if (this.touchState.longPressTimer) {
            clearTimeout(this.touchState.longPressTimer);
            this.touchState.longPressTimer = null;
        }
        
        if (this.touchState.isDragging) {
            this.cleanupDragMode();
        }
    }

    resetTouchState() {
        this.touchState = {
            isDragging: false,
            startY: 0,
            startX: 0,
            currentY: 0,
            currentX: 0,
            draggedElement: null,
            draggedId: null,
            scrollContainer: this.touchState.scrollContainer,
            autoScrollInterval: null,
            touchIdentifier: null,
            initialTouchTime: 0,
            longPressTimer: null,
            dropZones: [],
            activeDropZone: null,
            dragGhost: null
        };
    }

    handleTap(segmentItem) {
        if (segmentItem) {
            // Toggle segment expansion on tap
            this.toggleSegmentExpansion(segmentItem);
        }
    }

    toggleSegmentExpansion(segmentItem) {
        const content = segmentItem.querySelector('.segment-content');
        const caret = segmentItem.querySelector('.segment-caret');
        
        if (content && caret) {
            const isExpanded = content.classList.contains('expanded');
            
            if (isExpanded) {
                content.classList.remove('expanded');
                caret.style.transform = 'rotate(0deg)';
                segmentItem.setAttribute('aria-expanded', 'false');
            } else {
                content.classList.add('expanded');
                caret.style.transform = 'rotate(90deg)';
                segmentItem.setAttribute('aria-expanded', 'true');
            }
            
            this.provideFeedback('tap');
        }
    }

    toggleSegmentSelection(segmentItem) {
        const isSelected = segmentItem.classList.contains('selected');
        
        // Clear other selections
        document.querySelectorAll('.segment-item.selected').forEach(item => {
            item.classList.remove('selected');
            item.setAttribute('aria-selected', 'false');
        });
        
        if (!isSelected) {
            segmentItem.classList.add('selected');
            segmentItem.setAttribute('aria-selected', 'true');
            this.editor.selectedSegmentId = segmentItem.dataset.segmentId;
        } else {
            this.editor.selectedSegmentId = null;
        }
        
        this.provideFeedback('select');
    }

    showSegmentDeleteConfirmation(segmentItem) {
        const segmentTitle = segmentItem.querySelector('.segment-title-input')?.value || 'this segment';
        
        if (confirm(`Are you sure you want to delete "${segmentTitle}"?`)) {
            const segmentId = segmentItem.dataset.segmentId;
            if (this.editor && this.editor.deleteSegment) {
                this.editor.deleteSegment(segmentId);
                this.provideFeedback('delete');
            }
        }
    }

    provideFeedback(type) {
        if (!this.options.vibrationEnabled || !navigator.vibrate) return;
        
        switch (type) {
            case 'start':
                navigator.vibrate(50); // Short vibration for drag start
                break;
            case 'success':
                navigator.vibrate([50, 50, 50]); // Success pattern
                break;
            case 'cancel':
                navigator.vibrate(100); // Longer vibration for cancel
                break;
            case 'tap':
                navigator.vibrate(25); // Very short for tap
                break;
            case 'select':
                navigator.vibrate(30); // Short for selection
                break;
            case 'delete':
                navigator.vibrate([100, 50, 100]); // Warning pattern
                break;
        }
    }

    // Public methods for integration with main editor
    enableTouchOptimizations() {
        document.body.classList.add('touch-optimized');
        
        // Add touch-friendly classes
        document.querySelectorAll('.segment-item').forEach(segment => {
            segment.classList.add('touch-draggable');
        });
    }

    disableTouchOptimizations() {
        document.body.classList.remove('touch-optimized');
        
        document.querySelectorAll('.segment-item').forEach(segment => {
            segment.classList.remove('touch-draggable');
        });
    }

    updateSegmentAccessibility(segmentId, data) {
        const segment = document.querySelector(`[data-segment-id="${segmentId}"]`);
        if (!segment) return;
        
        const title = data.title || 'Untitled segment';
        const type = data.type || 'custom';
        const duration = data.duration || 0;
        
        segment.setAttribute('aria-label', 
            `${title}. ${type} segment. Duration: ${this.formatDuration(duration)}. Draggable.`
        );
    }

    formatDuration(seconds) {
        if (!seconds || seconds < 60) {
            return `${seconds || 0} seconds`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (remainingSeconds === 0) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    }

    destroy() {
        // Clean up event listeners and timers
        this.cancelDragMode();
        this.resetTouchState();
        
        const segmentsList = document.getElementById('segmentsList');
        if (segmentsList) {
            segmentsList.removeEventListener('touchstart', this.handleTouchStart.bind(this));
            segmentsList.removeEventListener('touchmove', this.handleTouchMove.bind(this));
            segmentsList.removeEventListener('touchend', this.handleTouchEnd.bind(this));
            segmentsList.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
            segmentsList.removeEventListener('contextmenu', this.handleContextMenu.bind(this));
        }
        
        console.log('🔧 Mobile touch controls destroyed');
    }
}

// Utility function to detect touch device
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Auto-initialize when DOM is ready if on touch device
if (isTouchDevice()) {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for main editor to initialize
        setTimeout(() => {
            if (window.rundownEditor) {
                window.rundownTouchMobile = new RundownTouchMobile(window.rundownEditor);
                window.rundownTouchMobile.enableTouchOptimizations();
                console.log('📱 Mobile touch controls auto-initialized');
            }
        }, 1000);
    });
}