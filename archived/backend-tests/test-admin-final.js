const puppeteer = require('puppeteer');

async function testAdminFinal() {
  console.log('🎯 FINAL TEST: Admin Panel with Real Pending Stories...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (text.includes('Admin Debug') || text.includes('Stories loaded') || text.includes('API response')) {
      console.log(`🔵 ${text}`);
    }
  });
  
  try {
    // Login
    console.log('Step 1: Login...');
    await page.goto('https://podcast-stories-production.up.railway.app/index.html');
    await page.type('#email', 'admin@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log('Step 2: Navigate to admin panel...');
    if (!page.url().includes('admin.html')) {
      await page.goto('https://podcast-stories-production.up.railway.app/admin.html');
    }
    
    // Wait for page load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Step 3: Click Story Approval tab...');
    await page.evaluate(() => {
      window.showTab('stories');
    });
    
    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Step 4: Check pending stories in DOM...');
    const storiesResult = await page.evaluate(() => {
      const storiesTable = document.getElementById('storiesApprovalTable');
      if (!storiesTable) return { error: 'Stories table not found' };
      
      const rows = storiesTable.querySelectorAll('tr');
      const stories = [];
      
      rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          stories.push({
            id: cells[0]?.textContent?.trim(),
            title: cells[1]?.textContent?.trim(),
            status: cells[2]?.textContent?.trim(),
            author: cells[3]?.textContent?.trim()
          });
        }
      });
      
      return {
        tableHTML: storiesTable.innerHTML.length,
        tableText: storiesTable.textContent.substring(0, 200),
        rowCount: rows.length,
        stories: stories
      };
    });
    
    console.log('\n✅ STORIES APPROVAL RESULTS:');
    console.log(`Stories table HTML length: ${storiesResult.tableHTML} characters`);
    console.log(`Stories table rows: ${storiesResult.rowCount}`);
    console.log(`Stories found: ${storiesResult.stories?.length || 0}`);
    
    if (storiesResult.stories && storiesResult.stories.length > 0) {
      console.log('\n📋 PENDING STORIES IN ADMIN PANEL:');
      storiesResult.stories.forEach((story, index) => {
        console.log(`  ${index + 1}. ID ${story.id}: "${story.title}" - ${story.status} by ${story.author}`);
      });
    } else {
      console.log(`❌ No stories found in table. Table content: "${storiesResult.tableText}"`);
    }
    
    console.log('Step 5: Check Tags tab...');
    await page.evaluate(() => {
      window.showTab('tags');
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const tagsResult = await page.evaluate(() => {
      const tagsList = document.getElementById('tagsList');
      if (!tagsList) return { error: 'Tags list not found' };
      
      const tagElements = tagsList.querySelectorAll('.tag-item');
      const tags = [];
      
      tagElements.forEach(tag => {
        const nameEl = tag.querySelector('.tag-name');
        if (nameEl) {
          tags.push(nameEl.textContent.trim());
        }
      });
      
      return {
        tagsHTML: tagsList.innerHTML.length,
        tagsCount: tagElements.length,
        tags: tags.slice(0, 5) // First 5 tags
      };
    });
    
    console.log('\n✅ TAGS RESULTS:');
    console.log(`Tags HTML length: ${tagsResult.tagsHTML} characters`);
    console.log(`Tags count: ${tagsResult.tagsCount}`);
    console.log(`First 5 tags: ${tagsResult.tags?.join(', ')}`);
    
    // Test API calls directly
    console.log('\nStep 6: Direct API verification...');
    const apiVerification = await page.evaluate(async () => {
      const API_URL = 'https://podcast-stories-production.up.railway.app/api';
      const token = localStorage.getItem('token');
      
      try {
        const [tagsResponse, pendingResponse] = await Promise.all([
          fetch(`${API_URL}/tags`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${API_URL}/stories/admin/by-status/pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        const tagsData = await tagsResponse.json();
        const pendingData = await pendingResponse.json();
        
        return {
          tags: { count: tagsData.length, success: tagsResponse.ok },
          pending: { count: pendingData.length, success: pendingResponse.ok },
          firstPending: pendingData.length > 0 ? pendingData[0].idea_title : 'None'
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('🔍 API VERIFICATION:');
    console.log(`Tags API: ${apiVerification.tags?.success ? `✅ ${apiVerification.tags.count} tags` : '❌ Failed'}`);
    console.log(`Pending API: ${apiVerification.pending?.success ? `✅ ${apiVerification.pending.count} stories` : '❌ Failed'}`);
    console.log(`First pending: ${apiVerification.firstPending}`);
    
    console.log('\n🎯 FINAL TEST SUMMARY:');
    console.log(`Tags working: ${tagsResult.tagsCount > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`Stories working: ${storiesResult.stories?.length > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`Admin panel functional: ${tagsResult.tagsCount > 0 && storiesResult.stories?.length > 0 ? '✅ FULLY WORKING' : '⚠️ PARTIALLY WORKING'}`);
    
    // Take a screenshot
    await page.screenshot({ 
      path: '/Users/faraz/Library/CloudStorage/OneDrive-Amitrace/Vibe/1_Test/podcast-stories/backend/admin-final-test.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as admin-final-test.png');
    
    console.log('\n🎉 TEST COMPLETE! Browser will stay open for inspection...');
    console.log('Press Ctrl+C to close.');
    
    // Keep browser open
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Final test failed:', error.message);
  } finally {
    // await browser.close();
  }
}

testAdminFinal();