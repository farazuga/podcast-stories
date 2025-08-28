// VidPOD Rundown Stories Manager
// Handles story integration from browse stories into rundowns

class RundownStories {
  constructor() {
    this.stories = [];
    this.availableStories = [];
    this.currentSearch = '';
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Story search
    document.getElementById('searchStoriesBtn').addEventListener('click', () => {
      this.searchStories();
    });
    
    document.getElementById('storySearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchStories();
      }
    });
    
    // Add story integration buttons throughout the app
    this.setupStoryIntegrationButtons();
  }
  
  setupStoryIntegrationButtons() {
    // This can be called when segments are rendered to add story integration buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('add-story-btn')) {
        const segmentId = e.target.dataset.segmentId;
        this.showStoryPanel(segmentId);
      }
    });
  }
  
  loadStories(stories) {
    this.stories = stories || [];
    this.renderIntegratedStories();
  }
  
  renderIntegratedStories() {
    // This could be displayed in a dedicated section or within segments
    // For now, we'll just track them internally
    console.log('Integrated stories loaded:', this.stories);
  }
  
  async showStoryPanel(segmentId = null) {
    this.targetSegmentId = segmentId;
    
    // Load available stories
    await this.loadAvailableStories();
    
    // Show panel
    document.getElementById('storyPanel').classList.add('open');
  }
  
  async loadAvailableStories(search = '') {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', '20'); // Limit for panel display
      
      const stories = await RundownUtils.apiCall(`/api/rundown-stories/available?${params}`);
      this.availableStories = stories;
      this.renderAvailableStories();
      
    } catch (error) {
      console.error('Failed to load available stories:', error);
      RundownUtils.showNotification('Failed to load stories', 'error');
    }
  }
  
  renderAvailableStories() {
    const container = document.getElementById('availableStories');
    container.innerHTML = '';
    
    if (this.availableStories.length === 0) {
      container.innerHTML = `
        <div class="no-stories">
          <p>No stories found. Try a different search term.</p>
        </div>
      `;
      return;
    }
    
    this.availableStories.forEach(story => {
      const storyElement = this.createStoryElement(story);
      container.appendChild(storyElement);
    });
  }
  
  createStoryElement(story) {
    const element = document.createElement('div');
    element.className = 'story-item';
    element.onclick = () => this.selectStory(story);
    
    // Format dates
    const uploadedDate = story.uploaded_date ? new Date(story.uploaded_date).toLocaleDateString() : '';
    const startDate = story.coverage_start_date ? new Date(story.coverage_start_date).toLocaleDateString() : '';
    const endDate = story.coverage_end_date ? new Date(story.coverage_end_date).toLocaleDateString() : '';
    
    // Format tags and interviewees
    const tags = Array.isArray(story.tags) ? story.tags.join(', ') : '';
    const interviewees = Array.isArray(story.interviewees) ? story.interviewees.join(', ') : '';
    
    element.innerHTML = `
      <h4>${this.escapeHtml(story.idea_title)}</h4>
      <p>${this.escapeHtml(this.truncateText(story.idea_description || '', 120))}</p>
      <div class="story-meta">
        <span>By: ${this.escapeHtml(story.uploaded_by_name || 'Unknown')}</span>
        ${uploadedDate ? `<span>Date: ${uploadedDate}</span>` : ''}
        ${story.favorite_count ? `<span>♥ ${story.favorite_count}</span>` : ''}
      </div>
      ${tags ? `<div class="story-tags">${this.escapeHtml(tags)}</div>` : ''}
      ${interviewees ? `<div class="story-interviewees">Interviewees: ${this.escapeHtml(interviewees)}</div>` : ''}
    `;
    
    return element;
  }
  
  async selectStory(story) {
    try {
      const rundown = window.rundownManager?.getCurrentRundown();
      if (!rundown) {
        throw new Error('No rundown selected');
      }
      
      const integrationData = {
        story_id: story.id,
        segment_id: this.targetSegmentId || null,
        notes: '' // Could prompt for notes
      };
      
      const integratedStory = await RundownUtils.apiCall(`/api/rundown-stories/rundown/${rundown.id}`, {
        method: 'POST',
        body: JSON.stringify(integrationData)
      });
      
      this.stories.push(integratedStory);
      this.updateRundownManager();
      
      // Close panel
      document.getElementById('storyPanel').classList.remove('open');
      
      RundownUtils.showNotification('Story added to rundown successfully', 'success');
      
      // Show success details
      const segmentName = this.targetSegmentId ? 
        this.getSegmentNameById(this.targetSegmentId) : 
        'general rundown';
      
      RundownUtils.showNotification(
        `"${story.idea_title}" added to ${segmentName}`, 
        'success', 
        4000
      );
      
    } catch (error) {
      console.error('Failed to add story to rundown:', error);
      
      if (error.message.includes('already integrated')) {
        RundownUtils.showNotification('Story is already in this rundown', 'warning');
      } else {
        RundownUtils.showNotification(error.message || 'Failed to add story', 'error');
      }
    }
  }
  
  async searchStories() {
    const searchTerm = document.getElementById('storySearch').value.trim();
    this.currentSearch = searchTerm;
    
    await this.loadAvailableStories(searchTerm);
  }
  
  async removeStory(integrationId) {
    if (!confirm('Remove this story from the rundown?')) return;
    
    try {
      await RundownUtils.apiCall(`/api/rundown-stories/${integrationId}`, {
        method: 'DELETE'
      });
      
      this.stories = this.stories.filter(s => s.id !== integrationId);
      this.updateRundownManager();
      this.renderIntegratedStories();
      
      RundownUtils.showNotification('Story removed from rundown', 'success');
      
    } catch (error) {
      console.error('Failed to remove story:', error);
      RundownUtils.showNotification('Failed to remove story', 'error');
    }
  }
  
  async updateStoryNotes(integrationId, notes) {
    try {
      const updatedStory = await RundownUtils.apiCall(`/api/rundown-stories/${integrationId}`, {
        method: 'PUT',
        body: JSON.stringify({ notes })
      });
      
      const index = this.stories.findIndex(s => s.id === integrationId);
      if (index !== -1) {
        this.stories[index] = updatedStory;
        this.updateRundownManager();
      }
      
    } catch (error) {
      console.error('Failed to update story notes:', error);
      RundownUtils.showNotification('Failed to update notes', 'error');
    }
  }
  
  getSegmentNameById(segmentId) {
    if (window.rundownSegments) {
      const segment = window.rundownSegments.segments.find(s => s.id == segmentId);
      return segment ? segment.title : 'unknown segment';
    }
    return 'segment';
  }
  
  // Export integrated stories data for use in other parts of the app
  getIntegratedStoriesForSegment(segmentId) {
    return this.stories.filter(story => story.segment_id == segmentId);
  }
  
  getAllIntegratedStories() {
    return this.stories;
  }
  
  // Story browsing integration - can be called from browse stories page
  static async openRundownSelector(storyId) {
    try {
      // Load user's rundowns
      const rundowns = await RundownUtils.apiCall('/api/rundowns');
      
      if (rundowns.length === 0) {
        RundownUtils.showNotification('No rundowns available. Create a rundown first.', 'warning');
        return;
      }
      
      // Create selection modal
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.display = 'block';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>Add to Rundown</h3>
            <span class="modal-close">&times;</span>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Select Rundown:</label>
              <select id="rundownSelector" class="form-control">
                <option value="">Choose rundown...</option>
                ${rundowns.map(r => `
                  <option value="${r.id}">${new Date(r.air_date).toLocaleDateString()} — ${r.show_name}</option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Notes (optional):</label>
              <textarea id="storyNotes" placeholder="Add any notes about this story integration..." rows="3"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="addToRundownBtn">Add to Rundown</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Handle modal events
      modal.querySelector('.modal-close').onclick = () => {
        document.body.removeChild(modal);
      };
      
      modal.querySelector('.modal-cancel').onclick = () => {
        document.body.removeChild(modal);
      };
      
      modal.onclick = (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
        }
      };
      
      modal.querySelector('#addToRundownBtn').onclick = async () => {
        const rundownId = modal.querySelector('#rundownSelector').value;
        const notes = modal.querySelector('#storyNotes').value;
        
        if (!rundownId) {
          RundownUtils.showNotification('Please select a rundown', 'error');
          return;
        }
        
        try {
          await RundownUtils.apiCall(`/api/rundown-stories/rundown/${rundownId}`, {
            method: 'POST',
            body: JSON.stringify({ story_id: storyId, notes })
          });
          
          document.body.removeChild(modal);
          RundownUtils.showNotification('Story added to rundown successfully', 'success');
          
        } catch (error) {
          console.error('Failed to add story to rundown:', error);
          
          if (error.message.includes('already integrated')) {
            RundownUtils.showNotification('Story is already in that rundown', 'warning');
          } else {
            RundownUtils.showNotification('Failed to add story to rundown', 'error');
          }
        }
      };
      
    } catch (error) {
      console.error('Failed to open rundown selector:', error);
      RundownUtils.showNotification('Failed to load rundowns', 'error');
    }
  }
  
  updateRundownManager() {
    if (window.rundownManager) {
      window.rundownManager.updateStories(this.stories);
    }
  }
  
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }
  
  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.rundownStories = new RundownStories();
  window.RundownStories = window.rundownStories;
});

// Export static method for use from other pages
window.RundownStories = RundownStories;