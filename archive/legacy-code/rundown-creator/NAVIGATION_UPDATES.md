# 🧭 VidPOD Navigation Updates for Rundown Creator Integration

*Specific file updates to integrate rundown creator navigation into main VidPOD application*

---

## 📋 Overview

This document provides exact code changes needed to update the main VidPOD application navigation to include the rundown creator. All changes are designed to be non-breaking and backwards compatible.

---

## 🎯 File Updates Required

### 1. Student Dashboard (`frontend/dashboard.html`)

#### Update Navigation Menu (Lines 14-20)

**Current Code:**
```html
<div class="nav-menu">
    <a href="/dashboard.html" class="active">Dashboard</a>
    <a href="/stories.html">Browse Stories</a>
    <a href="/add-story.html">Add Story</a>
    <a href="/teacher-dashboard.html" id="teacherLink" style="display: none;">My Classes</a>
    <a href="/admin.html" id="adminLink" style="display: none;">Admin Panel</a>
</div>
```

**Updated Code:**
```html
<div class="nav-menu">
    <a href="/dashboard.html" class="active">Dashboard</a>
    <a href="/stories.html">Browse Stories</a>
    <a href="/add-story.html">Add Story</a>
    <a href="#" id="rundownLink" class="rundown-nav-link" onclick="openRundownCreator()">📻 Rundown Creator</a>
    <a href="/teacher-dashboard.html" id="teacherLink" style="display: none;">My Classes</a>
    <a href="/admin.html" id="adminLink" style="display: none;">Admin Panel</a>
</div>
```

#### Add Quick Action Card (Around Line 75)

**Insert after existing action cards:**
```html
<!-- ADD THIS NEW CARD AFTER BROWSE STORIES CARD -->
<a href="#" class="action-card rundown-action" onclick="openRundownCreator()">
    <div class="action-icon">📻</div>
    <h3>Create Rundown</h3>
    <p>Plan your podcast episode structure</p>
</a>
```

#### Add Stats Card (Around Line 38)

**Insert after existing stat cards:**
```html
<!-- ADD THIS AFTER EXISTING STAT CARDS -->
<div class="stat-card" id="rundownStatsCard" style="display: none;">
    <div class="stat-icon">📻</div>
    <div class="stat-content">
        <h3 id="myRundownsCount">0</h3>
        <p>My Rundowns</p>
    </div>
</div>
```

### 2. Teacher Dashboard (`frontend/teacher-dashboard.html`)

#### Update Navigation Menu (Lines 14-18)

**Current Code:**
```html
<div class="nav-menu">
    <a href="/dashboard.html">Stories</a>
    <a href="/teacher-dashboard.html" class="active">My Classes</a>
    <a href="/add-story.html">Add Story</a>
</div>
```

**Updated Code:**
```html
<div class="nav-menu">
    <a href="/dashboard.html">Stories</a>
    <a href="/teacher-dashboard.html" class="active">My Classes</a>
    <a href="/add-story.html">Add Story</a>
    <a href="#" class="rundown-nav-link" onclick="openRundownCreator()">📻 Rundown Creator</a>
</div>
```

#### Add Rundown Management Section (After Line 85)

**Insert after the create class section:**
```html
<!-- RUNDOWN MANAGEMENT SECTION -->
<div class="action-card rundown-management">
    <h3>📻 Podcast Rundown Management</h3>
    <div class="rundown-info">
        <p>Manage student podcast rundowns and approve episode plans. Monitor rundown creation activity and provide feedback on episode structures.</p>
        
        <div class="rundown-stats-preview" id="rundownStatsPreview" style="display: none;">
            <div class="stats-row">
                <div class="stat-mini">
                    <span class="stat-value" id="teacherTotalRundowns">0</span>
                    <span class="stat-label">Student Rundowns</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-value" id="teacherPendingApprovals">0</span>
                    <span class="stat-label">Pending Approvals</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-value" id="teacherAvgLength">0</span>
                    <span class="stat-label">Avg. Length (min)</span>
                </div>
            </div>
        </div>
        
        <div class="button-group">
            <button class="btn btn-primary" onclick="openRundownCreator()">
                ✨ Access Rundown Creator
            </button>
            <button class="btn btn-secondary" onclick="openRundownAnalytics()" id="analyticsBtn" style="display: none;">
                📊 View Analytics
            </button>
        </div>
    </div>
</div>
```

### 3. Main CSS Updates (`frontend/css/styles.css`)

#### Add Rundown Integration Styles

**Append to the end of the CSS file:**
```css
/* ================================
   RUNDOWN CREATOR INTEGRATION STYLES
   ================================ */

/* Navigation Links */
.rundown-nav-link {
    background: linear-gradient(135deg, #f79b5b, #e58a4b) !important;
    color: white !important;
    border-radius: 6px;
    padding: 0.5rem 1rem;
    text-decoration: none;
    transition: all 0.3s ease;
    border: 2px solid transparent;
    font-weight: 500;
}

.rundown-nav-link:hover {
    background: linear-gradient(135deg, #e58a4b, #d67e40) !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    color: white !important;
}

/* Action Cards */
.rundown-action {
    background: linear-gradient(135deg, #f79b5b, #04362a);
    color: white;
    border: none;
    text-decoration: none !important;
}

.rundown-action:hover {
    background: linear-gradient(135deg, #e58a4b, #032a20);
    transform: translateY(-2px);
    color: white !important;
}

.rundown-action .action-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
}

.rundown-action h3,
.rundown-action p {
    color: white !important;
}

/* Teacher Rundown Management */
.rundown-management {
    background: linear-gradient(135deg, #f79b5b, #04362a);
    color: white;
    padding: 2rem;
    border-radius: 12px;
    margin: 1.5rem 0;
    border: none;
}

.rundown-management h3 {
    color: white !important;
    margin-bottom: 1rem;
    font-size: 1.5rem;
}

.rundown-management p {
    color: rgba(255, 255, 255, 0.9) !important;
    margin-bottom: 1.5rem;
    line-height: 1.6;
}

.rundown-info {
    width: 100%;
}

/* Stats Preview */
.rundown-stats-preview {
    margin: 1.5rem 0;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    backdrop-filter: blur(10px);
}

.stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
}

.stat-mini {
    text-align: center;
    padding: 0.5rem;
}

.stat-mini .stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
    color: white;
    margin-bottom: 0.25rem;
}

.stat-mini .stat-label {
    display: block;
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.8);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Button Group */
.button-group {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 1rem;
}

.rundown-management .btn {
    background: rgba(255, 255, 255, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.3);
    color: white !important;
    backdrop-filter: blur(10px);
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.3s ease;
}

.rundown-management .btn:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.rundown-management .btn-primary {
    background: rgba(255, 255, 255, 0.9);
    color: #f79b5b !important;
    border-color: rgba(255, 255, 255, 0.9);
}

.rundown-management .btn-primary:hover {
    background: white;
    color: #e58a4b !important;
}

/* Rundown Stats Card */
#rundownStatsCard {
    background: linear-gradient(135deg, #f79b5b, #e58a4b);
    color: white;
    border: none;
}

#rundownStatsCard .stat-icon {
    color: white;
    font-size: 2rem;
}

#rundownStatsCard .stat-content h3,
#rundownStatsCard .stat-content p {
    color: white !important;
}

/* Loading States */
.rundown-loading {
    opacity: 0.7;
    pointer-events: none;
}

.rundown-loading::after {
    content: '⏳';
    margin-left: 0.5rem;
}

/* Error States */
.rundown-error {
    background: linear-gradient(135deg, #f56565, #e53e3e) !important;
}

.rundown-unavailable {
    opacity: 0.5;
    cursor: not-allowed;
}

.rundown-unavailable:hover {
    transform: none !important;
}

/* Responsive Design */
@media (max-width: 768px) {
    .button-group {
        flex-direction: column;
    }
    
    .button-group .btn {
        width: 100%;
        text-align: center;
    }
    
    .stats-row {
        grid-template-columns: 1fr;
        gap: 0.5rem;
    }
    
    .rundown-management {
        padding: 1.5rem;
    }
    
    .rundown-nav-link {
        padding: 0.4rem 0.8rem;
        font-size: 0.875rem;
    }
}

/* Mobile specific */
@media (max-width: 480px) {
    .rundown-stats-preview {
        margin: 1rem 0;
        padding: 0.75rem;
    }
    
    .stat-mini .stat-value {
        font-size: 1.25rem;
    }
    
    .stat-mini .stat-label {
        font-size: 0.75rem;
    }
}
```

### 4. JavaScript Integration (`frontend/js/dashboard.js`)

#### Add Integration Functions

**Append to the end of dashboard.js:**
```javascript
// ================================
// RUNDOWN CREATOR INTEGRATION
// ================================

// Global rundown integration configuration
const RUNDOWN_CONFIG = {
    // Update these URLs based on your deployment
    development: 'http://localhost:3001',
    production: 'https://rundown-creator-production.up.railway.app', // Update with your actual URL
    healthCheckTimeout: 5000,
    cacheTimeout: 300000 // 5 minutes
};

// Cache for rundown data
const rundownCache = new Map();

/**
 * Get the correct rundown creator URL based on environment
 */
function getRundownCreatorUrl() {
    const hostname = window.location.hostname;
    
    // Determine environment based on hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return RUNDOWN_CONFIG.development;
    } else {
        return RUNDOWN_CONFIG.production;
    }
}

/**
 * Open rundown creator with SSO token
 */
function openRundownCreator() {
    const token = localStorage.getItem('token');
    const rundownUrl = getRundownCreatorUrl();
    
    if (!token) {
        showNotification('Please login first', 'error');
        return;
    }
    
    // Add token to URL for SSO
    const urlWithToken = `${rundownUrl}?token=${encodeURIComponent(token)}`;
    
    // Open in new tab
    window.open(urlWithToken, '_blank', 'noopener,noreferrer');
    
    // Track usage
    trackRundownAccess();
}

/**
 * Open rundown analytics for teachers
 */
function openRundownAnalytics() {
    const rundownUrl = getRundownCreatorUrl();
    const analyticsUrl = `${rundownUrl}/analytics`;
    window.open(analyticsUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Check if rundown creator is available
 */
async function checkRundownCreatorHealth() {
    try {
        const response = await fetch(`${getRundownCreatorUrl()}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(RUNDOWN_CONFIG.healthCheckTimeout)
        });
        return response.ok;
    } catch (error) {
        console.log('Rundown creator health check failed:', error);
        return false;
    }
}

/**
 * Load rundown statistics for dashboard
 */
async function loadRundownStats() {
    const user = getCurrentUser();
    if (!user) return;
    
    try {
        // Check cache first
        const cacheKey = `rundown-stats-${user.id}`;
        const cached = rundownCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < RUNDOWN_CONFIG.cacheTimeout) {
            updateRundownStatsUI(cached.data);
            return;
        }
        
        // Fetch fresh data
        const response = await fetch(`${getRundownCreatorUrl()}/api/rundowns`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            signal: AbortSignal.timeout(RUNDOWN_CONFIG.healthCheckTimeout)
        });
        
        if (response.ok) {
            const rundowns = await response.json();
            const stats = {
                total: rundowns.length,
                pending: rundowns.filter(r => r.status === 'pending').length,
                approved: rundowns.filter(r => r.status === 'approved').length
            };
            
            // Cache the data
            rundownCache.set(cacheKey, {
                data: stats,
                timestamp: Date.now()
            });
            
            updateRundownStatsUI(stats);
        }
    } catch (error) {
        console.log('Failed to load rundown stats:', error);
        hideRundownStatsCard();
    }
}

/**
 * Load teacher rundown analytics
 */
async function loadTeacherRundownStats() {
    const user = getCurrentUser();
    if (!user || user.role !== 'teacher') return;
    
    try {
        const response = await fetch(`${getRundownCreatorUrl()}/api/analytics`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const analytics = await response.json();
            updateTeacherRundownStatsUI(analytics);
        }
    } catch (error) {
        console.log('Failed to load teacher rundown analytics:', error);
    }
}

/**
 * Update rundown stats UI for students
 */
function updateRundownStatsUI(stats) {
    const statsCard = document.getElementById('rundownStatsCard');
    const countElement = document.getElementById('myRundownsCount');
    
    if (statsCard && countElement) {
        countElement.textContent = stats.total || 0;
        statsCard.style.display = 'block';
        
        // Update title with additional info if available
        if (stats.pending > 0) {
            countElement.parentElement.querySelector('p').textContent = 
                `My Rundowns (${stats.pending} pending)`;
        }
    }
}

/**
 * Update teacher rundown stats UI
 */
function updateTeacherRundownStatsUI(analytics) {
    const elements = {
        total: document.getElementById('teacherTotalRundowns'),
        pending: document.getElementById('teacherPendingApprovals'),
        avgLength: document.getElementById('teacherAvgLength'),
        preview: document.getElementById('rundownStatsPreview'),
        analyticsBtn: document.getElementById('analyticsBtn')
    };
    
    // Update if elements exist
    if (elements.total) elements.total.textContent = analytics.total_rundowns || 0;
    if (elements.pending) elements.pending.textContent = analytics.pending_approval || 0;
    if (elements.avgLength) elements.avgLength.textContent = Math.round(analytics.avg_duration || 0);
    if (elements.preview) elements.preview.style.display = 'block';
    if (elements.analyticsBtn) elements.analyticsBtn.style.display = 'inline-block';
}

/**
 * Hide rundown stats card
 */
function hideRundownStatsCard() {
    const statsCard = document.getElementById('rundownStatsCard');
    if (statsCard) {
        statsCard.style.display = 'none';
    }
}

/**
 * Track rundown creator access for analytics
 */
function trackRundownAccess() {
    // Simple analytics tracking
    const accessData = {
        timestamp: new Date().toISOString(),
        user: getCurrentUser()?.id,
        source: 'main-dashboard'
    };
    
    // Store locally for potential batch sending
    const accessLog = JSON.parse(localStorage.getItem('rundown_access_log') || '[]');
    accessLog.push(accessData);
    
    // Keep only last 50 accesses
    if (accessLog.length > 50) {
        accessLog.splice(0, accessLog.length - 50);
    }
    
    localStorage.setItem('rundown_access_log', JSON.stringify(accessLog));
}

/**
 * Initialize rundown integration
 */
async function initializeRundownIntegration() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Check if rundown creator is available
    const isHealthy = await checkRundownCreatorHealth();
    
    if (isHealthy) {
        // Load appropriate stats based on user role
        if (user.role === 'teacher') {
            loadTeacherRundownStats();
        } else {
            loadRundownStats();
        }
        
        // Show rundown elements
        const rundownElements = document.querySelectorAll('.rundown-nav-link, .rundown-action');
        rundownElements.forEach(el => {
            el.style.display = 'block';
            el.classList.remove('rundown-unavailable');
        });
    } else {
        // Hide or disable rundown elements
        const rundownElements = document.querySelectorAll('.rundown-nav-link, .rundown-action');
        rundownElements.forEach(el => {
            el.classList.add('rundown-unavailable');
            el.onclick = () => {
                showNotification('Rundown Creator is currently unavailable', 'warning');
            };
        });
        
        hideRundownStatsCard();
    }
}

/**
 * Debug function for troubleshooting
 */
window.debugRundownIntegration = function() {
    console.log('=== Rundown Creator Integration Debug ===');
    console.log('User:', getCurrentUser());
    console.log('Token:', localStorage.getItem('token'));
    console.log('Rundown URL:', getRundownCreatorUrl());
    console.log('Cache:', Array.from(rundownCache.entries()));
    
    // Test connectivity
    checkRundownCreatorHealth()
        .then(healthy => console.log('Health Check:', healthy))
        .catch(err => console.error('Health Check Error:', err));
};

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRundownIntegration);
} else {
    initializeRundownIntegration();
}

// Re-initialize when user data changes
const originalSetCurrentUser = window.setCurrentUser;
if (typeof originalSetCurrentUser === 'function') {
    window.setCurrentUser = function(user) {
        originalSetCurrentUser(user);
        setTimeout(initializeRundownIntegration, 100);
    };
}
```

### 5. Teacher Dashboard JavaScript (`frontend/js/teacher-dashboard.js`)

#### Add to existing teacher-dashboard.js file

**Append these functions:**
```javascript
// ================================
// RUNDOWN CREATOR INTEGRATION FOR TEACHERS
// ================================

// Import integration functions from dashboard.js or redefine
if (typeof getRundownCreatorUrl === 'undefined') {
    // Redefine if not available
    function getRundownCreatorUrl() {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        } else {
            return 'https://rundown-creator-production.up.railway.app';
        }
    }
    
    function openRundownCreator() {
        const token = localStorage.getItem('token');
        const rundownUrl = getRundownCreatorUrl();
        
        if (!token) {
            showErrorMessage('Please login first');
            return;
        }
        
        const urlWithToken = `${rundownUrl}?token=${encodeURIComponent(token)}`;
        window.open(urlWithToken, '_blank', 'noopener,noreferrer');
    }
    
    function openRundownAnalytics() {
        const rundownUrl = getRundownCreatorUrl();
        const analyticsUrl = `${rundownUrl}/analytics`;
        window.open(analyticsUrl, '_blank', 'noopener,noreferrer');
    }
}

// Load teacher-specific rundown data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadTeacherRundownData();
});

async function loadTeacherRundownData() {
    try {
        // Check if rundown creator is available
        const healthResponse = await fetch(`${getRundownCreatorUrl()}/health`, {
            signal: AbortSignal.timeout(5000)
        });
        
        if (!healthResponse.ok) {
            console.log('Rundown creator not available');
            return;
        }
        
        // Load teacher analytics
        const response = await fetch(`${getRundownCreatorUrl()}/api/analytics`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const analytics = await response.json();
            updateTeacherRundownUI(analytics);
        }
    } catch (error) {
        console.log('Failed to load teacher rundown data:', error);
    }
}

function updateTeacherRundownUI(analytics) {
    // Update stats if elements exist
    const totalElement = document.getElementById('teacherTotalRundowns');
    const pendingElement = document.getElementById('teacherPendingApprovals');
    const avgElement = document.getElementById('teacherAvgLength');
    const previewElement = document.getElementById('rundownStatsPreview');
    const analyticsBtn = document.getElementById('analyticsBtn');
    
    if (totalElement) totalElement.textContent = analytics.summary?.total_rundowns || 0;
    if (pendingElement) pendingElement.textContent = analytics.summary?.pending_review || 0;
    if (avgElement) avgElement.textContent = Math.round(analytics.summary?.avg_duration || 0);
    
    // Show preview section
    if (previewElement) previewElement.style.display = 'block';
    if (analyticsBtn) analyticsBtn.style.display = 'inline-block';
}
```

---

## 🧪 Testing Your Updates

### Quick Test Checklist

After making these updates, test the following:

```
□ Navigation links appear on all dashboards
□ Clicking "Rundown Creator" opens new tab with rundown creator
□ Rundown creator loads with authentication (no second login required)
□ Stats cards show appropriate data when rundown creator is available
□ Graceful degradation when rundown creator is unavailable
□ Mobile responsive design works correctly
□ No JavaScript errors in browser console
```

### Browser Console Test

**Run in browser console to verify:**
```javascript
// Check if functions are available
console.log('getRundownCreatorUrl:', typeof getRundownCreatorUrl);
console.log('openRundownCreator:', typeof openRundownCreator);

// Test URL generation
console.log('Rundown URL:', getRundownCreatorUrl());

// Check authentication
console.log('Token available:', !!localStorage.getItem('token'));

// Test health check
checkRundownCreatorHealth().then(healthy => console.log('Healthy:', healthy));
```

---

## 🚀 Deployment Notes

### Environment-Specific URLs

**Update the production URL in JavaScript files:**
```javascript
// In the RUNDOWN_CONFIG object and getRundownCreatorUrl function
production: 'https://your-actual-rundown-creator-url.up.railway.app'
```

### Cache Clearing

After deploying updates, users may need to clear their browser cache to see changes. Consider:

1. **Hard refresh:** Ctrl+F5 or Cmd+Shift+R
2. **Cache headers:** Add cache-busting parameters to CSS/JS files
3. **Service worker:** Update if using service workers

### Progressive Enhancement

These updates are designed to gracefully degrade:
- If rundown creator is unavailable, links show appropriate messages
- Stats cards hide when data cannot be loaded
- No JavaScript errors break existing functionality

---

This navigation update provides seamless integration while maintaining the independence of both applications. Users will experience a unified interface while developers can work on each service independently.