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
    
    return `
        <div class="${cardClass}" data-story-id="${story.id}">
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
                <button class="btn btn-outline btn-small favorite-btn" onclick="toggleFavorite(${story.id})" data-story-id="${story.id}">
                    ♡ Favorite
                </button>
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

// Story action functions
function viewStory(storyId) {
    window.location.href = `/story-detail.html?id=${storyId}`;
}

function editStory(storyId) {
    window.location.href = `/add-story.html?edit=${storyId}`;
}

async function toggleFavorite(storyId) {
    try {
        const method = 'POST'; // Simplified - will handle toggle on backend
        const response = await fetch(`${API_URL}/favorites/${storyId}`, {
            method: method,
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            // Update UI feedback (simplified for now)
            console.log('Favorite toggled:', result.message);
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
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

// Utility function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}