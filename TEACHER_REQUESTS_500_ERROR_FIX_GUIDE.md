# Teacher Requests 500 Error Fix Guide

**Problem Description:** The admin panel's Teacher Requests tab returns a 500 error due to missing optional database columns in the `teacher_requests` table.

---

## Quick Problem Identification

### Symptoms
- Admin panel Teacher Requests tab shows "Failed to load teacher requests (500)"  
- Console errors mentioning missing columns: `processed_at`, `action_type`, `password_set_at`
- Error message: `column "processed_at" does not exist` (or similar)

### Root Cause
The `teacher_requests` table is missing optional columns that were added in migration `012_add_teacher_request_missing_columns.sql`. These columns are required by the API unless `SKIP_OPTIONAL_COLUMNS=true` is set.

---

## Verification Steps

### 1. Run the Verification Script
```bash
# Set environment variables
export ADMIN_EMAIL=admin@vidpod.com
export ADMIN_PASSWORD=vidpod

# Run verification (interactive mode)
node testing/debug/verify-teacher-requests-deployment.js

# Run verification (headless/automated mode)
node testing/debug/verify-teacher-requests-deployment.js --headless --no-hold
```

### 2. Check Schema Status
```bash
# Make authenticated API request to schema check endpoint
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://podcast-stories-production.up.railway.app/api/teacher-requests/schema-check
```

### 3. Test API Directly
```bash
# Test normal request (should fail with 500)
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://podcast-stories-production.up.railway.app/api/teacher-requests

# Test with skip parameter (should work)
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://podcast-stories-production.up.railway.app/api/teacher-requests?skip_optional=true
```

---

## Quick Mitigation (Immediate Fix)

### Option A: Environment Variable (Fastest)
1. Go to Railway Dashboard → Your Project → Variables
2. Add environment variable:
   - **Name:** `SKIP_OPTIONAL_COLUMNS`
   - **Value:** `true`
3. Deploy/restart the application
4. Verify fix: Test the admin panel Teacher Requests tab

### Option B: Query Parameter (Testing Only)
- Add `?skip_optional=true` to API requests for temporary testing
- Not suitable for production frontend use

---

## Permanent Fix (Database Migration)

### 1. Run Migration Script
```bash
# Dry run (safe - shows what would be done)
node backend/scripts/run-teacher-requests-migration.js

# Execute migration (live deployment)
node backend/scripts/run-teacher-requests-migration.js --live

# Quiet mode (minimal output)
node backend/scripts/run-teacher-requests-migration.js --live --quiet
```

### 2. Manual Migration (Alternative)
If the migration script fails, run SQL manually:

```sql
-- Add missing columns
ALTER TABLE teacher_requests
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS action_type TEXT,
  ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS approved_by INTEGER NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL;

-- Add foreign key constraint
ALTER TABLE teacher_requests 
ADD CONSTRAINT teacher_requests_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES users(id);

-- Backfill existing data
UPDATE teacher_requests 
SET processed_at = COALESCE(approved_at, requested_at),
    action_type = CASE 
      WHEN status = 'approved' THEN 'approved'
      WHEN status = 'rejected' THEN 'rejected'
      ELSE NULL
    END
WHERE status IN ('approved', 'rejected');
```

---

## Verification After Fix

### 1. Remove Temporary Environment Variable
After permanent migration, remove `SKIP_OPTIONAL_COLUMNS=true` from Railway environment variables.

### 2. Test Full Functionality
```bash
# Run verification script again
ADMIN_EMAIL=admin@vidpod.com ADMIN_PASSWORD=vidpod \
  node testing/debug/verify-teacher-requests-deployment.js --headless --no-hold
```

### 3. Manual Testing
- Load admin panel Teacher Requests tab
- Verify no 500 errors
- Test teacher approval/rejection workflow
- Confirm invitation emails work

---

## Rollback Instructions

### If Migration Causes Issues
```sql
-- Rollback SQL (run if needed)
DROP TABLE IF EXISTS teacher_invitation_usage;
ALTER TABLE teacher_requests DROP COLUMN IF EXISTS processed_at;
ALTER TABLE teacher_requests DROP COLUMN IF EXISTS action_type;
ALTER TABLE teacher_requests DROP COLUMN IF EXISTS password_set_at;
ALTER TABLE teacher_requests DROP COLUMN IF EXISTS approved_by;
ALTER TABLE teacher_requests DROP COLUMN IF EXISTS approved_at;
```

### Restore Temporary Fix
```bash
# Set environment variable back
SKIP_OPTIONAL_COLUMNS=true
```

---

## CI/Deployment Prevention Checklist

### Before Deployment
- [ ] Run verification script in CI: `--headless --no-hold` flags
- [ ] Check exit code (0 = success, 1 = failure)
- [ ] Verify database schema matches expectations
- [ ] Test teacher approval workflow end-to-end

### Environment Variables to Check
- [ ] `DATABASE_URL` is set correctly
- [ ] `NODE_ENV=production` in production
- [ ] `SKIP_OPTIONAL_COLUMNS` is only set temporarily if needed
- [ ] Email service variables (`EMAIL_USER`/`EMAIL_PASS` or Gmail OAuth)

### Monitoring
- [ ] Check application logs for database column errors
- [ ] Monitor 500 error rates on teacher-requests endpoints
- [ ] Verify admin panel Teacher Requests tab loads successfully

---

## Advanced Troubleshooting

### Enable Debug Logging
```bash
# Set debug level logging
DEBUG=teacher-requests node backend/server.js
```

### Database Connection Test
```bash
# Test database connectivity
psql "$DATABASE_URL" -c "SELECT version();"
```

### Schema Inspection
```sql
-- Check table structure
\d teacher_requests

-- Check for missing columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'teacher_requests' 
ORDER BY ordinal_position;
```

---

## Files Referenced
- **Migration Script:** `backend/scripts/run-teacher-requests-migration.js`
- **Migration Files:**
  - `backend/migrations/012_add_teacher_request_missing_columns.sql`
  - `backend/migrations/add_teacher_request_audit_fields.sql`
  - `backend/migrations/013_add_teacher_invitation_usage_table.sql`
- **Verification Script:** `testing/debug/verify-teacher-requests-deployment.js`
- **API Routes:** `backend/routes/teacher-requests.js`

---

## Support

### Quick Commands Summary
```bash
# Immediate fix
echo "SKIP_OPTIONAL_COLUMNS=true" >> .env

# Permanent fix
node backend/scripts/run-teacher-requests-migration.js --live

# Verification
ADMIN_EMAIL=admin@vidpod.com ADMIN_PASSWORD=vidpod \
  node testing/debug/verify-teacher-requests-deployment.js --headless --no-hold
```

### Common Error Codes
- **42703:** PostgreSQL undefined column error
- **500:** Server error (usually missing columns)
- **401:** Authentication required
- **404:** Teacher request not found

Last Updated: August 27, 2025