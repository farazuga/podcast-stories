/**
 * VidPOD Rundown Talent Management
 * Handles talent (hosts, guests, experts) for rundowns
 * Based on prototype v4-8 with host/guest separation and @tagging system
 */

class RundownTalent {
    constructor() {
        this.hosts = [];
        this.guests = [];
        this.currentRundownId = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupTagPanel();
    }
    
    setupEventListeners() {
        // Add host button
        document.addEventListener('click', (e) => {
            if (e.target.matches('#addHostBtn')) {
                e.preventDefault();
                this.addTalentSlot('host');
            }
            
            if (e.target.matches('#addGuestBtn')) {
                e.preventDefault();
                this.addTalentSlot('guest');
            }
            
            if (e.target.matches('.talent-remove-btn')) {
                e.preventDefault();
                const index = parseInt(e.target.dataset.index);
                const type = e.target.dataset.type;
                this.removeTalent(type, index);
            }
        });

        // Handle talent input changes
        document.addEventListener('input', (e) => {
            if (e.target.matches('.talent-input')) {
                const index = parseInt(e.target.dataset.index);
                const type = e.target.dataset.type;
                this.updateTalentName(type, index, e.target.value);
            }
        });
    }

    setupTagPanel() {
        // Setup @tagging functionality for questions
        document.addEventListener('focus', (e) => {
            if (e.target.matches('textarea.qarea')) {
                this.activeQuestionInput = e.target;
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('.tag-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.toggleTagPanel(e.target);
            }
        });
    }
    
    async loadTalent(rundownId) {
        this.currentRundownId = rundownId;
        
        try {
            const talent = await RundownUtils.apiRequest(`/rundown-talent/rundown/${rundownId}`);
            
            // Separate hosts and guests based on role
            this.hosts = talent.filter(t => t.role === 'host' || t.role === 'co-host').map(t => t.name);
            this.guests = talent.filter(t => t.role === 'guest' || t.role === 'expert').map(t => t.name);
            
            this.renderTalent();
            this.updateTalentCount();
        } catch (error) {
            console.error('Error loading talent:', error);
            RundownUtils.showError('Failed to load talent: ' + error.message);
        }
    }
    
    renderTalent() {
        this.renderHosts();
        this.renderGuests();
        this.updateTalentControls();
    }

    renderHosts() {
        const hostStack = document.getElementById('hostStack');
        if (!hostStack) return;
        
        hostStack.innerHTML = '';
        this.hosts.forEach((host, index) => {
            hostStack.appendChild(this.createTalentChip(host, index, 'host'));
        });
    }

    renderGuests() {
        const guestStack = document.getElementById('guestStack');
        if (!guestStack) return;
        
        guestStack.innerHTML = '';
        this.guests.forEach((guest, index) => {
            guestStack.appendChild(this.createTalentChip(guest, index, 'guest'));
        });
    }

    createTalentChip(name, index, type) {
        const wrap = document.createElement('div');
        wrap.className = 'talent-chip';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'talent-input';
        input.placeholder = 'Full name';
        input.value = name || '';
        input.dataset.index = index;
        input.dataset.type = type;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'mini-btn talent-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove';
        removeBtn.dataset.index = index;
        removeBtn.dataset.type = type;
        
        wrap.appendChild(input);
        wrap.appendChild(removeBtn);
        
        return wrap;
    }
    
    updateTalentCount() {
        const total = this.getTotalPeople();
        const peopleCount = document.getElementById('peopleCount');
        if (peopleCount) {
            peopleCount.textContent = `${total}/4`;
        }
    }

    updateTalentControls() {
        const total = this.getTotalPeople();
        const atMax = total >= 4;
        
        const addHostBtn = document.getElementById('addHostBtn');
        const addGuestBtn = document.getElementById('addGuestBtn');
        
        if (addHostBtn) {
            addHostBtn.disabled = atMax;
            addHostBtn.title = atMax ? 'Max 4 people total' : 'Add host';
        }
        
        if (addGuestBtn) {
            addGuestBtn.disabled = atMax;
            addGuestBtn.title = atMax ? 'Max 4 people total' : 'Add guest';
        }
    }

    getTotalPeople() {
        return this.hosts.length + this.guests.length;
    }
    
    addTalentSlot(type) {
        if (this.getTotalPeople() >= 4) {
            RundownUtils.showError('Maximum 4 people total');
            return;
        }
        
        if (type === 'host') {
            this.hosts.push('');
        } else if (type === 'guest') {
            this.guests.push('');
        }
        
        this.renderTalent();
        this.saveTalent();
    }

    removeTalent(type, index) {
        if (type === 'host' && index < this.hosts.length) {
            this.hosts.splice(index, 1);
        } else if (type === 'guest' && index < this.guests.length) {
            this.guests.splice(index, 1);
        }
        
        this.renderTalent();
        this.saveTalent();
    }

    updateTalentName(type, index, value) {
        if (type === 'host' && index < this.hosts.length) {
            this.hosts[index] = value;
        } else if (type === 'guest' && index < this.guests.length) {
            this.guests[index] = value;
        }
        
        // Debounce save
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveTalent(), 500);
    }
    
    async saveTalent() {
        if (!this.currentRundownId) return;
        
        try {
            // Clear existing talent for this rundown
            const existingTalent = await RundownUtils.apiRequest(`/rundown-talent/rundown/${this.currentRundownId}`);
            
            // Delete existing talent
            for (const person of existingTalent) {
                await RundownUtils.apiRequest(`/rundown-talent/${person.id}`, {
                    method: 'DELETE'
                });
            }
            
            // Add hosts
            for (const hostName of this.hosts) {
                if (hostName.trim()) {
                    await RundownUtils.apiRequest('/rundown-talent', {
                        method: 'POST',
                        body: JSON.stringify({
                            rundown_id: this.currentRundownId,
                            name: hostName.trim(),
                            role: 'host'
                        })
                    });
                }
            }
            
            // Add guests
            for (const guestName of this.guests) {
                if (guestName.trim()) {
                    await RundownUtils.apiRequest('/rundown-talent', {
                        method: 'POST',
                        body: JSON.stringify({
                            rundown_id: this.currentRundownId,
                            name: guestName.trim(),
                            role: 'guest'
                        })
                    });
                }
            }
            
        } catch (error) {
            console.error('Error saving talent:', error);
        }
    }
    
    // @tagging system for questions
    toggleTagPanel(button) {
        const tagPanel = button.parentElement.querySelector('.tag-panel');
        if (!tagPanel) return;
        
        this.rebuildTagPanel(tagPanel);
        tagPanel.style.display = tagPanel.style.display === 'block' ? 'none' : 'block';
    }
    
    rebuildTagPanel(tagPanel) {
        tagPanel.innerHTML = '';
        const hTotal = this.hosts.length;
        const gTotal = this.guests.length;
        
        if (hTotal + gTotal === 0) {
            const emptyNote = document.createElement('div');
            emptyNote.className = 'empty-note';
            emptyNote.textContent = 'No hosts or guests yet.';
            tagPanel.appendChild(emptyNote);
            return;
        }
        
        // Hosts section
        if (hTotal > 0) {
            const hostsHeader = document.createElement('h5');
            hostsHeader.textContent = 'Hosts';
            tagPanel.appendChild(hostsHeader);
            
            this.hosts.forEach(name => {
                if (name.trim()) {
                    const button = document.createElement('button');
                    button.className = 'chip-btn';
                    button.textContent = name;
                    button.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.insertAtCursor(this.activeQuestionInput, `@Host(${name})`);
                        tagPanel.style.display = 'none';
                    });
                    tagPanel.appendChild(button);
                }
            });
        }
        
        // Guests section
        if (gTotal > 0) {
            const guestsHeader = document.createElement('h5');
            guestsHeader.textContent = 'Guests';
            tagPanel.appendChild(guestsHeader);
            
            this.guests.forEach(name => {
                if (name.trim()) {
                    const button = document.createElement('button');
                    button.className = 'chip-btn';
                    button.textContent = name;
                    button.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.insertAtCursor(this.activeQuestionInput, `@Guest(${name})`);
                        tagPanel.style.display = 'none';
                    });
                    tagPanel.appendChild(button);
                }
            });
        }
    }
    
    insertAtCursor(input, text) {
        if (!input) return;
        
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        const before = input.value.slice(0, start);
        const after = input.value.slice(end);
        
        input.value = before + text + after;
        
        const newPosition = start + text.length;
        input.setSelectionRange(newPosition, newPosition);
        input.dispatchEvent(new Event('input', {bubbles: true}));
        input.focus();
    }
    
    // Get all talent names for use in other components
    getAllTalentNames() {
        return [...this.hosts.filter(h => h.trim()), ...this.guests.filter(g => g.trim())];
    }
    
    // Get hosts specifically
    getHosts() {
        return this.hosts.filter(h => h.trim());
    }
    
    // Get guests specifically
    getGuests() {
        return this.guests.filter(g => g.trim());
    }
    
}

// Close tag panels when clicking elsewhere
document.addEventListener('click', (e) => {
    if (!e.target.closest('.tag-panel') && !e.target.matches('.tag-btn')) {
        document.querySelectorAll('.tag-panel').forEach(panel => {
            panel.style.display = 'none';
        });
    }
});

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.rundownTalent = new RundownTalent();
});