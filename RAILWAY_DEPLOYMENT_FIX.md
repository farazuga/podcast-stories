# Railway Deployment Fix Documentation

**Date:** August 18, 2025  
**Issue:** Railway backend deployment failing  
**Status:** 🔧 IN PROGRESS  

## Problem Summary

Railway deployment was failing with multiple issues:
1. **"Failed to snapshot repository"** - Railway couldn't read the GitHub repo
2. **Wrong directory structure** - Railway looking in wrong location for backend
3. **Build configuration conflicts** - Multiple config files conflicting

## Root Cause Analysis

### Issue 1: GitHub Repository Structure
```
Parent Directory/
├── podcast-stories/          <-- Our actual app
│   ├── backend/
│   │   ├── server.js         <-- ACTUAL backend
│   │   └── package.json
│   └── frontend/
├── other-projects/           <-- Confusing Railway
└── random-files/
```

**Problem:** Railway was trying to build from parent directory, not `podcast-stories/`

### Issue 2: Directory Configuration Error
**Wrong Configuration (Applied by Mistake):**
```toml
[start]
cmd = 'node minimal-server.js'  # Wrong - root directory
```

**Correct Configuration:**
```toml
[start]  
cmd = 'cd backend && npm start'  # Correct - backend subdirectory
```

## Solution Applied

### Step 1: Fixed nixpacks.toml Configuration
```toml
[phases.setup]
nixPkgs = ['nodejs', 'npm']

[phases.install]
cmds = ['cd backend && npm ci']

[phases.build] 
cmds = ['cd backend && npm run build 2>/dev/null || echo "No build script, skipping"']

[start]
cmd = 'cd backend && npm start'
```

### Step 2: Fixed Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy backend package files first
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production  

# Copy backend source code
COPY backend/ ./

EXPOSE $PORT
CMD ["npm", "start"]
```

### Step 3: Bypass GitHub Snapshot Issue
```bash
# Use Railway CLI to deploy directly
railway up --detach

# This bypasses the GitHub "failed to snapshot" error
```

## File Structure Verification

**Correct Structure:**
```
podcast-stories/
├── backend/
│   ├── server.js           ✅ Main backend file
│   ├── package.json        ✅ Dependencies
│   └── routes/             ✅ API routes
├── frontend/               ✅ Static files
├── nixpacks.toml          ✅ Build config
├── Dockerfile             ✅ Docker config  
└── railway.json           ✅ Railway config
```

**Backend Entry Point:**
- **File:** `backend/server.js`
- **Port:** Uses `process.env.PORT` (Railway requirement)
- **Start Command:** `npm start` (runs from backend/ directory)

## Deployment Commands

### Method 1: Railway CLI (Recommended)
```bash
# Deploy directly (bypasses GitHub issues)
railway up --detach

# Check status
railway status

# View logs
railway logs
```

### Method 2: GitHub Integration (If Fixed)
```bash
# Push to GitHub triggers auto-deploy
git push origin main

# Railway should auto-detect changes
```

## Environment Variables Required

Railway needs these environment variables set:
```env
DATABASE_URL=postgresql://...     # Postgres connection
JWT_SECRET=your-secret-key        # Authentication
NODE_ENV=production               # Production mode
PORT=                             # Auto-assigned by Railway
```

## Testing Deployment Success

### 1. Health Check
```bash
curl https://podcast-stories-production.up.railway.app/
# Should return: 200 OK with frontend HTML
```

### 2. API Test
```bash
curl https://podcast-stories-production.up.railway.app/api/
# Should return: JSON response from server.js
```

### 3. Database Test
```bash
curl -X POST https://podcast-stories-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vidpod.com","password":"rumi&amaml"}'
# Should return: JWT token if successful
```

## Error Patterns & Solutions

### "Failed to snapshot repository"
**Symptom:** Railway can't read GitHub repo
**Solution:** Use `railway up` CLI deployment instead

### "Could not determine how to build the app"  
**Symptom:** Railway doesn't detect Node.js app
**Solution:** Ensure nixpacks.toml points to `backend/` directory

### "Application failed to respond (502)"
**Symptom:** Server starts but doesn't respond
**Solutions:** 
- Check PORT environment variable usage
- Verify server binds to `0.0.0.0` not `localhost`
- Check database connection string

### "Module not found" errors
**Symptom:** Missing dependencies during build
**Solution:** Verify `backend/package.json` has all dependencies

## Current Status

### ✅ Completed
- Fixed directory structure configuration
- Updated nixpacks.toml with correct backend path
- Fixed Dockerfile to copy from backend/
- Removed test/minimal server files
- Pushed configuration fixes to GitHub

### 🔄 In Progress  
- Waiting for Railway deployment to complete
- Testing API endpoints once deployed

### ⏳ Pending Verification
- Confirm backend server responds to requests
- Test database connectivity
- Verify all API endpoints working
- Test frontend-backend integration

## Next Steps

1. **Wait for current deployment** to complete
2. **Test API endpoints** with curl commands above
3. **If successful:** Test full application functionality
4. **If still failing:** Check Railway logs for specific error messages
5. **Document final working configuration**

## Repository Links
- **GitHub:** https://github.com/farazuga/podcast-stories
- **Railway:** Railway project dashboard
- **Production:** https://podcast-stories-production.up.railway.app

---

**Key Lesson:** Always verify directory structure matches Railway configuration. The backend must be in `backend/` subdirectory, not root directory.

*Last Updated: August 18, 2025*