// API base URL - uses window.API_URL from config.js
// const API_URL is now provided by config.js

// Global variables
let allStories = [];
let currentUser = null;
let allTags = [];

// Multi-select functionality
let selectedStories = new Set();
let selectionMode = false;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    await loadUserInfo();
    await loadDashboardStats();
    await loadRecentActivity();
    
    // Load different content based on user role
    if (currentUser && currentUser.role === 'student') {
        await loadStudentClasses();
        setupStudentEventListeners();
    } else {
        await loadTags();
        await loadStories();
        setupEventListeners();
    }
});

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

async function loadUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        currentUser = user;
        
        // Display user info - handle Phase 1 user data structure
        const displayName = user.name || user.email || user.username || 'User';
        document.getElementById('userInfo').textContent = displayName;
        
        // Display role badge
        const roleBadge = document.getElementById('userRoleBadge');
        if (roleBadge) {
            roleBadge.textContent = user.role.toUpperCase().replace('_', ' ');
            roleBadge.className = `role-badge role-${user.role}`;
        }
        
        // Show appropriate navigation links based on role
        if (user.role === 'admin' || user.role === 'amitrace_admin') {
            document.getElementById('adminLink').style.display = 'block';
            document.getElementById('teacherLink').style.display = 'block';
        } else if (user.role === 'teacher') {
            document.getElementById('teacherLink').style.display = 'block';
        }
        
        // Hide CSV import for students
        if (user.role === 'student') {
            const csvBtn = document.getElementById('csvImportBtn');
            if (csvBtn) csvBtn.style.display = 'none';
        }
        
        // Show bulk delete button only for admins
        const bulkDeleteBtn = document.getElementById('dashboardBulkDeleteBtn');
        if (bulkDeleteBtn) {
            if (user.role === 'admin' || user.role === 'amitrace_admin') {
                bulkDeleteBtn.style.display = 'inline-block';
            } else {
                bulkDeleteBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        logout();
    }
}

async function loadTags() {
    try {
        const response = await fetch(`${window.API_URL}/tags`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            allTags = await response.json();
            populateTagsSelect();
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

function populateTagsSelect() {
    const tagsSelect = document.getElementById('searchTags');
    tagsSelect.innerHTML = '';
    
    allTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.tag_name;
        option.textContent = tag.tag_name;
        tagsSelect.appendChild(option);
    });
}

async function loadStories(filters = {}) {
    try {
        const queryParams = new URLSearchParams();
        
        if (filters.search) queryParams.append('search', filters.search);
        if (filters.startDate) queryParams.append('startDate', filters.startDate);
        if (filters.endDate) queryParams.append('endDate', filters.endDate);
        if (filters.interviewee) queryParams.append('interviewee', filters.interviewee);
        
        // Add tags as separate parameters
        if (filters.tags && filters.tags.length > 0) {
            filters.tags.forEach(tag => queryParams.append('tags', tag));
        }
        
        const response = await fetch(`${window.API_URL}/stories?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            allStories = await response.json();
            displayStories(allStories);
        } else {
            console.error('Failed to load stories');
        }
    } catch (error) {
        console.error('Error loading stories:', error);
    }
}

function displayStories(stories) {
    const storiesGrid = document.getElementById('storiesGrid');
    
    if (stories.length === 0) {
        storiesGrid.innerHTML = '<div class="no-stories">No stories found. <a href="add-story.html">Add your first story</a></div>';
        return;
    }
    
    storiesGrid.innerHTML = stories.map(story => createStoryCard(story)).join('');
}

function createStoryCard(story) {
    const tags = story.tags ? story.tags.filter(tag => tag).map(tag => 
        `<span class="tag">${tag}</span>`
    ).join('') : '';
    
    const interviewees = story.interviewees ? story.interviewees.filter(person => person).map(person => 
        `<span class="person-tag">${person}</span>`
    ).join('') : '';
    
    const coverageDateDisplay = story.coverage_end_date ? 
        `${formatDate(story.coverage_start_date)} - ${formatDate(story.coverage_end_date)}` : 
        formatSingleDayCoverage(story.coverage_start_date);
    
    const deleteButton = currentUser && currentUser.role === 'admin' ? 
        `<button class="btn btn-delete" onclick="deleteStory(${story.id})">Delete</button>` : '';
    
    return `
        <div class="story-card" data-story-id="${story.id}">
            <div class="story-selection">
                <label class="checkbox-container">
                    <input type="checkbox" class="story-checkbox" value="${story.id}" onchange="updateDashboardSelection()">
                    <span class="checkmark"></span>
                </label>
            </div>
            <div class="story-header">
                <h3 class="story-title">${story.idea_title}</h3>
                <div class="story-meta">
                    <span>📅 ${formatDate(story.uploaded_date)}</span>
                    <span>👤 ${story.uploaded_by_name}</span>
                    ${story.uploaded_by_school ? `<span>🏫 ${story.uploaded_by_school}</span>` : ''}
                </div>
            </div>
            
            <p class="story-description">${truncateText(story.idea_description, 150)}</p>
            
            <div class="story-tags">${tags}</div>
            
            <div class="story-dates">
                📆 Coverage: ${coverageDateDisplay}
            </div>
            
            ${interviewees ? `
                <div class="story-people">
                    <h4>Interview Subjects:</h4>
                    ${interviewees}
                </div>
            ` : ''}
            
            <div class="story-actions">
                <button class="btn btn-view" onclick="viewStory(${story.id})">View Details</button>
                ${deleteButton}
            </div>
        </div>
    `;
}

function setupEventListeners() {
    // Search form
    document.getElementById('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        applyFilters();
    });
    
    // CSV Import modal
    const csvModal = document.getElementById('csvModal');
    const csvBtn = document.getElementById('csvImportBtn');
    const closeBtn = document.querySelector('.close');
    
    csvBtn.onclick = () => csvModal.style.display = 'block';
    closeBtn.onclick = () => csvModal.style.display = 'none';
    
    window.onclick = (event) => {
        if (event.target === csvModal) {
            csvModal.style.display = 'none';
        }
    };
    
    // CSV Upload form
    document.getElementById('csvUploadForm').addEventListener('submit', handleCSVUpload);
}

function applyFilters() {
    const filters = {
        search: document.getElementById('searchKeywords').value,
        tags: Array.from(document.getElementById('searchTags').selectedOptions).map(option => option.value),
        startDate: document.getElementById('searchStartDate').value,
        endDate: document.getElementById('searchEndDate').value,
        interviewee: document.getElementById('searchInterviewee').value
    };
    
    loadStories(filters);
}

function clearFilters() {
    document.getElementById('searchForm').reset();
    loadStories();
}

async function handleCSVUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn?.textContent;
    
    // Validation
    if (!file) {
        document.getElementById('csvResult').innerHTML = `
            <div class="error-message" style="display: block;">
                Please select a CSV file
            </div>
        `;
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
        document.getElementById('csvResult').innerHTML = `
            <div class="error-message" style="display: block;">
                Please select a valid CSV file
            </div>
        `;
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        document.getElementById('csvResult').innerHTML = `
            <div class="error-message" style="display: block;">
                File too large. Please select a file smaller than 10MB
            </div>
        `;
        return;
    }
    
    // Show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '📤 Uploading...';
    }
    
    document.getElementById('csvResult').innerHTML = `
        <div class="info-message" style="display: block;">
            Uploading and processing CSV file...
        </div>
    `;
    
    const formData = new FormData();
    formData.append('csv', file);
    
    try {
        console.log(`Starting CSV upload: ${file.name} (${file.size} bytes)`);
        
        const response = await fetch(`${window.API_URL}/stories/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        console.log(`CSV upload response: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log('CSV import result:', result);
            
            let message = `Import completed! ${result.imported} stories imported`;
            if (result.total && result.total !== result.imported) {
                message += ` out of ${result.total} rows`;
            }
            message += '.';
            
            if (result.errors && result.errors.length > 0) {
                message += ` ${result.errors.length} rows had errors.`;
                console.warn('Import errors:', result.errors);
            }
            
            if (result.schemaInfo) {
                console.log(`Schema info: ${result.schemaInfo}`);
            }
            
            document.getElementById('csvResult').innerHTML = `
                <div class="success-message" style="display: block;">
                    ${message}
                </div>
            `;
            
            // Refresh stories list
            if (typeof loadStories === 'function') {
                await loadStories();
            }
            
            // Close modal after 3 seconds
            setTimeout(() => {
                document.getElementById('csvModal').style.display = 'none';
                document.getElementById('csvUploadForm').reset();
                document.getElementById('csvResult').innerHTML = '';
            }, 3000);
        } else {
            let errorMessage = 'Import failed';
            
            try {
                const error = await response.json();
                console.error('CSV import error response:', error);
                
                if (error.message) {
                    errorMessage += `: ${error.message}`;
                } else if (error.error) {
                    errorMessage += `: ${error.error}`;
                }
                
                if (error.details) {
                    console.error('Error details:', error.details);
                }
                
                if (error.imported && error.imported > 0) {
                    errorMessage += ` (${error.imported} stories were imported before the error)`;
                }
                
            } catch (parseError) {
                console.error('Failed to parse error response');
                
                if (response.status === 401) {
                    errorMessage = 'Import failed: Please log in again';
                } else if (response.status === 403) {
                    errorMessage = 'Import failed: Permission denied';
                } else if (response.status === 413) {
                    errorMessage = 'Import failed: File too large';
                } else {
                    errorMessage += `: Server error (${response.status})`;
                }
            }
            
            document.getElementById('csvResult').innerHTML = `
                <div class="error-message" style="display: block;">
                    ${errorMessage}
                </div>
            `;
        }
    } catch (error) {
        console.error('CSV import network error:', error);
        
        let errorMessage = 'Network error during upload';
        if (error.message.includes('fetch')) {
            errorMessage += ' - Please check your internet connection';
        }
        
        document.getElementById('csvResult').innerHTML = `
            <div class="error-message" style="display: block;">
                ${errorMessage}
            </div>
        `;
    } finally {
        // Reset button state
        if (submitBtn && originalBtnText) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
        }
    }
}

function viewStory(storyId) {
    window.location.href = `/story-detail.html?id=${storyId}`;
}

async function deleteStory(storyId) {
    if (!confirm('Are you sure you want to delete this story?')) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/stories/${storyId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            await loadStories();
        } else {
            alert('Failed to delete story');
        }
    } catch (error) {
        alert('Error deleting story');
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

function formatSingleDayCoverage(dateString) {
    if (!dateString) return 'Single Day: Date not specified';
    return 'Single Day: ' + new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
    });
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Multi-select functionality for dashboard
function updateDashboardSelection() {
    const storyCheckboxes = document.querySelectorAll('.story-checkbox');
    selectedStories.clear();
    
    storyCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedStories.add(parseInt(checkbox.value));
        }
    });
    
    selectionMode = selectedStories.size > 0;
    updateDashboardSelectionUI();
}

function updateDashboardSelectionUI() {
    // Show/hide bulk actions bar
    const bulkActionsBar = document.getElementById('dashboardBulkActions');
    if (bulkActionsBar) {
        if (selectedStories.size > 0) {
            bulkActionsBar.style.display = 'flex';
            const selectedCount = document.getElementById('dashboardSelectedCount');
            if (selectedCount) {
                selectedCount.textContent = selectedStories.size;
            }
        } else {
            bulkActionsBar.style.display = 'none';
        }
    }
}

function toggleDashboardSelectAll() {
    const storyCheckboxes = document.querySelectorAll('.story-checkbox');
    const selectAllBtn = document.getElementById('dashboardSelectAllBtn');
    
    if (selectedStories.size === 0 || selectedStories.size < storyCheckboxes.length) {
        // Select all
        storyCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            selectedStories.add(parseInt(checkbox.value));
        });
        if (selectAllBtn) selectAllBtn.textContent = 'Deselect All';
    } else {
        // Deselect all
        storyCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        selectedStories.clear();
        if (selectAllBtn) selectAllBtn.textContent = 'Select All';
    }
    
    selectionMode = selectedStories.size > 0;
    updateDashboardSelectionUI();
}

async function dashboardBulkFavorite() {
    if (selectedStories.size === 0) return;
    
    const storyIds = Array.from(selectedStories);
    const bulkFavoriteBtn = document.querySelector('[onclick="dashboardBulkFavorite()"]');
    
    if (bulkFavoriteBtn) {
        bulkFavoriteBtn.disabled = true;
        bulkFavoriteBtn.textContent = 'Adding to Favorites...';
    }
    
    try {
        let successCount = 0;
        const promises = storyIds.map(async (storyId) => {
            try {
                const response = await fetch(`${window.API_URL}/favorites/${storyId}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                if (response.ok) successCount++;
                return response.ok;
            } catch (error) {
                console.error(`Failed to favorite story ${storyId}:`, error);
                return false;
            }
        });
        
        await Promise.all(promises);
        
        if (successCount > 0) {
            showNotification(`Added ${successCount} stories to favorites`, 'success');
        }
        
        // Clear selection
        selectedStories.clear();
        const checkboxes = document.querySelectorAll('.story-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        updateDashboardSelectionUI();
        
    } catch (error) {
        console.error('Bulk favorite failed:', error);
        showNotification('Failed to add stories to favorites', 'error');
    } finally {
        if (bulkFavoriteBtn) {
            bulkFavoriteBtn.disabled = false;
            bulkFavoriteBtn.textContent = 'Add to Favorites';
        }
    }
}

async function dashboardBulkDelete() {
    if (selectedStories.size === 0) return;
    if (currentUser.role !== 'admin') {
        showNotification('Only admins can delete stories', 'error');
        return;
    }
    
    const storyIds = Array.from(selectedStories);
    
    if (!confirm(`Are you sure you want to delete ${storyIds.length} selected stories? This action cannot be undone.`)) {
        return;
    }
    
    const bulkDeleteBtn = document.querySelector('[onclick="dashboardBulkDelete()"]');
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
            showNotification(`Deleted ${successCount} stories successfully`, 'success');
            // Reload recent stories to reflect changes
            loadRecentActivity();
        }
        
        // Clear selection
        selectedStories.clear();
        const checkboxes = document.querySelectorAll('.story-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        updateDashboardSelectionUI();
        
    } catch (error) {
        console.error('Bulk delete failed:', error);
        showNotification('Failed to delete stories', 'error');
    } finally {
        if (bulkDeleteBtn) {
            bulkDeleteBtn.disabled = false;
            bulkDeleteBtn.textContent = 'Delete Selected';
        }
    }
}

// Make functions globally available
window.updateDashboardSelection = updateDashboardSelection;
window.toggleDashboardSelectAll = toggleDashboardSelectAll;
window.dashboardBulkFavorite = dashboardBulkFavorite;
window.dashboardBulkDelete = dashboardBulkDelete;

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

// Student-specific functions
async function loadStudentClasses() {
    try {
        const response = await fetch(`${window.API_URL}/classes`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const classes = await response.json();
            displayStudentClasses(classes);
        } else {
            console.error('Failed to load classes');
        }
    } catch (error) {
        console.error('Error loading classes:', error);
    }
}

function displayStudentClasses(classes) {
    const container = document.querySelector('.container');
    
    if (classes.length === 0) {
        container.innerHTML = `
            <div class="student-dashboard">
                <div class="welcome-section">
                    <h2>🎓 Welcome to VidPOD!</h2>
                    <p>Get started by joining your first class using a 4-digit code from your teacher.</p>
                </div>
                
                <div class="no-classes">
                    <div class="join-class-card">
                        <div class="join-header">
                            <div class="join-icon">🚀</div>
                            <h3>Join Your First Class</h3>
                            <p>Enter the 4-digit class code provided by your teacher</p>
                        </div>
                        
                        <form id="joinClassForm" class="enhanced-join-form">
                            <div class="code-input-section">
                                <label for="classCode">Class Code</label>
                                <div class="code-input-container">
                                    <input type="text" 
                                           id="classCode" 
                                           placeholder="ABCD" 
                                           maxlength="4" 
                                           class="class-code-input"
                                           autocomplete="off"
                                           spellcheck="false"
                                           required>
                                    <div class="input-help">
                                        <span class="char-count">0/4</span>
                                    </div>
                                </div>
                                <div class="input-feedback" id="inputFeedback"></div>
                            </div>
                            
                            <button type="submit" class="btn btn-primary btn-join" disabled>
                                <span class="btn-text">🎯 Join Class</span>
                                <span class="btn-loader" style="display: none;">⏳ Joining...</span>
                            </button>
                        </form>
                        
                        <div id="joinMessage" class="join-message"></div>
                        
                        <div class="help-section">
                            <h4>💡 Need help?</h4>
                            <ul>
                                <li>Ask your teacher for the 4-digit class code</li>
                                <li>Class codes are case-insensitive</li>
                                <li>You can join multiple classes</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="student-dashboard">
                <div class="dashboard-header">
                    <h2>📚 My Classes</h2>
                    <p>Manage your enrolled classes and join new ones</p>
                </div>
                
                <div class="classes-grid">
                    ${classes.map(classItem => createClassCard(classItem)).join('')}
                </div>
                
                <div class="join-another-class">
                    <div class="join-class-card compact">
                        <div class="join-header">
                            <div class="join-icon">➕</div>
                            <h3>Join Another Class</h3>
                            <p>Add more classes to your dashboard</p>
                        </div>
                        
                        <form id="joinClassForm" class="enhanced-join-form">
                            <div class="code-input-section">
                                <label for="classCode">Class Code</label>
                                <div class="code-input-container">
                                    <input type="text" 
                                           id="classCode" 
                                           placeholder="ABCD" 
                                           maxlength="4" 
                                           class="class-code-input"
                                           autocomplete="off"
                                           spellcheck="false"
                                           required>
                                    <div class="input-help">
                                        <span class="char-count">0/4</span>
                                    </div>
                                </div>
                                <div class="input-feedback" id="inputFeedback"></div>
                            </div>
                            
                            <button type="submit" class="btn btn-primary btn-join" disabled>
                                <span class="btn-text">🎯 Join Class</span>
                                <span class="btn-loader" style="display: none;">⏳ Joining...</span>
                            </button>
                        </form>
                        
                        <div id="joinMessage" class="join-message"></div>
                    </div>
                </div>
            </div>
        `;
    }
}

function createClassCard(classItem) {
    return `
        <div class="class-card">
            <div class="class-header">
                <h3>${classItem.class_name}</h3>
                <span class="class-code">Code: ${classItem.class_code}</span>
            </div>
            <div class="class-details">
                <p><strong>Subject:</strong> ${classItem.subject || 'N/A'}</p>
                <p><strong>Teacher:</strong> ${classItem.teacher_name}</p>
                <p><strong>School:</strong> ${classItem.school_name}</p>
                <p><strong>Students:</strong> ${classItem.student_count}</p>
                <p><strong>Joined:</strong> ${formatDate(classItem.joined_at)}</p>
            </div>
            ${classItem.description ? `<p class="class-description">${classItem.description}</p>` : ''}
            <div class="class-actions">
                <button class="btn btn-secondary" onclick="leaveClass(${classItem.id})">Leave Class</button>
            </div>
        </div>
    `;
}

function setupStudentEventListeners() {
    // Will be set up after DOM is created
    setTimeout(() => {
        const joinForm = document.getElementById('joinClassForm');
        if (joinForm) {
            joinForm.addEventListener('submit', handleJoinClass);
        }
        
        // Enhanced class code input handling
        const classCodeInput = document.getElementById('classCode');
        if (classCodeInput) {
            // Real-time validation and formatting
            classCodeInput.addEventListener('input', (e) => {
                let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                e.target.value = value;
                
                // Update character count
                const charCount = document.querySelector('.char-count');
                if (charCount) {
                    charCount.textContent = `${value.length}/4`;
                    charCount.className = `char-count ${value.length === 4 ? 'complete' : ''}`;
                }
                
                // Update input feedback
                updateInputFeedback(value);
                
                // Enable/disable submit button
                const submitBtn = document.querySelector('.btn-join');
                if (submitBtn) {
                    submitBtn.disabled = value.length !== 4;
                    submitBtn.classList.toggle('enabled', value.length === 4);
                }
                
                // Add visual feedback to input
                e.target.classList.toggle('valid', value.length === 4);
                e.target.classList.toggle('partial', value.length > 0 && value.length < 4);
            });
            
            // Focus effect
            classCodeInput.addEventListener('focus', () => {
                document.querySelector('.code-input-container').classList.add('focused');
            });
            
            classCodeInput.addEventListener('blur', () => {
                document.querySelector('.code-input-container').classList.remove('focused');
            });
            
            // Paste handling
            classCodeInput.addEventListener('paste', (e) => {
                e.preventDefault();
                const paste = (e.clipboardData || window.clipboardData).getData('text');
                const cleanPaste = paste.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
                e.target.value = cleanPaste;
                e.target.dispatchEvent(new Event('input'));
            });
        }
    }, 100);
}

function updateInputFeedback(value) {
    const feedback = document.getElementById('inputFeedback');
    if (!feedback) return;
    
    if (value.length === 0) {
        feedback.textContent = '';
        feedback.className = 'input-feedback';
    } else if (value.length < 4) {
        feedback.textContent = `Enter ${4 - value.length} more character${4 - value.length > 1 ? 's' : ''}`;
        feedback.className = 'input-feedback partial';
    } else if (value.length === 4) {
        feedback.textContent = 'Ready to join! Click the button below.';
        feedback.className = 'input-feedback valid';
    }
}

async function handleJoinClass(e) {
    e.preventDefault();
    
    const classCode = document.getElementById('classCode').value.trim();
    const messageDiv = document.getElementById('joinMessage');
    const submitButton = e.target.querySelector('button[type="submit"]');
    const btnText = submitButton.querySelector('.btn-text');
    const btnLoader = submitButton.querySelector('.btn-loader');
    
    if (classCode.length !== 4) {
        showEnhancedJoinMessage('Class code must be exactly 4 characters', 'error');
        return;
    }
    
    // Show loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    submitButton.disabled = true;
    submitButton.classList.add('loading');
    
    try {
        const response = await fetch(`${window.API_URL}/classes/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ class_code: classCode })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Show success message with class details
            showEnhancedJoinMessage(
                `🎉 Successfully joined "${result.class_name}"!`, 
                'success',
                result
            );
            
            // Clear form
            document.getElementById('classCode').value = '';
            updateInputFeedback('');
            document.querySelector('.char-count').textContent = '0/4';
            document.querySelector('.char-count').className = 'char-count';
            
            // Reload classes after showing success
            setTimeout(() => {
                loadStudentClasses();
            }, 2500);
        } else {
            showEnhancedJoinMessage(result.error || 'Failed to join class', 'error');
        }
    } catch (error) {
        showEnhancedJoinMessage('Network error. Please try again.', 'error');
    } finally {
        // Reset button state
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        submitButton.disabled = classCode.length !== 4;
        submitButton.classList.remove('loading');
        submitButton.classList.toggle('enabled', classCode.length === 4);
    }
}

async function leaveClass(classId) {
    if (!confirm('Are you sure you want to leave this class?')) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/classes/${classId}/leave`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            await loadStudentClasses();
        } else {
            alert('Failed to leave class');
        }
    } catch (error) {
        alert('Error leaving class');
    }
}

function showEnhancedJoinMessage(message, type, classData = null) {
    const messageDiv = document.getElementById('joinMessage');
    if (!messageDiv) return;
    
    messageDiv.className = `join-message ${type}`;
    
    if (type === 'success' && classData) {
        messageDiv.innerHTML = `
            <div class="success-content">
                <div class="success-icon">✅</div>
                <div class="success-text">
                    <h4>${message}</h4>
                    <div class="class-info">
                        <p><strong>Teacher:</strong> ${classData.teacher_name || 'N/A'}</p>
                        <p><strong>Subject:</strong> ${classData.subject || 'General'}</p>
                        <p><strong>Students:</strong> ${classData.student_count || 0} enrolled</p>
                    </div>
                    <p class="reload-note">Updating your dashboard...</p>
                </div>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-icon">${type === 'error' ? '❌' : '✅'}</div>
                <div class="message-text">${message}</div>
            </div>
        `;
    }
    
    messageDiv.style.display = 'block';
    
    // Auto-hide after delay
    const hideDelay = type === 'success' ? 3000 : 5000;
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, hideDelay);
}

// Keep backward compatibility
function showJoinMessage(message, type) {
    showEnhancedJoinMessage(message, type);
}

// Dashboard Statistics Functions
async function loadDashboardStats() {
    try {
        console.log('Loading dashboard statistics...');
        
        // Load user's stories count
        await loadMyStoriesCount();
        
        // Load user's favorites count
        await loadMyFavoritesCount();
        
        // Load total available stories
        await loadTotalStoriesCount();
        
        // Load class count for teachers/students
        if (currentUser && (currentUser.role === 'teacher' || currentUser.role === 'student')) {
            await loadMyClassesCount();
        }
        
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

async function loadMyStoriesCount() {
    try {
        const response = await fetch(`${window.API_URL}/stories?uploaded_by=${currentUser.id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stories = await response.json();
            const count = stories.length;
            document.getElementById('myStoriesCount').textContent = count;
            console.log(`My Stories count: ${count}`);
        }
    } catch (error) {
        console.error('Error loading my stories count:', error);
        document.getElementById('myStoriesCount').textContent = '0';
    }
}

async function loadMyFavoritesCount() {
    try {
        const response = await fetch(`${window.API_URL}/favorites`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const favorites = await response.json();
            const count = favorites.length;
            document.getElementById('myFavoritesCount').textContent = count;
            console.log(`My Favorites count: ${count}`);
        }
    } catch (error) {
        console.error('Error loading my favorites count:', error);
        document.getElementById('myFavoritesCount').textContent = '0';
    }
}

async function loadTotalStoriesCount() {
    try {
        const response = await fetch(`${window.API_URL}/stories`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stories = await response.json();
            const count = stories.length;
            document.getElementById('totalStoriesCount').textContent = count;
            console.log(`Total Stories count: ${count}`);
        }
    } catch (error) {
        console.error('Error loading total stories count:', error);
        document.getElementById('totalStoriesCount').textContent = '0';
    }
}

async function loadMyClassesCount() {
    try {
        const response = await fetch(`${window.API_URL}/classes`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const classes = await response.json();
            const count = classes.length;
            document.getElementById('myClassesCount').textContent = count;
            
            // Show the classes stat card for teachers/students
            const classStatsCard = document.getElementById('classStatsCard');
            if (classStatsCard) {
                classStatsCard.style.display = 'block';
            }
            
            console.log(`My Classes count: ${count}`);
        }
    } catch (error) {
        console.error('Error loading my classes count:', error);
        document.getElementById('myClassesCount').textContent = '0';
    }
}

async function loadRecentActivity() {
    try {
        console.log('Loading recent activity...');
        
        // Load recent stories by current user
        await loadMyRecentStories();
        
        // Load recent favorites
        await loadRecentFavorites();
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

async function loadMyRecentStories() {
    try {
        const response = await fetch(`${window.API_URL}/stories?uploaded_by=${currentUser.id}&limit=5`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stories = await response.json();
            const container = document.getElementById('myRecentStories');
            
            if (stories.length === 0) {
                container.innerHTML = '<div class="no-activity">No stories created yet. <a href="/add-story.html">Create your first story</a></div>';
            } else {
                container.innerHTML = stories.slice(0, 5).map(story => `
                    <div class="activity-item">
                        <h4><a href="/story-detail.html?id=${story.id}">${story.idea_title}</a></h4>
                        <p class="activity-meta">Created ${formatDate(story.uploaded_date)}</p>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading recent stories:', error);
        document.getElementById('myRecentStories').innerHTML = '<div class="error">Unable to load recent stories</div>';
    }
}

async function loadRecentFavorites() {
    try {
        const response = await fetch(`${window.API_URL}/favorites?limit=5`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const favorites = await response.json();
            const container = document.getElementById('recentFavorites');
            
            if (favorites.length === 0) {
                container.innerHTML = '<div class="no-activity">No favorites yet. Browse stories to add some favorites!</div>';
            } else {
                container.innerHTML = favorites.slice(0, 5).map(story => `
                    <div class="activity-item">
                        <h4><a href="/story-detail.html?id=${story.id}">${story.idea_title}</a></h4>
                        <p class="activity-meta">Favorited ${formatDate(story.favorited_at || story.created_at)}</p>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading recent favorites:', error);
        document.getElementById('recentFavorites').innerHTML = '<div class="error">Unable to load recent favorites</div>';
    }
}

// Quick action functions
function viewMyStories() {
    // Filter to show only user's stories
    const searchParams = new URLSearchParams();
    searchParams.append('uploaded_by', currentUser.id);
    
    // If there's a stories section on this page, filter it
    if (typeof loadStories === 'function') {
        loadStories({ uploaded_by: currentUser.id });
    } else {
        // Navigate to a stories page with filter
        window.location.href = `/stories.html?${searchParams.toString()}`;
    }
}

function viewFavorites() {
    // Navigate to favorites or show favorites section
    window.location.href = '/favorites.html';
}