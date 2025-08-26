# 🚀 VidPOD Rundown Creator - Deployment Guide

## Overview

This guide covers deploying the VidPOD Rundown Creator as an independent microservice alongside the main VidPOD system. The deployment strategy ensures zero conflicts with existing development work.

---

## 🏗️ Deployment Architecture

### System Design
```
┌─────────────────────────────────────────────────────────┐
│                Production Environment                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   Main VidPOD   │    │   Rundown Creator Service   │ │
│  │   (Port 3000)   │◄──►│      (Port 3001)           │ │
│  │                 │    │                             │ │
│  │ - Authentication│    │ - Rundown Management        │ │
│  │ - User Management│   │ - Segment Operations        │ │
│  │ - Story Database │   │ - Export Features           │ │
│  └─────────────────┘    └─────────────────────────────┘ │
│           │                          │                  │
│           ▼                          ▼                  │
│  ┌─────────────────────────────────────────────────────┐ │
│  │           Shared PostgreSQL Database                 │ │
│  │                                                     │ │
│  │  Main Tables:          Independent Tables:          │ │
│  │  - users               - rundown_app_rundowns       │ │
│  │  - stories             - rundown_app_segments       │ │
│  │  - classes             - rundown_app_stories        │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Key Benefits
- **Zero Conflict Deployment:** Independent service doesn't affect main VidPOD
- **Database Isolation:** Prefixed tables prevent data conflicts
- **Independent Scaling:** Scale rundown service based on usage
- **Rollback Safety:** Can rollback without affecting main system

---

## 🛠️ Pre-Deployment Setup

### 1. Environment Preparation

**Required Environment Variables:**
```bash
# Database Configuration (shared with main VidPOD)
DATABASE_URL=postgresql://username:password@host:port/database

# Service Configuration
PORT=3001
NODE_ENV=production

# Integration Configuration
VIDPOD_API_URL=https://podcast-stories-production.up.railway.app
CORS_ORIGIN=https://your-frontend-domain.com

# Security
JWT_SECRET=your-production-jwt-secret

# Optional: Debug and Monitoring
DEBUG_MODE=false
SENTRY_DSN=your-sentry-dsn-for-error-tracking
```

### 2. Database Schema Setup

**Step 1: Connect to Production Database**
```bash
# Using Railway CLI
railway login
railway connect

# Or direct psql connection
psql $DATABASE_URL
```

**Step 2: Create Independent Tables**
```sql
-- Run the schema creation script
\i backend/db/schema.sql

-- Verify table creation
\dt rundown_app_*

-- Expected output:
-- rundown_app_rundowns
-- rundown_app_segments  
-- rundown_app_stories
```

**Step 3: Set up Indexes for Performance**
```sql
-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_rundown_app_rundowns_created_by ON rundown_app_rundowns(created_by);
CREATE INDEX IF NOT EXISTS idx_rundown_app_rundowns_status ON rundown_app_rundowns(status);
CREATE INDEX IF NOT EXISTS idx_rundown_app_segments_rundown_id ON rundown_app_segments(rundown_id);
CREATE INDEX IF NOT EXISTS idx_rundown_app_segments_sort_order ON rundown_app_segments(rundown_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_rundown_app_stories_rundown_id ON rundown_app_stories(rundown_id);

-- Verify indexes
\di rundown_app_*
```

---

## 🚢 Railway Deployment

### Method 1: GitHub Integration (Recommended)

**Step 1: Repository Setup**
```bash
# Create new repository for rundown creator
git init
git add .
git commit -m "Initial rundown creator implementation"
git remote add origin https://github.com/yourusername/vidpod-rundown-creator.git
git push -u origin main
```

**Step 2: Railway Project Creation**
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your rundown creator repository
5. Railway will auto-detect Node.js and deploy

**Step 3: Environment Configuration**
```bash
# Using Railway CLI
railway variables set DATABASE_URL="your-database-url"
railway variables set VIDPOD_API_URL="https://podcast-stories-production.up.railway.app"
railway variables set PORT="3001"
railway variables set NODE_ENV="production"
railway variables set JWT_SECRET="your-jwt-secret"

# Or use Railway dashboard
# Go to Variables tab and add each environment variable
```

**Step 4: Domain Configuration**
```bash
# Generate Railway domain
railway domain

# Or set custom domain
railway domain add your-rundown-domain.com
```

### Method 2: Railway CLI Direct Deploy

**Step 1: Install Railway CLI**
```bash
npm install -g @railway/cli
railway login
```

**Step 2: Initialize and Deploy**
```bash
# In rundown-creator directory
railway init
railway up

# Monitor deployment
railway logs
```

### Method 3: Docker Deployment

**Step 1: Create Dockerfile**
```dockerfile
FROM node:16-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["npm", "start"]
```

**Step 2: Build and Deploy**
```bash
# Build Docker image
docker build -t vidpod-rundown-creator .

# Run locally for testing
docker run -p 3001:3001 --env-file .env vidpod-rundown-creator

# Deploy to Railway with Docker
railway up --dockerfile
```

---

## 🔍 Post-Deployment Verification

### 1. Health Check Verification

**Test Service Health:**
```bash
# Basic health check
curl https://your-rundown-domain.railway.app/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-18T10:30:00.000Z",
  "version": "1.0.0",
  "service": "VidPOD Rundown Creator"
}

# Database connectivity check
curl https://your-rundown-domain.railway.app/health/db

# Expected response:
{
  "status": "database connected",
  "tables": ["rundown_app_rundowns", "rundown_app_segments", "rundown_app_stories"]
}
```

### 2. Authentication Integration Test

**Test Auth Proxy:**
```bash
# Get token from main VidPOD API
curl -X POST https://podcast-stories-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@vidpod.com","password":"rumi&amaml"}'

# Use token with rundown creator
curl -X GET https://your-rundown-domain.railway.app/api/rundowns \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return rundowns list or empty array
```

### 3. Frontend Access Test

**Test Frontend Loading:**
```bash
# Test main page loads
curl -I https://your-rundown-domain.railway.app/

# Should return 200 OK with text/html content-type

# Test authentication redirect
# Visit https://your-rundown-domain.railway.app/ in browser
# Should redirect to main VidPOD login if not authenticated
```

### 4. API Functionality Test

**Create Test Rundown:**
```bash
# Create rundown (requires valid token)
curl -X POST https://your-rundown-domain.railway.app/api/rundowns \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deployment Test Rundown",
    "description": "Testing deployment functionality"
  }'

# Should return 201 with created rundown data
```

---

## 🐛 Debugging and Troubleshooting

### 1. Common Deployment Issues

#### Issue: Service Won't Start
**Symptoms:** Railway shows "Deploy failed" or service crashes immediately

**Debug Steps:**
```bash
# Check Railway logs
railway logs

# Common issues and solutions:
# 1. Missing environment variables
railway variables

# 2. Database connection issues
railway run psql $DATABASE_URL -c "SELECT 1;"

# 3. Port configuration issues
railway variables set PORT=3001

# 4. Dependency issues
railway run npm ls
```

#### Issue: Database Connection Fails
**Symptoms:** "Database connection failed" errors in logs

**Debug Steps:**
```bash
# Test database connectivity
railway run psql $DATABASE_URL -c "\dt rundown_app_*"

# Check database URL format
railway variables get DATABASE_URL

# Verify tables exist
railway run psql $DATABASE_URL -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'rundown_app_%';"
```

#### Issue: Authentication Proxy Fails
**Symptoms:** "Unauthorized" errors or auth failures

**Debug Steps:**
```bash
# Test main VidPOD API accessibility
curl https://podcast-stories-production.up.railway.app/api/health

# Verify VIDPOD_API_URL setting
railway variables get VIDPOD_API_URL

# Test token verification manually
curl -X GET https://podcast-stories-production.up.railway.app/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Debug Mode Activation

**Enable Debug Logging:**
```bash
# Set debug environment variables
railway variables set DEBUG_MODE=true
railway variables set LOG_LEVEL=debug

# Redeploy to apply changes
railway up

# Monitor detailed logs
railway logs --follow
```

**Debug Log Output Example:**
```
[DEBUG] Auth proxy: Verifying token for user 123
[DEBUG] Database query: SELECT * FROM rundown_app_rundowns WHERE created_by = $1
[DEBUG] API request: POST /api/rundowns - User: student@vidpod.com
[DEBUG] Response: 201 - Rundown created successfully
```

### 3. Performance Monitoring

**Database Performance:**
```sql
-- Check query performance
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%rundown_app_%' 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check connection usage
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```

**Application Metrics:**
```bash
# Memory and CPU usage
railway metrics

# Response time monitoring
curl -w "@curl-format.txt" -o /dev/null -s https://your-rundown-domain.railway.app/api/rundowns
```

---

## 🔒 Security Considerations

### 1. Production Security Checklist

**Environment Security:**
```bash
# Verify secure environment variables
railway variables | grep -v "SECRET\|PASSWORD\|TOKEN"

# Ensure JWT_SECRET is strong (minimum 32 characters)
railway variables set JWT_SECRET="$(openssl rand -base64 32)"

# Enable HTTPS only
railway variables set FORCE_HTTPS=true
```

**Database Security:**
```sql
-- Verify table permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name LIKE 'rundown_app_%';

-- Check for proper constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name LIKE 'rundown_app_%';
```

### 2. CORS Configuration

**Production CORS Setup:**
```javascript
// Verify CORS configuration in server.js
const corsOptions = {
  origin: [
    'https://your-frontend-domain.com',
    'https://podcast-stories-production.up.railway.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
```

### 3. Rate Limiting

**API Protection:**
```javascript
// Add rate limiting for production
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## 📊 Monitoring and Maintenance

### 1. Health Monitoring Setup

**Automated Health Checks:**
```bash
# Create monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash
HEALTH_URL="https://your-rundown-domain.railway.app/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "$(date): Service healthy"
else
    echo "$(date): Service unhealthy - HTTP $RESPONSE"
    # Add alert mechanism here (email, Slack, etc.)
fi
EOF

chmod +x monitor.sh

# Run every 5 minutes via cron
echo "*/5 * * * * /path/to/monitor.sh >> /var/log/rundown-monitor.log" | crontab -
```

### 2. Log Management

**Centralized Logging:**
```bash
# Railway provides automatic log aggregation
railway logs --follow | tee rundown-creator.log

# For custom log management
railway variables set LOGGING_ENABLED=true
railway variables set LOG_DESTINATION=file
```

### 3. Backup Strategy

**Database Backup:**
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="rundown_backup_$DATE.sql"

# Backup only rundown creator tables
pg_dump $DATABASE_URL \
  --table="rundown_app_*" \
  --data-only \
  --file=$BACKUP_FILE

echo "Backup created: $BACKUP_FILE"
EOF

# Schedule daily backups
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

---

## 🔄 Rolling Updates and Rollbacks

### 1. Safe Deployment Strategy

**Blue-Green Deployment:**
```bash
# Deploy to staging first
railway environment create staging
railway environment set staging

# Deploy and test
railway up
# Run tests and verification

# Promote to production
railway environment set production
railway up
```

### 2. Rollback Procedure

**Quick Rollback:**
```bash
# Rollback to previous deployment
railway rollback

# Or rollback to specific deployment
railway deployments
railway rollback <deployment-id>

# Verify rollback success
curl https://your-rundown-domain.railway.app/health
```

### 3. Database Migration Safety

**Safe Schema Changes:**
```sql
-- Always use IF NOT EXISTS for new tables
CREATE TABLE IF NOT EXISTS rundown_app_new_feature (
    id SERIAL PRIMARY KEY,
    -- other fields
);

-- Always use IF EXISTS for drops
DROP TABLE IF EXISTS rundown_app_old_feature;

-- Test migrations on staging first
BEGIN;
-- Run migration commands
-- Test functionality
ROLLBACK; -- or COMMIT if successful
```

---

## 📈 Performance Optimization

### 1. Database Optimization

**Index Optimization:**
```sql
-- Monitor slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
WHERE query LIKE '%rundown_app_%'
ORDER BY mean_time DESC;

-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_rundown_app_rundowns_status_created_by 
ON rundown_app_rundowns(status, created_by);

CREATE INDEX CONCURRENTLY idx_rundown_app_segments_rundown_sort 
ON rundown_app_segments(rundown_id, sort_order);
```

### 2. Application Optimization

**Connection Pooling:**
```javascript
// Optimize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Caching Strategy:**
```javascript
// Add Redis for caching (optional)
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

// Cache frequently accessed data
const getCachedRundowns = async (userId) => {
  const cached = await client.get(`rundowns:${userId}`);
  if (cached) return JSON.parse(cached);
  
  const rundowns = await loadRundownsFromDB(userId);
  await client.setex(`rundowns:${userId}`, 300, JSON.stringify(rundowns));
  return rundowns;
};
```

---

## 🎯 Success Criteria

### Deployment Success Indicators

✅ **Service Health:**
- Health endpoint returns 200 OK
- Database connectivity confirmed
- All environment variables set correctly

✅ **Authentication Integration:**
- Auth proxy successfully connects to main VidPOD
- Token verification works correctly
- Role-based access control functioning

✅ **Core Functionality:**
- Create, read, update, delete rundowns
- Segment management with drag-drop
- Story integration from main database
- Export functionality (CSV/PDF)

✅ **Performance:**
- Response times under 500ms for API calls
- Frontend loads within 2 seconds
- Database queries optimized with proper indexes

✅ **Security:**
- HTTPS enforced
- CORS properly configured
- Rate limiting in place
- Sensitive data properly protected

### Post-Deployment Verification Checklist

```bash
# 1. Health checks pass
curl https://your-rundown-domain.railway.app/health ✓

# 2. Authentication works
# Login via main VidPOD, then access rundown creator ✓

# 3. Core workflows function
# Create rundown → Add segments → Submit for approval ✓

# 4. Integration works
# Stories load from main database ✓

# 5. Export features work
# Export rundown as CSV and PDF ✓

# 6. Error handling works
# Test invalid requests return proper error messages ✓
```

---

This comprehensive deployment guide ensures a successful, secure, and maintainable deployment of the VidPOD Rundown Creator as an independent microservice. The isolated architecture allows for safe deployment without any risk to the main VidPOD system.