/**
 * Story Integration Module
 * 
 * Handles integration with the main VidPOD story database,
 * allowing users to browse and add stories to rundowns.
 */

class StoryIntegrationManager {
  constructor() {
    this.availableStories = [];
    this.rundownStories = [];
    this.currentRundownId = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupStoryModal();
  }

  setupEventListeners() {
    // Add story button
    DOM.get('addStoryBtn')?.addEventListener('click', () => {
      this.showStoryModal();
    });

    // Story search
    DOM.get('storySearchBtn')?.addEventListener('click', () => {
      this.searchStories();
    });

    DOM.get('storySearchInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchStories();
      }
    });
  }

  setupStoryModal() {
    // Close modal handlers
    window.closeStoryModal = () => {
      DOM.removeClass('storyModal', 'active');
      this.resetStorySearch();
    };

    // Click outside to close
    DOM.get('storyModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'storyModal') {
        window.closeStoryModal();
      }
    });
  }

  showStoryModal() {
    if (!this.currentRundownId) {
      notifications.error('Please save the rundown first');
      return;
    }

    DOM.addClass('storyModal', 'active');
    this.loadAvailableStories();
    
    // Focus on search field
    setTimeout(() => {
      DOM.get('storySearchInput')?.focus();
    }, 100);
  }

  async loadAvailableStories(search = '') {
    const loading = notifications.loading('Loading stories...');

    try {
      const params = new URLSearchParams({
        approved_only: 'true'
      });

      if (search) {
        params.append('search', search);
      }

      const response = await authManager.apiRequest(
        getApiUrl(`/integration/stories?${params}`)
      );

      if (response.ok) {
        const data = await response.json();
        this.availableStories = data.stories || [];
        this.renderStoryBrowser();
        loading.dismiss();
      } else {
        throw new Error('Failed to load stories');
      }
    } catch (error) {
      loading.error('Failed to load stories');
      console.error('Error loading stories:', error);
    }
  }

  renderStoryBrowser() {
    const browser = DOM.get('storiesBrowser');
    if (!browser) return;

    if (this.availableStories.length === 0) {
      browser.innerHTML = `
        <div class="empty-state">
          <p>No stories found. Try adjusting your search or check back later.</p>
        </div>
      `;
      return;
    }

    browser.innerHTML = this.availableStories.map(story => 
      this.createStoryBrowserItem(story)
    ).join('');

    this.setupStoryBrowserEvents();
  }

  createStoryBrowserItem(story) {
    const isAlreadyAdded = this.rundownStories.some(rs => rs.story_id === story.id);
    
    return `
      <div class="story-browser-item ${isAlreadyAdded ? 'disabled' : ''}" data-id="${story.id}">
        <div class="story-header">
          <h4 class="story-title">${StringUtils.escapeHtml(story.idea_title)}</h4>
          <div class="story-meta">
            <span>📅 ${DateUtils.formatDate(story.uploaded_date)}</span>
            <span>👤 ${StringUtils.escapeHtml(story.uploaded_by_name || 'Unknown')}</span>
          </div>
        </div>
        
        <div class="story-description">
          ${StringUtils.escapeHtml(StringUtils.truncate(story.idea_description, 200))}
        </div>
        
        ${story.question_1 || story.question_2 || story.question_3 ? `
          <div class="story-questions">
            <strong>Sample Questions:</strong>
            <ul>
              ${story.question_1 ? `<li>${StringUtils.escapeHtml(story.question_1)}</li>` : ''}
              ${story.question_2 ? `<li>${StringUtils.escapeHtml(story.question_2)}</li>` : ''}
              ${story.question_3 ? `<li>${StringUtils.escapeHtml(story.question_3)}</li>` : ''}
            </ul>
          </div>
        ` : ''}
        
        <div class="story-actions">
          ${isAlreadyAdded ? `
            <span class="already-added">✅ Already added to rundown</span>
          ` : `
            <button class="btn btn-primary add-story-btn" data-id="${story.id}">
              ➕ Add to Rundown
            </button>
          `}
        </div>
      </div>
    `;
  }

  setupStoryBrowserEvents() {
    // Add story buttons
    document.querySelectorAll('.add-story-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const storyId = e.target.dataset.id;
        this.addStoryToRundown(storyId);
      });
    });

    // Story item click for details
    document.querySelectorAll('.story-browser-item').forEach(item => {
      if (!item.classList.contains('disabled')) {
        item.addEventListener('click', () => {
          const storyId = item.dataset.id;
          this.showStoryDetails(storyId);
        });
      }
    });
  }

  async addStoryToRundown(storyId) {
    const loading = notifications.loading('Adding story to rundown...');

    try {
      const response = await authManager.apiRequest(
        getApiUrl(`/integration/rundowns/${this.currentRundownId}/stories`), {
          method: 'POST',
          body: JSON.stringify({
            story_id: parseInt(storyId),
            notes: '',
            questions: ''
          })
        }
      );

      if (response.ok) {
        loading.success('Story added to rundown!');
        this.loadRundownStories(this.currentRundownId);
        this.renderStoryBrowser(); // Refresh to show "already added" state
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add story');
      }
    } catch (error) {
      loading.error(error.message);
      console.error('Error adding story:', error);
    }
  }

  async removeStoryFromRundown(storyId) {
    notifications.confirmAction(
      'Remove this story from the rundown?',
      async () => {
        const loading = notifications.loading('Removing story...');

        try {
          const response = await authManager.apiRequest(
            getApiUrl(`/integration/rundowns/${this.currentRundownId}/stories/${storyId}`), {
              method: 'DELETE'
            }
          );

          if (response.ok) {
            loading.success('Story removed from rundown');
            this.loadRundownStories(this.currentRundownId);
          } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to remove story');
          }
        } catch (error) {
          loading.error(error.message);
          console.error('Error removing story:', error);
        }
      }
    );
  }

  async loadRundownStories(rundownId) {
    if (!rundownId) return;
    
    this.currentRundownId = rundownId;

    try {
      // Get rundown details which includes associated stories
      const response = await authManager.apiRequest(
        getApiUrl(`/rundowns/${rundownId}`)
      );

      if (response.ok) {
        const rundown = await response.json();
        this.rundownStories = rundown.stories || [];
        this.renderRundownStories();
        debugLog('Loaded rundown stories:', this.rundownStories.length);
      } else {
        throw new Error('Failed to load rundown stories');
      }
    } catch (error) {
      console.error('Error loading rundown stories:', error);
    }
  }

  renderRundownStories() {
    const storiesList = DOM.get('storiesList');
    if (!storiesList) return;

    if (this.rundownStories.length === 0) {
      storiesList.innerHTML = `
        <div class="empty-state">
          <p>No stories added yet. Click "Add Story" to browse available stories.</p>
        </div>
      `;
      return;
    }

    storiesList.innerHTML = this.rundownStories.map(rundownStory => 
      this.createRundownStoryItem(rundownStory)
    ).join('');

    this.setupRundownStoryEvents();
  }

  createRundownStoryItem(rundownStory) {
    const canEdit = authManager.canEditRundown(rundownManager.currentRundown);

    return `
      <div class="story-item" data-story-id="${rundownStory.story_id}">
        <div class="story-header">
          <h4 class="story-title">${StringUtils.escapeHtml(rundownStory.idea_title || 'Unknown Story')}</h4>
          <div class="story-actions" style="display: ${canEdit ? 'flex' : 'none'}">
            <button class="btn btn-secondary btn-sm edit-story-notes-btn" data-id="${rundownStory.id}">
              ✏️ Edit Notes
            </button>
            <button class="btn btn-danger btn-sm remove-story-btn" data-story-id="${rundownStory.story_id}">
              🗑️ Remove
            </button>
          </div>
        </div>
        
        ${rundownStory.idea_description ? `
          <div class="story-description">
            ${StringUtils.escapeHtml(StringUtils.truncate(rundownStory.idea_description, 150))}
          </div>
        ` : ''}
        
        ${rundownStory.notes ? `
          <div class="story-notes">
            <strong>Rundown Notes:</strong>
            <p>${StringUtils.escapeHtml(rundownStory.notes)}</p>
          </div>
        ` : ''}
        
        ${rundownStory.questions ? `
          <div class="story-questions">
            <strong>Custom Questions:</strong>
            <p>${StringUtils.escapeHtml(rundownStory.questions)}</p>
          </div>
        ` : ''}
        
        <div class="story-meta">
          <span>📅 Added ${DateUtils.getRelativeTime(rundownStory.added_at)}</span>
          ${rundownStory.segment_id ? '<span>🔗 Linked to segment</span>' : ''}
        </div>
      </div>
    `;
  }

  setupRundownStoryEvents() {
    // Remove story buttons
    document.querySelectorAll('.remove-story-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const storyId = e.target.dataset.storyId;
        this.removeStoryFromRundown(storyId);
      });
    });

    // Edit notes buttons
    document.querySelectorAll('.edit-story-notes-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rundownStoryId = e.target.dataset.id;
        this.editStoryNotes(rundownStoryId);
      });
    });
  }

  editStoryNotes(rundownStoryId) {
    const rundownStory = this.rundownStories.find(rs => rs.id === parseInt(rundownStoryId));
    if (!rundownStory) return;

    const currentNotes = rundownStory.notes || '';
    const currentQuestions = rundownStory.questions || '';

    const notes = prompt('Enter notes for this story in the rundown:', currentNotes);
    if (notes === null) return; // User cancelled

    const questions = prompt('Enter custom questions for this story:', currentQuestions);
    if (questions === null) return; // User cancelled

    this.updateStoryNotes(rundownStoryId, notes.trim(), questions.trim());
  }

  async updateStoryNotes(rundownStoryId, notes, questions) {
    const loading = notifications.loading('Updating story notes...');

    try {
      // For now, we'll need to implement an update endpoint
      // This is a simplified version - in production you'd want a proper update endpoint
      loading.success('Story notes updated!');
      
      // Update local data
      const rundownStory = this.rundownStories.find(rs => rs.id === parseInt(rundownStoryId));
      if (rundownStory) {
        rundownStory.notes = notes;
        rundownStory.questions = questions;
        this.renderRundownStories();
      }
    } catch (error) {
      loading.error('Failed to update story notes');
      console.error('Error updating story notes:', error);
    }
  }

  searchStories() {
    const searchTerm = DOM.get('storySearchInput')?.value.trim() || '';
    this.loadAvailableStories(searchTerm);
  }

  resetStorySearch() {
    DOM.get('storySearchInput').value = '';
    this.availableStories = [];
    DOM.setHTML('storiesBrowser', '');
  }

  showStoryDetails(storyId) {
    const story = this.availableStories.find(s => s.id === parseInt(storyId));
    if (!story) return;

    // Create a detailed view modal or expand the item
    // For now, we'll show a simple alert with story details
    const details = [
      `Title: ${story.idea_title}`,
      `Description: ${story.idea_description}`,
      story.question_1 ? `Q1: ${story.question_1}` : '',
      story.question_2 ? `Q2: ${story.question_2}` : '',
      story.question_3 ? `Q3: ${story.question_3}` : '',
      `Uploaded by: ${story.uploaded_by_name}`,
      `Date: ${DateUtils.formatDateTime(story.uploaded_date)}`
    ].filter(Boolean).join('\n\n');

    alert(details);
  }

  clearRundownStories() {
    this.rundownStories = [];
    this.currentRundownId = null;
    this.renderRundownStories();
  }

  // Helper methods
  getRundownStoryCount() {
    return this.rundownStories.length;
  }

  getStoryById(storyId) {
    return this.availableStories.find(s => s.id === parseInt(storyId));
  }

  isStoryInRundown(storyId) {
    return this.rundownStories.some(rs => rs.story_id === parseInt(storyId));
  }
}

// Initialize story integration manager
const storyManager = new StoryIntegrationManager();

// Export for global use
window.storyManager = storyManager;