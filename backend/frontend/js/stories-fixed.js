// Fixed version of stories.js - no duplicate API_URL declaration
// This file uses window.API_URL set by auth.js

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
            populateTagFilter();
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

function populateTagFilter() {
    const tagFilter = document.getElementById('tagFilter');
    if (tagFilter) {
        tagFilter.innerHTML = '<option value="">All Tags</option>';
        allTags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.tag_name;
            option.textContent = tag.tag_name;
            tagFilter.appendChild(option);
        });
    }
}

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
    const storiesGrid = document.getElementById('storiesGrid');
    if (!storiesGrid) return;

    if (filteredStories.length === 0) {
        storiesGrid.innerHTML = `
            <div class="no-stories">
                <p>No stories found</p>
            </div>
        `;
        return;
    }

    storiesGrid.innerHTML = filteredStories.map(story => `
        <div class="story-card" data-story-id="${story.id}">
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
                <button class="btn btn-sm btn-primary" onclick="viewStory(${story.id})">View Details</button>
                ${currentUser && currentUser.role !== 'student' ? 
                    `<button class="btn btn-sm btn-secondary" onclick="editStory(${story.id})">Edit</button>` : 
                    ''
                }
            </div>
        </div>
    `).join('');
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
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterStories, 300));
    }

    // Filter listeners
    const filters = ['tagFilter', 'startDateFilter', 'endDateFilter'];
    filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', filterStories);
        }
    });
}

function filterStories() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const selectedTag = document.getElementById('tagFilter')?.value || '';
    const startDate = document.getElementById('startDateFilter')?.value || '';
    const endDate = document.getElementById('endDateFilter')?.value || '';

    filteredStories = allStories.filter(story => {
        // Search filter
        if (searchTerm && 
            !story.idea_title?.toLowerCase().includes(searchTerm) &&
            !story.idea_description?.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Tag filter
        if (selectedTag && (!story.tags || !story.tags.includes(selectedTag))) {
            return false;
        }

        // Date filters
        if (startDate && new Date(story.coverage_start_date) < new Date(startDate)) {
            return false;
        }
        if (endDate && new Date(story.coverage_end_date) > new Date(endDate)) {
            return false;
        }

        return true;
    });

    displayStories();
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

// Make logout available globally
window.logout = function() {
    localStorage.clear();
    window.location.href = '/index.html';
};