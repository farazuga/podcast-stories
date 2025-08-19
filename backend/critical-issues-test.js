/**
 * Critical Issues Focused Test
 * Quick test of the most critical bugs found
 */

const puppeteer = require('puppeteer');

async function testCriticalIssues() {
  console.log('🔍 CRITICAL ISSUES INVESTIGATION');
  console.log('================================');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    console.log(`📋 ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });
  
  try {
    console.log('\n1. Testing API_URL redeclaration issue...');
    
    // Test teacher dashboard
    await page.goto('https://podcast-stories-production.up.railway.app/teacher-dashboard.html');
    await page.waitForTimeout(5000);
    
    // Check what's actually on the page
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        bodyClass: document.body.className,
        hasScripts: !!document.querySelector('script'),
        scriptSources: Array.from(document.querySelectorAll('script')).map(s => s.src),
        hasConfig: !!window.AppConfig,
        apiUrl: window.API_URL,
        errors: window.jsErrors || []
      };
    });
    
    console.log('📄 Page Analysis:', JSON.stringify(pageContent, null, 2));
    
    console.log('\n2. Testing missing dashboard elements...');
    
    // Go to student dashboard
    await page.goto('https://podcast-stories-production.up.railway.app');
    await page.type('#email', 'student@vidpod.com');
    await page.type('#password', 'vidpod');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Check what elements are actually present
    const dashboardElements = await page.evaluate(() => {
      return {
        currentUrl: window.location.href,
        hasStoryGrid: !!document.querySelector('.story-grid'),
        hasStoryCards: document.querySelectorAll('.story-card').length,
        hasDashboardSection: !!document.querySelector('.dashboard-section'),
        allClasses: Array.from(document.querySelectorAll('[class*="story"], [class*="dashboard"], [class*="container"]')).map(el => el.className),
        bodyHTML: document.body.innerHTML.substring(0, 500) + '...'
      };
    });
    
    console.log('🏠 Dashboard Analysis:', JSON.stringify(dashboardElements, null, 2));
    
    console.log('\n3. Testing user info display...');
    
    const userInfo = await page.evaluate(() => {
      const userInfoEl = document.getElementById('userInfo');
      const userRoleEl = document.getElementById('userRoleBadge');
      const userData = localStorage.getItem('user');
      
      return {
        userInfoText: userInfoEl ? userInfoEl.textContent : 'NOT FOUND',
        userRoleText: userRoleEl ? userRoleEl.textContent : 'NOT FOUND',
        localStorageUser: userData,
        allUserElements: Array.from(document.querySelectorAll('[id*="user"], [class*="user"]')).map(el => ({
          id: el.id,
          class: el.className,
          text: el.textContent
        }))
      };
    });
    
    console.log('👤 User Info Analysis:', JSON.stringify(userInfo, null, 2));
    
    // Take screenshot for visual debugging
    await page.screenshot({ path: 'critical-issues-debug.png', fullPage: true });
    console.log('📸 Screenshot saved as critical-issues-debug.png');
    
  } catch (error) {
    console.error('❌ Critical test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testCriticalIssues();