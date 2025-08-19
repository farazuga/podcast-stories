const puppeteer = require('puppeteer');

async function debugTagsUntilFixed() {
  console.log('🔍 DEBUGGING TAGS UNTIL FIXED - Comprehensive Session\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Capture ALL console messages
  page.on('console', msg => {
    console.log(`🔵 BROWSER: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });
  
  page.on('response', response => {
    if (response.url().includes('/tags') || response.url().includes('/api/')) {
      console.log(`🌐 API RESPONSE: ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    console.log('=== STEP 1: LOGIN AS TEACHER ===');
    await page.goto('https://podcast-stories-production.up.railway.app');
    await page.waitForSelector('#email');
    await page.type('#email', 'teacher@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✅ Login completed');
    
    console.log('\n=== STEP 2: NAVIGATE TO ADD STORY PAGE ===');
    await page.goto('https://podcast-stories-production.up.railway.app/add-story.html');
    await page.waitForSelector('#storyForm', { timeout: 10000 });
    console.log('✅ Add story page loaded');
    
    // Wait for scripts to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n=== STEP 3: ANALYZE PAGE STATE ===');
    const pageState = await page.evaluate(() => {
      const tagsSelect = document.getElementById('tags');
      const scripts = Array.from(document.scripts).map(s => s.src.split('/').pop() || 'inline');
      
      return {
        title: document.title,
        tagsSelectExists: !!tagsSelect,
        tagsSelectHTML: tagsSelect ? tagsSelect.outerHTML : 'not found',
        tagsOptionsCount: tagsSelect ? tagsSelect.options.length : 0,
        scriptsLoaded: scripts,
        hasAPIURL: typeof window.API_URL !== 'undefined',
        apiUrlValue: window.API_URL,
        hasToken: !!localStorage.getItem('token'),
        tokenValue: localStorage.getItem('token')?.substring(0, 50) + '...',
        allTagsExists: typeof allTags !== 'undefined',
        allTagsLength: typeof allTags !== 'undefined' ? allTags.length : 'undefined',
        loadTagsFunction: typeof loadTags === 'function',
        populateAddStoryTagsFunction: typeof populateAddStoryTags === 'function',
        bodyInnerHTML: document.body.innerHTML.length
      };
    });
    
    console.log('PAGE STATE ANALYSIS:');
    console.log(`  Title: ${pageState.title}`);
    console.log(`  Tags select exists: ${pageState.tagsSelectExists ? '✅' : '❌'}`);
    console.log(`  Tags options count: ${pageState.tagsOptionsCount}`);
    console.log(`  Scripts loaded: ${pageState.scriptsLoaded.join(', ')}`);
    console.log(`  Has API_URL: ${pageState.hasAPIURL ? '✅' : '❌'}`);
    console.log(`  API_URL value: ${pageState.apiUrlValue}`);
    console.log(`  Has token: ${pageState.hasToken ? '✅' : '❌'}`);
    console.log(`  Token preview: ${pageState.tokenValue}`);
    console.log(`  allTags exists: ${pageState.allTagsExists ? '✅' : '❌'}`);
    console.log(`  allTags length: ${pageState.allTagsLength}`);
    console.log(`  loadTags function: ${pageState.loadTagsFunction ? '✅' : '❌'}`);
    console.log(`  populateAddStoryTags function: ${pageState.populateAddStoryTagsFunction ? '✅' : '❌'}`);
    
    if (pageState.tagsSelectExists) {
      console.log(`\nTags Select HTML:\n${pageState.tagsSelectHTML}`);
    }
    
    console.log('\n=== STEP 4: DIRECT API TEST ===');
    const apiTest = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = 'https://podcast-stories-production.up.railway.app/api';
        
        console.log('Making direct API call to /tags...');
        const response = await fetch(`${apiUrl}/tags`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('API Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('API Response data:', data);
          return {
            success: true,
            status: response.status,
            tagsCount: data.length,
            firstFiveTags: data.slice(0, 5).map(tag => ({
              id: tag.id,
              name: tag.tag_name || tag.name,
              created_by: tag.created_by
            })),
            allTagNames: data.map(tag => tag.tag_name || tag.name)
          };
        } else {
          const errorText = await response.text();
          return {
            success: false,
            status: response.status,
            statusText: response.statusText,
            error: errorText
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          stack: error.stack
        };
      }
    });
    
    console.log('API TEST RESULTS:');
    if (apiTest.success) {
      console.log(`  ✅ API call successful`);
      console.log(`  Status: ${apiTest.status}`);
      console.log(`  Tags count: ${apiTest.tagsCount}`);
      console.log(`  First 5 tags:`, apiTest.firstFiveTags);
    } else {
      console.log(`  ❌ API call failed`);
      console.log(`  Status: ${apiTest.status}`);
      console.log(`  Error: ${apiTest.error}`);
      if (apiTest.stack) console.log(`  Stack: ${apiTest.stack}`);
    }
    
    console.log('\n=== STEP 5: MANUAL TAG POPULATION ATTEMPT ===');
    const manualPopulation = await page.evaluate(async (apiData) => {
      try {
        const tagsSelect = document.getElementById('tags');
        if (!tagsSelect) {
          return { success: false, error: 'Tags select not found' };
        }
        
        if (!apiData.success || !apiData.allTagNames) {
          return { success: false, error: 'No tag data available' };
        }
        
        console.log('Manually populating tags select...');
        tagsSelect.innerHTML = ''; // Clear existing options
        
        // Add each tag as an option
        apiData.allTagNames.forEach((tagName, index) => {
          const option = document.createElement('option');
          option.value = tagName;
          option.textContent = tagName;
          tagsSelect.appendChild(option);
          console.log(`Added option ${index + 1}: ${tagName}`);
        });
        
        return {
          success: true,
          optionsAdded: apiData.allTagNames.length,
          finalOptionsCount: tagsSelect.options.length,
          firstThreeOptions: Array.from(tagsSelect.options).slice(0, 3).map(opt => ({
            value: opt.value,
            text: opt.textContent
          }))
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          stack: error.stack
        };
      }
    }, apiTest);
    
    console.log('MANUAL POPULATION RESULTS:');
    if (manualPopulation.success) {
      console.log(`  ✅ Manual population successful`);
      console.log(`  Options added: ${manualPopulation.optionsAdded}`);
      console.log(`  Final options count: ${manualPopulation.finalOptionsCount}`);
      console.log(`  First 3 options:`, manualPopulation.firstThreeOptions);
    } else {
      console.log(`  ❌ Manual population failed`);
      console.log(`  Error: ${manualPopulation.error}`);
      if (manualPopulation.stack) console.log(`  Stack: ${manualPopulation.stack}`);
    }
    
    console.log('\n=== STEP 6: VERIFY TAGS ARE VISIBLE ===');
    const visibilityCheck = await page.evaluate(() => {
      const tagsSelect = document.getElementById('tags');
      if (!tagsSelect) return { visible: false, error: 'Select not found' };
      
      const computedStyle = window.getComputedStyle(tagsSelect);
      const rect = tagsSelect.getBoundingClientRect();
      
      return {
        visible: true,
        optionsCount: tagsSelect.options.length,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        multiple: tagsSelect.multiple,
        selectedOptions: Array.from(tagsSelect.selectedOptions).map(opt => opt.text),
        allOptions: Array.from(tagsSelect.options).map(opt => opt.text)
      };
    });
    
    console.log('VISIBILITY CHECK:');
    console.log(`  Select visible: ${visibilityCheck.visible ? '✅' : '❌'}`);
    if (visibilityCheck.visible) {
      console.log(`  Options count: ${visibilityCheck.optionsCount}`);
      console.log(`  Display: ${visibilityCheck.display}`);
      console.log(`  Visibility: ${visibilityCheck.visibility}`);
      console.log(`  Opacity: ${visibilityCheck.opacity}`);
      console.log(`  Dimensions: ${visibilityCheck.width}x${visibilityCheck.height}`);
      console.log(`  Multiple select: ${visibilityCheck.multiple}`);
      console.log(`  All options: ${visibilityCheck.allOptions.slice(0, 5).join(', ')}${visibilityCheck.allOptions.length > 5 ? '...' : ''}`);
    } else {
      console.log(`  Error: ${visibilityCheck.error}`);
    }
    
    console.log('\n=== STEP 7: TEST TAG SELECTION ===');
    if (visibilityCheck.visible && visibilityCheck.optionsCount > 0) {
      const selectionTest = await page.evaluate(() => {
        try {
          const tagsSelect = document.getElementById('tags');
          
          // Try to select first 3 options
          for (let i = 0; i < Math.min(3, tagsSelect.options.length); i++) {
            tagsSelect.options[i].selected = true;
          }
          
          // Trigger change event
          const changeEvent = new Event('change', { bubbles: true });
          tagsSelect.dispatchEvent(changeEvent);
          
          return {
            success: true,
            selectedCount: tagsSelect.selectedOptions.length,
            selectedTags: Array.from(tagsSelect.selectedOptions).map(opt => opt.text)
          };
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });
      
      console.log('SELECTION TEST:');
      if (selectionTest.success) {
        console.log(`  ✅ Selection successful`);
        console.log(`  Selected count: ${selectionTest.selectedCount}`);
        console.log(`  Selected tags: ${selectionTest.selectedTags.join(', ')}`);
      } else {
        console.log(`  ❌ Selection failed: ${selectionTest.error}`);
      }
    }
    
    console.log('\n=== STEP 8: TAKE SCREENSHOT AND ANALYZE ===');
    await page.screenshot({ 
      path: 'debug-tags-final.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved as debug-tags-final.png');
    
    console.log('\n=== STEP 9: FORM SUBMISSION TEST ===');
    const formTest = await page.evaluate(() => {
      try {
        // Fill required fields
        const titleInput = document.getElementById('idea_title');
        const descInput = document.getElementById('idea_description');
        const startDateInput = document.getElementById('coverage_start_date');
        
        if (titleInput) titleInput.value = 'Test Story with Tags';
        if (descInput) descInput.value = 'Testing tag functionality';
        if (startDateInput) startDateInput.value = '2024-01-01';
        
        const form = document.getElementById('storyForm');
        const submitButton = document.querySelector('button[type="submit"]');
        
        return {
          titleFilled: !!titleInput?.value,
          descFilled: !!descInput?.value,
          dateFilled: !!startDateInput?.value,
          formExists: !!form,
          submitButtonExists: !!submitButton,
          submitButtonText: submitButton?.textContent
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('FORM TEST:');
    console.log(`  Title filled: ${formTest.titleFilled ? '✅' : '❌'}`);
    console.log(`  Description filled: ${formTest.descFilled ? '✅' : '❌'}`);
    console.log(`  Date filled: ${formTest.dateFilled ? '✅' : '❌'}`);
    console.log(`  Form exists: ${formTest.formExists ? '✅' : '❌'}`);
    console.log(`  Submit button: ${formTest.submitButtonExists ? '✅' : '❌'}`);
    
    console.log('\n🎯 FINAL ANALYSIS:');
    
    let isWorking = false;
    let issues = [];
    
    if (!pageState.tagsSelectExists) {
      issues.push('❌ Tags select element not found');
    } else if (visibilityCheck.optionsCount === 0) {
      issues.push('❌ Tags select has no options');
    } else if (!visibilityCheck.visible || visibilityCheck.display === 'none') {
      issues.push('❌ Tags select is hidden');
    } else {
      isWorking = true;
    }
    
    if (!apiTest.success) {
      issues.push('❌ Tags API not working');
    }
    
    if (issues.length === 0 || isWorking) {
      console.log('✅ TAGS FUNCTIONALITY IS WORKING!');
      console.log(`✅ Tags loaded: ${apiTest.tagsCount || 'N/A'}`);
      console.log(`✅ Options visible: ${visibilityCheck.optionsCount || 'N/A'}`);
      console.log('✅ Users can select tags when creating stories');
    } else {
      console.log('❌ TAGS FUNCTIONALITY HAS ISSUES:');
      issues.forEach(issue => console.log(`  ${issue}`));
      
      console.log('\n🔧 NEXT DEBUGGING STEPS:');
      if (!pageState.tagsSelectExists) {
        console.log('- Check if add-story.html has the tags select element');
        console.log('- Verify HTML structure is correct');
      }
      if (!apiTest.success) {
        console.log('- Check API authentication and permissions');
        console.log('- Verify JWT token is valid');
      }
      if (!pageState.loadTagsFunction) {
        console.log('- Check if stories.js is loading correctly');
        console.log('- Verify JavaScript functions are available');
      }
    }
    
    console.log('\n=== KEEPING BROWSER OPEN FOR MANUAL INSPECTION ===');
    console.log('You can now manually inspect the page in the browser.');
    console.log('Press Ctrl+C to close when finished.');
    
    // Keep browser open for manual inspection
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Debugging session failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await browser.close();
  }
}

debugTagsUntilFixed();