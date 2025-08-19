// Add Story functionality
// Uses window.API_URL from auth.js

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Add Story page loading...');
    
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }
    
    // Load user info
    const user = localStorage.getItem('user');
    if (user) {
        const userData = JSON.parse(user);
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.textContent = userData.name || userData.username || userData.email;
        }
    }
    
    // Load tags
    await loadTags();
    
    // Setup form submission
    setupFormHandler();
});

// Load tags from API
async function loadTags() {
    console.log('Loading tags...');
    try {
        const response = await fetch(`${window.API_URL}/tags`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const tags = await response.json();
            console.log(`Loaded ${tags.length} tags`);
            populateTagsSelect(tags);
        } else {
            console.error('Failed to load tags:', response.status);
            showError('Failed to load tags. Please refresh the page.');
        }
    } catch (error) {
        console.error('Error loading tags:', error);
        showError('Network error loading tags.');
    }
}

// Populate tags select element
function populateTagsSelect(tags) {
    const tagsSelect = document.getElementById('tags');
    if (!tagsSelect) {
        console.error('Tags select element not found');
        return;
    }
    
    // Clear existing options
    tagsSelect.innerHTML = '';
    
    // Add tags as options
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag.tag_name;  // Use tag_name as value
        option.textContent = tag.tag_name;
        tagsSelect.appendChild(option);
    });
    
    console.log(`Populated ${tags.length} tags in select`);
}

// Setup form submission handler
function setupFormHandler() {
    const form = document.getElementById('storyForm');
    if (!form) {
        console.error('Story form not found');
        return;
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Form submitted');
        
        // Collect form data
        const formData = {
            idea_title: document.getElementById('idea_title').value,
            idea_description: document.getElementById('idea_description').value,
            coverage_start_date: document.getElementById('coverage_start_date').value,
            coverage_end_date: document.getElementById('coverage_end_date').value,
            question_1: document.getElementById('question_1')?.value || '',
            question_2: document.getElementById('question_2')?.value || '',
            question_3: document.getElementById('question_3')?.value || '',
            question_4: document.getElementById('question_4')?.value || '',
            question_5: document.getElementById('question_5')?.value || '',
            question_6: document.getElementById('question_6')?.value || ''
        };
        
        // Get selected tags
        const tagsSelect = document.getElementById('tags');
        if (tagsSelect) {
            const selectedTags = Array.from(tagsSelect.selectedOptions).map(opt => opt.value);
            formData.tags = selectedTags;
            console.log('Selected tags:', selectedTags);
        }
        
        // Get interviewees if field exists
        const intervieweesField = document.getElementById('interviewees');
        if (intervieweesField && intervieweesField.value) {
            formData.interviewees = intervieweesField.value.split(',').map(name => name.trim());
        }
        
        // Submit to API
        await saveStory(formData);
    });
}

// Save story to API
async function saveStory(storyData) {
    console.log('Saving story...', storyData);
    
    // Show loading state
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
    }
    
    try {
        const response = await fetch(`${window.API_URL}/stories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(storyData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Story saved successfully:', result);
            showSuccess('Story saved successfully!');
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2000);
        } else {
            const error = await response.json();
            console.error('Failed to save story:', error);
            showError(error.message || 'Failed to save story. Please try again.');
            
            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Story';
            }
        }
    } catch (error) {
        console.error('Error saving story:', error);
        showError('Network error. Please check your connection and try again.');
        
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Story';
        }
    }
}

// Show success message
function showSuccess(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
    alert.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alert, container.firstChild);
        setTimeout(() => alert.remove(), 5000);
    }
}

// Show error message
function showError(message) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-error';
    alert.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(alert, container.firstChild);
        setTimeout(() => alert.remove(), 5000);
    }
}

// Make logout available globally
window.logout = function() {
    localStorage.clear();
    window.location.href = '/index.html';
};