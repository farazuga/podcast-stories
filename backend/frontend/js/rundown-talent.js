// VidPOD Rundown Talent Manager
// Handles hosts and guests management with 4-person limit

class RundownTalent {
  constructor() {
    this.talent = { hosts: [], guests: [] };
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Add talent buttons
    document.getElementById('addHostBtn').addEventListener('click', () => {
      this.showAddTalentPrompt('host');
    });
    
    document.getElementById('addGuestBtn').addEventListener('click', () => {
      this.showAddTalentPrompt('guest');
    });
  }
  
  loadTalent(talent) {
    this.talent = talent || { hosts: [], guests: [] };
    this.render();
  }
  
  render() {
    this.renderHosts();
    this.renderGuests();
    this.updateCounts();
    this.updateAddButtons();
  }
  
  renderHosts() {
    const container = document.getElementById('hostsList');
    container.innerHTML = '';
    
    this.talent.hosts.forEach(host => {
      const chip = this.createTalentChip(host);
      container.appendChild(chip);
    });
  }
  
  renderGuests() {
    const container = document.getElementById('guestsList');
    container.innerHTML = '';
    
    this.talent.guests.forEach(guest => {
      const chip = this.createTalentChip(guest);
      container.appendChild(chip);
    });
  }
  
  createTalentChip(talent) {
    const chip = document.createElement('div');
    chip.className = 'talent-chip';
    chip.innerHTML = `
      <span>${this.escapeHtml(talent.name)}</span>
      <button class="remove-btn" onclick="rundownTalent.removeTalent('${talent.role}', '${talent.id}')" title="Remove ${talent.name}">×</button>
    `;
    return chip;
  }
  
  updateCounts() {
    document.getElementById('hostCount').textContent = this.talent.hosts.length;
    document.getElementById('guestCount').textContent = this.talent.guests.length;
    
    const total = this.talent.hosts.length + this.talent.guests.length;
    document.getElementById('totalTalent').textContent = total;
    
    const limitElement = document.querySelector('.talent-limit');
    limitElement.classList.toggle('at-limit', total >= 4);
  }
  
  updateAddButtons() {
    const total = this.talent.hosts.length + this.talent.guests.length;
    const atLimit = total >= 4;
    
    const addHostBtn = document.getElementById('addHostBtn');
    const addGuestBtn = document.getElementById('addGuestBtn');
    
    addHostBtn.disabled = atLimit;
    addGuestBtn.disabled = atLimit;
    
    if (atLimit) {
      addHostBtn.textContent = '✓ Full';
      addGuestBtn.textContent = '✓ Full';
    } else {
      addHostBtn.textContent = '+ Add Host';
      addGuestBtn.textContent = '+ Add Guest';
    }
  }
  
  showAddTalentPrompt(role) {
    const total = this.talent.hosts.length + this.talent.guests.length;
    if (total >= 4) {
      RundownUtils.showNotification('Maximum of 4 hosts and guests allowed', 'warning');
      return;
    }
    
    const name = prompt(`Enter ${role} name:`);
    if (name && name.trim()) {
      this.addTalent(role, name.trim());
    }
  }
  
  async addTalent(role, name) {
    try {
      const rundown = window.rundownManager?.getCurrentRundown();
      if (!rundown) {
        throw new Error('No rundown selected');
      }
      
      // Check for duplicates locally
      const existing = [...this.talent.hosts, ...this.talent.guests].find(t => 
        t.name.toLowerCase() === name.toLowerCase()
      );
      
      if (existing) {
        RundownUtils.showNotification('A person with this name already exists', 'error');
        return;
      }
      
      const newTalent = await RundownUtils.apiCall(`/api/rundown-talent/rundown/${rundown.id}`, {
        method: 'POST',
        body: JSON.stringify({ name, role })
      });
      
      this.talent[role === 'host' ? 'hosts' : 'guests'].push(newTalent);
      this.render();
      this.updateRundownManager();
      
      RundownUtils.showNotification(`${role.charAt(0).toUpperCase() + role.slice(1)} added successfully`, 'success');
      
    } catch (error) {
      console.error('Failed to add talent:', error);
      
      if (error.message.includes('limit_reached')) {
        RundownUtils.showNotification('Maximum of 4 hosts and guests allowed', 'error');
      } else {
        RundownUtils.showNotification(error.message || 'Failed to add talent', 'error');
      }
    }
  }
  
  async removeTalent(role, talentId) {
    const talentArray = this.talent[role === 'host' ? 'hosts' : 'guests'];
    const talent = talentArray.find(t => t.id == talentId);
    
    if (!talent) return;
    
    if (!confirm(`Remove ${talent.name}?`)) return;
    
    try {
      await RundownUtils.apiCall(`/api/rundown-talent/${talentId}`, {
        method: 'DELETE'
      });
      
      // Remove from local array
      const index = talentArray.findIndex(t => t.id == talentId);
      if (index !== -1) {
        talentArray.splice(index, 1);
      }
      
      this.render();
      this.updateRundownManager();
      
      RundownUtils.showNotification(`${talent.name} removed successfully`, 'success');
      
    } catch (error) {
      console.error('Failed to remove talent:', error);
      RundownUtils.showNotification('Failed to remove talent', 'error');
    }
  }
  
  showTagPanel(event) {
    const button = event.target;
    const panel = document.getElementById('talentTagPanel');
    
    // Position panel near button
    const rect = button.getBoundingClientRect();
    panel.style.position = 'absolute';
    panel.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    panel.style.left = (rect.left + window.scrollX) + 'px';
    
    // Populate talent options
    this.populateTagPanel();
    
    // Show panel
    panel.style.display = 'block';
    
    // Store reference to textarea for insertion
    this.targetTextarea = button.closest('.question-item')?.querySelector('.question-input');
    
    // Close panel when clicking outside
    const closePanel = (e) => {
      if (!panel.contains(e.target) && e.target !== button) {
        panel.style.display = 'none';
        document.removeEventListener('click', closePanel);
      }
    };
    
    setTimeout(() => document.addEventListener('click', closePanel), 0);
    
    // Close button
    panel.querySelector('.panel-close').onclick = () => {
      panel.style.display = 'none';
      document.removeEventListener('click', closePanel);
    };
  }
  
  populateTagPanel() {
    const container = document.getElementById('availableTalent');
    container.innerHTML = '';
    
    if (this.talent.hosts.length === 0 && this.talent.guests.length === 0) {
      container.innerHTML = '<div class="talent-tag-item">No hosts or guests added yet</div>';
      return;
    }
    
    // Add hosts
    this.talent.hosts.forEach(host => {
      const item = document.createElement('div');
      item.className = 'talent-tag-item';
      item.textContent = `@Host(${host.name})`;
      item.onclick = () => this.insertTalentTag(`@Host(${host.name})`);
      container.appendChild(item);
    });
    
    // Add guests
    this.talent.guests.forEach(guest => {
      const item = document.createElement('div');
      item.className = 'talent-tag-item';
      item.textContent = `@Guest(${guest.name})`;
      item.onclick = () => this.insertTalentTag(`@Guest(${guest.name})`);
      container.appendChild(item);
    });
  }
  
  insertTalentTag(tag) {
    if (!this.targetTextarea) return;
    
    const textarea = this.targetTextarea;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const textBefore = textarea.value.substring(0, startPos);
    const textAfter = textarea.value.substring(endPos);
    
    // Insert tag at cursor position
    textarea.value = textBefore + tag + textAfter;
    
    // Move cursor after inserted tag
    const newPos = startPos + tag.length;
    textarea.setSelectionRange(newPos, newPos);
    textarea.focus();
    
    // Hide panel
    document.getElementById('talentTagPanel').style.display = 'none';
    
    // Trigger resize if auto-resize is setup
    if (textarea.dispatchEvent) {
      textarea.dispatchEvent(new Event('input'));
    }
  }
  
  updateRundownManager() {
    if (window.rundownManager) {
      window.rundownManager.updateTalent(this.talent);
    }
  }
  
  escapeHtml(text) {
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
  window.rundownTalent = new RundownTalent();
  window.RundownTalent = window.rundownTalent;
});