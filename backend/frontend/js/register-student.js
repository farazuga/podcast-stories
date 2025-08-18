// API_URL is declared in auth.js which loads first

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadSchools();
    
    // Check if already logged in
    if (localStorage.getItem('token')) {
        window.location.href = '/dashboard.html';
    }
});

function setupEventListeners() {
    const form = document.getElementById('studentRegisterForm');
    if (form) {
        form.addEventListener('submit', handleRegistration);
    }
    
    // Format class code input to uppercase
    const classCodeInput = document.getElementById('classCode');
    if (classCodeInput) {
        classCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    }
}

async function loadSchools() {
    try {
        const response = await fetch(`${API_URL}/students/schools`);
        
        if (response.ok) {
            const schools = await response.json();
            populateSchoolDropdown(schools);
        } else {
            console.warn('Could not load schools list');
        }
    } catch (error) {
        console.error('Error loading schools:', error);
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

async function handleRegistration(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const studentId = document.getElementById('studentId').value.trim();
    const schoolId = document.getElementById('school').value;
    const classCode = document.getElementById('classCode').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    // Validate class code length
    if (classCode.length !== 4) {
        showError('Class code must be exactly 4 characters');
        return;
    }
    
    try {
        // Show loading state
        const submitButton = document.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Registering...';
        submitButton.disabled = true;
        
        // Step 1: Register the student account using dedicated student endpoint
        const registerResponse = await fetch(`${API_URL}/students/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password,
                name,
                student_id: studentId || null,
                school_id: schoolId ? parseInt(schoolId) : null
            })
        });
        
        const registerResult = await registerResponse.json();
        
        if (!registerResponse.ok) {
            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            showError(registerResult.error || 'Registration failed');
            return;
        }
        
        // Store token and user info (new endpoint returns token directly)
        localStorage.setItem('token', registerResult.token);
        localStorage.setItem('user', JSON.stringify(registerResult.user));
        
        // Update button text for next step
        submitButton.textContent = 'Joining class...';
        
        // Step 2: Join the class using the code
        const joinResponse = await fetch(`${API_URL}/classes/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${registerResult.token}`
            },
            body: JSON.stringify({ class_code: classCode })
        });
        
        const joinResult = await joinResponse.json();
        
        if (!joinResponse.ok) {
            // Registration successful but class join failed
            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            showError(`Registration successful but couldn't join class: ${joinResult.error}. You can join the class later from your dashboard.`);
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 5000);
            return;
        }
        
        // Success - show message and redirect
        submitButton.textContent = 'Success! Redirecting...';
        showSuccess(`Registration successful! You've been enrolled in ${joinResult.class_name}. Redirecting...`);
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Registration error:', error);
        // Reset button state
        const submitButton = document.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Register';
            submitButton.disabled = false;
        }
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