// Stories.js - uses window.API_URL set by auth.js
// Fallback only if window.API_URL is not already set
window.API_URL = window.API_URL || 'https://podcast-stories-production.up.railway.app/api';

// Global variables
let allStories = [];
let filteredStories = [];
let currentUser = null;
let allTags = [];
let currentPage = 0;
let storiesPerPage = 12;
let currentViewMode = 'grid';
let selectedStories = new Set();
let selectionMode = false;
let userFavorites = new Set(); // Store user's favorited story IDs

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    await loadUserInfo();
    await loadTags();
    await loadUserFavorites(); // Load user's favorites
    
    // Check if this is add-story page
    if (window.location.pathname.includes('add-story.html')) {
        setupAddStoryPage();
    } else {
        await loadStories();
        setupEventListeners();
        setupCSVImport();
    }
});

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return false;
    }
    
    // Check if token is expired
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (payload.exp && currentTime >= payload.exp) {
            console.log('Token expired, redirecting to login');
            localStorage.clear();
            window.location.href = '/index.html';
            return false;
        }
    } catch (error) {
        console.error('Invalid token format:', error);
        localStorage.clear();
        window.location.href = '/index.html';
        return false;
    }
    
    return true;
}

async function makeAuthenticatedRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No authentication token');
    }
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, finalOptions);
        
        // Handle token expiration
        if (response.status === 401) {
            console.log('Authentication failed, clearing token and redirecting');
            localStorage.clear();
            window.location.href = '/index.html';
            throw new Error('Authentication failed');
        }
        
        return response;
    } catch (error) {
        console.error('Authenticated request failed:', error);
        throw error;
    }
}

async function loadUserInfo() {
    const user = localStorage.getItem('user');
    if (user) {
        currentUser = JSON.parse(user);
        updateUserDisplay();
    }
}

function updateUserDisplay() {
    const userInfo = document.getElementById('userInfo');
    if (userInfo && currentUser) {
        userInfo.textContent = `${currentUser.name || currentUser.username}`;
    }
    
    // Update UI elements based on user role
    updateUIForUserRole();
}

function updateUIForUserRole() {
    if (!currentUser) return;
    
    // Show/hide delete button based on role
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn) {
        // Show delete button for teachers and admins
        if (currentUser.role === 'teacher' || currentUser.role === 'amitrace_admin') {
            bulkDeleteBtn.style.display = 'inline-block';
        } else {
            bulkDeleteBtn.style.display = 'none';
        }
    }
    
    // Show/hide teacher and admin links
    const teacherLink = document.getElementById('teacherLink');
    const adminLink = document.getElementById('adminLink');
    
    if (teacherLink && (currentUser.role === 'teacher' || currentUser.role === 'amitrace_admin')) {
        teacherLink.style.display = 'inline-block';
    }
    
    if (adminLink && currentUser.role === 'amitrace_admin') {
        adminLink.style.display = 'inline-block';
    }
    
    // Update role badge if it exists
    const roleBadge = document.getElementById('userRoleBadge');
    if (roleBadge) {
        roleBadge.textContent = currentUser.role;
        roleBadge.className = `role-badge ${currentUser.role}`;
    }
}

async function loadTags() {
    try {
        const response = await makeAuthenticatedRequest(`${window.API_URL}/tags`);

        if (response.ok) {
            allTags = await response.json();
            console.log(`Loaded ${allTags.length} tags`);
            
            // Populate tag select for add-story page
            populateAddStoryTags();
        } else {
            console.error('Failed to load tags:', response.status);
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

async function loadUserFavorites() {
    try {
        const response = await makeAuthenticatedRequest(`${window.API_URL}/favorites`);

        if (response.ok) {
            const favorites = await response.json();
            userFavorites.clear();
            favorites.forEach(story => {
                userFavorites.add(story.id);
            });
            console.log(`Loaded ${userFavorites.size} user favorites`);
        } else {
            console.log('No favorites found or error loading favorites');
        }
    } catch (error) {
        console.error('Error loading user favorites:', error);
    }
}

// Legacy function - removed in favor of populateSearchTagsFilter

async function loadStories() {
    try {
        const response = await makeAuthenticatedRequest(`${window.API_URL}/stories`);

        if (response.ok) {
            allStories = await response.json();
            // Filter to show only approved stories for students
            if (currentUser && currentUser.role === 'student') {
                allStories = allStories.filter(story => story.approval_status === 'approved');
            }
            filteredStories = [...allStories];
            displayStories();
        } else {
            console.error('Failed to load stories:', response.status);
            showError('Failed to load stories. Please refresh the page.');
        }
    } catch (error) {
        console.error('Error loading stories:', error);
        showError('Network error. Please check your connection.');
    }
}

function displayStories() {
    const storiesContainer = document.getElementById('storiesContainer');
    const storiesGrid = document.getElementById('storiesGrid');
    if (!storiesGrid || !storiesContainer) return;

    // Update search stats
    updateSearchStats();

    if (filteredStories.length === 0) {
        storiesGrid.innerHTML = `
            <div class="no-stories">
                <p>No stories found</p>
            </div>
        `;
        return;
    }

    // Apply current view mode
    if (currentViewMode === 'list') {
        renderListView();
    } else {
        renderGridView();
    }
}

function renderGridView() {
    const storiesGrid = document.getElementById('storiesGrid');
    const storiesContainer = document.getElementById('storiesContainer');
    
    // Set grid view classes
    storiesContainer.className = 'stories-container';
    storiesGrid.className = 'stories-grid';

    storiesGrid.innerHTML = filteredStories.map(story => renderStoryCard(story, 'grid')).join('');
}

function renderListView() {
    const storiesGrid = document.getElementById('storiesGrid');
    const storiesContainer = document.getElementById('storiesContainer');
    
    // Set list view classes
    storiesContainer.className = 'stories-container';
    storiesGrid.className = 'stories-list';

    storiesGrid.innerHTML = filteredStories.map(story => renderStoryCard(story, 'list')).join('');
}

function renderStoryCard(story, viewMode) {
    const cardClass = viewMode === 'list' ? 'story-card-list' : 'story-card';
    const isFavorited = userFavorites.has(story.id);
    
    if (viewMode === 'list') {
        return `
            <div class="${cardClass} card" data-story-id="${story.id}">
                ${selectionMode ? `
                    <div class="story-selection">
                        <label class="checkbox-container">
                            <input type="checkbox" class="story-checkbox" value="${story.id}" onchange="updateSelection()">
                            <span class="checkmark"></span>
                        </label>
                    </div>
                ` : ''}
                
                <div class="story-header">
                    <h3>${story.idea_title || story.title}</h3>
                    <div class="story-meta">
                        <span class="story-author">By: ${story.uploaded_by_name || story.author || 'Unknown'}</span>
                        <span class="story-date">${formatDate(story.uploaded_date || story.created_at)}</span>
                    </div>
                </div>
                
                <div class="story-description">
                    <p>${truncateText(story.idea_description || story.description || 'No description available', 150)}</p>
                </div>
                
                <div class="story-tags">
                    ${story.tags && story.tags.length > 0 ? 
                        story.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('') + 
                        (story.tags.length > 3 ? ` <span class="tag-count">+${story.tags.length - 3}</span>` : '') :
                        '<span class="no-tags">No tags</span>'
                    }
                </div>
                
                <div class="story-interviewees">
                    ${story.interviewees && story.interviewees.length > 0 ?
                        story.interviewees.slice(0, 2).join(', ') + 
                        (story.interviewees.length > 2 ? ` +${story.interviewees.length - 2}` : '') :
                        'No interviewees'
                    }
                </div>
                
                <div class="story-actions">
                    <button class="btn btn-sm btn-outline favorite-btn ${isFavorited ? 'favorited' : ''}" 
                            onclick="toggleFavorite(${story.id})" title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                        <span class="heart-icon">${isFavorited ? '♥' : '♡'}</span>
                        <span class="favorite-count">${story.favorite_count || 0}</span>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="viewStory(${story.id})">View</button>
                    ${currentUser && (currentUser.role !== 'student' || story.uploaded_by === currentUser.id) ? 
                        `<button class="btn btn-sm btn-secondary" onclick="editStory(${story.id})">Edit</button>` : 
                        ''
                    }
                </div>
            </div>
        `;
    } else {
        // Grid view (existing implementation with selection checkbox added)
        return `
            <div class="${cardClass}" data-story-id="${story.id}">
                ${selectionMode ? `
                    <div class="story-selection">
                        <label class="checkbox-container">
                            <input type="checkbox" class="story-checkbox" value="${story.id}" onchange="updateSelection()">
                            <span class="checkmark"></span>
                        </label>
                    </div>
                ` : ''}
                
                <h3>${story.idea_title || story.title}</h3>
                <p class="story-description">${story.idea_description || story.description || 'No description available'}</p>
                <div class="story-meta">
                    <span class="story-author">By: ${story.uploaded_by_name || story.author || 'Unknown'}</span>
                    <span class="story-date">${formatDate(story.uploaded_date || story.created_at)}</span>
                </div>
                <div class="story-tags">
                    ${story.tags && story.tags.length > 0 ? 
                        story.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : 
                        '<span class="no-tags">No tags</span>'
                    }
                </div>
                <div class="story-actions">
                    <button class="btn btn-sm btn-outline favorite-btn ${isFavorited ? 'favorited' : ''}" 
                            onclick="toggleFavorite(${story.id})" title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}">
                        <span class="heart-icon">${isFavorited ? '♥' : '♡'}</span>
                        <span class="favorite-count">${story.favorite_count || 0}</span>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="viewStory(${story.id})">View Details</button>
                    ${currentUser && (currentUser.role !== 'student' || story.uploaded_by === currentUser.id) ? 
                        `<button class="btn btn-sm btn-secondary" onclick="editStory(${story.id})">Edit</button>` : 
                        ''
                    }
                </div>
            </div>
        `;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function viewStory(storyId) {
    window.location.href = `/story-detail.html?id=${storyId}`;
}

function editStory(storyId) {
    window.location.href = `/add-story.html?id=${storyId}`;
}

function setupEventListeners() {
    // Search form submission
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            applyFilters();
        });
    }

    // Search functionality (for live search)
    const searchInput = document.getElementById('searchKeywords');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 300));
    }

    // Filter listeners - using the correct IDs from stories.html
    const filters = ['searchTags', 'searchStartDate', 'searchEndDate', 'searchInterviewee'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', applyFilters);
        }
    });

    // Populate tags in search filter
    populateSearchTagsFilter();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchKeywords')?.value.toLowerCase() || '';
    const searchTags = document.getElementById('searchTags');
    const selectedTags = searchTags ? Array.from(searchTags.selectedOptions).map(opt => opt.value) : [];
    const startDate = document.getElementById('searchStartDate')?.value || '';
    const endDate = document.getElementById('searchEndDate')?.value || '';
    const interviewee = document.getElementById('searchInterviewee')?.value.toLowerCase() || '';

    filteredStories = allStories.filter(story => {
        // Search filter (title and description)
        if (searchTerm && 
            !story.idea_title?.toLowerCase().includes(searchTerm) &&
            !story.idea_description?.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Tag filter (multiple tags)
        if (selectedTags.length > 0) {
            const storyTags = story.tags || [];
            const hasMatchingTag = selectedTags.some(tag => storyTags.includes(tag));
            if (!hasMatchingTag) {
                return false;
            }
        }

        // Interviewee filter
        if (interviewee && story.interviewees) {
            const storyInterviewees = Array.isArray(story.interviewees) ? 
                story.interviewees.join(' ').toLowerCase() : 
                story.interviewees.toLowerCase();
            if (!storyInterviewees.includes(interviewee)) {
                return false;
            }
        }

        // Date filters
        if (startDate && story.coverage_start_date && new Date(story.coverage_start_date) < new Date(startDate)) {
            return false;
        }
        if (endDate && story.coverage_end_date && new Date(story.coverage_end_date) > new Date(endDate)) {
            return false;
        }

        return true;
    });

    displayStories();
    console.log(`Filtered ${filteredStories.length} stories from ${allStories.length} total`);
}

function populateSearchTagsFilter() {
    const searchTags = document.getElementById('searchTags');
    if (searchTags && allTags.length > 0) {
        searchTags.innerHTML = '';
        allTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.tag_name;
            option.textContent = tag.tag_name;
            searchTags.appendChild(option);
        });
        console.log(`Populated ${allTags.length} tags in search filter`);
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

// Add story page functions
function setupAddStoryPage() {
    console.log('Setting up add-story page...');
    
    // Setup form submission
    const form = document.getElementById('storyForm');
    if (form) {
        form.addEventListener('submit', handleAddStorySubmit);
        console.log('Form submission handler attached');
    }
}

function populateAddStoryTags() {
    const tagsSelect = document.getElementById('tags');
    if (tagsSelect && allTags.length > 0) {
        // Clear existing options
        tagsSelect.innerHTML = '';
        
        // Add tags as options
        allTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.tag_name;
            option.textContent = tag.tag_name;
            tagsSelect.appendChild(option);
        });
        
        console.log(`Populated ${allTags.length} tags in add-story select`);
    }
}

async function handleAddStorySubmit(e) {
    e.preventDefault();
    console.log('Add story form submitted');
    
    // Collect form data
    const formData = {
        idea_title: document.getElementById('idea_title')?.value,
        idea_description: document.getElementById('idea_description')?.value,
        coverage_start_date: document.getElementById('coverage_start_date')?.value,
        coverage_end_date: document.getElementById('coverage_end_date')?.value,
        question_1: document.getElementById('question_1')?.value || '',
        question_2: document.getElementById('question_2')?.value || '',
        question_3: document.getElementById('question_3')?.value || '',
        question_4: document.getElementById('question_4')?.value || '',
        question_5: document.getElementById('question_5')?.value || '',
        question_6: document.getElementById('question_6')?.value || ''
    };
    
    // Get selected tags
    const tagsSelect = document.getElementById('tags');
    if (tagsSelect) {
        const selectedTags = Array.from(tagsSelect.selectedOptions).map(opt => opt.value);
        formData.tags = selectedTags;
        console.log('Selected tags:', selectedTags);
    }
    
    // Get interviewees if field exists
    const intervieweesField = document.getElementById('interviewees');
    if (intervieweesField && intervieweesField.value) {
        formData.interviewees = intervieweesField.value.split(',').map(name => name.trim());
    }
    
    console.log('Form data:', formData);
    
    // Submit to API
    await saveNewStory(formData);
}

async function saveNewStory(storyData) {
    console.log('Saving new story...', storyData);
    
    // Show loading state
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
    }
    
    try {
        const response = await fetch(`${window.API_URL}/stories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(storyData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Story saved successfully:', result);
            showSuccess('Story saved successfully!');
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2000);
        } else {
            const error = await response.json();
            console.error('Failed to save story:', error);
            showError(error.message || 'Failed to save story. Please try again.');
            
            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Story';
            }
        }
    } catch (error) {
        console.error('Error saving story:', error);
        showError('Network error. Please check your connection and try again.');
        
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Story';
        }
    }
}

function showSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
    alert.style.cssText = 'background: #d4edda; color: #155724; padding: 10px; margin: 10px 0; border-radius: 4px; border: 1px solid #c3e6cb;';
    alert.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alert, container.firstChild);
        setTimeout(() => alert.remove(), 5000);
    }
}

// Utility functions
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function escapeCSV(text) {
    if (!text) return '';
    const str = String(text);
    // If string contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function formatDateForCSV(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

function updateSearchStats() {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        const total = allStories.length;
        const showing = filteredStories.length;
        if (showing === total) {
            resultsCount.textContent = `Showing all ${total} stories`;
        } else {
            resultsCount.textContent = `Showing ${showing} of ${total} stories`;
        }
    }
}

// View mode functions (called by HTML buttons) - defined immediately for global access
function setViewMode(mode) {
    currentViewMode = mode;
    
    // Update button states
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    
    if (gridBtn && listBtn) {
        gridBtn.classList.toggle('active', mode === 'grid');
        listBtn.classList.toggle('active', mode === 'list');
    }
    
    // Re-render stories with new view mode
    displayStories();
    
    console.log(`View mode changed to: ${mode}`);
}

// Make globally available
window.setViewMode = setViewMode;

// Selection functions (called by HTML buttons)
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const storyCheckboxes = document.querySelectorAll('.story-checkbox');
    
    if (selectAllCheckbox.checked) {
        // Select all
        storyCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            selectedStories.add(parseInt(checkbox.value));
        });
        selectionMode = true;
    } else {
        // Deselect all
        storyCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        selectedStories.clear();
        selectionMode = selectedStories.size > 0;
    }
    
    updateSelectionUI();
}

window.toggleSelectAll = toggleSelectAll;

function updateSelection() {
    const storyCheckboxes = document.querySelectorAll('.story-checkbox');
    selectedStories.clear();
    
    storyCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedStories.add(parseInt(checkbox.value));
        }
    });
    
    selectionMode = selectedStories.size > 0;
    updateSelectionUI();
}

window.updateSelection = updateSelection;

function updateSelectionUI() {
    const selectionInfo = document.getElementById('selectionInfo');
    const selectedCount = document.getElementById('selectedCount');
    const bulkActionsBar = document.getElementById('bulkActionsBar');
    const bulkSelectedCount = document.getElementById('bulkSelectedCount');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    // Update selection info
    if (selectionInfo && selectedCount) {
        if (selectedStories.size > 0) {
            selectionInfo.style.display = 'block';
            selectedCount.textContent = selectedStories.size;
        } else {
            selectionInfo.style.display = 'none';
        }
    }
    
    // Update bulk actions bar
    if (bulkActionsBar && bulkSelectedCount) {
        if (selectedStories.size > 0) {
            bulkActionsBar.style.display = 'block';
            bulkSelectedCount.textContent = selectedStories.size;
        } else {
            bulkActionsBar.style.display = 'none';
        }
    }
    
    // Update select all checkbox state
    if (selectAllCheckbox) {
        const storyCheckboxes = document.querySelectorAll('.story-checkbox');
        const checkedCount = document.querySelectorAll('.story-checkbox:checked').length;
        
        if (checkedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === storyCheckboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}

// Search and filter functions (called by HTML)
function clearFilters() {
    // Clear all filter inputs
    const inputs = ['searchKeywords', 'searchTags', 'searchStartDate', 'searchEndDate', 'searchInterviewee'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (element.type === 'select-multiple') {
                Array.from(element.options).forEach(option => option.selected = false);
            } else {
                element.value = '';
            }
        }
    });
    
    // Reset filtered stories and redisplay
    filteredStories = [...allStories];
    displayStories();
    
    console.log('Filters cleared');
}

window.clearFilters = clearFilters;

function sortStories() {
    const sortBy = document.getElementById('sortBy');
    if (!sortBy) return;
    
    const sortValue = sortBy.value;
    
    filteredStories.sort((a, b) => {
        switch (sortValue) {
            case 'newest':
                return new Date(b.uploaded_date || b.created_at) - new Date(a.uploaded_date || a.created_at);
            case 'oldest':
                return new Date(a.uploaded_date || a.created_at) - new Date(b.uploaded_date || b.created_at);
            case 'title':
                return (a.idea_title || a.title || '').localeCompare(b.idea_title || b.title || '');
            case 'author':
                return (a.uploaded_by_name || a.author || '').localeCompare(b.uploaded_by_name || b.author || '');
            default:
                return 0;
        }
    });
    
    displayStories();
    console.log(`Stories sorted by: ${sortValue}`);
}

window.sortStories = sortStories;

// Bulk action functions (called by HTML buttons)
async function bulkFavorite() {
    if (selectedStories.size === 0) return;
    
    const storyIds = Array.from(selectedStories);
    console.log(`Adding ${storyIds.length} stories to favorites:`, storyIds);
    
    // Show loading state
    const bulkFavoriteBtn = document.querySelector('[onclick="bulkFavorite()"]');
    if (bulkFavoriteBtn) {
        bulkFavoriteBtn.disabled = true;
        bulkFavoriteBtn.textContent = 'Adding to Favorites...';
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    try {
        // Process favorites in parallel for better performance
        const promises = storyIds.map(async (storyId) => {
            try {
                // Only add if not already favorited
                if (!userFavorites.has(storyId)) {
                    const response = await fetch(`${window.API_URL}/favorites/${storyId}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        userFavorites.add(storyId);
                        updateFavoriteUI(storyId, true, result.total_favorites);
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } else {
                    // Already favorited, count as success
                    successCount++;
                }
            } catch (error) {
                console.error(`Error favoriting story ${storyId}:`, error);
                errorCount++;
            }
        });
        
        await Promise.all(promises);
        
        // Show results
        if (errorCount === 0) {
            showNotification(`Successfully added ${successCount} stories to favorites!`, 'success');
        } else if (successCount > 0) {
            showNotification(`Added ${successCount} stories to favorites. ${errorCount} failed.`, 'warning');
        } else {
            showNotification(`Failed to add stories to favorites. Please try again.`, 'error');
        }
        
        // Clear selection after successful operation
        if (successCount > 0) {
            clearSelection();
        }
        
    } catch (error) {
        console.error('Bulk favorite error:', error);
        showNotification('Network error during bulk favorite operation.', 'error');
    } finally {
        // Restore button state
        if (bulkFavoriteBtn) {
            bulkFavoriteBtn.disabled = false;
            bulkFavoriteBtn.textContent = 'Add to Favorites';
        }
    }
}

function bulkExport() {
    if (selectedStories.size === 0) return;
    
    const storyIds = Array.from(selectedStories);
    console.log(`Exporting ${storyIds.length} stories:`, storyIds);
    
    // Show loading state
    const bulkExportBtn = document.querySelector('[onclick="bulkExport()"]');
    if (bulkExportBtn) {
        bulkExportBtn.disabled = true;
        bulkExportBtn.textContent = 'Exporting...';
    }
    
    try {
        // Get selected stories data
        const selectedStoriesData = filteredStories.filter(story => selectedStories.has(story.id));
        
        if (selectedStoriesData.length === 0) {
            showNotification('No stories found to export.', 'warning');
            return;
        }
        
        // Create CSV content
        const csvHeaders = [
            'idea_title', 'enhanced_description', 'question_1', 'question_2', 'question_3', 
            'question_4', 'question_5', 'question_6', 'coverage_start_date', 'coverage_end_date', 
            'auto_tags', 'interviewees'
        ];
        
        const csvRows = selectedStoriesData.map(story => {
            return [
                escapeCSV(story.idea_title || story.title || ''),
                escapeCSV(story.idea_description || story.description || ''),
                escapeCSV(story.question_1 || ''),
                escapeCSV(story.question_2 || ''),
                escapeCSV(story.question_3 || ''),
                escapeCSV(story.question_4 || ''),
                escapeCSV(story.question_5 || ''),
                escapeCSV(story.question_6 || ''),
                formatDateForCSV(story.coverage_start_date),
                formatDateForCSV(story.coverage_end_date),
                escapeCSV(Array.isArray(story.tags) ? story.tags.join(', ') : ''),
                escapeCSV(Array.isArray(story.interviewees) ? story.interviewees.join(', ') : '')
            ];
        });
        
        // Combine headers and rows
        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.join(','))
            .join('\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `vidpod-stories-export-${timestamp}.csv`;
        link.setAttribute('download', filename);
        
        // Trigger download
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification(`Successfully exported ${selectedStoriesData.length} stories to ${filename}`, 'success');
        
        // Clear selection after successful export
        clearSelection();
        
    } catch (error) {
        console.error('Bulk export error:', error);
        showNotification('Error during export. Please try again.', 'error');
    } finally {
        // Restore button state
        if (bulkExportBtn) {
            bulkExportBtn.disabled = false;
            bulkExportBtn.textContent = 'Export CSV';
        }
    }
}

async function bulkDelete() {
    if (selectedStories.size === 0) return;
    
    const storyIds = Array.from(selectedStories);
    console.log(`Attempting to delete ${storyIds.length} stories:`, storyIds);
    
    // Check authorization - only allow admins or story owners
    if (currentUser.role === 'student') {
        // Students can only delete their own stories
        const selectedStoriesData = filteredStories.filter(story => selectedStories.has(story.id));
        const unauthorizedStories = selectedStoriesData.filter(story => story.uploaded_by !== currentUser.id);
        
        if (unauthorizedStories.length > 0) {
            showNotification(`You can only delete your own stories. ${unauthorizedStories.length} selected stories cannot be deleted.`, 'error');
            return;
        }
    }
    
    // Confirm deletion
    const confirmMessage = `Are you sure you want to delete ${storyIds.length} selected stories?\n\nThis action cannot be undone.`;
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Show loading state
    const bulkDeleteBtn = document.querySelector('[onclick="bulkDelete()"]');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.disabled = true;
        bulkDeleteBtn.textContent = 'Deleting...';
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    try {
        // Process deletions sequentially to avoid overwhelming the server
        for (const storyId of storyIds) {
            try {
                const response = await fetch(`${window.API_URL}/stories/${storyId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    successCount++;
                    // Remove from local arrays
                    allStories = allStories.filter(story => story.id !== storyId);
                    filteredStories = filteredStories.filter(story => story.id !== storyId);
                    userFavorites.delete(storyId);
                } else {
                    const error = await response.json();
                    errorCount++;
                    errors.push(`Story ${storyId}: ${error.message || 'Delete failed'}`);
                }
            } catch (error) {
                console.error(`Error deleting story ${storyId}:`, error);
                errorCount++;
                errors.push(`Story ${storyId}: Network error`);
            }
        }
        
        // Show results
        if (errorCount === 0) {
            showNotification(`Successfully deleted ${successCount} stories!`, 'success');
        } else if (successCount > 0) {
            showNotification(`Deleted ${successCount} stories. ${errorCount} failed.`, 'warning');
            if (errors.length > 0) {
                console.warn('Delete errors:', errors);
            }
        } else {
            showNotification(`Failed to delete stories. Please check your permissions and try again.`, 'error');
            if (errors.length > 0) {
                console.error('Delete errors:', errors);
            }
        }
        
        // Refresh display and clear selection
        if (successCount > 0) {
            displayStories();
            clearSelection();
        }
        
    } catch (error) {
        console.error('Bulk delete error:', error);
        showNotification('Network error during bulk delete operation.', 'error');
    } finally {
        // Restore button state
        if (bulkDeleteBtn) {
            bulkDeleteBtn.disabled = false;
            bulkDeleteBtn.textContent = 'Delete Selected';
        }
    }
}

function clearSelection() {
    selectedStories.clear();
    selectionMode = false;
    
    // Uncheck all checkboxes
    const checkboxes = document.querySelectorAll('.story-checkbox, #selectAllCheckbox');
    checkboxes.forEach(checkbox => checkbox.checked = false);
    
    updateSelectionUI();
    console.log('Selection cleared');
}

// Make bulk functions globally available
window.bulkFavorite = bulkFavorite;
window.bulkExport = bulkExport;
window.bulkDelete = bulkDelete;
window.clearSelection = clearSelection;

// Favorite functionality (fully implemented)
async function toggleFavorite(storyId) {
    console.log(`Toggle favorite for story ${storyId}`);
    
    try {
        const isFavorited = userFavorites.has(storyId);
        const method = isFavorited ? 'DELETE' : 'POST';
        const url = `${window.API_URL}/favorites/${storyId}`;
        
        // Show loading state on button
        const favoriteBtn = document.querySelector(`[data-story-id="${storyId}"] .favorite-btn`);
        const heartIcon = favoriteBtn ? favoriteBtn.querySelector('.heart-icon') : null;
        
        if (favoriteBtn) {
            favoriteBtn.disabled = true;
            favoriteBtn.classList.add('loading');
        }
        
        const response = await makeAuthenticatedRequest(url, {
            method: method
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update local state
            if (isFavorited) {
                userFavorites.delete(storyId);
            } else {
                userFavorites.add(storyId);
            }
            
            // Update UI immediately
            updateFavoriteUI(storyId, !isFavorited, result.total_favorites);
            
            // Show success message
            showNotification(result.message, 'success');
            
            console.log(`Story ${storyId} ${isFavorited ? 'removed from' : 'added to'} favorites`);
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to update favorite', 'error');
            console.error('Favorite API error:', error);
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        // Remove loading state
        const favoriteBtn = document.querySelector(`[data-story-id="${storyId}"] .favorite-btn`);
        if (favoriteBtn) {
            favoriteBtn.disabled = false;
            favoriteBtn.classList.remove('loading');
        }
    }
}

function updateFavoriteUI(storyId, isFavorited, totalFavorites) {
    // Find all favorite buttons for this story (could be multiple if story appears in different views)
    const favoriteButtons = document.querySelectorAll(`[data-story-id="${storyId}"] .favorite-btn`);
    
    favoriteButtons.forEach(btn => {
        const heartIcon = btn.querySelector('.heart-icon');
        const favoriteCount = btn.querySelector('.favorite-count');
        
        if (heartIcon) {
            heartIcon.textContent = isFavorited ? '♥' : '♡';
            heartIcon.style.color = isFavorited ? '#ff6b35' : '#ccc';
        }
        
        if (favoriteCount && totalFavorites !== undefined) {
            favoriteCount.textContent = totalFavorites;
        }
        
        // Update button class
        btn.classList.toggle('favorited', isFavorited);
        
        // Add animation
        btn.classList.add('favorite-pulse');
        setTimeout(() => btn.classList.remove('favorite-pulse'), 300);
    });
}

function showNotification(message, type = 'info', duration = 4000) {
    // Remove any existing notifications of the same type to prevent stacking
    const existingNotifications = document.querySelectorAll(`.notification.${type}`);
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    });
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 350px;
        min-width: 250px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        transform: translateX(100%);
        transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        border-left: 4px solid rgba(255,255,255,0.3);
    `;
    
    // Set background color and icon based on type
    const configs = {
        success: { color: '#4CAF50', icon: '✅' },
        error: { color: '#f44336', icon: '❌' },
        info: { color: '#2196F3', icon: 'ℹ️' },
        warning: { color: '#ff9800', icon: '⚠️' }
    };
    
    const config = configs[type] || configs.info;
    notification.style.backgroundColor = config.color;
    
    // Add icon and message
    const content = document.createElement('div');
    content.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    content.innerHTML = `
        <span style="font-size: 16px;">${config.icon}</span>
        <span>${message}</span>
    `;
    notification.appendChild(content);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 5px;
        right: 8px;
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        transition: opacity 0.2s ease;
    `;
    closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
    closeBtn.onmouseout = () => closeBtn.style.opacity = '0.7';
    closeBtn.onclick = () => removeNotification(notification);
    
    notification.appendChild(closeBtn);
    document.body.appendChild(notification);
    
    // Animate in after a brief delay to ensure proper rendering
    requestAnimationFrame(() => {
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 50);
    });
    
    // Auto remove after specified duration
    const autoRemoveTimer = setTimeout(() => {
        removeNotification(notification);
    }, duration);
    
    // Store timer on element so we can clear it if manually closed
    notification.autoRemoveTimer = autoRemoveTimer;
    
    return notification;
}

function removeNotification(notification) {
    if (notification.autoRemoveTimer) {
        clearTimeout(notification.autoRemoveTimer);
    }
    
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

window.toggleFavorite = toggleFavorite;

// Make logout available globally
window.logout = function() {
    localStorage.clear();
    window.location.href = '/index.html';
};

// CSV Import functionality
function setupCSVImport() {
    const csvImportBtn = document.getElementById('csvImportBtn');
    const csvModal = document.getElementById('csvModal');
    const csvForm = document.getElementById('csvForm');
    const closeModal = document.querySelector('.close');
    
    if (csvImportBtn && csvModal) {
        // Show modal on button click
        csvImportBtn.addEventListener('click', () => {
            csvModal.style.display = 'block';
        });
        
        // Close modal events
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                csvModal.style.display = 'none';
            });
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === csvModal) {
                csvModal.style.display = 'none';
            }
        });
        
        // Handle form submission
        if (csvForm) {
            csvForm.addEventListener('submit', handleCSVImport);
        }
    }
}

async function handleCSVImport(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a CSV file', 'error');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';
    
    try {
        const formData = new FormData();
        formData.append('csvFile', file);
        
        const response = await fetch(`${window.API_URL}/stories/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification(
                `Successfully imported ${result.imported || 0} stories!`, 
                'success'
            );
            
            // Close modal and refresh stories
            const csvModal = document.getElementById('csvModal');
            if (csvModal) {
                csvModal.style.display = 'none';
            }
            
            // Reset form
            e.target.reset();
            
            // Reload stories to show imported ones
            await loadStories();
            
        } else {
            const error = await response.json();
            showNotification(`Import failed: ${error.message || 'Unknown error'}`, 'error');
        }
        
    } catch (error) {
        console.error('CSV import error:', error);
        showNotification('Network error during import. Please try again.', 'error');
    } finally {
        // Restore button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}