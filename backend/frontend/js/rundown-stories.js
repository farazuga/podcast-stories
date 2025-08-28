/**
 * VidPOD Rundown Stories Integration
 * Handles story browsing, selection, and PDF export for rundowns
 */

class RundownStories {
    constructor() {
        this.stories = [];
        this.currentRundownId = null;
        this.availableStories = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Story browser search
        const searchInput = document.getElementById('storyBrowserSearch');
        if (searchInput) {
            const debouncedSearch = RundownUtils.debounce(() => {
                this.searchStories();
            }, 300);
            
            searchInput.addEventListener('input', debouncedSearch);
        }
        
        // Story selection
        document.addEventListener('click', (e) => {
            if (e.target.matches('.browser-story-item:not(.already-added)')) {
                const storyId = parseInt(e.target.dataset.storyId);
                this.addStoryToRundown(storyId);
            }
            
            if (e.target.matches('.remove-story-btn')) {
                const rundownStoryId = parseInt(e.target.dataset.rundownStoryId);
                this.removeStoryConfirm(rundownStoryId);
            }
        });
    }
    
    async loadStories(rundownId) {
        this.currentRundownId = rundownId;
        
        try {
            this.stories = await RundownUtils.apiRequest(`/rundown-stories/rundown/${rundownId}`);
            this.renderStories();
            this.updateStoryCount();
        } catch (error) {
            console.error('Error loading rundown stories:', error);
            RundownUtils.showError('Failed to load stories: ' + error.message);
        }
    }
    
    renderStories() {
        const container = document.getElementById('storyList');
        if (!container) return;
        
        if (this.stories.length === 0) {
            container.innerHTML = `
                <div class="no-stories">
                    <p>No stories added yet. Browse and add stories from the database.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.stories.map(story => this.createStoryHTML(story)).join('');
    }
    
    createStoryHTML(story) {
        return `
            <div class="story-item" data-story-id="${story.story_id}">
                <div class="story-info">
                    <div class="story-title">${RundownUtils.sanitizeHtml(story.idea_title)}</div>
                    <div class="story-author">by ${RundownUtils.sanitizeHtml(story.story_author || 'Unknown')}</div>
                    ${story.segment_title ? `<div class="story-segment">In: ${RundownUtils.sanitizeHtml(story.segment_title)}</div>` : ''}
                    ${story.notes ? `<div class="story-notes">${RundownUtils.sanitizeHtml(story.notes)}</div>` : ''}
                </div>
                <div class="story-actions">
                    <button class="btn btn-small remove-story-btn" data-rundown-story-id="${story.id}" title="Remove from rundown">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }
    
    updateStoryCount() {
        const storyCount = document.getElementById('storyCount');
        if (storyCount) {
            storyCount.textContent = `(${this.stories.length})`;
        }
    }
    
    async showAddStoryModal() {
        try {
            RundownUtils.showModal('addStoryModal');
            await this.loadAvailableStories();
        } catch (error) {
            console.error('Error showing story modal:', error);
            RundownUtils.showError('Failed to load available stories');
        }
    }
    
    async loadAvailableStories(search = '') {
        if (!this.currentRundownId) {
            RundownUtils.showError('No rundown selected');
            return;
        }
        
        try {
            const params = new URLSearchParams({
                limit: 50,
                offset: 0
            });
            
            if (search) {
                params.append('search', search);
            }
            
            const response = await RundownUtils.apiRequest(`/rundown-stories/browse/${this.currentRundownId}?${params}`);
            this.availableStories = response.stories || [];
            
            this.renderAvailableStories();
            
        } catch (error) {
            console.error('Error loading available stories:', error);
            RundownUtils.showError('Failed to load available stories: ' + error.message);
        }
    }
    
    renderAvailableStories() {
        const container = document.getElementById('storyBrowserResults');
        if (!container) return;
        
        if (this.availableStories.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <p>No stories found. Try adjusting your search terms.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.availableStories.map(story => this.createBrowserStoryHTML(story)).join('');
    }
    
    createBrowserStoryHTML(story) {
        const isAlreadyAdded = story.already_in_rundown;
        const cssClass = isAlreadyAdded ? 'browser-story-item already-added' : 'browser-story-item';
        
        return `
            <div class="${cssClass}" data-story-id="${story.id}">
                <div class="browser-story-title">${RundownUtils.sanitizeHtml(story.idea_title)}</div>
                <div class="browser-story-description">
                    ${RundownUtils.truncateText(RundownUtils.sanitizeHtml(story.idea_description || ''), 200)}
                </div>
                <div class="browser-story-meta">
                    <span>by ${RundownUtils.sanitizeHtml(story.author_name || 'Unknown')}</span>
                    ${isAlreadyAdded ? '<span style="color: #28a745;">✓ Already in rundown</span>' : '<span style="color: #007cba;">Click to add</span>'}
                </div>
                ${story.tags && story.tags.length > 0 ? `
                    <div class="browser-story-tags">
                        ${story.tags.slice(0, 3).map(tag => `<span class="tag">${RundownUtils.sanitizeHtml(tag)}</span>`).join('')}
                        ${story.tags.length > 3 ? `<span class="tag-more">+${story.tags.length - 3}</span>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    async searchStories() {
        const searchInput = document.getElementById('storyBrowserSearch');
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        
        await this.loadAvailableStories(searchTerm);
    }
    
    async addStoryToRundown(storyId) {
        if (!this.currentRundownId) {
            RundownUtils.showError('No rundown selected');
            return;
        }
        
        try {
            const storyData = {
                rundown_id: this.currentRundownId,
                story_id: storyId
            };
            
            const rundownStory = await RundownUtils.apiRequest('/rundown-stories', {
                method: 'POST',
                body: JSON.stringify(storyData)
            });
            
            RundownUtils.showSuccess('Story added to rundown!');
            
            // Add to local array and re-render
            this.stories.push(rundownStory);
            this.renderStories();
            this.updateStoryCount();
            
            // Update available stories to show as already added
            const availableStory = this.availableStories.find(s => s.id === storyId);
            if (availableStory) {
                availableStory.already_in_rundown = true;
            }
            this.renderAvailableStories();
            
        } catch (error) {
            console.error('Error adding story to rundown:', error);
            RundownUtils.showError('Failed to add story: ' + error.message);
        }
    }
    
    async removeStoryConfirm(rundownStoryId) {
        const story = this.stories.find(s => s.id === rundownStoryId);
        if (!story) return;
        
        if (!confirm(`Remove "${story.idea_title}" from this rundown?`)) {
            return;
        }
        
        try {
            await RundownUtils.apiRequest(`/rundown-stories/${rundownStoryId}`, {
                method: 'DELETE'
            });
            
            RundownUtils.showSuccess('Story removed from rundown!');
            
            // Remove from local array and re-render
            this.stories = this.stories.filter(s => s.id !== rundownStoryId);
            this.renderStories();
            this.updateStoryCount();
            
            // Update available stories if modal is open
            const modal = document.getElementById('addStoryModal');
            if (modal && modal.style.display === 'block') {
                const availableStory = this.availableStories.find(s => s.id === story.story_id);
                if (availableStory) {
                    availableStory.already_in_rundown = false;
                }
                this.renderAvailableStories();
            }
            
        } catch (error) {
            console.error('Error removing story:', error);
            RundownUtils.showError('Failed to remove story: ' + error.message);
        }
    }
    
    async exportToPDF(rundownId) {
        if (!rundownId && !this.currentRundownId) {
            RundownUtils.showError('No rundown selected for export');
            return;
        }
        
        const targetRundownId = rundownId || this.currentRundownId;
        
        try {
            // Show loading state
            const exportBtn = document.getElementById('exportPDFBtn');
            const originalText = exportBtn ? exportBtn.textContent : '';
            
            if (exportBtn) {
                exportBtn.textContent = '📄 Exporting...';
                exportBtn.disabled = true;
            }
            
            // Make request for PDF
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/rundown-stories/export/${targetRundownId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`Export failed: ${response.status}`);
            }
            
            // Get the PDF blob
            const blob = await response.blob();
            
            // Extract filename from Content-Disposition header or create default
            let filename = 'rundown-export.pdf';
            const contentDisposition = response.headers.get('content-disposition');
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            // Download the file
            RundownUtils.downloadFile(blob, filename);
            RundownUtils.showSuccess('Rundown exported successfully!');
            
        } catch (error) {
            console.error('Error exporting PDF:', error);
            RundownUtils.showError('Failed to export PDF: ' + error.message);
        } finally {
            // Reset button state
            const exportBtn = document.getElementById('exportPDFBtn');
            if (exportBtn) {
                exportBtn.textContent = originalText || '📄 Export PDF';
                exportBtn.disabled = false;
            }
        }
    }
    
    // Static method for use from stories page
    static openRundownSelector(storyId) {
        // This would open a modal to select which rundown to add the story to
        // For now, we'll show a simple alert
        RundownUtils.showWarning(`Story ID ${storyId} - Rundown selector feature coming soon!`);
    }
}

// Global functions
function showAddStoryModal() {
    if (window.rundownStories) {
        window.rundownStories.showAddStoryModal();
    }
}

function hideAddStoryModal() {
    RundownUtils.hideModal('addStoryModal');
}

function searchStories() {
    if (window.rundownStories) {
        window.rundownStories.searchStories();
    }
}

function exportRundownPDF() {
    if (window.rundownStories) {
        window.rundownStories.exportToPDF();
    } else {
        RundownUtils.showError('Rundown stories not initialized');
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.rundownStories = new RundownStories();
});