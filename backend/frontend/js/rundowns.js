// VidPOD Rundown Manager
// Main rundown management functionality

class RundownManager {
  constructor() {
    this.currentRundown = null;
    this.currentSegments = [];
    this.currentTalent = { hosts: [], guests: [] };
    this.currentStories = [];
    this.autoSaveDebounced = RundownUtils.debounce(this.autoSave.bind(this), 300);
    
    this.init();
  }
  
  async init() {
    try {
      // Check authentication
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/index.html';
        return;
      }
      
      this.setupEventListeners();
      await this.loadUserClasses();
      await this.loadRundowns();
      
      // Set default air date to today
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('newAirDate').value = today;
      
    } catch (error) {
      console.error('Failed to initialize rundown manager:', error);
      RundownUtils.showNotification('Failed to load rundowns', 'error');
    }
  }
  
  setupEventListeners() {
    // Rundown picker
    document.getElementById('rundownPicker').addEventListener('change', (e) => {
      this.loadRundown(e.target.value);
    });
    
    // Control buttons
    document.getElementById('newRundownBtn').addEventListener('click', () => {
      RundownUtils.showModal('newRundownModal');
    });
    
    document.getElementById('expandAllBtn').addEventListener('click', () => {
      this.expandAllSegments();
    });
    
    document.getElementById('collapseAllBtn').addEventListener('click', () => {
      this.collapseAllSegments();
    });
    
    document.getElementById('addSegmentBtn').addEventListener('click', () => {
      this.showSegmentModal();
    });
    
    document.getElementById('printPdfBtn').addEventListener('click', () => {
      this.exportPDF();
    });
    
    // Rundown header fields
    document.getElementById('showName').addEventListener('input', (e) => {
      if (this.currentRundown) {
        this.currentRundown.show_name = e.target.value;
        this.autoSaveDebounced();
      }
    });
    
    document.getElementById('airDate').addEventListener('change', (e) => {
      if (this.currentRundown) {
        this.currentRundown.air_date = e.target.value;
        this.autoSaveDebounced();
        this.updateRundownPicker();
      }
    });
    
    document.getElementById('shareWithClass').addEventListener('change', (e) => {
      if (this.currentRundown) {
        this.currentRundown.share_with_class = e.target.checked;
        this.autoSaveDebounced();
      }
    });
    
    document.getElementById('targetDuration').addEventListener('input', (e) => {
      const value = RundownUtils.formatTimeInput(e.target.value);
      e.target.value = value;
      
      if (this.currentRundown && RundownUtils.validateTimeInput(value)) {
        this.currentRundown.target_duration = RundownUtils.parseTimeString(value);
        this.updateTimingChip();
        this.autoSaveDebounced();
      }
    });
    
    // New rundown modal
    document.getElementById('newRundownForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.createRundown();
    });
    
    // Modal close handlers
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          RundownUtils.hideModal(modal.id);
        }
      });
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          RundownUtils.hideModal(modal.id);
        }
      });
    });
    
    // Story panel close
    document.getElementById('closeStoryPanel').addEventListener('click', () => {
      document.getElementById('storyPanel').classList.remove('open');
    });
  }
  
  async loadUserClasses() {
    try {
      const classes = await RundownUtils.apiCall('/api/classes');
      const classSelect = document.getElementById('newClassId');
      
      classSelect.innerHTML = '<option value="">No class assigned</option>';
      
      classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = `${cls.class_name} (${cls.subject || 'No subject'})`;
        classSelect.appendChild(option);
      });
      
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  }
  
  async loadRundowns() {
    try {
      const rundowns = await RundownUtils.apiCall('/api/rundowns');
      this.populateRundownPicker(rundowns);
      
    } catch (error) {
      console.error('Failed to load rundowns:', error);
      RundownUtils.showNotification('Failed to load rundowns', 'error');
    }
  }
  
  populateRundownPicker(rundowns) {
    const picker = document.getElementById('rundownPicker');
    picker.innerHTML = '<option value="">Select a rundown...</option>';
    
    // Sort by air date
    const sorted = RundownUtils.sortByAirDate(rundowns);
    
    sorted.forEach(rundown => {
      const option = document.createElement('option');
      option.value = rundown.id;
      
      const airDate = new Date(rundown.air_date).toLocaleDateString();
      option.textContent = `${airDate} — ${rundown.show_name}`;
      
      picker.appendChild(option);
    });
  }
  
  async loadRundown(rundownId) {
    if (!rundownId) {
      this.currentRundown = null;
      document.getElementById('rundownDisplay').style.display = 'none';
      return;
    }
    
    try {
      const rundown = await RundownUtils.apiCall(`/api/rundowns/${rundownId}`);
      this.currentRundown = rundown;
      this.currentSegments = rundown.segments || [];
      this.currentTalent = rundown.talent || { hosts: [], guests: [] };
      this.currentStories = rundown.stories || [];
      
      this.displayRundown();
      document.getElementById('rundownDisplay').style.display = 'block';
      
    } catch (error) {
      console.error('Failed to load rundown:', error);
      RundownUtils.showNotification('Failed to load rundown', 'error');
    }
  }
  
  displayRundown() {
    if (!this.currentRundown) return;
    
    // Populate header fields
    document.getElementById('showName').value = this.currentRundown.show_name || '';
    document.getElementById('airDate').value = this.currentRundown.air_date || '';
    document.getElementById('shareWithClass').checked = this.currentRundown.share_with_class || false;
    
    const targetTime = RundownUtils.formatTimeString(this.currentRundown.target_duration || 1200);
    document.getElementById('targetDuration').value = targetTime;
    
    this.updateTimingChip();
    
    // Load segments, talent, and stories through their respective managers
    if (window.RundownSegments) {
      window.RundownSegments.loadSegments(this.currentSegments);
    }
    
    if (window.RundownTalent) {
      window.RundownTalent.loadTalent(this.currentTalent);
    }
    
    if (window.RundownStories) {
      window.RundownStories.loadStories(this.currentStories);
    }
  }
  
  updateTimingChip() {
    if (!this.currentRundown) return;
    
    const totalSeconds = this.calculateTotalDuration();
    const targetSeconds = this.currentRundown.target_duration || 1200;
    
    document.getElementById('totalDuration').textContent = RundownUtils.formatTimeString(totalSeconds);
    
    const timeDiff = totalSeconds - targetSeconds;
    const diffElement = document.getElementById('timeDifference');
    const ringElement = document.getElementById('timingRing');
    
    // Reset classes
    ringElement.className = 'timing-ring';
    
    if (timeDiff === 0) {
      diffElement.textContent = 'Balanced';
      ringElement.classList.add('balanced');
    } else if (timeDiff > 0) {
      diffElement.textContent = `Over ${RundownUtils.formatTimeString(timeDiff)}`;
      ringElement.classList.add('over');
    } else {
      diffElement.textContent = `Under ${RundownUtils.formatTimeString(Math.abs(timeDiff))}`;
      ringElement.classList.add('under');
    }
  }
  
  calculateTotalDuration() {
    return this.currentSegments.reduce((total, segment) => {
      return total + (segment.duration || 0);
    }, 0);
  }
  
  async createRundown() {
    try {
      const formData = {
        show_name: document.getElementById('newShowName').value,
        air_date: document.getElementById('newAirDate').value,
        target_duration: RundownUtils.parseTimeString(document.getElementById('newTargetDuration').value || '20:00'),
        class_id: document.getElementById('newClassId').value || null,
        share_with_class: document.getElementById('newShareWithClass').checked
      };
      
      if (!formData.show_name || !formData.air_date) {
        RundownUtils.showNotification('Show name and air date are required', 'error');
        return;
      }
      
      const newRundown = await RundownUtils.apiCall('/api/rundowns', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      RundownUtils.hideModal('newRundownModal');
      RundownUtils.showNotification('Rundown created successfully', 'success');
      
      // Reload rundowns and select the new one
      await this.loadRundowns();
      document.getElementById('rundownPicker').value = newRundown.id;
      await this.loadRundown(newRundown.id);
      
      // Reset form
      document.getElementById('newRundownForm').reset();
      const today = new Date().toISOString().split('T')[0];
      document.getElementById('newAirDate').value = today;
      
    } catch (error) {
      console.error('Failed to create rundown:', error);
      RundownUtils.showNotification(error.message || 'Failed to create rundown', 'error');
    }
  }
  
  async autoSave() {
    if (!this.currentRundown || !this.currentRundown.id) return;
    
    try {
      const updateData = {
        show_name: this.currentRundown.show_name,
        air_date: this.currentRundown.air_date,
        target_duration: this.currentRundown.target_duration,
        share_with_class: this.currentRundown.share_with_class
      };
      
      await RundownUtils.apiCall(`/api/rundowns/${this.currentRundown.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      // Update picker if air date changed
      this.updateRundownPicker();
      
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }
  
  updateRundownPicker() {
    const picker = document.getElementById('rundownPicker');
    const selectedOption = picker.querySelector(`option[value="${this.currentRundown.id}"]`);
    
    if (selectedOption && this.currentRundown) {
      const airDate = new Date(this.currentRundown.air_date).toLocaleDateString();
      selectedOption.textContent = `${airDate} — ${this.currentRundown.show_name}`;
    }
  }
  
  expandAllSegments() {
    if (window.RundownSegments) {
      window.RundownSegments.expandAll();
    }
  }
  
  collapseAllSegments() {
    if (window.RundownSegments) {
      window.RundownSegments.collapseAll();
    }
  }
  
  showSegmentModal(segmentData = null, insertAfter = null) {
    if (window.RundownSegments) {
      window.RundownSegments.showModal(segmentData, insertAfter);
    }
  }
  
  async exportPDF() {
    if (!this.currentRundown) {
      RundownUtils.showNotification('No rundown selected', 'error');
      return;
    }
    
    try {
      const response = await fetch(`/api/rundown-stories/rundown/${this.currentRundown.id}/export/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `rundown-${this.currentRundown.show_name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      RundownUtils.showNotification('PDF exported successfully', 'success');
      
    } catch (error) {
      console.error('Failed to export PDF:', error);
      RundownUtils.showNotification('Failed to export PDF', 'error');
    }
  }
  
  // Update segments when modified by segment manager
  updateSegments(segments) {
    this.currentSegments = segments;
    this.updateTimingChip();
  }
  
  // Update talent when modified by talent manager
  updateTalent(talent) {
    this.currentTalent = talent;
  }
  
  // Update stories when modified by story manager
  updateStories(stories) {
    this.currentStories = stories;
  }
  
  // Get current rundown data
  getCurrentRundown() {
    return this.currentRundown;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.rundownManager = new RundownManager();
});

// Export for use by other modules
window.RundownManager = RundownManager;