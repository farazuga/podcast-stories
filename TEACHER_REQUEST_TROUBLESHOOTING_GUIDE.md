# Teacher Request System Troubleshooting Guide

*Comprehensive guide for diagnosing and fixing teacher request workflow issues*

---

## Overview

The teacher request system allows prospective teachers to submit requests through a registration form, which are then reviewed and approved by Amitrace administrators. This guide helps diagnose and resolve issues in this workflow.

## System Components

### Frontend Components
- `register-teacher.html` - Teacher registration form
- `admin.html` - Admin panel with teacher requests tab
- `js/admin.js` - Admin panel JavaScript functions
- `js/config.js` - API configuration

### Backend Components
- `routes/teacher-requests.js` - API endpoints
- `teacher_requests` database table
- Email services (Gmail API + SMTP fallback)

### Key Functions
- `window.loadTeacherRequests()` - Loads requests into admin table
- `displayTeacherRequests()` - Renders requests in DOM
- `showTab('teachers')` - Admin tab navigation

---

## Common Issues and Solutions

### 1. Teacher Requests Not Displaying in Admin Panel

**Symptoms:**
- Admin can see statistics (pending count) but table is empty
- No error messages in UI
- Tab navigation works but content doesn't load

**Debugging Steps:**

1. **Check Browser Console**
   ```javascript
   // Open browser dev tools console and run:
   console.log('Testing teacher requests...');
   loadTeacherRequests();
   ```

2. **Verify DOM Elements**
   ```javascript
   // Check if required elements exist:
   console.log('teacherRequestsTable:', document.getElementById('teacherRequestsTable'));
   console.log('statusFilter:', document.getElementById('statusFilter'));
   console.log('showTab function:', typeof window.showTab);
   console.log('loadTeacherRequests function:', typeof window.loadTeacherRequests);
   ```

3. **Test API Directly**
   ```javascript
   // Test API endpoint directly:
   fetch(`${window.API_URL}/teacher-requests`, {
       headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
   })
   .then(response => response.json())
   .then(data => console.log('API Response:', data))
   .catch(error => console.error('API Error:', error));
   ```

**Common Fixes:**
- Clear browser cache and localStorage
- Check if `showTab('teachers')` properly calls `loadTeacherRequests()`
- Verify admin authentication token is valid
- Check network tab for failed API requests

### 2. Authentication Issues

**Symptoms:**
- 401 Unauthorized errors in network tab
- Admin redirected to login page
- API calls failing with auth errors

**Debugging Steps:**

1. **Check Token Validity**
   ```javascript
   const token = localStorage.getItem('token');
   const user = JSON.parse(localStorage.getItem('user') || '{}');
   console.log('Token:', token ? 'Present' : 'Missing');
   console.log('User role:', user.role);
   ```

2. **Verify Admin Role**
   ```javascript
   // User must be 'amitrace_admin' to access teacher requests
   const user = JSON.parse(localStorage.getItem('user') || '{}');
   console.log('User role check:', user.role === 'amitrace_admin');
   ```

**Common Fixes:**
- Re-login with admin credentials
- Check if user role is 'amitrace_admin' (not just 'admin')
- Clear localStorage and login again

### 3. API Endpoint Issues

**Symptoms:**
- 404 errors on teacher-requests endpoint
- 500 internal server errors
- Network timeouts

**Debugging Steps:**

1. **Check API URL**
   ```javascript
   console.log('API URL:', window.API_URL);
   console.log('Full endpoint:', `${window.API_URL}/teacher-requests`);
   ```

2. **Test API Health**
   ```bash
   # Test from command line:
   curl -H "Authorization: Bearer YOUR_TOKEN" https://podcast-stories-production.up.railway.app/api/teacher-requests
   ```

**Common Fixes:**
- Verify backend server is running
- Check Railway deployment status
- Review server logs for errors

### 4. Database Connection Issues

**Symptoms:**
- API returns empty arrays
- Database connection errors in logs
- Inconsistent data loading

**Debugging Steps:**

1. **Check Database Connection**
   ```sql
   -- Connect to database and verify data exists:
   SELECT COUNT(*) FROM teacher_requests;
   SELECT * FROM teacher_requests ORDER BY requested_at DESC LIMIT 5;
   ```

2. **Verify Table Structure**
   ```sql
   \d teacher_requests
   ```

**Common Fixes:**
- Verify DATABASE_URL environment variable
- Check PostgreSQL service status
- Run database migrations if needed

### 5. Tab Navigation Issues

**Symptoms:**
- Clicking teachers tab doesn't show content
- Tab buttons not highlighting correctly
- JavaScript errors on tab switch

**Debugging Steps:**

1. **Test Tab Function**
   ```javascript
   // Test tab switching manually:
   showTab('teachers');
   ```

2. **Check Tab Elements**
   ```javascript
   // Verify tab structure:
   const teachersTab = document.getElementById('teachers-tab');
   const teachersButton = document.querySelector('button[onclick="showTab(\'teachers\')"]');
   console.log('Tab content:', teachersTab);
   console.log('Tab button:', teachersButton);
   ```

**Common Fixes:**
- Check for JavaScript errors preventing execution
- Verify HTML structure matches JavaScript selectors
- Ensure event listeners are properly attached

---

## Manual Testing Procedures

### Complete Workflow Test

1. **Teacher Registration**
   - Go to `/register-teacher.html`
   - Fill out form with test data
   - Submit and verify success message

2. **Admin Login**
   - Login with `admin@vidpod.com` / `vidpod`
   - Verify redirect to admin panel

3. **View Requests**
   - Click "Teacher Requests" tab
   - Verify requests appear in table
   - Check statistics are populated

4. **Approve Request**
   - Click "Approve" on a pending request
   - Fill approval modal and submit
   - Verify success message

### Quick Health Check

```javascript
// Run this in browser console for quick health check:
(async function healthCheck() {
    console.log('=== TEACHER REQUEST HEALTH CHECK ===');
    
    // 1. Check authentication
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('✓ Auth:', token ? 'Token present' : '❌ No token');
    console.log('✓ Role:', user.role || '❌ No role');
    
    // 2. Check API configuration
    console.log('✓ API URL:', window.API_URL);
    
    // 3. Check DOM elements
    const elements = {
        teachersTab: document.getElementById('teachers-tab'),
        teachersTable: document.getElementById('teacherRequestsTable'),
        statusFilter: document.getElementById('statusFilter')
    };
    Object.entries(elements).forEach(([name, el]) => {
        console.log(`✓ ${name}:`, el ? 'Found' : '❌ Missing');
    });
    
    // 4. Test API endpoint
    try {
        const response = await fetch(`${window.API_URL}/teacher-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('✓ API Response:', response.status, response.ok ? 'Success' : '❌ Failed');
        
        if (response.ok) {
            const data = await response.json();
            console.log('✓ Data count:', data.length, 'requests');
        }
    } catch (error) {
        console.log('❌ API Error:', error.message);
    }
    
    console.log('=== HEALTH CHECK COMPLETE ===');
})();
```

---

## Automated Testing

### Run Debug Script
```bash
cd testing/debug
node debug-teacher-requests.js
```

### Run E2E Test
```bash
cd testing/e2e
node teacher-request-workflow-test.js
```

---

## Environment-Specific Issues

### Development Environment
- API URL should be `http://localhost:3000/api`
- Check if backend server is running on port 3000
- Verify database connection string

### Production Environment  
- API URL should be `https://podcast-stories-production.up.railway.app/api`
- Check Railway service status
- Verify environment variables are set

---

## Debugging Tools

### Browser Developer Tools
- **Console**: Check for JavaScript errors
- **Network**: Monitor API requests and responses  
- **Application**: Inspect localStorage tokens
- **Elements**: Verify DOM structure

### Server-Side Debugging
- Check Railway logs for server errors
- Monitor database query performance
- Review email service logs

---

## Emergency Fixes

### If Teacher Requests Completely Broken

1. **Quick Reset**
   ```javascript
   // Clear all local storage and refresh
   localStorage.clear();
   location.reload();
   ```

2. **Manual Database Check**
   ```sql
   -- Check if requests exist
   SELECT COUNT(*), status FROM teacher_requests GROUP BY status;
   ```

3. **Fallback Admin Panel**
   - Use database admin tools directly
   - Manually approve teachers via SQL updates
   - Send approval emails manually

### If Statistics Show but Table Empty

1. **Force Reload Data**
   ```javascript
   window.loadTeacherRequests();
   ```

2. **Check Filter Settings**
   ```javascript
   document.getElementById('statusFilter').value = '';
   window.loadTeacherRequests();
   ```

3. **Reset Tab State**
   ```javascript
   window.showTab('overview');
   setTimeout(() => window.showTab('teachers'), 1000);
   ```

---

## Contact and Support

### For Developers
- Check CLAUDE.md for comprehensive system documentation
- Review recent commits for related changes
- Use debugging scripts in `/testing/debug/`

### For Administrators  
- Use manual testing procedures above
- Contact system administrator if API issues persist
- Check Railway dashboard for service status

---

## Version History

- **v1.0** - Initial troubleshooting guide
- Created: August 2025
- Last Updated: August 2025

*This guide covers the most common issues encountered with the teacher request system. If you encounter issues not covered here, please document them and update this guide.*