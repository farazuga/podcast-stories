// Use global API_URL from auth.js with fallback
window.API_URL = window.API_URL || 'https://podcast-stories-production.up.railway.app/api';
// Use window.API_URL directly - no const redeclaration

// Global variables
let currentUser = null;
let myClasses = [];
let currentClassId = null;
let currentClassData = null;

// Initialize page - ONLY on teacher dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Only run on teacher dashboard page
    if (!window.location.pathname.includes('teacher-dashboard')) {
        return;
    }
    
    if (!checkAuth()) return;
    
    await loadUserInfo();
    await loadClasses();
    await loadStatistics();
    setupEventListeners();
});

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
        window.location.href = '/index.html';
        return false;
    }
    
    // Check if token is expired
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (payload.exp && currentTime >= payload.exp) {
            console.log('Token expired, redirecting to login');
            localStorage.clear();
            window.location.href = '/index.html';
            return false;
        }
    } catch (error) {
        console.error('Invalid token format:', error);
        localStorage.clear();
        window.location.href = '/index.html';
        return false;
    }
    
    // Check if user is a teacher
    if (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'amitrace_admin') {
        window.location.href = '/dashboard.html';
        return false;
    }
    
    return true;
}

async function makeAuthenticatedRequest(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No authentication token');
    }
    
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(url, finalOptions);
        
        // Handle token expiration
        if (response.status === 401) {
            console.log('Authentication failed, clearing token and redirecting');
            localStorage.clear();
            window.location.href = '/index.html';
            throw new Error('Authentication failed');
        }
        
        return response;
    } catch (error) {
        console.error('Authenticated request failed:', error);
        throw error;
    }
}

// Helper function to extract first name from user data
function getFirstName(user) {
    // Use first_name if available from database
    if (user.first_name) {
        return user.first_name;
    }
    
    // Extract first name from full name field
    if (user.name) {
        return user.name.split(' ')[0];
    }
    
    // Fallback to email prefix or 'User'
    if (user.email) {
        return user.email.split('@')[0];
    }
    
    return 'User';
}

async function loadUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        currentUser = user;
        
        const firstName = getFirstName(user);
        const fullDisplayName = user.name || user.email;
        
        // Only update DOM elements if they exist (teacher dashboard specific)
        const userInfoElement = document.getElementById('userInfo');
        const teacherNameElement = document.getElementById('teacherName');
        const schoolNameElement = document.getElementById('schoolName');
        
        if (userInfoElement) {
            userInfoElement.textContent = fullDisplayName;
        }
        
        if (teacherNameElement) {
            teacherNameElement.textContent = firstName;
        }
        
        // If user has a school, display it
        if (user.school && schoolNameElement) {
            schoolNameElement.textContent = user.school;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

async function loadClasses() {
    try {
        const response = await makeAuthenticatedRequest(`${window.API_URL}/classes`);
        
        if (response.ok) {
            myClasses = await response.json();
            displayClasses();
            updateStatistics();
        } else {
            showError('Failed to load classes');
        }
    } catch (error) {
        console.error('Error loading classes:', error);
        showError('Network error. Please try again.');
    }
}

function displayClasses() {
    const classesGrid = document.getElementById('classesGrid');
    
    if (myClasses.length === 0) {
        classesGrid.innerHTML = `
            <div class="empty-state">
                <h3>No Classes Yet</h3>
                <p>Create your first class using the form above!</p>
            </div>
        `;
        return;
    }
    
    classesGrid.innerHTML = myClasses.map(classItem => `
        <div class="class-card-new" data-class-id="${classItem.id}">
            <div class="class-card-header">
                <h2 class="class-title">${classItem.class_name}</h2>
                <div class="class-code-pill" onclick="copyCode('${classItem.class_code}')" title="Click to copy class code">Code: ${classItem.class_code}</div>
                <button class="expand-btn" onclick="toggleClassDetails(${classItem.id})" title="Show/hide student details">
                    📂 Show Students
                </button>
            </div>
            
            <div class="class-info-grid">
                ${classItem.subject ? `
                <div class="info-row">
                    <span class="info-label">Subject:</span>
                    <span class="info-value">${classItem.subject}</span>
                </div>
                ` : ''}
                
                <div class="info-row">
                    <span class="info-label">Teacher:</span>
                    <span class="info-value">${currentUser ? (currentUser.name || currentUser.email) : 'You'}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">School:</span>
                    <span class="info-value">${classItem.school_name || 'VidPOD Default School'}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Students:</span>
                    <span class="info-value">${classItem.student_count || 0}</span>
                </div>
                
                <div class="info-row">
                    <span class="info-label">Joined:</span>
                    <span class="info-value">${formatDate(classItem.created_at)}</span>
                </div>
            </div>
            
            ${classItem.description ? `
            <div class="class-description-new">
                <strong>Description:</strong><br>
                ${classItem.description}
            </div>
            ` : ''}
            
            <div class="students-list" style="display: none;" id="students-list-${classItem.id}">
                <div class="students-loading">Loading student details...</div>
            </div>
            
            <div class="class-actions-new">
                <button class="btn-leave" onclick="viewClassDetails(${classItem.id})">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

async function loadStatistics() {
    // Update total classes
    const activeClasses = myClasses.filter(c => c.is_active !== false);
    document.getElementById('totalClasses').textContent = activeClasses.length;
    
    // Calculate total students with debugging
    const totalStudents = myClasses.reduce((sum, classItem) => {
        const studentCount = parseInt(classItem.student_count) || 0;
        console.log(`Class "${classItem.class_name}" has ${studentCount} students`);
        return sum + studentCount;
    }, 0);
    
    console.log(`Total students across all classes: ${totalStudents}`);
    document.getElementById('totalStudents').textContent = totalStudents;
}

function updateStatistics() {
    loadStatistics();
}

async function createClass(e) {
    e.preventDefault();
    console.log('Create class form submitted');
    
    const className = document.getElementById('className').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const description = document.getElementById('description').value.trim();
    
    console.log('Form data:', { className, subject, description });
    
    if (!className) {
        console.log('Class name is empty, showing error');
        showError('Class name is required');
        return;
    }
    
    try {
        console.log('Making API request to create class...');
        const response = await makeAuthenticatedRequest(`${window.API_URL}/classes`, {
            method: 'POST',
            body: JSON.stringify({
                class_name: className,
                subject: subject || null,
                description: description || null
            })
        });
        
        console.log('API response status:', response.status);
        const result = await response.json();
        console.log('API response data:', result);
        
        if (response.ok) {
            console.log('Class created successfully');
            
            // Show enhanced success alert
            showNewClassAlert(result.class_name, result.class_code);
            
            // Clear form
            document.getElementById('createClassForm').reset();
            
            // Reload classes
            await loadClasses();
        } else {
            console.log('Class creation failed:', result);
            showError(result.error || 'Failed to create class');
        }
    } catch (error) {
        console.error('Error creating class:', error);
        showError('Network error. Please try again.');
    }
}

async function viewClassDetails(classId) {
    currentClassId = classId;
    
    try {
        const response = await makeAuthenticatedRequest(`${window.API_URL}/classes/${classId}`);
        
        if (response.ok) {
            currentClassData = await response.json();
            displayClassModal();
        } else {
            showError('Failed to load class details');
        }
    } catch (error) {
        console.error('Error loading class details:', error);
        showError('Network error. Please try again.');
    }
}

function displayClassModal() {
    const modal = document.getElementById('classModal');
    
    // Update modal content
    document.getElementById('modalClassName').textContent = currentClassData.class_name;
    document.getElementById('classCode').textContent = currentClassData.class_code;
    document.getElementById('modalSubject').textContent = currentClassData.subject || 'Not specified';
    document.getElementById('modalDescription').textContent = currentClassData.description || 'No description';
    document.getElementById('modalStatus').innerHTML = currentClassData.is_active ? 
        '<span class="status-badge status-approved">Active</span>' : 
        '<span class="status-badge status-rejected">Inactive</span>';
    document.getElementById('modalCreated').textContent = formatDate(currentClassData.created_at);
    
    // Display students
    const students = currentClassData.students || [];
    document.getElementById('studentCount').textContent = students.length;
    
    const studentsTable = document.getElementById('studentsTable');
    if (students.length === 0) {
        studentsTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No students enrolled yet</td>
            </tr>
        `;
    } else {
        studentsTable.innerHTML = students.map(student => `
            <tr>
                <td>${student.name || 'N/A'}</td>
                <td>${student.email}</td>
                <td>${student.student_id || 'N/A'}</td>
                <td>${formatDate(student.joined_at)}</td>
                <td>
                    <button class="btn btn-small btn-danger" onclick="removeStudent(${student.id})">Remove</button>
                </td>
            </tr>
        `).join('');
    }
    
    // Show modal
    modal.style.display = 'block';
}

function closeClassModal() {
    document.getElementById('classModal').style.display = 'none';
    currentClassId = null;
    currentClassData = null;
}

function copyClassCode() {
    const code = document.getElementById('classCode').textContent;
    copyCode(code);
}

function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showSuccess(`Class code ${code} copied to clipboard!`);
    }).catch(err => {
        showError('Failed to copy code');
    });
}

async function regenerateCode() {
    if (!confirm('Are you sure you want to regenerate the class code? The old code will no longer work.')) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/classes/${currentClassId}/regenerate-code`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showSuccess(`New class code: ${result.new_class_code}`);
            document.getElementById('classCode').textContent = result.new_class_code;
            
            // Update the class in the grid
            await loadClasses();
        } else {
            showError(result.error || 'Failed to regenerate code');
        }
    } catch (error) {
        console.error('Error regenerating code:', error);
        showError('Network error. Please try again.');
    }
}

async function removeStudent(studentId) {
    if (!confirm('Are you sure you want to remove this student from the class?')) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/classes/${currentClassId}/students/${studentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showSuccess('Student removed from class');
            // Reload class details
            await viewClassDetails(currentClassId);
            await loadClasses();
        } else {
            const result = await response.json();
            showError(result.error || 'Failed to remove student');
        }
    } catch (error) {
        console.error('Error removing student:', error);
        showError('Network error. Please try again.');
    }
}

async function deleteClass() {
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${window.API_URL}/classes/${currentClassId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showSuccess('Class deleted successfully');
            closeClassModal();
            await loadClasses();
        } else {
            const result = await response.json();
            showError(result.error || 'Failed to delete class');
        }
    } catch (error) {
        console.error('Error deleting class:', error);
        showError('Network error. Please try again.');
    }
}

// Event Listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Create class form
    const createClassForm = document.getElementById('createClassForm');
    console.log('Create class form element:', createClassForm);
    
    if (createClassForm) {
        console.log('Adding submit event listener to create class form');
        createClassForm.addEventListener('submit', createClass);
    } else {
        console.error('Create class form not found!');
    }
    
    // Modal click outside to close
    window.onclick = function(event) {
        const modal = document.getElementById('classModal');
        if (event.target === modal) {
            closeClassModal();
        }
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
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

// Enhanced class code functionality
function showNewClassAlert(className, classCode) {
    const alert = document.getElementById('newClassAlert');
    const alertClassName = document.getElementById('alertClassName');
    const alertClassCode = document.getElementById('alertClassCode');
    
    if (alert && alertClassName && alertClassCode) {
        alertClassName.textContent = className;
        alertClassCode.textContent = classCode;
        alert.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            hideNewClassAlert();
        }, 10000);
        
        // Scroll to alert
        alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function hideNewClassAlert() {
    const alert = document.getElementById('newClassAlert');
    if (alert) {
        alert.style.display = 'none';
    }
}

function copyNewClassCode() {
    const code = document.getElementById('alertClassCode').textContent;
    copyCode(code);
}

function shareClassCode(classCode, className) {
    const shareText = `Join my VidPOD class "${className}" using code: ${classCode}`;
    
    if (navigator.share) {
        // Use native sharing if available (mobile devices)
        navigator.share({
            title: `Join ${className} - VidPOD`,
            text: shareText,
            url: window.location.origin
        }).catch(err => {
            console.log('Error sharing:', err);
            fallbackShare(shareText);
        });
    } else {
        fallbackShare(shareText);
    }
}

function fallbackShare(shareText) {
    // Fallback to clipboard copy
    navigator.clipboard.writeText(shareText).then(() => {
        showSuccess('Share text copied to clipboard! You can now paste it in your messaging app.');
    }).catch(err => {
        showError('Failed to copy share text');
    });
}

// Enhanced copy functionality with better feedback
function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        showSuccess(`📋 Class code ${code} copied to clipboard!`);
        
        // Visual feedback - highlight the copied code
        const codeElements = document.querySelectorAll('.class-code-large');
        codeElements.forEach(el => {
            if (el.textContent === code) {
                el.classList.add('code-copied');
                setTimeout(() => {
                    el.classList.remove('code-copied');
                }, 1000);
            }
        });
    }).catch(err => {
        showError('Failed to copy code to clipboard');
    });
}

// Enhanced copy for modal
function copyClassCode() {
    const code = document.getElementById('classCode').textContent;
    copyCode(code);
}

// Make functions globally available
window.copyNewClassCode = copyNewClassCode;
window.hideNewClassAlert = hideNewClassAlert;
window.shareClassCode = shareClassCode;

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}

// Toggle class details visibility for a specific class
async function toggleClassDetails(classId) {
    const studentsList = document.getElementById(`students-list-${classId}`);
    const classCard = document.querySelector(`[data-class-id="${classId}"]`);
    const expandBtn = classCard ? classCard.querySelector('.expand-btn') : null;
    
    if (!studentsList || !expandBtn) return;
    
    const isVisible = studentsList.style.display !== 'none';
    
    if (isVisible) {
        // Hide students
        studentsList.style.display = 'none';
        expandBtn.textContent = '📂 Show Students';
        expandBtn.setAttribute('data-expanded', 'false');
    } else {
        // Show students - load them first if needed
        studentsList.style.display = 'block';
        expandBtn.textContent = '📁 Hide Students';
        expandBtn.setAttribute('data-expanded', 'true');
        
        // Load student data if not already loaded
        if (studentsList.innerHTML.includes('Loading student details...')) {
            await loadStudentsForClass(classId, studentsList);
        }
    }
}

// Load students for a specific class
async function loadStudentsForClass(classId, container) {
    try {
        const response = await fetch(`${window.API_URL}/classes/${classId}/students`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load students');
        }
        
        const students = await response.json();
        
        if (students.length === 0) {
            container.innerHTML = '<p class="no-students">No students enrolled yet.</p>';
        } else {
            container.innerHTML = `
                <div class="students-header">
                    <h4>Enrolled Students (${students.length})</h4>
                </div>
                <div class="students-grid">
                    ${students.map(student => `
                        <div class="student-item">
                            <div class="student-info">
                                <strong>${student.name}</strong>
                                <div class="student-details">
                                    <span>📧 ${student.email}</span>
                                    ${student.student_id ? `<span>🆔 ${student.student_id}</span>` : ''}
                                </div>
                            </div>
                            <div class="student-joined">
                                Joined: ${formatDate(student.joined_at)}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading students:', error);
        container.innerHTML = '<p class="error-message">Failed to load students. Please try again.</p>';
    }
}

function expandAllClasses() {
    console.log('Expanding all class details...');
    showTeacherLoadingFeedback('Loading student details...');
    
    setTimeout(() => {
        // Find all class cards and expand them
        const classCards = document.querySelectorAll('.class-card-new, .class-card');
        classCards.forEach(card => {
            const expandBtn = card.querySelector('.expand-btn');
            const studentsList = card.querySelector('.students-list');
            const classId = card.getAttribute('data-class-id');
            
            if (expandBtn && studentsList && classId) {
                if (studentsList.style.display === 'none' || !studentsList.style.display) {
                    toggleClassDetails(parseInt(classId));
                }
            }
        });
        
        // Scroll to first class if exists
        const firstClass = document.querySelector('.class-card-new, .class-card');
        if (firstClass) {
            firstClass.scrollIntoView({ behavior: 'smooth' });
        }
    }, 300);
}

// Navigation functions for clickable stats
function scrollToClassManagement() {
    console.log('Scrolling to class management section...');
    showTeacherLoadingFeedback('Opening class management...');
    
    setTimeout(() => {
        const classSection = document.getElementById('classesSection') || document.querySelector('.classes-section');
        if (classSection) {
            classSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            const classList = document.querySelector('.classes-list') || document.querySelector('#classesGrid');
            if (classList) {
                classList.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, 300);
}

function navigateToSchoolInfo() {
    console.log('Navigating to school information...');
    showTeacherLoadingFeedback('Loading school details...');
    
    setTimeout(() => {
        // Could navigate to admin panel or show school info modal
        window.location.href = '/admin.html';
    }, 300);
}

function showTeacherLoadingFeedback(message) {
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--primary-color); color: white; padding: 10px 20px; border-radius: 5px; z-index: 1000; font-family: Arial, sans-serif; box-shadow: 0 2px 10px rgba(0,0,0,0.2);';
    loadingDiv.textContent = message;
    document.body.appendChild(loadingDiv);
    
    setTimeout(() => {
        if (loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
        }
    }, 1000);
}

// Make functions globally available
window.toggleClassDetails = toggleClassDetails;
window.loadStudentsForClass = loadStudentsForClass;
window.expandAllClasses = expandAllClasses;
window.scrollToClassManagement = scrollToClassManagement;
window.navigateToSchoolInfo = navigateToSchoolInfo;