// API base URL
const API_URL = 'https://podcast-stories-production.up.railway.app/api';

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
    await loadStories();
    setupEventListeners();
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
        
        // Display user info
        document.getElementById('userInfo').textContent = user.name || user.username;
        
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
    const select = document.getElementById('searchTags');
    if (!select) return;
    
    select.innerHTML = '<option value="">All Tags</option>';
    allTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.tag_name;
        option.textContent = tag.tag_name;
        select.appendChild(option);
    });
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
    const storiesToShow = filteredStories.slice(0, endIndex);
    
    if (storiesToShow.length === 0) {
        showNoResults();
        return;
    }
    
    // Hide no results
    document.getElementById('noResults').style.display = 'none';
    
    // Render stories based on view mode
    container.className = currentViewMode === 'grid' ? 'stories-grid' : 'stories-list';
    container.innerHTML = storiesToShow.map(story => renderStoryCard(story)).join('');
    
    // Show/hide load more button
    const loadMoreSection = document.getElementById('loadMoreSection');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    if (filteredStories.length > storiesToShow.length) {
        loadMoreSection.style.display = 'block';
        loadMoreBtn.textContent = `📚 Load More Stories (${filteredStories.length - storiesToShow.length} remaining)`;
    } else {
        loadMoreSection.style.display = 'none';
    }
}

function renderStoryCard(story) {
    const isGridView = currentViewMode === 'grid';
    const cardClass = isGridView ? 'story-card' : 'story-card story-card-list';
    const isSelected = selectedStories.has(story.id);
    
    // Format dates
    const startDate = story.coverage_start_date ? new Date(story.coverage_start_date).toLocaleDateString() : '';
    const endDate = story.coverage_end_date ? new Date(story.coverage_end_date).toLocaleDateString() : '';
    const uploadedDate = story.uploaded_date ? new Date(story.uploaded_date).toLocaleDateString() : '';
    
    // Format tags
    const tags = story.tags && Array.isArray(story.tags) 
        ? story.tags.filter(tag => tag).slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('') 
        : '';
    
    // Format interviewees
    const interviewees = story.interviewees && Array.isArray(story.interviewees)
        ? story.interviewees.filter(person => person).slice(0, 2).join(', ')
        : '';
    
    // Status badge for admin/own stories
    const showStatus = currentUser && (
        currentUser.role === 'amitrace_admin' || 
        story.uploaded_by === currentUser.id
    );
    
    const statusBadge = showStatus ? 
        `<span class="status-badge status-${story.approval_status}">${story.approval_status}</span>` : '';
    
    // Selection checkbox
    const selectionCheckbox = `
        <div class="story-checkbox">
            <label class="checkbox-container">
                <input type="checkbox" 
                       class="story-select-checkbox" 
                       data-story-id="${story.id}"
                       ${isSelected ? 'checked' : ''}
                       onchange="toggleStorySelection(${story.id})">
                <span class="checkmark"></span>
            </label>
        </div>
    `;
    
    return `
        <div class="${cardClass} ${isSelected ? 'selected' : ''}" data-story-id="${story.id}">
            ${selectionCheckbox}
            <div class="story-header">
                <h3 class="story-title">${story.idea_title}</h3>
                ${statusBadge}
            </div>
            
            <div class="story-meta">
                <p class="story-author">👤 ${story.uploaded_by_name || 'Unknown'}</p>
                <p class="story-date">📅 ${uploadedDate}</p>
                ${story.coverage_start_date ? `<p class="story-coverage">🎬 ${startDate}${endDate ? ` - ${endDate}` : ''}</p>` : ''}
            </div>
            
            <div class="story-description">
                <p>${story.idea_description || 'No description available'}</p>
            </div>
            
            ${tags ? `<div class="story-tags">${tags}</div>` : ''}
            
            ${interviewees ? `<div class="story-interviewees">🎤 ${interviewees}</div>` : ''}
            
            <div class="story-actions">
                <button class="btn btn-primary btn-small" onclick="viewStory(${story.id})">
                    👀 View Details
                </button>
                ${story.uploaded_by === currentUser?.id ? `
                    <button class="btn btn-secondary btn-small" onclick="editStory(${story.id})">
                        ✏️ Edit
                    </button>
                ` : ''}
                <div class="story-rating">
                    <div class="star-rating" data-story-id="${story.id}">
                        ${renderStarRating(story.id, story.user_rating || 0, story.average_rating || 0, story.rating_count || 0)}
                    </div>
                    <button class="btn btn-outline btn-small favorite-btn ${story.is_favorited ? 'favorited' : ''}" 
                            onclick="toggleFavorite(${story.id})" 
                            data-story-id="${story.id}">
                        <span class="heart-icon">${story.is_favorited ? '❤️' : '🤍'}</span>
                        <span class="favorite-text">${story.is_favorited ? 'Favorited' : 'Favorite'}</span>
                    </button>
                </div>
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
        const shown = Math.min(filteredStories.length, (currentPage + 1) * storiesPerPage);
        countElement.textContent = `Showing ${shown} of ${total} stories`;
    }
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
    const keywords = document.getElementById('searchKeywords').value.toLowerCase();
    const selectedTags = Array.from(document.getElementById('searchTags').selectedOptions).map(opt => opt.value);
    const startDate = document.getElementById('searchStartDate').value;
    const endDate = document.getElementById('searchEndDate').value;
    const interviewee = document.getElementById('searchInterviewee').value.toLowerCase();
    
    filteredStories = allStories.filter(story => {
        // Keywords filter
        if (keywords && !(
            story.idea_title.toLowerCase().includes(keywords) ||
            (story.idea_description && story.idea_description.toLowerCase().includes(keywords))
        )) {
            return false;
        }
        
        // Tags filter
        if (selectedTags.length > 0 && !selectedTags.some(tag => 
            story.tags && story.tags.includes(tag)
        )) {
            return false;
        }
        
        // Date filters
        if (startDate && story.coverage_start_date && story.coverage_start_date < startDate) {
            return false;
        }
        if (endDate && story.coverage_start_date && story.coverage_start_date > endDate) {
            return false;
        }
        
        // Interviewee filter
        if (interviewee && !(
            story.interviewees && story.interviewees.some(person =>
                person.toLowerCase().includes(interviewee)
            )
        )) {
            return false;
        }
        
        return true;
    });
    
    currentPage = 0;
    displayStories();
    updateResultsCount();
}

function clearFilters() {
    document.getElementById('searchKeywords').value = '';
    document.getElementById('searchTags').selectedIndex = 0;
    document.getElementById('searchStartDate').value = '';
    document.getElementById('searchEndDate').value = '';
    document.getElementById('searchInterviewee').value = '';
    document.getElementById('sortBy').value = 'newest';
    
    filteredStories = [...allStories];
    currentPage = 0;
    displayStories();
    updateResultsCount();
}

function sortStories() {
    const sortBy = document.getElementById('sortBy').value;
    
    filteredStories.sort((a, b) => {
        switch (sortBy) {
            case 'oldest':
                return new Date(a.uploaded_date) - new Date(b.uploaded_date);
            case 'title':
                return a.idea_title.localeCompare(b.idea_title);
            case 'author':
                return (a.uploaded_by_name || '').localeCompare(b.uploaded_by_name || '');
            case 'newest':
            default:
                return new Date(b.uploaded_date) - new Date(a.uploaded_date);
        }
    });
    
    currentPage = 0;
    displayStories();
}

function loadMoreStories() {
    currentPage++;
    displayStories();
    updateResultsCount();
}

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

// CSV Upload function
async function handleCSVUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a CSV file');
        return;
    }
    
    const formData = new FormData();
    formData.append('csv', file);
    
    try {
        const response = await fetch(`${API_URL}/stories/import`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(`Successfully imported ${result.imported} stories!`);
            document.getElementById('csvModal').style.display = 'none';
            await loadStories(); // Reload stories
        } else {
            const error = await response.json();
            alert(`Import failed: ${error.message}`);
        }
    } catch (error) {
        console.error('CSV import error:', error);
        alert('Import failed: Network error');
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
window.loadMoreStories = loadMoreStories;
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