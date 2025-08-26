const puppeteer = require('puppeteer');

async function testAdminStoriesSpecific() {
  console.log('🔍 Testing Admin Stories Tab Specifically\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    defaultViewport: { width: 1200, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    if (msg.text().includes('Admin Debug') || msg.text().includes('Stories') || msg.text().includes('stories')) {
      console.log(`🔵 BROWSER: ${msg.text()}`);
    }
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
    
    console.log('Step 3: Click on Stories tab...');
    // Use the actual button onclick method
    await page.evaluate(() => {
      window.showTab('stories');
    });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Step 4: Check stories table...');
    const storiesTableState = await page.evaluate(() => {
      const table = document.getElementById('storiesApprovalTable');
      const storiesTab = document.getElementById('stories-tab');
      const activeTab = document.querySelector('.tab-content.active')?.id;
      
      return {
        tableExists: !!table,
        tableRowCount: table ? table.children.length : 0,
        tableHTML: table ? table.innerHTML.length : 0,
        storiesTabExists: !!storiesTab,
        storiesTabVisible: storiesTab ? getComputedStyle(storiesTab).display !== 'none' : false,
        activeTab: activeTab,
        storiesTabClass: storiesTab ? storiesTab.className : 'not found'
      };
    });
    
    console.log('Stories Table State:');
    console.log(`  Table exists: ${storiesTableState.tableExists ? '✅' : '❌'}`);
    console.log(`  Table rows: ${storiesTableState.tableRowCount}`);
    console.log(`  Table HTML length: ${storiesTableState.tableHTML}`);
    console.log(`  Stories tab visible: ${storiesTableState.storiesTabVisible ? '✅' : '❌'}`);
    console.log(`  Active tab: ${storiesTableState.activeTab}`);
    console.log(`  Stories tab class: ${storiesTableState.storiesTabClass}`);
    
    console.log('\nStep 5: Manually call loadStoriesForApproval...');
    const manualLoadResult = await page.evaluate(async () => {
      try {
        console.log('Manually calling loadStoriesForApproval...');
        await window.loadStoriesForApproval('pending');
        
        const table = document.getElementById('storiesApprovalTable');
        return {
          success: true,
          tableRows: table ? table.children.length : 0,
          tableContent: table ? table.innerHTML.substring(0, 500) : 'No table'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    console.log('Manual Load Result:');
    if (manualLoadResult.success) {
      console.log(`  ✅ Success - Table rows: ${manualLoadResult.tableRows}`);
      console.log(`  Table content preview: ${manualLoadResult.tableContent.substring(0, 200)}...`);
    } else {
      console.log(`  ❌ Failed: ${manualLoadResult.error}`);
    }
    
    console.log('\nStep 6: Check for network requests...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const finalState = await page.evaluate(() => {
      const table = document.getElementById('storiesApprovalTable');
      return {
        finalTableRows: table ? table.children.length : 0,
        finalTableHTML: table ? table.innerHTML.length : 0
      };
    });
    
    console.log(`Final state - Table rows: ${finalState.finalTableRows}`);
    console.log(`Final state - Table HTML: ${finalState.finalTableHTML}`);
    
    await page.screenshot({ path: 'admin-stories-specific.png', fullPage: true });
    console.log('\n📸 Screenshot saved as admin-stories-specific.png');
    
    console.log('\n🎯 DIAGNOSIS:');
    if (finalState.finalTableRows > 0) {
      console.log('✅ Stories are loading correctly in the admin panel');
    } else {
      console.log('❌ Stories are not loading - need to investigate displayStoriesForApproval function');
    }
    
    console.log('\nPress Ctrl+C to close browser');
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAdminStoriesSpecific();