const puppeteer = require('puppeteer');

async function debugAdminPanelFinal() {
  console.log('🔍 Final Admin Panel Debug Test\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
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
    console.log('Step 1: Login as admin...');
    await page.goto('https://podcast-stories-production.up.railway.app');
    await page.type('#email', 'admin@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log('Step 2: Navigate to admin panel...');
    await page.goto('https://podcast-stories-production.up.railway.app/admin.html');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Step 3: Checking admin panel state...');
    
    const adminState = await page.evaluate(() => {
      // Check what's loaded
      const storiesTab = document.querySelector('[data-tab="stories"]');
      const tagsTab = document.querySelector('[data-tab="tags"]');
      const storiesContent = document.getElementById('stories-content');
      const tagsContent = document.getElementById('tags-content');
      
      // Check for pending stories container
      const pendingStoriesContainer = document.getElementById('pendingStories');
      const pendingStories = pendingStoriesContainer ? pendingStoriesContainer.children.length : 0;
      
      // Check for tags container
      const tagsContainer = document.getElementById('tagsList');
      const tagsCount = tagsContainer ? tagsContainer.children.length : 0;
      
      // Check global functions
      const functions = {
        showTab: typeof window.showTab === 'function',
        loadStoriesForApproval: typeof window.loadStoriesForApproval === 'function',
        loadTags: typeof window.loadTags === 'function',
        API_URL: window.API_URL,
        hasToken: !!localStorage.getItem('token')
      };
      
      return {
        storiesTabExists: !!storiesTab,
        tagsTabExists: !!tagsTab,
        storiesContentExists: !!storiesContent,
        tagsContentExists: !!tagsContent,
        pendingStoriesContainer: !!pendingStoriesContainer,
        pendingStoriesCount: pendingStories,
        tagsContainer: !!tagsContainer,
        tagsCount: tagsCount,
        functions: functions,
        activeTab: document.querySelector('.tab.active')?.getAttribute('data-tab') || 'none'
      };
    });
    
    console.log('\nAdmin Panel State:');
    console.log(`  Stories tab exists: ${adminState.storiesTabExists ? '✅' : '❌'}`);
    console.log(`  Tags tab exists: ${adminState.tagsTabExists ? '✅' : '❌'}`);
    console.log(`  Stories content exists: ${adminState.storiesContentExists ? '✅' : '❌'}`);
    console.log(`  Tags content exists: ${adminState.tagsContentExists ? '✅' : '❌'}`);
    console.log(`  Active tab: ${adminState.activeTab}`);
    console.log(`  Pending stories container: ${adminState.pendingStoriesContainer ? '✅' : '❌'}`);
    console.log(`  Pending stories displayed: ${adminState.pendingStoriesCount}`);
    console.log(`  Tags container: ${adminState.tagsContainer ? '✅' : '❌'}`);
    console.log(`  Tags displayed: ${adminState.tagsCount}`);
    
    console.log('\nGlobal Functions:');
    Object.entries(adminState.functions).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('\nStep 4: Try switching to stories tab...');
    await page.click('[data-tab="stories"]');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\nStep 5: Check if stories loaded...');
    const storiesAfterClick = await page.evaluate(() => {
      const pendingStoriesContainer = document.getElementById('pendingStories');
      const storiesContent = document.getElementById('stories-content');
      const activeTab = document.querySelector('.tab.active')?.getAttribute('data-tab');
      
      return {
        pendingStoriesCount: pendingStoriesContainer ? pendingStoriesContainer.children.length : 0,
        storiesContentVisible: storiesContent ? getComputedStyle(storiesContent).display !== 'none' : false,
        activeTab: activeTab,
        pendingStoriesHTML: pendingStoriesContainer ? pendingStoriesContainer.innerHTML.length : 0
      };
    });
    
    console.log(`  Active tab after click: ${storiesAfterClick.activeTab}`);
    console.log(`  Stories content visible: ${storiesAfterClick.storiesContentVisible ? '✅' : '❌'}`);
    console.log(`  Pending stories count: ${storiesAfterClick.pendingStoriesCount}`);
    console.log(`  Pending stories HTML length: ${storiesAfterClick.pendingStoriesHTML}`);
    
    console.log('\nStep 6: Try switching to tags tab...');
    await page.click('[data-tab="tags"]');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const tagsAfterClick = await page.evaluate(() => {
      const tagsContainer = document.getElementById('tagsList');
      const tagsContent = document.getElementById('tags-content');
      const activeTab = document.querySelector('.tab.active')?.getAttribute('data-tab');
      
      return {
        tagsCount: tagsContainer ? tagsContainer.children.length : 0,
        tagsContentVisible: tagsContent ? getComputedStyle(tagsContent).display !== 'none' : false,
        activeTab: activeTab,
        tagsHTML: tagsContainer ? tagsContainer.innerHTML.length : 0
      };
    });
    
    console.log(`  Active tab after click: ${tagsAfterClick.activeTab}`);
    console.log(`  Tags content visible: ${tagsAfterClick.tagsContentVisible ? '✅' : '❌'}`);
    console.log(`  Tags count: ${tagsAfterClick.tagsCount}`);
    console.log(`  Tags HTML length: ${tagsAfterClick.tagsHTML}`);
    
    console.log('\nStep 7: Manual function testing...');
    const manualTest = await page.evaluate(async () => {
      // Test loadStoriesForApproval manually
      let storiesResult = 'Not tested';
      if (typeof window.loadStoriesForApproval === 'function') {
        try {
          await window.loadStoriesForApproval();
          const container = document.getElementById('pendingStories');
          storiesResult = container ? container.children.length : 'Container not found';
        } catch (error) {
          storiesResult = `Error: ${error.message}`;
        }
      }
      
      // Test loadTags manually
      let tagsResult = 'Not tested';
      if (typeof window.loadTags === 'function') {
        try {
          await window.loadTags();
          const container = document.getElementById('tagsList');
          tagsResult = container ? container.children.length : 'Container not found';
        } catch (error) {
          tagsResult = `Error: ${error.message}`;
        }
      }
      
      return { storiesResult, tagsResult };
    });
    
    console.log(`  Manual loadStoriesForApproval result: ${manualTest.storiesResult}`);
    console.log(`  Manual loadTags result: ${manualTest.tagsResult}`);
    
    await page.screenshot({ path: 'admin-debug-final.png', fullPage: true });
    console.log('\n📸 Screenshot saved as admin-debug-final.png');
    
    console.log('\n🎯 FINAL DIAGNOSIS:');
    if (adminState.pendingStoriesCount === 0) {
      console.log('❌ ISSUE: Stories not loading/displaying');
    } else {
      console.log('✅ Stories are displaying correctly');
    }
    
    if (adminState.tagsCount === 0) {
      console.log('❌ ISSUE: Tags not loading/displaying');
    } else {
      console.log('✅ Tags are displaying correctly');
    }
    
    console.log('\nBrowser staying open for inspection. Press Ctrl+C to close.');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

debugAdminPanelFinal();