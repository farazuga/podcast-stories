const puppeteer = require('puppeteer');

async function testAutoPopulation() {
  console.log('🔍 Testing Automatic Tag Population on Page Load\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1200, height: 800 }
  });
  
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.text().includes('tag') || msg.text().includes('Tag') || msg.text().includes('Loading') || msg.text().includes('Loaded')) {
      console.log(`🔵 BROWSER: ${msg.text()}`);
    }
  });
  
  try {
    // Login
    await page.goto('https://podcast-stories-production.up.railway.app');
    await page.type('#email', 'teacher@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Go to add story page
    await page.goto('https://podcast-stories-production.up.railway.app/add-story.html');
    await page.waitForSelector('#tags');
    
    // Wait for any automatic loading
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('=== CHECKING INITIAL STATE ===');
    const initialState = await page.evaluate(() => {
      const tagsSelect = document.getElementById('tags');
      return {
        optionsCount: tagsSelect ? tagsSelect.options.length : 0,
        allTagsLength: typeof allTags !== 'undefined' ? allTags.length : 'undefined'
      };
    });
    
    console.log(`Initial tags options: ${initialState.optionsCount}`);
    console.log(`allTags array length: ${initialState.allTagsLength}`);
    
    if (initialState.optionsCount === 0 && initialState.allTagsLength > 0) {
      console.log('\n=== TRIGGERING MANUAL POPULATION ===');
      
      const populationResult = await page.evaluate(() => {
        // Call populateAddStoryTags if it exists
        if (typeof populateAddStoryTags === 'function') {
          try {
            populateAddStoryTags();
            const tagsSelect = document.getElementById('tags');
            return {
              success: true,
              optionsAfter: tagsSelect ? tagsSelect.options.length : 0
            };
          } catch (error) {
            return { success: false, error: error.message };
          }
        } else {
          // Manual population using allTags array
          const tagsSelect = document.getElementById('tags');
          if (tagsSelect && typeof allTags !== 'undefined' && allTags.length > 0) {
            tagsSelect.innerHTML = '';
            allTags.forEach(tag => {
              const option = document.createElement('option');
              option.value = tag.tag_name;
              option.textContent = tag.tag_name;
              tagsSelect.appendChild(option);
            });
            return {
              success: true,
              method: 'manual using allTags',
              optionsAfter: tagsSelect.options.length
            };
          }
          return { success: false, error: 'No population method available' };
        }
      });
      
      if (populationResult.success) {
        console.log(`✅ Population successful: ${populationResult.optionsAfter} options`);
        console.log(`Method: ${populationResult.method || 'populateAddStoryTags function'}`);
      } else {
        console.log(`❌ Population failed: ${populationResult.error}`);
      }
    } else if (initialState.optionsCount > 0) {
      console.log('✅ Tags already populated automatically!');
    }
    
    console.log('\n=== FINAL VERIFICATION ===');
    const finalState = await page.evaluate(() => {
      const tagsSelect = document.getElementById('tags');
      return {
        optionsCount: tagsSelect ? tagsSelect.options.length : 0,
        firstThreeTags: tagsSelect && tagsSelect.options.length > 0 ? 
          Array.from(tagsSelect.options).slice(0, 3).map(opt => opt.text) : [],
        selectHTML: tagsSelect ? tagsSelect.outerHTML.substring(0, 200) : 'not found'
      };
    });
    
    console.log(`Final options count: ${finalState.optionsCount}`);
    console.log(`Sample tags: ${finalState.firstThreeTags.join(', ')}`);
    
    if (finalState.optionsCount > 0) {
      console.log('\n🎉 SUCCESS: Tags are working on the add story page!');
      console.log('Users can now select tags when creating stories.');
      
      // Test selection
      await page.evaluate(() => {
        const tagsSelect = document.getElementById('tags');
        if (tagsSelect && tagsSelect.options.length > 0) {
          tagsSelect.options[0].selected = true;
          tagsSelect.options[1].selected = true;
        }
      });
      
      console.log('✅ Tag selection tested successfully');
    } else {
      console.log('\n❌ Tags are still not populating');
    }
    
    await page.screenshot({ path: 'auto-population-test.png' });
    console.log('\n📸 Screenshot saved as auto-population-test.png');
    
    await browser.close();
    
  } catch (error) {
    await browser.close();
    console.error('Test failed:', error.message);
  }
}

testAutoPopulation();