# 🔍 VidPOD Rundown Creator - Debug Guide

## Overview

Comprehensive debugging guide for the VidPOD Rundown Creator, covering common issues, debugging techniques, and troubleshooting procedures for both development and production environments.

---

## 🚨 Quick Debug Commands

### Immediate Status Check
```bash
# Check if services are running
curl http://localhost:3001/health
curl http://localhost:3000/api/health

# Test authentication flow
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@vidpod.com","password":"rumi&amaml"}'

# Test rundown creator with token
curl -X GET http://localhost:3001/api/rundowns \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Browser Debug Console
```javascript
// Quick frontend debugging in browser console
console.log('Config:', CONFIG);
console.log('Current User:', getCurrentUser());
console.log('Token:', localStorage.getItem('token'));

// Test API connectivity
fetch('/api/rundowns', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(console.log);
```

---

## 🔧 Environment Debug

### 1. Service Status Verification

**Check All Services:**
```bash
#!/bin/bash
# save as debug-services.sh

echo "=== VidPOD Rundown Creator Debug ==="
echo

# Check Node.js version
echo "Node.js Version:"
node --version
echo

# Check npm packages
echo "Key Dependencies:"
npm list express pg axios cors --depth=0
echo

# Check environment variables
echo "Environment Variables:"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DATABASE_URL: ${DATABASE_URL:0:20}..." # Show only first 20 chars
echo "VIDPOD_API_URL: $VIDPOD_API_URL"
echo

# Check ports
echo "Port Usage:"
lsof -i :3000 -i :3001 2>/dev/null || echo "No processes found on ports 3000/3001"
echo

# Check processes
echo "Node Processes:"
ps aux | grep node | grep -v grep
echo

# Test database connection
echo "Database Test:"
if command -v psql &> /dev/null; then
    psql $DATABASE_URL -c "SELECT 1;" 2>/dev/null && echo "✅ Database connected" || echo "❌ Database connection failed"
else
    echo "psql not available"
fi
echo

# Test API endpoints
echo "API Health Checks:"
curl -s http://localhost:3001/health 2>/dev/null && echo "✅ Rundown Creator healthy" || echo "❌ Rundown Creator not responding"
curl -s http://localhost:3000/api/health 2>/dev/null && echo "✅ VidPOD API healthy" || echo "❌ VidPOD API not responding"
```

### 2. Database Debug

**Table and Data Verification:**
```sql
-- Save as debug-database.sql

-- Check if rundown creator tables exist
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name LIKE 'rundown_app_%'
ORDER BY table_name;

-- Check table structures
\d rundown_app_rundowns
\d rundown_app_segments  
\d rundown_app_stories

-- Check for data
SELECT 'rundown_app_rundowns' as table_name, COUNT(*) as row_count FROM rundown_app_rundowns
UNION ALL
SELECT 'rundown_app_segments', COUNT(*) FROM rundown_app_segments
UNION ALL  
SELECT 'rundown_app_stories', COUNT(*) FROM rundown_app_stories;

-- Check user access
SELECT id, email, role, created_at 
FROM users 
WHERE email IN ('admin@vidpod.com', 'teacher@vidpod.com', 'student@vidpod.com')
ORDER BY role;

-- Check recent rundowns
SELECT id, title, status, created_by, created_at 
FROM rundown_app_rundowns 
ORDER BY created_at DESC 
LIMIT 10;

-- Check foreign key relationships
SELECT 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name LIKE 'rundown_app_%';
```

### 3. Authentication Debug

**Token and Auth Flow Testing:**
```bash
#!/bin/bash
# save as debug-auth.sh

echo "=== Authentication Debug ==="
echo

# Test user login
echo "Testing login for student@vidpod.com:"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@vidpod.com","password":"rumi&amaml"}')

echo "Login Response:"
echo $LOGIN_RESPONSE | jq . 2>/dev/null || echo $LOGIN_RESPONSE
echo

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token' 2>/dev/null)
if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
    echo "✅ Token obtained: ${TOKEN:0:20}..."
    
    # Test token verification
    echo
    echo "Testing token verification:"
    curl -s -X GET http://localhost:3000/api/auth/verify \
        -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null
    
    # Test rundown creator auth proxy
    echo
    echo "Testing rundown creator auth proxy:"
    curl -s -X GET http://localhost:3001/api/rundowns \
        -H "Authorization: Bearer $TOKEN" | jq . 2>/dev/null
        
else
    echo "❌ No token received - login failed"
fi
```

---

## 🐛 Common Issues and Solutions

### 1. Service Won't Start

#### Issue: "Port already in use"
```bash
# Find process using the port
lsof -i :3001
# Kill the process
kill -9 PID_NUMBER
# Or use different port
PORT=3002 npm start
```

#### Issue: "Cannot connect to database"
```bash
# Verify DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://username:password@host:port/database

# Test connection manually
psql $DATABASE_URL -c "SELECT version();"

# Check if tables exist
psql $DATABASE_URL -c "\dt rundown_app_*"
```

#### Issue: "Module not found"
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for peer dependency issues
npm ls
```

### 2. Authentication Issues

#### Issue: "Unauthorized" errors
```javascript
// Debug auth state in browser console
console.log('Token:', localStorage.getItem('token'));
console.log('User:', localStorage.getItem('user'));

// Test token manually
fetch('/api/auth/verify', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(console.log);

// Clear auth and retry
localStorage.clear();
window.location.reload();
```

#### Issue: Auth proxy fails
```bash
# Test main VidPOD API accessibility
curl http://localhost:3000/api/health

# Verify VIDPOD_API_URL setting
echo $VIDPOD_API_URL

# Test direct auth proxy endpoint
curl -X GET http://localhost:3001/api/debug/auth-test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Frontend Issues

#### Issue: Page won't load
```javascript
// Check for JavaScript errors in browser console
// Common issues:

// 1. Config not loaded
console.log('CONFIG:', typeof CONFIG);

// 2. API base URL wrong
console.log('API_URL:', CONFIG?.RUNDOWN_API);

// 3. Auth state issues
console.log('Authenticated:', isAuthenticated());

// 4. Network errors
fetch('/api/rundowns')
  .then(r => console.log('Status:', r.status))
  .catch(e => console.error('Network error:', e));
```

#### Issue: Drag and drop not working
```javascript
// Check if HTML5 drag and drop is supported
console.log('Drag and drop supported:', 'draggable' in document.createElement('div'));

// Check for touch device
console.log('Touch device:', 'ontouchstart' in window);

// Debug drag events
document.addEventListener('dragstart', e => console.log('Drag start:', e.target));
document.addEventListener('drop', e => console.log('Drop:', e.target));
```

### 4. Database Issues

#### Issue: "Relation does not exist"
```sql
-- Check if tables were created
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename LIKE 'rundown_app_%';

-- If missing, create them
\i backend/db/schema.sql

-- Verify creation
\dt rundown_app_*
```

#### Issue: Foreign key constraint errors
```sql
-- Check constraint violations
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint 
WHERE contype = 'f' 
AND conrelid::regclass::text LIKE 'rundown_app_%';

-- Check for orphaned records
SELECT * FROM rundown_app_segments 
WHERE rundown_id NOT IN (SELECT id FROM rundown_app_rundowns);
```

---

## 🔍 Advanced Debugging

### 1. Debug Mode Activation

**Enable Comprehensive Logging:**
```bash
# Set debug environment variables
export DEBUG_MODE=true
export LOG_LEVEL=debug
export DEBUG_SQL=true

# Start with debug logging
npm run dev
```

**Debug Output Example:**
```
[DEBUG] 2025-01-18 10:30:15 - Server starting on port 3001
[DEBUG] 2025-01-18 10:30:15 - Database connection pool created
[DEBUG] 2025-01-18 10:30:16 - Auth proxy middleware initialized
[DEBUG] 2025-01-18 10:30:16 - Routes registered: /api/rundowns, /api/segments, /api/integration
[DEBUG] 2025-01-18 10:30:16 - Server ready and listening on port 3001

[DEBUG] 2025-01-18 10:30:25 - GET /api/rundowns - User: student@vidpod.com (ID: 3)
[DEBUG] 2025-01-18 10:30:25 - SQL: SELECT * FROM rundown_app_rundowns WHERE created_by = $1 ORDER BY updated_at DESC
[DEBUG] 2025-01-18 10:30:25 - SQL Params: [3]
[DEBUG] 2025-01-18 10:30:25 - SQL Result: 2 rows returned
[DEBUG] 2025-01-18 10:30:25 - Response: 200 - 2 rundowns returned
```

### 2. API Request Tracing

**Backend Request Logging:**
```javascript
// Add to server.js for detailed request logging
app.use((req, res, next) => {
  const start = Date.now();
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});
```

**Frontend Request Interceptor:**
```javascript
// Add to config.js for frontend request logging
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('🌐 API Request:', args[0], args[1]);
  
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('✅ API Response:', response.status, response.statusText);
      return response;
    })
    .catch(error => {
      console.error('❌ API Error:', error);
      throw error;
    });
};
```

### 3. Performance Debugging

**Database Query Performance:**
```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    min_time,
    max_time
FROM pg_stat_statements 
WHERE query LIKE '%rundown_app_%'
ORDER BY mean_time DESC 
LIMIT 10;

-- Check connection usage
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change
FROM pg_stat_activity 
WHERE application_name LIKE '%rundown%';
```

**Memory and CPU Monitoring:**
```bash
# Monitor Node.js process
top -p $(pgrep -f "node.*server.js")

# Memory usage details
node --expose-gc -e "
global.gc();
console.log('Memory usage:', process.memoryUsage());
setTimeout(() => {
  global.gc();
  console.log('Memory after GC:', process.memoryUsage());
}, 1000);
"

# Event loop lag monitoring
node -e "
const start = process.hrtime.bigint();
setImmediate(() => {
  const lag = Number(process.hrtime.bigint() - start) / 1e6;
  console.log('Event loop lag:', lag + 'ms');
});
"
```

---

## 🧪 Testing and Validation

### 1. Automated Debug Tests

**Backend API Testing Script:**
```bash
#!/bin/bash
# save as test-api.sh

API_BASE="http://localhost:3001"
TOKEN=""

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    
    echo "Testing: $method $endpoint"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $method "$API_BASE$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X $method "$API_BASE$endpoint" \
            -H "Authorization: Bearer $TOKEN")
    fi
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo "✅ PASS - Status: $http_code"
    else
        echo "❌ FAIL - Expected: $expected_status, Got: $http_code"
        echo "Response: $body"
    fi
    echo
}

# Get auth token first
echo "Getting authentication token..."
login_response=$(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"student@vidpod.com","password":"rumi&amaml"}')

TOKEN=$(echo $login_response | jq -r '.token' 2>/dev/null)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Failed to get authentication token"
    echo "Response: $login_response"
    exit 1
fi

echo "✅ Token obtained"
echo

# Test endpoints
test_endpoint "GET" "/health" "" 200
test_endpoint "GET" "/api/rundowns" "" 200
test_endpoint "POST" "/api/rundowns" '{"title":"Test Rundown","description":"Test description"}' 201
test_endpoint "GET" "/api/segments/1" "" 200

echo "API tests completed"
```

### 2. Frontend Integration Testing

**Browser Automation Test:**
```javascript
// save as frontend-test.js
// Run with: node frontend-test.js

const puppeteer = require('puppeteer');

async function testFrontend() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    try {
        console.log('🌐 Loading rundown creator...');
        await page.goto('http://localhost:3001');
        
        // Wait for initial load
        await page.waitForSelector('body', { timeout: 5000 });
        
        console.log('✅ Page loaded successfully');
        
        // Check if redirected to login
        const currentUrl = page.url();
        if (currentUrl.includes('localhost:3000')) {
            console.log('🔒 Redirected to authentication - this is expected');
            
            // Try to login
            await page.waitForSelector('input[type="email"]', { timeout: 5000 });
            await page.type('input[type="email"]', 'student@vidpod.com');
            await page.type('input[type="password"]', 'rumi&amaml');
            await page.click('button[type="submit"]');
            
            // Wait for redirect back
            await page.waitForNavigation({ timeout: 10000 });
            console.log('🔑 Login completed, redirected to:', page.url());
        }
        
        // Test rundown creator functionality
        if (page.url().includes('localhost:3001')) {
            console.log('✅ Successfully accessing rundown creator');
            
            // Check for main elements
            const hasRundownView = await page.$('#rundownsView');
            const hasCreateBtn = await page.$('#createRundownBtn');
            
            console.log('Has rundown view:', !!hasRundownView);
            console.log('Has create button:', !!hasCreateBtn);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testFrontend();
```

---

## 📋 Debug Checklist

### Development Environment Checklist

```
□ Node.js version 16+ installed
□ npm packages installed successfully  
□ Database connection working
□ Environment variables set correctly
□ Both services (3000, 3001) running
□ No port conflicts
□ Browser console shows no errors
□ Authentication flow works end-to-end
□ Can create/edit/delete rundowns
□ Drag and drop functionality works
□ Export features functional
```

### Production Environment Checklist

```
□ Railway deployment successful
□ All environment variables configured
□ Database tables created and indexed
□ Health endpoints returning 200 OK
□ HTTPS working correctly
□ CORS configured for production domains
□ Authentication proxy connecting to main API
□ Error logging and monitoring set up
□ Performance metrics within acceptable ranges
□ Security headers properly configured
```

### User Experience Checklist

```
□ Login redirects work correctly
□ Dashboard loads within 2 seconds
□ All buttons and forms are responsive
□ Drag and drop works on touch devices
□ Error messages are user-friendly
□ Loading states provide clear feedback
□ Offline functionality graceful
□ Mobile experience is fully functional
```

---

## 🆘 Emergency Debug Procedures

### 1. Service Down Emergency

**Immediate Response:**
```bash
# Check if processes are running
ps aux | grep node | grep server.js

# Restart services
pkill -f "node.*server.js"
npm start &

# Check logs for errors
tail -f logs/app.log

# Verify health
curl http://localhost:3001/health
```

### 2. Database Connection Lost

**Recovery Steps:**
```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1').then(() => console.log('DB OK')).catch(console.error);
"

# Restart with new connection pool
pkill -f "node.*server.js"
npm start
```

### 3. Authentication System Failure

**Debug Steps:**
```bash
# Test main VidPOD API
curl http://localhost:3000/api/health

# Clear all tokens and retry
# In browser console:
localStorage.clear();
sessionStorage.clear();
window.location.reload();

# Test auth proxy directly
curl -X GET http://localhost:3001/api/debug/auth-status
```

### 4. Performance Issues

**Quick Performance Check:**
```bash
# Check system resources
top -bn1 | grep node
free -m
df -h

# Check database performance
psql $DATABASE_URL -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC 
LIMIT 5;"

# Check for memory leaks
node --inspect-brk server.js
# Open chrome://inspect in Chrome
```

---

This comprehensive debug guide provides systematic approaches to identify, diagnose, and resolve issues in the VidPOD Rundown Creator system, ensuring rapid problem resolution and minimal downtime.