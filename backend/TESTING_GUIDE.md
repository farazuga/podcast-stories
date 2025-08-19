# VidPOD Testing Guide

**Version:** 2.1.0  
**Last Updated:** August 18, 2025  
**Purpose:** Comprehensive testing documentation for VidPOD application

---

## Table of Contents
1. [Testing Tools Overview](#testing-tools-overview)
2. [API Testing](#api-testing)
3. [Browser Automation Testing](#browser-automation-testing)
4. [Database Testing](#database-testing)
5. [Frontend Testing](#frontend-testing)
6. [Integration Testing](#integration-testing)
7. [Debug Tools](#debug-tools)
8. [Test Scripts Reference](#test-scripts-reference)
9. [Common Testing Scenarios](#common-testing-scenarios)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## Testing Tools Overview

VidPOD uses multiple testing approaches to ensure comprehensive coverage:

| Tool | Purpose | When to Use |
|------|---------|-------------|
| **curl** | API endpoint testing | Quick API verification |
| **Puppeteer** | Browser automation | Full UI/UX testing |
| **Node.js scripts** | Custom test scenarios | Complex workflows |
| **PostgreSQL client** | Database verification | Data integrity checks |
| **Browser DevTools** | Frontend debugging | JavaScript issues |

---

## API Testing

### 1. Basic API Testing with curl

#### Authentication Test
```bash
# Login and get JWT token
curl -X POST https://podcast-stories-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vidpod.com","password":"vidpod"}'
```

#### Protected Endpoint Testing
```bash
# Get tags (requires authentication)
TOKEN="your_jwt_token_here"
curl -H "Authorization: Bearer $TOKEN" \
  https://podcast-stories-production.up.railway.app/api/tags
```

#### Common API Endpoints to Test
```bash
# Stories endpoints
curl -H "Authorization: Bearer $TOKEN" $API_URL/stories
curl -H "Authorization: Bearer $TOKEN" $API_URL/stories/admin/by-status/pending
curl -H "Authorization: Bearer $TOKEN" $API_URL/stories/admin/by-status/approved

# User management
curl -H "Authorization: Bearer $TOKEN" $API_URL/schools
curl -H "Authorization: Bearer $TOKEN" $API_URL/teacher-requests/stats/overview

# Tags management
curl -H "Authorization: Bearer $TOKEN" $API_URL/tags
```

### 2. Advanced API Testing Script

Create `test-api.js`:
```javascript
const API_URL = 'https://podcast-stories-production.up.railway.app/api';

async function testAPI() {
  // 1. Login
  const loginResponse = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@vidpod.com',
      password: 'vidpod'
    })
  });
  
  const { token } = await loginResponse.json();
  console.log('✅ Login successful, token:', token.substring(0, 20) + '...');
  
  // 2. Test protected endpoints
  const endpoints = ['/tags', '/stories', '/schools'];
  
  for (const endpoint of endpoints) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${endpoint}: ${data.length} items`);
    } else {
      console.log(`❌ ${endpoint}: Failed with ${response.status}`);
    }
  }
}

testAPI();
```

---

## Browser Automation Testing

### 1. Puppeteer Setup

#### Installation
```bash
npm install puppeteer
```

#### Basic Puppeteer Test Template
```javascript
const puppeteer = require('puppeteer');

async function testWithPuppeteer() {
  const browser = await puppeteer.launch({
    headless: false,  // Set to true for CI/CD
    devtools: true    // Open Chrome DevTools
  });
  
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', error => console.log('ERROR:', error.message));
  
  try {
    // Your test code here
    await page.goto('https://podcast-stories-production.up.railway.app');
    // ... more test steps
  } finally {
    await browser.close();
  }
}
```

### 2. Complete Admin Panel Test

**File:** `test-admin-puppeteer.js`
```javascript
const puppeteer = require('puppeteer');

async function testAdminPanel() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log(`Browser: ${msg.text()}`);
  });
  
  try {
    // 1. Login
    await page.goto('https://podcast-stories-production.up.railway.app');
    await page.type('#email', 'admin@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    // 2. Check admin panel loaded
    const url = page.url();
    console.assert(url.includes('admin.html'), 'Should redirect to admin panel');
    
    // 3. Test DOM elements
    const tagsList = await page.$('#tagsList');
    const storiesTable = await page.$('#storiesApprovalTable');
    
    console.log('Tags element:', tagsList ? '✅' : '❌');
    console.log('Stories element:', storiesTable ? '✅' : '❌');
    
    // 4. Test tab navigation
    await page.evaluate(() => window.showTab('tags'));
    await page.waitForTimeout(1000);
    
    // 5. Check data loaded
    const tagsCount = await page.evaluate(() => {
      const tags = document.querySelectorAll('.tag-item');
      return tags.length;
    });
    
    console.log(`Tags loaded: ${tagsCount}`);
    
    // 6. Take screenshot
    await page.screenshot({ 
      path: 'admin-test.png',
      fullPage: true 
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testAdminPanel();
```

### 3. User Flow Testing

```javascript
async function testUserFlow() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const flows = {
    admin: {
      email: 'admin@vidpod.com',
      password: 'vidpod',
      expectedUrl: '/admin.html'
    },
    teacher: {
      email: 'teacher@vidpod.com',
      password: 'vidpod',
      expectedUrl: '/teacher-dashboard.html'
    },
    student: {
      email: 'student@vidpod.com',
      password: 'vidpod',
      expectedUrl: '/dashboard.html'
    }
  };
  
  for (const [role, credentials] of Object.entries(flows)) {
    console.log(`Testing ${role} flow...`);
    
    await page.goto('https://podcast-stories-production.up.railway.app');
    await page.type('#email', credentials.email);
    await page.type('#password', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    const url = page.url();
    const success = url.includes(credentials.expectedUrl);
    console.log(`${role}: ${success ? '✅' : '❌'} (${url})`);
    
    // Logout for next test
    await page.evaluate(() => localStorage.clear());
  }
  
  await browser.close();
}
```

---

## Database Testing

### 1. Direct Database Queries

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testDatabase() {
  try {
    // Test story counts by status
    const statusCounts = await pool.query(`
      SELECT approval_status, COUNT(*) as count
      FROM story_ideas
      GROUP BY approval_status
    `);
    
    console.log('Story Status Breakdown:');
    statusCounts.rows.forEach(row => {
      console.log(`  ${row.approval_status}: ${row.count}`);
    });
    
    // Test user counts by role
    const userCounts = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `);
    
    console.log('\nUser Role Breakdown:');
    userCounts.rows.forEach(row => {
      console.log(`  ${row.role}: ${row.count}`);
    });
    
  } finally {
    await pool.end();
  }
}
```

### 2. Data Integrity Testing

```javascript
async function testDataIntegrity() {
  const tests = [
    {
      name: 'Orphaned favorites',
      query: `
        SELECT COUNT(*) as count
        FROM user_favorites uf
        LEFT JOIN story_ideas s ON uf.story_id = s.id
        WHERE s.id IS NULL
      `
    },
    {
      name: 'Stories without users',
      query: `
        SELECT COUNT(*) as count
        FROM story_ideas s
        LEFT JOIN users u ON s.uploaded_by = u.id
        WHERE u.id IS NULL
      `
    },
    {
      name: 'Classes without teachers',
      query: `
        SELECT COUNT(*) as count
        FROM classes c
        LEFT JOIN users u ON c.teacher_id = u.id
        WHERE u.id IS NULL
      `
    }
  ];
  
  for (const test of tests) {
    const result = await pool.query(test.query);
    const count = result.rows[0].count;
    console.log(`${test.name}: ${count === '0' ? '✅ OK' : `❌ ${count} issues`}`);
  }
}
```

---

## Frontend Testing

### 1. DOM Testing

```javascript
async function testDOMElements() {
  const page = await browser.newPage();
  await page.goto('https://podcast-stories-production.up.railway.app/admin.html');
  
  const elements = [
    '#tagsList',
    '#storiesApprovalTable',
    '#totalStories',
    '#totalSchools',
    '#totalUsers',
    '#pendingRequests'
  ];
  
  for (const selector of elements) {
    const element = await page.$(selector);
    console.log(`${selector}: ${element ? '✅ Found' : '❌ Missing'}`);
  }
}
```

### 2. JavaScript Function Testing

```javascript
async function testJavaScriptFunctions() {
  const functions = await page.evaluate(() => {
    const funcs = ['showTab', 'loadTags', 'loadStoriesForApproval', 'logout'];
    const results = {};
    
    funcs.forEach(func => {
      results[func] = typeof window[func] === 'function';
    });
    
    return results;
  });
  
  Object.entries(functions).forEach(([func, exists]) => {
    console.log(`window.${func}: ${exists ? '✅' : '❌'}`);
  });
}
```

### 3. Event Listener Testing

```javascript
async function testEventListeners() {
  // Test button clicks
  const buttons = await page.$$('.tab-button');
  
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    const text = await button.evaluate(el => el.textContent);
    
    await button.click();
    await page.waitForTimeout(500);
    
    // Check if tab changed
    const activeTab = await page.evaluate(() => {
      const active = document.querySelector('.tab-button.active');
      return active ? active.textContent : null;
    });
    
    console.log(`Button "${text}": ${activeTab === text ? '✅' : '❌'}`);
  }
}
```

---

## Integration Testing

### 1. End-to-End Story Creation

```javascript
async function testStoryCreation() {
  // 1. Login as teacher
  await page.goto('https://podcast-stories-production.up.railway.app');
  await page.type('#email', 'teacher@vidpod.com');
  await page.type('#password', 'vidpod');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  // 2. Navigate to add story
  await page.goto('https://podcast-stories-production.up.railway.app/add-story.html');
  
  // 3. Fill story form
  await page.type('#ideaTitle', 'Test Story from Puppeteer');
  await page.type('#ideaDescription', 'Automated test story');
  await page.type('#question1', 'Test question 1?');
  
  // 4. Submit form
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  // 5. Verify story appears in list
  const stories = await page.evaluate(() => {
    const cards = document.querySelectorAll('.story-card');
    return Array.from(cards).map(card => ({
      title: card.querySelector('h3')?.textContent
    }));
  });
  
  const found = stories.some(s => s.title.includes('Test Story from Puppeteer'));
  console.log(`Story created: ${found ? '✅' : '❌'}`);
}
```

### 2. Complete Approval Workflow

```javascript
async function testApprovalWorkflow() {
  // 1. Create pending story as teacher
  // ... (story creation code)
  
  // 2. Login as admin
  await page.evaluate(() => localStorage.clear());
  await page.goto('https://podcast-stories-production.up.railway.app');
  await page.type('#email', 'admin@vidpod.com');
  await page.type('#password', 'vidpod');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  // 3. Navigate to story approval
  await page.evaluate(() => window.showTab('stories'));
  await page.waitForTimeout(1000);
  
  // 4. Find and approve story
  const approveButton = await page.$('.approve-btn');
  if (approveButton) {
    await approveButton.click();
    await page.waitForTimeout(500);
    
    // Fill approval form
    await page.type('#approvalNotes', 'Approved via automated test');
    await page.click('#confirmApprove');
    
    console.log('Story approved: ✅');
  } else {
    console.log('No pending stories to approve: ⚠️');
  }
}
```

---

## Debug Tools

### 1. Live Debug Interface

**File:** `debug-admin-live.html`

Key Features:
- Real-time API testing
- Authentication verification
- DOM element checking
- Console output capture
- Function availability testing

Usage:
```bash
# Deploy to server
railway up --detach

# Access in browser
https://podcast-stories-production.up.railway.app/debug-admin-live.html
```

### 2. API Comparison Tool

**File:** `test-api-comparison.js`

Compares different authentication tokens and API responses:
```javascript
node test-api-comparison.js
```

### 3. Enhanced Logging

Add to any JavaScript file for detailed debugging:
```javascript
// Enhanced console logging
const DEBUG = true;

function debugLog(category, message, data = null) {
  if (!DEBUG) return;
  
  const timestamp = new Date().toISOString();
  const emoji = {
    'API': '🌐',
    'AUTH': '🔐',
    'DOM': '📄',
    'ERROR': '❌',
    'SUCCESS': '✅',
    'INFO': 'ℹ️'
  }[category] || '🔍';
  
  console.log(`${emoji} [${timestamp}] [${category}] ${message}`);
  if (data) console.log('  Data:', data);
}

// Usage
debugLog('API', 'Fetching tags...', { endpoint: '/tags' });
debugLog('SUCCESS', 'Tags loaded', { count: 11 });
debugLog('ERROR', 'Failed to load stories', { status: 401 });
```

---

## Test Scripts Reference

### Available Test Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `test-admin-puppeteer.js` | Full admin panel testing | `node test-admin-puppeteer.js` |
| `test-api-comparison.js` | Token/endpoint validation | `node test-api-comparison.js` |
| `test-admin-final.js` | Final verification testing | `node test-admin-final.js` |
| `create-actual-pending-story.js` | Create test data | `node create-actual-pending-story.js` |
| `verify-admin-functionality.js` | Database verification | `node verify-admin-functionality.js` |
| `test-api-simple.html` | Browser-based API testing | Deploy and access in browser |
| `debug-admin-live.html` | Live debugging interface | Deploy and access in browser |

### Running Tests

```bash
# Install dependencies
npm install puppeteer

# Run specific test
node test-admin-puppeteer.js

# Run with custom DATABASE_URL
DATABASE_URL="postgresql://..." node verify-admin-functionality.js

# Deploy test tools to production
railway up --detach
```

---

## Common Testing Scenarios

### Scenario 1: Admin Panel Not Loading

```bash
# 1. Check API health
curl https://podcast-stories-production.up.railway.app/api

# 2. Test authentication
curl -X POST https://podcast-stories-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vidpod.com","password":"vidpod"}'

# 3. Run Puppeteer test
node test-admin-puppeteer.js

# 4. Check browser console for errors
# Open Chrome DevTools and check Console tab
```

### Scenario 2: Data Not Displaying

```bash
# 1. Verify API returns data
TOKEN="your_token"
curl -H "Authorization: Bearer $TOKEN" \
  https://podcast-stories-production.up.railway.app/api/stories

# 2. Check database directly
node verify-admin-functionality.js

# 3. Create test data if needed
node create-actual-pending-story.js

# 4. Test with Puppeteer
node test-admin-final.js
```

### Scenario 3: Authentication Issues

```javascript
// Test token validity
async function testToken() {
  const token = "your_token_here";
  
  const response = await fetch('https://podcast-stories-production.up.railway.app/api/auth/verify', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    const user = await response.json();
    console.log('Token valid for:', user);
  } else {
    console.log('Token invalid:', response.status);
  }
}
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Puppeteer won't install
```bash
# Solution 1: Clear npm cache
npm cache clean --force
npm install puppeteer

# Solution 2: Use specific version
npm install puppeteer@19.0.0

# Solution 3: Skip Chromium download (use system Chrome)
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install puppeteer
```

#### Issue: Tests timeout
```javascript
// Increase timeout in Puppeteer
page.setDefaultTimeout(30000); // 30 seconds
page.setDefaultNavigationTimeout(30000);

// Add explicit waits
await page.waitForSelector('#element', { timeout: 10000 });
await page.waitForNavigation({ waitUntil: 'networkidle2' });
```

#### Issue: Can't find elements
```javascript
// Wait for elements before interacting
await page.waitForSelector('#tagsList', { visible: true });

// Use more specific selectors
const button = await page.$('button.tab-button[data-tab="tags"]');

// Check if element exists before clicking
if (await page.$('#element')) {
  await page.click('#element');
}
```

#### Issue: Authentication fails in tests
```javascript
// Clear storage before each test
await page.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// Add delay after login
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);
await page.waitForNavigation();
```

---

## Best Practices

### 1. Test Organization
- Keep test files in a `tests/` directory
- Name tests descriptively: `test-admin-approval-workflow.js`
- Use consistent naming: `test-*.js` for all test files

### 2. Test Data Management
- Create seed data scripts for consistent testing
- Clean up test data after tests
- Use unique identifiers for test data (e.g., "TEST_" prefix)

### 3. Error Handling
```javascript
try {
  // Test code
} catch (error) {
  console.error('Test failed:', error);
  // Take screenshot for debugging
  await page.screenshot({ path: 'error-screenshot.png' });
  throw error;
} finally {
  await browser.close();
}
```

### 4. Continuous Integration
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
```

---

## Conclusion

This testing guide provides comprehensive coverage of VidPOD's testing capabilities. The combination of API testing, browser automation, database verification, and custom debug tools ensures robust quality assurance.

**Key Takeaways:**
- Use **curl** for quick API checks
- Use **Puppeteer** for comprehensive UI testing
- Always verify **database state** when debugging
- Create **custom tools** for specific scenarios
- Document and maintain **test scripts** for repeatability

---

*Testing Guide Version: 1.0*  
*Created: August 18, 2025*  
*VidPOD Version: 2.1.0*