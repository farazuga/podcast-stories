/**
 * VidPOD Rundowns Management
 * Main controller for rundown listing and management
 */

class RundownsManager {
    constructor() {
        this.rundowns = [];
        this.currentRundown = null;
        this.autoSaveInterval = null;
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupRoleBasedUI();
        this.loadRundowns();
        this.loadUserClasses();
    }
    
    setupRoleBasedUI() {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userRole = user.role;
            
            // Show create button only for teachers and admins
            const createBtn = document.getElementById('createRundownBtn');
            if (createBtn) {
                if (userRole === 'teacher' || userRole === 'amitrace_admin') {
                    createBtn.style.display = 'block';
                } else {
                    createBtn.style.display = 'none';
                }
            }
            
            // Update page header for students
            if (userRole === 'student') {
                const pageHeader = document.querySelector('.page-header p');
                if (pageHeader) {
                    pageHeader.textContent = 'View podcast rundowns from your enrolled classes';
                }
            }
            
            console.log('🔧 Role-based UI setup for:', userRole);
        } catch (error) {
            console.warn('⚠️ Could not setup role-based UI:', error.message);
        }
    }
    
    setupEventListeners() {
        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAllModals();
            }
        });
        
        // Form submission events
        const createForm = document.getElementById('createRundownForm');
        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createRundown();
            });
        }
    }
    
    async loadRundowns() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const grid = document.getElementById('rundownsGrid');
        const loadingSpinner = document.getElementById('loadingSpinner');
        const noRundowns = document.getElementById('noRundowns');
        
        try {
            loadingSpinner.style.display = 'block';
            grid.style.display = 'none';
            noRundowns.style.display = 'none';
            
            this.rundowns = await RundownUtils.apiRequest('/rundowns');
            
            if (this.rundowns.length === 0) {
                this.updateNoRundownsMessage(noRundowns);
                noRundowns.style.display = 'block';
            } else {
                this.renderRundowns();
                grid.style.display = 'grid';
            }
            
        } catch (error) {
            console.error('Error loading rundowns:', error);
            RundownUtils.showError('Failed to load rundowns: ' + error.message);
            this.updateNoRundownsMessage(noRundowns);
            noRundowns.style.display = 'block';
        } finally {
            loadingSpinner.style.display = 'none';
            this.isLoading = false;
        }
    }
    
    updateNoRundownsMessage(noRundownsElement) {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userRole = user.role;
            
            const titleElement = noRundownsElement.querySelector('h3');
            const messageElement = noRundownsElement.querySelector('p');
            const buttonElement = noRundownsElement.querySelector('button');
            
            if (userRole === 'student') {
                if (titleElement) titleElement.textContent = '📚 No Class Rundowns Available';
                if (messageElement) messageElement.textContent = 'Your teachers haven\'t created any rundowns for your enrolled classes yet. Check back later or ask your teacher about upcoming podcast episodes.';
                if (buttonElement) buttonElement.style.display = 'none';
            } else if (userRole === 'teacher') {
                if (titleElement) titleElement.textContent = '📝 No Rundowns Yet';
                if (messageElement) messageElement.textContent = 'Create your first rundown to get started with podcast planning for your classes.';
                if (buttonElement) {
                    buttonElement.style.display = 'block';
                    buttonElement.textContent = 'Create Rundown';
                }
            } else if (userRole === 'amitrace_admin') {
                if (titleElement) titleElement.textContent = '📝 No Rundowns in System';
                if (messageElement) messageElement.textContent = 'No teachers have created rundowns yet. Create a sample rundown or encourage teachers to start planning their podcast episodes.';
                if (buttonElement) {
                    buttonElement.style.display = 'block';
                    buttonElement.textContent = 'Create Sample Rundown';
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not update no-rundowns message:', error.message);
        }
    }
    
    renderRundowns() {
        const grid = document.getElementById('rundownsGrid');
        if (!grid) return;
        
        grid.innerHTML = this.rundowns.map(rundown => this.createRundownCard(rundown)).join('');
    }
    
    createRundownCard(rundown) {
        const statusColors = {
            draft: '#6c757d',
            in_progress: '#007cba',
            completed: '#28a745',
            archived: '#dc3545'
        };
        
        const totalDuration = RundownUtils.formatTimeString(rundown.total_duration || 0);
        const scheduledDate = rundown.scheduled_date ? 
            RundownUtils.formatDate(rundown.scheduled_date) : 'Not scheduled';
        
        return `
            <div class="rundown-card" onclick="openRundownEditor(${rundown.id})" data-rundown-id="${rundown.id}">
                <div class="rundown-card-header">
                    <div class="rundown-status" style="background-color: ${statusColors[rundown.status] || '#6c757d'}">
                        ${rundown.status.replace('_', ' ')}
                    </div>
                    <h3 class="rundown-title">${RundownUtils.sanitizeHtml(rundown.title)}</h3>
                    <div class="rundown-meta">
                        <div>Created by ${RundownUtils.sanitizeHtml(rundown.creator_name || 'Unknown')}</div>
                        <div>${scheduledDate}</div>
                        ${rundown.class_name ? `<div>Class: ${RundownUtils.sanitizeHtml(rundown.class_name)}</div>` : ''}
                    </div>
                </div>
                <div class="rundown-card-body">
                    <div class="rundown-description">
                        ${rundown.description ? RundownUtils.sanitizeHtml(rundown.description) : 'No description provided.'}
                    </div>
                    <div class="rundown-stats">
                        <div class="rundown-stat">
                            <div class="rundown-stat-value">${rundown.segment_count || 0}</div>
                            <div class="rundown-stat-label">Segments</div>
                        </div>
                        <div class="rundown-stat">
                            <div class="rundown-stat-value">${rundown.talent_count || 0}/4</div>
                            <div class="rundown-stat-label">Talent</div>
                        </div>
                        <div class="rundown-stat">
                            <div class="rundown-stat-value">${rundown.story_count || 0}</div>
                            <div class="rundown-stat-label">Stories</div>
                        </div>
                        <div class="rundown-stat">
                            <div class="rundown-stat-value">${totalDuration}</div>
                            <div class="rundown-stat-label">Duration</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadUserClasses() {
        try {
            const classes = await RundownUtils.apiRequest('/classes');
            const classSelect = document.getElementById('rundownClass');
            
            if (classSelect && classes.length > 0) {
                classSelect.innerHTML = '<option value="">Select class...</option>' +
                    classes.map(cls => `<option value="${cls.id}">${RundownUtils.sanitizeHtml(cls.class_name)}</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading classes:', error);
        }
    }
    
    async createRundown() {
        const form = document.getElementById('createRundownForm');
        const errors = RundownUtils.validateForm(form);
        
        if (errors.length > 0) {
            RundownUtils.showError(errors.join(', '));
            return;
        }
        
        try {
            const formData = RundownUtils.getFormData(form);
            const rundown = await RundownUtils.apiRequest('/rundowns', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            RundownUtils.showSuccess('Rundown created successfully!');
            this.hideAllModals();
            
            // Add to local array and re-render
            this.rundowns.unshift(rundown);
            this.renderRundowns();
            
            // Auto-open editor for new rundown
            setTimeout(() => openRundownEditor(rundown.id), 500);
            
        } catch (error) {
            console.error('Error creating rundown:', error);
            RundownUtils.showError('Failed to create rundown: ' + error.message);
        }
    }
    
    async deleteRundown(rundownId) {
        if (!confirm('Are you sure you want to delete this rundown? This action cannot be undone.')) {
            return;
        }
        
        try {
            await RundownUtils.apiRequest(`/rundowns/${rundownId}`, {
                method: 'DELETE'
            });
            
            RundownUtils.showSuccess('Rundown deleted successfully!');
            
            // Remove from local array and re-render
            this.rundowns = this.rundowns.filter(r => r.id !== rundownId);
            this.renderRundowns();
            
            if (this.rundowns.length === 0) {
                document.getElementById('noRundowns').style.display = 'block';
                document.getElementById('rundownsGrid').style.display = 'none';
            }
            
        } catch (error) {
            console.error('Error deleting rundown:', error);
            RundownUtils.showError('Failed to delete rundown: ' + error.message);
        }
    }
    
    filterRundowns() {
        const searchTerm = document.getElementById('rundownSearch').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        
        const cards = document.querySelectorAll('.rundown-card');
        let visibleCount = 0;
        
        cards.forEach(card => {
            const rundownId = parseInt(card.dataset.rundownId);
            const rundown = this.rundowns.find(r => r.id === rundownId);
            
            if (!rundown) return;
            
            const matchesSearch = !searchTerm || 
                rundown.title.toLowerCase().includes(searchTerm) ||
                (rundown.description && rundown.description.toLowerCase().includes(searchTerm)) ||
                (rundown.creator_name && rundown.creator_name.toLowerCase().includes(searchTerm));
            
            const matchesStatus = !statusFilter || rundown.status === statusFilter;
            
            if (matchesSearch && matchesStatus) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Show/hide no results message
        const grid = document.getElementById('rundownsGrid');
        const noRundowns = document.getElementById('noRundowns');
        
        if (visibleCount === 0) {
            grid.style.display = 'none';
            noRundowns.style.display = 'block';
            noRundowns.querySelector('h3').textContent = '🔍 No Matching Rundowns';
            noRundowns.querySelector('p').textContent = 'Try adjusting your search or filter criteria.';
        } else {
            grid.style.display = 'grid';
            noRundowns.style.display = 'none';
        }
    }
    
    hideAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = '';
    }
    
    // Auto-save functionality for editor
    startAutoSave(rundownId) {
        this.stopAutoSave();
        
        this.autoSaveInterval = setInterval(async () => {
            if (this.currentRundown && this.currentRundown.id === rundownId) {
                try {
                    await this.saveRundownChanges();
                } catch (error) {
                    console.error('Auto-save failed:', error);
                }
            }
        }, 30000); // Auto-save every 30 seconds
    }
    
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
    
    async saveRundownChanges() {
        if (!this.currentRundown) return;
        
        try {
            // Save any pending changes here
            console.log('Auto-saving rundown changes...');
        } catch (error) {
            console.error('Error auto-saving:', error);
        }
    }
}

// Global functions for HTML onclick events
function showCreateRundownModal() {
    RundownUtils.showModal('createRundownModal');
}

function hideCreateRundownModal() {
    RundownUtils.hideModal('createRundownModal');
}

function createRundown() {
    if (window.rundownsManager) {
        window.rundownsManager.createRundown();
    }
}

function filterRundowns() {
    if (window.rundownsManager) {
        // Debounced filter function
        const debouncedFilter = RundownUtils.debounce(() => {
            window.rundownsManager.filterRundowns();
        }, 300);
        debouncedFilter();
    }
}

function openRundownEditor(rundownId) {
    // This function will be implemented when we create the editor
    console.log('Opening rundown editor for ID:', rundownId);
    // For now, show a placeholder
    RundownUtils.showSuccess(`Opening rundown editor for ID ${rundownId} (Editor coming soon)`);
}

function exportRundownPDF() {
    // This function will be implemented in rundown-stories.js
    console.log('Exporting rundown as PDF...');
    RundownUtils.showSuccess('PDF export feature coming soon');
}

// Initialize manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }
    
    // Initialize rundowns manager
    window.rundownsManager = new RundownsManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.rundownsManager) {
        window.rundownsManager.stopAutoSave();
    }
});