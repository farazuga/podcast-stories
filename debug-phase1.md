# Phase 1 Debug Guide: Email-based Authentication & Database Reset

**VidPOD Role-based Enhancement - Phase 1 Implementation**  
*Date: August 2025*  
*Status: READY FOR TESTING*

---

## 🎯 Phase 1 Overview

Phase 1 implements a clean slate approach with email-based authentication and creates the foundation for role-based access control. This phase includes:

1. **Complete data reset** - All existing users, stories, classes, and favorites deleted
2. **Email-based authentication** - Primary login identifier changed from username to email
3. **Enhanced user schema** - Added student_id field and improved role management
4. **Default accounts** - Three test accounts with known credentials
5. **Role-based redirects** - Automatic redirection based on user role after login

---

## 📋 Pre-Implementation Checklist

Before applying Phase 1 changes:

- [ ] **Backup existing data** (if needed for reference)
- [ ] **Inform all users** that accounts will be reset
- [ ] **Document current admin credentials** for reference
- [ ] **Test database connectivity** 
- [ ] **Verify backend server is accessible**

---

## 🔧 Implementation Steps

### Step 1: Apply Database Migration

**⚠️ WARNING: This will delete ALL existing data**

```bash
# Connect to production database
psql $DATABASE_URL

# Apply the migration (this deletes all data and creates new structure)
\i backend/migrations/009_phase1_user_email_migration.sql

# Verify the migration completed successfully
SELECT * FROM users;
SELECT * FROM schools;
SELECT * FROM classes;
```

**Expected Results:**
- 3 users created (admin@vidpod.com, teacher@vidpod.com, student@vidpod.com)
- 1 school created ("VidPOD Default School")
- 1 class created ("Demo Class" with code "DEMO")
- Student enrolled in demo class

### Step 2: Deploy Backend Changes

```bash
# Deploy updated authentication routes
git add backend/routes/auth.js
git commit -m "Phase 1: Email-based authentication implementation"
git push origin main

# Railway will auto-deploy
# Monitor deployment at: https://railway.app/dashboard
```

### Step 3: Deploy Frontend Changes  

```bash
# Deploy updated login form and auth.js
git add frontend/index.html frontend/js/auth.js
git commit -m "Phase 1: Update login form for email authentication"
git push origin main
```

### Step 4: Verify Deployment

Check that both backend and frontend deployments succeeded:
- Backend: https://podcast-stories-production.up.railway.app/api/auth/verify
- Frontend: https://frontend-production-b75b.up.railway.app

---

## 🧪 Testing Instructions

### Quick Smoke Test (5 minutes)

1. **Clear browser cache** and open: https://frontend-production-b75b.up.railway.app
2. **Verify login form** shows "Email Address" field (not "Username")
3. **Test admin login:**
   - Email: `admin@vidpod.com`
   - Password: `rumi&amaml`
   - Should redirect to `/admin.html`
4. **Test teacher login:**
   - Email: `teacher@vidpod.com`  
   - Password: `rumi&amaml`
   - Should redirect to `/teacher-dashboard.html`
5. **Test student login:**
   - Email: `student@vidpod.com`
   - Password: `rumi&amaml`
   - Should redirect to `/dashboard.html`

### Comprehensive Test Suite

#### Authentication Tests

```bash
# Run Jest tests for email authentication
cd backend
npm test auth-email.test.js

# Expected: All tests pass
# - Email login functionality
# - Username backward compatibility
# - Role-based JWT tokens
# - Password hash validation
# - Error handling
```

#### Manual API Tests

```bash
# Test admin login
curl -X POST https://podcast-stories-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vidpod.com","password":"rumi&amaml"}'

# Expected response: 200 OK with JWT token and user data
# Should include: role="amitrace_admin", email="admin@vidpod.com"

# Test teacher login
curl -X POST https://podcast-stories-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@vidpod.com","password":"rumi&amaml"}'

# Test student login  
curl -X POST https://podcast-stories-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@vidpod.com","password":"rumi&amaml"}'

# Test backward compatibility (should still work)
curl -X POST https://podcast-stories-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"rumi&amaml"}'
```

#### Database Verification Tests

```sql
-- Connect to database and verify data structure
psql $DATABASE_URL

-- Check users table structure
\d users

-- Verify default accounts exist
SELECT id, username, email, name, role, student_id FROM users;

-- Expected: 3 users with correct emails and roles
-- admin@vidpod.com (amitrace_admin)
-- teacher@vidpod.com (teacher)  
-- student@vidpod.com (student)

-- Check school and class setup
SELECT * FROM schools;
SELECT * FROM classes;
SELECT * FROM user_classes;

-- Verify password hashes work
-- (This would be done by authentication API calls above)
```

---

## 🚨 Troubleshooting Guide

### Issue: Login Form Still Shows "Username"

**Symptoms:** Login page shows "Username" instead of "Email Address"

**Solution:**
```bash
# Check if frontend deployment completed
curl -I https://frontend-production-b75b.up.railway.app/index.html

# Clear browser cache completely
# In Chrome: Dev Tools > Application > Storage > Clear site data

# Verify index.html was updated
curl https://frontend-production-b75b.up.railway.app/index.html | grep "Email Address"
```

### Issue: "Invalid credentials" for Default Accounts

**Symptoms:** Login fails with 401 error for admin@vidpod.com

**Debugging Steps:**
```bash
# 1. Check if migration ran successfully
psql $DATABASE_URL -c "SELECT email, role FROM users WHERE email LIKE '%@vidpod.com';"

# 2. Test password hashes manually
psql $DATABASE_URL -c "SELECT email, password FROM users WHERE email = 'admin@vidpod.com';"

# 3. Check backend logs
# In Railway dashboard, view deployment logs

# 4. Test API endpoint directly
curl -X POST https://podcast-stories-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vidpod.com","password":"rumi&amaml"}' \
  -v
```

**Common Fixes:**
- Re-run migration script if user data is missing
- Check if password hashes were corrupted during migration
- Verify DATABASE_URL is pointing to correct database

### Issue: Wrong Redirect After Login

**Symptoms:** User logs in but goes to wrong dashboard

**Debugging:**
```javascript
// In browser console after login
console.log('Stored user:', JSON.parse(localStorage.getItem('user')));

// Check role field
const user = JSON.parse(localStorage.getItem('user'));
console.log('User role:', user.role);
```

**Fix:** Verify role-based redirect function in `frontend/js/auth.js`

### Issue: Database Migration Fails

**Symptoms:** Migration script encounters errors

**Recovery Steps:**
```sql
-- Rollback partially applied migration
ROLLBACK;

-- Check what exists
\dt

-- Manually fix any constraint issues
-- Then re-run migration
```

### Issue: Tests Fail

**Symptoms:** Jest tests fail with errors

**Debugging:**
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test auth-email.test.js

# Check test environment variables
echo $JWT_SECRET
echo $NODE_ENV
```

---

## ✅ Success Verification

Phase 1 is successfully implemented when:

### ✓ Database Structure
- [ ] Users table uses email as primary login identifier
- [ ] All old data has been removed  
- [ ] Three default accounts exist with correct roles
- [ ] Demo school and class are created
- [ ] Student is enrolled in demo class

### ✓ Authentication System
- [ ] Login form uses email field instead of username
- [ ] All three default accounts can log in successfully
- [ ] Role-based redirects work correctly:
  - Admin → `/admin.html`
  - Teacher → `/teacher-dashboard.html`  
  - Student → `/dashboard.html`
- [ ] JWT tokens include email and role information
- [ ] Token verification endpoint returns updated user data

### ✓ Backward Compatibility
- [ ] Old username-based login still works (for migration period)
- [ ] Existing API endpoints function with new user structure

### ✓ Testing
- [ ] All Jest tests pass
- [ ] Manual API tests return expected responses
- [ ] Frontend authentication flow works end-to-end

---

## 📊 Phase 1 Metrics

**Database Changes:**
- **Users deleted:** All existing users
- **Stories deleted:** All existing stories  
- **Classes deleted:** All existing classes
- **New accounts created:** 3 (admin, teacher, student)
- **Schema modifications:** 4 (email unique constraint, student_id field, role constraint, indexes)

**Code Changes:**
- **Backend files modified:** 2 (`routes/auth.js`, `package.json`)
- **Frontend files modified:** 2 (`index.html`, `js/auth.js`) 
- **New test files:** 1 (`auth-email.test.js`)
- **Migration files:** 1 (`009_phase1_user_email_migration.sql`)

**Testing Coverage:**
- **Jest tests:** 15+ test cases
- **API endpoints tested:** 3 (login, verify, register)
- **User roles tested:** 3 (admin, teacher, student)
- **Error scenarios tested:** 8+ edge cases

---

## 🔄 Next Steps After Phase 1

Once Phase 1 is successfully deployed and tested:

1. **Notify users** of new login credentials
2. **Monitor system** for 24-48 hours for issues
3. **Begin Phase 2** implementation (Story approval system)
4. **Update documentation** based on any issues found

---

## 📞 Support Information

**If Issues Arise:**
- Check Railway deployment logs
- Review browser console for JavaScript errors
- Test API endpoints directly with curl
- Run Jest test suite
- Consult this debug guide

**Emergency Rollback:**
If major issues occur, the system can be rolled back by:
1. Reverting git commits for backend and frontend
2. Restoring database from backup (if available)
3. Redeploying previous version

**Contact Information:**
- Technical issues: Check CLAUDE.md troubleshooting section
- Implementation questions: Review this debug guide
- Database issues: Check migration script and verify steps

---

*Last Updated: August 2025*  
*Phase 1 Status: Ready for Implementation*  
*Next Phase: Story Approval System (Phase 2)*