// Add Story functionality
// Uses window.API_URL from auth.js

// Global variables
let isEditMode = false;
let editStoryId = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Add Story page loading...');
    
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }
    
    // Check if we're in edit mode
    const urlParams = new URLSearchParams(window.location.search);
    editStoryId = urlParams.get('edit');
    isEditMode = !!editStoryId;
    
    if (isEditMode) {
        console.log('Edit mode detected for story ID:', editStoryId);
        // Update page title and heading
        document.title = 'VidPOD - Edit Story';
        const formHeader = document.querySelector('.form-header h2');
        if (formHeader) {
            formHeader.textContent = 'Edit Story Idea';
        }
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Update Story Idea';
        }
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
    
    // Load story data if in edit mode
    if (isEditMode) {
        await loadStoryForEdit();
    }
    
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

// Load story data for editing
async function loadStoryForEdit() {
    console.log('Loading story for edit mode...');
    try {
        const response = await fetch(`${window.API_URL}/stories/${editStoryId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const story = await response.json();
            console.log('Loaded story data:', story);
            populateFormWithStoryData(story);
        } else {
            console.error('Failed to load story:', response.status);
            showError('Failed to load story data. Please try again.');
            // Redirect back to dashboard on error
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 3000);
        }
    } catch (error) {
        console.error('Error loading story:', error);
        showError('Network error loading story data.');
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 3000);
    }
}

// Populate form with existing story data
function populateFormWithStoryData(story) {
    console.log('Populating form with story data...');
    
    // Basic information
    document.getElementById('idea_title').value = story.idea_title || '';
    document.getElementById('idea_description').value = story.idea_description || '';
    document.getElementById('coverage_start_date').value = story.coverage_start_date ? story.coverage_start_date.split('T')[0] : '';
    document.getElementById('coverage_end_date').value = story.coverage_end_date ? story.coverage_end_date.split('T')[0] : '';
    
    // Questions
    document.getElementById('question_1').value = story.question_1 || '';
    document.getElementById('question_2').value = story.question_2 || '';
    document.getElementById('question_3').value = story.question_3 || '';
    document.getElementById('question_4').value = story.question_4 || '';
    document.getElementById('question_5').value = story.question_5 || '';
    document.getElementById('question_6').value = story.question_6 || '';
    
    // Select tags
    if (story.tags && story.tags.length > 0) {
        const tagsSelect = document.getElementById('tags');
        if (tagsSelect) {
            // Clear any existing selections
            Array.from(tagsSelect.options).forEach(option => option.selected = false);
            
            // Select the story's tags
            story.tags.forEach(tag => {
                Array.from(tagsSelect.options).forEach(option => {
                    if (option.value === tag) {
                        option.selected = true;
                    }
                });
            });
        }
    }
    
    // Populate interviewees if we have them
    if (story.interviewees && story.interviewees.length > 0) {
        story.interviewees.forEach(interviewee => {
            addIntervieweeToList(interviewee);
        });
    }
    
    console.log('Form populated successfully');
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
        
        // Get interviewees from the list
        const intervieweeItems = document.querySelectorAll('.interviewee-item');
        if (intervieweeItems.length > 0) {
            formData.interviewees = Array.from(intervieweeItems).map(item => 
                item.textContent.replace('×', '').trim()
            );
        }
        
        // Submit to API
        await saveStory(formData);
    });
}

// Save story to API
async function saveStory(storyData) {
    const actionText = isEditMode ? 'Updating' : 'Saving';
    const successText = isEditMode ? 'Story updated successfully!' : 'Story saved successfully!';
    console.log(`${actionText} story...`, storyData);
    
    // Show loading state
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = `${actionText}...`;
    }
    
    try {
        const url = isEditMode ? `${window.API_URL}/stories/${editStoryId}` : `${window.API_URL}/stories`;
        const method = isEditMode ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(storyData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log(`Story ${isEditMode ? 'updated' : 'saved'} successfully:`, result);
            showSuccess(successText);
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2000);
        } else {
            const error = await response.json();
            console.error(`Failed to ${isEditMode ? 'update' : 'save'} story:`, error);
            showError(error.message || `Failed to ${isEditMode ? 'update' : 'save'} story. Please try again.`);
            
            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = isEditMode ? 'Update Story Idea' : 'Save Story Idea';
            }
        }
    } catch (error) {
        console.error(`Error ${isEditMode ? 'updating' : 'saving'} story:`, error);
        showError('Network error. Please check your connection and try again.');
        
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = isEditMode ? 'Update Story Idea' : 'Save Story Idea';
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

// Interviewee management functions
function addInterviewee() {
    const newIntervieweeInput = document.getElementById('newInterviewee');
    if (!newIntervieweeInput) return;
    
    const intervieweeName = newIntervieweeInput.value.trim();
    if (!intervieweeName) {
        showError('Please enter a person or role to interview');
        return;
    }
    
    // Check if already exists
    const existingItems = document.querySelectorAll('.interviewee-item');
    const exists = Array.from(existingItems).some(item => 
        item.textContent.replace('×', '').trim().toLowerCase() === intervieweeName.toLowerCase()
    );
    
    if (exists) {
        showError('This person/role is already in the list');
        return;
    }
    
    addIntervieweeToList(intervieweeName);
    newIntervieweeInput.value = '';
}

function addIntervieweeToList(intervieweeName) {
    const intervieweeList = document.getElementById('intervieweeList');
    if (!intervieweeList) return;
    
    const intervieweeItem = document.createElement('div');
    intervieweeItem.className = 'interviewee-item';
    intervieweeItem.innerHTML = `
        ${intervieweeName}
        <button type="button" class="remove-btn" onclick="removeInterviewee(this)">×</button>
    `;
    
    intervieweeList.appendChild(intervieweeItem);
}

function removeInterviewee(button) {
    button.parentElement.remove();
}

// Handle Enter key in interviewee input
document.addEventListener('DOMContentLoaded', () => {
    const newIntervieweeInput = document.getElementById('newInterviewee');
    if (newIntervieweeInput) {
        newIntervieweeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addInterviewee();
            }
        });
    }
});

// Make functions available globally
window.addInterviewee = addInterviewee;
window.removeInterviewee = removeInterviewee;

// Make logout available globally
window.logout = function() {
    localStorage.clear();
    window.location.href = '/index.html';
};