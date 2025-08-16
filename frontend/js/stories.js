// API base URL
const API_URL = 'https://podcast-stories-production.up.railway.app/api';

// Global variables
let currentUser = null;
let allTags = [];
let interviewees = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    
    await loadUserInfo();
    await loadTags();
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
    const tagsSelect = document.getElementById('tags');
    if (!tagsSelect) return;
    
    tagsSelect.innerHTML = '';
    
    allTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.tag_name;
        option.textContent = tag.tag_name;
        tagsSelect.appendChild(option);
    });
}

function setupEventListeners() {
    // Story form submission
    const storyForm = document.getElementById('storyForm');
    if (storyForm) {
        storyForm.addEventListener('submit', handleStorySubmit);
    }
    
    // Enter key for adding interviewees
    const newIntervieweeInput = document.getElementById('newInterviewee');
    if (newIntervieweeInput) {
        newIntervieweeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addInterviewee();
            }
        });
    }
}

function addInterviewee() {
    const input = document.getElementById('newInterviewee');
    const name = input.value.trim();
    
    if (name && !interviewees.includes(name)) {
        interviewees.push(name);
        input.value = '';
        updateIntervieweeDisplay();
    }
}

function removeInterviewee(name) {
    interviewees = interviewees.filter(person => person !== name);
    updateIntervieweeDisplay();
}

function updateIntervieweeDisplay() {
    const list = document.getElementById('intervieweeList');
    if (!list) return;
    
    list.innerHTML = interviewees.map(person => `
        <span class="interviewee-tag">
            ${person}
            <button type="button" class="remove-btn" onclick="removeInterviewee('${person}')">×</button>
        </span>
    `).join('');
}

async function handleStorySubmit(e) {
    e.preventDefault();
    
    const formData = {
        idea_title: document.getElementById('idea_title').value,
        idea_description: document.getElementById('idea_description').value,
        question_1: document.getElementById('question_1').value,
        question_2: document.getElementById('question_2').value,
        question_3: document.getElementById('question_3').value,
        question_4: document.getElementById('question_4').value,
        question_5: document.getElementById('question_5').value,
        question_6: document.getElementById('question_6').value,
        coverage_start_date: document.getElementById('coverage_start_date').value,
        coverage_end_date: document.getElementById('coverage_end_date').value,
        tags: Array.from(document.getElementById('tags').selectedOptions).map(option => option.value),
        interviewees: interviewees
    };
    
    try {
        const response = await fetch(`${API_URL}/stories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess('Story created successfully!');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } else {
            showError(result.error || 'Failed to create story');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

// Utility functions
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