/**
 * Rundown Management Module
 * 
 * Handles CRUD operations for rundowns including
 * creation, editing, submission, and approval workflows.
 */

class RundownManager {
  constructor() {
    this.rundowns = [];
    this.currentRundown = null;
    this.filters = this.loadFilters();
    this.editingRundownId = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadInitialData();
  }

  setupEventListeners() {
    // Navigation
    DOM.get('navRundowns')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showRundownsList();
    });

    DOM.get('navCreate')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showCreateView();
    });

    // Create/Edit form
    DOM.get('createRundownBtn')?.addEventListener('click', () => this.showCreateView());
    DOM.get('backToListBtn')?.addEventListener('click', () => this.showRundownsList());
    DOM.get('saveRundownBtn')?.addEventListener('click', () => this.saveRundown());
    DOM.get('submitRundownBtn')?.addEventListener('click', () => this.submitRundown());

    // Search and filters
    DOM.get('searchInput')?.addEventListener('input', 
      debounce(() => this.applyFilters(), CONFIG.APP.debounceDelay)
    );
    DOM.get('statusFilter')?.addEventListener('change', () => this.applyFilters());
    DOM.get('classFilter')?.addEventListener('change', () => this.applyFilters());
    DOM.get('clearFilters')?.addEventListener('click', () => this.clearFilters());

    // Form submission
    DOM.get('rundownForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveRundown();
    });
  }

  async loadInitialData() {
    const loading = notifications.loading('Loading rundowns...');
    
    try {
      await Promise.all([
        this.loadRundowns(),
        this.loadUserClasses()
      ]);
      
      loading.success('Rundowns loaded successfully');
      this.showRundownsList();
    } catch (error) {
      loading.error('Failed to load rundowns');
      console.error('Error loading initial data:', error);
    }
  }

  async loadRundowns() {
    try {
      const queryParams = new URLSearchParams({
        limit: 100,
        ...this.filters
      });

      const response = await authManager.apiRequest(
        getApiUrl(`/rundowns?${queryParams}`)
      );

      if (response.ok) {
        const data = await response.json();
        this.rundowns = data.rundowns || [];
        this.updateStats(data.pagination);
        debugLog('Loaded rundowns:', this.rundowns.length);
      } else {
        throw new Error('Failed to load rundowns');
      }
    } catch (error) {
      console.error('Error loading rundowns:', error);
      notifications.error('Failed to load rundowns');
    }
  }

  async loadUserClasses() {
    try {
      const classes = await authManager.getUserClasses();
      this.populateClassFilters(classes);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  }

  populateClassFilters(classes) {
    const classFilter = DOM.get('classFilter');
    const rundownClass = DOM.get('rundownClass');

    if (classFilter) {
      classFilter.innerHTML = '<option value="">All Classes</option>';
      classes.forEach(cls => {
        classFilter.innerHTML += `<option value="${cls.id}">${cls.class_name}</option>`;
      });
    }

    if (rundownClass) {
      rundownClass.innerHTML = '<option value="">Select class (optional)</option>';
      classes.forEach(cls => {
        rundownClass.innerHTML += `<option value="${cls.id}">${cls.class_name}</option>`;
      });
    }
  }

  showRundownsList() {
    this.setActiveView('rundownsView');
    this.updateNavigation('navRundowns');
    this.renderRundowns();
    this.editingRundownId = null;
  }

  showCreateView(rundownId = null) {
    this.setActiveView('createView');
    this.updateNavigation('navCreate');
    this.editingRundownId = rundownId;
    
    if (rundownId) {
      this.loadRundownForEdit(rundownId);
      DOM.setText('createViewTitle', 'Edit Rundown');
    } else {
      this.resetCreateForm();
      DOM.setText('createViewTitle', 'Create New Rundown');
    }
  }

  setActiveView(viewId) {
    document.querySelectorAll('.content-view').forEach(view => {
      view.classList.remove('active');
    });
    DOM.addClass(viewId, 'active');
  }

  updateNavigation(activeId) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    DOM.addClass(activeId, 'active');
  }

  renderRundowns() {
    const grid = DOM.get('rundownsGrid');
    const emptyState = DOM.get('emptyState');
    
    if (!grid) return;

    if (this.rundowns.length === 0) {
      DOM.hide(grid);
      DOM.show(emptyState);
      return;
    }

    DOM.show(grid);
    DOM.hide(emptyState);

    grid.innerHTML = this.rundowns.map(rundown => this.createRundownCard(rundown)).join('');
    this.setupRundownCardEvents();
  }

  createRundownCard(rundown) {
    const statusConfig = getStatusConfig(rundown.status);
    const canEdit = authManager.canEditRundown(rundown);
    const canApprove = authManager.canApproveRundown(rundown);
    const isOwner = authManager.ownsRundown(rundown);

    return `
      <div class="rundown-card" data-id="${rundown.id}">
        <div class="rundown-card-header">
          <div>
            <h3 class="rundown-title">${StringUtils.escapeHtml(rundown.title)}</h3>
            <div class="rundown-meta">
              ${DateUtils.getRelativeTime(rundown.updated_at)} • 
              ${rundown.created_by_name || 'Unknown'}
              ${rundown.class_name ? ` • ${rundown.class_name}` : ''}
            </div>
          </div>
          <span class="status-badge ${rundown.status}">${statusConfig.label}</span>
        </div>
        
        ${rundown.description ? `
          <div class="rundown-description">
            ${StringUtils.escapeHtml(StringUtils.truncate(rundown.description, 150))}
          </div>
        ` : ''}
        
        <div class="rundown-stats">
          <span class="rundown-stat">
            <span>📊</span> ${rundown.segment_count || 0} segments
          </span>
          <span class="rundown-stat">
            <span>⏱️</span> ${formatDuration(rundown.total_duration || 0)}
          </span>
          <span class="rundown-stat">
            <span>📰</span> ${rundown.story_count || 0} stories
          </span>
        </div>
        
        ${rundown.teacher_comment ? `
          <div class="teacher-comment">
            <strong>Teacher Comment:</strong>
            <p>${StringUtils.escapeHtml(StringUtils.truncate(rundown.teacher_comment, 100))}</p>
          </div>
        ` : ''}
        
        <div class="rundown-actions">
          <button class="btn btn-secondary view-btn" data-id="${rundown.id}">
            👁️ View
          </button>
          ${canEdit ? `
            <button class="btn btn-primary edit-btn" data-id="${rundown.id}">
              ✏️ Edit
            </button>
          ` : ''}
          ${isOwner && rundown.status === 'draft' ? `
            <button class="btn btn-success submit-btn" data-id="${rundown.id}">
              📤 Submit
            </button>
          ` : ''}
          ${canApprove ? `
            <button class="btn btn-success approve-btn" data-id="${rundown.id}">
              ✅ Approve
            </button>
            <button class="btn btn-danger reject-btn" data-id="${rundown.id}">
              ❌ Reject
            </button>
          ` : ''}
          ${rundown.status === 'approved' ? `
            <button class="btn btn-secondary export-btn" data-id="${rundown.id}">
              📥 Export
            </button>
          ` : ''}
          ${canEdit ? `
            <button class="btn btn-danger archive-btn" data-id="${rundown.id}">
              🗂️ Archive
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  setupRundownCardEvents() {
    // View buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rundownId = e.target.dataset.id;
        this.viewRundown(rundownId);
      });
    });

    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rundownId = e.target.dataset.id;
        this.showCreateView(rundownId);
      });
    });

    // Submit buttons
    document.querySelectorAll('.submit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rundownId = e.target.dataset.id;
        this.submitRundownForReview(rundownId);
      });
    });

    // Approve buttons
    document.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rundownId = e.target.dataset.id;
        this.approveRundown(rundownId);
      });
    });

    // Reject buttons
    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rundownId = e.target.dataset.id;
        this.rejectRundown(rundownId);
      });
    });

    // Export buttons
    document.querySelectorAll('.export-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rundownId = e.target.dataset.id;
        this.showExportOptions(rundownId);
      });
    });

    // Archive buttons
    document.querySelectorAll('.archive-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rundownId = e.target.dataset.id;
        this.archiveRundown(rundownId);
      });
    });
  }

  async loadRundownForEdit(rundownId) {
    try {
      const response = await authManager.apiRequest(getApiUrl(`/rundowns/${rundownId}`));
      
      if (response.ok) {
        const rundown = await response.json();
        this.currentRundown = rundown;
        this.populateEditForm(rundown);
        
        // Load segments for this rundown
        if (window.segmentManager) {
          window.segmentManager.loadSegments(rundownId);
        }
      } else {
        throw new Error('Failed to load rundown');
      }
    } catch (error) {
      console.error('Error loading rundown:', error);
      notifications.error('Failed to load rundown for editing');
    }
  }

  populateEditForm(rundown) {
    DOM.get('rundownTitle').value = rundown.title || '';
    DOM.get('rundownDescription').value = rundown.description || '';
    DOM.get('rundownClass').value = rundown.class_id || '';
    
    // Show status info for existing rundowns
    if (rundown.id) {
      this.showStatusInfo(rundown);
      DOM.toggle('submitRundownBtn', rundown.status === 'draft' && authManager.ownsRundown(rundown));
    } else {
      DOM.hide('statusInfo');
      DOM.hide('submitRundownBtn');
    }
  }

  showStatusInfo(rundown) {
    const statusInfo = DOM.get('statusInfo');
    const statusBadge = DOM.get('statusBadge');
    const statusMessage = DOM.get('statusMessage');
    const teacherComment = DOM.get('teacherComment');
    const commentText = DOM.get('commentText');

    if (!statusInfo || !statusBadge || !statusMessage) return;

    const statusConfig = getStatusConfig(rundown.status);
    
    statusBadge.className = `status-badge ${rundown.status}`;
    statusBadge.textContent = statusConfig.label;
    statusMessage.textContent = statusConfig.description;
    
    if (rundown.teacher_comment) {
      DOM.show(teacherComment);
      DOM.setText(commentText, rundown.teacher_comment);
    } else {
      DOM.hide(teacherComment);
    }
    
    DOM.show(statusInfo);
  }

  resetCreateForm() {
    DOM.get('rundownForm')?.reset();
    DOM.hide('statusInfo');
    DOM.hide('submitRundownBtn');
    this.currentRundown = null;
    
    // Clear segments
    if (window.segmentManager) {
      window.segmentManager.clearSegments();
    }
  }

  async saveRundown() {
    const form = DOM.get('rundownForm');
    if (!form || !form.checkValidity()) {
      notifications.validationError('form data');
      return;
    }

    const formData = {
      title: DOM.get('rundownTitle').value.trim(),
      description: DOM.get('rundownDescription').value.trim(),
      class_id: DOM.get('rundownClass').value || null
    };

    // Validation
    if (!formData.title) {
      notifications.validationError('title');
      return;
    }

    const loading = notifications.loading(
      this.editingRundownId ? 'Updating rundown...' : 'Creating rundown...'
    );

    try {
      const url = this.editingRundownId 
        ? getApiUrl(`/rundowns/${this.editingRundownId}`)
        : getApiUrl('/rundowns');
      
      const method = this.editingRundownId ? 'PUT' : 'POST';

      const response = await authManager.apiRequest(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        
        if (!this.editingRundownId) {
          this.editingRundownId = result.rundown.id;
          this.currentRundown = result.rundown;
          
          // Show submit button for new rundowns
          DOM.show('submitRundownBtn');
        }

        loading.success(this.editingRundownId ? 'Rundown updated!' : 'Rundown created!');
        this.loadRundowns(); // Refresh list
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Save failed');
      }
    } catch (error) {
      loading.error(error.message);
      console.error('Error saving rundown:', error);
    }
  }

  async submitRundown() {
    if (!this.editingRundownId) {
      notifications.error('Please save the rundown first');
      return;
    }

    const loading = notifications.loading('Submitting rundown for review...');

    try {
      const response = await authManager.apiRequest(
        getApiUrl(`/rundowns/${this.editingRundownId}/submit`), {
          method: 'POST'
        }
      );

      if (response.ok) {
        loading.success('Rundown submitted for teacher review!');
        DOM.hide('submitRundownBtn');
        this.loadRundowns(); // Refresh list
        
        // Update current rundown status
        if (this.currentRundown) {
          this.currentRundown.status = 'submitted';
          this.showStatusInfo(this.currentRundown);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Submission failed');
      }
    } catch (error) {
      loading.error(error.message);
      console.error('Error submitting rundown:', error);
    }
  }

  async submitRundownForReview(rundownId) {
    notifications.confirmAction(
      'Submit this rundown for teacher review?',
      async () => {
        const loading = notifications.loading('Submitting for review...');
        
        try {
          const response = await authManager.apiRequest(
            getApiUrl(`/rundowns/${rundownId}/submit`), {
              method: 'POST'
            }
          );

          if (response.ok) {
            loading.success('Rundown submitted for review!');
            this.loadRundowns();
          } else {
            const error = await response.json();
            throw new Error(error.error || 'Submission failed');
          }
        } catch (error) {
          loading.error(error.message);
        }
      }
    );
  }

  async approveRundown(rundownId) {
    const comment = prompt('Add a comment (optional):');
    
    const loading = notifications.loading('Approving rundown...');

    try {
      const response = await authManager.apiRequest(
        getApiUrl(`/rundowns/${rundownId}/approve`), {
          method: 'POST',
          body: JSON.stringify({ comment: comment?.trim() || null })
        }
      );

      if (response.ok) {
        loading.success('Rundown approved!');
        this.loadRundowns();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Approval failed');
      }
    } catch (error) {
      loading.error(error.message);
    }
  }

  async rejectRundown(rundownId) {
    const comment = prompt('Please provide feedback for the student (required):');
    
    if (!comment || comment.trim().length === 0) {
      notifications.warning('Comment is required when rejecting a rundown');
      return;
    }

    const loading = notifications.loading('Rejecting rundown...');

    try {
      const response = await authManager.apiRequest(
        getApiUrl(`/rundowns/${rundownId}/reject`), {
          method: 'POST',
          body: JSON.stringify({ comment: comment.trim() })
        }
      );

      if (response.ok) {
        loading.success('Rundown rejected and returned to student');
        this.loadRundowns();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Rejection failed');
      }
    } catch (error) {
      loading.error(error.message);
    }
  }

  showExportOptions(rundownId) {
    notifications.confirmAction(
      'Choose export format:',
      () => this.exportRundown(rundownId, 'csv'),
      () => this.exportRundown(rundownId, 'pdf')
    );
  }

  async exportRundown(rundownId, format) {
    const loading = notifications.loading(`Exporting as ${format.toUpperCase()}...`);

    try {
      const response = await authManager.apiRequest(
        getApiUrl(`/integration/rundowns/${rundownId}/export/${format}`)
      );

      if (response.ok) {
        // Trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rundown-${rundownId}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        loading.success(`${format.toUpperCase()} export completed!`);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      loading.error(`Export failed: ${error.message}`);
    }
  }

  async archiveRundown(rundownId) {
    notifications.confirmAction(
      'Archive this rundown? It will be moved to archived rundowns.',
      async () => {
        const loading = notifications.loading('Archiving rundown...');

        try {
          const response = await authManager.apiRequest(
            getApiUrl(`/rundowns/${rundownId}`), {
              method: 'DELETE'
            }
          );

          if (response.ok) {
            loading.success('Rundown archived successfully');
            this.loadRundowns();
          } else {
            const error = await response.json();
            throw new Error(error.error || 'Archive failed');
          }
        } catch (error) {
          loading.error(error.message);
        }
      }
    );
  }

  applyFilters() {
    this.filters = {
      search: DOM.get('searchInput')?.value.trim() || '',
      status: DOM.get('statusFilter')?.value || '',
      class_id: DOM.get('classFilter')?.value || ''
    };

    this.saveFilters();
    this.loadRundowns();
  }

  clearFilters() {
    DOM.get('searchInput').value = '';
    DOM.get('statusFilter').value = '';
    DOM.get('classFilter').value = '';
    
    this.filters = {};
    this.saveFilters();
    this.loadRundowns();
  }

  updateStats(pagination) {
    // Count by status
    const stats = this.rundowns.reduce((acc, rundown) => {
      acc[rundown.status] = (acc[rundown.status] || 0) + 1;
      return acc;
    }, {});

    DOM.setText('statTotal', pagination?.total || this.rundowns.length);
    DOM.setText('statDrafts', stats.draft || 0);
    DOM.setText('statSubmitted', stats.submitted || 0);
    DOM.setText('statApproved', stats.approved || 0);
    
    // Calculate remaining slots
    const currentUser = getCurrentUser();
    const userRundowns = this.rundowns.filter(r => r.created_by === currentUser?.id);
    const remainingSlots = Math.max(0, CONFIG.APP.maxRundowns - userRundowns.length);
    DOM.setText('statSlots', remainingSlots);
  }

  loadFilters() {
    return Storage.get(CONFIG.STORAGE_KEYS.filters, {});
  }

  saveFilters() {
    Storage.set(CONFIG.STORAGE_KEYS.filters, this.filters);
  }

  viewRundown(rundownId) {
    // For now, just edit the rundown
    // Could implement a read-only view in the future
    this.showCreateView(rundownId);
  }
}

// Initialize rundown manager
const rundownManager = new RundownManager();

// Export for global use
window.rundownManager = rundownManager;