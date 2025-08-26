const puppeteer = require('puppeteer');

async function testDashboardStories() {
  console.log('🔍 Testing Dashboard Browse Stories...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('stories') || text.includes('Stories') || text.includes('API') || text.includes('Error')) {
      console.log(`🔵 BROWSER: ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });
  
  try {
    // Step 1: Login as student
    console.log('Step 1: Login as student...');
    await page.goto('https://podcast-stories-production.up.railway.app');
    await page.type('#email', 'student@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    
    console.log('Step 2: Waiting for dashboard...');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    console.log(`Redirected correctly: ${currentUrl.includes('dashboard.html') ? '✅' : '❌'}`);
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Check for story elements
    console.log('\nStep 3: Checking for stories in DOM...');
    
    const storiesInfo = await page.evaluate(() => {
      // Check for stories container
      const storiesGrid = document.getElementById('storiesGrid');
      const storyCards = document.querySelectorAll('.story-card');
      const noStoriesMessage = document.querySelector('.no-stories');
      
      return {
        gridExists: !!storiesGrid,
        gridHTML: storiesGrid ? storiesGrid.innerHTML.length : 0,
        gridText: storiesGrid ? storiesGrid.textContent.substring(0, 200) : 'Not found',
        storyCardsCount: storyCards.length,
        noStoriesMessage: noStoriesMessage ? noStoriesMessage.textContent : null,
        firstStoryTitle: storyCards.length > 0 ? storyCards[0].querySelector('h3')?.textContent : null
      };
    });
    
    console.log('DOM Analysis:');
    console.log(`  Stories grid exists: ${storiesInfo.gridExists ? '✅' : '❌'}`);
    console.log(`  Grid HTML length: ${storiesInfo.gridHTML} characters`);
    console.log(`  Story cards found: ${storiesInfo.storyCardsCount}`);
    console.log(`  No stories message: ${storiesInfo.noStoriesMessage || 'Not shown'}`);
    console.log(`  First story title: ${storiesInfo.firstStoryTitle || 'None'}`);
    console.log(`  Grid text preview: "${storiesInfo.gridText}"`);
    
    // Step 4: Test API directly from browser
    console.log('\nStep 4: Testing stories API from browser...');
    
    const apiTest = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (!token) {
        return { error: 'No authentication token found' };
      }
      
      try {
        const response = await fetch('https://podcast-stories-production.up.railway.app/api/stories', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const stories = await response.json();
          return {
            success: true,
            count: stories.length,
            statuses: stories.map(s => s.approval_status),
            titles: stories.slice(0, 3).map(s => s.idea_title),
            user: user ? JSON.parse(user) : null
          };
        } else {
          return {
            success: false,
            status: response.status,
            error: await response.text()
          };
        }
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('API Test Results:');
    if (apiTest.success) {
      console.log(`  ✅ API returned ${apiTest.count} stories`);
      console.log(`  Story statuses: ${[...new Set(apiTest.statuses)].join(', ')}`);
      console.log(`  First 3 titles: ${apiTest.titles.join(', ')}`);
      console.log(`  Logged in as: ${apiTest.user?.email} (${apiTest.user?.role})`);
    } else {
      console.log(`  ❌ API failed: ${apiTest.error || apiTest.status}`);
    }
    
    // Step 5: Check for JavaScript errors
    console.log('\nStep 5: Checking JavaScript functions...');
    
    const jsCheck = await page.evaluate(() => {
      const results = {
        loadStoriesFunction: typeof window.loadStories === 'function',
        displayStoriesFunction: typeof window.displayStories === 'function',
        API_URL: window.API_URL || 'Not defined',
        localStorage: {
          token: !!localStorage.getItem('token'),
          user: !!localStorage.getItem('user')
        }
      };
      
      // Try to find the loadStories function in dashboard.js
      if (window.loadStories) {
        try {
          // Check if it's been called
          results.loadStoriesCalled = true;
        } catch (e) {
          results.loadStoriesError = e.message;
        }
      }
      
      return results;
    });
    
    console.log('JavaScript Check:');
    console.log(`  loadStories function: ${jsCheck.loadStoriesFunction ? '✅' : '❌'}`);
    console.log(`  displayStories function: ${jsCheck.displayStoriesFunction ? '✅' : '❌'}`);
    console.log(`  API_URL: ${jsCheck.API_URL}`);
    console.log(`  Token in localStorage: ${jsCheck.localStorage.token ? '✅' : '❌'}`);
    console.log(`  User in localStorage: ${jsCheck.localStorage.user ? '✅' : '❌'}`);
    
    // Step 6: Try to manually load stories
    console.log('\nStep 6: Attempting to manually load stories...');
    
    const manualLoad = await page.evaluate(async () => {
      const API_URL = 'https://podcast-stories-production.up.railway.app/api';
      const token = localStorage.getItem('token');
      
      try {
        const response = await fetch(`${API_URL}/stories`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const stories = await response.json();
          
          // Try to display them manually
          const storiesGrid = document.getElementById('storiesGrid');
          if (storiesGrid && stories.length > 0) {
            storiesGrid.innerHTML = stories.map(story => `
              <div class="story-card">
                <h3>${story.idea_title}</h3>
                <p>${story.idea_description || 'No description'}</p>
                <p>Status: ${story.approval_status}</p>
              </div>
            `).join('');
            
            return { success: true, displayed: stories.length };
          }
          
          return { success: false, reason: 'No grid element or no stories' };
        }
        
        return { success: false, status: response.status };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    if (manualLoad.success) {
      console.log(`  ✅ Manually displayed ${manualLoad.displayed} stories`);
    } else {
      console.log(`  ❌ Manual load failed: ${manualLoad.reason || manualLoad.error}`);
    }
    
    // Step 7: Check for approved stories specifically
    console.log('\nStep 7: Checking for approved stories...');
    
    const approvedCheck = await page.evaluate(async () => {
      const API_URL = 'https://podcast-stories-production.up.railway.app/api';
      const token = localStorage.getItem('token');
      
      try {
        const response = await fetch(`${API_URL}/stories`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const stories = await response.json();
          const approved = stories.filter(s => s.approval_status === 'approved');
          const pending = stories.filter(s => s.approval_status === 'pending');
          const rejected = stories.filter(s => s.approval_status === 'rejected');
          
          return {
            total: stories.length,
            approved: approved.length,
            pending: pending.length,
            rejected: rejected.length,
            approvedTitles: approved.map(s => s.idea_title)
          };
        }
        
        return { error: 'API call failed' };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('Story Status Breakdown:');
    console.log(`  Total stories: ${approvedCheck.total}`);
    console.log(`  Approved: ${approvedCheck.approved}`);
    console.log(`  Pending: ${approvedCheck.pending}`);
    console.log(`  Rejected: ${approvedCheck.rejected}`);
    if (approvedCheck.approvedTitles) {
      console.log(`  Approved titles: ${approvedCheck.approvedTitles.join(', ')}`);
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: 'dashboard-stories-test.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as dashboard-stories-test.png');
    
    console.log('\n🔍 TEST SUMMARY:');
    console.log(`Stories in DOM: ${storiesInfo.storyCardsCount > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`API returns stories: ${apiTest.count > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`Approved stories exist: ${approvedCheck.approved > 0 ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n🔍 Browser staying open for inspection. Press Ctrl+C to close.');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    // await browser.close();
  }
}

testDashboardStories();