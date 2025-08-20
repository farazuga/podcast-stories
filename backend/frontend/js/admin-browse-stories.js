// Admin Browse Stories - Enhanced functionality for administrators
console.log('🔥 ADMIN-BROWSE-STORIES.JS LOADING');

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
let adminStats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
};

// Initialize page
async function initializeAdminBrowseStoriesPage() {
    console.log('Admin Browse Stories page initialization starting...');
    
    // Wait a moment for auth.js to finish any token processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!checkAuth()) return;
    
    // Verify admin access
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    if (userData.role !== 'amitrace_admin') {
        alert('Access denied. Admin privileges required.');
        window.location.href = '/dashboard.html';
        return;
    }
    
    try {
        console.log('🔍 Starting admin loadUserInfo...');
        await loadUserInfo();
        console.log('✅ loadUserInfo complete');
        
        console.log('🔍 Starting loadTags...');
        await loadTags();
        console.log('✅ loadTags complete');
        
        console.log('🔍 Starting loadAdminStats...');
        await loadAdminStats();
        console.log('✅ loadAdminStats complete');
        
        console.log('🔍 Starting loadStories...');
        await loadStories();
        console.log('✅ loadStories complete');
        
        console.log('🔍 Starting setupEventListeners...');
        setupEventListeners();
        console.log('✅ setupEventListeners complete');
        
        console.log('Admin Browse Stories page initialization complete!');
    } catch (error) {
        console.error('❌ Admin initialization error:', error);
    }
}

// Handle both DOMContentLoaded and immediate execution
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminBrowseStoriesPage);
} else {
    initializeAdminBrowseStoriesPage();
}

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// Load user info
async function loadUserInfo() {
    const token = localStorage.getItem('token');
    const userInfo = JSON.parse(localStorage.getItem('user') || '{}');
    currentUser = userInfo;
    console.log('Admin user info loaded:', currentUser);
}

// Load admin statistics
async function loadAdminStats() {
    try {
        const response = await fetch(`${window.API_URL}/stories?admin=true`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const stories = await response.json();
            
            adminStats.total = stories.length;
            adminStats.pending = stories.filter(story => story.approval_status === 'pending').length;
            adminStats.approved = stories.filter(story => story.approval_status === 'approved').length;
            adminStats.rejected = stories.filter(story => story.approval_status === 'rejected').length;
            
            // Update admin stats display
            document.getElementById('totalStoriesAdmin').textContent = adminStats.total;
            document.getElementById('pendingStoriesAdmin').textContent = adminStats.pending;
            document.getElementById('approvedStoriesAdmin').textContent = adminStats.approved;
            document.getElementById('rejectedStoriesAdmin').textContent = adminStats.rejected;
        }
    } catch (error) {
        console.error('Failed to load admin stats:', error);
    }
}

// Load stories (admin version with all stories)
async function loadStories() {
    try {
        const response = await fetch(`${window.API_URL}/stories?admin=true`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            const stories = await response.json();
            console.log(`Loaded ${stories.length} stories for admin review`);
            
            allStories = stories.map(story => ({
                ...story,
                is_favorited: false // Will be loaded separately if needed
            }));
            
            applyFilters();
            renderStories();
            updateResultsCount();
        } else {
            console.error('Failed to load stories:', response.status);
        }
    } catch (error) {
        console.error('Error loading stories:', error);
    }
}

// Load tags
async function loadTags() {
    try {
        const response = await fetch(`${window.API_URL}/tags`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
    if (tagsSelect && allTags) {
        tagsSelect.innerHTML = '';
        allTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.name;
            option.textContent = tag.name;
            tagsSelect.appendChild(option);
        });
    }
}

// Enhanced story card renderer with admin features
function renderStoryCard(story) {
    const isGridView = currentViewMode === 'grid';
    const cardClass = isGridView ? 'story-card admin-story-card' : 'story-card story-card-list admin-story-card';
    const isSelected = selectedStories.has(story.id);
    
    // Format dates
    const startDate = story.coverage_start_date ? new Date(story.coverage_start_date).toLocaleDateString() : '';
    const endDate = story.coverage_end_date ? new Date(story.coverage_end_date).toLocaleDateString() : '';
    const uploadedDate = story.uploaded_date ? new Date(story.uploaded_date).toLocaleDateString() : '';
    const submittedDate = story.created_at ? new Date(story.created_at).toLocaleDateString() : '';
    
    // Admin-specific info
    const authorInfo = story.uploaded_by_name || story.author || 'Unknown';
    const schoolInfo = story.school_name || 'No School';
    
    // Status badge with action buttons
    const statusBadge = `
        <div class="admin-status-section">
            <span class="status-badge status-${story.approval_status}">${story.approval_status?.toUpperCase()}</span>
            <div class="admin-quick-actions">
                ${story.approval_status !== 'approved' ? 
                    `<button class="btn btn-success btn-tiny" onclick="event.stopPropagation(); approveStory(${story.id})" title="Approve">✅</button>` : ''}
                ${story.approval_status !== 'rejected' ? 
                    `<button class="btn btn-danger btn-tiny" onclick="event.stopPropagation(); rejectStory(${story.id})" title="Reject">❌</button>` : ''}
            </div>
        </div>
    `;
    
    // Enhanced selection checkbox
    const selectionCheckbox = `
        <div class="story-checkbox-compact" onclick="event.stopPropagation()">
            <input type="checkbox" 
                   class="story-select-checkbox" 
                   data-story-id="${story.id}"
                   ${isSelected ? 'checked' : ''}
                   onchange="toggleStorySelection(${story.id})">
        </div>
    `;
    
    // Admin info panel
    const adminInfo = `
        <div class="admin-info-panel">
            <div class="admin-info-item">📝 By: ${authorInfo}</div>
            <div class="admin-info-item">🏫 School: ${schoolInfo}</div>
            <div class="admin-info-item">📅 Submitted: ${submittedDate}</div>
        </div>
    `;
    
    // Format tags and interviewees
    const tags = story.tags && Array.isArray(story.tags) 
        ? story.tags.filter(tag => tag).slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('') 
        : '';
    
    const interviewees = story.interviewees && Array.isArray(story.interviewees)
        ? story.interviewees.filter(person => person).slice(0, 2).join(', ')
        : '';
    
    if (!isGridView) {
        // List view - compact admin layout
        return `
            <div class="${cardClass} ${isSelected ? 'selected' : ''}" data-story-id="${story.id}">
                <div class="story-header-compact">
                    ${selectionCheckbox}
                    <h3 class="story-title-compact">${story.idea_title}</h3>
                    ${statusBadge}
                </div>
                <div class="admin-info-row">
                    <span>By: ${authorInfo}</span>
                    <span>School: ${schoolInfo}</span>
                    <span>Submitted: ${submittedDate}</span>
                </div>
                <div class="story-actions-compact">
                    <button class="btn btn-primary btn-small" onclick="viewStory(${story.id})">View</button>
                    <button class="btn btn-secondary btn-small" onclick="editStory(${story.id})">Edit</button>
                </div>
            </div>
        `;
    }
    
    // Grid view - enhanced with admin info
    return `
        <div class="${cardClass} ${isSelected ? 'selected' : ''} clickable-card" 
             data-story-id="${story.id}"
             onclick="handleStoryCardClick(event, ${story.id})">
            <div class="story-header-compact">
                ${selectionCheckbox}
                <h3 class="story-title-compact" title="${story.idea_title}">${story.idea_title}</h3>
                ${statusBadge}
            </div>
            
            ${adminInfo}
            
            ${story.coverage_start_date ? `<div class="story-coverage-compact">🎬 ${startDate}${endDate ? ` - ${endDate}` : ''}</div>` : ''}
            
            ${tags ? `<div class="story-tags-compact">${tags}</div>` : ''}
            
            ${interviewees ? `<div class="story-interviewees-compact">🎤 ${interviewees}</div>` : ''}
            
            <div class="story-actions-compact">
                <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); editStory(${story.id})">Edit</button>
            </div>
        </div>
    `;
}

// Apply filters (admin version with status filtering)
function applyFilters() {
    const keywords = document.getElementById('searchKeywords')?.value.toLowerCase() || '';
    const selectedTags = Array.from(document.getElementById('searchTags')?.selectedOptions || []).map(option => option.value);
    const status = document.getElementById('searchStatus')?.value || '';
    const startDate = document.getElementById('searchStartDate')?.value || '';
    const endDate = document.getElementById('searchEndDate')?.value || '';
    const author = document.getElementById('searchAuthor')?.value.toLowerCase() || '';
    
    filteredStories = allStories.filter(story => {
        // Keywords filter
        if (keywords && !story.idea_title.toLowerCase().includes(keywords) && 
            !story.idea_description?.toLowerCase().includes(keywords)) {
            return false;
        }
        
        // Tags filter
        if (selectedTags.length > 0) {
            const storyTags = story.tags || [];
            if (!selectedTags.some(tag => storyTags.includes(tag))) {
                return false;
            }
        }
        
        // Status filter
        if (status && story.approval_status !== status) {
            return false;
        }
        
        // Date range filter
        if (startDate && story.coverage_start_date && story.coverage_start_date < startDate) {
            return false;
        }
        if (endDate && story.coverage_end_date && story.coverage_end_date > endDate) {
            return false;
        }
        
        // Author filter
        if (author && !story.uploaded_by_name?.toLowerCase().includes(author) &&
            !story.author?.toLowerCase().includes(author)) {
            return false;
        }
        
        return true;
    });
    
    // Reset to first page when filters change
    currentPage = 0;
}

// Admin-specific functions
async function approveStory(storyId) {
    try {
        const response = await fetch(`${window.API_URL}/stories/${storyId}/approve`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            // Update local story status
            const story = allStories.find(s => s.id === storyId);
            if (story) {
                story.approval_status = 'approved';
            }
            
            showSuccess(`Story approved successfully!`);
            await loadAdminStats(); // Refresh stats
            renderStories(); // Re-render stories
        } else {
            showError('Failed to approve story');
        }
    } catch (error) {
        console.error('Error approving story:', error);
        showError('Error approving story');
    }
}

async function rejectStory(storyId) {
    try {
        const response = await fetch(`${window.API_URL}/stories/${storyId}/reject`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (response.ok) {
            // Update local story status
            const story = allStories.find(s => s.id === storyId);
            if (story) {
                story.approval_status = 'rejected';
            }
            
            showSuccess(`Story rejected successfully!`);
            await loadAdminStats(); // Refresh stats
            renderStories(); // Re-render stories
        } else {
            showError('Failed to reject story');
        }
    } catch (error) {
        console.error('Error rejecting story:', error);
        showError('Error rejecting story');
    }
}

async function bulkApproveSelected() {
    if (selectedStories.size === 0) {
        showError('No stories selected');
        return;
    }
    
    if (!confirm(`Approve ${selectedStories.size} selected stories?`)) {
        return;
    }
    
    try {
        const promises = Array.from(selectedStories).map(storyId => 
            fetch(`${window.API_URL}/stories/${storyId}/approve`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
        );
        
        await Promise.all(promises);
        
        // Update local stories
        selectedStories.forEach(storyId => {
            const story = allStories.find(s => s.id === storyId);
            if (story) {
                story.approval_status = 'approved';
            }
        });
        
        showSuccess(`${selectedStories.size} stories approved successfully!`);
        clearSelection();
        await loadAdminStats();
        renderStories();
    } catch (error) {
        console.error('Error bulk approving stories:', error);
        showError('Error approving stories');
    }
}

async function bulkRejectSelected() {
    if (selectedStories.size === 0) {
        showError('No stories selected');
        return;
    }
    
    if (!confirm(`Reject ${selectedStories.size} selected stories?`)) {
        return;
    }
    
    try {
        const promises = Array.from(selectedStories).map(storyId => 
            fetch(`${window.API_URL}/stories/${storyId}/reject`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
        );
        
        await Promise.all(promises);
        
        // Update local stories
        selectedStories.forEach(storyId => {
            const story = allStories.find(s => s.id === storyId);
            if (story) {
                story.approval_status = 'rejected';
            }
        });
        
        showSuccess(`${selectedStories.size} stories rejected successfully!`);
        clearSelection();
        await loadAdminStats();
        renderStories();
    } catch (error) {
        console.error('Error bulk rejecting stories:', error);
        showError('Error rejecting stories');
    }
}

// CSV Import Functions
function showCSVImportModal() {
    document.getElementById('csvModal').style.display = 'block';
}

function downloadSampleCSV() {
    const sampleData = [
        ['idea_title', 'idea_description', 'question_1', 'question_2', 'question_3', 'question_4', 'question_5', 'question_6', 'coverage_start_date', 'coverage_end_date', 'tags', 'interviewees'],
        ['Local Environmental Impact', 'Investigating pollution effects on local wildlife', 'What pollution sources affect our area?', 'How has wildlife been impacted?', 'What cleanup efforts are underway?', 'How can residents help?', 'What policies need changing?', 'What is the long-term outlook?', '2024-01-15', '2024-03-15', 'environment,pollution,wildlife', 'Environmental Scientist,Local Mayor'],
        ['School Lunch Program Innovation', 'How schools are improving nutrition and sustainability', 'What changes were made to the program?', 'How do students respond to new options?', 'What are the nutritional benefits?', 'How is food sourcing different?', 'What challenges were faced?', 'What are the cost implications?', '2024-02-01', '2024-04-01', 'education,nutrition,sustainability', 'School Nutritionist,Principal,Student Representative']
    ];
    
    const csvContent = sampleData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'vidpod-sample-stories.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Re-use existing functions from stories.js with modifications for admin view
function renderStories() {
    const container = document.getElementById('storiesGrid');
    if (!container) return;
    
    const startIndex = currentPage * storiesPerPage;
    const storiesToShow = filteredStories.slice(startIndex, startIndex + storiesPerPage);
    
    if (storiesToShow.length === 0) {
        showNoResults();
        return;
    }
    
    container.className = currentViewMode === 'grid' ? 'stories-grid' : 'stories-list';
    container.innerHTML = storiesToShow.map(story => renderStoryCard(story)).join('');
    
    updatePaginationControls();
    updateSelectionState();
}

// Include common functions from stories.js
function showNoResults() {
    document.getElementById('storiesGrid').innerHTML = '';
    document.getElementById('noResults').style.display = 'block';
    document.getElementById('paginationControls').style.display = 'none';
}

function setViewMode(mode) {
    currentViewMode = mode;
    document.getElementById('gridViewBtn').classList.toggle('active', mode === 'grid');
    document.getElementById('listViewBtn').classList.toggle('active', mode === 'list');
    renderStories();
}

function clearFilters() {
    document.getElementById('searchKeywords').value = '';
    document.getElementById('searchTags').selectedIndex = -1;
    document.getElementById('searchStatus').value = '';
    document.getElementById('searchStartDate').value = '';
    document.getElementById('searchEndDate').value = '';
    document.getElementById('searchAuthor').value = '';
    applyFilters();
    renderStories();
    updateResultsCount();
}

function updateResultsCount() {
    const resultsCount = document.getElementById('resultsCount');
    if (resultsCount) {
        resultsCount.textContent = `Showing ${filteredStories.length} of ${allStories.length} stories`;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search form
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            applyFilters();
            renderStories();
            updateResultsCount();
        });
    }
    
    // CSV Modal
    const csvModal = document.getElementById('csvModal');
    if (csvModal) {
        csvModal.querySelector('.close').addEventListener('click', () => {
            csvModal.style.display = 'none';
        });
        
        window.addEventListener('click', (event) => {
            if (event.target === csvModal) {
                csvModal.style.display = 'none';
            }
        });
    }
    
    // CSV Form
    const csvForm = document.getElementById('csvForm');
    if (csvForm) {
        csvForm.addEventListener('submit', handleCSVUpload);
    }
}

// CSV Upload Handler
async function handleCSVUpload(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('csvFile');
    const autoApprove = document.getElementById('autoApprove').checked;
    
    if (!fileInput.files[0]) {
        showError('Please select a CSV file');
        return;
    }
    
    const formData = new FormData();
    formData.append('csvFile', fileInput.files[0]);
    formData.append('autoApprove', autoApprove);
    
    try {
        const response = await fetch(`${window.API_URL}/stories/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess(`Successfully imported ${result.imported || 0} stories!`);
            document.getElementById('csvModal').style.display = 'none';
            await loadStories(); // Reload stories
            await loadAdminStats(); // Reload stats
        } else {
            showError(result.error || 'Import failed');
        }
    } catch (error) {
        console.error('CSV upload error:', error);
        showError('Upload failed. Please try again.');
    }
}

// Common utility functions (reused from stories.js)
function viewStory(storyId) {
    window.location.href = `/story-detail.html?id=${storyId}`;
}

function handleStoryCardClick(event, storyId) {
    const target = event.target;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'BUTTON' || 
        target.closest('input') ||
        target.closest('button')) {
        return;
    }
    viewStory(storyId);
}

function editStory(storyId) {
    window.location.href = `/add-story.html?edit=${storyId}`;
}

// Selection management
function toggleStorySelection(storyId) {
    if (selectedStories.has(storyId)) {
        selectedStories.delete(storyId);
    } else {
        selectedStories.add(storyId);
    }
    updateSelectionState();
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const visibleStories = document.querySelectorAll('.story-card[data-story-id]');
    
    if (selectAllCheckbox.checked) {
        visibleStories.forEach(card => {
            const storyId = parseInt(card.getAttribute('data-story-id'));
            selectedStories.add(storyId);
        });
    } else {
        selectedStories.clear();
    }
    
    updateSelectionState();
}

function updateSelectionState() {
    const selectedCount = selectedStories.size;
    const bulkActionsBar = document.getElementById('bulkActionsBar');
    const selectedCountElement = document.getElementById('bulkSelectedCount');
    
    if (selectedCount > 0) {
        bulkActionsBar.style.display = 'block';
        selectedCountElement.textContent = selectedCount;
    } else {
        bulkActionsBar.style.display = 'none';
    }
    
    // Update checkboxes
    document.querySelectorAll('.story-select-checkbox').forEach(checkbox => {
        const storyId = parseInt(checkbox.dataset.storyId);
        checkbox.checked = selectedStories.has(storyId);
    });
}

function clearSelection() {
    selectedStories.clear();
    updateSelectionState();
}

// Pagination
function updatePaginationControls() {
    const paginationElement = document.getElementById('paginationControls');
    const totalPages = Math.ceil(filteredStories.length / storiesPerPage);
    
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
        <span class="page-info">
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
    if (page >= 0 && page < totalPages) {
        currentPage = page;
        renderStories();
    }
}

// Sorting
function sortStories() {
    const sortBy = document.getElementById('sortBy').value;
    
    filteredStories.sort((a, b) => {
        switch (sortBy) {
            case 'newest':
                return new Date(b.created_at || b.uploaded_date) - new Date(a.created_at || a.uploaded_date);
            case 'oldest':
                return new Date(a.created_at || a.uploaded_date) - new Date(b.created_at || b.uploaded_date);
            case 'status':
                const statusOrder = { pending: 0, rejected: 1, approved: 2 };
                return (statusOrder[a.approval_status] || 0) - (statusOrder[b.approval_status] || 0);
            case 'title':
                return a.idea_title.localeCompare(b.idea_title);
            case 'author':
                return (a.uploaded_by_name || '').localeCompare(b.uploaded_by_name || '');
            case 'coverage_newest':
                return new Date(b.coverage_start_date || '1900-01-01') - new Date(a.coverage_start_date || '1900-01-01');
            case 'coverage_oldest':
                return new Date(a.coverage_start_date || '2100-01-01') - new Date(b.coverage_start_date || '2100-01-01');
            default:
                return 0;
        }
    });
    
    renderStories();
}

// Export functions
function bulkExport() {
    if (selectedStories.size === 0) {
        showError('No stories selected for export');
        return;
    }
    
    const selectedStoriesData = allStories.filter(story => selectedStories.has(story.id));
    exportStoriesToCSV(selectedStoriesData, 'selected-stories');
}

function exportAllStories() {
    exportStoriesToCSV(allStories, 'all-stories-admin');
}

function exportStoriesToCSV(stories, filename) {
    const headers = [
        'ID', 'Title', 'Description', 'Status', 'Author', 'School',
        'Question 1', 'Question 2', 'Question 3', 'Question 4', 'Question 5', 'Question 6',
        'Coverage Start', 'Coverage End', 'Tags', 'Interviewees', 'Submitted Date'
    ];
    
    const csvContent = [
        headers.join(','),
        ...stories.map(story => [
            story.id,
            `"${story.idea_title || ''}"`,
            `"${story.idea_description || ''}"`,
            story.approval_status || 'pending',
            `"${story.uploaded_by_name || story.author || ''}"`,
            `"${story.school_name || ''}"`,
            `"${story.question_1 || ''}"`,
            `"${story.question_2 || ''}"`,
            `"${story.question_3 || ''}"`,
            `"${story.question_4 || ''}"`,
            `"${story.question_5 || ''}"`,
            `"${story.question_6 || ''}"`,
            story.coverage_start_date || '',
            story.coverage_end_date || '',
            `"${story.tags ? story.tags.join(', ') : ''}"`,
            `"${story.interviewees ? story.interviewees.join(', ') : ''}"`,
            story.created_at || story.uploaded_date || ''
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vidpod-${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess(`Exported ${stories.length} stories to CSV!`);
}

// Bulk delete (admin only)
async function bulkDelete() {
    if (selectedStories.size === 0) {
        showError('No stories selected');
        return;
    }
    
    if (!confirm(`⚠️ DANGER: This will permanently delete ${selectedStories.size} stories. This action cannot be undone. Are you sure?`)) {
        return;
    }
    
    if (!confirm(`This is your final warning. Delete ${selectedStories.size} stories permanently?`)) {
        return;
    }
    
    try {
        const promises = Array.from(selectedStories).map(storyId => 
            fetch(`${window.API_URL}/stories/${storyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
        );
        
        await Promise.all(promises);
        
        showSuccess(`${selectedStories.size} stories deleted successfully!`);
        clearSelection();
        await loadStories();
        await loadAdminStats();
    } catch (error) {
        console.error('Error bulk deleting stories:', error);
        showError('Error deleting stories');
    }
}

// Favorites (reuse from stories.js if needed)
function bulkFavorite() {
    // Implementation for bulk favorites if needed
    showSuccess('Bulk favorite functionality would be implemented here');
}

// Utility functions for success/error messages
function showSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'success-alert';
    alert.textContent = `✅ ${message}`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 500;
    `;
    document.body.appendChild(alert);
    setTimeout(() => {
        document.body.removeChild(alert);
    }, 3000);
}

function showError(message) {
    const alert = document.createElement('div');
    alert.className = 'error-alert';
    alert.textContent = `❌ ${message}`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 500;
    `;
    document.body.appendChild(alert);
    setTimeout(() => {
        document.body.removeChild(alert);
    }, 5000);
}

// Make functions globally available for HTML onclick handlers
window.bulkExport = bulkExport;
window.exportAllStories = exportAllStories;
window.bulkFavorite = bulkFavorite;
window.bulkDelete = bulkDelete;
window.bulkApprove = bulkApprove;
window.bulkRejectSelected = bulkRejectSelected;
window.clearSelection = clearSelection;
window.toggleSelectAll = toggleSelectAll;
window.toggleStorySelection = toggleStorySelection;

console.log('Admin Browse Stories JavaScript loaded successfully');