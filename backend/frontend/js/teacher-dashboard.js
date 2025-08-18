// API_URL is declared in auth.js which loads first

// Global variables
let currentUser = null;
let myClasses = [];
let currentClassId = null;
let currentClassData = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
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
    
    // Check if user is a teacher
    if (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'amitrace_admin') {
        window.location.href = '/dashboard.html';
        return false;
    }
    
    return true;
}

async function loadUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        currentUser = user;
        
        document.getElementById('userInfo').textContent = `${user.username}`;
        document.getElementById('teacherName').textContent = user.name || user.username;
        
        // If user has a school, display it
        if (user.school) {
            document.getElementById('schoolName').textContent = user.school;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}

async function loadClasses() {
    try {
        const response = await fetch(`${API_URL}/classes`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
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
        <div class="class-card">
            <div class="class-header">
                <h3>${classItem.class_name}</h3>
                <span class="class-code">${classItem.class_code}</span>
            </div>
            <div class="class-details">
                ${classItem.subject ? `<p><strong>Subject:</strong> ${classItem.subject}</p>` : ''}
                ${classItem.description ? `<p class="class-description">${classItem.description}</p>` : ''}
                <p><strong>Students:</strong> ${classItem.student_count || 0}</p>
                <p><strong>School:</strong> ${classItem.school_name}</p>
            </div>
            <div class="class-actions">
                <button class="btn btn-primary" onclick="viewClassDetails(${classItem.id})">View Details</button>
                <button class="btn btn-secondary" onclick="copyCode('${classItem.class_code}')">Copy Code</button>
            </div>
        </div>
    `).join('');
}

async function loadStatistics() {
    // Update total classes
    document.getElementById('totalClasses').textContent = myClasses.filter(c => c.is_active !== false).length;
    
    // Calculate total students
    const totalStudents = myClasses.reduce((sum, classItem) => sum + (classItem.student_count || 0), 0);
    document.getElementById('totalStudents').textContent = totalStudents;
}

function updateStatistics() {
    loadStatistics();
}

async function createClass(e) {
    e.preventDefault();
    console.log('createClass function called');
    
    const className = document.getElementById('className').value.trim();
    const subject = document.getElementById('subject').value.trim();
    const description = document.getElementById('description').value.trim();
    
    console.log('Form values:', { className, subject, description });
    
    if (!className) {
        showError('Class name is required');
        return;
    }
    
    try {
        console.log('Making API call to create class...');
        const token = localStorage.getItem('token');
        console.log('Token exists:', !!token);
        
        const response = await fetch(`${API_URL}/classes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
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
            showSuccess(`Class created successfully! Class code: ${result.class_code}`);
            
            // Clear form
            document.getElementById('createClassForm').reset();
            
            // Reload classes
            await loadClasses();
        } else {
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
        const response = await fetch(`${API_URL}/classes/${classId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
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
        const response = await fetch(`${API_URL}/classes/${currentClassId}/regenerate-code`, {
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
        const response = await fetch(`${API_URL}/classes/${currentClassId}/students/${studentId}`, {
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
        const response = await fetch(`${API_URL}/classes/${currentClassId}`, {
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
    
    // Use a small delay to ensure DOM is fully ready
    setTimeout(() => {
        // Create class form
        const createClassForm = document.getElementById('createClassForm');
        console.log('createClassForm element found:', !!createClassForm);
        
        if (createClassForm) {
            // Remove any existing event listeners to prevent duplicates
            createClassForm.removeEventListener('submit', createClass);
            createClassForm.addEventListener('submit', createClass);
            console.log('Event listener added to form');
            
            // Also add a backup click handler to the submit button
            const submitButton = createClassForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.addEventListener('click', (e) => {
                    console.log('Submit button clicked directly');
                    if (createClassForm.checkValidity()) {
                        e.preventDefault();
                        createClass(e);
                    }
                });
                console.log('Backup click handler added to submit button');
            }
        } else {
            console.error('createClassForm element not found!');
            // Try to find it by querying all forms
            const allForms = document.querySelectorAll('form');
            console.log('All forms found:', allForms.length);
            allForms.forEach((form, index) => {
                console.log(`Form ${index}: id="${form.id}", class="${form.className}"`);
            });
        }
        
        // Modal click outside to close
        window.onclick = function(event) {
            const modal = document.getElementById('classModal');
            if (event.target === modal) {
                closeClassModal();
            }
        }
    }, 100);
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
}

function showError(message) {
    console.error('Showing error:', message);
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
    } else {
        console.error('Error div not found, using alert');
        alert('Error: ' + message);
    }
}

function showSuccess(message) {
    console.log('Showing success:', message);
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
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    } else {
        console.log('Success div not found, using alert');
        alert('Success: ' + message);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
}