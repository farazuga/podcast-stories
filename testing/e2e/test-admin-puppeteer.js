const puppeteer = require('puppeteer');

async function testAdminPanel() {
  console.log('🚀 Starting Puppeteer test for VidPOD Admin Panel...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Set to false to see the browser
    devtools: true,  // Open DevTools
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging from the page
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`🔴 BROWSER ERROR: ${text}`);
    } else if (type === 'warn') {
      console.log(`🟡 BROWSER WARN: ${text}`);
    } else {
      console.log(`🔵 BROWSER LOG: ${text}`);
    }
  });
  
  // Capture page errors
  page.on('pageerror', error => {
    console.log(`💥 PAGE ERROR: ${error.message}`);
  });
  
  try {
    // Step 1: Login first
    console.log('Step 1: Navigating to login page...');
    await page.goto('https://podcast-stories-production.up.railway.app/index.html', { 
      waitUntil: 'networkidle2' 
    });
    
    // Fill login form
    console.log('Step 2: Filling login form...');
    await page.type('#email', 'admin@vidpod.com');
    await page.type('#password', 'vidpod');
    
    // Submit login
    console.log('Step 3: Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to admin panel
    console.log('Step 4: Waiting for admin panel redirect...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    
    console.log('Current URL:', page.url());
    
    // If not redirected to admin, navigate manually
    if (!page.url().includes('admin.html')) {
      console.log('Step 5: Manually navigating to admin panel...');
      await page.goto('https://podcast-stories-production.up.railway.app/admin.html', { 
        waitUntil: 'networkidle2' 
      });
    }
    
    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 6: Check for DOM elements
    console.log('\nStep 6: Checking DOM elements...');
    
    const tagsList = await page.$('#tagsList');
    const storiesTable = await page.$('#storiesApprovalTable');
    const tabButtons = await page.$$('.tab-button');
    
    console.log(`Tags list element: ${tagsList ? '✅ Found' : '❌ Not found'}`);
    console.log(`Stories table element: ${storiesTable ? '✅ Found' : '❌ Not found'}`);
    console.log(`Tab buttons count: ${tabButtons.length}`);
    
    // Step 7: Check localStorage for auth data
    console.log('\nStep 7: Checking authentication data...');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const user = await page.evaluate(() => localStorage.getItem('user'));
    
    console.log(`Auth token: ${token ? '✅ Present' : '❌ Missing'}`);
    console.log(`User data: ${user ? '✅ Present' : '❌ Missing'}`);
    
    if (user) {
      const userData = JSON.parse(user);
      console.log(`User role: ${userData.role}`);
      console.log(`User email: ${userData.email}`);
    }
    
    // Step 8: Test API calls directly from browser
    console.log('\nStep 8: Testing API calls from browser...');
    
    const apiTests = await page.evaluate(async () => {
      const API_URL = 'https://podcast-stories-production.up.railway.app/api';
      const token = localStorage.getItem('token');
      const results = {};
      
      if (!token) {
        return { error: 'No auth token available' };
      }
      
      try {
        // Test Tags API
        const tagsResponse = await fetch(`${API_URL}/tags`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        results.tags = {
          status: tagsResponse.status,
          ok: tagsResponse.ok,
          data: tagsResponse.ok ? await tagsResponse.json() : await tagsResponse.text()
        };
      } catch (error) {
        results.tags = { error: error.message };
      }
      
      try {
        // Test Pending Stories API  
        const storiesResponse = await fetch(`${API_URL}/stories/admin/by-status/pending`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        results.stories = {
          status: storiesResponse.status,
          ok: storiesResponse.ok,
          data: storiesResponse.ok ? await storiesResponse.json() : await storiesResponse.text()
        };
      } catch (error) {
        results.stories = { error: error.message };
      }
      
      return results;
    });
    
    console.log('API Test Results:');
    console.log('Tags API:', apiTests.tags?.ok ? `✅ SUCCESS (${apiTests.tags.data?.length || 0} tags)` : `❌ FAILED: ${apiTests.tags?.error || apiTests.tags?.status}`);
    console.log('Stories API:', apiTests.stories?.ok ? `✅ SUCCESS (${apiTests.stories.data?.length || 0} stories)` : `❌ FAILED: ${apiTests.stories?.error || apiTests.stories?.status}`);
    
    // Step 9: Test JavaScript functions availability
    console.log('\nStep 9: Testing JavaScript functions...');
    
    const functionTests = await page.evaluate(() => {
      const functions = ['showTab', 'loadTags', 'loadStoriesForApproval', 'displayTags'];
      const results = {};
      
      functions.forEach(funcName => {
        results[funcName] = typeof window[funcName] === 'function';
      });
      
      return results;
    });
    
    Object.entries(functionTests).forEach(([funcName, exists]) => {
      console.log(`Function ${funcName}: ${exists ? '✅ Available' : '❌ Missing'}`);
    });
    
    // Step 10: Try to trigger data loading manually
    console.log('\nStep 10: Attempting to load data manually...');
    
    const manualLoad = await page.evaluate(async () => {
      const results = { logs: [] };
      
      // Try calling loadTags if it exists
      if (typeof window.loadTags === 'function') {
        try {
          results.logs.push('Calling window.loadTags()...');
          await window.loadTags();
          results.logs.push('✅ loadTags() completed');
        } catch (error) {
          results.logs.push(`❌ loadTags() error: ${error.message}`);
        }
      } else {
        results.logs.push('❌ window.loadTags() not available');
      }
      
      // Try calling loadStoriesForApproval if it exists
      if (typeof window.loadStoriesForApproval === 'function') {
        try {
          results.logs.push('Calling window.loadStoriesForApproval()...');
          await window.loadStoriesForApproval('pending');
          results.logs.push('✅ loadStoriesForApproval() completed');
        } catch (error) {
          results.logs.push(`❌ loadStoriesForApproval() error: ${error.message}`);
        }
      } else {
        results.logs.push('❌ window.loadStoriesForApproval() not available');
      }
      
      return results;
    });
    
    manualLoad.logs.forEach(log => console.log(log));
    
    // Step 11: Check if data actually populated in DOM
    console.log('\nStep 11: Checking if data populated in DOM...');
    
    const domContent = await page.evaluate(() => {
      const tagsList = document.getElementById('tagsList');
      const storiesTable = document.getElementById('storiesApprovalTable');
      
      return {
        tagsContent: tagsList ? tagsList.innerHTML.length : 0,
        storiesContent: storiesTable ? storiesTable.innerHTML.length : 0,
        tagsText: tagsList ? tagsList.textContent.substring(0, 100) : 'Element not found',
        storiesText: storiesTable ? storiesTable.textContent.substring(0, 100) : 'Element not found'
      };
    });
    
    console.log(`Tags content length: ${domContent.tagsContent} characters`);
    console.log(`Stories content length: ${domContent.storiesContent} characters`);
    console.log(`Tags text preview: "${domContent.tagsText}"`);
    console.log(`Stories text preview: "${domContent.storiesText}"`);
    
    // Step 12: Take screenshot for debugging
    console.log('\nStep 12: Taking screenshot...');
    await page.screenshot({ 
      path: '/Users/faraz/Library/CloudStorage/OneDrive-Amitrace/Vibe/1_Test/podcast-stories/backend/admin-debug-screenshot.png',
      fullPage: true 
    });
    console.log('Screenshot saved as admin-debug-screenshot.png');
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Admin panel testing complete. Browser will stay open for manual inspection...');
    console.log('Press Ctrl+C to close when done inspecting.');
    
    // Wait indefinitely so user can inspect
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Uncomment this line if you want to auto-close browser
    // await browser.close();
  }
}

// Check if puppeteer is available
async function checkPuppeteer() {
  try {
    await testAdminPanel();
  } catch (error) {
    console.error('❌ Puppeteer test failed:', error.message);
    
    if (error.message.includes('Cannot find module')) {
      console.log('\n📦 Installing Puppeteer...');
      console.log('Run: npm install puppeteer');
    }
  }
}

checkPuppeteer();