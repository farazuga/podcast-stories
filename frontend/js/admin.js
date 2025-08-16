// API base URL
const API_URL = 'http://localhost:3000/api';

// Global variables
let currentUser = null;
let allTags = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    await loadUserInfo();
    await loadTags();
    await loadStatistics();
    await loadRecentStories();
    setupEventListeners();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || user.role !== 'admin') {
        window.location.href = 'dashboard.html';
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

async function loadTags() {
    try {
        const response = await fetch(`${API_URL}/tags`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
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

async function loadStatistics() {
    try {
        // Load stories for statistics
        const storiesResponse = await fetch(`${API_URL}/stories`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (storiesResponse.ok) {
            const stories = await storiesResponse.json();
            
            // Calculate statistics
            const totalStories = stories.length;
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            const storiesThisMonth = stories.filter(story => {
                const storyDate = new Date(story.uploaded_date);
                return storyDate.getMonth() === currentMonth && storyDate.getFullYear() === currentYear;
            }).length;
            
            // Update statistics display
            document.getElementById('totalStories').textContent = totalStories;
            document.getElementById('storiesThisMonth').textContent = storiesThisMonth;
            document.getElementById('totalTags').textContent = allTags.length;
            
            // For user count, we'll need to implement a users endpoint or estimate
            document.getElementById('totalUsers').textContent = '—';
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

async function loadRecentStories() {
    try {
        const response = await fetch(`${API_URL}/stories`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stories = await response.json();
            const recentStories = stories.slice(0, 10); // Get first 10 stories
            
            const tableBody = document.getElementById('recentStoriesTable');
            if (tableBody) {
                tableBody.innerHTML = recentStories.map(story => `
                    <tr>
                        <td>${story.idea_title}</td>
                        <td>${story.uploaded_by_name}</td>
                        <td>${formatDate(story.uploaded_date)}</td>
                        <td>${story.tags ? story.tags.filter(tag => tag).join(', ') : 'None'}</td>
                        <td>
                            <button class="btn btn-view" onclick="viewStory(${story.id})" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">View</button>
                            <button class="btn btn-delete" onclick="deleteStory(${story.id})" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">Delete</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading recent stories:', error);
    }
}

function setupEventListeners() {
    // Add tag form
    const addTagForm = document.getElementById('addTagForm');
    if (addTagForm) {
        addTagForm.addEventListener('submit', handleAddTag);
    }
}

async function handleAddTag(e) {
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
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
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
    window.location.href = `story-detail.html?id=${storyId}`;
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

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}