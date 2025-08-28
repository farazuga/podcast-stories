// VidPOD Rundown Segments Manager
// Handles segment CRUD operations and drag-and-drop

class RundownSegments {
  constructor() {
    this.segments = [];
    this.selectedSegmentId = null;
    this.currentEditingSegment = null;
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.setupDragAndDrop();
    this.setupKeyboardNavigation();
  }
  
  setupEventListeners() {
    // Segment form submission
    document.getElementById('segmentForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSegment();
    });
    
    // Add question button
    document.getElementById('addQuestionBtn').addEventListener('click', () => {
      this.addQuestion();
    });
    
    // Time input formatting
    document.getElementById('segmentDuration').addEventListener('input', (e) => {
      const value = RundownUtils.formatTimeInput(e.target.value);
      e.target.value = value;
    });
    
    // Auto-resize textareas
    ['segmentIntro', 'segmentClose', 'segmentNotes'].forEach(id => {
      const textarea = document.getElementById(id);
      if (textarea) {
        RundownUtils.autoResizeTextarea(textarea);
      }
    });
  }
  
  setupDragAndDrop() {
    const segmentsList = document.getElementById('segmentsList');
    
    RundownUtils.setupDragAndDrop(segmentsList, {
      draggableSelector: '.segment-card',
      handleSelector: '.segment-drag-handle',
      dropCallback: (element, oldIndex, newIndex) => {
        this.reorderSegments(oldIndex, newIndex);
      }
    });
  }
  
  setupKeyboardNavigation() {
    const segmentsList = document.getElementById('segmentsList');
    
    this.keyboardNav = RundownUtils.setupKeyboardNavigation(segmentsList, {
      itemSelector: '.segment-card',
      onSelect: (element, index) => {
        this.selectSegment(element.dataset.segmentId);
      },
      onActivate: (element, index) => {
        this.toggleSegmentExpanded(element.dataset.segmentId);
      }
    });
    
    // Additional keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch (e.code) {
        case 'KeyT':
          if (e.ctrlKey) {
            e.preventDefault();
            if (this.selectedSegmentId) {
              this.toggleSegmentExpanded(this.selectedSegmentId);
            }
          }
          break;
      }
    });
  }
  
  loadSegments(segments) {
    this.segments = segments || [];
    this.render();
  }
  
  render() {
    const container = document.getElementById('segmentsList');
    container.innerHTML = '';
    
    if (this.segments.length === 0) {
      container.innerHTML = `
        <div class="no-segments">
          <p>No segments yet. Click "Add Segment" to get started.</p>
        </div>
      `;
      return;
    }
    
    // Sort segments by sort_order
    const sortedSegments = [...this.segments].sort((a, b) => a.sort_order - b.sort_order);
    
    sortedSegments.forEach((segment, index) => {
      const segmentElement = this.createSegmentElement(segment, index);
      container.appendChild(segmentElement);
    });
  }
  
  createSegmentElement(segment, index) {
    const card = document.createElement('div');
    card.className = `segment-card ${segment.is_expanded ? 'expanded' : ''} ${segment.is_pinned ? 'pinned' : ''}`;
    card.dataset.segmentId = segment.id;
    card.draggable = !segment.is_pinned;
    card.tabIndex = 0;
    
    const content = segment.content || {};
    const questions = Array.isArray(content.questions) ? content.questions : [''];
    
    card.innerHTML = `
      <div class="segment-header" onclick="rundownSegments.toggleSegmentExpanded('${segment.id}')">
        <span class="segment-expand-icon">▸</span>
        <div class="segment-info">
          <div class="segment-title">${this.escapeHtml(segment.title)}</div>
          <div class="segment-duration">${RundownUtils.formatTimeString(segment.duration)}</div>
        </div>
        <div class="segment-status">
          <div class="segment-status-pill ${segment.status.toLowerCase().replace(' ', '-')}">
            ${segment.status}
          </div>
          <div class="segment-status-arrows">
            <button onclick="event.stopPropagation(); rundownSegments.cycleStatus('${segment.id}', -1)" title="Previous status">‹</button>
            <button onclick="event.stopPropagation(); rundownSegments.cycleStatus('${segment.id}', 1)" title="Next status">›</button>
          </div>
        </div>
        <div class="segment-actions">
          <button onclick="event.stopPropagation(); rundownSegments.editSegment('${segment.id}')" class="btn btn-small">Edit</button>
          <button onclick="event.stopPropagation(); rundownSegments.duplicateSegment('${segment.id}')" class="btn btn-small">Duplicate</button>
          ${!segment.is_pinned ? `<button onclick="event.stopPropagation(); rundownSegments.deleteSegment('${segment.id}')" class="btn btn-small btn-danger">Delete</button>` : ''}
          <div class="segment-drag-handle" ${segment.is_pinned ? 'style="cursor: not-allowed;"' : ''}>⋮⋮</div>
        </div>
      </div>
      
      <div class="segment-body">
        <div class="form-group">
          <label>Segment Intro</label>
          <div>${this.escapeHtml(content.intro || '')}</div>
        </div>
        
        <div class="form-group">
          <label>Questions</label>
          <div class="questions-preview">
            ${questions.filter(q => q && q.trim()).map(q => `<div>• ${this.escapeHtml(q)}</div>`).join('') || '<div><em>No questions added</em></div>'}
          </div>
        </div>
        
        <div class="form-group">
          <label>Topic Close</label>
          <div>${this.escapeHtml(content.close || '')}</div>
        </div>
        
        <div class="form-group">
          <label>Production Notes</label>
          <div>${this.escapeHtml(content.notes || '')}</div>
        </div>
      </div>
    `;
    
    // Add insert segment below when selected
    if (this.selectedSegmentId === segment.id && !segment.is_pinned && segment.segment_type !== 'outro') {
      const insertBelow = document.createElement('div');
      insertBelow.className = 'add-segment-below';
      insertBelow.innerHTML = '+ Add Segment Below';
      insertBelow.onclick = () => this.showModal(null, segment.id);
      card.appendChild(insertBelow);
    }
    
    return card;
  }
  
  selectSegment(segmentId) {
    // Remove previous selection
    document.querySelectorAll('.segment-card').forEach(card => {
      card.classList.remove('selected');
    });
    
    this.selectedSegmentId = segmentId;
    
    // Add new selection
    const selectedCard = document.querySelector(`.segment-card[data-segment-id="${segmentId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('selected');
    }
    
    // Re-render to show/hide insert options
    this.render();
  }
  
  toggleSegmentExpanded(segmentId) {
    const segment = this.segments.find(s => s.id == segmentId);
    if (!segment) return;
    
    segment.is_expanded = !segment.is_expanded;
    this.updateSegmentInAPI(segment, { is_expanded: segment.is_expanded });
    
    const card = document.querySelector(`.segment-card[data-segment-id="${segmentId}"]`);
    if (card) {
      card.classList.toggle('expanded', segment.is_expanded);
    }
  }
  
  expandAll() {
    this.segments.forEach(segment => {
      segment.is_expanded = true;
      this.updateSegmentInAPI(segment, { is_expanded: true });
    });
    this.render();
  }
  
  collapseAll() {
    this.segments.forEach(segment => {
      segment.is_expanded = false;
      this.updateSegmentInAPI(segment, { is_expanded: false });
    });
    this.render();
  }
  
  async cycleStatus(segmentId, direction) {
    const segment = this.segments.find(s => s.id == segmentId);
    if (!segment) return;
    
    const newStatus = direction > 0 
      ? RundownUtils.getNextStatus(segment.status)
      : RundownUtils.getPrevStatus(segment.status);
    
    segment.status = newStatus;
    
    try {
      await this.updateSegmentInAPI(segment, { status: newStatus });
      this.render();
    } catch (error) {
      console.error('Failed to update segment status:', error);
      RundownUtils.showNotification('Failed to update status', 'error');
    }
  }
  
  showModal(segmentData = null, insertAfter = null) {
    this.currentEditingSegment = segmentData;
    
    // Reset form
    document.getElementById('segmentForm').reset();
    document.getElementById('segmentId').value = segmentData ? segmentData.id : '';
    
    if (segmentData) {
      // Editing existing segment
      document.getElementById('segmentModalTitle').textContent = 'Edit Segment';
      document.getElementById('segmentTitle').value = segmentData.title || '';
      document.getElementById('segmentDuration').value = RundownUtils.formatTimeString(segmentData.duration || 60);
      document.getElementById('segmentStatus').value = segmentData.status || 'Draft';
      
      const content = segmentData.content || {};
      document.getElementById('segmentIntro').value = content.intro || '';
      document.getElementById('segmentClose').value = content.close || '';
      document.getElementById('segmentNotes').value = content.notes || '';
      
      // Load questions
      this.loadQuestions(content.questions || ['']);
      
    } else {
      // Creating new segment
      document.getElementById('segmentModalTitle').textContent = 'Add New Segment';
      document.getElementById('segmentDuration').value = '05:00';
      document.getElementById('segmentStatus').value = 'Draft';
      
      // Store insert position
      this.insertAfterSegmentId = insertAfter;
      
      // Load single empty question
      this.loadQuestions(['']);
    }
    
    RundownUtils.showModal('segmentModal');
    
    // Focus title field
    document.getElementById('segmentTitle').focus();
  }
  
  loadQuestions(questions) {
    const container = document.getElementById('questionsList');
    container.innerHTML = '';
    
    questions.forEach((question, index) => {
      this.addQuestionToForm(question, index);
    });
    
    if (questions.length === 0) {
      this.addQuestionToForm('', 0);
    }
  }
  
  addQuestion() {
    const container = document.getElementById('questionsList');
    const index = container.children.length;
    this.addQuestionToForm('', index);
  }
  
  addQuestionToForm(questionText = '', index = 0) {
    const container = document.getElementById('questionsList');
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.innerHTML = `
      <textarea class="question-input" placeholder="Enter question..." rows="1">${this.escapeHtml(questionText)}</textarea>
      <div class="question-actions">
        <button type="button" onclick="rundownSegments.moveQuestion(${index}, -1)" title="Move up">↑</button>
        <button type="button" onclick="rundownSegments.moveQuestion(${index}, 1)" title="Move down">↓</button>
        <button type="button" onclick="rundownSegments.removeQuestion(${index})" title="Remove">×</button>
        <button type="button" class="talent-tag-btn" onclick="rundownSegments.showTalentTagPanel(event)" title="Insert talent tag">@</button>
      </div>
    `;
    
    container.appendChild(questionDiv);
    
    // Auto-resize the textarea
    const textarea = questionDiv.querySelector('.question-input');
    RundownUtils.autoResizeTextarea(textarea);
  }
  
  moveQuestion(index, direction) {
    const container = document.getElementById('questionsList');
    const questions = Array.from(container.children);
    
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;
    
    const question = questions[index];
    const target = questions[newIndex];
    
    if (direction > 0) {
      container.insertBefore(question, target.nextSibling);
    } else {
      container.insertBefore(question, target);
    }
    
    // Update indices
    this.updateQuestionIndices();
  }
  
  removeQuestion(index) {
    const container = document.getElementById('questionsList');
    const question = container.children[index];
    
    if (container.children.length > 1) {
      container.removeChild(question);
      this.updateQuestionIndices();
    }
  }
  
  updateQuestionIndices() {
    const container = document.getElementById('questionsList');
    Array.from(container.children).forEach((question, index) => {
      const buttons = question.querySelectorAll('button[onclick*="moveQuestion"], button[onclick*="removeQuestion"]');
      buttons.forEach(btn => {
        btn.onclick = null;
        if (btn.title === 'Move up') {
          btn.onclick = () => this.moveQuestion(index, -1);
        } else if (btn.title === 'Move down') {
          btn.onclick = () => this.moveQuestion(index, 1);
        } else if (btn.title === 'Remove') {
          btn.onclick = () => this.removeQuestion(index);
        }
      });
    });
  }
  
  showTalentTagPanel(event) {
    // This will be handled by the talent manager
    if (window.rundownTalent) {
      window.rundownTalent.showTagPanel(event);
    }
  }
  
  async saveSegment() {
    try {
      const formData = this.collectFormData();
      
      if (!formData.title) {
        RundownUtils.showNotification('Segment title is required', 'error');
        return;
      }
      
      if (this.currentEditingSegment) {
        // Update existing segment
        await this.updateSegment(this.currentEditingSegment.id, formData);
      } else {
        // Create new segment
        await this.createSegment(formData);
      }
      
      RundownUtils.hideModal('segmentModal');
      
    } catch (error) {
      console.error('Failed to save segment:', error);
      RundownUtils.showNotification(error.message || 'Failed to save segment', 'error');
    }
  }
  
  collectFormData() {
    const questions = [];
    document.querySelectorAll('.question-input').forEach(input => {
      if (input.value.trim()) {
        questions.push(input.value.trim());
      }
    });
    
    return {
      title: document.getElementById('segmentTitle').value.trim(),
      duration: RundownUtils.parseTimeString(document.getElementById('segmentDuration').value),
      status: document.getElementById('segmentStatus').value,
      content: {
        intro: document.getElementById('segmentIntro').value.trim(),
        questions: questions,
        close: document.getElementById('segmentClose').value.trim(),
        notes: document.getElementById('segmentNotes').value.trim()
      }
    };
  }
  
  async createSegment(segmentData) {
    const rundown = window.rundownManager?.getCurrentRundown();
    if (!rundown) {
      throw new Error('No rundown selected');
    }
    
    const requestData = {
      ...segmentData,
      insert_after: this.insertAfterSegmentId || null
    };
    
    const newSegment = await RundownUtils.apiCall(`/api/rundown-segments/rundown/${rundown.id}`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
    
    this.segments.push(newSegment);
    this.render();
    this.updateRundownManager();
    
    RundownUtils.showNotification('Segment created successfully', 'success');
  }
  
  async updateSegment(segmentId, segmentData) {
    const updatedSegment = await RundownUtils.apiCall(`/api/rundown-segments/${segmentId}`, {
      method: 'PUT',
      body: JSON.stringify(segmentData)
    });
    
    const index = this.segments.findIndex(s => s.id == segmentId);
    if (index !== -1) {
      this.segments[index] = updatedSegment;
      this.render();
      this.updateRundownManager();
    }
    
    RundownUtils.showNotification('Segment updated successfully', 'success');
  }
  
  async updateSegmentInAPI(segment, updateData) {
    try {
      const updatedSegment = await RundownUtils.apiCall(`/api/rundown-segments/${segment.id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });
      
      const index = this.segments.findIndex(s => s.id == segment.id);
      if (index !== -1) {
        this.segments[index] = { ...this.segments[index], ...updatedSegment };
      }
      
    } catch (error) {
      console.error('Failed to update segment:', error);
    }
  }
  
  editSegment(segmentId) {
    const segment = this.segments.find(s => s.id == segmentId);
    if (segment) {
      this.showModal(segment);
    }
  }
  
  async duplicateSegment(segmentId) {
    try {
      const duplicatedSegment = await RundownUtils.apiCall(`/api/rundown-segments/${segmentId}/duplicate`, {
        method: 'POST'
      });
      
      this.segments.push(duplicatedSegment);
      this.render();
      this.updateRundownManager();
      
      RundownUtils.showNotification('Segment duplicated successfully', 'success');
      
    } catch (error) {
      console.error('Failed to duplicate segment:', error);
      RundownUtils.showNotification('Failed to duplicate segment', 'error');
    }
  }
  
  async deleteSegment(segmentId) {
    const segment = this.segments.find(s => s.id == segmentId);
    if (!segment || segment.is_pinned) return;
    
    if (!confirm(`Delete segment "${segment.title}"?`)) return;
    
    try {
      await RundownUtils.apiCall(`/api/rundown-segments/${segmentId}`, {
        method: 'DELETE'
      });
      
      this.segments = this.segments.filter(s => s.id != segmentId);
      this.render();
      this.updateRundownManager();
      
      RundownUtils.showNotification('Segment deleted successfully', 'success');
      
    } catch (error) {
      console.error('Failed to delete segment:', error);
      RundownUtils.showNotification('Failed to delete segment', 'error');
    }
  }
  
  async reorderSegments(oldIndex, newIndex) {
    // Create new order based on current segments
    const reorderedSegments = [...this.segments].sort((a, b) => a.sort_order - b.sort_order);
    const movedSegment = reorderedSegments.splice(oldIndex, 1)[0];
    reorderedSegments.splice(newIndex, 0, movedSegment);
    
    // Create segment ID array in new order
    const segmentIds = reorderedSegments.map(s => s.id);
    
    try {
      const rundown = window.rundownManager?.getCurrentRundown();
      if (!rundown) return;
      
      const updatedSegments = await RundownUtils.apiCall(`/api/rundown-segments/rundown/${rundown.id}/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ segmentIds })
      });
      
      this.segments = updatedSegments;
      this.render();
      this.updateRundownManager();
      
    } catch (error) {
      console.error('Failed to reorder segments:', error);
      RundownUtils.showNotification('Failed to reorder segments', 'error');
      this.render(); // Revert visual change
    }
  }
  
  updateRundownManager() {
    if (window.rundownManager) {
      window.rundownManager.updateSegments(this.segments);
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
  window.rundownSegments = new RundownSegments();
  window.RundownSegments = window.rundownSegments;
});