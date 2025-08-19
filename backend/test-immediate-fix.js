const puppeteer = require('puppeteer');

async function testImmediateFix() {
  console.log('🔧 Testing Immediate Tags Fix Deployment\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1200, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // Capture console messages from our fix
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Add Story Tags Fix') || text.includes('✅') || text.includes('❌') || text.includes('🔧') || text.includes('🎉')) {
      console.log(`🔵 BROWSER: ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });
  
  try {
    console.log('=== STEP 1: LOGIN AS TEACHER ===');
    await page.goto('https://podcast-stories-production.up.railway.app');
    await page.type('#email', 'teacher@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✅ Login completed');
    
    console.log('\n=== STEP 2: NAVIGATE TO ADD STORY PAGE ===');
    await page.goto('https://podcast-stories-production.up.railway.app/add-story.html');
    await page.waitForSelector('#tags');
    console.log('✅ Add story page loaded');
    
    console.log('\n=== STEP 3: WAIT FOR IMMEDIATE FIX TO RUN ===');
    // Wait for the fix script to execute (it has a 2 second delay)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n=== STEP 4: CHECK TAGS STATE ===');
    const tagsState = await page.evaluate(() => {
      const tagsSelect = document.getElementById('tags');
      const successMessage = document.querySelector('div[style*="position: fixed"][style*="background: #4CAF50"]');
      
      return {
        tagsSelectExists: !!tagsSelect,
        optionsCount: tagsSelect ? tagsSelect.options.length : 0,
        firstFiveTags: tagsSelect && tagsSelect.options.length > 0 ? 
          Array.from(tagsSelect.options).slice(0, 5).map(opt => opt.text) : [],
        successMessageVisible: !!successMessage,
        successMessageText: successMessage ? successMessage.textContent : null,
        selectHTML: tagsSelect ? tagsSelect.outerHTML.substring(0, 300) : 'not found'
      };
    });
    
    console.log('TAGS STATE CHECK:');
    console.log(`  Tags select exists: ${tagsState.tagsSelectExists ? '✅' : '❌'}`);
    console.log(`  Options count: ${tagsState.optionsCount}`);
    console.log(`  Success message visible: ${tagsState.successMessageVisible ? '✅' : '❌'}`);
    console.log(`  Success message text: ${tagsState.successMessageText || 'None'}`);
    
    if (tagsState.optionsCount > 0) {
      console.log(`  First 5 tags: ${tagsState.firstFiveTags.join(', ')}`);
    }
    
    console.log('\n=== STEP 5: TEST TAG SELECTION ===');
    if (tagsState.optionsCount > 0) {
      const selectionResult = await page.evaluate(() => {
        const tagsSelect = document.getElementById('tags');
        if (!tagsSelect || tagsSelect.options.length === 0) {
          return { success: false, error: 'No tags available' };
        }
        
        // Select first 3 tags
        for (let i = 0; i < Math.min(3, tagsSelect.options.length); i++) {
          tagsSelect.options[i].selected = true;
        }
        
        return {
          success: true,
          selectedCount: tagsSelect.selectedOptions.length,
          selectedTags: Array.from(tagsSelect.selectedOptions).map(opt => opt.text)
        };
      });
      
      if (selectionResult.success) {
        console.log(`  ✅ Selection successful: ${selectionResult.selectedCount} tags selected`);
        console.log(`  Selected tags: ${selectionResult.selectedTags.join(', ')}`);
      } else {
        console.log(`  ❌ Selection failed: ${selectionResult.error}`);
      }
    } else {
      console.log('  ⏭️ Skipping selection test - no tags available');
    }
    
    console.log('\n=== STEP 6: FINAL VERIFICATION ===');
    await page.screenshot({ path: 'immediate-fix-test.png', fullPage: true });
    console.log('📸 Screenshot saved as immediate-fix-test.png');
    
    // Final status
    console.log('\n🎯 IMMEDIATE FIX TEST RESULTS:');
    
    if (tagsState.optionsCount > 0) {
      console.log('🎉 SUCCESS: IMMEDIATE FIX IS WORKING!');
      console.log('✅ Tags are now automatically loading on the add story page');
      console.log('✅ Users can select tags when creating stories');
      console.log(`✅ ${tagsState.optionsCount} tags available for selection`);
      
      if (tagsState.successMessageVisible) {
        console.log('✅ User feedback message is working');
      }
    } else {
      console.log('❌ IMMEDIATE FIX NOT WORKING YET');
      console.log('This could mean:');
      console.log('- Deployment still in progress');
      console.log('- API authentication issue');
      console.log('- JavaScript error preventing execution');
    }
    
    await browser.close();
    
  } catch (error) {
    await browser.close();
    console.error('❌ Test failed:', error.message);
  }
}

testImmediateFix();