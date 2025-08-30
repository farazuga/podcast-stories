// Use global window.API_URL from auth.js (no redeclaration)
// window.API_URL is available as window.window.API_URL

// Global variables
let currentUser = null;
let allTags = [];
let allSchools = [];
let teacherRequests = [];
let currentRequestId = null;

// Admin story multi-select functionality
let selectedAdminStories = new Set();
let adminStoriesForBulkAction = [];

// Teacher Request Action Functions
window.editTeacherRequest = async function(requestId) {
    const request = teacherRequests.find(r => r.id === requestId);
    if (!request) {
        showError('Teacher request not found');
        return;
    }
    
    // Create edit modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Edit Teacher Request</h3>
                <span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editTeacherForm">
                    <div class="form-group">
                        <label>Name:</label>
                        <input type="text" id="editName" value="${escapeHTML(request.name)}" required>
                    </div>
                    <div class="form-group">
                        <label>Email:</label>
                        <input type="email" id="editEmail" value="${escapeHTML(request.email)}" required>
                    </div>
                    <div class="form-group">
                        <label>Status:</label>
                        <select id="editStatus">
                            <option value="pending" ${request.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="approved" ${request.status === 'approved' ? 'selected' : ''}>Approved</option>
                            <option value="rejected" ${request.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle form submission
    document.getElementById('editTeacherForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updatedData = {
            name: document.getElementById('editName').value,
            email: document.getElementById('editEmail').value,
            status: document.getElementById('editStatus').value
        };
        
        try {
            const response = await fetch(`${window.API_URL}/teacher-requests/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });
            
            if (response.ok) {
                showSuccess('Teacher request updated successfully');
                modal.remove();
                await loadTeacherRequests();
            } else {
                const error = await response.json();
                showError(error.error || 'Failed to update teacher request');
            }
        } catch (error) {
            showError('Network error. Please try again.');
        }
    });
}

window.resetTeacherPassword = async function(requestId, email) {
    if (!confirm(`Reset password for ${email}? A new invitation link will be sent.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/teacher-requests/${requestId}/reset-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showSuccess(`Password reset link sent to ${email}`);
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to reset password');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

window.deleteTeacherRequest = async function(requestId) {
    if (!confirm('Are you sure you want to permanently delete this teacher request?')) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/teacher-requests/${requestId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showSuccess('Teacher request deleted successfully');
            await loadTeacherRequests();
            await loadTeacherRequestStats();
        } else {
            const error = await response.json();
            showError(error.error || 'Failed to delete teacher request');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

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
    
    if (user.role !== 'amitrace_admin') {
        window.location.href = '/dashboard.html';
        return false;
    }
    return true;
}

async function loadUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        currentUser = user;
        
        console.log('🔍 Admin Debug - User Info:', {
            username: user.username,
            role: user.role,
            email: user.email,
            id: user.id
        });
        
        const displayName = user.name || user.email || user.username || 'User';
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            userInfoElement.textContent = `${displayName} (${user.role})`;
        } else {
            console.log('🔍 userInfo element not found (expected for admin page with unified navigation)');
        }
        
        // Verify admin permissions with backend
        const token = localStorage.getItem('token');
        console.log('🔍 Admin Debug - Token exists:', !!token);
        
        if (token) {
            try {
                const response = await fetch(`${window.API_URL}/auth/verify`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log('🔍 Admin Debug - Token verification:', response.status, response.ok);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Token verification failed:', response.status, errorText);
                    console.error('❌ Token being used:', token);
                    console.error('❌ Full API URL:', `${window.API_URL}/auth/verify`);
                    // Don't logout immediately - let user try to continue
                    console.error('❌ Continuing without token verification for debugging...');
                    return;
                }
            } catch (verifyError) {
                console.error('❌ Token verification error:', verifyError);
            }
        }
        
    } catch (error) {
        console.error('🔧 ADMIN.JS ERROR HANDLER - Error loading user info:', error);
        console.error('🔧 Error details:', error.message, error.stack);
        console.error('🔧 TOKEN PRESERVED - NOT calling logout() to prevent token clearing');
        console.error('🔧 DEPLOYMENT VERSION:', new Date().toISOString());
        // CRITICAL: Don't logout on user info loading errors - preserve authentication
        // The logout() call here was causing the token to be cleared immediately
        // after successful login, creating a redirect loop back to login page
        // logout(); // ← DISABLED TO FIX AUTHENTICATION ISSUE
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
window.showTab = async function(tabName) {
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
        
        // Add active class to the clicked button using data-tab attribute
        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
                console.log('Activated button:', btn.textContent);
            }
        });
        
        // Load tab-specific data
        console.log('🔍 Admin Debug - Loading data for tab:', tabName);
        switch(tabName) {
            case 'schools':
                console.log('🔍 Loading schools tab...');
                loadSchools();
                break;
            case 'teachers':
                console.log('🔍 Loading teachers tab...');
                console.log('🔍 Teacher Requests Debug - Tab activated, calling functions...');
                try {
                    await window.loadTeacherRequests();
                    await loadTeacherRequestStats();
                    console.log('🔍 Teacher Requests Debug - Tab loading completed successfully');
                } catch (error) {
                    console.error('❌ Teacher Requests Debug - Tab loading failed:', error);
                    showError('Failed to load teacher requests tab. Check console for details.');
                }
                break;
            case 'stories':
                console.log('🔍 Loading stories tab...');
                loadStoryApprovalStats();
                // Ensure the filter is set to "All Stories" by default
                const filterSelect = document.getElementById('storyStatusFilter');
                if (filterSelect && filterSelect.value === 'pending') {
                    filterSelect.value = ''; // Set to "All Stories"
                }
                // Load stories with current filter selection
                window.loadStoriesForApproval();
                break;
            case 'tags':
                console.log('🔍 Loading tags tab...');
                loadTags();
                break;
            case 'overview':
                console.log('🔍 Loading overview tab...');
                loadStatistics();
                loadRecentStories();
                loadStoryOverviewStats();
                break;
            default:
                console.warn('❌ Unknown tab name:', tabName);
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
    console.log('🔍 Teacher Requests Debug - Starting to load teacher requests...');
    try {
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const url = statusFilter ? 
            `${window.API_URL}/teacher-requests?status=${statusFilter}` : 
            `${window.API_URL}/teacher-requests`;
            
        console.log('🔍 Teacher Requests Debug - API Request:', {
            url: url,
            statusFilter: statusFilter,
            token: localStorage.getItem('token') ? 'Present' : 'Missing',
            api_url: window.API_URL
        });
            
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        console.log('🔍 Teacher Requests Debug - API Response:', {
            status: response.status,
            ok: response.ok,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
            const msg = response.status === 403 ? 'You are not authorized to view teacher requests.' : `Failed to load teacher requests (${response.status})`;
            showError(msg);
            const table = document.getElementById('teacherRequestsTable');
            if (table) {
                table.innerHTML = '<tr><td colspan="7">' + msg + '</td></tr>';
            }
            return;
        }
        
        teacherRequests = await response.json();
        console.log('🔍 Teacher Requests Debug - Data loaded:', {
            count: teacherRequests.length,
            requests: teacherRequests
        });
        displayTeacherRequests();
    } catch (error) {
        console.error('❌ Error loading teacher requests:', error);
        showError('Network error loading teacher requests. Check console for details.');
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

// HTML escape helper function to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function displayTeacherRequests() {
    console.log('🔍 Teacher Requests Debug - Starting to display teacher requests...');
    const table = document.getElementById('teacherRequestsTable');
    
    if (!table) {
        console.error('❌ teacherRequestsTable element not found!');
        showError('Teacher requests table not found in DOM. Check HTML structure.');
        return;
    }
    
    console.log('🔍 Teacher Requests Debug - Requests to display:', {
        count: teacherRequests.length,
        requests: teacherRequests
    });
    
    if (teacherRequests.length === 0) {
        table.innerHTML = '<tr><td colspan="7" class="no-data">No teacher requests found.</td></tr>';
        console.log('📝 Displayed empty state for teacher requests');
        return;
    }
    
    table.innerHTML = teacherRequests.map(request => `
        <tr>
            <td>${escapeHTML(request.name)}</td>
            <td>${escapeHTML(request.email)}</td>
            <td>${escapeHTML(request.school_name)}</td>
            <td>${escapeHTML(request.message) || 'No message'}</td>
            <td><span class="status-badge status-${escapeHTML(request.status)}">${escapeHTML(request.status)}</span></td>
            <td>${formatDate(request.requested_at)}</td>
            <td class="table-actions" style="white-space: nowrap;">
                ${request.status === 'pending' ? `
                    <button class="btn btn-small btn-approve" onclick="showApprovalModal(${request.id})" title="Approve">✓</button>
                    <button class="btn btn-small btn-reject" onclick="rejectTeacherRequest(${request.id})" title="Reject">✗</button>
                ` : ''}
                <button class="btn btn-small btn-primary" onclick="editTeacherRequest(${request.id})" title="Edit">✏️</button>
                <button class="btn btn-small btn-warning" onclick="resetTeacherPassword(${request.id}, '${escapeHTML(request.email)}')" title="Reset Password">🔑</button>
                <button class="btn btn-small btn-danger" onclick="deleteTeacherRequest(${request.id})" title="Delete">🗑️</button>
            </td>
        </tr>
    `).join('');
    
    console.log('✅ Teacher requests displayed successfully');
}

// Make function globally available
window.showApprovalModal = function(requestId) {
    console.log('🔍 showApprovalModal called with requestId:', requestId);
    currentRequestId = requestId;
    const modal = document.getElementById('approvalModal');
    modal.style.display = 'block';
    
    // Set request ID
    document.getElementById('requestId').value = requestId;
    console.log('🔍 Modal displayed, currentRequestId set to:', currentRequestId);
    
    // Check if form listener is attached
    const form = document.getElementById('approveTeacherForm');
    if (form) {
        console.log('🔍 Form found, has submit listener:', form.onsubmit !== null);
    } else {
        console.error('❌ approveTeacherForm not found!');
    }
}

// Make function globally available
window.closeApprovalModal = function() {
    const modal = document.getElementById('approvalModal');
    modal.style.display = 'none';
    currentRequestId = null;
}

async function approveTeacherRequest(e) {
    console.log('🔍 approveTeacherRequest called');
    e.preventDefault();
    
    const requestId = currentRequestId;
    console.log('🔍 Current request ID:', requestId);
    
    if (!requestId) {
        console.error('❌ No request ID found');
        showError('Request ID is required');
        return;
    }
    
    try {
        console.log('🔍 Making API call to approve teacher:', `${window.API_URL}/teacher-requests/${requestId}/approve`);
        const response = await fetch(`${window.API_URL}/teacher-requests/${requestId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({}) // No password needed - auto-generated
        });
        
        console.log('🔍 API response status:', response.status);
        const result = await response.json();
        console.log('🔍 API response data:', result);
        
        if (response.ok) {
            showSuccess('Teacher request approved. Invitation link sent via email.');
            closeApprovalModal();
            await loadTeacherRequests();
            await loadTeacherRequestStats();
            await loadStatistics();
        } else {
            console.error('❌ API error:', result.error);
            showError(result.error || 'Failed to approve teacher request');
        }
    } catch (error) {
        console.error('❌ Network error:', error);
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
        console.log('🔍 Admin Debug - Loading tags...');
        const token = localStorage.getItem('token');
        console.log('🔍 Admin Debug - Token for tags API:', token ? 'Present' : 'Missing');
        
        const response = await fetch(`${window.API_URL}/tags`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('🔍 Admin Debug - Tags API response:', {
            status: response.status,
            ok: response.ok,
            url: `${window.API_URL}/tags`
        });
        
        if (response.ok) {
            allTags = await response.json();
            console.log('🔍 Admin Debug - Tags loaded:', allTags.length, allTags);
            displayTags();
        } else {
            const errorData = await response.text();
            console.error('❌ Tags API failed:', response.status, errorData);
            showError(`Failed to load tags: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Error loading tags:', error);
        showError('Network error loading tags. Check console for details.');
    }
}

function displayTags() {
    console.log('🔍 Admin Debug - Displaying tags...');
    const tagsList = document.getElementById('tagsList');
    
    if (!tagsList) {
        console.error('❌ tagsList element not found!');
        return;
    }
    
    console.log('🔍 Admin Debug - Tags to display:', allTags.length, allTags);
    
    if (allTags.length === 0) {
        tagsList.innerHTML = '<p class="no-data">No tags found. You can add some using the form above.</p>';
        console.log('📝 Displayed empty state for tags');
        return;
    }
    
    tagsList.innerHTML = allTags.map(tag => `
        <div class="tag-item">
            <span>${tag.tag_name}</span>
            <button class="tag-delete" onclick="deleteTag(${tag.id})">×</button>
        </div>
    `).join('');
    
    console.log('✅ Tags displayed successfully');
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
            console.log('🔍 Attaching submit listener to approveTeacherForm');
            approveTeacherForm.addEventListener('submit', approveTeacherRequest);
            console.log('✓ Approve teacher form listener attached');
            // Double-check the listener was attached
            console.log('🔍 Form.onsubmit after attachment:', approveTeacherForm.onsubmit);
        } else {
            console.warn('⚠ Approve teacher form not found - this is critical!');
        }
        
        // Add click listeners to tab buttons using data-tab attribute
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach((btn) => {
            btn.addEventListener('click', function() {
                const tabName = btn.getAttribute('data-tab');
                console.log('Tab button clicked via event listener:', tabName);
                window.showTab(tabName);
            });
        });
        console.log('✓ Tab button event listeners attached:', tabButtons.length);
        
        // Filter button listener
        const filterButton = document.getElementById('filterTeacherRequests');
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
        
        // Modal click outside to close - use addEventListener instead of global onclick
        window.addEventListener('click', (event) => {
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
        });
        
        console.log('Event listeners setup completed');
        
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const datePart = dateString.split('T')[0];
    return formatDateSafe(datePart);
}

function formatSingleDayCoverage(dateString) {
    if (!dateString) return 'Single Day: Date not specified';
    const datePart = dateString.split('T')[0];
    return 'Single Day: ' + formatDateSafeWithOptions(datePart, { month: 'long' });
}

function formatCoverageDisplay(startDate, endDate) {
    if (!startDate) return 'No coverage date specified';
    if (endDate) {
        // Use year-less formatting for coverage dates
        const startPart = startDate.split('T')[0];
        const endPart = endDate.split('T')[0];
        return `${formatDateSafeWithoutYear(startPart)} to ${formatDateSafeWithoutYear(endPart)}`;
    }
    // Single day coverage - also use year-less formatting
    const startPart = startDate.split('T')[0];
    return `Single Day: ${formatDateSafeWithoutYear(startPart)}`;
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
        console.log('🔍 Admin Debug - Loading stories for approval...');
        let filterStatus;
        if (status !== null) {
            filterStatus = status;
        } else {
            const selectElement = document.getElementById('storyStatusFilter');
            filterStatus = selectElement ? selectElement.value : '';
        }
        
        // If filterStatus is empty string, get all stories; otherwise filter by status
        const url = filterStatus ? 
            `${window.API_URL}/stories/admin/by-status/${filterStatus}` : 
            `${window.API_URL}/stories`;
            
        console.log('🔍 Admin Debug - Story approval request:', {
            status: filterStatus,
            statusType: typeof filterStatus,
            url: url,
            token: localStorage.getItem('token') ? 'Present' : 'Missing'
        });
            
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        console.log('🔍 Admin Debug - Story approval API response:', {
            status: response.status,
            ok: response.ok,
            url: url
        });
        
        if (response.ok) {
            const stories = await response.json();
            console.log('🔍 Admin Debug - Stories loaded for approval:', stories.length, stories);
            displayStoriesForApproval(stories);
        } else {
            const errorData = await response.text();
            console.error('❌ Stories approval API failed:', response.status, errorData);
            showError(`Failed to load stories: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Error loading stories for approval:', error);
        showError('Network error loading stories. Check console for details.');
    }
}

function displayStoriesForApproval(stories) {
    console.log('🔍 Admin Debug - Displaying stories for approval...');
    const table = document.getElementById('storiesApprovalTable');
    
    if (!table) {
        console.error('❌ storiesApprovalTable element not found!');
        return;
    }
    
    console.log('🔍 Admin Debug - Stories to display:', stories.length, stories);
    
    if (stories.length > 0) {
        console.log('🔍 Admin Debug - Sample story data:', stories[0]);
    }
    
    if (stories.length === 0) {
        table.innerHTML = '<tr><td colspan="6" class="no-data">No stories found for the selected status.</td></tr>';
        console.log('📝 Displayed empty state for stories');
        return;
    }
    
    table.innerHTML = stories.map(story => `
        <tr data-story-id="${story.id}">
            <td class="checkbox-column">
                <label class="checkbox-container">
                    <input type="checkbox" class="story-approval-checkbox" value="${story.id}" onchange="updateAdminStorySelection()">
                    <span class="checkmark"></span>
                </label>
            </td>
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
    
    // Store stories data for bulk actions
    adminStoriesForBulkAction = stories;
    
    console.log('✅ Stories displayed successfully');
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
                        ${story.coverage_start_date ? `<p><strong>Coverage:</strong> ${formatCoverageDisplay(story.coverage_start_date, story.coverage_end_date)}</p>` : ''}
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

// Admin Multi-select Functionality
function updateAdminStorySelection() {
    const storyCheckboxes = document.querySelectorAll('.story-approval-checkbox');
    selectedAdminStories.clear();
    
    storyCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedAdminStories.add(parseInt(checkbox.value));
        }
    });
    
    updateAdminSelectionUI();
}

function updateAdminSelectionUI() {
    const bulkActionsBar = document.getElementById('adminBulkActions');
    const selectedCount = document.getElementById('adminSelectedCount');
    
    if (selectedAdminStories.size > 0) {
        if (bulkActionsBar) bulkActionsBar.style.display = 'flex';
        if (selectedCount) selectedCount.textContent = selectedAdminStories.size;
    } else {
        if (bulkActionsBar) bulkActionsBar.style.display = 'none';
    }
    
    // Update select all checkbox state
    const selectAllCheckbox = document.getElementById('adminSelectAllStories');
    const storyCheckboxes = document.querySelectorAll('.story-approval-checkbox');
    
    if (selectAllCheckbox && storyCheckboxes.length > 0) {
        const checkedCount = selectedAdminStories.size;
        const totalCount = storyCheckboxes.length;
        
        selectAllCheckbox.checked = checkedCount === totalCount;
        selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < totalCount;
    }
}

function toggleAdminSelectAllStories() {
    const selectAllCheckbox = document.getElementById('adminSelectAllStories');
    const storyCheckboxes = document.querySelectorAll('.story-approval-checkbox');
    
    if (selectAllCheckbox.checked) {
        // Select all
        storyCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            selectedAdminStories.add(parseInt(checkbox.value));
        });
    } else {
        // Deselect all
        storyCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        selectedAdminStories.clear();
    }
    
    updateAdminSelectionUI();
}

async function adminBulkApprove() {
    if (selectedAdminStories.size === 0) return;
    
    const storyIds = Array.from(selectedAdminStories);
    const confirmMessage = `Are you sure you want to approve ${storyIds.length} selected stories?`;
    
    if (!confirm(confirmMessage)) return;
    
    const bulkApproveBtn = document.querySelector('[onclick="adminBulkApprove()"]');
    if (bulkApproveBtn) {
        bulkApproveBtn.disabled = true;
        bulkApproveBtn.textContent = 'Approving...';
    }
    
    try {
        let successCount = 0;
        const promises = storyIds.map(async (storyId) => {
            try {
                const response = await fetch(`${window.API_URL}/stories/${storyId}/approve`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        notes: 'Bulk approved by admin'
                    })
                });
                if (response.ok) successCount++;
                return response.ok;
            } catch (error) {
                console.error(`Failed to approve story ${storyId}:`, error);
                return false;
            }
        });
        
        await Promise.all(promises);
        
        if (successCount > 0) {
            showSuccess(`Successfully approved ${successCount} stories`);
            await loadStoriesForApproval();
            await loadStoryApprovalStats();
        }
        
        // Clear selection
        selectedAdminStories.clear();
        updateAdminSelectionUI();
        
    } catch (error) {
        console.error('Bulk approve failed:', error);
        showError('Failed to approve stories');
    } finally {
        if (bulkApproveBtn) {
            bulkApproveBtn.disabled = false;
            bulkApproveBtn.textContent = 'Approve Selected';
        }
    }
}

async function adminBulkReject() {
    if (selectedAdminStories.size === 0) return;
    
    const storyIds = Array.from(selectedAdminStories);
    const rejectReason = prompt(`Enter rejection reason for ${storyIds.length} selected stories:`);
    
    if (!rejectReason || rejectReason.trim() === '') {
        showError('Rejection reason is required');
        return;
    }
    
    const bulkRejectBtn = document.querySelector('[onclick="adminBulkReject()"]');
    if (bulkRejectBtn) {
        bulkRejectBtn.disabled = true;
        bulkRejectBtn.textContent = 'Rejecting...';
    }
    
    try {
        let successCount = 0;
        const promises = storyIds.map(async (storyId) => {
            try {
                const response = await fetch(`${window.API_URL}/stories/${storyId}/reject`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        notes: rejectReason.trim()
                    })
                });
                if (response.ok) successCount++;
                return response.ok;
            } catch (error) {
                console.error(`Failed to reject story ${storyId}:`, error);
                return false;
            }
        });
        
        await Promise.all(promises);
        
        if (successCount > 0) {
            showSuccess(`Successfully rejected ${successCount} stories`);
            await loadStoriesForApproval();
            await loadStoryApprovalStats();
        }
        
        // Clear selection
        selectedAdminStories.clear();
        updateAdminSelectionUI();
        
    } catch (error) {
        console.error('Bulk reject failed:', error);
        showError('Failed to reject stories');
    } finally {
        if (bulkRejectBtn) {
            bulkRejectBtn.disabled = false;
            bulkRejectBtn.textContent = 'Reject Selected';
        }
    }
}

async function adminBulkDelete() {
    if (selectedAdminStories.size === 0) return;
    
    const storyIds = Array.from(selectedAdminStories);
    const confirmMessage = `Are you sure you want to permanently delete ${storyIds.length} selected stories? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) return;
    
    const bulkDeleteBtn = document.querySelector('[onclick="adminBulkDelete()"]');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.disabled = true;
        bulkDeleteBtn.textContent = 'Deleting...';
    }
    
    try {
        let successCount = 0;
        const promises = storyIds.map(async (storyId) => {
            try {
                const response = await fetch(`${window.API_URL}/stories/${storyId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.ok) successCount++;
                return response.ok;
            } catch (error) {
                console.error(`Failed to delete story ${storyId}:`, error);
                return false;
            }
        });
        
        await Promise.all(promises);
        
        if (successCount > 0) {
            showSuccess(`Successfully deleted ${successCount} stories`);
            await loadStoriesForApproval();
            await loadStoryApprovalStats();
        }
        
        // Clear selection
        selectedAdminStories.clear();
        updateAdminSelectionUI();
        
    } catch (error) {
        console.error('Bulk delete failed:', error);
        showError('Failed to delete stories');
    } finally {
        if (bulkDeleteBtn) {
            bulkDeleteBtn.disabled = false;
            bulkDeleteBtn.textContent = 'Delete Selected';
        }
    }
}

// Make admin functions globally available
window.updateAdminStorySelection = updateAdminStorySelection;
window.toggleAdminSelectAllStories = toggleAdminSelectAllStories;
window.adminBulkApprove = adminBulkApprove;
window.adminBulkReject = adminBulkReject;
window.adminBulkDelete = adminBulkDelete;

// Force cache refresh - Sun Aug 17 23:52:52 CDT 2025

// Admin dashboard stat navigation function
function navigateToAdminTab(tabName) {
    console.log('Navigating to admin tab:', tabName);
    showAdminLoadingFeedback('Loading ' + tabName + ' section...');
    
    setTimeout(() => {
        // Call the existing showTab function to switch tabs
        if (typeof showTab === 'function') {
            showTab(tabName);
        } else {
            // Fallback: manually show tab
            switchToTab(tabName);
        }
    }, 300);
}

function switchToTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show the requested tab
    const targetTab = document.getElementById(tabName + '-tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Activate the corresponding tab button
    const targetButton = Array.from(tabButtons).find(btn => 
        btn.onclick && btn.onclick.toString().includes(tabName)
    );
    if (targetButton) {
        targetButton.classList.add('active');
    }
}

function showAdminLoadingFeedback(message) {
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--primary-color); color: white; padding: 10px 20px; border-radius: 5px; z-index: 1000; font-family: Arial, sans-serif; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
    loadingDiv.textContent = message;
    document.body.appendChild(loadingDiv);
    
    setTimeout(() => {
        if (loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
        }
    }, 1000);
}

// Make navigation function globally available
window.navigateToAdminTab = navigateToAdminTab;
