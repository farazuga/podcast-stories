// Use global window.API_URL from auth.js (no redeclaration)
// window.API_URL is available as window.window.API_URL

// Global variables
let currentUser = null;
let allTags = [];
let allSchools = [];
let teacherRequests = [];
let currentRequestId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin page loading...');
    
    try {
        if (!checkAuth()) {
            console.log('Auth check failed');
            return;
        }
        
        console.log('Auth check passed, loading user info...');
        await loadUserInfo();
        
        console.log('Loading initial data...');
        await loadInitialData();
        
        console.log('Setting up event listeners...');
        setupEventListeners();
        
        // Show overview tab by default
        console.log('Showing overview tab...');
        window.showTab('overview');
        
        console.log('Admin page loaded successfully');
        
        // Test that tab buttons are working
        console.log('Testing tab button functionality...');
        const tabButtons = document.querySelectorAll('.tab-btn');
        console.log('Found tab buttons:', tabButtons.length);
        tabButtons.forEach((btn, index) => {
            console.log(`Tab button ${index}:`, btn.textContent, btn.onclick);
        });
        
    } catch (error) {
        console.error('Error during admin page initialization:', error);
        showError('Failed to initialize admin page. Please refresh and try again.');
    }
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
        window.location.href = '/index.html';
        return false;
    }
    
    if (user.role !== 'admin' && user.role !== 'amitrace_admin') {
        window.location.href = '/dashboard.html';
        return false;
    }
    return true;
}

async function loadUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        currentUser = user;
        
        document.getElementById('userInfo').textContent = `${user.username} (${user.role})`;
    } catch (error) {
        console.error('Error loading user info:', error);
        logout();
    }
}

async function loadInitialData() {
    await Promise.all([
        loadTags(),
        loadSchools(),
        loadTeacherRequests(),
        loadStatistics(),
        loadRecentStories()
    ]);
}

// Tab Management - Make function globally available
window.showTab = function(tabName) {
    console.log('showTab called with:', tabName);
    
    try {
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        console.log('Found tab contents:', tabContents.length);
        tabContents.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all buttons
        const tabButtons = document.querySelectorAll('.tab-btn');
        console.log('Found tab buttons:', tabButtons.length);
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
            console.log('Activated tab:', `${tabName}-tab`);
        } else {
            console.error('Target tab not found:', `${tabName}-tab`);
            return;
        }
        
        // Add active class to the clicked button
        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach((btn, index) => {
            if (btn.textContent.toLowerCase().includes(tabName) || 
                (tabName === 'overview' && index === 0) ||
                (tabName === 'schools' && index === 1) ||
                (tabName === 'teachers' && index === 2) ||
                (tabName === 'stories' && index === 3) ||
                (tabName === 'tags' && index === 4)) {
                btn.classList.add('active');
                console.log('Activated button:', btn.textContent);
            }
        });
        
        // Load tab-specific data
        console.log('Loading data for tab:', tabName);
        switch(tabName) {
            case 'schools':
                loadSchools();
                break;
            case 'teachers':
                window.loadTeacherRequests();
                loadTeacherRequestStats();
                break;
            case 'stories':
                loadStoryApprovalStats();
                window.loadStoriesForApproval('pending');
                break;
            case 'tags':
                loadTags();
                break;
            case 'overview':
                loadStatistics();
                loadRecentStories();
                loadStoryOverviewStats();
                break;
            default:
                console.warn('Unknown tab name:', tabName);
        }
        
    } catch (error) {
        console.error('Error in showTab function:', error);
        showError('Failed to switch tabs. Please refresh the page.');
    }
}

// Statistics
async function loadStatistics() {
    console.log('Loading statistics...');
    try {
        const token = localStorage.getItem('token');
        console.log('Token exists:', !!token);
        
        const [storiesResponse, schoolsResponse, teacherStatsResponse] = await Promise.all([
            fetch(`${window.API_URL}/stories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${window.API_URL}/schools`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${window.API_URL}/teacher-requests/stats/overview`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        console.log('API responses:', {
            stories: storiesResponse.status,
            schools: schoolsResponse.status,
            teacherStats: teacherStatsResponse.status
        });
        
        if (storiesResponse.ok) {
            const stories = await storiesResponse.json();
            console.log('Stories loaded:', stories.length);
            const totalStoriesEl = document.getElementById('totalStories');
            if (totalStoriesEl) {
                totalStoriesEl.textContent = stories.length;
                console.log('Updated totalStories element to:', stories.length);
            } else {
                console.error('totalStories element not found');
            }
        } else {
            console.error('Stories API failed:', storiesResponse.status);
        }
        
        if (schoolsResponse.ok) {
            const schools = await schoolsResponse.json();
            console.log('Schools loaded:', schools.length);
            const totalSchoolsEl = document.getElementById('totalSchools');
            if (totalSchoolsEl) {
                totalSchoolsEl.textContent = schools.length;
                console.log('Updated totalSchools element to:', schools.length);
            }
            
            // Calculate total users from schools
            const totalUsers = schools.reduce((sum, school) => sum + parseInt(school.user_count || 0), 0);
            console.log('Total users calculated:', totalUsers);
            const totalUsersEl = document.getElementById('totalUsers');
            if (totalUsersEl) {
                totalUsersEl.textContent = totalUsers;
                console.log('Updated totalUsers element to:', totalUsers);
            }
        } else {
            console.error('Schools API failed:', schoolsResponse.status);
        }
        
        if (teacherStatsResponse.ok) {
            const stats = await teacherStatsResponse.json();
            console.log('Teacher stats loaded:', stats);
            const pendingRequestsEl = document.getElementById('pendingRequests');
            if (pendingRequestsEl) {
                pendingRequestsEl.textContent = stats.pending_count || 0;
                console.log('Updated pendingRequests element to:', stats.pending_count);
            }
        } else {
            console.error('Teacher stats API failed:', teacherStatsResponse.status);
        }
        
        // Total classes
        try {
            const classesResponse = await fetch(`${window.API_URL}/classes`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (classesResponse.ok) {
                const classes = await classesResponse.json();
                const totalClassesEl = document.getElementById('totalClasses');
                if (totalClassesEl) totalClassesEl.textContent = classes.length;
            }
        } catch (e) {
            const totalClassesEl = document.getElementById('totalClasses');
            if (totalClassesEl) totalClassesEl.textContent = '—';
        }
        
        const totalTagsEl = document.getElementById('totalTags');
        if (totalTagsEl) totalTagsEl.textContent = allTags.length;
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Schools Management
async function loadSchools() {
    try {
        const response = await fetch(`${window.API_URL}/schools`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            allSchools = await response.json();
            displaySchools();
        }
    } catch (error) {
        console.error('Error loading schools:', error);
    }
}

function displaySchools() {
    const schoolsTable = document.getElementById('schoolsTable');
    if (!schoolsTable) return;
    
    schoolsTable.innerHTML = allSchools.map(school => `
        <tr>
            <td>${school.school_name}</td>
            <td>${formatDate(school.created_at)}</td>
            <td>${school.user_count || 0}</td>
            <td>—</td>
            <td>—</td>
            <td class="table-actions">
                <button class="btn btn-small btn-edit" onclick="editSchool(${school.id})">Edit</button>
                <button class="btn btn-small btn-delete" onclick="deleteSchool(${school.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function addSchool(e) {
    e.preventDefault();
    
    const schoolName = document.getElementById('schoolName').value.trim();
    
    if (!schoolName) {
        showError('School name is required');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/schools`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ school_name: schoolName })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('School added successfully!');
            document.getElementById('schoolName').value = '';
            await loadSchools();
            await loadStatistics();
        } else {
            showError(result.error || 'Failed to add school');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

// Make function globally available
window.deleteSchool = async function(schoolId) {
    if (!confirm('Are you sure you want to delete this school? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/schools/${schoolId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            showSuccess('School deleted successfully!');
            await loadSchools();
            await loadStatistics();
        } else {
            const result = await response.json();
            showError(result.error || 'Failed to delete school');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

// Teacher Requests Management
// Make function globally available
window.loadTeacherRequests = async function() {
    try {
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const url = statusFilter ? 
            `${window.API_URL}/teacher-requests?status=${statusFilter}` : 
            `${window.API_URL}/teacher-requests`;
            
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            teacherRequests = await response.json();
            displayTeacherRequests();
        }
    } catch (error) {
        console.error('Error loading teacher requests:', error);
    }
}

async function loadTeacherRequestStats() {
    try {
        const response = await fetch(`${window.API_URL}/teacher-requests/stats/overview`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const stats = await response.json();
            const pendingEl = document.getElementById('pendingTeacherRequests');
            const approvedEl = document.getElementById('approvedTeacherRequests');
            const rejectedEl = document.getElementById('rejectedTeacherRequests');
            const totalEl = document.getElementById('totalTeacherRequests');
            
            if (pendingEl) pendingEl.textContent = stats.pending_count || 0;
            if (approvedEl) approvedEl.textContent = stats.approved_count || 0;
            if (rejectedEl) rejectedEl.textContent = stats.rejected_count || 0;
            if (totalEl) totalEl.textContent = stats.total_count || 0;
        }
    } catch (error) {
        console.error('Error loading teacher request stats:', error);
    }
}

function displayTeacherRequests() {
    const table = document.getElementById('teacherRequestsTable');
    if (!table) return;
    
    table.innerHTML = teacherRequests.map(request => `
        <tr>
            <td>${request.name}</td>
            <td>${request.email}</td>
            <td>${request.school_name}</td>
            <td>${request.message || 'No message'}</td>
            <td><span class="status-badge status-${request.status}">${request.status}</span></td>
            <td>${formatDate(request.requested_at)}</td>
            <td class="table-actions">
                ${request.status === 'pending' ? `
                    <button class="btn btn-small btn-approve" onclick="showApprovalModal(${request.id})">Approve</button>
                    <button class="btn btn-small btn-reject" onclick="rejectTeacherRequest(${request.id})">Reject</button>
                ` : '—'}
            </td>
        </tr>
    `).join('');
}

// Make function globally available
window.showApprovalModal = function(requestId) {
    currentRequestId = requestId;
    const modal = document.getElementById('approvalModal');
    modal.style.display = 'block';
    
    // Clear form
    document.getElementById('teacherUsername').value = '';
    document.getElementById('teacherPassword').value = '';
    document.getElementById('requestId').value = requestId;
}

// Make function globally available
window.closeApprovalModal = function() {
    const modal = document.getElementById('approvalModal');
    modal.style.display = 'none';
    currentRequestId = null;
}

async function approveTeacherRequest(e) {
    e.preventDefault();
    
    const username = document.getElementById('teacherUsername').value.trim();
    const password = document.getElementById('teacherPassword').value;
    const requestId = currentRequestId;
    
    if (!username || !password) {
        showError('Username and password are required');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/teacher-requests/${requestId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('Teacher request approved and account created!');
            closeApprovalModal();
            await loadTeacherRequests();
            await loadTeacherRequestStats();
            await loadStatistics();
        } else {
            showError(result.error || 'Failed to approve teacher request');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

// Make function globally available
window.rejectTeacherRequest = async function(requestId) {
    if (!confirm('Are you sure you want to reject this teacher request?')) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/teacher-requests/${requestId}/reject`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            showSuccess('Teacher request rejected');
            await loadTeacherRequests();
            await loadTeacherRequestStats();
        } else {
            const result = await response.json();
            showError(result.error || 'Failed to reject teacher request');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

// Tags Management (existing functionality)
async function loadTags() {
    try {
        const response = await fetch(`${window.API_URL}/tags`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            allTags = await response.json();
            displayTags();
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

function displayTags() {
    const tagsList = document.getElementById('tagsList');
    if (!tagsList) return;
    
    tagsList.innerHTML = allTags.map(tag => `
        <div class="tag-item">
            <span>${tag.tag_name}</span>
            <button class="tag-delete" onclick="deleteTag(${tag.id})">×</button>
        </div>
    `).join('');
}

async function addTag(e) {
    e.preventDefault();
    
    const tagName = document.getElementById('newTagName').value.trim();
    
    if (!tagName) {
        showError('Tag name is required');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/tags`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ tag_name: tagName })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('Tag added successfully!');
            document.getElementById('newTagName').value = '';
            await loadTags();
            await loadStatistics();
        } else {
            showError(result.error || 'Failed to add tag');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

// Make function globally available
window.deleteTag = async function(tagId) {
    if (!confirm('Are you sure you want to delete this tag? This will remove it from all stories.')) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/tags/${tagId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            showSuccess('Tag deleted successfully!');
            await loadTags();
            await loadStatistics();
        } else {
            showError('Failed to delete tag');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

// Recent Stories (existing functionality)
async function loadRecentStories() {
    try {
        const response = await fetch(`${window.API_URL}/stories`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const stories = await response.json();
            const recentStories = stories.slice(0, 10);
            
            const tableBody = document.getElementById('recentStoriesTable');
            if (tableBody) {
                tableBody.innerHTML = recentStories.map(story => `
                    <tr>
                        <td>${story.idea_title}</td>
                        <td>${story.uploaded_by_name}</td>
                        <td>${formatDate(story.uploaded_date)}</td>
                        <td>${story.tags ? story.tags.filter(tag => tag).join(', ') : 'None'}</td>
                        <td class="table-actions">
                            <button class="btn btn-small btn-secondary" onclick="viewStory(${story.id})">View</button>
                            <button class="btn btn-small btn-delete" onclick="deleteStory(${story.id})">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading recent stories:', error);
    }
}

// Make function globally available
window.deleteStory = async function(storyId) {
    if (!confirm('Are you sure you want to delete this story?')) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/stories/${storyId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            showSuccess('Story deleted successfully!');
            await loadRecentStories();
            await loadStatistics();
        } else {
            showError('Failed to delete story');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

// Make function globally available
window.viewStory = function(storyId) {
    window.location.href = `/story-detail.html?id=${storyId}`;
}

// Event Listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    try {
        // Add school form
        const addSchoolForm = document.getElementById('addSchoolForm');
        if (addSchoolForm) {
            addSchoolForm.addEventListener('submit', addSchool);
            console.log('✓ Add school form listener attached');
        } else {
            console.warn('⚠ Add school form not found');
        }
        
        // Add tag form
        const addTagForm = document.getElementById('addTagForm');
        if (addTagForm) {
            addTagForm.addEventListener('submit', addTag);
            console.log('✓ Add tag form listener attached');
        } else {
            console.warn('⚠ Add tag form not found');
        }
        
        // Approve teacher form
        const approveTeacherForm = document.getElementById('approveTeacherForm');
        if (approveTeacherForm) {
            approveTeacherForm.addEventListener('submit', approveTeacherRequest);
            console.log('✓ Approve teacher form listener attached');
        } else {
            console.warn('⚠ Approve teacher form not found');
        }
        
        // Add click listeners to tab buttons as backup
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach((btn, index) => {
            btn.addEventListener('click', function() {
                const tabNames = ['overview', 'schools', 'teachers', 'stories', 'tags'];
                const tabName = tabNames[index];
                console.log('Tab button clicked via event listener:', tabName);
                window.showTab(tabName);
            });
        });
        console.log('✓ Tab button event listeners attached:', tabButtons.length);
        
        // Filter button listener
        const filterButton = document.querySelector('button[onclick="loadTeacherRequests()"]');
        if (filterButton) {
            filterButton.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Filter button clicked');
                window.loadTeacherRequests();
            });
            console.log('✓ Filter button listener attached');
        }
        
        // Story approval form listeners
        const approveStoryForm = document.getElementById('approveStoryForm');
        if (approveStoryForm) {
            approveStoryForm.addEventListener('submit', approveStory);
            console.log('✓ Approve story form listener attached');
        } else {
            console.warn('⚠ Approve story form not found');
        }
        
        const rejectStoryForm = document.getElementById('rejectStoryForm');
        if (rejectStoryForm) {
            rejectStoryForm.addEventListener('submit', rejectStory);
            console.log('✓ Reject story form listener attached');
        } else {
            console.warn('⚠ Reject story form not found');
        }
        
        // Modal click outside to close
        window.onclick = function(event) {
            const modal = document.getElementById('approvalModal');
            const storyApprovalModal = document.getElementById('storyApprovalModal');
            const storyRejectionModal = document.getElementById('storyRejectionModal');
            const storyDetailsModal = document.getElementById('storyDetailsModal');
            
            if (event.target === modal) {
                window.closeApprovalModal();
            } else if (event.target === storyApprovalModal || 
                       event.target === storyRejectionModal || 
                       event.target === storyDetailsModal) {
                window.closeStoryModal();
            }
        }
        
        console.log('Event listeners setup completed');
        
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    }
}

// Missing editSchool function - placeholder implementation
// Make function globally available
window.editSchool = function(schoolId) {
    console.log('Edit school functionality called for school ID:', schoolId);
    
    // Find the school in the allSchools array
    const school = allSchools.find(s => s.id === schoolId);
    if (!school) {
        showError('School not found');
        return;
    }
    
    // For now, show a simple prompt to edit the school name
    const newName = prompt('Edit school name:', school.school_name);
    if (newName && newName.trim() && newName.trim() !== school.school_name) {
        updateSchoolName(schoolId, newName.trim());
    }
}

// Function to update school name via API
async function updateSchoolName(schoolId, newName) {
    try {
        const response = await fetch(`${window.API_URL}/schools/${schoolId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ school_name: newName })
        });
        
        if (response.ok) {
            showSuccess('School updated successfully');
            await loadSchools(); // Reload the schools list
        } else {
            const errorData = await response.json();
            showError(errorData.error || 'Failed to update school');
        }
    } catch (error) {
        console.error('Error updating school:', error);
        showError('Failed to update school');
    }
}

// Make function globally available
window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

// ============================================================================
// STORY APPROVAL FUNCTIONALITY
// ============================================================================

// Load story approval statistics
async function loadStoryApprovalStats() {
    try {
        const response = await fetch(`${window.API_URL}/stories/admin/stats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            // Update story approval stats
            const pendingEl = document.getElementById('storyStatsPending');
            const approvedEl = document.getElementById('storyStatsApproved');
            const rejectedEl = document.getElementById('storyStatsRejected');
            const draftEl = document.getElementById('storyStatsDraft');
            const thisWeekEl = document.getElementById('storyStatsThisWeek');
            const totalEl = document.getElementById('storyStatsTotal');
            
            if (pendingEl) pendingEl.textContent = stats.pending || 0;
            if (approvedEl) approvedEl.textContent = stats.approved || 0;
            if (rejectedEl) rejectedEl.textContent = stats.rejected || 0;
            if (draftEl) draftEl.textContent = stats.draft || 0;
            if (thisWeekEl) thisWeekEl.textContent = stats.pending_this_week || 0;
            if (totalEl) totalEl.textContent = stats.total || 0;
        }
    } catch (error) {
        console.error('Error loading story approval stats:', error);
    }
}

// Load story overview stats for the overview tab
async function loadStoryOverviewStats() {
    try {
        const response = await fetch(`${window.API_URL}/stories/admin/stats`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            // Update overview stats
            const pendingStoriesEl = document.getElementById('pendingStories');
            const approvedStoriesEl = document.getElementById('approvedStories');
            
            if (pendingStoriesEl) pendingStoriesEl.textContent = stats.pending || 0;
            if (approvedStoriesEl) approvedStoriesEl.textContent = stats.approved || 0;
        }
    } catch (error) {
        console.error('Error loading story overview stats:', error);
    }
}

// Make function globally available - Load stories for approval
window.loadStoriesForApproval = async function(status = null) {
    try {
        const filterStatus = status || document.getElementById('storyStatusFilter')?.value || 'pending';
        const url = filterStatus ? 
            `${window.API_URL}/stories/admin/by-status/${filterStatus}` : 
            `${window.API_URL}/stories`;
            
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const stories = await response.json();
            displayStoriesForApproval(stories);
        }
    } catch (error) {
        console.error('Error loading stories for approval:', error);
        showError('Failed to load stories');
    }
}

function displayStoriesForApproval(stories) {
    const table = document.getElementById('storiesApprovalTable');
    if (!table) return;
    
    table.innerHTML = stories.map(story => `
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
                <button class="btn btn-small btn-secondary" onclick="viewStoryDetails(${story.id})">View</button>
                ${story.approval_status === 'pending' ? `
                    <button class="btn btn-small btn-success" onclick="showStoryApprovalModal(${story.id})">Approve</button>
                    <button class="btn btn-small btn-danger" onclick="showStoryRejectionModal(${story.id})">Reject</button>
                ` : story.approval_status === 'rejected' ? `
                    <button class="btn btn-small btn-success" onclick="showStoryApprovalModal(${story.id})">Approve</button>
                ` : story.approval_status === 'approved' ? `
                    <button class="btn btn-small btn-warning" onclick="showStoryRejectionModal(${story.id})">Reject</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// Make function globally available - Show story approval modal
window.showStoryApprovalModal = async function(storyId) {
    try {
        const response = await fetch(`${window.API_URL}/stories/${storyId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const story = await response.json();
            
            // Populate modal with story details
            document.getElementById('approveStoryId').value = storyId;
            document.getElementById('approveStoryTitle').textContent = story.idea_title;
            document.getElementById('approveStoryAuthor').textContent = story.uploaded_by_name || 'Unknown';
            document.getElementById('approveStoryDescription').textContent = story.idea_description || 'No description';
            document.getElementById('approvalNotes').value = '';
            
            // Show modal
            document.getElementById('storyApprovalModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading story details:', error);
        showError('Failed to load story details');
    }
}

// Make function globally available - Show story rejection modal
window.showStoryRejectionModal = async function(storyId) {
    try {
        const response = await fetch(`${window.API_URL}/stories/${storyId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const story = await response.json();
            
            // Populate modal with story details
            document.getElementById('rejectStoryId').value = storyId;
            document.getElementById('rejectStoryTitle').textContent = story.idea_title;
            document.getElementById('rejectStoryAuthor').textContent = story.uploaded_by_name || 'Unknown';
            document.getElementById('rejectStoryDescription').textContent = story.idea_description || 'No description';
            document.getElementById('rejectionNotes').value = '';
            
            // Show modal
            document.getElementById('storyRejectionModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading story details:', error);
        showError('Failed to load story details');
    }
}

// Make function globally available - View story details modal
window.viewStoryDetails = async function(storyId) {
    try {
        const response = await fetch(`${window.API_URL}/stories/${storyId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const story = await response.json();
            
            // Create detailed story view
            const detailsHTML = `
                <div class="story-details-full">
                    <h3>${story.idea_title}</h3>
                    <div class="story-meta">
                        <p><strong>Author:</strong> ${story.uploaded_by_name || 'Unknown'} (${story.uploaded_by_email || ''})</p>
                        <p><strong>Status:</strong> <span class="status-badge status-${story.approval_status}">${story.approval_status}</span></p>
                        <p><strong>Uploaded:</strong> ${formatDate(story.uploaded_date)}</p>
                        ${story.submitted_at ? `<p><strong>Submitted:</strong> ${formatDate(story.submitted_at)}</p>` : ''}
                        ${story.approved_at ? `<p><strong>Approved/Rejected:</strong> ${formatDate(story.approved_at)}</p>` : ''}
                        ${story.coverage_start_date ? `<p><strong>Coverage:</strong> ${story.coverage_start_date} ${story.coverage_end_date ? `to ${story.coverage_end_date}` : ''}</p>` : ''}
                    </div>
                    
                    <div class="story-content">
                        <h4>Description</h4>
                        <p>${story.idea_description || 'No description provided'}</p>
                        
                        <h4>Interview Questions</h4>
                        <ol>
                            ${[1,2,3,4,5,6].map(i => story[`question_${i}`] ? `<li>${story[`question_${i}`]}</li>` : '').join('')}
                        </ol>
                        
                        ${story.tags && story.tags.length > 0 ? `
                            <h4>Tags</h4>
                            <p>${story.tags.filter(tag => tag).join(', ')}</p>
                        ` : ''}
                        
                        ${story.interviewees && story.interviewees.length > 0 ? `
                            <h4>Interviewees</h4>
                            <p>${story.interviewees.filter(person => person).join(', ')}</p>
                        ` : ''}
                        
                        ${story.approval_notes ? `
                            <h4>Admin Notes</h4>
                            <p class="approval-notes">${story.approval_notes}</p>
                        ` : ''}
                    </div>
                </div>
            `;
            
            document.getElementById('storyDetailsContent').innerHTML = detailsHTML;
            document.getElementById('storyDetailsModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading story details:', error);
        showError('Failed to load story details');
    }
}

// Make function globally available - Close story modals
window.closeStoryModal = function() {
    document.getElementById('storyApprovalModal').style.display = 'none';
    document.getElementById('storyRejectionModal').style.display = 'none';
    document.getElementById('storyDetailsModal').style.display = 'none';
}

// Handle story approval form submission
async function approveStory(e) {
    e.preventDefault();
    
    const storyId = document.getElementById('approveStoryId').value;
    const notes = document.getElementById('approvalNotes').value.trim();
    
    try {
        const response = await fetch(`${window.API_URL}/stories/${storyId}/approve`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ notes: notes || null })
        });
        
        if (response.ok) {
            showSuccess('Story approved successfully!');
            closeStoryModal();
            await loadStoriesForApproval();
            await loadStoryApprovalStats();
            await loadStoryOverviewStats();
        } else {
            const result = await response.json();
            showError(result.error || 'Failed to approve story');
        }
    } catch (error) {
        console.error('Error approving story:', error);
        showError('Network error. Please try again.');
    }
}

// Handle story rejection form submission
async function rejectStory(e) {
    e.preventDefault();
    
    const storyId = document.getElementById('rejectStoryId').value;
    const notes = document.getElementById('rejectionNotes').value.trim();
    
    if (!notes) {
        showError('Rejection reason is required');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/stories/${storyId}/reject`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ notes })
        });
        
        if (response.ok) {
            showSuccess('Story rejected');
            closeStoryModal();
            await loadStoriesForApproval();
            await loadStoryApprovalStats();
            await loadStoryOverviewStats();
        } else {
            const result = await response.json();
            showError(result.error || 'Failed to reject story');
        }
    } catch (error) {
        console.error('Error rejecting story:', error);
        showError('Network error. Please try again.');
    }
}