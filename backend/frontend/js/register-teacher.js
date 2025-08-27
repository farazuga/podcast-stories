// API base URL - uses window.window.API_URL from config.js
// const window.API_URL is now provided by config.js

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadSchools();
    setupEventListeners();
    
    // Check if already logged in
    if (localStorage.getItem('token')) {
        window.location.href = '/dashboard.html';
    }
});

async function loadSchools() {
    try {
        // Use the public schools endpoint for registration forms
        const response = await fetch(`${window.API_URL}/schools/public`);
        
        if (response.ok) {
            const schools = await response.json();
            populateSchoolDropdown(schools);
        } else {
            // If we can't fetch schools, provide a default list
            populateSchoolDropdown([
                { id: 1, school_name: 'Podcast Central HS' }
            ]);
        }
    } catch (error) {
        console.error('Error loading schools:', error);
        // Provide default option
        populateSchoolDropdown([
            { id: 1, school_name: 'Podcast Central HS' }
        ]);
    }
}

function populateSchoolDropdown(schools) {
    const schoolSelect = document.getElementById('school');
    if (!schoolSelect) return;
    
    // Clear existing options except the first
    schoolSelect.innerHTML = '<option value="">Select your school</option>';
    
    // Add school options
    schools.forEach(school => {
        const option = document.createElement('option');
        option.value = school.id;
        option.textContent = school.school_name;
        schoolSelect.appendChild(option);
    });
}

function setupEventListeners() {
    const form = document.getElementById('teacherRequestForm');
    if (form) {
        form.addEventListener('submit', handleTeacherRequest);
    }
}

async function handleTeacherRequest(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const schoolId = document.getElementById('school').value;
    const message = document.getElementById('message').value.trim();
    
    if (!firstName || !lastName || !email || !schoolId) {
        showError('Please fill in all required fields');
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/teacher-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                name: firstName + ' ' + lastName, // Keep for backward compatibility
                email,
                school_id: parseInt(schoolId),
                message: message || null
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Hide the form and show success box
            document.getElementById('requestForm').style.display = 'none';
            document.getElementById('successBox').style.display = 'block';
        } else {
            showError(result.error || 'Failed to submit request');
        }
    } catch (error) {
        console.error('Request error:', error);
        showError('Network error. Please try again.');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.style.color = '#c00';
        errorDiv.style.background = '#fee';
        errorDiv.style.padding = '10px';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.border = '1px solid #fcc';
        errorDiv.style.marginTop = '1rem';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 7000);
    }
}

function returnToHomepage() {
    window.location.href = 'index.html';
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        successDiv.style.color = '#0a0';
        successDiv.style.background = '#efe';
        successDiv.style.padding = '10px';
        successDiv.style.borderRadius = '5px';
        successDiv.style.border = '1px solid #cfc';
        successDiv.style.marginTop = '1rem';
    }
}