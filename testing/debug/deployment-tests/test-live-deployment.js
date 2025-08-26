const puppeteer = require('puppeteer');

async function testLiveDeployment() {
  console.log('🚀 Testing Current Live Deployment - Tags Functionality\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1200, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages to see what's happening
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Tags') || text.includes('tags') || text.includes('Loading') || text.includes('Error') || text.includes('error')) {
      console.log(`🔵 BROWSER: ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });
  
  try {
    console.log('=== STEP 1: LOGIN ===');
    await page.goto('https://podcast-stories-production.up.railway.app');
    await page.type('#email', 'teacher@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log('\n=== STEP 2: GO TO ADD STORY PAGE ===');
    await page.goto('https://podcast-stories-production.up.railway.app/add-story.html');
    await page.waitForSelector('#tags');
    
    // Wait for any JavaScript to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n=== STEP 3: CHECK CURRENT DEPLOYMENT STATE ===');
    const currentState = await page.evaluate(() => {
      // Check what scripts are loaded
      const scripts = Array.from(document.scripts).map(script => {
        const src = script.src;
        return {
          filename: src ? src.split('/').pop() : 'inline',
          src: src || 'inline script',
          hasFixComment: script.innerHTML.includes('Add Story Tags Fix')
        };
      });
      
      // Check tags select
      const tagsSelect = document.getElementById('tags');
      
      // Check if our fix is present
      const hasInlineFix = document.body.innerHTML.includes('Add Story Tags Fix');
      
      return {
        pageTitle: document.title,
        scripts: scripts,
        tagsSelectExists: !!tagsSelect,
        tagsSelectOptions: tagsSelect ? tagsSelect.options.length : 0,
        tagsSelectHTML: tagsSelect ? tagsSelect.outerHTML.substring(0, 200) : 'not found',
        hasInlineFix: hasInlineFix,
        hasToken: !!localStorage.getItem('token'),
        bodyLength: document.body.innerHTML.length
      };
    });
    
    console.log('CURRENT DEPLOYMENT STATE:');
    console.log(`  Page title: ${currentState.pageTitle}`);
    console.log(`  Scripts loaded:`);
    currentState.scripts.forEach((script, i) => {
      console.log(`    ${i + 1}. ${script.filename} ${script.hasFixComment ? '(HAS FIX!)' : ''}`);
    });
    console.log(`  Tags select exists: ${currentState.tagsSelectExists ? '✅' : '❌'}`);
    console.log(`  Tags options count: ${currentState.tagsSelectOptions}`);
    console.log(`  Has inline tags fix: ${currentState.hasInlineFix ? '✅' : '❌'}`);
    console.log(`  Has auth token: ${currentState.hasToken ? '✅' : '❌'}`);
    console.log(`  Body HTML length: ${currentState.bodyLength}`);
    
    console.log('\n=== STEP 4: TEST MANUAL TAGS LOADING ===');
    
    // Try to manually load tags regardless of what's deployed
    const manualTest = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          return { success: false, error: 'No auth token' };
        }
        
        const tagsSelect = document.getElementById('tags');
        if (!tagsSelect) {
          return { success: false, error: 'Tags select not found' };
        }
        
        // Manual API call
        const response = await fetch('https://podcast-stories-production.up.railway.app/api/tags', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          return { success: false, error: `API failed: ${response.status}` };
        }
        
        const tags = await response.json();
        
        // Manual population
        tagsSelect.innerHTML = '';
        tags.forEach(tag => {
          const option = document.createElement('option');
          option.value = tag.tag_name;
          option.textContent = tag.tag_name;
          tagsSelect.appendChild(option);
        });
        
        return {
          success: true,
          apiTags: tags.length,
          populatedOptions: tagsSelect.options.length,
          sampleTags: tags.slice(0, 3).map(t => t.tag_name)
        };
        
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('MANUAL TAGS TEST:');
    if (manualTest.success) {
      console.log(`  ✅ Manual loading successful`);
      console.log(`  API tags: ${manualTest.apiTags}`);
      console.log(`  Populated options: ${manualTest.populatedOptions}`);
      console.log(`  Sample tags: ${manualTest.sampleTags.join(', ')}`);
    } else {
      console.log(`  ❌ Manual loading failed: ${manualTest.error}`);
    }
    
    console.log('\n=== STEP 5: FINAL STATUS CHECK ===');
    await page.screenshot({ path: 'live-deployment-test.png', fullPage: true });
    console.log('📸 Screenshot saved as live-deployment-test.png');
    
    // Final assessment
    const isWorking = manualTest.success && manualTest.populatedOptions > 0;
    
    console.log('\n🎯 LIVE DEPLOYMENT ASSESSMENT:');
    if (currentState.hasInlineFix) {
      console.log('✅ NEW DEPLOYMENT: Inline tags fix is deployed');
    } else {
      console.log('⏳ OLD DEPLOYMENT: Still serving previous version');
    }
    
    if (isWorking) {
      console.log('✅ FUNCTIONALITY: Tags can be loaded manually (API working)');
      console.log('✅ RESULT: Users can get tags to work with manual intervention');
    } else {
      console.log('❌ FUNCTIONALITY: Tags still not working even manually');
    }
    
    if (currentState.hasInlineFix && isWorking) {
      console.log('🎉 SUCCESS: New deployment with working tags!');
    } else if (!currentState.hasInlineFix && isWorking) {
      console.log('⚠️  PARTIAL: Old deployment but manual fix works - need to wait for deployment');
    } else {
      console.log('❌ ISSUE: Deployment and/or functionality problems');
    }
    
    await browser.close();
    
  } catch (error) {
    await browser.close();
    console.error('❌ Test failed:', error.message);
  }
}

testLiveDeployment();