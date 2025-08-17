// API base URL
const API_URL = 'https://podcast-stories-production.up.railway.app/api';

// Global variables
let currentUser = null;
let allTags = [];
let allSchools = [];
let teacherRequests = [];
let currentRequestId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Admin page loading...');
    
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
    showTab('overview');
    
    console.log('Admin page loaded successfully');
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

// Tab Management
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Add active class to the clicked button
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach((btn, index) => {
        if (btn.textContent.toLowerCase().includes(tabName) || 
            (tabName === 'overview' && index === 0) ||
            (tabName === 'schools' && index === 1) ||
            (tabName === 'teachers' && index === 2) ||
            (tabName === 'tags' && index === 3)) {
            btn.classList.add('active');
        }
    });
    
    // Load tab-specific data
    switch(tabName) {
        case 'schools':
            loadSchools();
            break;
        case 'teachers':
            loadTeacherRequests();
            loadTeacherRequestStats();
            break;
        case 'tags':
            loadTags();
            break;
        case 'overview':
            loadStatistics();
            loadRecentStories();
            break;
    }
}

// Statistics
async function loadStatistics() {
    console.log('Loading statistics...');
    try {
        const token = localStorage.getItem('token');
        console.log('Token exists:', !!token);
        
        const [storiesResponse, schoolsResponse, teacherStatsResponse] = await Promise.all([
            fetch(`${API_URL}/stories`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_URL}/schools`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_URL}/teacher-requests/stats/overview`, {
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
            const classesResponse = await fetch(`${API_URL}/classes`, {
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
        const response = await fetch(`${API_URL}/schools`, {
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
        const response = await fetch(`${API_URL}/schools`, {
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

async function deleteSchool(schoolId) {
    if (!confirm('Are you sure you want to delete this school? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/schools/${schoolId}`, {
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
async function loadTeacherRequests() {
    try {
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const url = statusFilter ? 
            `${API_URL}/teacher-requests?status=${statusFilter}` : 
            `${API_URL}/teacher-requests`;
            
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
        const response = await fetch(`${API_URL}/teacher-requests/stats/overview`, {
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

function showApprovalModal(requestId) {
    currentRequestId = requestId;
    const modal = document.getElementById('approvalModal');
    modal.style.display = 'block';
    
    // Clear form
    document.getElementById('teacherUsername').value = '';
    document.getElementById('teacherPassword').value = '';
    document.getElementById('requestId').value = requestId;
}

function closeApprovalModal() {
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
        const response = await fetch(`${API_URL}/teacher-requests/${requestId}/approve`, {
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

async function rejectTeacherRequest(requestId) {
    if (!confirm('Are you sure you want to reject this teacher request?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/teacher-requests/${requestId}/reject`, {
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
        const response = await fetch(`${API_URL}/tags`, {
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
        const response = await fetch(`${API_URL}/tags`, {
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

async function deleteTag(tagId) {
    if (!confirm('Are you sure you want to delete this tag? This will remove it from all stories.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/tags/${tagId}`, {
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
        const response = await fetch(`${API_URL}/stories`, {
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

async function deleteStory(storyId) {
    if (!confirm('Are you sure you want to delete this story?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/stories/${storyId}`, {
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

function viewStory(storyId) {
    window.location.href = `/story-detail.html?id=${storyId}`;
}

// Event Listeners
function setupEventListeners() {
    // Add school form
    const addSchoolForm = document.getElementById('addSchoolForm');
    if (addSchoolForm) {
        addSchoolForm.addEventListener('submit', addSchool);
    }
    
    // Add tag form
    const addTagForm = document.getElementById('addTagForm');
    if (addTagForm) {
        addTagForm.addEventListener('submit', addTag);
    }
    
    // Approve teacher form
    const approveTeacherForm = document.getElementById('approveTeacherForm');
    if (approveTeacherForm) {
        approveTeacherForm.addEventListener('submit', approveTeacherRequest);
    }
    
    // Modal click outside to close
    window.onclick = function(event) {
        const modal = document.getElementById('approvalModal');
        if (event.target === modal) {
            closeApprovalModal();
        }
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
function editSchool(schoolId) {
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
        const response = await fetch(`${API_URL}/schools/${schoolId}`, {
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

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}