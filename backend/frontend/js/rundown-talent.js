/**
 * VidPOD Rundown Talent Management
 * Handles talent (hosts, guests, experts) for rundowns
 */

class RundownTalent {
    constructor() {
        this.talent = [];
        this.currentRundownId = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Talent actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('.edit-talent-btn')) {
                const talentId = parseInt(e.target.dataset.talentId);
                this.editTalent(talentId);
            }
            
            if (e.target.matches('.delete-talent-btn')) {
                const talentId = parseInt(e.target.dataset.talentId);
                this.deleteTalentConfirm(talentId);
            }
        });
    }
    
    async loadTalent(rundownId) {
        this.currentRundownId = rundownId;
        
        try {
            this.talent = await RundownUtils.apiRequest(`/rundown-talent/rundown/${rundownId}`);
            this.renderTalent();
            this.updateTalentCount();
        } catch (error) {
            console.error('Error loading talent:', error);
            RundownUtils.showError('Failed to load talent: ' + error.message);
        }
    }
    
    renderTalent() {
        const container = document.getElementById('talentList');
        if (!container) return;
        
        if (this.talent.length === 0) {
            container.innerHTML = `
                <div class="no-talent">
                    <p>No talent added yet. Add hosts, guests, or experts.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.talent.map(person => this.createTalentHTML(person)).join('');
    }
    
    createTalentHTML(person) {
        const roleColors = {
            host: '#007cba',
            'co-host': '#17a2b8',
            guest: '#28a745',
            expert: '#fd7e14'
        };
        
        return `
            <div class="talent-item" data-talent-id="${person.id}">
                <div class="talent-info">
                    <div class="talent-name">${RundownUtils.sanitizeHtml(person.name)}</div>
                    <div class="talent-role" style="color: ${roleColors[person.role] || '#666'}">
                        ${person.role.replace('-', ' ')}
                    </div>
                    ${person.bio ? `<div class="talent-bio">${RundownUtils.truncateText(RundownUtils.sanitizeHtml(person.bio), 100)}</div>` : ''}
                </div>
                <div class="talent-actions">
                    <button class="btn btn-small edit-talent-btn" data-talent-id="${person.id}" title="Edit talent">
                        ✏️
                    </button>
                    <button class="btn btn-small delete-talent-btn" data-talent-id="${person.id}" title="Remove talent">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }
    
    updateTalentCount() {
        const talentCount = document.getElementById('talentCount');
        if (talentCount) {
            talentCount.textContent = `(${this.talent.length}/4)`;
        }
        
        // Update add button state
        const addButton = document.querySelector('button[onclick="showAddTalentModal()"]');
        if (addButton) {
            if (this.talent.length >= 4) {
                addButton.disabled = true;
                addButton.textContent = '+ Talent Full (4/4)';
                addButton.title = 'Maximum 4 talent members allowed';
            } else {
                addButton.disabled = false;
                addButton.textContent = '+ Add Talent';
                addButton.title = 'Add new talent member';
            }
        }
    }
    
    async addTalent() {
        const form = document.getElementById('addTalentForm');
        const errors = RundownUtils.validateForm(form);
        
        if (errors.length > 0) {
            RundownUtils.showError(errors.join(', '));
            return;
        }
        
        if (this.talent.length >= 4) {
            RundownUtils.showError('Maximum 4 talent members allowed per rundown');
            return;
        }
        
        try {
            const formData = RundownUtils.getFormData(form);
            formData.rundown_id = this.currentRundownId;
            
            const talent = await RundownUtils.apiRequest('/rundown-talent', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            RundownUtils.showSuccess('Talent added successfully!');
            RundownUtils.hideModal('addTalentModal');
            
            // Add to local array and re-render
            this.talent.push(talent);
            this.renderTalent();
            this.updateTalentCount();
            
        } catch (error) {
            console.error('Error adding talent:', error);
            RundownUtils.showError('Failed to add talent: ' + error.message);
        }
    }
    
    editTalent(talentId) {
        const person = this.talent.find(t => t.id === talentId);
        if (!person) {
            RundownUtils.showError('Talent not found');
            return;
        }
        
        // Populate edit form (reuse add form)
        this.populateTalentForm(person);
        document.querySelector('#addTalentModal h2').textContent = '✏️ Edit Talent';
        document.querySelector('#addTalentModal .btn-primary').textContent = 'Update Talent';
        document.querySelector('#addTalentModal .btn-primary').onclick = () => this.updateTalent(talentId);
        
        RundownUtils.showModal('addTalentModal');
    }
    
    populateTalentForm(person) {
        document.getElementById('talentName').value = person.name || '';
        document.getElementById('talentRole').value = person.role || '';
        document.getElementById('talentBio').value = person.bio || '';
        document.getElementById('talentNotes').value = person.notes || '';
    }
    
    async updateTalent(talentId) {
        const form = document.getElementById('addTalentForm');
        const errors = RundownUtils.validateForm(form);
        
        if (errors.length > 0) {
            RundownUtils.showError(errors.join(', '));
            return;
        }
        
        try {
            const formData = RundownUtils.getFormData(form);
            
            await RundownUtils.apiRequest(`/rundown-talent/${talentId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            
            RundownUtils.showSuccess('Talent updated successfully!');
            this.resetTalentModal();
            
            // Reload talent
            await this.loadTalent(this.currentRundownId);
            
        } catch (error) {
            console.error('Error updating talent:', error);
            RundownUtils.showError('Failed to update talent: ' + error.message);
        }
    }
    
    async deleteTalentConfirm(talentId) {
        const person = this.talent.find(t => t.id === talentId);
        if (!person) return;
        
        if (!confirm(`Are you sure you want to remove ${person.name} from this rundown?`)) {
            return;
        }
        
        try {
            await RundownUtils.apiRequest(`/rundown-talent/${talentId}`, {
                method: 'DELETE'
            });
            
            RundownUtils.showSuccess('Talent removed successfully!');
            
            // Remove from local array and re-render
            this.talent = this.talent.filter(t => t.id !== talentId);
            this.renderTalent();
            this.updateTalentCount();
            
        } catch (error) {
            console.error('Error removing talent:', error);
            RundownUtils.showError('Failed to remove talent: ' + error.message);
        }
    }
    
    resetTalentModal() {
        RundownUtils.hideModal('addTalentModal');
        
        // Reset modal to add mode
        document.querySelector('#addTalentModal h2').textContent = '👥 Add Talent';
        document.querySelector('#addTalentModal .btn-primary').textContent = 'Add Talent';
        document.querySelector('#addTalentModal .btn-primary').onclick = () => this.addTalent();
    }
    
    // Get talent names for use in segments (e.g., question templates)
    getTalentNames() {
        return this.talent.map(person => person.name);
    }
    
    // Get talent by role
    getTalentByRole(role) {
        return this.talent.filter(person => person.role === role);
    }
    
    // Insert talent name into text at cursor position
    insertTalentName(textareaId, talentName) {
        const textarea = document.getElementById(textareaId);
        if (!textarea) return;
        
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        
        const before = text.substring(0, start);
        const after = text.substring(end);
        
        textarea.value = before + `@${talentName}` + after;
        
        // Move cursor after inserted name
        const newPosition = start + talentName.length + 1;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
    }
}

// Global functions
function showAddTalentModal() {
    // Check talent limit
    if (window.rundownTalent && window.rundownTalent.talent.length >= 4) {
        RundownUtils.showError('Maximum 4 talent members allowed per rundown');
        return;
    }
    
    RundownUtils.showModal('addTalentModal');
}

function hideAddTalentModal() {
    if (window.rundownTalent) {
        window.rundownTalent.resetTalentModal();
    } else {
        RundownUtils.hideModal('addTalentModal');
    }
}

function addTalent() {
    if (window.rundownTalent) {
        window.rundownTalent.addTalent();
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.rundownTalent = new RundownTalent();
});