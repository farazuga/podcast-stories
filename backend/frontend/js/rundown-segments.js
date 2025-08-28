/**
 * VidPOD Rundown Segments Management
 * Handles segment creation, editing, and drag-and-drop functionality
 */

class RundownSegments {
    constructor() {
        this.segments = [];
        this.currentRundownId = null;
        this.draggedElement = null;
        this.currentEditingSegment = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }
    
    setupEventListeners() {
        // Segment actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.segment-header')) {
                this.toggleSegmentContent(e.target.closest('.segment-item'));
            }
            
            if (e.target.matches('.edit-segment-btn')) {
                e.stopPropagation();
                const segmentId = parseInt(e.target.dataset.segmentId);
                this.editSegment(segmentId);
            }
            
            if (e.target.matches('.delete-segment-btn')) {
                e.stopPropagation();
                const segmentId = parseInt(e.target.dataset.segmentId);
                this.deleteSegmentConfirm(segmentId);
            }
            
            if (e.target.matches('.duplicate-segment-btn')) {
                e.stopPropagation();
                const segmentId = parseInt(e.target.dataset.segmentId);
                this.duplicateSegment(segmentId);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.matches('.segment-header')) {
                this.toggleSegmentContent(e.target.closest('.segment-item'));
            }
        });
    }
    
    setupDragAndDrop() {
        const segmentsList = document.getElementById('segmentsList');
        if (!segmentsList) return;
        
        segmentsList.addEventListener('dragstart', this.handleDragStart.bind(this));
        segmentsList.addEventListener('dragover', this.handleDragOver.bind(this));
        segmentsList.addEventListener('drop', this.handleDrop.bind(this));
        segmentsList.addEventListener('dragend', this.handleDragEnd.bind(this));
    }
    
    async loadSegments(rundownId) {
        this.currentRundownId = rundownId;
        
        try {
            this.segments = await RundownUtils.apiRequest(`/rundown-segments/rundown/${rundownId}`);
            this.renderSegments();
            this.updateTotalDuration();
        } catch (error) {
            console.error('Error loading segments:', error);
            RundownUtils.showError('Failed to load segments: ' + error.message);
        }
    }
    
    renderSegments() {
        const container = document.getElementById('segmentsList');
        if (!container) return;
        
        if (this.segments.length === 0) {
            container.innerHTML = `
                <div class="no-segments">
                    <p>No segments yet. Add some segments to build your rundown.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.segments.map(segment => this.createSegmentHTML(segment)).join('');
        this.makeDraggable();
    }
    
    createSegmentHTML(segment) {
        const duration = RundownUtils.formatTimeString(segment.duration || 0);
        const isPinned = segment.is_pinned;
        const canDelete = !isPinned;
        
        return `
            <div class="segment-item" data-segment-id="${segment.id}" draggable="${!isPinned}">
                <div class="segment-header" tabindex="0" role="button" aria-expanded="false">
                    <div class="segment-title-info">
                        ${!isPinned ? '<span class="segment-drag-handle">⋮⋮</span>' : '<span class="segment-pin-icon">📌</span>'}
                        <span class="segment-type-badge segment-type-${segment.type}">${segment.type}</span>
                        <span class="segment-title">${RundownUtils.sanitizeHtml(segment.title)}</span>
                    </div>
                    <div class="segment-duration">${duration}</div>
                    <div class="segment-actions">
                        <button class="btn btn-outline btn-small edit-segment-btn" data-segment-id="${segment.id}" title="Edit segment">
                            ✏️
                        </button>
                        <button class="btn btn-outline btn-small duplicate-segment-btn" data-segment-id="${segment.id}" title="Duplicate segment">
                            📋
                        </button>
                        ${canDelete ? `
                            <button class="btn btn-danger btn-small delete-segment-btn" data-segment-id="${segment.id}" title="Delete segment">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="segment-content">
                    ${this.createSegmentContentHTML(segment)}
                </div>
            </div>
        `;
    }
    
    createSegmentContentHTML(segment) {
        let contentHTML = '';
        
        // Show script/questions if available
        if (segment.content && segment.content.script) {
            contentHTML += `
                <div class="segment-script">${RundownUtils.sanitizeHtml(segment.content.script)}</div>
            `;
        }
        
        if (segment.content && segment.content.questions && Array.isArray(segment.content.questions)) {
            contentHTML += `
                <div class="segment-questions">
                    <strong>Questions:</strong>
                    <ul>
                        ${segment.content.questions.map(q => `<li>${RundownUtils.sanitizeHtml(q)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        // Show notes if available
        if (segment.notes) {
            contentHTML += `
                <div class="segment-notes">
                    <strong>Notes:</strong> ${RundownUtils.sanitizeHtml(segment.notes)}
                </div>
            `;
        }
        
        return contentHTML || '<div class="segment-empty">No content yet. Click edit to add script, questions, or notes.</div>';
    }
    
    makeDraggable() {
        const segments = document.querySelectorAll('.segment-item[draggable="true"]');
        segments.forEach(segment => {
            segment.addEventListener('dragstart', this.handleDragStart.bind(this));
        });
    }
    
    toggleSegmentContent(segmentItem) {
        const content = segmentItem.querySelector('.segment-content');
        const header = segmentItem.querySelector('.segment-header');
        
        if (content.classList.contains('expanded')) {
            content.classList.remove('expanded');
            header.setAttribute('aria-expanded', 'false');
        } else {
            // Collapse all other segments first
            document.querySelectorAll('.segment-content.expanded').forEach(c => {
                c.classList.remove('expanded');
                c.closest('.segment-item').querySelector('.segment-header').setAttribute('aria-expanded', 'false');
            });
            
            content.classList.add('expanded');
            header.setAttribute('aria-expanded', 'true');
        }
    }
    
    async addSegment(type = 'custom', insertPosition = null) {
        if (!this.currentRundownId) {
            RundownUtils.showError('No rundown selected');
            return;
        }
        
        try {
            const segmentData = {
                rundown_id: this.currentRundownId,
                title: this.getDefaultTitle(type),
                type: type,
                duration: this.getDefaultDuration(type),
                content: {},
                insert_position: insertPosition
            };
            
            const segment = await RundownUtils.apiRequest('/rundown-segments', {
                method: 'POST',
                body: JSON.stringify(segmentData)
            });
            
            // Reload segments to get correct order
            await this.loadSegments(this.currentRundownId);
            
            RundownUtils.showSuccess('Segment added successfully!');
            
            // Auto-edit new segment
            setTimeout(() => this.editSegment(segment.id), 500);
            
        } catch (error) {
            console.error('Error adding segment:', error);
            RundownUtils.showError('Failed to add segment: ' + error.message);
        }
    }
    
    getDefaultTitle(type) {
        const titles = {
            intro: 'Introduction',
            story: 'Story Segment',
            interview: 'Interview',
            break: 'Commercial Break',
            outro: 'Closing',
            custom: 'Custom Segment'
        };
        
        return titles[type] || 'New Segment';
    }
    
    getDefaultDuration(type) {
        const durations = {
            intro: 60,  // 1 minute
            story: 300, // 5 minutes
            interview: 600, // 10 minutes
            break: 60,  // 1 minute
            outro: 30,  // 30 seconds
            custom: 120 // 2 minutes
        };
        
        return durations[type] || 120;
    }
    
    editSegment(segmentId) {
        const segment = this.segments.find(s => s.id === segmentId);
        if (!segment) {
            RundownUtils.showError('Segment not found');
            return;
        }
        
        this.currentEditingSegment = segment;
        this.populateSegmentEditor(segment);
        RundownUtils.showModal('segmentEditorModal');
    }
    
    populateSegmentEditor(segment) {
        document.getElementById('segmentTitle').value = segment.title || '';
        document.getElementById('segmentDuration').value = RundownUtils.formatTimeString(segment.duration || 0);
        document.getElementById('segmentScript').value = (segment.content && segment.content.script) || '';
        document.getElementById('segmentNotes').value = segment.notes || '';
        
        // Update modal title
        const modalTitle = document.getElementById('segmentEditorTitle');
        if (modalTitle) {
            modalTitle.textContent = `🎬 Edit ${segment.title}`;
        }
        
        // Show/hide delete button for pinned segments
        const deleteBtn = document.getElementById('deleteSegmentBtn');
        if (deleteBtn) {
            deleteBtn.style.display = segment.is_pinned ? 'none' : 'inline-block';
        }
    }
    
    async saveSegment() {
        if (!this.currentEditingSegment) return;
        
        const form = document.getElementById('segmentEditorForm');
        const errors = RundownUtils.validateForm(form);
        
        if (errors.length > 0) {
            RundownUtils.showError(errors.join(', '));
            return;
        }
        
        try {
            const formData = RundownUtils.getFormData(form);
            
            // Parse duration
            const durationSeconds = RundownUtils.parseTimeString(formData.duration);
            
            // Validate duration format
            if (formData.duration && !RundownUtils.validateTimeInput(formData.duration)) {
                RundownUtils.showError('Duration must be in MM:SS format (e.g., 5:30)');
                return;
            }
            
            const updateData = {
                title: formData.title,
                duration: durationSeconds,
                content: {
                    script: formData.script
                },
                notes: formData.notes
            };
            
            await RundownUtils.apiRequest(`/rundown-segments/${this.currentEditingSegment.id}`, {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
            
            RundownUtils.showSuccess('Segment updated successfully!');
            RundownUtils.hideModal('segmentEditorModal');
            
            // Reload segments
            await this.loadSegments(this.currentRundownId);
            
        } catch (error) {
            console.error('Error updating segment:', error);
            RundownUtils.showError('Failed to update segment: ' + error.message);
        }
    }
    
    async deleteSegment() {
        if (!this.currentEditingSegment) return;
        
        if (!confirm(`Are you sure you want to delete "${this.currentEditingSegment.title}"?`)) {
            return;
        }
        
        try {
            await RundownUtils.apiRequest(`/rundown-segments/${this.currentEditingSegment.id}`, {
                method: 'DELETE'
            });
            
            RundownUtils.showSuccess('Segment deleted successfully!');
            RundownUtils.hideModal('segmentEditorModal');
            
            // Reload segments
            await this.loadSegments(this.currentRundownId);
            
        } catch (error) {
            console.error('Error deleting segment:', error);
            RundownUtils.showError('Failed to delete segment: ' + error.message);
        }
    }
    
    async deleteSegmentConfirm(segmentId) {
        const segment = this.segments.find(s => s.id === segmentId);
        if (!segment) return;
        
        if (segment.is_pinned) {
            RundownUtils.showError('Cannot delete pinned segments (intro/outro)');
            return;
        }
        
        if (!confirm(`Are you sure you want to delete "${segment.title}"?`)) {
            return;
        }
        
        try {
            await RundownUtils.apiRequest(`/rundown-segments/${segmentId}`, {
                method: 'DELETE'
            });
            
            RundownUtils.showSuccess('Segment deleted successfully!');
            await this.loadSegments(this.currentRundownId);
            
        } catch (error) {
            console.error('Error deleting segment:', error);
            RundownUtils.showError('Failed to delete segment: ' + error.message);
        }
    }
    
    async duplicateSegment(segmentId) {
        try {
            await RundownUtils.apiRequest(`/rundown-segments/${segmentId}/duplicate`, {
                method: 'POST'
            });
            
            RundownUtils.showSuccess('Segment duplicated successfully!');
            await this.loadSegments(this.currentRundownId);
            
        } catch (error) {
            console.error('Error duplicating segment:', error);
            RundownUtils.showError('Failed to duplicate segment: ' + error.message);
        }
    }
    
    updateTotalDuration() {
        const totalSeconds = this.segments.reduce((sum, segment) => sum + (segment.duration || 0), 0);
        
        // Update timing chip
        RundownUtils.updateTimingChip(totalSeconds);
        
        // Update sidebar timing
        const timingSummary = document.querySelector('.timing-summary .total-time');
        const segmentCount = document.querySelector('.timing-summary .segment-count');
        
        if (timingSummary) {
            timingSummary.textContent = RundownUtils.formatTimeString(totalSeconds);
        }
        
        if (segmentCount) {
            segmentCount.textContent = `${this.segments.length} segments`;
        }
    }
    
    // Drag and drop handlers
    handleDragStart(e) {
        if (!e.target.matches('.segment-item[draggable="true"]')) return;
        
        this.draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const afterElement = this.getDragAfterElement(e.target.closest('#segmentsList'), e.clientY);
        const dragging = document.querySelector('.dragging');
        
        if (afterElement == null) {
            e.target.closest('#segmentsList').appendChild(dragging);
        } else {
            e.target.closest('#segmentsList').insertBefore(dragging, afterElement);
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.reorderSegments();
    }
    
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.draggedElement = null;
    }
    
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.segment-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    async reorderSegments() {
        const segmentElements = document.querySelectorAll('.segment-item');
        const segmentOrders = Array.from(segmentElements).map((element, index) => ({
            id: parseInt(element.dataset.segmentId),
            order_index: index
        }));
        
        try {
            await RundownUtils.apiRequest('/rundown-segments/reorder', {
                method: 'PUT',
                body: JSON.stringify({
                    rundown_id: this.currentRundownId,
                    segment_orders: segmentOrders
                })
            });
            
            // Reload to ensure consistency
            await this.loadSegments(this.currentRundownId);
            
        } catch (error) {
            console.error('Error reordering segments:', error);
            RundownUtils.showError('Failed to reorder segments: ' + error.message);
            // Reload to restore original order
            await this.loadSegments(this.currentRundownId);
        }
    }
}

// Global functions
function addSegment(type) {
    if (window.rundownSegments) {
        window.rundownSegments.addSegment(type);
    }
}

function saveSegment() {
    if (window.rundownSegments) {
        window.rundownSegments.saveSegment();
    }
}

function deleteSegment() {
    if (window.rundownSegments) {
        window.rundownSegments.deleteSegment();
    }
}

function hideSegmentEditor() {
    RundownUtils.hideModal('segmentEditorModal');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.rundownSegments = new RundownSegments();
});