/**
 * USER MANAGEMENT JAVASCRIPT
 * 
 * Comprehensive user management system for VidPOD
 * Features:
 * - Teacher and Admin management
 * - Multi-select operations
 * - Hard delete with confirmation
 * - Role-based access control
 * - Real-time updates
 */

// Global state
let currentUser = null;
let teachers = [];
let admins = [];
let selectedTeachers = new Set();
let selectedAdmins = new Set();
let currentTab = 'teachers';

// API Configuration
const API_URL = window.API_URL || 'https://podcast-stories-production.up.railway.app/api';

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 User Management: Initializing...');
    
    // Check authentication
    if (!checkAuth()) {
        return;
    }
    
    // Get user info and setup
    currentUser = JSON.parse(localStorage.getItem('user'));
    if (!currentUser) {
        console.error('❌ No user data found');
        window.location.href = '/index.html';
        return;
    }
    
    console.log(`👤 Current user: ${currentUser.email} (${currentUser.role})`);
    
    // Update UI based on user role
    updateUserDisplay();
    setupRoleBasedAccess();
    
    // Load initial data
    loadUserManagementStats();
    loadTeachers();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ User Management: Initialization complete');
});

// ============================================================================
// AUTHENTICATION & ROLE MANAGEMENT
// ============================================================================

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return false;
    }
    
    // Check if user has admin privileges
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!['amitrace_admin', 'super_admin'].includes(user.role)) {
        console.error('❌ Access denied: Admin privileges required');
        showNotification('Access denied. Admin privileges required.', 'error');
        window.location.href = '/dashboard.html';
        return false;
    }
    
    return true;
}

function updateUserDisplay() {
    const userInfo = document.getElementById('userInfo');
    const userRoleBadge = document.getElementById('userRoleBadge');
    
    if (userInfo) {
        const displayName = currentUser.name || currentUser.email || 'User';
        userInfo.textContent = displayName;
    }
    
    if (userRoleBadge) {
        userRoleBadge.textContent = currentUser.role === 'super_admin' ? 'SUPER ADMIN' : 'ADMIN';
        userRoleBadge.className = `role-badge ${currentUser.role.replace('_', '-')}`;
    }
}

function setupRoleBasedAccess() {
    const isSuperAdmin = currentUser.role === 'super_admin';
    
    // Admin tab access
    const adminTabBtn = document.getElementById('adminTabBtn');
    if (adminTabBtn) {
        if (isSuperAdmin) {
            adminTabBtn.style.display = 'block';
        } else {
            adminTabBtn.style.display = 'none';
        }
    }
    
    // Add admin button
    const addAdminBtn = document.getElementById('addAdminBtn');
    if (addAdminBtn) {
        addAdminBtn.style.display = isSuperAdmin ? 'block' : 'none';
    }
    
    // Bulk delete admins button
    const bulkDeleteAdminsBtn = document.getElementById('bulkDeleteAdminsBtn');
    if (bulkDeleteAdminsBtn) {
        bulkDeleteAdminsBtn.style.display = isSuperAdmin ? 'none' : 'none'; // Hidden until selection
    }
    
    console.log(`🔒 Role-based access configured for ${isSuperAdmin ? 'Super Admin' : 'Regular Admin'}`);
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Add admin form
    const addAdminForm = document.getElementById('addAdminForm');
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', function(e) {
            e.preventDefault();
            createAdmin();
        });
    }
    
    // Modal close handlers
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    // Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    console.log('📋 Event listeners configured');
}

// ============================================================================
// TAB MANAGEMENT
// ============================================================================

function showUserTab(tabName) {
    console.log(`📑 Switching to ${tabName} tab`);
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeTabBtn = document.querySelector(`[onclick="showUserTab('${tabName}')"]`);
    if (activeTabBtn) {
        activeTabBtn.classList.add('active');
    }
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
    
    currentTab = tabName;
    
    // Load data for the active tab
    if (tabName === 'teachers') {
        loadTeachers();
    } else if (tabName === 'admins') {
        if (currentUser.role === 'super_admin') {
            loadAdmins();
        } else {
            showSuperAdminWarning();
        }
    }
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadUserManagementStats() {
    try {
        console.log('📊 Loading user management statistics...');
        
        const response = await makeAuthenticatedRequest('/user-management/stats');
        const stats = await response.json();
        
        // Update header stats
        document.getElementById('totalTeachers').textContent = stats.teacher || 0;
        document.getElementById('totalAdmins').textContent = (stats.amitrace_admin || 0) + (stats.super_admin || 0);
        document.getElementById('totalManageable').textContent = stats.total_manageable || 0;
        
        console.log('✅ User management stats loaded:', stats);
    } catch (error) {
        console.error('❌ Error loading stats:', error);
        showNotification('Failed to load statistics', 'error');
    }
}

async function loadTeachers() {
    try {
        console.log('👩‍🏫 Loading teachers...');
        showLoadingState('teachersTable', 9);
        
        const response = await makeAuthenticatedRequest('/user-management/teachers');
        const data = await response.json();
        
        teachers = data.teachers || [];
        selectedTeachers.clear();
        
        renderTeachersTable();
        updateTeacherSelectionUI();
        
        console.log(`✅ Loaded ${teachers.length} teachers`);
    } catch (error) {
        console.error('❌ Error loading teachers:', error);
        showNotification('Failed to load teachers', 'error');
        showErrorState('teachersTable', 'Failed to load teachers', 9);
    }
}

async function loadAdmins() {
    try {
        console.log('👑 Loading administrators...');
        showLoadingState('adminsTable', 7);
        
        const response = await makeAuthenticatedRequest('/user-management/admins');
        const data = await response.json();
        
        admins = data.admins || [];
        selectedAdmins.clear();
        
        renderAdminsTable();
        updateAdminSelectionUI();
        
        console.log(`✅ Loaded ${admins.length} administrators`);
    } catch (error) {
        console.error('❌ Error loading admins:', error);
        showNotification('Failed to load administrators', 'error');
        showErrorState('adminsTable', 'Failed to load administrators', 7);
    }
}

// ============================================================================
// TABLE RENDERING
// ============================================================================

function renderTeachersTable() {
    const tableBody = document.getElementById('teachersTable');
    
    if (teachers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="loading-row">
                    No teachers found. Teachers will appear here when they are created.
                </td>
            </tr>
        `;
        return;
    }
    
    const filteredTeachers = filterTeachers();
    
    tableBody.innerHTML = filteredTeachers.map(teacher => `
        <tr class="user-row teacher-row ${selectedTeachers.has(teacher.id) ? 'selected' : ''}" 
            data-user-id="${teacher.id}">
            <td>
                <input type="checkbox" 
                       ${selectedTeachers.has(teacher.id) ? 'checked' : ''}
                       onchange="toggleTeacherSelection(${teacher.id})">
            </td>
            <td>
                <div class="user-name">${escapeHtml(teacher.name || 'N/A')}</div>
                <div class="user-role-badge teacher">Teacher</div>
            </td>
            <td>
                <div class="user-email">${escapeHtml(teacher.email)}</div>
            </td>
            <td>${escapeHtml(teacher.school_name || 'Not assigned')}</td>
            <td><span class="stat-number">${teacher.class_count}</span></td>
            <td><span class="stat-number">${teacher.student_count}</span></td>
            <td><span class="stat-number">${teacher.story_count}</span></td>
            <td>
                <div class="date-info">${formatDate(teacher.created_at)}</div>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view-btn" 
                            onclick="viewTeacherImpact(${teacher.id})"
                            title="View deletion impact">
                        👁️
                    </button>
                    <button class="action-btn delete-btn" 
                            onclick="deleteTeacher(${teacher.id})"
                            title="Delete teacher">
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function renderAdminsTable() {
    const tableBody = document.getElementById('adminsTable');
    
    if (admins.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-row">
                    No administrators found.
                </td>
            </tr>
        `;
        return;
    }
    
    const filteredAdmins = filterAdmins();
    
    tableBody.innerHTML = filteredAdmins.map(admin => `
        <tr class="user-row admin-row ${admin.role === 'super_admin' ? 'super-admin-row' : ''} ${selectedAdmins.has(admin.id) ? 'selected' : ''}" 
            data-user-id="${admin.id}">
            <td>
                <input type="checkbox" 
                       ${selectedAdmins.has(admin.id) ? 'checked' : ''}
                       ${admin.id === currentUser.id ? 'disabled' : ''}
                       onchange="toggleAdminSelection(${admin.id})">
            </td>
            <td>
                <div class="user-name">${escapeHtml(admin.name || 'N/A')}</div>
                <div class="user-role-badge ${admin.role.replace('_', '-')}">${formatRole(admin.role)}</div>
            </td>
            <td>
                <div class="user-email">${escapeHtml(admin.email)}</div>
            </td>
            <td>
                <span class="user-role-badge ${admin.role.replace('_', '-')}">${formatRole(admin.role)}</span>
            </td>
            <td><span class="stat-number">${admin.story_count}</span></td>
            <td>
                <div class="date-info">${formatDate(admin.created_at)}</div>
            </td>
            <td>
                <div class="action-buttons">
                    ${admin.id !== currentUser.id ? `
                        <button class="action-btn delete-btn" 
                                onclick="deleteAdmin(${admin.id})"
                                title="Delete administrator">
                            🗑️
                        </button>
                    ` : `
                        <span class="text-muted" title="Cannot delete your own account">Self</span>
                    `}
                </div>
            </td>
        </tr>
    `).join('');
}

// ============================================================================
// SELECTION MANAGEMENT
// ============================================================================

function toggleTeacherSelection(teacherId) {
    if (selectedTeachers.has(teacherId)) {
        selectedTeachers.delete(teacherId);
    } else {
        selectedTeachers.add(teacherId);
    }
    updateTeacherSelectionUI();
    renderTeachersTable(); // Re-render to update row highlighting
}

function toggleSelectAllTeachers() {
    const checkbox = document.getElementById('selectAllTeachers');
    const headerCheckbox = document.getElementById('selectAllTeachersHeader');
    
    if (checkbox.checked) {
        // Select all visible teachers
        const filteredTeachers = filterTeachers();
        filteredTeachers.forEach(teacher => selectedTeachers.add(teacher.id));
    } else {
        // Deselect all
        selectedTeachers.clear();
    }
    
    // Sync checkboxes
    headerCheckbox.checked = checkbox.checked;
    
    updateTeacherSelectionUI();
    renderTeachersTable();
}

function updateTeacherSelectionUI() {
    const count = selectedTeachers.size;
    const bulkDeleteBtn = document.getElementById('bulkDeleteTeachersBtn');
    const selectedCountSpan = document.getElementById('selectedTeachersCount');
    const selectionInfo = document.getElementById('teacherSelectionInfo');
    
    if (selectedCountSpan) {
        selectedCountSpan.textContent = count;
    }
    
    if (selectionInfo) {
        selectionInfo.textContent = `${count} teacher${count !== 1 ? 's' : ''} selected`;
    }
    
    if (bulkDeleteBtn) {
        bulkDeleteBtn.style.display = count > 0 ? 'block' : 'none';
    }
    
    // Update select all checkbox state
    const selectAllCheckbox = document.getElementById('selectAllTeachers');
    const selectAllHeaderCheckbox = document.getElementById('selectAllTeachersHeader');
    const filteredTeachers = filterTeachers();
    
    if (selectAllCheckbox && selectAllHeaderCheckbox) {
        const allSelected = filteredTeachers.length > 0 && 
                           filteredTeachers.every(teacher => selectedTeachers.has(teacher.id));
        const someSelected = filteredTeachers.some(teacher => selectedTeachers.has(teacher.id));
        
        selectAllCheckbox.checked = allSelected;
        selectAllCheckbox.indeterminate = someSelected && !allSelected;
        selectAllHeaderCheckbox.checked = allSelected;
        selectAllHeaderCheckbox.indeterminate = someSelected && !allSelected;
    }
}

function toggleAdminSelection(adminId) {
    if (selectedAdmins.has(adminId)) {
        selectedAdmins.delete(adminId);
    } else {
        selectedAdmins.add(adminId);
    }
    updateAdminSelectionUI();
    renderAdminsTable();
}

function toggleSelectAllAdmins() {
    const checkbox = document.getElementById('selectAllAdmins');
    const headerCheckbox = document.getElementById('selectAllAdminsHeader');
    
    if (checkbox.checked) {
        // Select all visible admins (except current user)
        const filteredAdmins = filterAdmins();
        filteredAdmins.forEach(admin => {
            if (admin.id !== currentUser.id) {
                selectedAdmins.add(admin.id);
            }
        });
    } else {
        // Deselect all
        selectedAdmins.clear();
    }
    
    // Sync checkboxes
    headerCheckbox.checked = checkbox.checked;
    
    updateAdminSelectionUI();
    renderAdminsTable();
}

function updateAdminSelectionUI() {
    const count = selectedAdmins.size;
    const bulkDeleteBtn = document.getElementById('bulkDeleteAdminsBtn');
    const selectedCountSpan = document.getElementById('selectedAdminsCount');
    const selectionInfo = document.getElementById('adminSelectionInfo');
    
    if (selectedCountSpan) {
        selectedCountSpan.textContent = count;
    }
    
    if (selectionInfo) {
        selectionInfo.textContent = `${count} admin${count !== 1 ? 's' : ''} selected`;
    }
    
    if (bulkDeleteBtn && currentUser.role === 'super_admin') {
        bulkDeleteBtn.style.display = count > 0 ? 'block' : 'none';
    }
}

// ============================================================================
// FILTERING
// ============================================================================

function filterTeachers() {
    const searchTerm = document.getElementById('teacherSearch')?.value.toLowerCase() || '';
    
    if (!searchTerm) {
        return teachers;
    }
    
    return teachers.filter(teacher => 
        (teacher.name || '').toLowerCase().includes(searchTerm) ||
        teacher.email.toLowerCase().includes(searchTerm) ||
        (teacher.school_name || '').toLowerCase().includes(searchTerm)
    );
}

function filterAdmins() {
    const searchTerm = document.getElementById('adminSearch')?.value.toLowerCase() || '';
    
    if (!searchTerm) {
        return admins;
    }
    
    return admins.filter(admin => 
        (admin.name || '').toLowerCase().includes(searchTerm) ||
        admin.email.toLowerCase().includes(searchTerm) ||
        admin.role.toLowerCase().includes(searchTerm)
    );
}

// ============================================================================
// DELETION OPERATIONS
// ============================================================================

async function viewTeacherImpact(teacherId) {
    try {
        console.log(`🔍 Viewing deletion impact for teacher ${teacherId}`);
        
        const response = await makeAuthenticatedRequest(`/user-management/teacher/${teacherId}/impact`);
        const data = await response.json();
        
        const teacher = data.teacher;
        const impact = data.impact;
        
        const modalContent = `
            <div class="deletion-impact">
                <h4>⚠️ Deletion Impact for ${escapeHtml(teacher.name)} (${escapeHtml(teacher.email)})</h4>
                <ul class="impact-list">
                    <li>📚 <span class="impact-number">${impact.classes_to_delete}</span> classes will be deleted</li>
                    <li>👥 <span class="impact-number">${impact.students_to_unenroll}</span> students will be unenrolled</li>
                    <li>📖 <span class="impact-number">${impact.stories_to_delete}</span> stories will be deleted</li>
                    <li>⭐ <span class="impact-number">${impact.favorites_to_delete}</span> favorites will be removed</li>
                </ul>
                <p><strong>This action cannot be undone.</strong></p>
            </div>
        `;
        
        showModal('deleteConfirmModal', 'View Deletion Impact', modalContent, [
            { text: 'Close', class: 'btn-secondary', action: 'closeDeleteConfirmModal()' }
        ]);
        
    } catch (error) {
        console.error('❌ Error viewing impact:', error);
        showNotification('Failed to load deletion impact', 'error');
    }
}

async function deleteTeacher(teacherId) {
    try {
        console.log(`🗑️ Initiating deletion for teacher ${teacherId}`);
        
        // Get deletion impact first
        const response = await makeAuthenticatedRequest(`/user-management/teacher/${teacherId}/impact`);
        const data = await response.json();
        
        const teacher = data.teacher;
        const impact = data.impact;
        
        const modalContent = `
            <div class="deletion-impact">
                <h4>⚠️ Delete Teacher: ${escapeHtml(teacher.name)}</h4>
                <p><strong>Email:</strong> ${escapeHtml(teacher.email)}</p>
                <p><strong>This will permanently delete:</strong></p>
                <ul class="impact-list">
                    <li>📚 <span class="impact-number">${impact.classes_to_delete}</span> classes</li>
                    <li>👥 <span class="impact-number">${impact.students_to_unenroll}</span> student enrollments</li>
                    <li>📖 <span class="impact-number">${impact.stories_to_delete}</span> stories</li>
                    <li>⭐ <span class="impact-number">${impact.favorites_to_delete}</span> favorites</li>
                </ul>
                <p><strong>⚠️ This action cannot be undone!</strong></p>
            </div>
        `;
        
        showConfirmModal(
            'Confirm Teacher Deletion',
            modalContent,
            'Delete Teacher',
            () => confirmDeleteTeacher(teacherId)
        );
        
    } catch (error) {
        console.error('❌ Error preparing teacher deletion:', error);
        showNotification('Failed to prepare deletion', 'error');
    }
}

async function confirmDeleteTeacher(teacherId) {
    try {
        console.log(`🗑️ Confirming deletion for teacher ${teacherId}`);
        showLoadingOverlay('Deleting teacher...');
        
        const response = await makeAuthenticatedRequest(`/user-management/teacher/${teacherId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        hideLoadingOverlay();
        closeDeleteConfirmModal();
        
        showNotification(`Teacher ${result.deleted_teacher.name} deleted successfully`, 'success');
        
        // Refresh data
        await loadTeachers();
        await loadUserManagementStats();
        
        console.log('✅ Teacher deletion completed');
        
    } catch (error) {
        console.error('❌ Error deleting teacher:', error);
        hideLoadingOverlay();
        showNotification('Failed to delete teacher', 'error');
    }
}

async function deleteAdmin(adminId) {
    try {
        console.log(`🗑️ Initiating deletion for admin ${adminId}`);
        
        const admin = admins.find(a => a.id === adminId);
        if (!admin) {
            showNotification('Administrator not found', 'error');
            return;
        }
        
        const modalContent = `
            <div class="deletion-impact">
                <h4>⚠️ Delete Administrator: ${escapeHtml(admin.name)}</h4>
                <p><strong>Email:</strong> ${escapeHtml(admin.email)}</p>
                <p><strong>Role:</strong> ${formatRole(admin.role)}</p>
                <p><strong>This will permanently delete:</strong></p>
                <ul class="impact-list">
                    <li>📖 <span class="impact-number">${admin.story_count}</span> stories by this admin</li>
                    <li>🔐 All associated authentication and access privileges</li>
                </ul>
                <p><strong>⚠️ This action cannot be undone!</strong></p>
            </div>
        `;
        
        showConfirmModal(
            'Confirm Administrator Deletion',
            modalContent,
            'Delete Administrator',
            () => confirmDeleteAdmin(adminId)
        );
        
    } catch (error) {
        console.error('❌ Error preparing admin deletion:', error);
        showNotification('Failed to prepare deletion', 'error');
    }
}

async function confirmDeleteAdmin(adminId) {
    try {
        console.log(`🗑️ Confirming deletion for admin ${adminId}`);
        showLoadingOverlay('Deleting administrator...');
        
        const response = await makeAuthenticatedRequest(`/user-management/admin/${adminId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        hideLoadingOverlay();
        closeDeleteConfirmModal();
        
        showNotification(`Administrator ${result.deleted_admin.name} deleted successfully`, 'success');
        
        // Refresh data
        await loadAdmins();
        await loadUserManagementStats();
        
        console.log('✅ Administrator deletion completed');
        
    } catch (error) {
        console.error('❌ Error deleting administrator:', error);
        hideLoadingOverlay();
        showNotification('Failed to delete administrator', 'error');
    }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

async function bulkDeleteTeachers() {
    if (selectedTeachers.size === 0) {
        showNotification('No teachers selected', 'warning');
        return;
    }
    
    try {
        console.log(`🔄 Preparing bulk deletion for ${selectedTeachers.size} teachers`);
        
        const selectedTeachersList = Array.from(selectedTeachers);
        const teacherNames = selectedTeachersList.map(id => {
            const teacher = teachers.find(t => t.id === id);
            return teacher ? teacher.name || teacher.email : `ID: ${id}`;
        });
        
        const modalContent = `
            <div class="deletion-impact">
                <h4>⚠️ Bulk Delete ${selectedTeachers.size} Teachers</h4>
                <p><strong>The following teachers will be permanently deleted:</strong></p>
                <div class="user-list">
                    ${teacherNames.map(name => `
                        <div class="user-list-item">
                            <div class="user-info">
                                <div class="user-name">${escapeHtml(name)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <p><strong>⚠️ This will also delete all associated classes, student enrollments, stories, and favorites!</strong></p>
                <p><strong>This action cannot be undone!</strong></p>
            </div>
        `;
        
        showConfirmModal(
            'Confirm Bulk Teacher Deletion',
            modalContent,
            `Delete ${selectedTeachers.size} Teachers`,
            () => confirmBulkDeleteTeachers(selectedTeachersList)
        );
        
    } catch (error) {
        console.error('❌ Error preparing bulk deletion:', error);
        showNotification('Failed to prepare bulk deletion', 'error');
    }
}

async function confirmBulkDeleteTeachers(teacherIds) {
    try {
        console.log(`🔄 Confirming bulk deletion for ${teacherIds.length} teachers`);
        showLoadingOverlay('Deleting teachers...');
        
        const response = await makeAuthenticatedRequest('/user-management/bulk-delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_ids: teacherIds,
                user_type: 'teacher'
            })
        });
        
        const result = await response.json();
        
        hideLoadingOverlay();
        closeBulkDeleteConfirmModal();
        
        showNotification(`Successfully deleted ${result.deleted_count} teachers`, 'success');
        
        // Clear selection and refresh data
        selectedTeachers.clear();
        await loadTeachers();
        await loadUserManagementStats();
        
        console.log('✅ Bulk teacher deletion completed');
        
    } catch (error) {
        console.error('❌ Error in bulk deletion:', error);
        hideLoadingOverlay();
        showNotification('Failed to delete teachers', 'error');
    }
}

async function bulkDeleteAdmins() {
    if (selectedAdmins.size === 0) {
        showNotification('No administrators selected', 'warning');
        return;
    }
    
    if (currentUser.role !== 'super_admin') {
        showSuperAdminWarning();
        return;
    }
    
    try {
        console.log(`🔄 Preparing bulk deletion for ${selectedAdmins.size} administrators`);
        
        const selectedAdminsList = Array.from(selectedAdmins);
        const adminNames = selectedAdminsList.map(id => {
            const admin = admins.find(a => a.id === id);
            return admin ? `${admin.name || admin.email} (${formatRole(admin.role)})` : `ID: ${id}`;
        });
        
        const modalContent = `
            <div class="deletion-impact">
                <h4>⚠️ Bulk Delete ${selectedAdmins.size} Administrators</h4>
                <p><strong>The following administrators will be permanently deleted:</strong></p>
                <div class="user-list">
                    ${adminNames.map(name => `
                        <div class="user-list-item">
                            <div class="user-info">
                                <div class="user-name">${escapeHtml(name)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <p><strong>⚠️ This will also delete all associated stories and access privileges!</strong></p>
                <p><strong>This action cannot be undone!</strong></p>
            </div>
        `;
        
        showConfirmModal(
            'Confirm Bulk Administrator Deletion',
            modalContent,
            `Delete ${selectedAdmins.size} Administrators`,
            () => confirmBulkDeleteAdmins(selectedAdminsList)
        );
        
    } catch (error) {
        console.error('❌ Error preparing bulk deletion:', error);
        showNotification('Failed to prepare bulk deletion', 'error');
    }
}

async function confirmBulkDeleteAdmins(adminIds) {
    try {
        console.log(`🔄 Confirming bulk deletion for ${adminIds.length} administrators`);
        showLoadingOverlay('Deleting administrators...');
        
        const response = await makeAuthenticatedRequest('/user-management/bulk-delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_ids: adminIds,
                user_type: 'admin'
            })
        });
        
        const result = await response.json();
        
        hideLoadingOverlay();
        closeBulkDeleteConfirmModal();
        
        showNotification(`Successfully deleted ${result.deleted_count} administrators`, 'success');
        
        // Clear selection and refresh data
        selectedAdmins.clear();
        await loadAdmins();
        await loadUserManagementStats();
        
        console.log('✅ Bulk administrator deletion completed');
        
    } catch (error) {
        console.error('❌ Error in bulk deletion:', error);
        hideLoadingOverlay();
        showNotification('Failed to delete administrators', 'error');
    }
}

// ============================================================================
// ADMIN CREATION
// ============================================================================

function showAddAdminModal() {
    if (currentUser.role !== 'super_admin') {
        showSuperAdminWarning();
        return;
    }
    
    const modal = document.getElementById('addAdminModal');
    if (modal) {
        modal.style.display = 'block';
        
        // Clear form
        document.getElementById('addAdminForm').reset();
        
        // Focus on email field
        const emailField = document.getElementById('adminEmail');
        if (emailField) {
            setTimeout(() => emailField.focus(), 100);
        }
    }
}

function closeAddAdminModal() {
    const modal = document.getElementById('addAdminModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function createAdmin() {
    try {
        const formData = {
            email: document.getElementById('adminEmail').value.trim(),
            name: document.getElementById('adminName').value.trim(),
            password: document.getElementById('adminPassword').value,
            role: document.getElementById('adminRole').value
        };
        
        console.log(`👑 Creating new admin: ${formData.email} (${formData.role})`);
        
        // Validation
        if (!formData.email || !formData.name || !formData.password || !formData.role) {
            showNotification('All fields are required', 'error');
            return;
        }
        
        if (formData.password.length < 8) {
            showNotification('Password must be at least 8 characters', 'error');
            return;
        }
        
        showLoadingOverlay('Creating administrator...');
        
        const response = await makeAuthenticatedRequest('/user-management/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        hideLoadingOverlay();
        closeAddAdminModal();
        
        showNotification(`Administrator ${result.admin.name} created successfully`, 'success');
        
        // Refresh data
        await loadAdmins();
        await loadUserManagementStats();
        
        console.log('✅ Administrator creation completed');
        
    } catch (error) {
        console.error('❌ Error creating administrator:', error);
        hideLoadingOverlay();
        
        if (error.message.includes('Email already exists')) {
            showNotification('Email address is already in use', 'error');
        } else {
            showNotification('Failed to create administrator', 'error');
        }
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function makeAuthenticatedRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const url = `${API_URL}${endpoint}`;
    
    const config = {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return response;
}

function showLoadingState(tableId, colspan) {
    const table = document.getElementById(tableId);
    if (table) {
        table.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="loading-row">
                    <div class="loading-spinner"></div>
                    Loading...
                </td>
            </tr>
        `;
    }
}

function showErrorState(tableId, message, colspan) {
    const table = document.getElementById(tableId);
    if (table) {
        table.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="loading-row text-danger">
                    ❌ ${message}
                </td>
            </tr>
        `;
    }
}

function showLoadingOverlay(message = 'Processing...') {
    const overlay = document.getElementById('loadingOverlay');
    const messageEl = document.getElementById('loadingMessage');
    
    if (overlay) {
        overlay.style.display = 'flex';
    }
    if (messageEl) {
        messageEl.textContent = message;
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showConfirmModal(title, content, confirmText, confirmAction) {
    const modal = document.getElementById('deleteConfirmModal');
    const titleEl = modal.querySelector('.modal-header h2');
    const contentEl = document.getElementById('deleteConfirmContent');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    if (titleEl) titleEl.textContent = title;
    if (contentEl) contentEl.innerHTML = content;
    if (confirmBtn) {
        confirmBtn.textContent = confirmText;
        confirmBtn.onclick = confirmAction;
    }
    
    modal.style.display = 'block';
}

function closeDeleteConfirmModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeBulkDeleteConfirmModal() {
    const modal = document.getElementById('bulkDeleteConfirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showSuperAdminWarning() {
    const modal = document.getElementById('superAdminWarningModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeSuperAdminWarningModal() {
    const modal = document.getElementById('superAdminWarningModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

function showNotification(message, type = 'info') {
    const notificationEl = document.getElementById(type === 'error' ? 'errorMessage' : 'successMessage');
    
    if (notificationEl) {
        notificationEl.textContent = message;
        notificationEl.style.display = 'block';
        
        setTimeout(() => {
            notificationEl.style.display = 'none';
        }, 5000);
    }
    
    console.log(`📢 Notification (${type}): ${message}`);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatRole(role) {
    switch (role) {
        case 'super_admin': return 'Super Admin';
        case 'amitrace_admin': return 'Admin';
        case 'teacher': return 'Teacher';
        default: return role;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// REFRESH FUNCTIONS
// ============================================================================

function refreshTeachers() {
    console.log('🔄 Refreshing teachers...');
    selectedTeachers.clear();
    loadTeachers();
}

function refreshAdmins() {
    console.log('🔄 Refreshing administrators...');
    selectedAdmins.clear();
    loadAdmins();
}

// ============================================================================
// LOGOUT FUNCTION
// ============================================================================

function logout() {
    console.log('👋 Logging out...');
    localStorage.clear();
    window.location.href = '/index.html';
}

// ============================================================================
// GLOBAL FUNCTION EXPORTS
// ============================================================================

// Make functions globally available for onclick handlers
window.showUserTab = showUserTab;
window.toggleTeacherSelection = toggleTeacherSelection;
window.toggleSelectAllTeachers = toggleSelectAllTeachers;
window.toggleAdminSelection = toggleAdminSelection;
window.toggleSelectAllAdmins = toggleSelectAllAdmins;
window.viewTeacherImpact = viewTeacherImpact;
window.deleteTeacher = deleteTeacher;
window.deleteAdmin = deleteAdmin;
window.bulkDeleteTeachers = bulkDeleteTeachers;
window.bulkDeleteAdmins = bulkDeleteAdmins;
window.showAddAdminModal = showAddAdminModal;
window.closeAddAdminModal = closeAddAdminModal;
window.closeDeleteConfirmModal = closeDeleteConfirmModal;
window.closeBulkDeleteConfirmModal = closeBulkDeleteConfirmModal;
window.closeSuperAdminWarningModal = closeSuperAdminWarningModal;
window.refreshTeachers = refreshTeachers;
window.refreshAdmins = refreshAdmins;
window.filterTeachers = filterTeachers;
window.filterAdmins = filterAdmins;
window.logout = logout;

console.log('📋 User Management JavaScript loaded successfully');