const puppeteer = require('puppeteer');

async function testStoriesPage() {
  console.log('🔍 Testing Browse Stories Page...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => console.log(`🔵 BROWSER: ${msg.text()}`));
  page.on('pageerror', error => console.log(`❌ ERROR: ${error.message}`));
  
  try {
    // Step 1: Login
    console.log('Step 1: Login as student...');
    await page.goto('https://podcast-stories-production.up.railway.app');
    await page.type('#email', 'student@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    // Step 2: Navigate to Browse Stories
    console.log('Step 2: Navigate to Browse Stories page...');
    await page.goto('https://podcast-stories-production.up.railway.app/stories.html');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Check page loaded
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);
    
    // Step 4: Check for stories
    console.log('\nStep 4: Checking for stories...');
    
    const storiesInfo = await page.evaluate(() => {
      const storiesGrid = document.getElementById('storiesGrid');
      const storyCards = document.querySelectorAll('.story-card');
      const searchInput = document.getElementById('searchInput');
      const filters = document.querySelectorAll('select, input[type="date"]');
      
      const stories = Array.from(storyCards).map(card => ({
        title: card.querySelector('h3')?.textContent,
        description: card.querySelector('p')?.textContent?.substring(0, 50)
      }));
      
      return {
        gridExists: !!storiesGrid,
        gridHTML: storiesGrid ? storiesGrid.innerHTML.length : 0,
        storyCount: storyCards.length,
        stories: stories.slice(0, 3),
        searchExists: !!searchInput,
        filterCount: filters.length
      };
    });
    
    console.log('Page Analysis:');
    console.log(`  Stories grid exists: ${storiesInfo.gridExists ? '✅' : '❌'}`);
    console.log(`  Grid HTML length: ${storiesInfo.gridHTML} characters`);
    console.log(`  Story cards found: ${storiesInfo.storyCount}`);
    console.log(`  Search bar exists: ${storiesInfo.searchExists ? '✅' : '❌'}`);
    console.log(`  Filter elements: ${storiesInfo.filterCount}`);
    
    if (storiesInfo.stories.length > 0) {
      console.log('\n  First 3 stories:');
      storiesInfo.stories.forEach((story, i) => {
        console.log(`    ${i+1}. "${story.title}"`);
      });
    }
    
    // Step 5: Test API directly
    console.log('\nStep 5: Testing API from stories page...');
    
    const apiTest = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      
      try {
        const response = await fetch('https://podcast-stories-production.up.railway.app/api/stories', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const stories = await response.json();
          return {
            success: true,
            count: stories.length,
            approvedCount: stories.filter(s => s.approval_status === 'approved').length
          };
        }
        return { success: false, status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('API Test:');
    console.log(`  API returns: ${apiTest.count} total stories`);
    console.log(`  Approved stories: ${apiTest.approvedCount}`);
    
    // Step 6: Check JavaScript functions
    console.log('\nStep 6: Checking JavaScript functions...');
    
    const jsCheck = await page.evaluate(() => {
      return {
        loadStories: typeof window.loadStories === 'function',
        displayStories: typeof window.displayStories === 'function',
        searchStories: typeof window.searchStories === 'function',
        API_URL: window.API_URL || 'Not defined'
      };
    });
    
    console.log('JavaScript Functions:');
    Object.entries(jsCheck).forEach(([key, value]) => {
      if (key === 'API_URL') {
        console.log(`  ${key}: ${value}`);
      } else {
        console.log(`  ${key}: ${value ? '✅' : '❌'}`);
      }
    });
    
    // Step 7: Try to manually load stories if not showing
    if (storiesInfo.storyCount === 0) {
      console.log('\nStep 7: Attempting manual story load...');
      
      const manualLoad = await page.evaluate(async () => {
        const API_URL = 'https://podcast-stories-production.up.railway.app/api';
        const token = localStorage.getItem('token');
        
        try {
          const response = await fetch(`${API_URL}/stories`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const stories = await response.json();
            const approved = stories.filter(s => s.approval_status === 'approved');
            
            const storiesGrid = document.getElementById('storiesGrid');
            if (storiesGrid) {
              storiesGrid.innerHTML = approved.map(story => `
                <div class="story-card">
                  <h3>${story.idea_title}</h3>
                  <p>${story.idea_description || 'No description'}</p>
                </div>
              `).join('');
              
              return { success: true, displayed: approved.length };
            }
          }
        } catch (error) {
          return { error: error.message };
        }
      });
      
      if (manualLoad?.success) {
        console.log(`  ✅ Manually displayed ${manualLoad.displayed} stories`);
      } else {
        console.log(`  ❌ Manual load failed: ${manualLoad?.error}`);
      }
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: 'stories-page-test.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as stories-page-test.png');
    
    console.log('\n🎯 TEST SUMMARY:');
    console.log(`Stories displayed: ${storiesInfo.storyCount > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`API working: ${apiTest.success ? '✅ YES' : '❌ NO'}`);
    console.log(`Page functional: ${storiesInfo.gridExists && storiesInfo.searchExists ? '✅ YES' : '⚠️ PARTIAL'}`);
    
    console.log('\nBrowser staying open. Press Ctrl+C to close.');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testStoriesPage();