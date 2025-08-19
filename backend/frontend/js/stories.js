// Fixed version of stories.js - no duplicate API_URL declaration
// This file uses window.API_URL set by auth.js, with fallback
if (!window.API_URL) {
    window.API_URL = 'https://podcast-stories-production.up.railway.app/api';
}

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

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    await loadUserInfo();
    await loadTags();
    
    // Check if this is add-story page
    if (window.location.pathname.includes('add-story.html')) {
        setupAddStoryPage();
    } else {
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
            console.log(`Loaded ${allTags.length} tags`);
            
            // Populate tag select for add-story page
            populateAddStoryTags();
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

// Legacy function - removed in favor of populateSearchTagsFilter

async function loadStories() {
    try {
        const response = await fetch(`${window.API_URL}/stories`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

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
    const isFavorited = false; // TODO: Check if story is favorited by current user
    
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
                            onclick="toggleFavorite(${story.id})" title="Add to favorites">
                        <span class="heart-icon">${isFavorited ? '♥' : '♡'}</span>
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
                            onclick="toggleFavorite(${story.id})" title="Add to favorites">
                        <span class="heart-icon">${isFavorited ? '♡' : '♥'}</span>
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
function bulkFavorite() {
    if (selectedStories.size === 0) return;
    
    console.log(`Adding ${selectedStories.size} stories to favorites`);
    // TODO: Implement bulk favorite functionality
    alert(`Adding ${selectedStories.size} stories to favorites (Feature coming soon)`);
}

function bulkExport() {
    if (selectedStories.size === 0) return;
    
    console.log(`Exporting ${selectedStories.size} stories`);
    // TODO: Implement bulk export functionality
    alert(`Exporting ${selectedStories.size} stories (Feature coming soon)`);
}

function bulkDelete() {
    if (selectedStories.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedStories.size} selected stories? This action cannot be undone.`)) {
        console.log(`Deleting ${selectedStories.size} stories`);
        // TODO: Implement bulk delete functionality
        alert(`Deleting ${selectedStories.size} stories (Feature coming soon)`);
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

// Favorite functionality (placeholder)
function toggleFavorite(storyId) {
    console.log(`Toggle favorite for story ${storyId}`);
    // TODO: Implement favorite functionality
    alert('Favorite functionality coming soon!');
}

window.toggleFavorite = toggleFavorite;

// Make logout available globally
window.logout = function() {
    localStorage.clear();
    window.location.href = '/index.html';
};