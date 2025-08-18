/**
 * Global Teardown for Playwright Tests
 * 
 * Handles cleanup after all tests complete, including
 * test data cleanup and resource deallocation.
 */

const { chromium } = require('@playwright/test');

async function globalTeardown(config) {
  console.log('🧹 Starting global test teardown...');
  
  // Launch browser for cleanup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Clean up test data if needed
    await cleanupTestData(page);
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown error:', error);
    // Don't throw - teardown errors shouldn't fail the test run
  } finally {
    await browser.close();
  }
}

async function cleanupTestData(page) {
  console.log('🗑️ Cleaning up test data...');
  
  try {
    // Login as admin to perform cleanup
    const loginResponse = await page.request.post('http://localhost:3000/api/auth/login', {
      data: {
        email: 'admin@vidpod.com',
        password: 'rumi&amaml'
      }
    });
    
    if (!loginResponse.ok()) {
      console.warn('⚠️ Could not login as admin for cleanup');
      return;
    }
    
    const loginData = await loginResponse.json();
    const adminToken = loginData.token;
    
    // Clean up test rundowns (those created during tests)
    await cleanupTestRundowns(page, adminToken);
    
    console.log('✅ Test data cleanup completed');
    
  } catch (error) {
    console.warn('⚠️ Test data cleanup warning:', error.message);
  }
}

async function cleanupTestRundowns(page, token) {
  try {
    // Get rundowns created during tests (those with "Test" or "E2E" in title)
    const rundownsResponse = await page.request.get('http://localhost:3001/api/rundowns', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!rundownsResponse.ok()) {
      console.warn('⚠️ Could not fetch rundowns for cleanup');
      return;
    }
    
    const rundownsData = await rundownsResponse.json();
    const testRundowns = rundownsData.rundowns?.filter(r => 
      r.title.includes('Test') || 
      r.title.includes('E2E') ||
      r.title.includes('Automation')
    ) || [];
    
    console.log(`🗑️ Found ${testRundowns.length} test rundowns to clean up`);
    
    // Delete test rundowns
    for (const rundown of testRundowns) {
      try {
        await page.request.delete(`http://localhost:3001/api/rundowns/${rundown.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log(`🗑️ Cleaned up test rundown: ${rundown.title}`);
      } catch (error) {
        console.warn(`⚠️ Could not delete rundown ${rundown.id}:`, error.message);
      }
    }
    
  } catch (error) {
    console.warn('⚠️ Rundown cleanup warning:', error.message);
  }
}

module.exports = globalTeardown;