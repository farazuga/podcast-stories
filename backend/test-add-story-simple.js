const puppeteer = require('puppeteer');

async function testAddStorySimple() {
  console.log('🔍 Simple Add Story Test\n');
  
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.text().includes('Loading') || msg.text().includes('tag') || msg.text().includes('Tag')) {
      console.log(`🔵 ${msg.text()}`);
    }
  });
  
  try {
    // Login and go to add story
    await page.goto('https://podcast-stories-production.up.railway.app');
    await page.type('#email', 'teacher@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    await page.goto('https://podcast-stories-production.up.railway.app/add-story.html');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check what scripts loaded and what's in console
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        scripts: Array.from(document.scripts).map(s => s.src.split('/').pop()),
        tagSelect: !!document.getElementById('tags'),
        tagOptions: document.getElementById('tags')?.options.length || 0,
        hasAPI_URL: typeof window.API_URL !== 'undefined',
        API_URL: window.API_URL,
        authToken: !!localStorage.getItem('token')
      };
    });
    
    console.log('Page Info:');
    console.log(`  Title: ${pageInfo.title}`);
    console.log(`  Scripts loaded: ${pageInfo.scripts.join(', ')}`);
    console.log(`  Tag select exists: ${pageInfo.tagSelect ? '✅' : '❌'}`);
    console.log(`  Tag options: ${pageInfo.tagOptions}`);
    console.log(`  Has API_URL: ${pageInfo.hasAPI_URL ? '✅' : '❌'}`);
    console.log(`  API_URL: ${pageInfo.API_URL}`);
    console.log(`  Has auth token: ${pageInfo.authToken ? '✅' : '❌'}`);
    
    // Manually try to load tags
    console.log('\nManually loading tags...');
    const manualTest = await page.evaluate(async () => {
      if (!window.API_URL) return { error: 'No API_URL' };
      
      const token = localStorage.getItem('token');
      if (!token) return { error: 'No token' };
      
      try {
        const response = await fetch(`${window.API_URL}/tags`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const tags = await response.json();
          
          // Try to populate the select
          const tagSelect = document.getElementById('tags');
          if (tagSelect) {
            tagSelect.innerHTML = '';
            tags.forEach(tag => {
              const option = document.createElement('option');
              option.value = tag.tag_name;
              option.textContent = tag.tag_name;
              tagSelect.appendChild(option);
            });
            
            return { success: true, count: tags.length, populated: tagSelect.options.length };
          }
          
          return { success: true, count: tags.length, populated: 0, noSelect: true };
        }
        
        return { error: 'API failed', status: response.status };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    if (manualTest.success) {
      console.log(`  ✅ Loaded ${manualTest.count} tags`);
      console.log(`  ✅ Populated ${manualTest.populated} options`);
    } else {
      console.log(`  ❌ Failed: ${manualTest.error}`);
    }
    
    await page.screenshot({ path: 'add-story-simple-test.png' });
    
    console.log('\nPress Ctrl+C to close browser');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAddStorySimple();