// Enhanced Admin JavaScript with comprehensive debugging and error handling
// Use global window.API_URL from auth.js (no redeclaration)

// Global variables
let currentUser = null;
let allTags = [];
let allSchools = [];
let teacherRequests = [];
let currentRequestId = null;

// Debug flag - disabled in production
const DEBUG_MODE = false;

// Enhanced logging function
function debugLog(message, data = null) {
    if (DEBUG_MODE) {
        console.log(`🔍 [ADMIN-DEBUG] ${message}`);
        if (data) {
            console.log('📊 Data:', data);
        }
    }
}

// Enhanced error logging
function debugError(message, error = null) {
    console.error(`❌ [ADMIN-ERROR] ${message}`);
    if (error) {
        console.error('🚨 Error Details:', error);
    }
    // Show user-friendly error
    showError(message);
}

// API call wrapper with enhanced error handling
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        throw new Error('No authentication token found');
    }
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    debugLog(`API Call: ${endpoint}`, finalOptions);
    
    try {
        const response = await fetch(`${window.API_URL}${endpoint}`, finalOptions);
        
        debugLog(`API Response: ${endpoint}`, {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            debugError(`API call failed: ${endpoint}`, {
                status: response.status,
                statusText: response.statusText,
                response: errorText
            });
            throw new Error(`API Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        debugLog(`API Success: ${endpoint}`, data);
        return data;
        
    } catch (error) {
        debugError(`API Network Error: ${endpoint}`, error);
        throw error;
    }
}

// Initialize page with comprehensive error handling
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('Admin page DOMContentLoaded event fired');
    
    try {
        // Step 1: Check authentication
        debugLog('Step 1: Checking authentication...');
        if (!checkAuth()) {
            debugError('Authentication check failed');
            return;
        }
        debugLog('✅ Authentication check passed');
        
        // Step 2: Load user information
        debugLog('Step 2: Loading user information...');
        await loadUserInfo();
        debugLog('✅ User information loaded');
        
        // Step 3: Verify DOM elements exist
        debugLog('Step 3: Verifying DOM elements...');
        const requiredElements = verifyDOMElements();
        if (!requiredElements.allPresent) {
            debugError('Some required DOM elements are missing', requiredElements.missing);
        }
        debugLog('✅ DOM elements verified');
        
        // Step 4: Load initial data
        debugLog('Step 4: Loading initial data...');
        await loadInitialDataEnhanced();
        debugLog('✅ Initial data loaded');
        
        // Step 5: Setup event listeners
        debugLog('Step 5: Setting up event listeners...');
        setupEventListeners();
        debugLog('✅ Event listeners setup complete');
        
        // Step 6: Show default tab
        debugLog('Step 6: Showing default tab...');
        window.showTab('overview');
        debugLog('✅ Default tab shown');
        
        debugLog('🎉 Admin page initialization completed successfully');
        showSuccess('Admin panel loaded successfully!');
        
    } catch (error) {
        debugError('Critical error during admin page initialization', error);
        showError('Failed to initialize admin panel. Please check console for details and refresh the page.');
    }
});

// Enhanced authentication check
function checkAuth() {
    debugLog('Checking authentication...');
    
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    debugLog('Token present:', !!token);
    debugLog('User data present:', !!userStr);
    
    if (!token) {
        debugError('No token found, redirecting to login');
        window.location.href = '/index.html';
        return false;
    }
    
    if (!userStr) {
        debugError('No user data found, redirecting to login');
        localStorage.removeItem('token'); // Clean up invalid state
        window.location.href = '/index.html';
        return false;
    }
    
    try {
        const user = JSON.parse(userStr);
        debugLog('User role:', user.role);
        
        if (user.role !== 'admin' && user.role !== 'amitrace_admin') {
            debugError(`User role "${user.role}" does not have admin privileges`);
            window.location.href = '/dashboard.html';
            return false;
        }
        
        return true;
    } catch (error) {
        debugError('Invalid user data in localStorage', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
        return false;
    }
}

// Verify required DOM elements exist
function verifyDOMElements() {
    const requiredElements = [
        'userInfo',
        'tagsList',
        'storiesApprovalTable',
        'totalTags',
        'pendingStories',
        'approvedStories',
        'totalStories',
        'totalSchools',
        'totalUsers'
    ];
    
    const missing = [];
    const present = [];
    
    requiredElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            present.push(elementId);
        } else {
            missing.push(elementId);
        }
    });
    
    debugLog('DOM Elements Check', {
        present: present,
        missing: missing,
        allPresent: missing.length === 0
    });
    
    return {
        allPresent: missing.length === 0,
        missing: missing,
        present: present
    };
}

// Enhanced user info loading
async function loadUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        currentUser = user;
        
        debugLog('Current user loaded', {
            username: user.username,
            role: user.role,
            email: user.email,
            id: user.id
        });
        
        // Update UI
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            const displayName = user.name || user.email || user.username || 'User';
            userInfoElement.textContent = `${displayName} (${user.role})`;
            debugLog('User info UI updated');
        } else {
            debugError('userInfo element not found');
        }
        
        // Verify token with backend
        debugLog('Verifying token with backend...');
        try {
            await apiCall('/auth/verify');
            debugLog('✅ Token verification successful');
        } catch (error) {
            debugError('Token verification failed, logging out', error);
            logout();
            throw error;
        }
        
    } catch (error) {
        debugError('Error loading user info', error);
        throw error;
    }
}

// Enhanced initial data loading with better error handling
async function loadInitialDataEnhanced() {
    debugLog('Starting initial data load...');
    
    const loadPromises = [
        loadTagsEnhanced(),
        loadStoriesEnhanced(), 
        loadStatisticsEnhanced()
    ];
    
    const results = await Promise.allSettled(loadPromises);
    
    results.forEach((result, index) => {
        const taskNames = ['loadTags', 'loadStories', 'loadStatistics'];
        if (result.status === 'fulfilled') {
            debugLog(`✅ ${taskNames[index]} completed successfully`);
        } else {
            debugError(`❌ ${taskNames[index]} failed`, result.reason);
        }
    });
    
    debugLog('Initial data loading completed');
}

// Enhanced tags loading
async function loadTagsEnhanced() {
    debugLog('Loading tags...');
    
    try {
        const tags = await apiCall('/tags');
        allTags = tags;
        
        debugLog(`Tags loaded successfully: ${tags.length} tags`, tags);
        
        // Update UI
        displayTagsEnhanced(tags);
        
        // Update statistics
        const totalTagsElement = document.getElementById('totalTags');
        if (totalTagsElement) {
            totalTagsElement.textContent = tags.length;
            debugLog(`Updated totalTags element: ${tags.length}`);
        }
        
        return tags;
        
    } catch (error) {
        debugError('Failed to load tags', error);
        
        // Update UI with error state
        const tagsList = document.getElementById('tagsList');
        if (tagsList) {
            tagsList.innerHTML = '<div class="error-state">Failed to load tags. Check console for details.</div>';
        }
        
        throw error;
    }
}

// Enhanced tag display function
function displayTagsEnhanced(tags) {
    debugLog(`Displaying ${tags.length} tags`);
    
    const tagsList = document.getElementById('tagsList');
    if (!tagsList) {
        debugError('tagsList element not found');
        return;
    }
    
    if (tags.length === 0) {
        tagsList.innerHTML = '<div class="no-data">No tags found. Add some tags using the form above.</div>';
        debugLog('Displayed empty state for tags');
        return;
    }
    
    const tagsHTML = tags.map(tag => `
        <div class="tag-item">
            <span>${tag.tag_name}</span>
            <button class="tag-delete" onclick="deleteTag(${tag.id})" title="Delete tag">×</button>
        </div>
    `).join('');
    
    tagsList.innerHTML = tagsHTML;
    debugLog('✅ Tags displayed successfully in DOM');
}

// Enhanced stories loading for approval
async function loadStoriesEnhanced(status = 'pending') {
    debugLog(`Loading stories with status: ${status}`);
    
    try {
        const endpoint = `/stories/admin/by-status/${status}`;
        const stories = await apiCall(endpoint);
        
        debugLog(`Stories loaded successfully: ${stories.length} stories`, stories);
        
        // Update UI
        displayStoriesForApprovalEnhanced(stories);
        
        return stories;
        
    } catch (error) {
        debugError(`Failed to load stories with status: ${status}`, error);
        
        // Update UI with error state
        const storiesTable = document.getElementById('storiesApprovalTable');
        if (storiesTable) {
            storiesTable.innerHTML = '<tr><td colspan="6" class="error-state">Failed to load stories. Check console for details.</td></tr>';
        }
        
        throw error;
    }
}

// Enhanced story display function
function displayStoriesForApprovalEnhanced(stories) {
    debugLog(`Displaying ${stories.length} stories for approval`);
    
    const table = document.getElementById('storiesApprovalTable');
    if (!table) {
        debugError('storiesApprovalTable element not found');
        return;
    }
    
    if (stories.length === 0) {
        table.innerHTML = '<tr><td colspan="6" class="no-data">No stories found for the selected status.</td></tr>';
        debugLog('Displayed empty state for stories');
        return;
    }
    
    const storiesHTML = stories.map(story => `
        <tr>
            <td>
                <div class="story-title-cell">
                    <strong>${story.idea_title}</strong>
                    <br><small>ID: ${story.id}</small>
                </div>
            </td>
            <td>
                <div class="story-author-cell">
                    ${story.uploaded_by_name || 'Unknown'}
                    <br><small>${story.uploaded_by_email || ''}</small>
                </div>
            </td>
            <td>
                <span class="status-badge status-${story.approval_status}">
                    ${story.approval_status}
                </span>
            </td>
            <td>${formatDate(story.submitted_at || story.uploaded_date)}</td>
            <td>
                <div class="story-description-cell">
                    ${story.idea_description ? 
                        (story.idea_description.length > 100 ? 
                            story.idea_description.substring(0, 100) + '...' : 
                            story.idea_description) 
                        : 'No description'}
                </div>
            </td>
            <td class="table-actions">
                <button class="btn btn-small btn-secondary" onclick="viewStoryDetails(${story.id})" title="View story details">View</button>
                ${story.approval_status === 'pending' ? `
                    <button class="btn btn-small btn-success" onclick="showStoryApprovalModal(${story.id})" title="Approve story">Approve</button>
                    <button class="btn btn-small btn-danger" onclick="showStoryRejectionModal(${story.id})" title="Reject story">Reject</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
    
    table.innerHTML = storiesHTML;
    debugLog('✅ Stories displayed successfully in DOM');
}

// Enhanced statistics loading
async function loadStatisticsEnhanced() {
    debugLog('Loading statistics...');
    
    try {
        // Load multiple statistics in parallel
        const [storiesStats, allStories] = await Promise.all([
            apiCall('/stories/admin/stats'),
            apiCall('/stories')
        ]);
        
        debugLog('Statistics loaded', { storiesStats, totalStories: allStories.length });
        
        // Update statistics UI
        updateStatisticsUI({
            totalStories: allStories.length,
            pendingStories: storiesStats.pending || 0,
            approvedStories: storiesStats.approved || 0,
            totalTags: allTags.length
        });
        
        return { storiesStats, allStories };
        
    } catch (error) {
        debugError('Failed to load statistics', error);
        
        // Update UI with fallback values
        updateStatisticsUI({
            totalStories: '—',
            pendingStories: '—',
            approvedStories: '—',
            totalTags: allTags.length
        });
        
        throw error;
    }
}

// Update statistics UI
function updateStatisticsUI(stats) {
    const elements = [
        { id: 'totalStories', value: stats.totalStories },
        { id: 'pendingStories', value: stats.pendingStories },
        { id: 'approvedStories', value: stats.approvedStories },
        { id: 'totalTags', value: stats.totalTags }
    ];
    
    elements.forEach(({ id, value }) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            debugLog(`Updated ${id}: ${value}`);
        } else {
            debugError(`Element ${id} not found`);
        }
    });
}

// Make key functions globally available with enhanced versions
window.showTab = function(tabName) {
    debugLog(`showTab called: ${tabName}`);
    
    try {
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        debugLog(`Found ${tabContents.length} tab contents`);
        tabContents.forEach(tab => tab.classList.remove('active'));
        
        // Remove active class from all buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        debugLog(`Found ${tabButtons.length} tab buttons`);
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        // Show selected tab
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
            debugLog(`Activated tab: ${tabName}-tab`);
        } else {
            debugError(`Target tab not found: ${tabName}-tab`);
            return;
        }
        
        // Add active class to correct button
        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach((btn, index) => {
            const tabMapping = {
                0: 'overview',
                1: 'schools', 
                2: 'teachers',
                3: 'stories',
                4: 'tags'
            };
            
            if (tabMapping[index] === tabName) {
                btn.classList.add('active');
                debugLog(`Activated button for ${tabName}`);
            }
        });
        
        // Load tab-specific data
        loadTabData(tabName);
        
    } catch (error) {
        debugError('Error in showTab function', error);
    }
};

// Load tab-specific data
async function loadTabData(tabName) {
    debugLog(`Loading data for tab: ${tabName}`);
    
    try {
        switch(tabName) {
            case 'tags':
                await loadTagsEnhanced();
                break;
            case 'stories':
                await loadStoriesEnhanced('pending');
                break;
            case 'overview':
                await loadStatisticsEnhanced();
                break;
            default:
                debugLog(`No specific data loading for tab: ${tabName}`);
        }
    } catch (error) {
        debugError(`Error loading data for tab: ${tabName}`, error);
    }
}

// Make other functions globally available
window.loadStoriesForApproval = loadStoriesEnhanced;
window.deleteTag = async function(tagId) {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    
    try {
        await apiCall(`/tags/${tagId}`, { method: 'DELETE' });
        showSuccess('Tag deleted successfully!');
        await loadTagsEnhanced();
    } catch (error) {
        debugError('Failed to delete tag', error);
    }
};

// Enhanced utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

function showError(message) {
    debugError(message);
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 8000);
    } else {
        alert('Error: ' + message);
    }
}

function showSuccess(message) {
    debugLog(message);
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => successDiv.style.display = 'none', 5000);
    }
}

// Setup event listeners (stub - add more as needed)
function setupEventListeners() {
    debugLog('Setting up event listeners...');
    
    // Tab button listeners as backup
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach((btn, index) => {
        btn.addEventListener('click', function() {
            const tabNames = ['overview', 'schools', 'teachers', 'stories', 'tags'];
            window.showTab(tabNames[index]);
        });
    });
    
    debugLog(`Attached event listeners to ${tabButtons.length} tab buttons`);
}

// Global error handlers
window.addEventListener('error', function(e) {
    debugError('Global JavaScript Error', {
        message: e.message,
        source: e.filename,
        line: e.lineno,
        column: e.colno,
        error: e.error
    });
});

window.addEventListener('unhandledrejection', function(e) {
    debugError('Unhandled Promise Rejection', e.reason);
});

// Bulk approval functions
window.adminBulkApprove = async function() {
    const selectedStories = getSelectedStories();
    if (selectedStories.length === 0) {
        showError('No stories selected');
        return;
    }
    
    if (!confirm(`Approve ${selectedStories.length} selected stories?`)) return;
    
    try {
        for (const storyId of selectedStories) {
            await apiCall(`/stories/${storyId}/approve`, { method: 'PUT' });
        }
        showSuccess(`${selectedStories.length} stories approved successfully!`);
        await loadStoriesEnhanced('pending');
        clearSelection();
    } catch (error) {
        debugError('Failed to bulk approve stories', error);
    }
};

window.adminBulkReject = async function() {
    const selectedStories = getSelectedStories();
    if (selectedStories.length === 0) {
        showError('No stories selected');
        return;
    }
    
    if (!confirm(`Reject ${selectedStories.length} selected stories?`)) return;
    
    try {
        for (const storyId of selectedStories) {
            await apiCall(`/stories/${storyId}/reject`, { method: 'PUT' });
        }
        showSuccess(`${selectedStories.length} stories rejected successfully!`);
        await loadStoriesEnhanced('pending');
        clearSelection();
    } catch (error) {
        debugError('Failed to bulk reject stories', error);
    }
};

window.adminBulkDelete = async function() {
    const selectedStories = getSelectedStories();
    if (selectedStories.length === 0) {
        showError('No stories selected');
        return;
    }
    
    if (!confirm(`DELETE ${selectedStories.length} selected stories? This cannot be undone!`)) return;
    
    try {
        for (const storyId of selectedStories) {
            await apiCall(`/stories/${storyId}`, { method: 'DELETE' });
        }
        showSuccess(`${selectedStories.length} stories deleted successfully!`);
        await loadStoriesEnhanced();
        clearSelection();
    } catch (error) {
        debugError('Failed to bulk delete stories', error);
    }
};

// Helper functions for selection
function getSelectedStories() {
    const checkboxes = document.querySelectorAll('#storiesApprovalTable input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value).filter(id => id);
}

function clearSelection() {
    const checkboxes = document.querySelectorAll('#storiesApprovalTable input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
    document.getElementById('adminSelectAllStories').checked = false;
    updateBulkActionsVisibility();
}

window.toggleAdminSelectAllStories = function() {
    const selectAll = document.getElementById('adminSelectAllStories');
    const checkboxes = document.querySelectorAll('#storiesApprovalTable input[type="checkbox"]');
    
    checkboxes.forEach(cb => {
        if (cb !== selectAll) {
            cb.checked = selectAll.checked;
        }
    });
    
    updateBulkActionsVisibility();
};

function updateBulkActionsVisibility() {
    const selectedCount = getSelectedStories().length;
    const bulkActionsBar = document.getElementById('adminBulkActions');
    const countSpan = document.getElementById('adminSelectedCount');
    
    if (bulkActionsBar) {
        bulkActionsBar.style.display = selectedCount > 0 ? 'block' : 'none';
    }
    
    if (countSpan) {
        countSpan.textContent = selectedCount;
    }
}

// Individual story approval functions
window.showStoryApprovalModal = function(storyId) {
    debugLog(`Showing approval modal for story ${storyId}`);
    if (confirm('Approve this story?')) {
        approveStory(storyId);
    }
};

window.showStoryRejectionModal = function(storyId) {
    debugLog(`Showing rejection modal for story ${storyId}`);
    const reason = prompt('Reason for rejection (optional):');
    if (reason !== null) { // User didn't cancel
        rejectStory(storyId, reason);
    }
};

async function approveStory(storyId) {
    try {
        await apiCall(`/stories/${storyId}/approve`, { method: 'PUT' });
        showSuccess('Story approved successfully!');
        await loadStoriesEnhanced();
    } catch (error) {
        debugError('Failed to approve story', error);
    }
}

async function rejectStory(storyId, reason = '') {
    try {
        await apiCall(`/stories/${storyId}/reject`, { 
            method: 'PUT',
            body: JSON.stringify({ reason })
        });
        showSuccess('Story rejected successfully!');
        await loadStoriesEnhanced();
    } catch (error) {
        debugError('Failed to reject story', error);
    }
}

// School management functions
window.editSchool = function(schoolId) {
    debugLog(`Editing school ${schoolId}`);
    const newName = prompt('Enter new school name:');
    if (newName && newName.trim()) {
        updateSchool(schoolId, newName.trim());
    }
};

window.deleteSchool = function(schoolId) {
    debugLog(`Deleting school ${schoolId}`);
    if (confirm('Are you sure you want to delete this school? This will affect all associated users.')) {
        removeSchool(schoolId);
    }
};

async function updateSchool(schoolId, newName) {
    try {
        await apiCall(`/schools/${schoolId}`, { 
            method: 'PUT',
            body: JSON.stringify({ school_name: newName })
        });
        showSuccess('School updated successfully!');
        await loadSchoolsEnhanced();
    } catch (error) {
        debugError('Failed to update school', error);
    }
}

async function removeSchool(schoolId) {
    try {
        await apiCall(`/schools/${schoolId}`, { method: 'DELETE' });
        showSuccess('School deleted successfully!');
        await loadSchoolsEnhanced();
    } catch (error) {
        debugError('Failed to delete school', error);
    }
}

// Generic approval modal (for teacher requests)
window.showApprovalModal = function(requestId, type = 'teacher') {
    debugLog(`Showing approval modal for ${type} request ${requestId}`);
    if (confirm(`Approve this ${type} request?`)) {
        if (type === 'teacher') {
            approveTeacherRequest(requestId);
        }
    }
};

async function approveTeacherRequest(requestId) {
    try {
        await apiCall(`/teacher-requests/${requestId}/approve`, { method: 'PUT' });
        showSuccess('Teacher request approved successfully!');
        await loadTeacherRequestsEnhanced();
    } catch (error) {
        debugError('Failed to approve teacher request', error);
    }
}

// Enhanced loading functions for data refresh
async function loadSchoolsEnhanced() {
    try {
        debugLog('Loading schools...');
        const schools = await apiCall('/schools');
        
        // Update schools display if on schools tab
        if (document.getElementById('schools-tab').classList.contains('active')) {
            displaySchoolsEnhanced(schools);
        }
        
        return schools;
    } catch (error) {
        debugError('Failed to load schools', error);
        return [];
    }
}

async function loadTeacherRequestsEnhanced() {
    try {
        debugLog('Loading teacher requests...');
        const requests = await apiCall('/teacher-requests');
        
        // Update teacher requests display if on teachers tab
        if (document.getElementById('teachers-tab').classList.contains('active')) {
            displayTeacherRequestsEnhanced(requests);
        }
        
        return requests;
    } catch (error) {
        debugError('Failed to load teacher requests', error);
        return [];
    }
}

// Enhanced display functions
function displaySchoolsEnhanced(schools) {
    debugLog(`Displaying ${schools.length} schools`);
    
    const table = document.getElementById('schoolsTable');
    if (!table) {
        debugError('schoolsTable element not found');
        return;
    }
    
    if (schools.length === 0) {
        table.innerHTML = '<tr><td colspan="4" class="no-data">No schools found.</td></tr>';
        return;
    }
    
    const schoolsHTML = schools.map(school => `
        <tr>
            <td>${school.school_name}</td>
            <td>${new Date(school.created_at).toLocaleDateString()}</td>
            <td>${school.teacher_count || 0}</td>
            <td class="actions">
                <button onclick="editSchool(${school.id})" class="btn btn-small btn-secondary">Edit</button>
                <button onclick="deleteSchool(${school.id})" class="btn btn-small btn-danger">Delete</button>
            </td>
        </tr>
    `).join('');
    
    table.innerHTML = schoolsHTML;
}

function displayTeacherRequestsEnhanced(requests) {
    debugLog(`Displaying ${requests.length} teacher requests`);
    
    const table = document.getElementById('teacherRequestsTable');
    if (!table) {
        debugError('teacherRequestsTable element not found');
        return;
    }
    
    if (requests.length === 0) {
        table.innerHTML = '<tr><td colspan="7" class="no-data">No teacher requests found.</td></tr>';
        return;
    }
    
    const requestsHTML = requests.map(request => `
        <tr>
            <td>${request.name}</td>
            <td>${request.email}</td>
            <td>${request.school}</td>
            <td>${request.message || ''}</td>
            <td><span class="status-badge status-${request.status}">${request.status}</span></td>
            <td>${new Date(request.created_at).toLocaleDateString()}</td>
            <td class="actions">
                ${request.status === 'pending' ? `
                    <button onclick="showApprovalModal(${request.id})" class="btn btn-small btn-success">Approve</button>
                    <button onclick="rejectTeacherRequest(${request.id})" class="btn btn-small btn-danger">Reject</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
    
    table.innerHTML = requestsHTML;
}

async function rejectTeacherRequest(requestId) {
    const reason = prompt('Reason for rejection (optional):');
    if (reason !== null) { // User didn't cancel
        try {
            await apiCall(`/teacher-requests/${requestId}/reject`, { 
                method: 'PUT',
                body: JSON.stringify({ reason })
            });
            showSuccess('Teacher request rejected successfully!');
            await loadTeacherRequestsEnhanced();
        } catch (error) {
            debugError('Failed to reject teacher request', error);
        }
    }
}

// Make logout function available
window.logout = function() {
    debugLog('Logout called');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
};

debugLog('Enhanced admin.js loaded successfully');