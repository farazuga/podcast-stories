// API base URL
const API_URL = 'https://podcast-stories-production.up.railway.app/api';

// Global variables
let currentUser = null;
let currentStory = null;
let storyId = null;

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
        
        document.getElementById('userInfo').textContent = `${user.username} (${user.role})`;
        
        // Show admin link if user is admin
        if (user.role === 'admin') {
            const adminLink = document.getElementById('adminLink');
            if (adminLink) {
                adminLink.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        logout();
    }
}

async function loadStory() {
    try {
        const response = await fetch(`${API_URL}/stories/${storyId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            currentStory = await response.json();
            displayStory();
        } else {
            alert('Story not found');
            window.location.href = '/dashboard.html';
        }
    } catch (error) {
        console.error('Error loading story:', error);
        alert('Error loading story');
        window.location.href = '/dashboard.html';
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
        formatDate(currentStory.coverage_end_date) : 'Single day coverage';
    
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
    if (currentUser.role !== 'admin') {
        deleteBtn.style.display = 'none';
    }
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
        const response = await fetch(`${API_URL}/stories/${storyId}`, {
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
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}