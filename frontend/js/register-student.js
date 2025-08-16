// API base URL
const API_URL = 'https://podcast-stories-production.up.railway.app/api';

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
    
    // Format class code input to uppercase
    const classCodeInput = document.getElementById('classCode');
    if (classCodeInput) {
        classCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });
    }
}

async function handleRegistration(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const studentId = document.getElementById('studentId').value.trim();
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
        // Step 1: Register the student account
        const registerResponse = await fetch(`${API_URL}/auth/register`, {
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
                role: 'student'
            })
        });
        
        const registerResult = await registerResponse.json();
        
        if (!registerResponse.ok) {
            showError(registerResult.error || 'Registration failed');
            return;
        }
        
        // Step 2: Login to get token
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const loginResult = await loginResponse.json();
        
        if (!loginResponse.ok) {
            showError('Account created but login failed. Please sign in manually.');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 3000);
            return;
        }
        
        // Store token and user info
        localStorage.setItem('token', loginResult.token);
        localStorage.setItem('user', JSON.stringify(loginResult.user));
        
        // Step 3: Join the class using the code
        const joinResponse = await fetch(`${API_URL}/classes/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginResult.token}`
            },
            body: JSON.stringify({ class_code: classCode })
        });
        
        const joinResult = await joinResponse.json();
        
        if (!joinResponse.ok) {
            // Registration successful but class join failed
            showError(`Registration successful but couldn't join class: ${joinResult.error}. You can join the class later from your dashboard.`);
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 5000);
            return;
        }
        
        // Success - show message and redirect
        showSuccess(`Registration successful! You've been enrolled in ${joinResult.class_name}. Redirecting...`);
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Registration error:', error);
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