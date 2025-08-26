document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forgotPasswordForm');
    const emailInput = document.getElementById('email');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        // Clear previous messages
        clearMessages();
        
        // Validate email
        if (!email) {
            showError('Please enter your email address');
            return;
        }
        
        if (!isValidEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }
        
        // Disable form during submission
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        
        try {
            const response = await fetch('/api/password-reset/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showSuccess(data.message);
                form.style.display = 'none';
                
                // Show additional instructions
                const additionalInfo = document.createElement('div');
                additionalInfo.className = 'info-message';
                additionalInfo.innerHTML = `
                    <p><strong>What's next?</strong></p>
                    <ul style="text-align: left; margin: 10px 0;">
                        <li>Check your email inbox (and spam folder)</li>
                        <li>Click the reset link in the email</li>
                        <li>Set your new password</li>
                        <li>The link expires in 1 hour for security</li>
                    </ul>
                `;
                successMessage.appendChild(additionalInfo);
            } else {
                showError(data.error || 'Failed to send reset email');
            }
        } catch (error) {
            console.error('Password reset request error:', error);
            showError('An error occurred. Please try again.');
        } finally {
            // Re-enable form
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
    }
    
    function showSuccess(message) {
        successMessage.innerHTML = `<p>${message}</p>`;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }
    
    function clearMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        errorMessage.textContent = '';
        successMessage.innerHTML = '';
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // Add real-time email validation
    emailInput.addEventListener('input', function() {
        const email = emailInput.value.trim();
        if (email && !isValidEmail(email)) {
            emailInput.setCustomValidity('Please enter a valid email address');
        } else {
            emailInput.setCustomValidity('');
        }
    });
});