# VidPOD Rundown System - Technical Architecture Documentation

*Comprehensive technical reference for developers and system administrators*

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Architecture](#database-architecture)
3. [API Endpoints](#api-endpoints)
4. [Frontend Architecture](#frontend-architecture)
5. [JavaScript Modules](#javascript-modules)
6. [CSS Architecture](#css-architecture)
7. [Authentication & Authorization](#authentication--authorization)
8. [Auto-Save System](#auto-save-system)
9. [Mobile & Touch Implementation](#mobile--touch-implementation)
10. [Accessibility Implementation](#accessibility-implementation)
11. [Performance Optimization](#performance-optimization)
12. [Testing Strategy](#testing-strategy)
13. [Deployment & DevOps](#deployment--devops)
14. [Monitoring & Logging](#monitoring--logging)
15. [Troubleshooting Guide](#troubleshooting-guide)
16. [Development Guidelines](#development-guidelines)

---

## System Overview

### Architecture Stack

```
┌─────────────────────────────────────┐
│           Frontend Layer            │
├─────────────────────────────────────┤
│ HTML5 + CSS3 + Vanilla JavaScript  │
│ • Responsive Design                 │
│ • Progressive Enhancement           │
│ • WCAG 2.1 Accessibility          │
│ • Touch/Mobile Optimization        │
└─────────────────────────────────────┘
                    │
                    │ HTTPS/REST API
                    ▼
┌─────────────────────────────────────┐
│           Backend Layer             │
├─────────────────────────────────────┤
│ Node.js + Express.js Framework     │
│ • JWT Authentication               │
│ • RESTful API Design               │
│ • Middleware Pipeline               │
│ • Error Handling                    │
└─────────────────────────────────────┘
                    │
                    │ SQL Queries
                    ▼
┌─────────────────────────────────────┐
│          Database Layer             │
├─────────────────────────────────────┤
│ PostgreSQL Database                 │
│ • Relational Data Model            │
│ • ACID Compliance                   │
│ • Connection Pooling                │
│ • Migration System                  │
└─────────────────────────────────────┘
```

### Key Components

#### Backend Services
- **Express.js Server**: Main application server
- **JWT Authentication**: Secure token-based auth
- **PostgreSQL Database**: Primary data store
- **Auto-Save Service**: Real-time data persistence
- **Email Service**: Notifications and invitations

#### Frontend Components
- **Rundown Editor**: Main editing interface
- **Mobile Touch System**: Touch-optimized interactions
- **Auto-Save Client**: Client-side persistence
- **Accessibility Layer**: WCAG 2.1 compliance
- **Print System**: Production-ready output

### Design Principles

1. **Progressive Enhancement**: Works without JavaScript, enhanced with it
2. **Mobile-First**: Touch and mobile optimized from ground up
3. **Accessibility-First**: WCAG 2.1 AA compliance throughout
4. **Performance-Conscious**: Optimized for low-bandwidth connections
5. **Resilience**: Graceful degradation when services fail

---

## Database Architecture

### Core Tables

#### `rundowns` Table
```sql
CREATE TABLE rundowns (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_duration INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_template BOOLEAN DEFAULT false,
    template_name VARCHAR(255),
    notes TEXT,
    class_id INTEGER REFERENCES classes(id)
);
```

#### `rundown_segments` Table
```sql
CREATE TABLE rundown_segments (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER REFERENCES rundowns(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'story', 'interview', 'break', 'custom'
    order_index INTEGER NOT NULL,
    duration INTEGER DEFAULT 0,
    intro_text TEXT,
    main_content TEXT,
    closing_text TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `rundown_segment_questions` Table
```sql
CREATE TABLE rundown_segment_questions (
    id SERIAL PRIMARY KEY,
    segment_id INTEGER REFERENCES rundown_segments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `rundown_talent` Table
```sql
CREATE TABLE rundown_talent (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER REFERENCES rundowns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL, -- 'host', 'co-host', 'guest', 'expert'
    bio TEXT,
    contact_info JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `rundown_stories` Table
```sql
CREATE TABLE rundown_stories (
    id SERIAL PRIMARY KEY,
    rundown_id INTEGER REFERENCES rundowns(id) ON DELETE CASCADE,
    story_id INTEGER REFERENCES story_ideas(id),
    segment_id INTEGER REFERENCES rundown_segments(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Database Relationships

```
rundowns (1) → (n) rundown_segments
rundowns (1) → (n) rundown_talent  
rundowns (1) → (n) rundown_stories
rundown_segments (1) → (n) rundown_segment_questions
rundown_stories (n) → (1) story_ideas
rundowns (n) → (1) users (created_by)
rundowns (n) → (1) classes
```

### Indexes and Performance

#### Performance Indexes
```sql
-- Query optimization
CREATE INDEX idx_rundowns_created_by ON rundowns(created_by);
CREATE INDEX idx_rundowns_class_id ON rundowns(class_id);
CREATE INDEX idx_rundown_segments_rundown_id ON rundown_segments(rundown_id);
CREATE INDEX idx_rundown_segments_order ON rundown_segments(rundown_id, order_index);
CREATE INDEX idx_rundown_talent_rundown_id ON rundown_talent(rundown_id);
CREATE INDEX idx_rundown_stories_rundown_id ON rundown_stories(rundown_id);
CREATE INDEX idx_segment_questions_segment_id ON rundown_segment_questions(segment_id);
CREATE INDEX idx_segment_questions_order ON rundown_segment_questions(segment_id, order_index);
```

#### Triggers for Maintenance
```sql
-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rundowns_updated_at BEFORE UPDATE ON rundowns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_segments_updated_at BEFORE UPDATE ON rundown_segments  
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## API Endpoints

### Authentication Required

All rundown endpoints require valid JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Rundown Management

#### `GET /api/rundowns`
Retrieve user's rundowns with filtering and pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20)
- `status`: Filter by status ('draft', 'ready', 'published')
- `class_id`: Filter by class ID
- `search`: Search in title/description

**Response:**
```json
{
  "rundowns": [
    {
      "id": 1,
      "title": "Weekly News Episode #42",
      "description": "Current events and analysis",
      "target_duration": 1800,
      "status": "draft",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T14:30:00Z",
      "segment_count": 5,
      "total_duration": 1650
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3
  }
}
```

#### `POST /api/rundowns`
Create a new rundown.

**Request Body:**
```json
{
  "title": "New Episode",
  "description": "Episode description",
  "target_duration": 1800,
  "class_id": 5
}
```

**Response:**
```json
{
  "id": 123,
  "title": "New Episode",
  "status": "draft",
  "created_at": "2024-01-15T10:00:00Z"
}
```

#### `GET /api/rundowns/:id`
Retrieve complete rundown with all segments, talent, and linked stories.

**Response:**
```json
{
  "id": 1,
  "title": "Weekly News Episode #42", 
  "description": "Current events and analysis",
  "target_duration": 1800,
  "status": "draft",
  "notes": "Remember to check audio levels",
  "segments": [
    {
      "id": 1,
      "title": "Opening",
      "type": "intro",
      "order_index": 0,
      "duration": 60,
      "intro_text": "Welcome to the show...",
      "status": "ready",
      "questions": []
    }
  ],
  "talent": [
    {
      "id": 1,
      "name": "John Doe",
      "role": "host",
      "bio": "Experienced journalist...",
      "contact_info": {
        "email": "john@example.com"
      }
    }
  ],
  "linked_stories": [
    {
      "id": 1,
      "story_id": 42,
      "story_title": "Local Election Results",
      "segment_id": 3
    }
  ]
}
```

#### `PUT /api/rundowns/:id`
Update rundown basic information.

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "target_duration": 2400,
  "status": "ready",
  "notes": "Final version notes"
}
```

#### `DELETE /api/rundowns/:id`
Delete a rundown and all associated data.

**Response:** `204 No Content`

### Segment Management

#### `POST /api/rundowns/:rundownId/segments`
Add a new segment to a rundown.

**Request Body:**
```json
{
  "title": "Interview with Expert",
  "type": "interview",
  "duration": 900,
  "order_index": 2,
  "intro_text": "Next up we have...",
  "main_content": "Discussion points...",
  "notes": "Check guest's microphone"
}
```

#### `PUT /api/rundowns/:rundownId/segments/:segmentId`
Update a segment.

**Request Body:**
```json
{
  "title": "Updated Interview Title",
  "duration": 1200,
  "status": "ready"
}
```

#### `PUT /api/rundowns/:rundownId/segments/reorder`
Reorder segments within a rundown.

**Request Body:**
```json
{
  "segment_orders": [
    {"id": 1, "order_index": 0},
    {"id": 3, "order_index": 1}, 
    {"id": 2, "order_index": 2}
  ]
}
```

#### `DELETE /api/rundowns/:rundownId/segments/:segmentId`
Remove a segment from a rundown.

**Response:** `204 No Content`

### Questions Management

#### `POST /api/segments/:segmentId/questions`
Add question to interview segment.

**Request Body:**
```json
{
  "question_text": "What inspired your research?",
  "order_index": 0
}
```

#### `PUT /api/segments/:segmentId/questions/reorder`
Reorder questions within a segment.

**Request Body:**
```json
{
  "question_orders": [
    {"id": 1, "order_index": 0},
    {"id": 3, "order_index": 1}
  ]
}
```

### Talent Management

#### `POST /api/rundowns/:rundownId/talent`
Add talent to a rundown.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "role": "guest", 
  "bio": "Expert in environmental policy",
  "contact_info": {
    "email": "jane@example.com",
    "phone": "+1-555-0123"
  },
  "notes": "Needs remote setup instructions"
}
```

#### `PUT /api/rundowns/:rundownId/talent/:talentId`
Update talent information.

#### `DELETE /api/rundowns/:rundownId/talent/:talentId`
Remove talent from rundown.

### Story Linking

#### `POST /api/rundowns/:rundownId/stories`
Link existing story to rundown.

**Request Body:**
```json
{
  "story_id": 42,
  "segment_id": 3
}
```

#### `GET /api/stories/search`
Search available stories for linking.

**Query Parameters:**
- `q`: Search query
- `limit`: Results limit (default: 20)

**Response:**
```json
{
  "stories": [
    {
      "id": 42,
      "title": "Local Election Results",
      "description": "Analysis of recent voting...",
      "created_by": "John Doe",
      "tags": ["politics", "local", "election"]
    }
  ]
}
```

### Auto-Save System

#### `POST /api/rundowns/:id/autosave`
Auto-save rundown changes.

**Request Body:**
```json
{
  "timestamp": "2024-01-15T14:30:00Z",
  "changes": {
    "title": "Updated Title",
    "segments": [
      {
        "id": 1,
        "title": "New Segment Title",
        "duration": 180
      }
    ]
  }
}
```

**Response:**
```json
{
  "status": "saved",
  "timestamp": "2024-01-15T14:30:00Z",
  "version": 15
}
```

---

## Frontend Architecture

### File Structure

```
backend/frontend/
├── rundown-editor.html          # Main editor page
├── css/
│   ├── styles.css              # Base VidPOD styles
│   ├── navigation.css          # Navigation component
│   ├── rundown.css             # Core rundown styles
│   ├── rundown-mobile.css      # Mobile responsive
│   ├── rundown-animations.css  # UI animations
│   ├── rundown-accessibility.css # A11y features
│   └── rundown-print.css       # Print styles
├── js/
│   ├── navigation.js           # Shared navigation
│   ├── include-navigation.js   # Navigation loader
│   ├── rundown-editor.js       # Main editor class
│   ├── rundown-segments.js     # Segment management
│   ├── rundown-talent.js       # Talent management
│   ├── rundown-stories.js      # Story linking
│   ├── rundown-utils.js        # Utility functions
│   ├── rundown-database-mapping.js # API interface
│   ├── rundown-auto-save.js    # Auto-save system
│   └── rundown-touch-mobile.js # Mobile/touch support
└── includes/
    └── navigation.html         # Navigation template
```

### Progressive Enhancement

#### Base HTML Structure
The editor works with JavaScript disabled, providing:
- Static form elements for all inputs
- Server-side form submission fallback
- Accessible markup structure
- Print-ready layout

#### JavaScript Enhancement Layers

**Layer 1: Core Functionality**
```javascript
// Basic editor without advanced features
class BasicRundownEditor {
    constructor(rundownId) {
        this.rundownId = rundownId;
        this.setupBasicEventListeners();
        this.loadRundownData();
    }
}
```

**Layer 2: Enhanced Interactions**
```javascript
// Add drag & drop, keyboard shortcuts
class EnhancedRundownEditor extends BasicRundownEditor {
    constructor(rundownId) {
        super(rundownId);
        this.setupDragAndDrop();
        this.setupKeyboardShortcuts();
    }
}
```

**Layer 3: Advanced Features**
```javascript
// Add auto-save, mobile touch, animations
class AdvancedRundownEditor extends EnhancedRundownEditor {
    constructor(rundownId) {
        super(rundownId);
        this.initializeAutoSave();
        this.setupMobileOptimizations();
        this.enableAnimations();
    }
}
```

### State Management

#### Editor State Object
```javascript
const editorState = {
    rundown: {
        id: null,
        title: '',
        description: '',
        target_duration: 0,
        status: 'draft',
        segments: [],
        talent: [],
        linked_stories: []
    },
    ui: {
        selectedSegmentId: null,
        expandedSegments: new Set(),
        isDirty: false,
        lastSaved: null,
        isAutoSaveEnabled: true
    },
    drag: {
        isDragging: false,
        draggedElement: null,
        dropZone: null
    }
};
```

#### State Update Pattern
```javascript
function updateState(path, value) {
    // Deep update with immutability
    const newState = deepClone(editorState);
    setNestedProperty(newState, path, value);
    
    // Trigger UI updates
    renderStateChanges(editorState, newState);
    
    // Update global state
    Object.assign(editorState, newState);
    
    // Mark as dirty for auto-save
    if (!path.startsWith('ui.')) {
        editorState.ui.isDirty = true;
    }
}
```

### Component Architecture

#### Modular JavaScript Design

Each major feature is implemented as a separate module:

```javascript
// rundown-segments.js
class RundownSegments {
    constructor(editor) {
        this.editor = editor;
        this.container = document.getElementById('segmentsList');
        this.setupEventListeners();
    }
    
    render(segments) {
        // Render segments with virtual DOM diffing
    }
    
    addSegment(type, position) {
        // Add new segment
    }
    
    updateSegment(id, data) {
        // Update existing segment
    }
}
```

#### Event-Driven Communication

```javascript
// Custom event system for module communication
class EventBus {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
}

// Usage
window.rundownEvents = new EventBus();
rundownEvents.on('segment:updated', (data) => {
    autoSave.scheduleUpdate();
    timing.recalculate();
});
```

---

## JavaScript Modules

### Core Editor Module (`rundown-editor.js`)

#### Main RundownEditor Class

```javascript
class RundownEditor {
    constructor(rundownId) {
        this.rundownId = rundownId;
        this.rundownData = null;
        this.selectedSegmentId = null;
        this.isDirty = false;
        
        // Initialize subsystems
        this.segments = new RundownSegments(this);
        this.talent = new RundownTalent(this);
        this.stories = new RundownStories(this);
        this.autoSave = new RundownAutoSave(this);
        
        // Setup mobile support if available
        if (window.isTouchDevice && window.isTouchDevice()) {
            this.touchMobile = new RundownTouchMobile(this);
        }
        
        this.init();
    }
    
    async init() {
        try {
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            await this.loadRundownData();
            this.setupRoleBasedUI();
            this.initializeAutoSave();
            
            if (this.touchMobile) {
                this.touchMobile.enableTouchOptimizations();
            }
            
            this.hideLoadingScreen();
        } catch (error) {
            this.showError(error.message);
        }
    }
    
    async loadRundownData() {
        const response = await RundownAPI.getRundown(this.rundownId);
        this.rundownData = response.data;
        this.renderAll();
    }
    
    renderAll() {
        this.renderHeader();
        this.segments.render(this.rundownData.segments);
        this.talent.render(this.rundownData.talent);
        this.stories.render(this.rundownData.linked_stories);
        this.updateTiming();
    }
}
```

### Segments Module (`rundown-segments.js`)

#### Segment Management

```javascript
class RundownSegments {
    constructor(editor) {
        this.editor = editor;
        this.container = document.getElementById('segmentsList');
        this.segments = [];
        this.setupEventListeners();
    }
    
    render(segments) {
        this.segments = segments;
        this.container.innerHTML = '';
        
        segments.forEach((segment, index) => {
            const element = this.createSegmentElement(segment, index);
            this.container.appendChild(element);
        });
        
        this.updateDropZones();
    }
    
    createSegmentElement(segment, index) {
        const element = document.createElement('div');
        element.className = 'segment-item';
        element.dataset.segmentId = segment.id;
        element.setAttribute('role', 'listitem');
        element.setAttribute('tabindex', '0');
        
        element.innerHTML = `
            <div class="segment-header" onclick="toggleSegment(${segment.id})">
                <div class="segment-title-info">
                    <span class="segment-caret">▶</span>
                    <span class="segment-drag-handle" draggable="true">≡</span>
                    <div class="segment-main-info">
                        <input type="text" class="segment-title-input focus-ring" 
                               value="${segment.title}" 
                               onchange="updateSegmentTitle(${segment.id}, this.value)"
                               aria-label="Segment title">
                        <span class="segment-type-badge segment-type-${segment.type}">
                            ${segment.type}
                        </span>
                        ${segment.is_pinned ? '<span class="segment-pin">PINNED</span>' : ''}
                    </div>
                </div>
                <div class="segment-controls">
                    <input type="text" class="segment-time-input focus-ring" 
                           value="${this.formatDuration(segment.duration)}"
                           onchange="updateSegmentDuration(${segment.id}, this.value)"
                           aria-label="Segment duration">
                    <div class="segment-status-controls">
                        <button class="status-prev-btn" onclick="changeSegmentStatus(${segment.id}, -1)"
                                aria-label="Previous status">‹</button>
                        <span class="segment-status-pill status-${segment.status}">
                            ${segment.status}
                        </span>
                        <button class="status-next-btn" onclick="changeSegmentStatus(${segment.id}, 1)"
                                aria-label="Next status">›</button>
                    </div>
                </div>
            </div>
            <div class="segment-content" id="segment-content-${segment.id}">
                ${this.renderSegmentContent(segment)}
            </div>
        `;
        
        return element;
    }
    
    renderSegmentContent(segment) {
        let content = `
            <div class="segment-field">
                <label for="intro-${segment.id}">Intro/Lead-in</label>
                <textarea id="intro-${segment.id}" class="segment-intro-input focus-ring"
                          placeholder="How will you introduce this segment?">${segment.intro_text || ''}</textarea>
            </div>
        `;
        
        if (segment.type === 'interview') {
            content += this.renderQuestionsField(segment);
        }
        
        content += `
            <div class="segment-field">
                <label for="notes-${segment.id}">Notes & Instructions</label>
                <textarea id="notes-${segment.id}" class="segment-notes-input focus-ring"
                          placeholder="Production notes, special instructions, etc.">${segment.notes || ''}</textarea>
            </div>
        `;
        
        return content;
    }
    
    renderQuestionsField(segment) {
        let questionsHtml = `
            <div class="segment-field questions-field">
                <div class="questions-header">
                    <label>Interview Questions</label>
                    <button class="add-question-btn focus-ring" 
                            onclick="addQuestion(${segment.id})"
                            aria-label="Add new question">Add Question</button>
                </div>
                <div class="questions-list" id="questions-${segment.id}">
        `;
        
        if (segment.questions && segment.questions.length > 0) {
            segment.questions.forEach((question, index) => {
                questionsHtml += `
                    <div class="question-row" data-question-id="${question.id}">
                        <textarea class="question-input focus-ring" 
                                  placeholder="Enter your question..."
                                  onchange="updateQuestion(${question.id}, this.value)"
                                  aria-label="Question ${index + 1}">${question.question_text}</textarea>
                        <div class="question-controls">
                            <button class="question-up-btn focus-ring" 
                                    onclick="moveQuestion(${question.id}, -1)"
                                    ${index === 0 ? 'disabled' : ''}
                                    aria-label="Move question up">↑</button>
                            <button class="question-down-btn focus-ring"
                                    onclick="moveQuestion(${question.id}, 1)" 
                                    ${index === segment.questions.length - 1 ? 'disabled' : ''}
                                    aria-label="Move question down">↓</button>
                            <button class="question-remove-btn focus-ring"
                                    onclick="removeQuestion(${question.id})"
                                    aria-label="Remove question">×</button>
                        </div>
                    </div>
                `;
            });
        } else {
            questionsHtml += '<p class="empty-note">No questions yet. Click "Add Question" to get started.</p>';
        }
        
        questionsHtml += `
                </div>
            </div>
        `;
        
        return questionsHtml;
    }
    
    // Drag and drop functionality
    setupDragAndDrop() {
        this.container.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.container.addEventListener('dragover', this.handleDragOver.bind(this));
        this.container.addEventListener('drop', this.handleDrop.bind(this));
        this.container.addEventListener('dragend', this.handleDragEnd.bind(this));
    }
    
    handleDragStart(e) {
        const segmentItem = e.target.closest('.segment-item');
        if (!segmentItem) return;
        
        this.draggedElement = segmentItem;
        this.draggedId = segmentItem.dataset.segmentId;
        
        segmentItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', segmentItem.outerHTML);
    }
    
    handleDragOver(e) {
        e.preventDefault();
        const segmentItem = e.target.closest('.segment-item');
        if (!segmentItem || segmentItem === this.draggedElement) return;
        
        const rect = segmentItem.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        if (e.clientY < midY) {
            this.showDropIndicator(segmentItem, 'before');
        } else {
            this.showDropIndicator(segmentItem, 'after');
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        const targetSegment = e.target.closest('.segment-item');
        if (!targetSegment || targetSegment === this.draggedElement) return;
        
        const draggedIndex = Array.from(this.container.children).indexOf(this.draggedElement);
        const targetIndex = Array.from(this.container.children).indexOf(targetSegment);
        
        this.moveSegment(this.draggedId, draggedIndex, targetIndex);
    }
    
    async moveSegment(segmentId, fromIndex, toIndex) {
        try {
            // Optimistically update UI
            this.reorderSegmentsInDOM(fromIndex, toIndex);
            
            // Update server
            const newOrder = this.calculateNewOrder();
            await RundownAPI.reorderSegments(this.editor.rundownId, newOrder);
            
            // Update local data
            this.segments = this.reorderSegmentsInData(fromIndex, toIndex);
            
            // Notify other systems
            window.rundownEvents.emit('segments:reordered', {
                segmentId,
                fromIndex,
                toIndex
            });
            
        } catch (error) {
            console.error('Failed to move segment:', error);
            // Revert UI changes
            this.render(this.segments);
            this.editor.showError('Failed to reorder segment');
        }
    }
}
```

### Auto-Save Module (`rundown-auto-save.js`)

#### Intelligent Auto-Save System

```javascript
class RundownAutoSave {
    constructor(editor) {
        this.editor = editor;
        this.saveQueue = [];
        this.saveTimer = null;
        this.saveInterval = 30000; // 30 seconds
        this.retryAttempts = 3;
        this.retryDelay = 2000; // 2 seconds
        this.isOnline = navigator.onLine;
        this.isEnabled = true;
        
        this.setupEventListeners();
        this.startAutoSaveTimer();
    }
    
    setupEventListeners() {
        // Network status monitoring
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateStatus('online');
            this.processSaveQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateStatus('offline');
        });
        
        // Form change detection
        document.addEventListener('input', this.handleInputChange.bind(this));
        document.addEventListener('change', this.handleInputChange.bind(this));
        
        // Window events
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
    
    handleInputChange(e) {
        if (!this.isEnabled) return;
        
        const target = e.target;
        if (this.isAutoSaveableField(target)) {
            this.scheduleAutoSave();
            this.markDirty();
        }
    }
    
    isAutoSaveableField(element) {
        // Check if element should trigger auto-save
        return element.matches(`
            .segment-title-input,
            .segment-time-input,
            .segment-intro-input,
            .segment-notes-input,
            .question-input,
            .rundown-title,
            .rundown-description,
            .talent-input
        `);
    }
    
    scheduleAutoSave() {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        
        this.saveTimer = setTimeout(() => {
            this.performAutoSave();
        }, this.saveInterval);
        
        this.updateStatus('unsaved');
    }
    
    async performAutoSave() {
        if (!this.editor.isDirty || !this.isOnline || !this.isEnabled) return;
        
        try {
            this.updateStatus('saving');
            
            const saveData = this.collectSaveData();
            const response = await RundownAPI.autoSave(this.editor.rundownId, saveData);
            
            if (response.success) {
                this.editor.isDirty = false;
                this.editor.lastSaved = new Date();
                this.updateStatus('saved');
                
                // Clear save queue on success
                this.saveQueue = [];
                
                setTimeout(() => {
                    this.updateStatus('idle');
                }, 2000);
                
            } else {
                throw new Error(response.error || 'Save failed');
            }
            
        } catch (error) {
            console.error('Auto-save failed:', error);
            this.handleSaveError(error);
        }
    }
    
    collectSaveData() {
        const rundownData = {
            title: document.getElementById('rundownTitle')?.textContent || '',
            description: document.getElementById('rundownDescription')?.textContent || '',
            target_duration: this.parseTargetDuration(),
            segments: this.collectSegmentData(),
            talent: this.collectTalentData(),
            notes: document.getElementById('quickNotes')?.value || '',
            timestamp: new Date().toISOString()
        };
        
        return rundownData;
    }
    
    collectSegmentData() {
        const segments = [];
        const segmentElements = document.querySelectorAll('.segment-item');
        
        segmentElements.forEach((element, index) => {
            const segmentId = element.dataset.segmentId;
            const segment = {
                id: parseInt(segmentId),
                order_index: index,
                title: element.querySelector('.segment-title-input')?.value || '',
                duration: this.parseDuration(element.querySelector('.segment-time-input')?.value || '0'),
                intro_text: element.querySelector('.segment-intro-input')?.value || '',
                notes: element.querySelector('.segment-notes-input')?.value || '',
                questions: this.collectQuestionData(segmentId)
            };
            
            segments.push(segment);
        });
        
        return segments;
    }
    
    collectQuestionData(segmentId) {
        const questions = [];
        const questionElements = document.querySelectorAll(`#questions-${segmentId} .question-row`);
        
        questionElements.forEach((element, index) => {
            const questionId = element.dataset.questionId;
            const questionText = element.querySelector('.question-input')?.value || '';
            
            if (questionText.trim()) {
                questions.push({
                    id: parseInt(questionId),
                    question_text: questionText,
                    order_index: index
                });
            }
        });
        
        return questions;
    }
    
    handleSaveError(error) {
        this.updateStatus('error');
        
        // Add to retry queue
        const saveData = this.collectSaveData();
        this.saveQueue.push({
            data: saveData,
            attempts: 0,
            timestamp: Date.now()
        });
        
        // Retry after delay
        setTimeout(() => {
            this.retryFailedSaves();
        }, this.retryDelay);
    }
    
    async retryFailedSaves() {
        if (this.saveQueue.length === 0 || !this.isOnline) return;
        
        this.updateStatus('retrying');
        
        for (let i = this.saveQueue.length - 1; i >= 0; i--) {
            const saveItem = this.saveQueue[i];
            saveItem.attempts++;
            
            try {
                const response = await RundownAPI.autoSave(this.editor.rundownId, saveItem.data);
                if (response.success) {
                    this.saveQueue.splice(i, 1);
                    this.updateStatus('saved');
                } else {
                    throw new Error(response.error || 'Retry failed');
                }
            } catch (error) {
                if (saveItem.attempts >= this.retryAttempts) {
                    this.saveQueue.splice(i, 1);
                    console.error('Max retry attempts reached:', error);
                }
            }
        }
        
        if (this.saveQueue.length > 0) {
            setTimeout(() => this.retryFailedSaves(), this.retryDelay * 2);
        }
    }
    
    updateStatus(status) {
        const indicator = document.getElementById('autoSaveIndicator');
        const statusText = document.getElementById('saveStatus');
        
        if (!indicator || !statusText) return;
        
        indicator.className = `auto-save-indicator ${status}`;
        
        const messages = {
            idle: 'Auto-save enabled',
            unsaved: 'Unsaved changes',
            saving: 'Saving...',
            saved: 'All changes saved',
            error: 'Save failed',
            retrying: 'Retrying...',
            offline: 'Offline - will save when connected',
            online: 'Back online'
        };
        
        statusText.textContent = messages[status] || status;
        
        // Show/hide indicator
        indicator.style.display = (status === 'idle') ? 'none' : 'flex';
    }
    
    // Manual save functionality
    async performManualSave() {
        const originalStatus = this.isEnabled;
        this.isEnabled = false; // Prevent auto-save during manual save
        
        try {
            this.updateStatus('saving');
            
            const saveData = this.collectSaveData();
            const response = await RundownAPI.saveRundown(this.editor.rundownId, saveData);
            
            if (response.success) {
                this.editor.isDirty = false;
                this.editor.lastSaved = new Date();
                this.updateStatus('saved');
                
                // Show success animation
                const saveButton = document.getElementById('manualSaveBtn');
                if (saveButton) {
                    saveButton.classList.add('success-pulse');
                    setTimeout(() => {
                        saveButton.classList.remove('success-pulse');
                    }, 600);
                }
                
                return true;
            } else {
                throw new Error(response.error || 'Manual save failed');
            }
            
        } catch (error) {
            console.error('Manual save failed:', error);
            this.updateStatus('error');
            this.editor.showError('Failed to save rundown: ' + error.message);
            return false;
            
        } finally {
            this.isEnabled = originalStatus;
            
            setTimeout(() => {
                if (!this.editor.isDirty) {
                    this.updateStatus('idle');
                } else {
                    this.updateStatus('unsaved');
                }
            }, 2000);
        }
    }
}
```

---

## CSS Architecture

### Modular CSS Structure

The VidPOD Rundown Editor uses a modular CSS architecture that separates concerns and enables progressive enhancement.

#### CSS File Hierarchy

```
1. styles.css           # Base VidPOD styles (shared)
2. navigation.css       # Navigation component styles  
3. rundown.css          # Core rundown editor styles
4. rundown-mobile.css   # Mobile responsive enhancements
5. rundown-animations.css # UI animations and transitions
6. rundown-accessibility.css # Accessibility features
7. rundown-print.css    # Print-optimized styles
```

### CSS Custom Properties (Variables)

#### Global Design System Variables

```css
:root {
  /* Colors */
  --primary-color: #667eea;
  --primary-dark: #5b6de8;
  --secondary-color: #764ba2;
  --success-color: #22c55e;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --info-color: #3b82f6;
  
  /* Neutral Colors */
  --gray-50: #f8fafc;
  --gray-100: #f1f5f9;
  --gray-200: #e2e8f0;
  --gray-300: #cbd5e1;
  --gray-400: #94a3b8;
  --gray-500: #64748b;
  --gray-600: #475569;
  --gray-700: #334155;
  --gray-800: #1e293b;
  --gray-900: #0f172a;
  
  /* Typography */
  --font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
  
  /* Spacing Scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
  
  /* Animation */
  --duration-fast: 0.15s;
  --duration-normal: 0.3s;
  --duration-slow: 0.5s;
  --ease-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

#### Component-Specific Variables

```css
/* Segment-specific variables */
.segment-item {
  --segment-bg: white;
  --segment-border: var(--gray-200);
  --segment-border-hover: var(--gray-300);
  --segment-border-selected: var(--primary-color);
  --segment-padding: var(--space-4);
  --segment-radius: var(--radius-xl);
  --segment-shadow: var(--shadow-sm);
  --segment-shadow-hover: var(--shadow-md);
}

/* Timing chip variables */
.timing-chip {
  --timing-bg-balanced: linear-gradient(135deg, var(--success-color) 0%, #16a34a 100%);
  --timing-bg-over: linear-gradient(135deg, var(--error-color) 0%, #dc2626 100%);
  --timing-bg-under: linear-gradient(135deg, var(--warning-color) 0%, #d97706 100%);
  --timing-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}
```

### Responsive Design System

#### Mobile-First Breakpoints

```css
/* Mobile-first approach */
/* Base styles: Mobile (320px+) */

@media (min-width: 480px) {
  /* Large mobile */
}

@media (min-width: 768px) {
  /* Tablet */
}

@media (min-width: 1024px) {
  /* Desktop */
}

@media (min-width: 1280px) {
  /* Large desktop */
}
```

#### Container Queries (Future Enhancement)

```css
/* Container queries for component-level responsiveness */
@container (max-width: 600px) {
  .editor-content {
    flex-direction: column;
  }
  
  .editor-sidebar {
    order: 2;
    width: 100%;
  }
}
```

### Animation System

#### Performance-Optimized Animations

```css
/* GPU acceleration for smooth animations */
.segment-item,
.modal-content,
.timing-chip,
.btn {
  will-change: transform;
  transform: translateZ(0); /* Force GPU layer */
}

/* Smooth transitions with custom easing */
.segment-item {
  transition: 
    transform var(--duration-normal) var(--ease-out),
    box-shadow var(--duration-normal) var(--ease-out),
    border-color var(--duration-fast) var(--ease-out);
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

#### Animation Performance Monitoring

```css
/* Animation performance hints */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translate3d(0, 20px, 0); /* Use 3D transforms */
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

/* Efficient opacity animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Avoid animating layout properties */
.good-animation {
  animation: slideIn 0.3s ease-out;
  /* Only animates transform and opacity */
}

.bad-animation {
  /* Don't animate these - causes layout thrashing */
  /* animation: slideInBad 0.3s ease-out; */
}

@keyframes slideInBad {
  from { margin-top: 20px; width: 0; } /* BAD - causes reflow */
  to { margin-top: 0; width: 100%; }
}
```

### Print CSS Optimization

#### Print-Specific Styles

```css
@media print {
  /* Remove interactive elements */
  .btn,
  .segment-drag-handle,
  .modal,
  .auto-save-indicator {
    display: none !important;
  }
  
  /* Optimize for paper */
  body {
    font-size: 12pt;
    line-height: 1.4;
    color: #000;
    background: #fff;
  }
  
  /* Page breaks */
  .segment-item {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  
  /* Ensure visibility */
  * {
    color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  
  /* Headers and footers */
  @page {
    margin: 1in;
    
    @top-center {
      content: "VidPOD Rundown";
    }
    
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
    }
  }
  
  /* Section breaks */
  .segments-container {
    page-break-before: auto;
  }
  
  .talent-roster {
    page-break-before: always;
  }
}
```

---

## Authentication & Authorization

### JWT Token System

#### Token Structure

```javascript
// JWT Payload Structure
{
  "user_id": 123,
  "email": "teacher@vidpod.com",
  "role": "teacher",
  "school_id": 45,
  "permissions": [
    "rundown:create",
    "rundown:edit_own",
    "rundown:delete_own",
    "story:link"
  ],
  "iat": 1642680000,
  "exp": 1643284800
}
```

#### Client-Side Token Management

```javascript
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('vidpod_token');
        this.user = this.parseTokenPayload(this.token);
        this.refreshTimer = null;
    }
    
    parseTokenPayload(token) {
        if (!token) return null;
        
        try {
            const payload = token.split('.')[1];
            const decoded = atob(payload);
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Invalid token:', error);
            this.logout();
            return null;
        }
    }
    
    isAuthenticated() {
        return this.token && this.user && !this.isTokenExpired();
    }
    
    isTokenExpired() {
        if (!this.user) return true;
        return Date.now() >= (this.user.exp * 1000);
    }
    
    hasPermission(permission) {
        if (!this.user) return false;
        return this.user.permissions.includes(permission);
    }
    
    canEditRundown(rundown) {
        if (!this.isAuthenticated()) return false;
        
        // Admin can edit all
        if (this.user.role === 'amitrace_admin') return true;
        
        // Teachers can edit their own
        if (this.user.role === 'teacher' && rundown.created_by === this.user.user_id) {
            return true;
        }
        
        // Check if user is in rundown's class
        if (rundown.class_id && this.user.class_ids?.includes(rundown.class_id)) {
            return true;
        }
        
        return false;
    }
    
    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
}

// Global auth manager instance
window.authManager = new AuthManager();
```

### Role-Based UI Control

#### Permission-Based UI Rendering

```javascript
class UIPermissions {
    constructor(authManager) {
        this.auth = authManager;
    }
    
    setupRoleBasedUI() {
        const user = this.auth.user;
        if (!user) return;
        
        // Show/hide elements based on role
        const roleElements = document.querySelectorAll('[data-role]');
        roleElements.forEach(element => {
            const requiredRoles = element.dataset.role.split(',');
            const hasAccess = requiredRoles.some(role => 
                role.trim() === user.role || role.trim() === 'all'
            );
            
            element.style.display = hasAccess ? '' : 'none';
        });
        
        // Show/hide elements based on permissions
        const permissionElements = document.querySelectorAll('[data-permission]');
        permissionElements.forEach(element => {
            const requiredPermissions = element.dataset.permission.split(',');
            const hasPermission = requiredPermissions.some(permission =>
                this.auth.hasPermission(permission.trim())
            );
            
            element.style.display = hasPermission ? '' : 'none';
        });
        
        // Disable buttons based on permissions
        this.setupButtonPermissions();
    }
    
    setupButtonPermissions() {
        const protectedButtons = document.querySelectorAll('[data-requires-permission]');
        protectedButtons.forEach(button => {
            const permission = button.dataset.requiresPermission;
            if (!this.auth.hasPermission(permission)) {
                button.disabled = true;
                button.title = 'You do not have permission to perform this action';
                button.setAttribute('aria-label', 
                    button.getAttribute('aria-label') + ' (Permission required)');
            }
        });
    }
}
```

#### HTML Permission Attributes

```html
<!-- Role-based visibility -->
<button data-role="teacher,amitrace_admin" class="btn btn-primary">
    Create New Rundown
</button>

<div data-role="amitrace_admin" class="admin-only-section">
    <!-- Admin-only content -->
</div>

<!-- Permission-based functionality -->
<button data-permission="rundown:delete" 
        data-requires-permission="rundown:delete"
        onclick="deleteRundown()">
    Delete Rundown
</button>

<div data-permission="story:link">
    <button onclick="linkStory()">Link Story</button>
</div>
```

### Security Measures

#### API Security

```javascript
class RundownAPI {
    static async makeRequest(endpoint, options = {}) {
        // Add authentication headers
        const headers = {
            ...window.authManager.getAuthHeaders(),
            ...options.headers
        };
        
        const config = {
            ...options,
            headers
        };
        
        try {
            const response = await fetch(endpoint, config);
            
            // Handle authentication errors
            if (response.status === 401) {
                window.authManager.handleAuthError();
                throw new Error('Authentication required');
            }
            
            // Handle authorization errors
            if (response.status === 403) {
                throw new Error('You do not have permission to perform this action');
            }
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }
    
    // CSRF protection for state-changing operations
    static async getCSRFToken() {
        const response = await this.makeRequest('/api/csrf-token');
        return response.csrf_token;
    }
    
    static async createRundown(data) {
        const csrfToken = await this.getCSRFToken();
        return this.makeRequest('/api/rundowns', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'X-CSRF-Token': csrfToken
            }
        });
    }
}
```

#### Input Validation and Sanitization

```javascript
class InputValidator {
    static sanitizeHTML(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
    
    static validateRundownTitle(title) {
        if (!title || typeof title !== 'string') {
            throw new Error('Title is required');
        }
        
        if (title.length > 255) {
            throw new Error('Title must be less than 255 characters');
        }
        
        return this.sanitizeHTML(title.trim());
    }
    
    static validateDuration(duration) {
        const parsed = parseInt(duration, 10);
        if (isNaN(parsed) || parsed < 0 || parsed > 86400) { // Max 24 hours
            throw new Error('Duration must be between 0 and 86400 seconds');
        }
        return parsed;
    }
    
    static validateSegmentType(type) {
        const validTypes = ['story', 'interview', 'break', 'intro', 'outro', 'custom'];
        if (!validTypes.includes(type)) {
            throw new Error('Invalid segment type');
        }
        return type;
    }
}
```

---

## Auto-Save System

### Architecture Overview

The auto-save system provides reliable, intelligent data persistence with conflict resolution and offline support.

```
┌─────────────────────────────────────┐
│          Client-Side                │
│                                     │
│  ┌─────────────────────────────────┐│
│  │     Change Detection            ││
│  │   • Input Event Listeners      ││
│  │   • Mutation Observers          ││
│  │   • State Diff Calculation     ││
│  └─────────────────────────────────┘│
│                │                    │
│                ▼                    │
│  ┌─────────────────────────────────┐│
│  │     Save Scheduler              ││
│  │   • Debounced Save Timer        ││
│  │   • Priority Queue              ││
│  │   • Conflict Detection          ││
│  └─────────────────────────────────┘│
│                │                    │
│                ▼                    │
│  ┌─────────────────────────────────┐│
│  │     Network Layer               ││
│  │   • Retry Logic                 ││
│  │   • Offline Queue               ││
│  │   • Error Handling              ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
                │
                ▼ HTTP POST
┌─────────────────────────────────────┐
│          Server-Side                │
│                                     │
│  ┌─────────────────────────────────┐│
│  │     Version Control             ││
│  │   • Timestamp Comparison        ││
│  │   • Conflict Detection          ││
│  │   • Merge Strategies            ││
│  └─────────────────────────────────┘│
│                │                    │
│                ▼                    │
│  ┌─────────────────────────────────┐│
│  │     Database Update             ││
│  │   • Transactional Updates       ││
│  │   • Change Logging              ││
│  │   • Backup Creation             ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### Advanced Auto-Save Features

#### Change Detection System

```javascript
class ChangeDetector {
    constructor(editor) {
        this.editor = editor;
        this.lastSnapshot = null;
        this.changeBuffer = [];
        this.mutationObserver = null;
        
        this.setupMutationObserver();
        this.setupInputListeners();
    }
    
    setupMutationObserver() {
        this.mutationObserver = new MutationObserver((mutations) => {
            const relevantChanges = mutations.filter(this.isRelevantMutation);
            if (relevantChanges.length > 0) {
                this.recordChanges(relevantChanges);
            }
        });
        
        this.mutationObserver.observe(document.getElementById('editorInterface'), {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
            attributeFilter: ['data-segment-id', 'class']
        });
    }
    
    isRelevantMutation(mutation) {
        // Ignore cosmetic changes like focus states
        if (mutation.type === 'attributes') {
            const ignoredAttributes = ['class', 'style', 'aria-expanded'];
            return !ignoredAttributes.includes(mutation.attributeName);
        }
        
        // Ignore changes in non-editable areas
        const editableSelectors = [
            '.segment-title-input',
            '.segment-time-input', 
            '.segment-intro-input',
            '.segment-notes-input',
            '.question-input',
            '.rundown-title',
            '.rundown-description'
        ];
        
        return editableSelectors.some(selector => 
            mutation.target.matches?.(selector) ||
            mutation.target.querySelector?.(selector)
        );
    }
    
    createSnapshot() {
        return {
            timestamp: Date.now(),
            rundown: {
                title: this.getRundownTitle(),
                description: this.getRundownDescription(),
                target_duration: this.getTargetDuration()
            },
            segments: this.getSegmentsSnapshot(),
            talent: this.getTalentSnapshot(),
            notes: this.getNotesSnapshot()
        };
    }
    
    detectChanges() {
        const currentSnapshot = this.createSnapshot();
        
        if (!this.lastSnapshot) {
            this.lastSnapshot = currentSnapshot;
            return null;
        }
        
        const changes = this.diffSnapshots(this.lastSnapshot, currentSnapshot);
        this.lastSnapshot = currentSnapshot;
        
        return changes;
    }
    
    diffSnapshots(oldSnapshot, newSnapshot) {
        const changes = {
            rundown: {},
            segments: [],
            talent: [],
            notes: null,
            hasChanges: false
        };
        
        // Detect rundown changes
        Object.keys(newSnapshot.rundown).forEach(key => {
            if (oldSnapshot.rundown[key] !== newSnapshot.rundown[key]) {
                changes.rundown[key] = newSnapshot.rundown[key];
                changes.hasChanges = true;
            }
        });
        
        // Detect segment changes
        changes.segments = this.diffSegments(oldSnapshot.segments, newSnapshot.segments);
        if (changes.segments.length > 0) {
            changes.hasChanges = true;
        }
        
        // Detect notes changes
        if (oldSnapshot.notes !== newSnapshot.notes) {
            changes.notes = newSnapshot.notes;
            changes.hasChanges = true;
        }
        
        return changes.hasChanges ? changes : null;
    }
}
```

#### Conflict Resolution

```javascript
class ConflictResolver {
    constructor(editor) {
        this.editor = editor;
    }
    
    async handleSaveConflict(localChanges, serverVersion) {
        // Compare timestamps to determine conflict type
        const localTimestamp = localChanges.timestamp;
        const serverTimestamp = new Date(serverVersion.updated_at).getTime();
        
        if (serverTimestamp > localTimestamp) {
            // Server has newer changes - potential conflict
            return this.resolveConflict(localChanges, serverVersion);
        }
        
        // No conflict - proceed with save
        return localChanges;
    }
    
    async resolveConflict(localChanges, serverVersion) {
        const conflictModal = this.showConflictModal(localChanges, serverVersion);
        
        return new Promise((resolve) => {
            conflictModal.onResolve = (resolution) => {
                switch (resolution.action) {
                    case 'use_local':
                        resolve(localChanges);
                        break;
                        
                    case 'use_server':
                        this.applyServerChanges(serverVersion);
                        resolve(null); // Don't save
                        break;
                        
                    case 'merge':
                        const merged = this.mergeChanges(localChanges, serverVersion, resolution.mergeStrategy);
                        resolve(merged);
                        break;
                        
                    default:
                        resolve(null); // Cancel save
                }
            };
        });
    }
    
    mergeChanges(localChanges, serverVersion, strategy) {
        const merged = JSON.parse(JSON.stringify(localChanges));
        
        switch (strategy) {
            case 'prefer_local':
                // Keep local changes, only take server changes for non-conflicting fields
                this.mergeNonConflicting(merged, serverVersion);
                break;
                
            case 'prefer_server':
                // Use server version as base, apply non-conflicting local changes
                const serverBased = this.convertServerToLocal(serverVersion);
                this.mergeNonConflicting(serverBased, localChanges);
                return serverBased;
                
            case 'field_by_field':
                // User chose specific fields - apply those choices
                this.applyFieldChoices(merged, serverVersion, strategy.fieldChoices);
                break;
        }
        
        return merged;
    }
    
    showConflictModal(localChanges, serverVersion) {
        const modal = document.createElement('div');
        modal.className = 'modal conflict-resolution-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>⚠️ Save Conflict Detected</h2>
                    <p>Another user has made changes to this rundown. How would you like to resolve this?</p>
                </div>
                
                <div class="conflict-comparison">
                    <div class="local-changes">
                        <h3>Your Changes</h3>
                        ${this.renderChanges(localChanges)}
                    </div>
                    
                    <div class="server-changes">
                        <h3>Server Changes</h3>
                        ${this.renderChanges(serverVersion)}
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-secondary" data-action="use_server">
                        Use Server Version
                    </button>
                    <button class="btn btn-warning" data-action="merge">
                        Smart Merge
                    </button>
                    <button class="btn btn-primary" data-action="use_local">
                        Keep My Changes
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'flex';
        
        return modal;
    }
}
```

#### Offline Support

```javascript
class OfflineManager {
    constructor(autoSave) {
        this.autoSave = autoSave;
        this.offlineQueue = [];
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        
        this.setupEventListeners();
        this.initializeServiceWorker();
    }
    
    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncOfflineChanges();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.autoSave.updateStatus('offline');
        });
    }
    
    async initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw-rundown.js');
                console.log('Service worker registered:', registration);
                
                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data.type === 'OFFLINE_SAVE') {
                        this.handleOfflineSave(event.data.payload);
                    }
                });
                
            } catch (error) {
                console.error('Service worker registration failed:', error);
            }
        }
    }
    
    queueOfflineSave(saveData) {
        const queueItem = {
            id: Date.now() + Math.random(),
            data: saveData,
            timestamp: Date.now(),
            attempts: 0
        };
        
        this.offlineQueue.push(queueItem);
        this.saveToLocalStorage();
        
        return queueItem.id;
    }
    
    async syncOfflineChanges() {
        if (this.syncInProgress || this.offlineQueue.length === 0) return;
        
        this.syncInProgress = true;
        this.autoSave.updateStatus('syncing');
        
        try {
            // Sort by timestamp to maintain order
            this.offlineQueue.sort((a, b) => a.timestamp - b.timestamp);
            
            for (let i = 0; i < this.offlineQueue.length; i++) {
                const item = this.offlineQueue[i];
                
                try {
                    const result = await RundownAPI.autoSave(
                        this.autoSave.editor.rundownId, 
                        item.data
                    );
                    
                    if (result.success) {
                        // Remove successfully synced item
                        this.offlineQueue.splice(i, 1);
                        i--; // Adjust index after removal
                    } else {
                        throw new Error(result.error || 'Sync failed');
                    }
                    
                } catch (error) {
                    console.error('Failed to sync offline change:', error);
                    item.attempts++;
                    
                    // Remove items that have failed too many times
                    if (item.attempts >= 5) {
                        this.offlineQueue.splice(i, 1);
                        i--;
                        console.warn('Discarding offline change after max attempts:', item);
                    }
                }
            }
            
            this.saveToLocalStorage();
            
            if (this.offlineQueue.length === 0) {
                this.autoSave.updateStatus('synced');
            } else {
                this.autoSave.updateStatus('sync_partial');
            }
            
        } catch (error) {
            console.error('Offline sync failed:', error);
            this.autoSave.updateStatus('sync_failed');
        } finally {
            this.syncInProgress = false;
        }
    }
    
    saveToLocalStorage() {
        try {
            localStorage.setItem('rundown_offline_queue', JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.error('Failed to save offline queue:', error);
        }
    }
    
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('rundown_offline_queue');
            this.offlineQueue = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load offline queue:', error);
            this.offlineQueue = [];
        }
    }
}
```

---

## Mobile & Touch Implementation

### Touch Event Handling System

The mobile touch implementation provides native-feeling drag and drop interactions with haptic feedback and accessibility support.

#### Core Touch Architecture

```javascript
class TouchEventManager {
    constructor() {
        this.activeTouch = null;
        this.touchStartTime = 0;
        this.touchThreshold = 10; // pixels
        this.longPressDelay = 500; // milliseconds
        this.tapTimeout = 300; // milliseconds
        
        this.gestureState = {
            isDragging: false,
            isPanning: false,
            isLongPress: false,
            startPoint: { x: 0, y: 0 },
            currentPoint: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 }
        };
        
        this.setupTouchEventDelegation();
    }
    
    setupTouchEventDelegation() {
        // Use event delegation for better performance
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), {
            passive: false,
            capture: true
        });
        
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), {
            passive: false,
            capture: true
        });
        
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), {
            passive: false,
            capture: true
        });
        
        document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), {
            passive: false,
            capture: true
        });
    }
    
    handleTouchStart(e) {
        // Only handle single finger touches
        if (e.touches.length !== 1) {
            this.resetGestureState();
            return;
        }
        
        const touch = e.touches[0];
        const target = this.findDraggableTarget(touch.target);
        
        if (!target) return;
        
        this.activeTouch = touch.identifier;
        this.touchStartTime = Date.now();
        
        this.gestureState = {
            isDragging: false,
            isPanning: false,
            isLongPress: false,
            startPoint: { x: touch.clientX, y: touch.clientY },
            currentPoint: { x: touch.clientX, y: touch.clientY },
            velocity: { x: 0, y: 0 },
            target: target
        };
        
        // Start long press timer
        this.longPressTimer = setTimeout(() => {
            this.handleLongPress(target, touch);
        }, this.longPressDelay);
        
        // Prevent default scrolling on draggable elements
        if (target.classList.contains('draggable') || target.closest('.draggable')) {
            e.preventDefault();
        }
    }
    
    handleTouchMove(e) {
        if (!this.activeTouch) return;
        
        const touch = Array.from(e.touches).find(t => t.identifier === this.activeTouch);
        if (!touch) return;
        
        const deltaX = touch.clientX - this.gestureState.startPoint.x;
        const deltaY = touch.clientY - this.gestureState.startPoint.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Update current position
        this.gestureState.currentPoint = { x: touch.clientX, y: touch.clientY };
        
        // Calculate velocity for momentum
        const timeDelta = Date.now() - this.touchStartTime;
        if (timeDelta > 0) {
            this.gestureState.velocity = {
                x: deltaX / timeDelta,
                y: deltaY / timeDelta
            };
        }
        
        // Check if we've moved beyond the threshold
        if (distance > this.touchThreshold) {
            // Cancel long press if we're moving
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            
            // Determine gesture type
            if (!this.gestureState.isDragging && !this.gestureState.isPanning) {
                const absX = Math.abs(deltaX);
                const absY = Math.abs(deltaY);
                
                if (this.gestureState.target.classList.contains('draggable')) {
                    // Vertical movement on draggable = drag gesture
                    if (absY > absX) {
                        this.gestureState.isDragging = true;
                        this.startDragOperation(this.gestureState.target, touch);
                    } else {
                        // Horizontal = pan gesture
                        this.gestureState.isPanning = true;
                    }
                } else {
                    // Default to panning
                    this.gestureState.isPanning = true;
                }
            }
            
            if (this.gestureState.isDragging) {
                this.updateDragOperation(touch);
                e.preventDefault();
            }
        }
    }
    
    handleTouchEnd(e) {
        if (!this.activeTouch) return;
        
        // Clear long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        const touchDuration = Date.now() - this.touchStartTime;
        const deltaX = this.gestureState.currentPoint.x - this.gestureState.startPoint.x;
        const deltaY = this.gestureState.currentPoint.y - this.gestureState.startPoint.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (this.gestureState.isDragging) {
            this.endDragOperation();
        } else if (distance < this.touchThreshold && touchDuration < this.tapTimeout) {
            // This was a tap
            this.handleTap(this.gestureState.target);
        }
        
        this.resetGestureState();
    }
    
    findDraggableTarget(element) {
        // Walk up the DOM to find draggable element
        let current = element;
        while (current && current !== document.body) {
            if (current.classList.contains('segment-item') || 
                current.classList.contains('draggable')) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    }
}
```

#### Advanced Drag & Drop with Touch

```javascript
class TouchDragDrop {
    constructor(touchManager) {
        this.touchManager = touchManager;
        this.dragGhost = null;
        this.dropZones = [];
        this.activeDropZone = null;
        this.scrollContainer = null;
        this.autoScrollInterval = null;
        
        this.setupDropZoneDetection();
    }
    
    startDrag(element, touch) {
        console.log('🔧 Starting touch drag for:', element);
        
        // Create visual feedback
        this.createDragGhost(element, touch);
        this.setupDropZones();
        this.enableAutoScroll();
        
        // Add dragging class
        element.classList.add('touch-dragging');
        
        // Provide haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(50); // Short vibration for drag start
        }
        
        // Update ARIA for screen readers
        element.setAttribute('aria-grabbed', 'true');
        this.announceToScreenReader('Started dragging segment');
    }
    
    createDragGhost(element, touch) {
        // Clone the element for ghost
        this.dragGhost = element.cloneNode(true);
        this.dragGhost.classList.add('drag-ghost');
        
        // Style the ghost
        Object.assign(this.dragGhost.style, {
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: '9999',
            opacity: '0.8',
            transform: 'rotate(2deg) scale(1.05)',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.2)',
            borderRadius: '12px',
            transition: 'none'
        });
        
        // Position at touch point
        const rect = element.getBoundingClientRect();
        this.dragGhost.style.left = `${touch.clientX - rect.width / 2}px`;
        this.dragGhost.style.top = `${touch.clientY - rect.height / 2}px`;
        
        document.body.appendChild(this.dragGhost);
    }
    
    updateDrag(touch) {
        if (!this.dragGhost) return;
        
        // Update ghost position
        const rect = this.dragGhost.getBoundingClientRect();
        this.dragGhost.style.left = `${touch.clientX - rect.width / 2}px`;
        this.dragGhost.style.top = `${touch.clientY - rect.height / 2}px`;
        
        // Update drop zones
        this.updateDropZoneHighlights(touch);
        
        // Handle auto-scrolling
        this.handleAutoScroll(touch);
    }
    
    updateDropZoneHighlights(touch) {
        // Find closest drop zone
        let closestZone = null;
        let closestDistance = Infinity;
        
        this.dropZones.forEach(zone => {
            const rect = zone.element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(touch.clientX - centerX, 2) + 
                Math.pow(touch.clientY - centerY, 2)
            );
            
            if (distance < closestDistance && distance < 150) { // 150px activation radius
                closestDistance = distance;
                closestZone = zone;
            }
        });
        
        // Update active drop zone
        if (closestZone !== this.activeDropZone) {
            // Clear previous highlight
            if (this.activeDropZone) {
                this.activeDropZone.element.classList.remove('drop-zone-active');
                this.hideDropIndicator(this.activeDropZone);
            }
            
            // Set new highlight
            this.activeDropZone = closestZone;
            if (this.activeDropZone) {
                this.activeDropZone.element.classList.add('drop-zone-active');
                this.showDropIndicator(this.activeDropZone, touch);
                
                // Haptic feedback for zone entry
                if (navigator.vibrate) {
                    navigator.vibrate(25);
                }
            }
        }
    }
    
    showDropIndicator(zone, touch) {
        let indicator = zone.element.querySelector('.drop-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'drop-indicator';
            zone.element.appendChild(indicator);
        }
        
        // Position indicator based on touch position
        const rect = zone.element.getBoundingClientRect();
        const isAbove = touch.clientY < rect.top + rect.height / 2;
        
        if (isAbove) {
            zone.element.insertBefore(indicator, zone.element.firstChild);
        } else {
            zone.element.appendChild(indicator);
        }
        
        indicator.classList.add('active');
        
        // Add pulsing animation
        indicator.style.background = 'linear-gradient(90deg, transparent, #22c55e, transparent)';
        indicator.style.height = '4px';
        indicator.style.borderRadius = '2px';
        indicator.style.margin = '8px 0';
        indicator.style.animation = 'dropIndicatorPulse 1s ease-in-out infinite';
    }
    
    handleAutoScroll(touch) {
        if (!this.scrollContainer) {
            this.scrollContainer = document.querySelector('.segments-list') || 
                                 document.querySelector('.editor-content') || 
                                 window;
        }
        
        const threshold = 80; // pixels from edge
        let scrollDirection = 0;
        
        if (this.scrollContainer === window) {
            // Window scrolling
            if (touch.clientY < threshold) {
                scrollDirection = -1;
            } else if (touch.clientY > window.innerHeight - threshold) {
                scrollDirection = 1;
            }
        } else {
            // Element scrolling
            const rect = this.scrollContainer.getBoundingClientRect();
            if (touch.clientY < rect.top + threshold) {
                scrollDirection = -1;
            } else if (touch.clientY > rect.bottom - threshold) {
                scrollDirection = 1;
            }
        }
        
        // Clear existing auto-scroll
        if (this.autoScrollInterval) {
            clearInterval(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
        
        // Start auto-scroll if needed
        if (scrollDirection !== 0) {
            this.autoScrollInterval = setInterval(() => {
                const scrollAmount = scrollDirection * 8; // pixels per frame
                
                if (this.scrollContainer === window) {
                    window.scrollBy(0, scrollAmount);
                } else {
                    this.scrollContainer.scrollBy(0, scrollAmount);
                }
                
                // Recalculate drop zones after scroll
                this.setupDropZones();
            }, 16); // ~60fps
        }
    }
    
    endDrag() {
        console.log('🔧 Ending touch drag');
        
        // Clean up ghost
        if (this.dragGhost) {
            // Add completion animation
            this.dragGhost.style.transition = 'all 0.3s ease';
            this.dragGhost.style.opacity = '0';
            this.dragGhost.style.transform = 'scale(0.5)';
            
            setTimeout(() => {
                if (this.dragGhost) {
                    this.dragGhost.remove();
                    this.dragGhost = null;
                }
            }, 300);
        }
        
        // Clear auto-scroll
        if (this.autoScrollInterval) {
            clearInterval(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
        
        // Perform drop action
        let dropSuccessful = false;
        if (this.activeDropZone) {
            dropSuccessful = this.performDrop();
        }
        
        // Provide completion feedback
        if (navigator.vibrate) {
            if (dropSuccessful) {
                navigator.vibrate([50, 50, 50]); // Success pattern
            } else {
                navigator.vibrate(100); // Failure vibration
            }
        }
        
        // Clean up drop zone highlights
        this.clearDropZoneHighlights();
        
        // Clean up dragging state
        const draggedElement = document.querySelector('.touch-dragging');
        if (draggedElement) {
            draggedElement.classList.remove('touch-dragging');
            draggedElement.setAttribute('aria-grabbed', 'false');
        }
        
        // Announce completion to screen readers
        if (dropSuccessful) {
            this.announceToScreenReader('Segment reordered successfully');
        } else {
            this.announceToScreenReader('Segment returned to original position');
        }
    }
    
    performDrop() {
        if (!this.activeDropZone || !this.touchManager.gestureState.target) {
            return false;
        }
        
        const draggedElement = this.touchManager.gestureState.target;
        const targetElement = this.activeDropZone.element;
        
        // Get indices
        const allSegments = Array.from(document.querySelectorAll('.segment-item'));
        const draggedIndex = allSegments.indexOf(draggedElement);
        const targetIndex = allSegments.indexOf(targetElement);
        
        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
            return false;
        }
        
        // Determine insert position
        const insertPosition = this.activeDropZone.insertBefore ? targetIndex : targetIndex + 1;
        
        try {
            // Optimistically update DOM
            this.reorderSegmentsInDOM(draggedIndex, insertPosition);
            
            // Update server
            const segmentId = draggedElement.dataset.segmentId;
            window.rundownEditor.segments.moveSegment(segmentId, draggedIndex, insertPosition);
            
            return true;
        } catch (error) {
            console.error('Drop operation failed:', error);
            return false;
        }
    }
    
    reorderSegmentsInDOM(fromIndex, toIndex) {
        const container = document.getElementById('segmentsList');
        const segments = Array.from(container.children);
        const draggedSegment = segments[fromIndex];
        
        // Remove from current position
        container.removeChild(draggedSegment);
        
        // Insert at new position
        if (toIndex >= segments.length) {
            container.appendChild(draggedSegment);
        } else {
            const referenceSegment = segments[toIndex];
            container.insertBefore(draggedSegment, referenceSegment);
        }
    }
    
    announceToScreenReader(message) {
        // Create or update ARIA live region
        let liveRegion = document.getElementById('touch-announcements');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'touch-announcements';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-9999px';
            liveRegion.style.width = '1px';
            liveRegion.style.height = '1px';
            liveRegion.style.overflow = 'hidden';
            document.body.appendChild(liveRegion);
        }
        
        liveRegion.textContent = message;
    }
}
```

### Responsive Touch Targets

#### Touch Target Optimization

```css
/* Minimum touch target sizes per platform guidelines */
.touch-target {
  min-width: 44px;   /* Apple HIG minimum */
  min-height: 44px;  /* Apple HIG minimum */
  padding: 8px;
}

/* Android Material Design minimum (48dp ≈ 48px) */
@media (max-width: 768px) {
  .touch-target {
    min-width: 48px;
    min-height: 48px;
    padding: 12px;
  }
}

/* Segment touch optimization */
.segment-item {
  /* Touch-friendly padding */
  padding: 16px;
  margin: 8px 0;
  
  /* Clear touch boundaries */
  touch-action: manipulation;
  -webkit-touch-callout: none;
  user-select: none;
}

.segment-drag-handle {
  min-width: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* Visual feedback */
  background: rgba(100, 116, 139, 0.1);
  border-radius: 8px;
  transition: background-color 0.2s ease;
  
  /* Touch optimization */
  touch-action: none;
  cursor: grab;
}

.segment-drag-handle:active {
  background: rgba(100, 116, 139, 0.2);
  cursor: grabbing;
}

/* Button touch optimization */
.btn {
  min-height: 44px;
  padding: 12px 16px;
  border-radius: 8px;
  
  /* Touch feedback */
  transition: all 0.2s ease;
  transform: translateZ(0); /* GPU acceleration */
}

.btn:active {
  transform: scale(0.95);
}

/* Input field touch optimization */
input[type="text"],
input[type="number"],
textarea,
select {
  min-height: 44px;
  padding: 12px;
  font-size: 16px; /* Prevents zoom on iOS */
  border-radius: 8px;
  
  /* Touch-friendly focus */
  touch-action: manipulation;
}

/* Focus states for touch */
input:focus,
textarea:focus,
button:focus {
  outline: 3px solid rgba(102, 126, 234, 0.4);
  outline-offset: 2px;
}
```

---

## Accessibility Implementation

### WCAG 2.1 AA Compliance

The VidPOD Rundown Editor implements comprehensive accessibility features following WCAG 2.1 AA guidelines.

#### Semantic HTML Structure

```html
<!-- Proper document structure -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VidPOD - Rundown Editor</title>
    <!-- Proper meta tags -->
</head>
<body>
    <!-- Skip navigation -->
    <a href="#main-content" class="skip-link">Skip to main content</a>
    
    <!-- Navigation landmark -->
    <nav role="navigation" aria-label="Main navigation">
        <!-- Navigation content -->
    </nav>
    
    <!-- Main content landmark -->
    <main id="main-content" role="main" aria-labelledby="page-title">
        <!-- Header section -->
        <header role="banner">
            <h1 id="page-title">Rundown Editor</h1>
        </header>
        
        <!-- Content sections -->
        <section aria-labelledby="segments-heading" role="region">
            <h2 id="segments-heading">Rundown Segments</h2>
            
            <!-- Interactive list -->
            <div role="list" aria-label="Segments list - use arrow keys to navigate">
                <div role="listitem" tabindex="0" aria-describedby="segment-help">
                    <!-- Segment content -->
                </div>
            </div>
            
            <!-- Hidden help text -->
            <div id="segment-help" class="sr-only">
                Use Enter to edit, Space to expand, Delete to remove, or drag to reorder
            </div>
        </section>
        
        <!-- Sidebar complementary content -->
        <aside role="complementary" aria-label="Rundown tools and information">
            <!-- Sidebar content -->
        </aside>
    </main>
</body>
</html>
```

#### ARIA Implementation

```javascript
class AccessibilityManager {
    constructor() {
        this.liveRegion = null;
        this.setupLiveRegion();
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
    }
    
    setupLiveRegion() {
        // Create ARIA live region for dynamic announcements
        this.liveRegion = document.createElement('div');
        this.liveRegion.id = 'aria-live-region';
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'false');
        this.liveRegion.className = 'sr-only';
        document.body.appendChild(this.liveRegion);
    }
    
    announce(message, priority = 'polite') {
        if (!this.liveRegion) return;
        
        // Set appropriate aria-live value
        this.liveRegion.setAttribute('aria-live', priority);
        
        // Clear and set new message
        this.liveRegion.textContent = '';
        setTimeout(() => {
            this.liveRegion.textContent = message;
        }, 100);
        
        // Reset to polite after announcement
        if (priority !== 'polite') {
            setTimeout(() => {
                this.liveRegion.setAttribute('aria-live', 'polite');
            }, 1000);
        }
    }
    
    setupKeyboardNavigation() {
        // Global keyboard event handler
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeyboard(e);
        });
        
        // Setup roving tabindex for segment navigation
        this.setupRovingTabindex();
    }
    
    setupRovingTabindex() {
        const segmentsList = document.getElementById('segmentsList');
        if (!segmentsList) return;
        
        let currentIndex = 0;
        
        const updateTabindex = () => {
            const segments = segmentsList.querySelectorAll('.segment-item');
            segments.forEach((segment, index) => {
                segment.tabIndex = index === currentIndex ? 0 : -1;
                
                if (index === currentIndex) {
                    segment.setAttribute('aria-selected', 'true');
                } else {
                    segment.removeAttribute('aria-selected');
                }
            });
        };
        
        segmentsList.addEventListener('keydown', (e) => {
            const segments = segmentsList.querySelectorAll('.segment-item');
            const maxIndex = segments.length - 1;
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    currentIndex = Math.min(currentIndex + 1, maxIndex);
                    updateTabindex();
                    segments[currentIndex].focus();
                    this.announce(`Segment ${currentIndex + 1} of ${segments.length} selected`);
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    currentIndex = Math.max(currentIndex - 1, 0);
                    updateTabindex();
                    segments[currentIndex].focus();
                    this.announce(`Segment ${currentIndex + 1} of ${segments.length} selected`);
                    break;
                    
                case 'Home':
                    e.preventDefault();
                    currentIndex = 0;
                    updateTabindex();
                    segments[currentIndex].focus();
                    this.announce(`First segment selected`);
                    break;
                    
                case 'End':
                    e.preventDefault();
                    currentIndex = maxIndex;
                    updateTabindex();
                    segments[currentIndex].focus();
                    this.announce(`Last segment selected`);
                    break;
                    
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    this.toggleSegmentExpansion(segments[currentIndex]);
                    break;
                    
                case 'Delete':
                case 'Backspace':
                    e.preventDefault();
                    this.confirmSegmentDeletion(segments[currentIndex]);
                    break;
                    
                case 'F2':
                    e.preventDefault();
                    this.editSegmentTitle(segments[currentIndex]);
                    break;
            }
        });
        
        // Initialize
        updateTabindex();
    }
    
    toggleSegmentExpansion(segment) {
        const content = segment.querySelector('.segment-content');
        const caret = segment.querySelector('.segment-caret');
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            content.classList.remove('expanded');
            caret.style.transform = 'rotate(0deg)';
            segment.setAttribute('aria-expanded', 'false');
            this.announce('Segment collapsed');
        } else {
            content.classList.add('expanded');
            caret.style.transform = 'rotate(90deg)';
            segment.setAttribute('aria-expanded', 'true');
            this.announce('Segment expanded');
        }
    }
    
    setupFocusManagement() {
        // Modal focus trapping
        this.setupModalFocusTrap();
        
        // Focus restoration
        this.setupFocusRestoration();
        
        // Focus visible only for keyboard users
        this.setupFocusVisible();
    }
    
    setupModalFocusTrap() {
        document.addEventListener('keydown', (e) => {
            const modal = document.querySelector('.modal[style*="block"]');
            if (!modal || e.key !== 'Tab') return;
            
            const focusableElements = modal.querySelectorAll(`
                button:not([disabled]),
                input:not([disabled]),
                textarea:not([disabled]),
                select:not([disabled]),
                a[href],
                [tabindex]:not([tabindex="-1"])
            `);
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        });
    }
    
    setupFocusVisible() {
        // Track keyboard vs mouse usage
        let isKeyboardUser = false;
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                isKeyboardUser = true;
                document.body.classList.add('keyboard-user');
            }
        });
        
        document.addEventListener('mousedown', () => {
            isKeyboardUser = false;
            document.body.classList.remove('keyboard-user');
        });
        
        // Only show focus rings for keyboard users
        const style = document.createElement('style');
        style.textContent = `
            body:not(.keyboard-user) *:focus {
                outline: none !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Screen reader utilities
    hideFromScreenReader(element) {
        element.setAttribute('aria-hidden', 'true');
    }
    
    showToScreenReader(element) {
        element.removeAttribute('aria-hidden');
    }
    
    setScreenReaderText(element, text) {
        element.setAttribute('aria-label', text);
    }
    
    updateLoadingState(element, isLoading) {
        if (isLoading) {
            element.setAttribute('aria-busy', 'true');
            element.setAttribute('aria-live', 'polite');
        } else {
            element.removeAttribute('aria-busy');
            element.removeAttribute('aria-live');
        }
    }
    
    // Error handling
    announceError(message) {
        this.announce(message, 'assertive');
        
        // Also add to error region if available
        const errorRegion = document.querySelector('[role="alert"]');
        if (errorRegion) {
            errorRegion.textContent = message;
        }
    }
    
    announceSuccess(message) {
        this.announce(message, 'polite');
    }
}

// Initialize accessibility manager
window.accessibilityManager = new AccessibilityManager();
```

#### Keyboard Navigation System

```javascript
class KeyboardNavigationManager {
    constructor() {
        this.shortcuts = new Map();
        this.contextualShortcuts = new Map();
        this.currentContext = 'global';
        
        this.setupGlobalShortcuts();
        this.setupContextualShortcuts();
        this.setupNavigationHelp();
    }
    
    setupGlobalShortcuts() {
        // Global keyboard shortcuts
        this.shortcuts.set('ctrl+s', {
            description: 'Save rundown',
            handler: () => window.rundownEditor?.autoSave?.performManualSave()
        });
        
        this.shortcuts.set('ctrl+p', {
            description: 'Print rundown',
            handler: () => window.print()
        });
        
        this.shortcuts.set('ctrl+z', {
            description: 'Undo last action',
            handler: () => this.handleUndo()
        });
        
        this.shortcuts.set('ctrl+y', {
            description: 'Redo last action', 
            handler: () => this.handleRedo()
        });
        
        this.shortcuts.set('escape', {
            description: 'Close modal or cancel action',
            handler: () => this.handleEscape()
        });
        
        this.shortcuts.set('?', {
            description: 'Show keyboard shortcuts help',
            handler: () => this.showKeyboardHelp()
        });
        
        this.shortcuts.set('ctrl+/', {
            description: 'Show keyboard shortcuts help',
            handler: () => this.showKeyboardHelp()
        });
    }
    
    setupContextualShortcuts() {
        // Segment editing context
        this.contextualShortcuts.set('segments', new Map([
            ['ctrl+n', {
                description: 'Add new segment',
                handler: () => this.addNewSegment()
            }],
            ['ctrl+d', {
                description: 'Duplicate selected segment',
                handler: () => this.duplicateSelectedSegment()
            }],
            ['delete', {
                description: 'Delete selected segment',
                handler: () => this.deleteSelectedSegment()
            }],
            ['ctrl+up', {
                description: 'Move segment up',
                handler: () => this.moveSegmentUp()
            }],
            ['ctrl+down', {
                description: 'Move segment down',
                handler: () => this.moveSegmentDown()
            }],
            ['ctrl+e', {
                description: 'Expand all segments',
                handler: () => this.expandAllSegments()
            }],
            ['ctrl+shift+e', {
                description: 'Collapse all segments',
                handler: () => this.collapseAllSegments()
            }]
        ]));
        
        // Modal context
        this.contextualShortcuts.set('modal', new Map([
            ['enter', {
                description: 'Submit form',
                handler: () => this.submitModal()
            }],
            ['escape', {
                description: 'Close modal',
                handler: () => this.closeModal()
            }]
        ]));
    }
    
    handleKeydown(e) {
        const key = this.normalizeKeyEvent(e);
        
        // Check contextual shortcuts first
        const contextShortcuts = this.contextualShortcuts.get(this.currentContext);
        if (contextShortcuts && contextShortcuts.has(key)) {
            e.preventDefault();
            const shortcut = contextShortcuts.get(key);
            shortcut.handler();
            this.announceShortcutUsed(shortcut.description);
            return;
        }
        
        // Check global shortcuts
        if (this.shortcuts.has(key)) {
            e.preventDefault();
            const shortcut = this.shortcuts.get(key);
            shortcut.handler();
            this.announceShortcutUsed(shortcut.description);
            return;
        }
    }
    
    normalizeKeyEvent(e) {
        const parts = [];
        
        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        
        const key = e.key.toLowerCase();
        parts.push(key);
        
        return parts.join('+');
    }
    
    showKeyboardHelp() {
        const helpModal = this.createKeyboardHelpModal();
        document.body.appendChild(helpModal);
        helpModal.style.display = 'flex';
        
        // Focus the first close button
        const closeButton = helpModal.querySelector('button');
        if (closeButton) closeButton.focus();
        
        // Set context to modal
        this.currentContext = 'modal';
        
        window.accessibilityManager.announce('Keyboard shortcuts help opened');
    }
    
    createKeyboardHelpModal() {
        const modal = document.createElement('div');
        modal.className = 'modal keyboard-help-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-labelledby', 'keyboard-help-title');
        modal.setAttribute('aria-modal', 'true');
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="keyboard-help-title">⌨️ Keyboard Shortcuts</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove(); window.keyboardNav.currentContext = 'global';">
                        <span aria-hidden="true">&times;</span>
                        <span class="sr-only">Close keyboard shortcuts help</span>
                    </button>
                </div>
                
                <div class="keyboard-shortcuts-content">
                    ${this.renderShortcutsHelp()}
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-primary" 
                            onclick="this.closest('.modal').remove(); window.keyboardNav.currentContext = 'global';">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }
    
    renderShortcutsHelp() {
        let html = '<div class="shortcuts-sections">';
        
        // Global shortcuts
        html += '<div class="shortcuts-section">';
        html += '<h3>Global Shortcuts</h3>';
        html += '<div class="shortcuts-list">';
        
        this.shortcuts.forEach((shortcut, key) => {
            html += `
                <div class="shortcut-item">
                    <div class="shortcut-keys">
                        ${this.renderKeyCombo(key)}
                    </div>
                    <div class="shortcut-description">
                        ${shortcut.description}
                    </div>
                </div>
            `;
        });
        
        html += '</div></div>';
        
        // Contextual shortcuts
        this.contextualShortcuts.forEach((shortcuts, context) => {
            html += `<div class="shortcuts-section">`;
            html += `<h3>${this.capitalizeContext(context)} Shortcuts</h3>`;
            html += '<div class="shortcuts-list">';
            
            shortcuts.forEach((shortcut, key) => {
                html += `
                    <div class="shortcut-item">
                        <div class="shortcut-keys">
                            ${this.renderKeyCombo(key)}
                        </div>
                        <div class="shortcut-description">
                            ${shortcut.description}
                        </div>
                    </div>
                `;
            });
            
            html += '</div></div>';
        });
        
        html += '</div>';
        return html;
    }
    
    renderKeyCombo(keyString) {
        const keys = keyString.split('+');
        return keys.map(key => {
            const displayKey = {
                'ctrl': 'Ctrl',
                'shift': 'Shift', 
                'alt': 'Alt',
                'enter': 'Enter',
                'escape': 'Esc',
                'delete': 'Del',
                'up': '↑',
                'down': '↓',
                'left': '←',
                'right': '→'
            }[key] || key.toUpperCase();
            
            return `<kbd>${displayKey}</kbd>`;
        }).join(' + ');
    }
    
    announceShortcutUsed(description) {
        window.accessibilityManager.announce(`Keyboard shortcut: ${description}`);
    }
}

// Initialize keyboard navigation
window.keyboardNav = new KeyboardNavigationManager();
document.addEventListener('keydown', window.keyboardNav.handleKeydown.bind(window.keyboardNav));
```

---

This technical architecture documentation provides comprehensive coverage of the VidPOD Rundown System implementation. The system follows modern web development best practices with emphasis on accessibility, performance, and maintainability.

Key architectural highlights:
- **Modular JavaScript**: Clean separation of concerns with dedicated modules
- **Progressive Enhancement**: Works without JavaScript, enhanced with it
- **Mobile-First Design**: Touch-optimized from ground up
- **WCAG 2.1 AA Compliance**: Full accessibility implementation
- **Performance Optimized**: GPU acceleration, efficient animations
- **Robust Auto-Save**: Conflict resolution, offline support
- **Comprehensive Testing**: Unit, integration, and e2e testing strategies

The system is designed to scale and can be extended with additional features while maintaining its core architecture principles.