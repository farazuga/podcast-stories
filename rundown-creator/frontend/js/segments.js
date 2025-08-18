/**
 * Segment Management Module
 * 
 * Handles segment CRUD operations, drag-and-drop reordering,
 * and duration calculations for rundowns.
 */

class SegmentManager {
  constructor() {
    this.segments = [];
    this.currentRundownId = null;
    this.draggedSegment = null;
    this.dragOverSegment = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupSegmentModal();
  }

  setupEventListeners() {
    // Add segment button
    DOM.get('addSegmentBtn')?.addEventListener('click', () => {
      this.showSegmentModal();
    });

    // Segment form submission
    DOM.get('segmentForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSegment();
    });

    // Segment type change handler
    DOM.get('segmentType')?.addEventListener('change', (e) => {
      this.handleSegmentTypeChange(e.target.value);
    });
  }

  setupSegmentModal() {
    // Close modal handlers
    window.closeSegmentModal = () => {
      DOM.removeClass('segmentModal', 'active');
      this.resetSegmentForm();
    };

    // Show modal function
    window.showAddSegmentModal = () => {
      this.showSegmentModal();
    };

    // Click outside to close
    DOM.get('segmentModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'segmentModal') {
        window.closeSegmentModal();
      }
    });
  }

  showSegmentModal(segmentId = null) {
    this.editingSegmentId = segmentId;
    
    if (segmentId) {
      this.populateSegmentForm(segmentId);
      DOM.setText('segmentModalTitle', 'Edit Segment');
    } else {
      this.resetSegmentForm();
      DOM.setText('segmentModalTitle', 'Add Segment');
    }

    DOM.addClass('segmentModal', 'active');
    
    // Focus on title field
    setTimeout(() => {
      DOM.get('segmentTitle')?.focus();
    }, 100);
  }

  handleSegmentTypeChange(type) {
    const config = getSegmentTypeConfig(type);
    
    // Show/hide guest fields
    DOM.toggle('guestFields', config.showGuest);
    
    // Show/hide story field
    DOM.toggle('storyField', config.showStory);
    
    // Set default duration
    const durationInput = DOM.get('segmentDuration');
    if (durationInput && !durationInput.value) {
      const defaultSeconds = CONFIG.DEFAULT_DURATIONS[type] || 0;
      durationInput.value = Math.round(defaultSeconds / 60 * 100) / 100; // Convert to minutes
    }

    // Load stories if needed
    if (config.showStory) {
      this.loadStoriesForSegment();
    }
  }

  async loadStoriesForSegment() {
    try {
      const response = await authManager.apiRequest(
        getApiUrl('/integration/stories?approved_only=true')
      );

      if (response.ok) {
        const data = await response.json();
        this.populateStorySelect(data.stories);
      }
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  }

  populateStorySelect(stories) {
    const select = DOM.get('linkedStory');
    if (!select) return;

    select.innerHTML = '<option value="">Select story (optional)</option>';
    
    stories.forEach(story => {
      const option = document.createElement('option');
      option.value = story.id;
      option.textContent = `${story.idea_title} - ${StringUtils.truncate(story.idea_description, 50)}`;
      select.appendChild(option);
    });
  }

  populateSegmentForm(segmentId) {
    const segment = this.segments.find(s => s.id === parseInt(segmentId));
    if (!segment) return;

    DOM.get('segmentType').value = segment.segment_type;
    DOM.get('segmentTitle').value = segment.title;
    DOM.get('segmentDuration').value = segment.duration ? segment.duration / 60 : 0;
    DOM.get('segmentNotes').value = segment.notes || '';
    DOM.get('guestName').value = segment.guest_name || '';
    DOM.get('isRemote').checked = segment.is_remote || false;
    DOM.get('scriptNotes').value = segment.script_notes || '';
    
    // Handle segment type-specific fields
    this.handleSegmentTypeChange(segment.segment_type);
    
    // Set story if applicable
    if (segment.story_id) {
      setTimeout(() => {
        DOM.get('linkedStory').value = segment.story_id;
      }, 100);
    }
  }

  resetSegmentForm() {
    DOM.get('segmentForm')?.reset();
    DOM.hide('guestFields');
    DOM.hide('storyField');
    this.editingSegmentId = null;
    
    // Set default type
    DOM.get('segmentType').value = 'story';
    this.handleSegmentTypeChange('story');
  }

  async saveSegment() {
    if (!this.currentRundownId) {
      notifications.error('No rundown selected');
      return;
    }

    const form = DOM.get('segmentForm');
    if (!form || !form.checkValidity()) {
      notifications.validationError('segment data');
      return;
    }

    const formData = this.getSegmentFormData();
    
    const loading = notifications.loading(
      this.editingSegmentId ? 'Updating segment...' : 'Adding segment...'
    );

    try {
      const url = this.editingSegmentId
        ? getApiUrl(`/segments/${this.editingSegmentId}`)
        : getApiUrl(`/segments/${this.currentRundownId}`);
      
      const method = this.editingSegmentId ? 'PUT' : 'POST';

      const response = await authManager.apiRequest(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        loading.success(this.editingSegmentId ? 'Segment updated!' : 'Segment added!');
        window.closeSegmentModal();
        this.loadSegments(this.currentRundownId);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Save failed');
      }
    } catch (error) {
      loading.error(error.message);
      console.error('Error saving segment:', error);
    }
  }

  getSegmentFormData() {
    const durationMinutes = parseFloat(DOM.get('segmentDuration').value) || 0;
    
    return {
      segment_type: DOM.get('segmentType').value,
      title: DOM.get('segmentTitle').value.trim(),
      duration: Math.round(durationMinutes * 60), // Convert to seconds
      notes: DOM.get('segmentNotes').value.trim() || null,
      guest_name: DOM.get('guestName').value.trim() || null,
      is_remote: DOM.get('isRemote').checked,
      script_notes: DOM.get('scriptNotes').value.trim() || null,
      story_id: DOM.get('linkedStory').value || null
    };
  }

  async loadSegments(rundownId) {
    if (!rundownId) return;
    
    this.currentRundownId = rundownId;

    try {
      const response = await authManager.apiRequest(
        getApiUrl(`/segments/${rundownId}`)
      );

      if (response.ok) {
        const data = await response.json();
        this.segments = data.segments || [];
        this.renderSegments();
        this.updateTotalDuration();
        debugLog('Loaded segments:', this.segments.length);
      } else {
        throw new Error('Failed to load segments');
      }
    } catch (error) {
      console.error('Error loading segments:', error);
      notifications.error('Failed to load segments');
    }
  }

  renderSegments() {
    const segmentsList = DOM.get('segmentsList');
    const emptySegments = DOM.get('emptySegments');
    
    if (!segmentsList) return;

    if (this.segments.length === 0) {
      DOM.hide(segmentsList);
      DOM.show(emptySegments);
      return;
    }

    DOM.show(segmentsList);
    DOM.hide(emptySegments);

    segmentsList.innerHTML = this.segments.map(segment => 
      this.createSegmentElement(segment)
    ).join('');
    
    this.setupSegmentEvents();
    this.initializeDragAndDrop();
  }

  createSegmentElement(segment) {
    const typeConfig = getSegmentTypeConfig(segment.segment_type);
    const canEdit = authManager.canEditRundown(rundownManager.currentRundown);

    return `
      <div class="segment-item" data-id="${segment.id}" draggable="${canEdit}">
        <div class="segment-header">
          <div class="segment-info">
            <div class="drag-handle" style="display: ${canEdit ? 'block' : 'none'}">⋮⋮</div>
            <span class="segment-type" style="background: ${typeConfig.color}">
              ${typeConfig.icon} ${typeConfig.label}
            </span>
            <h4 class="segment-title">${StringUtils.escapeHtml(segment.title)}</h4>
          </div>
          <div class="segment-actions" style="display: ${canEdit ? 'flex' : 'none'}">
            <button class="btn btn-secondary btn-sm edit-segment-btn" data-id="${segment.id}">
              ✏️ Edit
            </button>
            <button class="btn btn-secondary btn-sm duplicate-segment-btn" data-id="${segment.id}">
              📋 Duplicate
            </button>
            <button class="btn btn-danger btn-sm delete-segment-btn" data-id="${segment.id}">
              🗑️ Delete
            </button>
          </div>
        </div>
        
        <div class="segment-meta">
          <span>⏱️ ${formatDuration(segment.duration || 0)}</span>
          ${segment.guest_name ? `<span>🎤 ${segment.guest_name}${segment.is_remote ? ' (Remote)' : ''}</span>` : ''}
          ${segment.story_title ? `<span>📰 ${segment.story_title}</span>` : ''}
        </div>
        
        ${segment.notes ? `
          <div class="segment-content">
            <strong>Notes:</strong>
            <p>${StringUtils.escapeHtml(segment.notes)}</p>
          </div>
        ` : ''}
        
        ${segment.script_notes ? `
          <div class="segment-content">
            <strong>Script Notes:</strong>
            <p>${StringUtils.escapeHtml(segment.script_notes)}</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  setupSegmentEvents() {
    // Edit buttons
    document.querySelectorAll('.edit-segment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const segmentId = e.target.dataset.id;
        this.showSegmentModal(segmentId);
      });
    });

    // Duplicate buttons
    document.querySelectorAll('.duplicate-segment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const segmentId = e.target.dataset.id;
        this.duplicateSegment(segmentId);
      });
    });

    // Delete buttons
    document.querySelectorAll('.delete-segment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const segmentId = e.target.dataset.id;
        this.deleteSegment(segmentId);
      });
    });
  }

  initializeDragAndDrop() {
    const segmentItems = document.querySelectorAll('.segment-item');
    
    segmentItems.forEach(item => {
      if (item.draggable) {
        item.addEventListener('dragstart', (e) => this.handleDragStart(e));
        item.addEventListener('dragover', (e) => this.handleDragOver(e));
        item.addEventListener('drop', (e) => this.handleDrop(e));
        item.addEventListener('dragend', (e) => this.handleDragEnd(e));
      }
    });
  }

  handleDragStart(e) {
    this.draggedSegment = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const afterElement = this.getDragAfterElement(e.clientY);
    const draggedElement = document.querySelector('.dragging');
    
    if (afterElement == null) {
      DOM.get('segmentsList').appendChild(draggedElement);
    } else {
      DOM.get('segmentsList').insertBefore(draggedElement, afterElement);
    }
  }

  handleDrop(e) {
    e.preventDefault();
    this.updateSegmentOrder();
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    this.draggedSegment = null;
  }

  getDragAfterElement(y) {
    const draggableElements = [...document.querySelectorAll('.segment-item:not(.dragging)')];
    
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

  async updateSegmentOrder() {
    const segmentItems = document.querySelectorAll('.segment-item');
    const segmentOrders = Array.from(segmentItems).map((item, index) => ({
      id: parseInt(item.dataset.id),
      sort_order: index + 1
    }));

    try {
      const response = await authManager.apiRequest(
        getApiUrl(`/segments/${this.currentRundownId}/reorder`), {
          method: 'PUT',
          body: JSON.stringify({ segment_orders: segmentOrders })
        }
      );

      if (response.ok) {
        debugLog('Segment order updated');
        // Reload segments to ensure correct state
        this.loadSegments(this.currentRundownId);
      } else {
        throw new Error('Failed to update segment order');
      }
    } catch (error) {
      console.error('Error updating segment order:', error);
      notifications.error('Failed to update segment order');
      // Reload to restore original order
      this.loadSegments(this.currentRundownId);
    }
  }

  async duplicateSegment(segmentId) {
    const loading = notifications.loading('Duplicating segment...');

    try {
      const response = await authManager.apiRequest(
        getApiUrl(`/segments/${this.currentRundownId}/duplicate/${segmentId}`), {
          method: 'POST'
        }
      );

      if (response.ok) {
        loading.success('Segment duplicated!');
        this.loadSegments(this.currentRundownId);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Duplication failed');
      }
    } catch (error) {
      loading.error(error.message);
      console.error('Error duplicating segment:', error);
    }
  }

  async deleteSegment(segmentId) {
    notifications.confirmAction(
      'Delete this segment? This action cannot be undone.',
      async () => {
        const loading = notifications.loading('Deleting segment...');

        try {
          const response = await authManager.apiRequest(
            getApiUrl(`/segments/${segmentId}`), {
              method: 'DELETE'
            }
          );

          if (response.ok) {
            loading.success('Segment deleted');
            this.loadSegments(this.currentRundownId);
          } else {
            const error = await response.json();
            throw new Error(error.error || 'Delete failed');
          }
        } catch (error) {
          loading.error(error.message);
          console.error('Error deleting segment:', error);
        }
      }
    );
  }

  updateTotalDuration() {
    const totalSeconds = this.segments.reduce((sum, segment) => 
      sum + (segment.duration || 0), 0
    );
    
    DOM.setText('totalDuration', formatDuration(totalSeconds));
    
    // Update rundown total duration if we have access to rundown manager
    if (rundownManager.currentRundown) {
      rundownManager.currentRundown.total_duration = totalSeconds;
    }
  }

  clearSegments() {
    this.segments = [];
    this.currentRundownId = null;
    this.renderSegments();
    this.updateTotalDuration();
  }

  // Helper method to get segment by ID
  getSegment(segmentId) {
    return this.segments.find(s => s.id === parseInt(segmentId));
  }

  // Helper method to get total segment count
  getSegmentCount() {
    return this.segments.length;
  }

  // Helper method to get segments by type
  getSegmentsByType(type) {
    return this.segments.filter(s => s.segment_type === type);
  }
}

// Initialize segment manager
const segmentManager = new SegmentManager();

// Export for global use
window.segmentManager = segmentManager;