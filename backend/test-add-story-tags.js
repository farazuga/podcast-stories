const puppeteer = require('puppeteer');

async function testAddStoryTags() {
  console.log('🔍 Testing Add Story - Tags Functionality\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('tag') || text.includes('Tag') || text.includes('error') || text.includes('Error')) {
      console.log(`🔵 BROWSER: ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });
  
  try {
    // Step 1: Login as teacher (they can create stories)
    console.log('Step 1: Login as teacher...');
    await page.goto('https://podcast-stories-production.up.railway.app');
    await page.type('#email', 'teacher@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log('Current URL:', page.url());
    
    // Step 2: Navigate to Add Story page
    console.log('\nStep 2: Navigate to Add Story page...');
    await page.goto('https://podcast-stories-production.up.railway.app/add-story.html');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Check if tags are loaded
    console.log('\nStep 3: Checking tags element...');
    
    const tagsInfo = await page.evaluate(() => {
      // Look for different possible tag selectors
      const tagSelect = document.getElementById('tags');
      const tagSelectByName = document.querySelector('select[name="tags"]');
      const tagCheckboxes = document.querySelectorAll('input[type="checkbox"][name*="tag"]');
      const tagContainer = document.querySelector('.tags-container');
      const allSelects = document.querySelectorAll('select');
      const allMultiSelects = document.querySelectorAll('select[multiple]');
      
      // Get all form elements for debugging
      const formElements = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
        tag: el.tagName,
        type: el.type,
        id: el.id,
        name: el.name,
        multiple: el.multiple
      }));
      
      let tagOptions = [];
      if (tagSelect) {
        tagOptions = Array.from(tagSelect.options).map(opt => ({
          value: opt.value,
          text: opt.text,
          selected: opt.selected
        }));
      }
      
      return {
        tagSelectExists: !!tagSelect,
        tagSelectById: tagSelect ? tagSelect.id : null,
        tagSelectMultiple: tagSelect ? tagSelect.multiple : false,
        tagSelectByNameExists: !!tagSelectByName,
        tagCheckboxCount: tagCheckboxes.length,
        tagContainerExists: !!tagContainer,
        allSelectsCount: allSelects.length,
        multiSelectCount: allMultiSelects.length,
        tagOptionsCount: tagOptions.length,
        tagOptions: tagOptions.slice(0, 5), // First 5 tags
        formElements: formElements.filter(el => el.id.includes('tag') || el.name.includes('tag'))
      };
    });
    
    console.log('Tags Element Analysis:');
    console.log(`  Tag select exists: ${tagsInfo.tagSelectExists ? '✅' : '❌'}`);
    console.log(`  Tag select ID: ${tagsInfo.tagSelectById || 'N/A'}`);
    console.log(`  Multiple selection: ${tagsInfo.tagSelectMultiple ? '✅' : '❌'}`);
    console.log(`  Tag options count: ${tagsInfo.tagOptionsCount}`);
    console.log(`  Checkbox count: ${tagsInfo.tagCheckboxCount}`);
    console.log(`  All selects count: ${tagsInfo.allSelectsCount}`);
    console.log(`  Multi-select count: ${tagsInfo.multiSelectCount}`);
    
    if (tagsInfo.tagOptions.length > 0) {
      console.log('\n  Available tags:');
      tagsInfo.tagOptions.forEach(tag => {
        console.log(`    - "${tag.text}" (value: ${tag.value})`);
      });
    }
    
    if (tagsInfo.formElements.length > 0) {
      console.log('\n  Tag-related form elements:');
      tagsInfo.formElements.forEach(el => {
        console.log(`    - ${el.tag} ${el.type} #${el.id} name="${el.name}"`);
      });
    }
    
    // Step 4: Test API directly for tags
    console.log('\nStep 4: Testing tags API...');
    
    const apiTest = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const API_URL = window.API_URL || 'https://podcast-stories-production.up.railway.app/api';
      
      try {
        const response = await fetch(`${API_URL}/tags`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const tags = await response.json();
          return {
            success: true,
            count: tags.length,
            tags: tags.slice(0, 5).map(t => t.tag_name)
          };
        }
        return { success: false, status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('Tags API Test:');
    console.log(`  API Success: ${apiTest.success ? '✅' : '❌'}`);
    console.log(`  Tags count: ${apiTest.count}`);
    if (apiTest.tags) {
      console.log(`  First 5 tags: ${apiTest.tags.join(', ')}`);
    }
    
    // Step 5: Try to select tags
    console.log('\nStep 5: Attempting to select tags...');
    
    if (tagsInfo.tagSelectExists) {
      try {
        // Try to select multiple tags
        const selectResult = await page.evaluate(() => {
          const tagSelect = document.getElementById('tags');
          if (!tagSelect) return { error: 'Tag select not found' };
          
          // Enable multiple selection if not already
          tagSelect.multiple = true;
          
          // Try to select first 3 tags
          const results = [];
          for (let i = 0; i < Math.min(3, tagSelect.options.length); i++) {
            tagSelect.options[i].selected = true;
            results.push(tagSelect.options[i].text);
          }
          
          // Check if selections stuck
          const selected = Array.from(tagSelect.selectedOptions).map(opt => opt.text);
          
          return {
            attempted: results,
            selected: selected,
            multiple: tagSelect.multiple
          };
        });
        
        console.log(`  Attempted to select: ${selectResult.attempted.join(', ')}`);
        console.log(`  Actually selected: ${selectResult.selected.join(', ')}`);
        console.log(`  Multiple enabled: ${selectResult.multiple ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`  ❌ Selection error: ${error.message}`);
      }
    }
    
    // Step 6: Fill in story details and try to submit
    console.log('\nStep 6: Filling story form...');
    
    // Fill required fields
    await page.type('#idea_title', 'Test Story with Tags - Puppeteer');
    await page.type('#idea_description', 'Testing if tags can be applied to stories');
    await page.type('#coverage_start_date', '2024-01-01');
    await page.type('#coverage_end_date', '2024-12-31');
    await page.type('#question_1', 'Test question 1?');
    
    // Step 7: Check form submission handler
    console.log('\nStep 7: Checking form submission...');
    
    const formInfo = await page.evaluate(() => {
      const form = document.getElementById('storyForm') || document.querySelector('form');
      const submitBtn = document.querySelector('button[type="submit"]');
      
      if (!form) return { error: 'No form found' };
      
      // Check event listeners
      const listeners = getEventListeners ? getEventListeners(form) : null;
      
      return {
        formExists: !!form,
        formId: form ? form.id : null,
        formAction: form ? form.action : null,
        submitBtnExists: !!submitBtn,
        submitBtnText: submitBtn ? submitBtn.textContent : null
      };
    });
    
    console.log('Form Information:');
    console.log(`  Form exists: ${formInfo.formExists ? '✅' : '❌'}`);
    console.log(`  Form ID: ${formInfo.formId || 'N/A'}`);
    console.log(`  Submit button: ${formInfo.submitBtnExists ? '✅' : '❌'}`);
    console.log(`  Button text: ${formInfo.submitBtnText || 'N/A'}`);
    
    // Step 8: Check JavaScript functions
    console.log('\nStep 8: Checking JavaScript functions...');
    
    const jsCheck = await page.evaluate(() => {
      return {
        saveStory: typeof window.saveStory === 'function',
        loadTags: typeof window.loadTags === 'function',
        API_URL: window.API_URL || 'Not defined',
        formHandler: document.getElementById('storyForm')?.onsubmit ? 'Has handler' : 'No handler'
      };
    });
    
    console.log('JavaScript Functions:');
    console.log(`  saveStory function: ${jsCheck.saveStory ? '✅' : '❌'}`);
    console.log(`  loadTags function: ${jsCheck.loadTags ? '✅' : '❌'}`);
    console.log(`  API_URL: ${jsCheck.API_URL}`);
    console.log(`  Form handler: ${jsCheck.formHandler}`);
    
    // Step 9: Try to manually load tags into select
    console.log('\nStep 9: Manually loading tags into select...');
    
    const manualLoad = await page.evaluate(async () => {
      const API_URL = window.API_URL || 'https://podcast-stories-production.up.railway.app/api';
      const token = localStorage.getItem('token');
      
      try {
        const response = await fetch(`${API_URL}/tags`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const tags = await response.json();
          
          // Find or create tags select
          let tagSelect = document.getElementById('tags');
          if (!tagSelect) {
            // Look for the form
            const form = document.getElementById('storyForm') || document.querySelector('form');
            if (form) {
              // Create select element
              tagSelect = document.createElement('select');
              tagSelect.id = 'tags';
              tagSelect.name = 'tags';
              tagSelect.multiple = true;
              
              // Add to form
              const label = document.createElement('label');
              label.textContent = 'Tags:';
              form.appendChild(label);
              form.appendChild(tagSelect);
            }
          }
          
          if (tagSelect) {
            // Clear existing options
            tagSelect.innerHTML = '';
            
            // Add tags as options
            tags.forEach(tag => {
              const option = document.createElement('option');
              option.value = tag.id || tag.tag_name;
              option.textContent = tag.tag_name;
              tagSelect.appendChild(option);
            });
            
            // Enable multiple selection
            tagSelect.multiple = true;
            
            return { success: true, count: tags.length };
          }
          
          return { success: false, reason: 'No select element' };
        }
        
        return { success: false, status: response.status };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    if (manualLoad.success) {
      console.log(`  ✅ Manually loaded ${manualLoad.count} tags`);
    } else {
      console.log(`  ❌ Manual load failed: ${manualLoad.reason || manualLoad.error}`);
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: 'add-story-tags-test.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as add-story-tags-test.png');
    
    // Summary
    console.log('\n🎯 TEST SUMMARY:');
    console.log(`Tags API working: ${apiTest.success ? '✅ YES' : '❌ NO'}`);
    console.log(`Tags select element: ${tagsInfo.tagSelectExists ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`Tags loaded: ${tagsInfo.tagOptionsCount > 0 ? '✅ YES' : '❌ NO'}`);
    console.log(`Multiple selection: ${tagsInfo.tagSelectMultiple ? '✅ ENABLED' : '❌ DISABLED'}`);
    
    console.log('\nBrowser staying open for manual inspection. Press Ctrl+C to close.');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAddStoryTags();