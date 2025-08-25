// API base URL - uses window.window.API_URL from config.js
// const window.API_URL is now provided by config.js

// Global variables for class validation
let classValidationTimeout = null;
let isValidatingClass = false;
let currentClassInfo = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
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
    
    // Setup class code input with real-time validation
    const classCodeInput = document.getElementById('classCode');
    if (classCodeInput) {
        classCodeInput.addEventListener('input', handleClassCodeInput);
        classCodeInput.addEventListener('blur', handleClassCodeBlur);
    }
}

function handleClassCodeInput(e) {
    // Format input to uppercase alphanumeric only
    const cleanValue = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    e.target.value = cleanValue;
    
    // Clear previous timeout
    if (classValidationTimeout) {
        clearTimeout(classValidationTimeout);
    }
    
    // Hide class info if code is not complete
    if (cleanValue.length !== 4) {
        hideClassInfo();
        clearClassCodeStatus();
        currentClassInfo = null;
        return;
    }
    
    // Show loading state
    showClassCodeLoading();
    
    // Debounce validation (500ms delay)
    classValidationTimeout = setTimeout(() => {
        validateClassCode(cleanValue);
    }, 500);
}

function handleClassCodeBlur(e) {
    const cleanValue = e.target.value;
    if (cleanValue.length > 0 && cleanValue.length !== 4) {
        showClassCodeError('Class code must be exactly 4 characters');
    }
}

async function validateClassCode(code) {
    if (isValidatingClass) return;
    
    isValidatingClass = true;
    
    try {
        const response = await fetch(`${window.API_URL}/classes/lookup/${code}`);
        const data = await response.json();
        
        if (response.ok) {
            // Valid class code
            currentClassInfo = data;
            showClassCodeSuccess();
            displayClassInfo(data);
        } else {
            // Invalid class code
            currentClassInfo = null;
            showClassCodeError(data.error || 'Invalid class code');
            hideClassInfo();
        }
    } catch (error) {
        console.error('Error validating class code:', error);
        currentClassInfo = null;
        showClassCodeError('Unable to validate class code. Please check your internet connection.');
        hideClassInfo();
    } finally {
        isValidatingClass = false;
    }
}

function showClassCodeLoading() {
    const status = document.getElementById('classCodeStatus');
    status.innerHTML = '<div class="loading-spinner"></div>';
    status.className = 'class-code-status loading';
}

function showClassCodeSuccess() {
    const status = document.getElementById('classCodeStatus');
    status.innerHTML = '✅';
    status.className = 'class-code-status success';
}

function showClassCodeError(message) {
    const status = document.getElementById('classCodeStatus');
    status.innerHTML = '❌';
    status.className = 'class-code-status error';
    status.title = message;
}

function clearClassCodeStatus() {
    const status = document.getElementById('classCodeStatus');
    status.innerHTML = '';
    status.className = 'class-code-status';
    status.title = '';
}

function displayClassInfo(classInfo) {
    const display = document.getElementById('classInfoDisplay');
    const nameEl = document.getElementById('classInfoName');
    const teacherEl = document.getElementById('classInfoTeacher');
    const schoolEl = document.getElementById('classInfoSchool');
    const subjectEl = document.getElementById('classInfoSubject');
    
    // Update content
    nameEl.textContent = `📚 ${classInfo.class_name}`;
    teacherEl.textContent = classInfo.teacher_name;
    schoolEl.textContent = classInfo.school_name;
    
    // Show subject if available
    if (classInfo.subject) {
        subjectEl.querySelector('span').textContent = classInfo.subject;
        subjectEl.style.display = 'block';
    } else {
        subjectEl.style.display = 'none';
    }
    
    // Show the display with animation
    display.style.display = 'block';
    setTimeout(() => {
        display.classList.add('show');
    }, 10);
}

function hideClassInfo() {
    const display = document.getElementById('classInfoDisplay');
    display.classList.remove('show');
    setTimeout(() => {
        display.style.display = 'none';
    }, 300);
}

// School dropdown functionality removed - no longer needed
// Class information is now displayed dynamically via class code lookup

async function handleRegistration(e) {
    e.preventDefault();
    
    // Get form values with new field structure
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const studentId = document.getElementById('studentId').value.trim();
    const classCode = document.getElementById('classCode').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Create full name from first and last name
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Validate required fields
    if (!firstName || !lastName) {
        showError('Please enter both first and last name');
        return;
    }
    
    // Validate passwords match
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    // Validate class code
    if (classCode.length !== 4) {
        showError('Class code must be exactly 4 characters');
        return;
    }
    
    // Validate that class code has been verified
    if (!currentClassInfo) {
        showError('Please enter a valid class code and wait for verification');
        return;
    }
    
    try {
        // Show loading state
        const submitButton = document.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Creating Account...';
        submitButton.disabled = true;
        
        // Step 1: Register the student account using dedicated student endpoint
        // Note: Generate a username from email prefix for backend compatibility
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const registerResponse = await fetch(`${window.API_URL}/students/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                email,
                password,
                name: fullName,
                student_id: studentId || null,
                school_id: null // No longer collecting school from form
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
        submitButton.textContent = `Joining ${currentClassInfo.class_name}...`;
        
        // Step 2: Join the class using the code
        const joinResponse = await fetch(`${window.API_URL}/classes/join`, {
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
            showError(`Account created but couldn't join class: ${joinResult.error}. You can join the class later from your dashboard.`);
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 5000);
            return;
        }
        
        // Success - show message and redirect
        submitButton.textContent = 'Success! Redirecting...';
        showSuccess(`Welcome ${firstName}! You've successfully joined ${currentClassInfo.class_name}. Redirecting to your dashboard...`);
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