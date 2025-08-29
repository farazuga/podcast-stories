/**
 * VidPOD Rundown Editor
 * Advanced rundown editor with drag & drop, timing, talent management
 * Based on sophisticated prototype v4-8 with VidPOD database integration
 */

class RundownEditor {
    constructor(rundownId) {
        this.rundownId = rundownId;
        this.rundownData = null;
        this.selectedSegmentId = null;
        this.autoSaveInterval = null;
        this.isDirty = false;
        this.dragState = {
            dragging: false,
            draggedElement: null,
            draggedId: null,
            dropIndex: -1
        };
        
        // Debug logging
        console.log('🔧 RundownEditor initialized for rundown:', rundownId);
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🔄 Initializing rundown editor...');
            
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            await this.loadRundownData();
            this.setupRoleBasedUI();
            this.initializeAutoSave();
            this.setupDragAndDrop();
            
            console.log('✅ Rundown editor initialization complete');
        } catch (error) {
            console.error('❌ Failed to initialize rundown editor:', error);
            RundownUtils.showError('Failed to initialize editor: ' + error.message);
        }
    }
    
    setupRoleBasedUI() {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userRole = user.role;
            
            // Show/hide UI elements based on role
            const editorActions = document.querySelector('.editor-actions');
            if (userRole === 'student' && editorActions) {
                // Students get read-only view
                const editableElements = document.querySelectorAll('.editor-toolbar, .segment-actions, .talent-actions');
                editableElements.forEach(el => el.style.display = 'none');
                
                // Add read-only indicator
                const readOnlyBadge = document.createElement('span');
                readOnlyBadge.className = 'read-only-badge';
                readOnlyBadge.textContent = '👁️ Read Only';
                editorActions.insertBefore(readOnlyBadge, editorActions.firstChild);
            }
            
            console.log('🔧 Role-based UI setup for editor:', userRole);
        } catch (error) {
            console.warn('⚠️ Could not setup role-based editor UI:', error.message);
        }
    }
    
    setupEventListeners() {
        // Header controls
        const expandAllBtn = document.getElementById('expandAllSegments');
        const collapseAllBtn = document.getElementById('collapseAllSegments');
        const printBtn = document.getElementById('exportPDFBtn') || document.getElementById('printRundown');
        
        if (expandAllBtn) {
            expandAllBtn.addEventListener('click', () => this.expandAllSegments());
        }
        
        if (collapseAllBtn) {
            collapseAllBtn.addEventListener('click', () => this.collapseAllSegments());
        }
        
        if (printBtn) {
            printBtn.addEventListener('click', () => this.printRundown());
        }
        
        // Toolbar segment creation buttons
        const toolbarButtons = {
            'addStorySegment': 'story',
            'addInterviewSegment': 'interview', 
            'addBreakSegment': 'break',
            'addCustomSegment': 'custom'
        };
        
        Object.entries(toolbarButtons).forEach(([buttonId, segmentType]) => {
            const btn = document.getElementById(buttonId);
            if (btn) {
                btn.addEventListener('click', () => this.addSegment(segmentType));
            }
        });
        
        // Target time input
        const targetInput = document.getElementById('targetTimeInput');
        if (targetInput) {
            targetInput.addEventListener('input', () => this.handleTargetTimeChange());
            targetInput.addEventListener('blur', () => this.validateAndFormatTargetTime());
        }
        
        // Modal close events  
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
        
        // Click outside to close tag panels
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tag-panel') && !e.target.closest('.tag-btn')) {
                this.closeTagPanels();
            }
        });
    }
    
    // ========================================
    // PHASE 2: ENHANCED KEYBOARD NAVIGATION
    // ========================================
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when editor is active
            if (!document.getElementById('rundownEditorModal')?.style.display?.includes('block')) {
                return;
            }
            
            // Escape key closes modals and tag panels
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.closeTagPanels();
                return;
            }
            
            // Don't handle navigation shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // Only allow Escape and Ctrl+shortcuts in inputs
                if (e.key === 't' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.toggleSelectedSegment();
                }
                return;
            }
            
            // Enhanced keyboard navigation
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.moveSelectedSegment('up');
                    } else {
                        this.selectPreviousSegment();
                    }
                    break;
                    
                case 'ArrowDown':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.moveSelectedSegment('down');
                    } else {
                        this.selectNextSegment();
                    }
                    break;
                    
                case 't':
                case 'T':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.toggleSelectedSegment();
                    }
                    break;
                    
                case 'n':
                case 'N':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.addSegmentAfterSelected();
                    }
                    break;
                    
                case 'd':
                case 'D':
                    if (e.ctrlKey || e.metaKey && this.selectedSegmentId) {
                        e.preventDefault();
                        this.deleteSegment(this.selectedSegmentId);
                    }
                    break;
                    
                case 'e':
                case 'E':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.expandAllSegments();
                    }
                    break;
                    
                case 'w':
                case 'W':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.collapseAllSegments();
                    }
                    break;
                    
                case 'Enter':
                    if (this.selectedSegmentId && !e.shiftKey && !e.ctrlKey) {
                        e.preventDefault();
                        this.toggleSelectedSegment();
                    }
                    break;
                    
                case 'Space':
                    if (this.selectedSegmentId && !e.shiftKey && !e.ctrlKey) {
                        e.preventDefault();
                        this.toggleSelectedSegment();
                    }
                    break;
            }
        });
        
        // Improved focus management
        this.setupFocusManagement();
    }
    
    setupFocusManagement() {
        // Ensure selected segment stays in view
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown'].includes(e.key) && this.selectedSegmentId) {
                setTimeout(() => {
                    const selectedElement = document.querySelector(`[data-segment-id="${this.selectedSegmentId}"]`);
                    if (selectedElement) {
                        selectedElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'nearest',
                            inline: 'nearest'
                        });
                    }
                }, 50);
            }
        });
    }
    
    // ========================================
    // PHASE 2: SEGMENT CONTENT MANAGEMENT
    // ========================================
    
    autoResizeTextarea(textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Calculate the new height based on content
        const newHeight = Math.max(48, textarea.scrollHeight); // Minimum 48px height
        const maxHeight = 300; // Maximum height before scrollbar
        
        textarea.style.height = Math.min(newHeight, maxHeight) + 'px';
        
        // Add scroll if content exceeds max height
        textarea.style.overflowY = newHeight > maxHeight ? 'auto' : 'hidden';
    }
    
    // Questions management
    addQuestion(segmentId) {
        const segment = this.rundownData.segments?.find(s => s.id.toString() === segmentId);
        if (!segment) return;
        
        const currentContent = segment.content || {};
        const questions = [...(currentContent.questions || []), ''];
        
        this.updateSegmentContent(segmentId, 'questions', questions);
        
        // Re-render segment to show new question
        setTimeout(() => this.renderSegmentsList(), 100);
    }
    
    updateQuestion(segmentId, questionIndex, value) {
        const segment = this.rundownData.segments?.find(s => s.id.toString() === segmentId);
        if (!segment) return;
        
        const currentContent = segment.content || {};
        const questions = [...(currentContent.questions || [])];
        questions[questionIndex] = value;
        
        this.updateSegmentContent(segmentId, 'questions', questions);
    }
    
    removeQuestion(segmentId, questionIndex) {
        const segment = this.rundownData.segments?.find(s => s.id.toString() === segmentId);
        if (!segment) return;
        
        const currentContent = segment.content || {};
        const questions = [...(currentContent.questions || [])];
        
        if (questions.length <= 1) {
            RundownUtils.showWarning('Cannot remove the last question. Each segment needs at least one.');
            return;
        }
        
        questions.splice(questionIndex, 1);
        this.updateSegmentContent(segmentId, 'questions', questions);
        
        // Re-render segment
        setTimeout(() => this.renderSegmentsList(), 100);
    }
    
    moveQuestion(segmentId, questionIndex, direction) {
        const segment = this.rundownData.segments?.find(s => s.id.toString() === segmentId);
        if (!segment) return;
        
        const currentContent = segment.content || {};
        const questions = [...(currentContent.questions || [])];
        
        const newIndex = questionIndex + direction;
        if (newIndex < 0 || newIndex >= questions.length) {
            return; // Can't move beyond bounds
        }
        
        // Swap questions
        [questions[questionIndex], questions[newIndex]] = [questions[newIndex], questions[questionIndex]];
        
        this.updateSegmentContent(segmentId, 'questions', questions);
        
        // Re-render and focus on moved question
        setTimeout(() => {
            this.renderSegmentsList();
            const movedQuestion = document.querySelector(`[data-segment-id="${segmentId}"] [data-question-index="${newIndex}"]`);
            if (movedQuestion) {
                movedQuestion.focus();
                movedQuestion.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    }
    
    // Tag insertion functionality
    toggleTagPanel(segmentId) {
        // Close all other tag panels first
        this.closeTagPanels();
        
        const tagPanel = document.querySelector(`[data-segment-id="${segmentId}"] .tag-panel`);
        if (tagPanel) {
            const isVisible = tagPanel.style.display === 'block';
            tagPanel.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                // Update tag panel content in case talent changed
                const tagPanelContent = this.createTagPanelHTML();
                tagPanel.innerHTML = tagPanelContent;
                
                // Reattach event listeners
                tagPanel.querySelectorAll('.tag-chip').forEach(chip => {
                    chip.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const tag = chip.dataset.tag;
                        this.insertTagAtCursor(tag);
                        this.closeTagPanels();
                    });
                });
            }
        }
    }
    
    insertTagAtCursor(tag) {
        if (this.activeQuestionInput) {
            const input = this.activeQuestionInput;
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const value = input.value;
            
            // Insert tag at cursor position
            const newValue = value.substring(0, start) + tag + value.substring(end);
            input.value = newValue;
            
            // Set cursor after inserted tag
            const newCursorPosition = start + tag.length;
            input.setSelectionRange(newCursorPosition, newCursorPosition);
            
            // Trigger input event to save changes
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Auto-resize if needed
            this.autoResizeTextarea(input);
            
            // Focus back on input
            input.focus();
        } else {
            RundownUtils.showWarning('Click in a question field first, then select a tag to insert');
        }
    }
    
    closeTagPanels() {
        document.querySelectorAll('.tag-panel').forEach(panel => {
            panel.style.display = 'none';
        });
    }
    
    // Modal and UI state management
    closeAllModals() {
        // Close any open modals
        const modals = document.querySelectorAll('.modal[style*="block"]');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Clear modal form data
        const forms = document.querySelectorAll('.modal form');
        forms.forEach(form => {
            if (form.reset) form.reset();
        });
        
        // Remove modal backdrop classes
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
    }
    
    // ========================================
    // PHASE 3: AUTO-SAVE INTEGRATION
    // ========================================
    
    initializeAutoSave() {
        try {
            // Initialize auto-save system
            this.autoSaveSystem = new RundownAutoSave(this);
            
            // Override isDirty management
            this.originalIsDirty = this.isDirty;
            
            // Listen for auto-save events
            document.addEventListener('rundownAutoSave', (e) => {
                const { type, detail } = e.detail;
                console.log('🔔 Auto-save event:', type, detail);
                
                if (type === 'error') {
                    this.handleAutoSaveError(detail);
                } else if (type === 'success') {
                    this.handleAutoSaveSuccess(detail);
                }
            });
            
            console.log('💾 Auto-save system integrated');
        } catch (error) {
            console.error('❌ Failed to initialize auto-save:', error);
            RundownUtils.showWarning('Auto-save not available: ' + error.message);
        }
    }
    
    // Override markDirty to trigger auto-save
    markDirty() {
        this.isDirty = true;
        if (this.autoSaveSystem) {
            this.autoSaveSystem.markDirty();
        }
    }
    
    handleAutoSaveError(detail) {
        console.warn('⚠️ Auto-save error:', detail);
        // Could show toast notification or update UI
    }
    
    handleAutoSaveSuccess(detail) {
        console.log('✅ Auto-save successful in', detail.duration, 'ms');
        // Update UI to reflect saved state
        this.isDirty = false;
    }
    
    // Public method to force save
    async forceSave() {
        if (this.autoSaveSystem) {
            try {
                await this.autoSaveSystem.forceSave();
                RundownUtils.showSuccess('Rundown saved successfully');
            } catch (error) {
                RundownUtils.showError('Failed to save: ' + error.message);
            }
        }
    }
    
    // ========================================
    // PHASE 3: ENHANCED PRINT FUNCTIONALITY
    // ========================================
    
    printRundown() {
        console.log('🖨️ Preparing professional rundown print layout...');
        
        this.showPrintPreview();
    }
    
    async showPrintPreview() {
        try {
            // Force save before printing
            if (this.isDirty) {
                await this.forceSave();
            }
            
            // Store current expansion states
            const expansionStates = new Map();
            this.rundownData.segments?.forEach(segment => {
                expansionStates.set(segment.id, segment.content?.open || false);
            });
            
            // Expand all segments for printing
            this.rundownData.segments?.forEach(segment => {
                if (!segment.content?.open) {
                    this.updateSegmentContent(segment.id, 'open', true);
                }
            });
            
            // Re-render with all expanded
            await this.renderSegmentsList();
            
            // Create print-optimized HTML
            const printHTML = this.generatePrintHTML();
            
            // Open print window with optimized layout
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            printWindow.document.write(printHTML);
            printWindow.document.close();
            
            // Setup print window
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            };
            
            // Restore previous expansion states
            setTimeout(() => {
                expansionStates.forEach((wasOpen, segmentId) => {
                    if (!wasOpen) {
                        this.updateSegmentContent(segmentId, 'open', false);
                    }
                });
                this.renderSegmentsList();
            }, 1000);
            
        } catch (error) {
            console.error('❌ Print preparation failed:', error);
            RundownUtils.showError('Failed to prepare print: ' + error.message);
        }
    }
    
    generatePrintHTML() {
        const rundownData = this.rundownData;
        const totalDuration = this.calculateTotalRuntime();
        const formattedDate = new Date().toLocaleDateString();
        const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Generate talent lists
        const hosts = this.rundownData.talent?.filter(t => t.role === 'host' || t.role === 'co-host') || [];
        const guests = this.rundownData.talent?.filter(t => t.role === 'guest' || t.role === 'expert') || [];
        
        const hostsHTML = hosts.length > 0 
            ? `<ul class="talent-list">${hosts.map(h => `<li class="talent-item">${h.name}</li>`).join('')}</ul>`
            : '<p style="font-style: italic; color: #666;">None assigned</p>';
            
        const guestsHTML = guests.length > 0
            ? `<ul class="talent-list">${guests.map(g => `<li class="talent-item">${g.name}</li>`).join('')}</ul>`
            : '<p style="font-style: italic; color: #666;">None assigned</p>';
        
        // Generate segments HTML
        const segmentsHTML = rundownData.segments
            ?.sort((a, b) => a.order_index - b.order_index)
            ?.map(segment => this.generateSegmentPrintHTML(segment))
            ?.join('\n') || '';
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VidPOD Rundown - ${rundownData.title}</title>
    <link rel="stylesheet" href="css/rundown-print.css">
    <style>
        /* Additional inline styles for print window */
        body { margin: 0; padding: 20px; font-family: 'Times New Roman', serif; }
        .print-container { max-width: none; }
    </style>
</head>
<body>
    <div class="print-container">
        <!-- Header -->
        <div class="rundown-print-header">
            <h1 class="rundown-title">${RundownUtils.sanitizeHtml(rundownData.title)}</h1>
            <div class="rundown-metadata">
                <div class="rundown-meta-left">
                    <div class="meta-row">
                        <span class="meta-label">Date:</span>
                        <span class="meta-value">${formattedDate}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Time:</span>
                        <span class="meta-value">${formattedTime}</span>
                    </div>
                    ${rundownData.class_name ? `
                    <div class="meta-row">
                        <span class="meta-label">Class:</span>
                        <span class="meta-value">${rundownData.class_name}</span>
                    </div>` : ''}
                </div>
                <div class="rundown-meta-right">
                    <div class="meta-row">
                        <span class="meta-label">Total Runtime:</span>
                        <span class="meta-value">${RundownUtils.formatTimeString(totalDuration)}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Segments:</span>
                        <span class="meta-value">${rundownData.segments?.length || 0}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Status:</span>
                        <span class="meta-value">${rundownData.status || 'Draft'}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Timing Summary -->
        <div class="print-timing-summary">
            <div class="timing-display-large">${RundownUtils.formatTimeString(totalDuration)}</div>
            <div class="timing-breakdown">
                <div class="timing-item">
                    <span class="timing-item-label">Total Segments</span>
                    <span class="timing-item-value">${rundownData.segments?.length || 0}</span>
                </div>
                <div class="timing-item">
                    <span class="timing-item-label">Avg Duration</span>
                    <span class="timing-item-value">${RundownUtils.formatTimeString(Math.round(totalDuration / (rundownData.segments?.length || 1)))}</span>
                </div>
                <div class="timing-item">
                    <span class="timing-item-label">Total Talent</span>
                    <span class="timing-item-value">${hosts.length + guests.length}</span>
                </div>
            </div>
        </div>
        
        <!-- Talent Section -->
        <div class="print-talent-section">
            <h2 class="talent-section-header">👥 Talent</h2>
            <div class="talent-grid">
                <div class="talent-category">
                    <h3 class="talent-category-header">Hosts</h3>
                    ${hostsHTML}
                </div>
                <div class="talent-category">
                    <h3 class="talent-category-header">Guests</h3>
                    ${guestsHTML}
                </div>
            </div>
        </div>
        
        <!-- Segments -->
        <div class="print-segments-section">
            <h2 class="segments-header">📋 Rundown Segments</h2>
            ${segmentsHTML}
        </div>
        
        <!-- Footer -->
        <div class="print-footer">
            Generated by VidPOD Rundown System • ${formattedDate} at ${formattedTime}
        </div>
    </div>
    
    <script>
        // Auto-print when loaded
        window.onload = function() {
            setTimeout(() => {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>`;
    }
    
    generateSegmentPrintHTML(segment) {
        const content = segment.content || {};
        const questions = content.questions || [];
        const duration = RundownUtils.formatTimeString(segment.duration || 0);
        
        const questionsHTML = questions.length > 0 && questions[0].trim()
            ? questions.map((q, index) => `
                <div class="question-row">
                    <textarea class="question-input" readonly>${RundownUtils.sanitizeHtml(q)}</textarea>
                </div>
            `).join('')
            : '<div class="question-row"><textarea class="question-input" readonly>[No questions]</textarea></div>';
        
        return `
<div class="segment-item ${segment.is_pinned ? 'pinned' : ''}">
    <div class="segment-header">
        <div class="segment-title-info">
            <input type="text" class="segment-title-input" readonly value="${RundownUtils.sanitizeHtml(segment.title)}">
            ${segment.is_pinned ? `<span class="segment-pin">${segment.type === 'intro' ? 'Intro' : 'Outro'}</span>` : ''}
        </div>
        <div class="segment-controls">
            <input type="text" class="segment-time-input" readonly value="${duration}">
            <span class="segment-status-pill status-${this.getStatusClass(content.status || 'draft')}">
                ${content.status || 'Draft'}
            </span>
        </div>
    </div>
    <div class="segment-content">
        <div class="segment-field">
            <label>Segment Intro</label>
            <textarea class="segment-intro-input" readonly>${content.intro || ''}</textarea>
        </div>
        
        <div class="segment-field questions-field">
            <label>Questions</label>
            <div class="questions-list">
                ${questionsHTML}
            </div>
        </div>
        
        <div class="segment-field">
            <label>Topic Close</label>
            <textarea class="segment-close-input" readonly>${content.close || ''}</textarea>
        </div>
        
        <div class="segment-field">
            <label>Notes</label>
            <textarea class="segment-notes-input" readonly>${content.notes || ''}</textarea>
        </div>
    </div>
</div>`;
    }
    
    // Export to PDF using browser's print-to-PDF
    async exportToPDF() {
        console.log('📄 Initiating PDF export...');
        
        try {
            // Show instructions to user
            RundownUtils.showInfo('In the print dialog, select "Save as PDF" as your destination.');
            
            // Trigger print (which can be saved as PDF)
            await this.printRundown();
            
        } catch (error) {
            console.error('❌ PDF export failed:', error);
            RundownUtils.showError('PDF export failed: ' + error.message);
        }
    }
    
    async loadRundownData() {
        try {
            console.log('📥 Loading rundown data for ID:', this.rundownId);
            
            const response = await RundownUtils.apiRequest(`/rundowns/${this.rundownId}`);
            this.rundownData = response;
            
            console.log('✅ Rundown data loaded:', this.rundownData);
            
            await this.renderEditor();
            
        } catch (error) {
            console.error('❌ Error loading rundown data:', error);
            throw error;
        }
    }
    
    async renderEditor() {
        try {
            console.log('🎨 Rendering rundown editor...');
            
            this.updateEditorHeader();
            this.renderTalentSection();
            this.renderSegmentsList();
            this.updateTimingDisplay();
            
            // Auto-select first non-pinned segment
            const firstRegularSegment = this.rundownData.segments?.find(s => !s.is_pinned && s.type !== 'intro');
            if (firstRegularSegment) {
                this.selectSegment(firstRegularSegment.id);
            }
            
            console.log('✅ Editor rendered successfully');
            
        } catch (error) {
            console.error('❌ Error rendering editor:', error);
            throw error;
        }
    }
    
    updateEditorHeader() {
        const titleElement = document.getElementById('editorRundownTitle');
        if (titleElement) {
            titleElement.textContent = `📝 ${this.rundownData.title}`;
        }
        
        // Setup target time input
        const targetInput = document.getElementById('targetTimeInput');
        if (targetInput) {
            const targetTime = this.calculateTargetTime();
            targetInput.value = RundownUtils.formatTimeString(targetTime);
        }
    }
    
    renderTalentSection() {
        // Initialize talent management if not already done
        if (window.rundownTalent && this.rundownId) {
            window.rundownTalent.loadTalent(this.rundownId);
        }
    }
    
    renderSegmentsList() {
        const segmentsList = document.getElementById('segmentsList');
        if (!segmentsList || !this.rundownData.segments) return;
        
        // Sort segments by order_index
        const sortedSegments = [...this.rundownData.segments].sort((a, b) => a.order_index - b.order_index);
        
        segmentsList.innerHTML = '';
        
        sortedSegments.forEach((segment, index) => {
            const segmentElement = this.createSegmentElement(segment);
            segmentsList.appendChild(segmentElement);
            
            // Add drop indicator after each segment (except last)
            if (index < sortedSegments.length - 1) {
                const dropIndicator = document.createElement('div');
                dropIndicator.className = 'drop-indicator';
                dropIndicator.dataset.dropIndex = index + 1;
                segmentsList.appendChild(dropIndicator);
            }
            
            // Add "Add Segment Below" button after selected segment
            if (segment.id === this.selectedSegmentId && !segment.is_pinned) {
                const addButton = this.createAddSegmentButton(index + 1);
                segmentsList.appendChild(addButton);
            }
        });
    }
    
    createSegmentElement(segment) {
        const segmentDiv = document.createElement('div');
        segmentDiv.className = `segment-item ${segment.id === this.selectedSegmentId ? 'selected' : ''}`;
        segmentDiv.dataset.segmentId = segment.id;
        segmentDiv.draggable = !segment.is_pinned;
        
        const content = segment.content || {};
        const duration = RundownUtils.formatTimeString(segment.duration || 0);
        
        segmentDiv.innerHTML = `
            <div class="segment-header" onclick="rundownEditor.selectSegment('${segment.id}')">
                <div class="segment-title-info">
                    <span class="segment-caret">${content.open ? '▼' : '▸'}</span>
                    ${!segment.is_pinned ? '<span class="segment-drag-handle">≡</span>' : ''}
                    <div class="segment-main-info">
                        <input type="text" class="segment-title-input" value="${RundownUtils.sanitizeHtml(segment.title)}" 
                               data-segment-id="${segment.id}" onclick="event.stopPropagation()">
                        ${segment.is_pinned ? `<span class="segment-pin">${segment.type === 'intro' ? 'Intro' : 'Outro'}</span>` : ''}
                    </div>
                </div>
                <div class="segment-controls">
                    <input type="text" class="segment-time-input" value="${duration}" 
                           data-segment-id="${segment.id}" placeholder="MM:SS" onclick="event.stopPropagation()">
                    <div class="segment-status-controls">
                        <button class="status-prev-btn" onclick="event.stopPropagation(); rundownEditor.changeSegmentStatus('${segment.id}', -1)">&lt;</button>
                        <span class="segment-status-pill status-${this.getStatusClass(content.status || 'draft')}">
                            ${content.status || 'Draft'}
                        </span>
                        <button class="status-next-btn" onclick="event.stopPropagation(); rundownEditor.changeSegmentStatus('${segment.id}', 1)">&gt;</button>
                    </div>
                </div>
            </div>
            <div class="segment-content ${content.open ? 'expanded' : ''}">
                ${this.createSegmentContentHTML(segment)}
            </div>
        `;
        
        // Add event listeners for inputs
        this.attachSegmentEventListeners(segmentDiv, segment);
        
        return segmentDiv;
    }
    
    createSegmentContentHTML(segment) {
        const content = segment.content || {};
        const questions = content.questions || [''];
        
        return `
            <div class="segment-field">
                <label>Segment Intro</label>
                <textarea class="segment-intro-input" data-segment-id="${segment.id}" 
                          placeholder="Open with context or hook...">${content.intro || ''}</textarea>
            </div>
            
            <div class="segment-field questions-field">
                <div class="questions-header">
                    <label>Questions</label>
                    <button class="add-question-btn" data-segment-id="${segment.id}" title="Add question">+</button>
                    <button class="tag-btn" data-segment-id="${segment.id}" title="Insert talent tag">@</button>
                </div>
                <div class="questions-list" data-segment-id="${segment.id}">
                    ${questions.map((q, i) => this.createQuestionHTML(segment.id, q, i, questions.length)).join('')}
                </div>
                <div class="tag-panel" data-segment-id="${segment.id}" style="display: none;">
                    ${this.createTagPanelHTML()}
                </div>
            </div>
            
            <div class="segment-field">
                <label>Topic Close</label>
                <textarea class="segment-close-input" data-segment-id="${segment.id}" 
                          placeholder="Wrap-up / CTA / tease next...">${content.close || ''}</textarea>
            </div>
            
            <div class="segment-field">
                <label>Notes</label>
                <textarea class="segment-notes-input" data-segment-id="${segment.id}" 
                          placeholder="Timing cues, reminders, alternates...">${content.notes || ''}</textarea>
            </div>
        `;
    }
    
    createQuestionHTML(segmentId, question, index, totalQuestions) {
        return `
            <div class="question-row" data-question-index="${index}">
                <textarea class="question-input" data-segment-id="${segmentId}" data-question-index="${index}" 
                          placeholder="Question">${RundownUtils.sanitizeHtml(question)}</textarea>
                <div class="question-controls">
                    <button class="question-up-btn" data-segment-id="${segmentId}" data-question-index="${index}" 
                            ${index === 0 ? 'disabled' : ''} title="Move up">↑</button>
                    <button class="question-down-btn" data-segment-id="${segmentId}" data-question-index="${index}" 
                            ${index === totalQuestions - 1 ? 'disabled' : ''} title="Move down">↓</button>
                    <button class="question-remove-btn" data-segment-id="${segmentId}" data-question-index="${index}" 
                            title="Remove">Remove</button>
                </div>
            </div>
        `;
    }
    
    createTagPanelHTML() {
        // Use RundownTalent class data if available
        const hosts = window.rundownTalent ? window.rundownTalent.getHosts() : [];
        const guests = window.rundownTalent ? window.rundownTalent.getGuests() : [];
        
        if (hosts.length === 0 && guests.length === 0) {
            return '<div class="empty-note">No hosts or guests yet.</div>';
        }
        
        let html = '';
        
        if (hosts.length > 0) {
            html += '<h5>Hosts</h5>';
            hosts.forEach(host => {
                html += `<button class="tag-chip" data-tag="@Host(${host.name})">${host.name}</button>`;
            });
        }
        
        if (guests.length > 0) {
            html += '<h5>Guests</h5>';
            guests.forEach(guest => {
                html += `<button class="tag-chip" data-tag="@Guest(${guest.name})">${guest.name}</button>`;
            });
        }
        
        return html;
    }
    
    createAddSegmentButton(afterIndex) {
        const button = document.createElement('div');
        button.className = 'add-segment-after';
        button.innerHTML = `
            <button class="btn btn-outline btn-small add-segment-btn" data-after-index="${afterIndex}">
                + Add Segment Below
            </button>
        `;
        
        button.querySelector('.add-segment-btn').addEventListener('click', () => {
            this.showAddSegmentModal(afterIndex);
        });
        
        return button;
    }
    
    // Drag & Drop Implementation
    setupDragAndDrop() {
        rundownDebugger.log('🔄', 'Setting up drag and drop functionality');
        
        // Add event listeners to the segments container
        const segmentsList = document.getElementById('segmentsList');\n        if (segmentsList) {\n            segmentsList.addEventListener('dragover', (e) => this.handleDragOver(e));\n            segmentsList.addEventListener('drop', (e) => this.handleDrop(e));\n            segmentsList.addEventListener('dragleave', (e) => this.handleDragLeave(e));\n        }\n    }\n    \n    attachSegmentEventListeners(segmentDiv, segment) {\n        // Title input change\n        const titleInput = segmentDiv.querySelector('.segment-title-input');\n        if (titleInput) {\n            titleInput.addEventListener('input', (e) => {\n                this.updateSegmentTitle(segment.id, e.target.value);\n            });\n        }\n        \n        // Time input change\n        const timeInput = segmentDiv.querySelector('.segment-time-input');\n        if (timeInput) {\n            timeInput.addEventListener('input', (e) => {\n                this.validateTimeInput(e.target);\n            });\n            timeInput.addEventListener('blur', (e) => {\n                this.updateSegmentDuration(segment.id, e.target.value);\n            });\n        }\n        \n        // Drag events for moveable segments\n        if (!segment.is_pinned) {\n            segmentDiv.addEventListener('dragstart', (e) => this.handleDragStart(e, segment));\n            segmentDiv.addEventListener('dragend', (e) => this.handleDragEnd(e));\n        }\n        \n        // Caret click to expand/collapse\n        const caret = segmentDiv.querySelector('.segment-caret');\n        if (caret) {\n            caret.addEventListener('click', (e) => {\n                e.stopPropagation();\n                this.toggleSegmentExpansion(segment.id);\n            });\n        }\n        \n        // Content field event listeners\n        this.attachContentEventListeners(segmentDiv, segment);\n    }\n    \n    attachContentEventListeners(segmentDiv, segment) {\n        // Segment intro input\n        const introInput = segmentDiv.querySelector('.segment-intro-input');\n        if (introInput) {\n            introInput.addEventListener('input', (e) => {\n                this.updateSegmentContent(segment.id, 'intro', e.target.value);\n                this.autoResizeTextarea(e.target);\n            });\n        }\n        \n        // Segment close input\n        const closeInput = segmentDiv.querySelector('.segment-close-input');\n        if (closeInput) {\n            closeInput.addEventListener('input', (e) => {\n                this.updateSegmentContent(segment.id, 'close', e.target.value);\n                this.autoResizeTextarea(e.target);\n            });\n        }\n        \n        // Segment notes input\n        const notesInput = segmentDiv.querySelector('.segment-notes-input');\n        if (notesInput) {\n            notesInput.addEventListener('input', (e) => {\n                this.updateSegmentContent(segment.id, 'notes', e.target.value);\n                this.autoResizeTextarea(e.target);\n            });\n        }\n        \n        // Question inputs and controls\n        this.attachQuestionEventListeners(segmentDiv, segment);\n        \n        // Tag panel and buttons\n        this.attachTagEventListeners(segmentDiv, segment);\n    }\n    \n    attachQuestionEventListeners(segmentDiv, segment) {\n        // Question inputs\n        const questionInputs = segmentDiv.querySelectorAll('.question-input');\n        questionInputs.forEach(input => {\n            input.addEventListener('input', (e) => {\n                const questionIndex = parseInt(e.target.dataset.questionIndex);\n                this.updateQuestion(segment.id, questionIndex, e.target.value);\n                this.autoResizeTextarea(e.target);\n            });\n            \n            input.addEventListener('focus', (e) => {\n                this.activeQuestionInput = e.target;\n            });\n        });\n        \n        // Question control buttons\n        segmentDiv.querySelectorAll('.question-up-btn').forEach(btn => {\n            btn.addEventListener('click', (e) => {\n                e.stopPropagation();\n                const questionIndex = parseInt(btn.dataset.questionIndex);\n                this.moveQuestion(segment.id, questionIndex, -1);\n            });\n        });\n        \n        segmentDiv.querySelectorAll('.question-down-btn').forEach(btn => {\n            btn.addEventListener('click', (e) => {\n                e.stopPropagation();\n                const questionIndex = parseInt(btn.dataset.questionIndex);\n                this.moveQuestion(segment.id, questionIndex, 1);\n            });\n        });\n        \n        segmentDiv.querySelectorAll('.question-remove-btn').forEach(btn => {\n            btn.addEventListener('click', (e) => {\n                e.stopPropagation();\n                const questionIndex = parseInt(btn.dataset.questionIndex);\n                this.removeQuestion(segment.id, questionIndex);\n            });\n        });\n        \n        // Add question button\n        const addQuestionBtn = segmentDiv.querySelector('.add-question-btn');\n        if (addQuestionBtn) {\n            addQuestionBtn.addEventListener('click', (e) => {\n                e.stopPropagation();\n                this.addQuestion(segment.id);\n            });\n        }\n    }\n    \n    attachTagEventListeners(segmentDiv, segment) {\n        // Tag button\n        const tagBtn = segmentDiv.querySelector('.tag-btn');\n        if (tagBtn) {\n            tagBtn.addEventListener('click', (e) => {\n                e.stopPropagation();\n                this.toggleTagPanel(segment.id);\n            });\n        }\n        \n        // Tag chips\n        const tagChips = segmentDiv.querySelectorAll('.tag-chip');\n        tagChips.forEach(chip => {\n            chip.addEventListener('click', (e) => {\n                e.stopPropagation();\n                const tag = chip.dataset.tag;\n                this.insertTagAtCursor(tag);\n                this.closeTagPanels();\n            });\n        });\n    }\n    \n    // Drag & Drop Handlers\n    handleDragStart(e, segment) {\n        if (segment.is_pinned) {\n            e.preventDefault();\n            return;\n        }\n        \n        rundownDebugger.log('🔄', 'Drag started', { segmentId: segment.id });\n        \n        this.dragState.dragging = true;\n        this.dragState.draggedElement = e.target;\n        this.dragState.draggedId = segment.id;\n        \n        e.target.classList.add('dragging');\n        e.dataTransfer.effectAllowed = 'move';\n        e.dataTransfer.setData('text/plain', segment.id);\n        \n        // Create ghost element\n        const ghost = e.target.cloneNode(true);\n        ghost.style.opacity = '0.5';\n        ghost.style.transform = 'rotate(2deg)';\n        document.body.appendChild(ghost);\n        e.dataTransfer.setDragImage(ghost, 0, 0);\n        \n        setTimeout(() => document.body.removeChild(ghost), 0);\n    }\n    \n    handleDragOver(e) {\n        if (!this.dragState.dragging) return;\n        \n        e.preventDefault();\n        e.dataTransfer.dropEffect = 'move';\n        \n        const dropIndex = this.computeDropIndex(e.clientY);\n        this.showDropIndicator(dropIndex);\n        this.dragState.dropIndex = dropIndex;\n    }\n    \n    handleDragLeave(e) {\n        // Only hide indicator if we're truly leaving the container\n        if (!e.currentTarget.contains(e.relatedTarget)) {\n            this.hideDropIndicator();\n        }\n    }\n    \n    handleDrop(e) {\n        e.preventDefault();\n        \n        if (!this.dragState.dragging || this.dragState.dropIndex < 0) {\n            this.resetDragState();\n            return;\n        }\n        \n        rundownDebugger.log('🎯', 'Drop executed', {\n            draggedId: this.dragState.draggedId,\n            dropIndex: this.dragState.dropIndex\n        });\n        \n        this.executeSegmentMove(this.dragState.draggedId, this.dragState.dropIndex);\n        this.resetDragState();\n    }\n    \n    handleDragEnd(e) {\n        rundownDebugger.log('🔄', 'Drag ended');\n        this.resetDragState();\n    }\n    \n    computeDropIndex(clientY) {\n        const segments = Array.from(document.querySelectorAll('.segment-item'));\n        let dropIndex = segments.length;\n        \n        for (let i = 0; i < segments.length; i++) {\n            const rect = segments[i].getBoundingClientRect();\n            if (clientY < rect.top + rect.height / 2) {\n                dropIndex = i;\n                break;\n            }\n        }\n        \n        return dropIndex;\n    }\n    \n    showDropIndicator(dropIndex) {\n        this.hideDropIndicator();\n        \n        const dropIndicators = document.querySelectorAll('.drop-indicator');\n        if (dropIndicators[dropIndex]) {\n            dropIndicators[dropIndex].classList.add('active');\n            dropIndicators[dropIndex].style.display = 'block';\n        }\n    }\n    \n    hideDropIndicator() {\n        const activeIndicators = document.querySelectorAll('.drop-indicator.active');\n        activeIndicators.forEach(indicator => {\n            indicator.classList.remove('active');\n            indicator.style.display = 'none';\n        });\n    }\n    \n    resetDragState() {\n        if (this.dragState.draggedElement) {\n            this.dragState.draggedElement.classList.remove('dragging');\n        }\n        \n        this.hideDropIndicator();\n        \n        this.dragState = {\n            dragging: false,\n            draggedElement: null,\n            draggedId: null,\n            dropIndex: -1\n        };\n    }\n    \n    async executeSegmentMove(segmentId, newIndex) {\n        try {\n            rundownDebugger.startPerformanceMark('segment-reorder');\n            \n            // Find the segment being moved\n            const segmentIndex = this.rundownData.segments.findIndex(s => s.id.toString() === segmentId);\n            if (segmentIndex === -1) {\n                throw new Error('Segment not found');\n            }\n            \n            const segment = this.rundownData.segments[segmentIndex];\n            \n            // Don't allow moving pinned segments\n            if (segment.is_pinned) {\n                rundownDebugger.warn('⚠️', 'Cannot move pinned segment');\n                return;\n            }\n            \n            // Remove segment from current position\n            this.rundownData.segments.splice(segmentIndex, 1);\n            \n            // Insert at new position\n            let targetIndex = newIndex;\n            if (newIndex > segmentIndex) {\n                targetIndex = newIndex - 1;\n            }\n            \n            // Ensure we don't move past intro or before outro\n            const outroIndex = this.rundownData.segments.findIndex(s => s.type === 'outro');\n            if (outroIndex !== -1 && targetIndex >= outroIndex) {\n                targetIndex = outroIndex;\n            }\n            \n            // Insert segment at new position\n            this.rundownData.segments.splice(targetIndex, 0, segment);\n            \n            // Update order indices\n            this.rundownData.segments.forEach((seg, index) => {\n                seg.order_index = index;\n            });\n            \n            // Mark as dirty and re-render\n            this.isDirty = true;\n            await this.renderSegmentsList();\n            \n            // Maintain selection\n            this.selectSegment(segmentId);\n            \n            rundownDebugger.endPerformanceMark('segment-reorder');\n            \n            rundownDebugger.log('✅', 'Segment reorder complete', {\n                segmentId,\n                oldIndex: segmentIndex,\n                newIndex: targetIndex\n            });\n            \n        } catch (error) {\n            rundownDebugger.error('❌', 'Segment reorder failed', error);\n            RundownUtils.showError('Failed to reorder segment: ' + error.message);\n        }\n    }\n    \n    // Keyboard-based segment movement\n    moveSelectedSegment(direction) {\n        if (!this.selectedSegmentId) {\n            rundownDebugger.warn('⚠️', 'No segment selected for movement');\n            return;\n        }\n        \n        const currentIndex = this.rundownData.segments.findIndex(s => s.id.toString() === this.selectedSegmentId);\n        if (currentIndex === -1) return;\n        \n        const segment = this.rundownData.segments[currentIndex];\n        if (segment.is_pinned) {\n            rundownDebugger.warn('⚠️', 'Cannot move pinned segment');\n            return;\n        }\n        \n        let targetIndex;\n        if (direction === 'up') {\n            targetIndex = Math.max(1, currentIndex - 1); // Don't move before intro\n        } else {\n            const outroIndex = this.rundownData.segments.findIndex(s => s.type === 'outro');\n            const maxIndex = outroIndex !== -1 ? outroIndex : this.rundownData.segments.length;\n            targetIndex = Math.min(maxIndex, currentIndex + 1);\n        }\n        \n        if (targetIndex !== currentIndex) {\n            this.executeSegmentMove(this.selectedSegmentId, targetIndex);\n        }\n    }"
    
    // ========================================
    // PHASE 2: CORE SEGMENT MANAGEMENT SYSTEM
    // ========================================
    
    // Complete CRUD Operations for Segments
    async addSegment(type = 'story', afterIndex = null) {
        try {
            console.log('🎬 Adding new segment:', { type, afterIndex });
            
            // Determine insert position
            let orderIndex;
            if (afterIndex !== null) {
                orderIndex = afterIndex;
            } else {
                // Insert before outro if it exists
                const outroIndex = this.rundownData.segments?.findIndex(s => s.type === 'outro');
                orderIndex = outroIndex !== -1 ? outroIndex : (this.rundownData.segments?.length || 0);
            }
            
            // Generate segment data based on type
            const segmentData = this.generateSegmentByType(type);
            
            const response = await RundownUtils.apiRequest('/rundown-segments', {
                method: 'POST',
                body: JSON.stringify({
                    rundown_id: this.rundownId,
                    title: segmentData.title,
                    type: type,
                    content: segmentData.content,
                    duration: segmentData.duration,
                    notes: segmentData.notes || '',
                    insert_position: orderIndex
                })
            });
            
            // Reload rundown data and re-render
            await this.loadRundownData();
            
            // Select the newly created segment
            this.selectSegment(response.id);
            
            RundownUtils.showSuccess('Segment added successfully!');
            console.log('✅ Segment added:', response);
            
        } catch (error) {
            console.error('❌ Error adding segment:', error);
            RundownUtils.showError('Failed to add segment: ' + error.message);
        }
    }
    
    generateSegmentByType(type) {
        const segmentTemplates = {
            intro: {
                title: 'Show Intro',
                duration: 60, // 1 minute
                content: {
                    intro: 'Welcome to the show...',
                    questions: [''],
                    close: '',
                    notes: '',
                    status: 'Draft',
                    open: false
                }
            },
            story: {
                title: 'News Story',
                duration: 300, // 5 minutes
                content: {
                    intro: 'Today we\'re covering...',
                    questions: ['What are the key facts?', 'How does this impact our audience?', 'What\'s the next step?'],
                    close: 'Key takeaway...',
                    notes: '',
                    status: 'Draft',
                    open: true
                }
            },
            interview: {
                title: 'Interview Segment',
                duration: 600, // 10 minutes
                content: {
                    intro: 'Joining us now is...',
                    questions: ['Can you introduce yourself?', 'Tell us about your work...', 'What advice would you give?'],
                    close: 'Thank you for joining us...',
                    notes: '',
                    status: 'Draft',
                    open: true
                }
            },
            break: {
                title: 'Commercial Break',
                duration: 90, // 1.5 minutes
                content: {
                    intro: '',
                    questions: [''],
                    close: '',
                    notes: 'Music bed, sponsor messages',
                    status: 'Ready',
                    open: false
                }
            },
            outro: {
                title: 'Show Outro',
                duration: 45, // 45 seconds
                content: {
                    intro: '',
                    questions: [''],
                    close: 'Thanks for listening...',
                    notes: '',
                    status: 'Ready',
                    open: false
                }
            },
            custom: {
                title: 'Custom Segment',
                duration: 180, // 3 minutes
                content: {
                    intro: '',
                    questions: [''],
                    close: '',
                    notes: '',
                    status: 'Draft',
                    open: true
                }
            }
        };
        
        return segmentTemplates[type] || segmentTemplates.custom;
    }
    
    async updateSegmentTitle(segmentId, newTitle) {
        try {
            if (!newTitle.trim()) {
                RundownUtils.showError('Segment title cannot be empty');
                return;
            }
            
            console.log('✏️ Updating segment title:', { segmentId, newTitle });
            
            await RundownUtils.apiRequest(`/rundown-segments/${segmentId}`, {
                method: 'PUT',
                body: JSON.stringify({ title: newTitle.trim() })
            });
            
            // Update local data
            const segment = this.rundownData.segments?.find(s => s.id.toString() === segmentId);
            if (segment) {
                segment.title = newTitle.trim();
                this.markDirty();
            }
            
            console.log('✅ Segment title updated successfully');
            
        } catch (error) {
            console.error('❌ Error updating segment title:', error);
            RundownUtils.showError('Failed to update title: ' + error.message);
        }
    }
    
    async updateSegmentDuration(segmentId, durationString) {
        try {
            const seconds = RundownUtils.parseTimeString(durationString);
            if (seconds < 0) {
                RundownUtils.showError('Invalid time format. Use MM:SS');
                return;
            }
            
            console.log('⏱️ Updating segment duration:', { segmentId, durationString, seconds });
            
            await RundownUtils.apiRequest(`/rundown-segments/${segmentId}`, {
                method: 'PUT',
                body: JSON.stringify({ duration: seconds })
            });
            
            // Update local data
            const segment = this.rundownData.segments?.find(s => s.id.toString() === segmentId);
            if (segment) {
                segment.duration = seconds;
                this.markDirty();
            }
            
            // Update timing display
            this.updateTimingDisplay();
            
            console.log('✅ Segment duration updated successfully');
            
        } catch (error) {
            console.error('❌ Error updating segment duration:', error);
            RundownUtils.showError('Failed to update duration: ' + error.message);
        }
    }
    
    async updateSegmentContent(segmentId, field, value) {
        try {
            console.log('📝 Updating segment content:', { segmentId, field, value: value.substr(0, 50) + '...' });
            
            // Get current segment content
            const segment = this.rundownData.segments?.find(s => s.id.toString() === segmentId);
            if (!segment) {
                throw new Error('Segment not found');
            }
            
            const updatedContent = {
                ...segment.content,
                [field]: value
            };
            
            await RundownUtils.apiRequest(`/rundown-segments/${segmentId}`, {
                method: 'PUT',
                body: JSON.stringify({ content: updatedContent })
            });
            
            // Update local data
            segment.content = updatedContent;
            this.markDirty();
            
            console.log('✅ Segment content updated successfully');
            
        } catch (error) {
            console.error('❌ Error updating segment content:', error);
            // Don't show error for every keystroke - just log it
        }
    }
    
    async deleteSegment(segmentId) {
        try {
            const segment = this.rundownData.segments?.find(s => s.id.toString() === segmentId);
            if (!segment) {
                throw new Error('Segment not found');
            }
            
            if (segment.is_pinned) {
                RundownUtils.showError('Cannot delete intro/outro segments');
                return;
            }
            
            if (!confirm(`Delete segment "${segment.title}"?`)) {
                return;
            }
            
            console.log('🗑️ Deleting segment:', segmentId);
            
            await RundownUtils.apiRequest(`/rundown-segments/${segmentId}`, {
                method: 'DELETE'
            });
            
            // Reload data and re-render
            await this.loadRundownData();
            
            // Clear selection if deleted segment was selected
            if (this.selectedSegmentId === segmentId) {
                this.selectedSegmentId = null;
            }
            
            RundownUtils.showSuccess('Segment deleted successfully');
            console.log('✅ Segment deleted successfully');
            
        } catch (error) {
            console.error('❌ Error deleting segment:', error);
            RundownUtils.showError('Failed to delete segment: ' + error.message);
        }
    }
    
    // Segment Status Management
    changeSegmentStatus(segmentId, direction) {
        const segment = this.rundownData.segments?.find(s => s.id.toString() === segmentId);
        if (!segment) return;
        
        const statuses = ['Draft', 'Needs Review', 'Ready'];
        const currentContent = segment.content || {};
        const currentStatus = currentContent.status || 'Draft';
        const currentIndex = statuses.indexOf(currentStatus);
        
        let newIndex;
        if (direction === 1) {
            // Next status
            newIndex = Math.min(statuses.length - 1, currentIndex + 1);
        } else {
            // Previous status
            newIndex = Math.max(0, currentIndex - 1);
        }
        
        const newStatus = statuses[newIndex];
        if (newStatus !== currentStatus) {
            this.updateSegmentContent(segmentId, 'status', newStatus);
            
            // Re-render the status pill
            const statusPill = document.querySelector(`[data-segment-id="${segmentId}"] .segment-status-pill`);
            if (statusPill) {
                statusPill.textContent = newStatus;
                statusPill.className = `segment-status-pill status-${this.getStatusClass(newStatus)}`;
            }
        }
    }
    
    // Segment Selection and Navigation
    selectSegment(segmentId) {
        console.log('🎯 Selecting segment:', segmentId);
        
        // Remove previous selection
        document.querySelectorAll('.segment-item.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add new selection
        const segmentElement = document.querySelector(`[data-segment-id="${segmentId}"]`);
        if (segmentElement) {
            segmentElement.classList.add('selected');
            segmentElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        this.selectedSegmentId = segmentId;
        
        // Re-render to show "Add Below" button
        this.renderSegmentsList();
    }
    
    selectNextSegment() {
        if (!this.rundownData.segments?.length) return;
        
        const currentIndex = this.rundownData.segments.findIndex(s => s.id.toString() === this.selectedSegmentId);
        const nextIndex = Math.min(this.rundownData.segments.length - 1, currentIndex + 1);
        
        if (nextIndex !== currentIndex) {
            this.selectSegment(this.rundownData.segments[nextIndex].id);
        }
    }
    
    selectPreviousSegment() {
        if (!this.rundownData.segments?.length) return;
        
        const currentIndex = this.rundownData.segments.findIndex(s => s.id.toString() === this.selectedSegmentId);
        const prevIndex = Math.max(0, currentIndex - 1);
        
        if (prevIndex !== currentIndex) {
            this.selectSegment(this.rundownData.segments[prevIndex].id);
        }
    }
    
    // Segment Expansion/Collapse
    toggleSegmentExpansion(segmentId) {
        const segment = this.rundownData.segments?.find(s => s.id.toString() === segmentId);
        if (!segment) return;
        
        const currentContent = segment.content || {};
        const isOpen = currentContent.open || false;
        
        // Update content with new open state
        this.updateSegmentContent(segmentId, 'open', !isOpen);
        
        // Update UI immediately
        const segmentElement = document.querySelector(`[data-segment-id="${segmentId}"]`);
        const contentElement = segmentElement?.querySelector('.segment-content');
        const caretElement = segmentElement?.querySelector('.segment-caret');
        
        if (contentElement && caretElement) {
            if (!isOpen) {
                contentElement.classList.add('expanded');
                caretElement.textContent = '▼';
            } else {
                contentElement.classList.remove('expanded');
                caretElement.textContent = '▸';
            }
        }
    }
    
    toggleSelectedSegment() {
        if (this.selectedSegmentId) {
            this.toggleSegmentExpansion(this.selectedSegmentId);
        }
    }
    
    expandAllSegments() {
        console.log('📖 Expanding all segments');
        this.rundownData.segments?.forEach(segment => {
            if (!segment.content?.open) {
                this.updateSegmentContent(segment.id, 'open', true);
            }
        });
        
        setTimeout(() => this.renderSegmentsList(), 300);
    }
    
    collapseAllSegments() {
        console.log('📕 Collapsing all segments');
        this.rundownData.segments?.forEach(segment => {
            if (segment.content?.open) {
                this.updateSegmentContent(segment.id, 'open', false);
            }
        });
        
        setTimeout(() => this.renderSegmentsList(), 300);
    }
    
    // Add Segment Below functionality
    addSegmentAfterSelected() {
        if (!this.selectedSegmentId) {
            this.showAddSegmentModal();
            return;
        }
        
        const currentIndex = this.rundownData.segments?.findIndex(s => s.id.toString() === this.selectedSegmentId);
        if (currentIndex === -1) return;
        
        // Don't add after outro
        const segment = this.rundownData.segments[currentIndex];
        if (segment.type === 'outro') {
            RundownUtils.showWarning('Cannot add segments after outro');
            return;
        }
        
        this.showAddSegmentModal(currentIndex + 1);
    }
    
    showAddSegmentModal(afterIndex = null) {
        // Simple inline segment type selection for now
        const segmentType = prompt('Segment type (story/interview/break/custom):', 'story');
        if (segmentType && ['story', 'interview', 'break', 'custom'].includes(segmentType.toLowerCase())) {
            this.addSegment(segmentType.toLowerCase(), afterIndex);
        }
    }
    
    // Utility methods
    getStatusClass(status) {
        const statusMap = {
            'Draft': 'draft',
            'Needs Review': 'review', 
            'Ready': 'ready'
        };
        return statusMap[status] || 'draft';
    }
    
    // ========================================
    // PHASE 2: COMPREHENSIVE TIMING SYSTEM
    // ========================================
    
    calculateTargetTime() {
        // Get target from input or default to 20:00 (1200 seconds)
        const targetInput = document.getElementById('targetTimeInput');
        if (targetInput && targetInput.value) {
            return RundownUtils.parseTimeString(targetInput.value);
        }
        return 1200; // Default 20:00
    }
    
    handleTargetTimeChange() {
        const targetInput = document.getElementById('targetTimeInput');
        if (!targetInput) return;
        
        // Validate as user types
        this.validateTimeInput(targetInput);
        this.updateTimingDisplay();
        this.isDirty = true;
    }
    
    validateAndFormatTargetTime() {
        const targetInput = document.getElementById('targetTimeInput');
        if (!targetInput) return;
        
        const value = targetInput.value.trim();
        if (!value) {
            targetInput.value = '20:00'; // Default
            return;
        }
        
        if (RundownUtils.validateTimeInput(value)) {
            // Format to MM:SS
            const seconds = RundownUtils.parseTimeString(value);
            targetInput.value = RundownUtils.formatTimeString(seconds);
            targetInput.classList.remove('invalid');
        } else {
            targetInput.classList.add('invalid');
            RundownUtils.showError('Invalid time format. Use MM:SS (e.g., 20:00)');
        }
        
        this.updateTimingDisplay();
    }
    
    validateTimeInput(inputElement) {
        const value = inputElement.value.trim();
        
        if (!value) {
            inputElement.classList.remove('invalid');
            return true;
        }
        
        // Enhanced time validation
        if (RundownUtils.validateTimeInput(value)) {
            inputElement.classList.remove('invalid');
            return true;
        } else {
            inputElement.classList.add('invalid');
            return false;
        }
    }
    
    formatTimeOnBlur(inputElement) {
        const value = inputElement.value.trim();
        
        if (!value) return;
        
        if (this.validateTimeInput(inputElement)) {
            // Auto-format to MM:SS
            const seconds = RundownUtils.parseTimeString(value);
            inputElement.value = RundownUtils.formatTimeString(seconds);
        }
    }
    
    updateTimingDisplay() {
        const totalSeconds = this.calculateTotalRuntime();
        const targetSeconds = this.calculateTargetTime();
        const difference = totalSeconds - targetSeconds;
        
        // Update main timing display
        const timingDisplay = document.getElementById('timingDisplay');
        if (timingDisplay) {
            timingDisplay.textContent = RundownUtils.formatTimeString(totalSeconds);
        }
        
        // Update timing chip with color coding
        this.updateTimingChip(totalSeconds, targetSeconds, difference);
        
        // Update sidebar timing summary
        this.updateTimingSummary(totalSeconds, targetSeconds, difference);
        
        // Update segment count
        const segmentCount = document.querySelector('.segment-count');
        if (segmentCount) {
            const count = this.rundownData.segments?.length || 0;
            segmentCount.textContent = `${count} segments`;
        }
    }
    
    calculateTotalRuntime() {
        return this.rundownData.segments?.reduce((sum, segment) => {
            return sum + (segment.duration || 0);
        }, 0) || 0;
    }
    
    updateTimingChip(totalSeconds, targetSeconds, difference) {
        const timingChip = document.getElementById('timingChip');
        
        if (!timingChip) return;
        
        // Show timing chip if we have segments
        if (totalSeconds > 0) {
            timingChip.style.display = 'inline-flex';
            
            // Update chip content
            timingChip.innerHTML = `
                <div class="timing-content">
                    <span class="timing-icon">⏱️</span>
                    <div class="timing-details">
                        <div class="timing-main">
                            <span class="timing-total">${RundownUtils.formatTimeString(totalSeconds)}</span>
                            <span class="timing-separator">/</span>
                            <input type="text" class="timing-target" value="${RundownUtils.formatTimeString(targetSeconds)}" 
                                   onchange="rundownEditor.handleTargetTimeChange()" 
                                   onblur="rundownEditor.validateAndFormatTargetTime()">
                        </div>
                        <div class="timing-status">${this.getTimingStatusText(difference)}</div>
                    </div>
                </div>
            `;
            
            // Apply color coding
            timingChip.className = `timing-chip ${this.getTimingStatusClass(difference)}`;
        } else {
            timingChip.style.display = 'none';
        }
    }
    
    updateTimingSummary(totalSeconds, targetSeconds, difference) {
        const timingSummary = document.getElementById('timingSummary');
        if (!timingSummary) return;
        
        timingSummary.innerHTML = `
            <div class="timing-summary-content">
                <div class="total-runtime">
                    <span class="label">Total Runtime</span>
                    <span class="value">${RundownUtils.formatTimeString(totalSeconds)}</span>
                </div>
                <div class="target-runtime">
                    <span class="label">Target</span>
                    <span class="value">${RundownUtils.formatTimeString(targetSeconds)}</span>
                </div>
                <div class="runtime-difference ${this.getTimingStatusClass(difference)}">
                    <span class="label">Difference</span>
                    <span class="value">${this.getTimingStatusText(difference)}</span>
                </div>
            </div>
        `;
    }
    
    getTimingStatusText(differenceSeconds) {
        if (differenceSeconds === 0) {
            return 'Balanced';
        } else if (differenceSeconds > 0) {
            return `Over ${RundownUtils.formatTimeString(differenceSeconds)}`;
        } else {
            return `Under ${RundownUtils.formatTimeString(Math.abs(differenceSeconds))}`;
        }
    }
    
    getTimingStatusClass(differenceSeconds) {
        const tolerance = 30; // 30 second tolerance
        
        if (Math.abs(differenceSeconds) <= tolerance) {
            return 'balanced'; // Green
        } else if (differenceSeconds > tolerance) {
            return 'over'; // Red
        } else {
            return 'under'; // Yellow/Orange
        }
    }
    
    // Auto-save functionality
    startAutoSave() {
        this.stopAutoSave();
        this.autoSaveInterval = setInterval(() => {
            if (this.isDirty) {
                this.saveChanges();
            }
        }, 30000); // Auto-save every 30 seconds
    }
    
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
    
    async saveChanges() {
        if (!this.isDirty) return;
        
        try {
            console.log('💾 Auto-saving rundown changes...');
            // Implementation will be added later
            this.isDirty = false;
        } catch (error) {
            console.error('❌ Auto-save failed:', error);
        }
    }
    
    // Cleanup
    destroy() {
        // Clean up auto-save system
        if (this.autoSaveSystem) {
            this.autoSaveSystem.destroy();
            this.autoSaveSystem = null;
        }
        
        // Stop any remaining intervals
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
        
        console.log('🗑️ RundownEditor destroyed');
    }
}

// Export for global use
window.RundownEditor = RundownEditor;
