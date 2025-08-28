document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('resetPasswordForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const loadingMessage = document.getElementById('loading-message');
    const expiredToken = document.getElementById('expired-token');
    const teacherWelcome = document.getElementById('teacher-welcome');
    const infoMessage = document.getElementById('info-message');
    const pageSubtitle = document.getElementById('page-subtitle');
    const submitButton = document.getElementById('submit-button');
    
    // Get token from URL and detect flow type
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const invitation = urlParams.get('invitation'); // Check for teacher invitation
    
    let isTeacherInvitation = false;
    
    if (!token) {
        showExpiredToken('Invalid reset link. Please request a new password reset.');
        return;
    }
    
    // Show loading while verifying token
    loadingMessage.style.display = 'block';
    
    // Verify token on page load
    verifyToken(token);
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();
        
        // Clear previous messages
        clearMessages();
        
        // Validate passwords
        if (password.length < 6) {
            showError('Password must be at least 6 characters long');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }
        
        try {
            const response = await fetch('/api/password-reset/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showSuccess('Password has been reset successfully! Redirecting to login...');
                form.style.display = 'none';
                
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 3000);
            } else {
                showError(data.error || 'Failed to reset password');
            }
        } catch (error) {
            console.error('Password reset error:', error);
            showError('An error occurred. Please try again.');
        }
    });
    
    async function verifyToken(token) {
        try {
            const response = await fetch(`/api/password-reset/verify/${token}`);
            const data = await response.json();
            
            loadingMessage.style.display = 'none';
            
            if (!response.ok) {
                showExpiredToken(data.error || 'Invalid or expired reset link');
                return;
            }
            
            // Check if this is a teacher invitation based on user role and context
            isTeacherInvitation = data.role === 'teacher' && data.username && data.username.includes('_temp');
            
            // Customize UI based on flow type
            if (isTeacherInvitation) {
                pageSubtitle.textContent = 'Set Your Password';
                teacherWelcome.style.display = 'block';
                submitButton.textContent = 'Set Password & Activate Account';
                document.getElementById('info-text').textContent = `Welcome ${data.name || data.email}! Set your password to complete your account setup.`;
            } else {
                pageSubtitle.textContent = 'Reset Your Password';
                document.getElementById('info-text').textContent = `Resetting password for: ${data.email}`;
                submitButton.textContent = 'Update Password';
            }
            
            // Show the form
            form.style.display = 'block';
            infoMessage.style.display = 'block';
            
        } catch (error) {
            console.error('Token verification error:', error);
            loadingMessage.style.display = 'none';
            showExpiredToken('Failed to verify reset link. Please try again.');
        }
    }
    
    function showExpiredToken(message) {
        loadingMessage.style.display = 'none';
        form.style.display = 'none';
        infoMessage.style.display = 'none';
        teacherWelcome.style.display = 'none';
        expiredToken.style.display = 'block';
        expiredToken.querySelector('p').textContent = message;
        
        // Customize instruction based on context
        const instruction = isTeacherInvitation 
            ? 'Please contact your administrator for a new invitation.'
            : 'Please request a new password reset.';
        document.getElementById('expired-instruction').textContent = instruction;
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }
    
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }
    
    function clearMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        errorMessage.textContent = '';
        successMessage.textContent = '';
    }
    
    // Real-time password validation with visual feedback
    passwordInput.addEventListener('input', validatePasswordRequirements);
    confirmPasswordInput.addEventListener('input', function() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword && password !== confirmPassword) {
            confirmPasswordInput.setCustomValidity('Passwords do not match');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    });
    
    function validatePasswordRequirements() {
        const password = passwordInput.value;
        
        // Check length requirement
        const hasLength = password.length >= 6;
        updateRequirement('req-length', hasLength);
    }
    
    function updateRequirement(id, met) {
        const element = document.getElementById(id);
        if (element) {
            if (met) {
                element.classList.add('met');
            } else {
                element.classList.remove('met');
            }
        }
    }
});