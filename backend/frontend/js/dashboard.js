// API base URL
const API_URL = 'https://podcast-stories-production.up.railway.app/api';

// Global variables
let allStories = [];
let currentUser = null;
let allTags = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    await loadUserInfo();
    
    // Load different content based on user role
    if (currentUser && currentUser.role === 'student') {
        await loadStudentClasses();
        setupStudentEventListeners();
    } else {
        await loadTags();
        await loadStories();
        setupEventListeners();
    }
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
        if (user.role === 'admin' || user.role === 'amitrace_admin') {
            document.getElementById('adminLink').style.display = 'block';
            document.getElementById('teacherLink').style.display = 'block';
        } else if (user.role === 'teacher') {
            document.getElementById('teacherLink').style.display = 'block';
        }
        
        // Hide CSV import for students
        if (user.role === 'student') {
            const csvBtn = document.getElementById('csvImportBtn');
            if (csvBtn) csvBtn.style.display = 'none';
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
            // Load favorite status for the stories
            allStories = await loadFavoriteStatus(allStories);
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
    
    const favoriteButton = currentUser ? 
        `<button class="btn btn-favorite ${story.is_favorited ? 'favorited' : ''}" 
                onclick="toggleFavorite(${story.id}, this)" 
                title="${story.is_favorited ? 'Remove from favorites' : 'Add to favorites'}">
            <span class="star-icon">${story.is_favorited ? '★' : '☆'}</span>
            <span class="favorite-count">${story.favorite_count || 0}</span>
        </button>` : '';
    
    return `
        <div class="story-card">
            <div class="story-header">
                <div class="story-title-row">
                    <h3 class="story-title">${story.idea_title}</h3>
                    ${favoriteButton}
                </div>
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
    window.location.href = `/story-detail.html?id=${storyId}`;
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
    window.location.href = '/index.html';
}

// Student-specific functions
async function loadStudentClasses() {
    try {
        const response = await fetch(`${API_URL}/classes`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const classes = await response.json();
            displayStudentClasses(classes);
        } else {
            console.error('Failed to load classes');
        }
    } catch (error) {
        console.error('Error loading classes:', error);
    }
}

function displayStudentClasses(classes) {
    const container = document.querySelector('.container');
    
    if (classes.length === 0) {
        container.innerHTML = `
            <div class="student-dashboard">
                <h2>My Classes</h2>
                <div class="no-classes">
                    <p>You're not enrolled in any classes yet.</p>
                    <div class="join-class-form">
                        <h3>Join a Class</h3>
                        <form id="joinClassForm">
                            <div class="form-group">
                                <label for="classCode">4-Digit Class Code</label>
                                <input type="text" id="classCode" placeholder="Enter class code" maxlength="4" required>
                            </div>
                            <button type="submit" class="btn btn-primary">Join Class</button>
                        </form>
                        <div id="joinMessage"></div>
                    </div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="student-dashboard">
                <h2>My Classes</h2>
                <div class="classes-grid">
                    ${classes.map(classItem => createClassCard(classItem)).join('')}
                </div>
                <div class="join-class-form">
                    <h3>Join Another Class</h3>
                    <form id="joinClassForm">
                        <div class="form-group">
                            <label for="classCode">4-Digit Class Code</label>
                            <input type="text" id="classCode" placeholder="Enter class code" maxlength="4" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Join Class</button>
                    </form>
                    <div id="joinMessage"></div>
                </div>
            </div>
        `;
    }
}

function createClassCard(classItem) {
    return `
        <div class="class-card">
            <div class="class-header">
                <h3>${classItem.class_name}</h3>
                <span class="class-code">Code: ${classItem.class_code}</span>
            </div>
            <div class="class-details">
                <p><strong>Subject:</strong> ${classItem.subject || 'N/A'}</p>
                <p><strong>Teacher:</strong> ${classItem.teacher_name}</p>
                <p><strong>School:</strong> ${classItem.school_name}</p>
                <p><strong>Students:</strong> ${classItem.student_count}</p>
                <p><strong>Joined:</strong> ${formatDate(classItem.joined_at)}</p>
            </div>
            ${classItem.description ? `<p class="class-description">${classItem.description}</p>` : ''}
            <div class="class-actions">
                <button class="btn btn-secondary" onclick="leaveClass(${classItem.id})">Leave Class</button>
            </div>
        </div>
    `;
}

function setupStudentEventListeners() {
    // Will be set up after DOM is created
    setTimeout(() => {
        const joinForm = document.getElementById('joinClassForm');
        if (joinForm) {
            joinForm.addEventListener('submit', handleJoinClass);
        }
        
        // Format class code input
        const classCodeInput = document.getElementById('classCode');
        if (classCodeInput) {
            classCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });
        }
    }, 100);
}

async function handleJoinClass(e) {
    e.preventDefault();
    
    const classCode = document.getElementById('classCode').value.trim();
    const messageDiv = document.getElementById('joinMessage');
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    if (classCode.length !== 4) {
        showJoinMessage('Class code must be exactly 4 characters', 'error');
        return;
    }
    
    // Show loading state
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Joining...';
    submitButton.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/classes/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ class_code: classCode })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showJoinMessage(`Successfully joined ${result.class_name}!`, 'success');
            document.getElementById('classCode').value = '';
            
            // Reload classes after 2 seconds
            setTimeout(() => {
                loadStudentClasses();
            }, 2000);
        } else {
            showJoinMessage(result.error || 'Failed to join class', 'error');
        }
    } catch (error) {
        showJoinMessage('Network error. Please try again.', 'error');
    } finally {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    }
}

async function leaveClass(classId) {
    if (!confirm('Are you sure you want to leave this class?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/classes/${classId}/leave`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            await loadStudentClasses();
        } else {
            alert('Failed to leave class');
        }
    } catch (error) {
        alert('Error leaving class');
    }
}

function showJoinMessage(message, type) {
    const messageDiv = document.getElementById('joinMessage');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = type === 'error' ? 'error-message' : 'success-message';
        messageDiv.style.display = 'block';
        messageDiv.style.marginTop = '1rem';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// Favorite functionality
async function toggleFavorite(storyId, buttonElement) {
    try {
        const isFavorited = buttonElement.classList.contains('favorited');
        const starIcon = buttonElement.querySelector('.star-icon');
        const countElement = buttonElement.querySelector('.favorite-count');
        
        // Show loading state
        starIcon.textContent = '⭐';
        buttonElement.disabled = true;
        
        if (isFavorited) {
            // Remove from favorites
            const response = await fetch(`${API_URL}/favorites/${storyId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                buttonElement.classList.remove('favorited');
                starIcon.textContent = '☆';
                countElement.textContent = result.total_favorites;
                buttonElement.title = 'Add to favorites';
                showJoinMessage('Removed from favorites', 'success');
            } else {
                throw new Error('Failed to remove from favorites');
            }
        } else {
            // Add to favorites
            const response = await fetch(`${API_URL}/favorites/${storyId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                buttonElement.classList.add('favorited');
                starIcon.textContent = '★';
                countElement.textContent = result.total_favorites;
                buttonElement.title = 'Remove from favorites';
                showJoinMessage('Added to favorites', 'success');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add to favorites');
            }
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        showJoinMessage(error.message, 'error');
        
        // Reset button state on error
        const isFavorited = buttonElement.classList.contains('favorited');
        const starIcon = buttonElement.querySelector('.star-icon');
        starIcon.textContent = isFavorited ? '★' : '☆';
    } finally {
        buttonElement.disabled = false;
    }
}

// Load favorite status for stories
async function loadFavoriteStatus(stories) {
    if (!currentUser || stories.length === 0) return stories;
    
    try {
        // Get user's favorites
        const favoritesResponse = await fetch(`${API_URL}/favorites`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (favoritesResponse.ok) {
            const userFavorites = await favoritesResponse.json();
            const favoriteIds = new Set(userFavorites.map(fav => fav.id));
            
            // Mark stories as favorited
            stories.forEach(story => {
                story.is_favorited = favoriteIds.has(story.id);
            });
        }
        
        // Get favorite counts for all stories
        const popularResponse = await fetch(`${API_URL}/favorites/popular?limit=1000`);
        if (popularResponse.ok) {
            const popularStories = await popularResponse.json();
            const favoriteCounts = {};
            popularStories.forEach(story => {
                favoriteCounts[story.id] = story.favorite_count;
            });
            
            stories.forEach(story => {
                story.favorite_count = favoriteCounts[story.id] || 0;
            });
        }
    } catch (error) {
        console.error('Error loading favorite status:', error);
    }
    
    return stories;
}