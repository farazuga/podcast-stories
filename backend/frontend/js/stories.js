// API base URL - use global from config.js
const API_URL = window.API_URL || 'https://podcast-stories-production.up.railway.app/api';
console.log('🔥 STORIES.JS LOADING - API_URL:', API_URL);

// HTML escaping utility for safe rendering of user content
const escapeHTML = (str = '') => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Global variables
let allStories = [];
let filteredStories = [];
let currentUser = null;
let allTags = [];
let currentPage = 0;
let storiesPerPage = 50;
let currentViewMode = 'list'; // Changed default from grid to list for better scanning
let selectedStories = new Set();
let selectionMode = false;

// Check URL parameters for special modes
let showFavoritesOnly = false;

// Initialize page
async function initializeStoriesPage() {
    console.log('Stories page initialization starting...');
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    showFavoritesOnly = urlParams.get('favorites') === 'true';
    
    if (showFavoritesOnly) {
        console.log('🌟 Favorites mode enabled - will load user favorites');
        // Update page title to indicate favorites mode
        document.title = 'VidPOD - My Favorites';
        const header = document.querySelector('h1');
        if (header) header.textContent = '⭐ My Favorite Stories';
    }
    
    // Wait a moment for auth.js to finish any token processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!checkAuth()) return;
    
    try {
        console.log('🔍 Starting loadUserInfo...');
        await loadUserInfo();
        console.log('✅ loadUserInfo complete');
        
        console.log('🔍 Starting loadTags...');
        await loadTags();
        console.log('✅ loadTags complete');
        
        console.log('🔍 Starting loadStories...');
        await loadStories();
        console.log('✅ loadStories complete');
        
        console.log('🔍 Starting setupEventListeners...');
        setupEventListeners();
        console.log('✅ setupEventListeners complete');
        
        // Set default view to list
        setViewMode('list');
        console.log('✅ Default view set to list');
        
        console.log('Stories page initialization complete!');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        // Don't redirect on error, just log it
    }
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
        }
        
        if (user.role === 'amitrace_admin') {
            const adminLink = document.getElementById('adminLink');
            if (adminLink) adminLink.style.display = 'inline-block';
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        // Don't logout on user info errors - token is still valid
        // Just continue without user info display
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

async function loadStories(filterParams = {}) {
    try {
        // Choose endpoint based on mode
        const baseEndpoint = showFavoritesOnly ? `${API_URL}/favorites` : `${API_URL}/stories`;
        
        // Build query string from filter parameters for server-side filtering
        const queryParams = new URLSearchParams();
        
        // Add filter parameters to query string for ALL database stories filtering
        if (filterParams.search) {
            queryParams.append('search', filterParams.search);
        }
        if (filterParams.startDate) {
            queryParams.append('startDate', filterParams.startDate);
        }
        if (filterParams.endDate) {
            queryParams.append('endDate', filterParams.endDate);
        }
        if (filterParams.tags && filterParams.tags.length > 0) {
            filterParams.tags.forEach(tag => queryParams.append('tags', tag));
        }
        if (filterParams.interviewee) {
            queryParams.append('interviewee', filterParams.interviewee);
        }
        
        const endpoint = queryParams.toString() ? 
            `${baseEndpoint}?${queryParams.toString()}` : baseEndpoint;
            
        console.log(`Loading from endpoint with server-side filtering: ${endpoint}`);
        
        const response = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            // Server returns pre-filtered results - no need for client-side filtering
            allStories = await response.json();
            
            // For favorites, mark all stories as favorited
            if (showFavoritesOnly) {
                allStories = allStories.map(story => ({
                    ...story,
                    is_favorited: true
                }));
            }
            
            filteredStories = [...allStories]; // Server already filtered, so filtered = all loaded
            currentPage = 0;
            displayStories();
            updateResultsCount();
            
            if (showFavoritesOnly && allStories.length === 0) {
                showNoFavorites();
            }
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
    
    // Format dates using safe date formatting to prevent timezone offset issues
    // Coverage dates display WITHOUT year for cleaner appearance
    const startDate = story.coverage_start_date ? formatDateSafeWithoutYear(story.coverage_start_date.split('T')[0]) : '';
    const endDate = story.coverage_end_date ? formatDateSafeWithoutYear(story.coverage_end_date.split('T')[0]) : '';
    // Upload dates keep year for context since they're administrative
    const uploadedDate = story.uploaded_date ? formatDateSafe(story.uploaded_date.split('T')[0]) : '';
    
    // Determine the most applicable date for display in list view
    const applicableDate = story.coverage_start_date ? startDate : (story.uploaded_date ? uploadedDate : '');
    const applicableDateLabel = story.coverage_start_date ? 'Coverage' : 'Uploaded';
    
    // Format tags (all tags for hover tooltip)
    const allTags = story.tags && Array.isArray(story.tags) 
        ? story.tags.filter(tag => tag).join(', ')
        : '';
    
    // Format tags for display with overflow indicator
    let tags = '';
    if (story.tags && Array.isArray(story.tags) && story.tags.filter(tag => tag).length > 0) {
        const validTags = story.tags.filter(tag => tag);
        const displayTags = validTags.slice(0, 2);
        const remainingCount = validTags.length - 2;
        
        tags = displayTags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('');
        if (remainingCount > 0) {
            tags += `<span class="tag tag-overflow">+${remainingCount}</span>`;
        }
    }
    
    // Format interviewees (limit to 1 for compactness) - safely escaped
    const interviewees = story.interviewees && Array.isArray(story.interviewees)
        ? escapeHTML(story.interviewees.filter(person => person).slice(0, 1).join(', '))
        : '';
    
    // Remove status badge for improved readability
    
    // Fixed checkbox without double box issue
    const selectionCheckbox = `
        <div class="story-checkbox-compact" onclick="event.stopPropagation()">
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
                onclick="event.stopPropagation(); toggleFavorite(${story.id})" 
                data-story-id="${story.id}"
                title="${story.is_favorited ? 'Remove from favorites' : 'Add to favorites'}">
            ${story.is_favorited ? '⭐' : '☆'}
        </button>
    `;
    
    // Simple title without truncation - safely escaped
    const storyTitle = `<h3 class="story-title-compact">${escapeHTML(story.idea_title)}</h3>`;
    
    // List view specific layout with date - now clickable with tags displayed
    if (!isGridView) {
        return `
            <div class="${cardClass} ${isSelected ? 'selected' : ''} clickable-card" 
                 data-story-id="${story.id}" 
                 data-sort-date="${story.coverage_start_date || story.uploaded_date || ''}"
                 role="button"
                 tabindex="0"
                 onclick="handleStoryCardClick(event, ${story.id})"
                 onkeydown="handleStoryCardKeydown(event, ${story.id})">
                <div class="story-header-compact">
                    ${selectionCheckbox}
                    ${storyTitle}
                    ${favoriteStar}
                </div>
                
                <div class="story-date-compact">
                    ${applicableDate ? `📅 ${applicableDateLabel}: ${applicableDate}` : ''}
                </div>
                
                ${tags ? `<div class="story-tags-compact">${tags}</div>` : ''}
                
                <div class="story-actions-compact">
                    <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); viewStory(${story.id})">
                        View
                    </button>
                    ${story.uploaded_by === currentUser?.id ? `
                        <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); editStory(${story.id})">
                            Edit
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Grid view layout - clickable tile with improved readability
    return `
        <div class="${cardClass} ${isSelected ? 'selected' : ''} clickable-card" 
             data-story-id="${story.id}" 
             data-sort-date="${story.coverage_start_date || story.uploaded_date || ''}"
             role="button"
             tabindex="0"
             onclick="handleStoryCardClick(event, ${story.id})"
             onkeydown="handleStoryCardKeydown(event, ${story.id})">
            <div class="story-header-compact">
                ${selectionCheckbox}
                ${storyTitle}
                ${favoriteStar}
            </div>
            
            ${story.coverage_start_date
              ? `<div class="story-coverage-compact">🎬 ${startDate}${endDate ? ` - ${endDate}` : ''}</div>`
              : `${uploadedDate ? `<div class="story-date-compact">📅 Uploaded: ${uploadedDate}</div>` : ''}`}
            
            ${tags ? `<div class="story-tags-compact">${tags}</div>` : ''}
            
            ${interviewees ? `<div class="story-interviewees-compact">🎤 ${interviewees}</div>` : ''}
            
            <div class="story-actions-compact">
                ${story.uploaded_by === currentUser?.id ? `
                    <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); editStory(${story.id})">
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

function showNoFavorites() {
    const container = document.getElementById('storiesGrid');
    container.innerHTML = `
        <div class="no-favorites-message">
            <div class="empty-state">
                <div class="empty-icon">⭐</div>
                <h3>No Favorite Stories Yet</h3>
                <p>You haven't favorited any stories yet. Browse stories and click the star icon to add them to your favorites!</p>
                <a href="/stories.html" class="btn btn-primary">Browse Stories</a>
            </div>
        </div>
    `;
    document.getElementById('noResults').style.display = 'none';
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
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await applyFilters();
        });
    }
    
}

async function applyFilters() {
    // Build filters from form using shared component
    const filters = StoryFilters.buildFiltersFromForm('searchForm');
    
    console.log('Applying story filters with server-side filtering:', filters);
    
    // Use server-side filtering by reloading stories with filter parameters
    // This applies filters to ALL stories in the database, not just loaded ones
    await loadStories({
        search: filters.search,
        startDate: filters.startDate,
        endDate: filters.endDate,
        tags: filters.tags,
        interviewee: filters.interviewee
    });
}

async function clearFilters() {
    // Clear all filter inputs using shared component
    StoryFilters.clearAllFilters('searchForm');
    
    // Reload all stories without any filters (server-side reset)
    await loadStories();
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

function handleStoryCardClick(event, storyId) {
    // Prevent clicking on interactive elements from opening the story
    const target = event.target;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'BUTTON' || 
        target.classList.contains('favorite-star') ||
        target.closest('input') ||
        target.closest('button')) {
        return;
    }
    
    // Open the story
    viewStory(storyId);
}

function handleStoryCardKeydown(event, storyId) {
    // Only handle Enter and Space keys
    if (event.key !== 'Enter' && event.key !== ' ') {
        return;
    }
    
    // Prevent default behavior for space (scrolling)
    event.preventDefault();
    
    // Don't trigger if focused on an input or button
    const target = event.target;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'BUTTON' || 
        target.classList.contains('favorite-star') ||
        target.closest('input') ||
        target.closest('button')) {
        return;
    }
    
    // Open the story
    viewStory(storyId);
}

function editStory(storyId) {
    window.location.href = `/add-story.html?edit=${storyId}`;
}

async function toggleFavorite(storyId) {
    const btn = document.querySelector(`.favorite-star[data-story-id="${storyId}"]`);
    
    if (!btn) {
        console.error('Favorite button not found for story ID:', storyId);
        return;
    }
    
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
            btn.textContent = !wasLiked ? '⭐' : '☆';
            btn.title = !wasLiked ? 'Remove from favorites' : 'Add to favorites';
            
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

// Bulk export function for selected stories
async function bulkExport() {
    if (selectedStories.size === 0) {
        alert('Please select stories to export');
        return;
    }
    
    try {
        const selectedArray = Array.from(selectedStories);
        console.log('Exporting stories:', selectedArray);
        
        // Get story data for selected stories
        const storiesToExport = allStories.filter(story => selectedArray.includes(story.id));
        
        if (storiesToExport.length === 0) {
            alert('No valid stories found for export');
            return;
        }
        
        // Create CSV content
        const csvHeaders = ['Title', 'Description', 'Question 1', 'Question 2', 'Question 3', 'Question 4', 'Question 5', 'Question 6', 'Start Date', 'End Date', 'Tags', 'Interviewees', 'Author'];
        const csvRows = storiesToExport.map(story => [
            `"${(story.idea_title || '').replace(/"/g, '""')}"`,
            `"${(story.idea_description || '').replace(/"/g, '""')}"`,
            `"${(story.question_1 || '').replace(/"/g, '""')}"`,
            `"${(story.question_2 || '').replace(/"/g, '""')}"`,
            `"${(story.question_3 || '').replace(/"/g, '""')}"`,
            `"${(story.question_4 || '').replace(/"/g, '""')}"`,
            `"${(story.question_5 || '').replace(/"/g, '""')}"`,
            `"${(story.question_6 || '').replace(/"/g, '""')}"`,
            `"${story.coverage_start_date || ''}"`,
            `"${story.coverage_end_date || ''}"`,
            `"${(story.tags || []).join(', ')}"`,
            `"${(story.interviewees || []).join(', ')}"`,
            `"${story.uploaded_by_name || ''}"`
        ]);
        
        const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const filename = `stories_export_${new Date().toISOString().split('T')[0]}.csv`;
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showNotification(`Exported ${storiesToExport.length} stories to ${filename}`, 'success');
            clearSelection();
        } else {
            alert('CSV export not supported in this browser');
        }
        
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Export failed. Please try again.', 'error');
    }
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
window.handleStoryCardClick = handleStoryCardClick;
window.handleStoryCardKeydown = handleStoryCardKeydown;
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