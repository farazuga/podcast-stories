// API base URL - uses window.window.API_URL from config.js
// const window.API_URL is now provided by config.js

// Global variables
let currentUser = null;
let currentStory = null;
let storyId = null;
let isFavorited = false;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    // Get story ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    storyId = urlParams.get('id');
    
    if (!storyId) {
        window.location.href = '/dashboard.html';
        return;
    }
    
    await loadUserInfo();
    await loadStory();
    await loadFavoriteStatus();
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
        
        const displayName = user.name || user.email || user.username || 'User';
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            userInfoElement.textContent = `${displayName} (${user.role})`;
        }
        
        // Show admin link if user is admin or amitrace_admin
        if (user.role === 'admin' || user.role === 'amitrace_admin') {
            const adminLink = document.getElementById('adminLink');
            if (adminLink) {
                adminLink.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        // Don't logout on error, just log it
        console.warn('Could not load user info, continuing with limited functionality');
    }
}

async function loadStory() {
    try {
        const response = await fetch(`${window.API_URL}/stories/${storyId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            currentStory = await response.json();
            displayStory();
        } else if (response.status === 404) {
            // Story not found - show error but don't logout
            showErrorPage('Story Not Found', 'The story you are looking for does not exist or has been deleted.');
        } else if (response.status === 401) {
            // Unauthorized - token might be expired
            console.error('Authentication failed');
            alert('Your session has expired. Please login again.');
            window.location.href = '/index.html';
        } else {
            // Other error - show generic message
            showErrorPage('Error Loading Story', `Unable to load story details. Error: ${response.status}`);
        }
    } catch (error) {
        console.error('Error loading story:', error);
        showErrorPage('Connection Error', 'Unable to connect to the server. Please check your internet connection and try again.');
    }
}

function showErrorPage(title, message) {
    // Hide loading or show error in the main content area
    const container = document.querySelector('.story-detail-card');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <h2 style="color: #dc3545; margin-bottom: 1rem;">⚠️ ${title}</h2>
                <p style="color: #6c757d; margin-bottom: 2rem;">${message}</p>
                <button onclick="window.location.href='/dashboard.html'" 
                        style="padding: 0.5rem 2rem; background: #f97316; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Return to Dashboard
                </button>
            </div>
        `;
    }
}

function displayStory() {
    if (!currentStory) return;
    
    // Basic information
    document.getElementById('storyTitle').textContent = currentStory.idea_title;
    document.getElementById('storyDescription').textContent = currentStory.idea_description || 'No description provided';
    document.getElementById('uploadDate').textContent = formatDate(currentStory.uploaded_date);
    document.getElementById('uploadedBy').textContent = currentStory.uploaded_by_name;
    document.getElementById('school').textContent = currentStory.uploaded_by_school || 'Not specified';
    document.getElementById('email').textContent = currentStory.uploaded_by_email;
    
    // Coverage dates
    document.getElementById('startDate').textContent = formatDate(currentStory.coverage_start_date);
    document.getElementById('endDate').textContent = currentStory.coverage_end_date ? 
        formatDate(currentStory.coverage_end_date) : formatSingleDayCoverage(currentStory.coverage_start_date);
    
    // Tags
    const tagsContainer = document.getElementById('storyTags');
    if (currentStory.tags && currentStory.tags.length > 0) {
        tagsContainer.innerHTML = currentStory.tags.filter(tag => tag).map(tag => 
            `<span class="tag">${tag}</span>`
        ).join('');
    } else {
        tagsContainer.innerHTML = '<span class="no-data">No tags assigned</span>';
    }
    
    // Questions
    const questionsList = document.getElementById('questionsList');
    const questions = [
        currentStory.question_1,
        currentStory.question_2,
        currentStory.question_3,
        currentStory.question_4,
        currentStory.question_5,
        currentStory.question_6
    ].filter(q => q && q.trim());
    
    if (questions.length > 0) {
        questionsList.innerHTML = questions.map((question, index) => `
            <div class="question-item">
                <p class="question-text">${question}</p>
            </div>
        `).join('');
    } else {
        questionsList.innerHTML = '<div class="no-data">No questions provided</div>';
    }
    
    // Interviewees
    const intervieweesList = document.getElementById('intervieweesList');
    if (currentStory.interviewees && currentStory.interviewees.length > 0) {
        intervieweesList.innerHTML = currentStory.interviewees.filter(person => person).map(person => `
            <div class="person-card">
                <div class="person-icon">👤</div>
                <div class="person-title">${person}</div>
            </div>
        `).join('');
    } else {
        intervieweesList.innerHTML = '<div class="no-data">No interviewees specified</div>';
    }
    
    // Show/hide action buttons based on user role
    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn && currentUser.role !== 'admin' && currentUser.role !== 'amitrace_admin') {
        deleteBtn.style.display = 'none';
    }
    
    // Update favorite button state
    updateFavoriteButton();
}

async function loadFavoriteStatus() {
    try {
        const response = await fetch(`${window.API_URL || 'https://podcast-stories-production.up.railway.app/api'}/favorites`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const favorites = await response.json();
            isFavorited = favorites.some(fav => fav.story_id === parseInt(storyId));
        }
    } catch (error) {
        console.error('Error loading favorite status:', error);
    }
}

function updateFavoriteButton() {
    const favoriteIcon = document.getElementById('favoriteIcon');
    const favoriteText = document.getElementById('favoriteText');
    const favoriteBtn = document.getElementById('favoriteBtn');
    
    if (isFavorited) {
        favoriteIcon.textContent = '♥';
        favoriteText.textContent = 'Remove from Favorites';
        favoriteBtn.classList.add('favorited');
    } else {
        favoriteIcon.textContent = '♡';
        favoriteText.textContent = 'Add to Favorites';
        favoriteBtn.classList.remove('favorited');
    }
}

async function toggleFavorite() {
    const favoriteBtn = document.getElementById('favoriteBtn');
    
    // Disable button during request
    favoriteBtn.disabled = true;
    
    try {
        const method = isFavorited ? 'DELETE' : 'POST';
        const response = await fetch(`${window.API_URL || 'https://podcast-stories-production.up.railway.app/api'}/favorites/${storyId}`, {
            method: method,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            isFavorited = !isFavorited;
            updateFavoriteButton();
            
            // Show success message
            const message = isFavorited ? 'Added to favorites!' : 'Removed from favorites!';
            showTempMessage(message, 'success');
        } else {
            showTempMessage('Failed to update favorite status', 'error');
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showTempMessage('Network error. Please try again.', 'error');
    } finally {
        favoriteBtn.disabled = false;
    }
}

function showTempMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `temp-message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        border-radius: 5px;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        z-index: 1000;
        font-family: Arial, sans-serif;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

function editStory() {
    // For now, redirect to add story page with edit mode
    // In a full implementation, you'd populate the form with existing data
    window.location.href = `/add-story.html?edit=${storyId}`;
}

async function deleteStory() {
    if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
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
            alert('Story deleted successfully');
            window.location.href = '/dashboard.html';
        } else {
            alert('Failed to delete story');
        }
    } catch (error) {
        console.error('Error deleting story:', error);
        alert('Error deleting story');
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const datePart = dateString.split('T')[0];
    return formatDateSafeWithOptions(datePart, { month: 'long' });
}

function formatSingleDayCoverage(dateString) {
    if (!dateString) return 'Single Day: Date not specified';
    const datePart = dateString.split('T')[0];
    return 'Single Day: ' + formatDateSafeWithOptions(datePart, { month: 'long' }).replace(/^\d+\/\d+\/\d+$/, formatDateSafeWithOptions(datePart, { month: 'long' }));
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}