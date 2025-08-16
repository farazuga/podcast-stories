document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('resetPasswordForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
        showError('Invalid reset link. Please request a new password reset.');
        form.style.display = 'none';
        return;
    }
    
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
            
            if (!response.ok) {
                showError(data.error || 'Invalid or expired reset link');
                form.style.display = 'none';
                return;
            }
            
            // Show user info if available
            if (data.email) {
                const infoMessage = document.querySelector('.info-message p');
                infoMessage.textContent = `Resetting password for: ${data.email}`;
            }
        } catch (error) {
            console.error('Token verification error:', error);
            showError('Failed to verify reset link. Please try again.');
            form.style.display = 'none';
        }
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
    
    // Real-time password validation
    confirmPasswordInput.addEventListener('input', function() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword && password !== confirmPassword) {
            confirmPasswordInput.setCustomValidity('Passwords do not match');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    });
});