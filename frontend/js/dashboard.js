// API base URL
const API_URL = 'http://localhost:3000/api';

// Global variables
let allStories = [];
let currentUser = null;
let allTags = [];

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
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

async function loadUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        currentUser = user;
        
        document.getElementById('userInfo').textContent = `${user.username} (${user.role})`;
        
        // Show admin link if user is admin
        if (user.role === 'admin') {
            document.getElementById('adminLink').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        logout();
    }
}

async function loadTags() {
    try {
        const response = await fetch(`${API_URL}/tags`, {
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
        
        const response = await fetch(`${API_URL}/stories?${queryParams}`, {
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
    
    const endDate = story.coverage_end_date ? 
        ` - ${formatDate(story.coverage_end_date)}` : '';
    
    const deleteButton = currentUser && currentUser.role === 'admin' ? 
        `<button class="btn btn-delete" onclick="deleteStory(${story.id})">Delete</button>` : '';
    
    return `
        <div class="story-card">
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
                📆 Coverage: ${formatDate(story.coverage_start_date)}${endDate}
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
    
    if (!file) {
        alert('Please select a CSV file');
        return;
    }
    
    const formData = new FormData();
    formData.append('csv', file);
    
    try {
        const response = await fetch(`${API_URL}/stories/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            document.getElementById('csvResult').innerHTML = `
                <div class="success-message" style="display: block;">
                    Import completed! ${result.imported} stories imported.
                    ${result.errors.length > 0 ? `${result.errors.length} errors occurred.` : ''}
                </div>
            `;
            
            // Refresh stories list
            await loadStories();
            
            // Close modal after 3 seconds
            setTimeout(() => {
                document.getElementById('csvModal').style.display = 'none';
                document.getElementById('csvUploadForm').reset();
                document.getElementById('csvResult').innerHTML = '';
            }, 3000);
        } else {
            document.getElementById('csvResult').innerHTML = `
                <div class="error-message" style="display: block;">
                    Import failed: ${result.error}
                </div>
            `;
        }
    } catch (error) {
        document.getElementById('csvResult').innerHTML = `
            <div class="error-message" style="display: block;">
                Network error during upload
            </div>
        `;
    }
}

function viewStory(storyId) {
    window.location.href = `story-detail.html?id=${storyId}`;
}

async function deleteStory(storyId) {
    if (!confirm('Are you sure you want to delete this story?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/stories/${storyId}`, {
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

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}