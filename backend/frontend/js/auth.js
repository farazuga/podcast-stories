// API base URL - change this to your backend URL
const API_URL = 'https://podcast-stories-production.up.railway.app/api';

// Debug logging
console.log('Auth.js loaded, current path:', window.location.pathname);
console.log('Existing token:', localStorage.getItem('token'));

// Check if user is already logged in - only redirect if token is valid
if (localStorage.getItem('token') && (window.location.pathname === '/' || window.location.pathname.includes('index.html'))) {
    // Verify token before redirecting
    fetch(`${API_URL}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(response => {
        if (response.ok) {
            console.log('Valid token found, redirecting to dashboard');
            window.location.href = '/dashboard.html';
        } else {
            console.log('Invalid token found, clearing storage');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    }).catch(error => {
        console.log('Token verification failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    });
}

// Login Form Handler - Updated for email-based authentication
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        console.log('Login attempt starting...');
        console.log('API URL:', `${API_URL}/auth/login`);
        console.log('Attempting login for:', email);
        
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            console.log('Response:', response.status, data);
            
            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirect based on user role
                redirectBasedOnRole(data.user);
            } else {
                showError(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Network error. Please try again. Check console for details.');
        }
    });
}

// Register Form Handler
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const school = document.getElementById('school').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, school, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showSuccess('Registration successful! Redirecting to login...');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 2000);
            } else {
                showError(data.error || 'Registration failed');
            }
        } catch (error) {
            showError('Network error. Please try again.');
        }
    });
}

// Utility functions
function showError(message) {
    console.error('Login error:', message); // Add console logging
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.style.color = '#c00';
        errorDiv.style.background = '#fee';
        errorDiv.style.padding = '10px';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.border = '1px solid #fcc';
        errorDiv.style.marginBottom = '1rem';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert('Error: ' + message); // Fallback if div doesn't exist
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

// Role-based redirect function
function redirectBasedOnRole(user) {
    console.log('Redirecting user based on role:', user.role);
    
    switch(user.role) {
        case 'amitrace_admin':
            window.location.href = '/admin.html';
            break;
        case 'teacher':
            window.location.href = '/teacher-dashboard.html';
            break;
        case 'student':
        default:
            window.location.href = '/dashboard.html';
            break;
    }
}

// Logout function (used on other pages)
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}