// API base URL - use global from auth.js
// const API_URL is already declared in auth.js and made globally available
console.log('🔥 STORIES.JS LOADING - FIRST LINE EXECUTED');

// Global variables
let allStories = [];
let filteredStories = [];
let currentUser = null;
let allTags = [];
let currentPage = 0;
let storiesPerPage = 50;
let currentViewMode = 'grid';
let selectedStories = new Set();
let selectionMode = false;

// Initialize page
async function initializeStoriesPage() {
    console.log('Stories page initialization starting...');
    
    // Wait a moment for auth.js to finish any token processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!checkAuth()) return;
    
    await loadUserInfo();
    await loadTags();
    await loadStories();
    setupEventListeners();
    console.log('Stories page initialization complete!');
}

// Handle both DOMContentLoaded and immediate execution
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
    console.log('DOM loading - waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', initializeStoriesPage);
} else {
    // DOM is already loaded, execute immediately
    console.log('DOM already loaded - executing immediately');
    initializeStoriesPage();
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('🔍 checkAuth called - token:', token ? 'present' : 'missing', 'user:', user ? 'present' : 'missing');
    
    if (!token) {
        console.log('❌ No token found, redirecting to login');
        window.location.href = '/index.html';
        return false;
    }
    
    console.log('✅ Token found, continuing with stories page');
    return true;
}

async function loadUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        currentUser = user;
        
        // Display user info
        document.getElementById('userInfo').textContent = user.name || user.email;
        
        // Display role badge
        const roleBadge = document.getElementById('userRoleBadge');
        if (roleBadge) {
            roleBadge.textContent = user.role.toUpperCase().replace('_', ' ');
            roleBadge.className = `role-badge role-${user.role}`;
        }
        
        // Show appropriate navigation links based on role
        if (user.role === 'teacher' || user.role === 'amitrace_admin') {
            const teacherLink = document.getElementById('teacherLink');
            if (teacherLink) teacherLink.style.display = 'inline-block';
            
            const csvBtn = document.getElementById('csvImportBtn');
            if (csvBtn) csvBtn.style.display = 'inline-block';
        }
        
        if (user.role === 'amitrace_admin') {
            const adminLink = document.getElementById('adminLink');
            if (adminLink) adminLink.style.display = 'inline-block';
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        logout();
    }
}

async function loadTags() {
    try {
        const response = await fetch(`${API_URL}/tags`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            allTags = await response.json();
            populateTagsDropdown();
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

function populateTagsDropdown() {
    // Use shared tags dropdown setup
    StoryFilters.setupTagsDropdown('searchTags', allTags, 'All Tags');
}

async function loadStories() {
    try {
        const response = await fetch(`${API_URL}/stories`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            allStories = await response.json();
            filteredStories = [...allStories];
            currentPage = 0;
            displayStories();
            updateResultsCount();
        } else {
            console.error('Failed to load stories');
            showNoResults();
        }
    } catch (error) {
        console.error('Error loading stories:', error);
        showNoResults();
    }
}

function displayStories() {
    const container = document.getElementById('storiesGrid');
    if (!container) return;
    
    const startIndex = currentPage * storiesPerPage;
    const endIndex = startIndex + storiesPerPage;
    const storiesToShow = filteredStories.slice(startIndex, endIndex);
    
    if (storiesToShow.length === 0) {
        showNoResults();
        return;
    }
    
    // Hide no results
    document.getElementById('noResults').style.display = 'none';
    
    // Render stories based on view mode
    container.className = currentViewMode === 'grid' ? 'stories-grid' : 'stories-list';
    container.innerHTML = storiesToShow.map(story => renderStoryCard(story)).join('');
    
    // Show/hide pagination
    updatePaginationControls();
}

function renderStoryCard(story) {
    const isGridView = currentViewMode === 'grid';
    const cardClass = isGridView ? 'story-card' : 'story-card story-card-list';
    const isSelected = selectedStories.has(story.id);
    
    // Format dates for coverage and determine applicable date for sorting
    const startDate = story.coverage_start_date ? new Date(story.coverage_start_date).toLocaleDateString() : '';
    const endDate = story.coverage_end_date ? new Date(story.coverage_end_date).toLocaleDateString() : '';
    const uploadedDate = story.uploaded_date ? new Date(story.uploaded_date).toLocaleDateString() : '';
    
    // Determine the most applicable date for display in list view
    const applicableDate = story.coverage_start_date ? startDate : (story.uploaded_date ? uploadedDate : '');
    const applicableDateLabel = story.coverage_start_date ? 'Coverage' : 'Uploaded';
    
    // Format tags (all tags for hover tooltip)
    const allTags = story.tags && Array.isArray(story.tags) 
        ? story.tags.filter(tag => tag).join(', ')
        : '';
    
    // Format tags for display (limit to 2 for compactness)
    const tags = story.tags && Array.isArray(story.tags) 
        ? story.tags.filter(tag => tag).slice(0, 2).map(tag => `<span class="tag">${tag}</span>`).join('') 
        : '';
    
    // Format interviewees (limit to 1 for compactness)
    const interviewees = story.interviewees && Array.isArray(story.interviewees)
        ? story.interviewees.filter(person => person).slice(0, 1).join(', ')
        : '';
    
    // Status badge for admin/own stories
    const showStatus = currentUser && (
        currentUser.role === 'amitrace_admin' || 
        story.uploaded_by === currentUser.id
    );
    
    const statusBadge = showStatus ? 
        `<span class="status-badge status-${story.approval_status}">${story.approval_status}</span>` : '';
    
    // Fixed checkbox without double box issue
    const selectionCheckbox = `
        <div class="story-checkbox-compact">
            <input type="checkbox" 
                   class="story-select-checkbox" 
                   data-story-id="${story.id}"
                   ${isSelected ? 'checked' : ''}
                   onchange="toggleStorySelection(${story.id})">
        </div>
    `;
    
    // Simple star favorite next to title
    const favoriteStar = `
        <button class="favorite-star ${story.is_favorited ? 'favorited' : ''}" 
                onclick="toggleFavorite(${story.id})" 
                data-story-id="${story.id}"
                title="${story.is_favorited ? 'Remove from favorites' : 'Add to favorites'}">
            ${story.is_favorited ? '⭐' : '☆'}
        </button>
    `;
    
    // Title with tags hover tooltip
    const titleWithTooltip = allTags ? 
        `<h3 class="story-title-compact" title="Tags: ${allTags}">${story.idea_title}</h3>` :
        `<h3 class="story-title-compact">${story.idea_title}</h3>`;
    
    // List view specific layout with date
    if (!isGridView) {
        return `
            <div class="${cardClass} ${isSelected ? 'selected' : ''}" data-story-id="${story.id}" data-sort-date="${story.coverage_start_date || story.uploaded_date || ''}">
                <div class="story-header-compact">
                    ${selectionCheckbox}
                    ${titleWithTooltip}
                    ${favoriteStar}
                    ${statusBadge}
                </div>
                
                <div class="story-date-compact">
                    ${applicableDate ? `📅 ${applicableDateLabel}: ${applicableDate}` : ''}
                </div>
                
                <div class="story-actions-compact">
                    <button class="btn btn-primary btn-small" onclick="viewStory(${story.id})">
                        View
                    </button>
                    ${story.uploaded_by === currentUser?.id ? `
                        <button class="btn btn-secondary btn-small" onclick="editStory(${story.id})">
                            Edit
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Grid view layout (original)
    return `
        <div class="${cardClass} ${isSelected ? 'selected' : ''}" data-story-id="${story.id}" data-sort-date="${story.coverage_start_date || story.uploaded_date || ''}">
            <div class="story-header-compact">
                ${selectionCheckbox}
                ${titleWithTooltip}
                ${favoriteStar}
                ${statusBadge}
            </div>
            
            ${story.coverage_start_date ? `<div class="story-coverage-compact">🎬 ${startDate}${endDate ? ` - ${endDate}` : ''}</div>` : ''}
            
            ${tags ? `<div class="story-tags-compact">${tags}</div>` : ''}
            
            ${interviewees ? `<div class="story-interviewees-compact">🎤 ${interviewees}</div>` : ''}
            
            <div class="story-actions-compact">
                <button class="btn btn-primary btn-small" onclick="viewStory(${story.id})">
                    View
                </button>
                ${story.uploaded_by === currentUser?.id ? `
                    <button class="btn btn-secondary btn-small" onclick="editStory(${story.id})">
                        Edit
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function showNoResults() {
    document.getElementById('storiesGrid').innerHTML = '';
    document.getElementById('noResults').style.display = 'block';
    document.getElementById('loadMoreSection').style.display = 'none';
}

function updateResultsCount() {
    const countElement = document.getElementById('resultsCount');
    if (countElement) {
        const total = filteredStories.length;
        const startIndex = currentPage * storiesPerPage;
        const endIndex = Math.min(startIndex + storiesPerPage, total);
        const shown = Math.max(0, endIndex - startIndex);
        
        if (total === 0) {
            countElement.textContent = 'No stories found';
        } else {
            countElement.textContent = `Showing ${startIndex + 1}-${endIndex} of ${total} stories`;
        }
    }
}

function updatePaginationControls() {
    const total = filteredStories.length;
    const totalPages = Math.ceil(total / storiesPerPage);
    const paginationElement = document.getElementById('paginationControls');
    
    if (!paginationElement) return;
    
    if (totalPages <= 1) {
        paginationElement.style.display = 'none';
        return;
    }
    
    paginationElement.style.display = 'flex';
    paginationElement.innerHTML = `
        <button class="btn btn-outline" 
                onclick="goToPage(${currentPage - 1})" 
                ${currentPage === 0 ? 'disabled' : ''}>
            ← Previous
        </button>
        <span class="pagination-info">
            Page ${currentPage + 1} of ${totalPages}
        </span>
        <button class="btn btn-outline" 
                onclick="goToPage(${currentPage + 1})" 
                ${currentPage >= totalPages - 1 ? 'disabled' : ''}>
            Next →
        </button>
    `;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredStories.length / storiesPerPage);
    
    if (page < 0 || page >= totalPages) return;
    
    currentPage = page;
    displayStories();
    updateResultsCount();
    
    // Scroll to top of stories
    document.getElementById('storiesContainer')?.scrollIntoView({ behavior: 'smooth' });
}

// View mode functions
function setViewMode(mode) {
    currentViewMode = mode;
    
    // Update button states
    document.getElementById('gridViewBtn').classList.toggle('active', mode === 'grid');
    document.getElementById('listViewBtn').classList.toggle('active', mode === 'list');
    
    // Re-render stories
    displayStories();
}

// Search and filter functions
function setupEventListeners() {
    // Search form
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            applyFilters();
        });
    }
    
    // CSV import
    const csvBtn = document.getElementById('csvImportBtn');
    const csvModal = document.getElementById('csvModal');
    const csvForm = document.getElementById('csvForm');
    
    if (csvBtn && csvModal) {
        csvBtn.addEventListener('click', () => {
            csvModal.style.display = 'block';
        });
        
        // Close modal
        csvModal.querySelector('.close').addEventListener('click', () => {
            csvModal.style.display = 'none';
        });
        
        // Handle CSV upload
        if (csvForm) {
            csvForm.addEventListener('submit', handleCSVUpload);
        }
        
        // Click outside modal to close
        window.addEventListener('click', (event) => {
            if (event.target === csvModal) {
                csvModal.style.display = 'none';
            }
        });
    }
}

function applyFilters() {
    // Build filters from form using shared component
    const filters = StoryFilters.buildFiltersFromForm('searchForm');
    
    console.log('Applying story filters:', filters);
    
    // Apply all filters using shared component
    filteredStories = StoryFilters.applyAllFilters(allStories, filters);
    
    currentPage = 0;
    displayStories();
    updateResultsCount();
}

function clearFilters() {
    // Clear all filter inputs using shared component
    StoryFilters.clearAllFilters('searchForm');
    
    filteredStories = [...allStories];
    currentPage = 0;
    displayStories();
    updateResultsCount();
}

function sortStories() {
    const sortBy = document.getElementById('sortBy').value;
    
    // Use shared sorting functionality
    filteredStories = StoryFilters.applySorting(filteredStories, sortBy);
    
    currentPage = 0;
    displayStories();
}

// Remove loadMoreStories function as we now use pagination
// function loadMoreStories() {
//     currentPage++;
//     displayStories();
//     updateResultsCount();
// }

// Star rating system
function renderStarRating(storyId, userRating, averageRating, ratingCount) {
    const stars = [];
    
    // User's rating stars (interactive)
    for (let i = 1; i <= 5; i++) {
        const isActive = i <= userRating;
        stars.push(`
            <span class="star user-star ${isActive ? 'active' : ''}" 
                  data-rating="${i}" 
                  onclick="rateStory(${storyId}, ${i})"
                  title="Rate ${i} star${i > 1 ? 's' : ''}">
                ${isActive ? '⭐' : '☆'}
            </span>
        `);
    }
    
    const averageDisplay = averageRating > 0 ? averageRating.toFixed(1) : '0.0';
    const countText = ratingCount === 1 ? '1 rating' : `${ratingCount} ratings`;
    
    return `
        <div class="user-rating">
            <label>Your rating:</label>
            <div class="stars-container">
                ${stars.join('')}
            </div>
        </div>
        <div class="average-rating">
            <span class="avg-score">${averageDisplay}</span>
            <div class="avg-stars">
                ${renderAverageStars(averageRating)}
            </div>
            <span class="rating-count">(${countText})</span>
        </div>
    `;
}

function renderAverageStars(rating) {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars.push('⭐');
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars.push('⭐'); // Could use half-star if available
        } else {
            stars.push('☆');
        }
    }
    
    return stars.join('');
}

async function rateStory(storyId, rating) {
    try {
        const response = await fetch(`${API_URL}/stories/${storyId}/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ rating })
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update the star rating display
            updateStarRatingDisplay(storyId, rating, result.average_rating, result.rating_count);
            
            // Show feedback
            showNotification(`Rated ${rating} star${rating > 1 ? 's' : ''}!`, 'success');
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to rate story', 'error');
        }
    } catch (error) {
        console.error('Error rating story:', error);
        showNotification('Failed to rate story', 'error');
    }
}

function updateStarRatingDisplay(storyId, userRating, averageRating, ratingCount) {
    const container = document.querySelector(`[data-story-id="${storyId}"] .star-rating`);
    if (container) {
        container.innerHTML = renderStarRating(storyId, userRating, averageRating, ratingCount);
    }
}

// Story action functions
function viewStory(storyId) {
    window.location.href = `/story-detail.html?id=${storyId}`;
}

function editStory(storyId) {
    window.location.href = `/add-story.html?edit=${storyId}`;
}

async function toggleFavorite(storyId) {
    const btn = document.querySelector(`[data-story-id="${storyId}"] .favorite-btn`);
    const heartIcon = btn?.querySelector('.heart-icon');
    const favoriteText = btn?.querySelector('.favorite-text');
    
    if (!btn) return;
    
    const wasLiked = btn.classList.contains('favorited');
    
    try {
        const method = wasLiked ? 'DELETE' : 'POST';
        const response = await fetch(`${API_URL}/favorites/${storyId}`, {
            method: method,
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Update UI immediately
            btn.classList.toggle('favorited', !wasLiked);
            if (heartIcon) {
                heartIcon.textContent = !wasLiked ? '❤️' : '🤍';
            }
            if (favoriteText) {
                favoriteText.textContent = !wasLiked ? 'Favorited' : 'Favorite';
            }
            
            // Add animation effect
            btn.classList.add('favorite-animation');
            setTimeout(() => btn.classList.remove('favorite-animation'), 300);
            
            // Show notification
            const action = !wasLiked ? 'added to' : 'removed from';
            showNotification(`Story ${action} favorites!`, 'success');
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to update favorite', 'error');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showNotification('Failed to update favorite', 'error');
    }
}

// CSV Upload function - Enhanced with better user feedback
async function handleCSVUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    
    // Validation
    if (!file) {
        showNotification('Please select a CSV file', 'error');
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showNotification('Please select a valid CSV file', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showNotification('File too large. Please select a file smaller than 10MB', 'error');
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = '📤 Uploading...';
    
    const formData = new FormData();
    formData.append('csv', file);
    
    try {
        console.log(`Starting CSV upload: ${file.name} (${file.size} bytes)`);
        
        const response = await fetch(`${API_URL}/stories/import`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
                // Note: Don't set Content-Type header - let browser set it with boundary for FormData
            },
            body: formData
        });
        
        console.log(`CSV upload response: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log('CSV import result:', result);
            
            // Prepare success message
            let message = `Successfully imported ${result.imported}`;
            if (result.total && result.total !== result.imported) {
                message += ` of ${result.total}`;
            }
            message += ` stories!`;
            
            // Add schema info if available
            if (result.schemaInfo) {
                console.log(`Schema info: ${result.schemaInfo}`);
            }
            
            // Show errors if any
            if (result.errors && result.errors.length > 0) {
                console.warn('Import had errors:', result.errors);
                message += `\n\nNote: ${result.errors.length} rows had errors. Check console for details.`;
                
                // Log detailed errors
                result.errors.forEach((error, index) => {
                    console.error(`Import error ${index + 1}:`, error);
                });
            }
            
            showNotification(message, 'success');
            
            // Close modal and reload
            document.getElementById('csvModal').style.display = 'none';
            fileInput.value = ''; // Clear file input
            await loadStories(); // Reload stories to show new imports
            
        } else {
            // Handle error responses
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
                    errorMessage += `\nDetails: ${error.details}`;
                }
                
                // Show partial success info if available
                if (error.imported && error.imported > 0) {
                    errorMessage += `\n\nPartial success: ${error.imported} stories were imported before the error occurred.`;
                }
                
            } catch (parseError) {
                const errorText = await response.text();
                console.error('Failed to parse error response:', errorText);
                errorMessage += `: Server error (${response.status})`;
                
                if (response.status === 401) {
                    errorMessage = 'Import failed: Please log in again';
                } else if (response.status === 403) {
                    errorMessage = 'Import failed: You do not have permission to import stories';
                } else if (response.status === 413) {
                    errorMessage = 'Import failed: File too large';
                }
            }
            
            showNotification(errorMessage, 'error');
        }
        
    } catch (error) {
        console.error('CSV import network error:', error);
        
        let errorMessage = 'Import failed: Network error';
        if (error.message.includes('fetch')) {
            errorMessage += ' - Please check your internet connection';
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}

// Multi-select functionality
function toggleStorySelection(storyId) {
    if (selectedStories.has(storyId)) {
        selectedStories.delete(storyId);
    } else {
        selectedStories.add(storyId);
    }
    
    updateSelectionUI();
    updateBulkActionsVisibility();
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const storyCheckboxes = document.querySelectorAll('.story-select-checkbox');
    
    if (selectAllCheckbox.checked) {
        // Select all visible stories
        const visibleStories = document.querySelectorAll('.story-card[data-story-id]');
        visibleStories.forEach(card => {
            const storyId = parseInt(card.getAttribute('data-story-id'));
            selectedStories.add(storyId);
        });
    } else {
        // Deselect all
        selectedStories.clear();
    }
    
    // Update all checkboxes
    storyCheckboxes.forEach(checkbox => {
        const storyId = parseInt(checkbox.getAttribute('data-story-id'));
        checkbox.checked = selectedStories.has(storyId);
    });
    
    updateSelectionUI();
    updateBulkActionsVisibility();
}

function updateSelectionUI() {
    const selectedCount = selectedStories.size;
    const selectedCountSpan = document.getElementById('selectedCount');
    const bulkSelectedCountSpan = document.getElementById('bulkSelectedCount');
    const selectionInfo = document.getElementById('selectionInfo');
    
    // Update selection count displays
    if (selectedCountSpan) selectedCountSpan.textContent = selectedCount;
    if (bulkSelectedCountSpan) bulkSelectedCountSpan.textContent = selectedCount;
    
    // Show/hide selection info
    if (selectionInfo) {
        selectionInfo.style.display = selectedCount > 0 ? 'block' : 'none';
    }
    
    // Update select all checkbox state
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const visibleStories = document.querySelectorAll('.story-card[data-story-id]');
    const visibleStoryIds = Array.from(visibleStories).map(card => parseInt(card.getAttribute('data-story-id')));
    const allVisibleSelected = visibleStoryIds.length > 0 && visibleStoryIds.every(id => selectedStories.has(id));
    
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = allVisibleSelected;
        selectAllCheckbox.indeterminate = selectedCount > 0 && !allVisibleSelected;
    }
    
    // Update story card visual state
    visibleStories.forEach(card => {
        const storyId = parseInt(card.getAttribute('data-story-id'));
        const checkbox = card.querySelector('.story-select-checkbox');
        const isSelected = selectedStories.has(storyId);
        
        if (checkbox) checkbox.checked = isSelected;
        card.classList.toggle('selected', isSelected);
    });
    
    // Show bulk delete button only for admin or own stories
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDeleteBtn && currentUser) {
        const canDelete = selectedCount > 0 && (
            currentUser.role === 'amitrace_admin' || 
            Array.from(selectedStories).every(storyId => {
                const story = allStories.find(s => s.id === storyId);
                return story && story.uploaded_by === currentUser.id;
            })
        );
        bulkDeleteBtn.style.display = canDelete ? 'inline-block' : 'none';
    }
}

function updateBulkActionsVisibility() {
    const bulkActionsBar = document.getElementById('bulkActionsBar');
    const hasSelection = selectedStories.size > 0;
    
    if (bulkActionsBar) {
        bulkActionsBar.style.display = hasSelection ? 'block' : 'none';
    }
}

function clearSelection() {
    selectedStories.clear();
    updateSelectionUI();
    updateBulkActionsVisibility();
}

// Bulk action functions
async function bulkFavorite() {
    if (selectedStories.size === 0) {
        alert('Please select stories to add to favorites');
        return;
    }
    
    const selectedArray = Array.from(selectedStories);
    let successCount = 0;
    let errors = [];
    
    for (const storyId of selectedArray) {
        try {
            const response = await fetch(`${API_URL}/favorites/${storyId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (response.ok) {
                successCount++;
            } else {
                const error = await response.json();
                errors.push(`Story ${storyId}: ${error.message}`);
            }
        } catch (error) {
            errors.push(`Story ${storyId}: Network error`);
        }
    }
    
    if (successCount > 0) {
        alert(`Successfully added ${successCount} stories to favorites!`);
    }
    
    if (errors.length > 0) {
        console.error('Bulk favorite errors:', errors);
        alert(`${errors.length} stories could not be favorited. Check console for details.`);
    }
    
    clearSelection();
}

async function bulkExport() {
    if (selectedStories.size === 0) {
        alert('Please select stories to export');
        return;
    }
    
    const selectedArray = Array.from(selectedStories);
    const exportData = selectedArray.map(storyId => {
        const story = allStories.find(s => s.id === storyId);
        if (!story) return null;
        
        return {
            title: story.idea_title,
            description: story.idea_description,
            author: story.uploaded_by_name,
            date: story.uploaded_date,
            tags: story.tags ? story.tags.join(', ') : '',
            interviewees: story.interviewees ? story.interviewees.join(', ') : '',
            coverage_start: story.coverage_start_date,
            coverage_end: story.coverage_end_date,
            questions: [
                story.question_1,
                story.question_2,
                story.question_3,
                story.question_4,
                story.question_5,
                story.question_6
            ].filter(q => q).join(' | ')
        };
    }).filter(story => story !== null);
    
    // Convert to CSV
    const csvContent = convertToCSV(exportData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `vidpod-stories-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    alert(`Exported ${exportData.length} stories to CSV file`);
    clearSelection();
}

function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header] || '';
                // Escape quotes and wrap in quotes if contains comma or quote
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ];
    
    return csvRows.join('\n');
}

async function bulkDelete() {
    if (selectedStories.size === 0) {
        alert('Please select stories to delete');
        return;
    }
    
    const selectedArray = Array.from(selectedStories);
    const confirmMessage = `Are you sure you want to delete ${selectedArray.length} selected stories? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    let successCount = 0;
    let errors = [];
    
    for (const storyId of selectedArray) {
        try {
            const response = await fetch(`${API_URL}/stories/${storyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (response.ok) {
                successCount++;
            } else {
                const error = await response.json();
                errors.push(`Story ${storyId}: ${error.message}`);
            }
        } catch (error) {
            errors.push(`Story ${storyId}: Network error`);
        }
    }
    
    if (successCount > 0) {
        alert(`Successfully deleted ${successCount} stories!`);
        await loadStories(); // Reload stories to reflect deletions
    }
    
    if (errors.length > 0) {
        console.error('Bulk delete errors:', errors);
        alert(`${errors.length} stories could not be deleted. Check console for details.`);
    }
    
    clearSelection();
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="notification-message">${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// Make functions globally available
window.loadStories = loadStories;
window.displayStories = displayStories;
window.setViewMode = setViewMode;
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.sortStories = sortStories;
window.goToPage = goToPage;
window.viewStory = viewStory;
window.editStory = editStory;
window.toggleStorySelection = toggleStorySelection;
window.toggleSelectAll = toggleSelectAll;
window.clearSelection = clearSelection;
window.bulkFavorite = bulkFavorite;
window.bulkExport = bulkExport;
window.bulkDelete = bulkDelete;
window.rateStory = rateStory;
window.showNotification = showNotification;

// Utility function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}