const puppeteer = require('puppeteer');

async function verifyAddStoryTags() {
  console.log('🔍 Verifying Add Story Tags Functionality\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    defaultViewport: { width: 1200, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    console.log(`🔵 BROWSER: ${msg.text()}`);
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
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Step 3: Check page scripts and elements...');
    
    const pageAnalysis = await page.evaluate(() => {
      // Check what scripts are loaded
      const scripts = Array.from(document.scripts).map(s => ({
        src: s.src,
        filename: s.src.split('/').pop()
      }));
      
      // Check for tags select element
      const tagsSelect = document.getElementById('tags');
      const tagsSelectByName = document.querySelector('select[name="tags"]');
      const tagsSelectMultiple = document.querySelector('select[multiple]');
      
      // Check all form elements
      const allSelects = Array.from(document.querySelectorAll('select')).map(s => ({
        id: s.id,
        name: s.name,
        multiple: s.multiple,
        optionsCount: s.options.length,
        options: Array.from(s.options).slice(0, 5).map(opt => opt.text)
      }));
      
      // Check global variables and functions
      const globals = {
        API_URL: window.API_URL,
        hasToken: !!localStorage.getItem('token'),
        loadTags: typeof window.loadTags === 'function',
        setupFormHandler: typeof window.setupFormHandler === 'function',
        saveStory: typeof window.saveStory === 'function'
      };
      
      return {
        scripts: scripts,
        tagsSelectExists: !!tagsSelect,
        tagsSelectId: tagsSelect ? tagsSelect.id : null,
        tagsSelectOptions: tagsSelect ? tagsSelect.options.length : 0,
        tagsSelectMultiple: tagsSelect ? tagsSelect.multiple : false,
        tagsSelectByName: !!tagsSelectByName,
        tagsSelectMultipleGeneric: !!tagsSelectMultiple,
        allSelects: allSelects,
        globals: globals,
        title: document.title,
        formExists: !!document.getElementById('storyForm')
      };
    });
    
    console.log('\nPage Analysis:');
    console.log(`  Page title: ${pageAnalysis.title}`);
    console.log(`  Form exists: ${pageAnalysis.formExists ? '✅' : '❌'}`);
    console.log('\nScripts loaded:');
    pageAnalysis.scripts.forEach(script => {
      console.log(`  - ${script.filename || 'inline'}: ${script.src || 'no src'}`);
    });
    
    console.log('\nTags Element Check:');
    console.log(`  Tags select exists (by ID): ${pageAnalysis.tagsSelectExists ? '✅' : '❌'}`);
    console.log(`  Tags select ID: ${pageAnalysis.tagsSelectId || 'N/A'}`);
    console.log(`  Tags options count: ${pageAnalysis.tagsSelectOptions}`);
    console.log(`  Multiple selection: ${pageAnalysis.tagsSelectMultiple ? '✅' : '❌'}`);
    
    console.log('\nAll Select Elements:');
    pageAnalysis.allSelects.forEach((select, i) => {
      console.log(`  Select ${i + 1}: id="${select.id}" name="${select.name}" multiple=${select.multiple} options=${select.optionsCount}`);
      if (select.options.length > 0) {
        console.log(`    First options: ${select.options.join(', ')}`);
      }
    });
    
    console.log('\nGlobal Variables/Functions:');
    Object.entries(pageAnalysis.globals).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\nStep 4: Test API directly...');
    const apiTest = await page.evaluate(async () => {
      const API_URL = window.API_URL || 'https://podcast-stories-production.up.railway.app/api';
      const token = localStorage.getItem('token');
      
      try {
        const response = await fetch(`${API_URL}/tags`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const tags = await response.json();
          return {
            success: true,
            count: tags.length,
            firstFive: tags.slice(0, 5).map(t => t.tag_name || t.name),
            apiUrl: `${API_URL}/tags`
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
    
    console.log('\nAPI Test Results:');
    if (apiTest.success) {
      console.log(`  ✅ Tags API working: ${apiTest.count} tags found`);
      console.log(`  API URL: ${apiTest.apiUrl}`);
      console.log(`  First 5 tags: ${apiTest.firstFive.join(', ')}`);
    } else {
      console.log(`  ❌ Tags API failed: ${apiTest.error || `${apiTest.status} ${apiTest.statusText}`}`);
    }
    
    console.log('\nStep 5: Try manual tag loading...');
    const manualLoadResult = await page.evaluate(async () => {
      // Check if loadTags function exists and try to call it
      if (typeof window.loadTags === 'function') {
        try {
          await window.loadTags();
          const tagsSelect = document.getElementById('tags');
          return {
            success: true,
            message: 'loadTags function called',
            optionsAfter: tagsSelect ? tagsSelect.options.length : 0
          };
        } catch (error) {
          return {
            success: false,
            error: `loadTags failed: ${error.message}`
          };
        }
      } else {
        return {
          success: false,
          error: 'loadTags function not found'
        };
      }
    });
    
    console.log('\nManual Load Result:');
    if (manualLoadResult.success) {
      console.log(`  ✅ ${manualLoadResult.message}`);
      console.log(`  Options after load: ${manualLoadResult.optionsAfter}`);
    } else {
      console.log(`  ❌ ${manualLoadResult.error}`);
    }
    
    console.log('\nStep 6: Check HTML structure...');
    const htmlCheck = await page.evaluate(() => {
      const tagsSection = document.querySelector('.tags-section') || 
                          document.querySelector('[data-field="tags"]') ||
                          document.querySelector('*[class*="tag"]') ||
                          document.querySelector('*[id*="tag"]');
      
      const formGroups = Array.from(document.querySelectorAll('.form-group')).map(fg => {
        const label = fg.querySelector('label');
        const input = fg.querySelector('input, select, textarea');
        return {
          label: label ? label.textContent : 'no label',
          inputType: input ? input.tagName.toLowerCase() : 'no input',
          inputId: input ? input.id : 'no id'
        };
      });
      
      return {
        tagsSection: !!tagsSection,
        tagsSectionHTML: tagsSection ? tagsSection.outerHTML.substring(0, 200) : 'not found',
        formGroups: formGroups,
        bodyText: document.body.textContent.toLowerCase().includes('tag')
      };
    });
    
    console.log('\nHTML Structure:');
    console.log(`  Tags section found: ${htmlCheck.tagsSection ? '✅' : '❌'}`);
    console.log(`  Body contains "tag": ${htmlCheck.bodyText ? '✅' : '❌'}`);
    console.log('\nForm Groups:');
    htmlCheck.formGroups.forEach((group, i) => {
      console.log(`  ${i + 1}. ${group.label} (${group.inputType}#${group.inputId})`);
    });
    
    await page.screenshot({ path: 'add-story-tags-verify.png', fullPage: true });
    console.log('\n📸 Screenshot saved as add-story-tags-verify.png');
    
    console.log('\n🎯 VERIFICATION SUMMARY:');
    const issues = [];
    
    if (!pageAnalysis.tagsSelectExists) {
      issues.push('❌ Tags select element (#tags) not found');
    }
    
    if (pageAnalysis.tagsSelectOptions === 0) {
      issues.push('❌ Tags select has no options');
    }
    
    if (!pageAnalysis.globals.API_URL) {
      issues.push('❌ API_URL not defined');
    }
    
    if (!apiTest.success) {
      issues.push('❌ Tags API not working');
    }
    
    if (!pageAnalysis.scripts.some(s => s.filename === 'add-story.js')) {
      issues.push('❌ add-story.js not loaded');
    }
    
    if (issues.length === 0) {
      console.log('✅ All checks passed - tags functionality should be working');
    } else {
      console.log('Issues found:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }
    
    console.log('\nBrowser staying open for inspection. Press Ctrl+C to close.');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

verifyAddStoryTags();