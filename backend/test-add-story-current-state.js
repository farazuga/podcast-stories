const puppeteer = require('puppeteer');

async function testCurrentAddStoryState() {
  console.log('🔍 Testing Current Add Story State (As Deployed)\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1200, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // Capture only relevant console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('tag') || text.includes('Tag') || text.includes('API') || text.includes('error') || text.includes('Error')) {
      console.log(`🔵 BROWSER: ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });
  
  try {
    console.log('Step 1: Login as teacher...');
    await page.goto('https://podcast-stories-production.up.railway.app');
    await page.type('#email', 'teacher@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log('Step 2: Navigate to Add Story page...');
    await page.goto('https://podcast-stories-production.up.railway.app/add-story.html');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait longer for JS to load
    
    console.log('Step 3: Check current state...');
    const currentState = await page.evaluate(() => {
      const tagsSelect = document.getElementById('tags');
      const form = document.getElementById('storyForm');
      
      return {
        pageTitle: document.title,
        tagsSelectExists: !!tagsSelect,
        tagsSelectOptions: tagsSelect ? tagsSelect.options.length : 0,
        formExists: !!form,
        hasAPIURL: typeof window.API_URL !== 'undefined',
        apiUrl: window.API_URL,
        hasToken: !!localStorage.getItem('token'),
        allTagsLength: typeof allTags !== 'undefined' ? allTags.length : 'undefined',
        loadTagsFunction: typeof loadTags === 'function',
        populateAddStoryTagsFunction: typeof populateAddStoryTags === 'function'
      };
    });
    
    console.log('\nCurrent Page State:');
    console.log(`  Page title: ${currentState.pageTitle}`);
    console.log(`  Form exists: ${currentState.formExists ? '✅' : '❌'}`);
    console.log(`  Tags select exists: ${currentState.tagsSelectExists ? '✅' : '❌'}`);
    console.log(`  Tags options count: ${currentState.tagsSelectOptions}`);
    console.log(`  Has API_URL: ${currentState.hasAPIURL ? '✅' : '❌'}`);
    console.log(`  API_URL value: ${currentState.apiUrl}`);
    console.log(`  Has auth token: ${currentState.hasToken ? '✅' : '❌'}`);
    console.log(`  allTags array length: ${currentState.allTagsLength}`);
    console.log(`  loadTags function: ${currentState.loadTagsFunction ? '✅' : '❌'}`);
    console.log(`  populateAddStoryTags function: ${currentState.populateAddStoryTagsFunction ? '✅' : '❌'}`);
    
    console.log('\nStep 4: Test manual tag loading...');
    const manualTagTest = await page.evaluate(async () => {
      try {
        console.log('Testing manual tag loading...');
        
        // First, let's call loadTags manually
        if (typeof loadTags === 'function') {
          await loadTags();
          console.log('loadTags function called');
        }
        
        // Then check if populateAddStoryTags works
        if (typeof populateAddStoryTags === 'function') {
          populateAddStoryTags();
          console.log('populateAddStoryTags function called');
        }
        
        const tagsSelect = document.getElementById('tags');
        return {
          success: true,
          optionsAfterLoad: tagsSelect ? tagsSelect.options.length : 0,
          allTagsAfterLoad: typeof allTags !== 'undefined' ? allTags.length : 'undefined',
          firstOption: tagsSelect && tagsSelect.options.length > 0 ? tagsSelect.options[0].text : 'no options'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    console.log('\nManual Tag Test Result:');
    if (manualTagTest.success) {
      console.log(`  ✅ Manual test completed`);
      console.log(`  Options after manual load: ${manualTagTest.optionsAfterLoad}`);
      console.log(`  allTags array after load: ${manualTagTest.allTagsAfterLoad}`);
      console.log(`  First option: ${manualTagTest.firstOption}`);
    } else {
      console.log(`  ❌ Manual test failed: ${manualTagTest.error}`);
    }
    
    console.log('\nStep 5: Try direct API call from browser...');
    const directAPITest = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = window.API_URL || 'https://podcast-stories-production.up.railway.app/api';
        
        const response = await fetch(`${apiUrl}/tags`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const tags = await response.json();
          
          // Try to manually populate the select
          const tagsSelect = document.getElementById('tags');
          if (tagsSelect) {
            tagsSelect.innerHTML = '';
            tags.forEach(tag => {
              const option = document.createElement('option');
              option.value = tag.tag_name;
              option.textContent = tag.tag_name;
              tagsSelect.appendChild(option);
            });
          }
          
          return {
            success: true,
            tagsCount: tags.length,
            selectPopulated: tagsSelect ? tagsSelect.options.length : 0
          };
        } else {
          return {
            success: false,
            status: response.status,
            statusText: response.statusText
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    console.log('\nDirect API Test Result:');
    if (directAPITest.success) {
      console.log(`  ✅ Direct API call successful`);
      console.log(`  Tags from API: ${directAPITest.tagsCount}`);
      console.log(`  Select populated: ${directAPITest.selectPopulated}`);
    } else {
      console.log(`  ❌ Direct API call failed: ${directAPITest.error || `${directAPITest.status} ${directAPITest.statusText}`}`);
    }
    
    console.log('\nStep 6: Final verification...');
    const finalState = await page.evaluate(() => {
      const tagsSelect = document.getElementById('tags');
      return {
        finalOptionsCount: tagsSelect ? tagsSelect.options.length : 0,
        sampleOptions: tagsSelect && tagsSelect.options.length > 0 ? 
          Array.from(tagsSelect.options).slice(0, 3).map(opt => opt.text) : []
      };
    });
    
    console.log(`\nFinal State:`);
    console.log(`  Final options count: ${finalState.finalOptionsCount}`);
    console.log(`  Sample options: ${finalState.sampleOptions.join(', ')}`);
    
    await page.screenshot({ path: 'add-story-current-state.png', fullPage: true });
    console.log('\n📸 Screenshot saved as add-story-current-state.png');
    
    console.log('\n🎯 SUMMARY:');
    if (finalState.finalOptionsCount > 0) {
      console.log('✅ Tags are now working on the add story page!');
    } else {
      console.log('❌ Tags are still not loading properly');
      
      console.log('\nDEBUG INFO:');
      console.log('- Check if page is actually loading stories.js');
      console.log('- Verify API_URL is defined without errors');
      console.log('- Confirm loadTags function is being called on page load');
      console.log('- Ensure populateAddStoryTags is working correctly');
    }
    
    console.log('\nPress Ctrl+C to close browser');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testCurrentAddStoryState();