/**
 * Global Setup for Playwright Tests
 * 
 * Handles test environment initialization, database setup,
 * and any necessary pre-test configuration.
 */

const { chromium } = require('@playwright/test');

async function globalSetup(config) {
  console.log('🚀 Starting global test setup...');
  
  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for services to be ready
    console.log('⏳ Waiting for services to start...');
    
    // Check rundown creator service
    await waitForService(page, 'http://localhost:3001/health', 'Rundown Creator');
    
    // Check main VidPOD API service
    await waitForService(page, 'http://localhost:3000/api/health', 'VidPOD API');
    
    // Ensure test data is available
    await setupTestData(page);
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

async function waitForService(page, url, serviceName, maxAttempts = 30) {
  console.log(`🔍 Checking ${serviceName} at ${url}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await page.request.get(url);
      if (response.ok()) {
        console.log(`✅ ${serviceName} is ready`);
        return;
      }
    } catch (error) {
      // Service not ready yet
    }
    
    console.log(`⏳ ${serviceName} not ready, attempt ${attempt}/${maxAttempts}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`${serviceName} failed to start within ${maxAttempts * 2} seconds`);
}

async function setupTestData(page) {
  console.log('📋 Setting up test data...');
  
  try {
    // Check if test users exist by attempting login
    const testUsers = [
      { email: 'admin@vidpod.com', password: 'rumi&amaml', role: 'admin' },
      { email: 'teacher@vidpod.com', password: 'rumi&amaml', role: 'teacher' },
      { email: 'student@vidpod.com', password: 'rumi&amaml', role: 'student' }
    ];
    
    for (const user of testUsers) {
      await verifyTestUser(page, user);
    }
    
    console.log('✅ Test data verified');
    
  } catch (error) {
    console.warn('⚠️ Test data setup warning:', error.message);
    // Don't fail setup for test data issues - tests should handle this
  }
}

async function verifyTestUser(page, user) {
  try {
    const response = await page.request.post('http://localhost:3000/api/auth/login', {
      data: {
        email: user.email,
        password: user.password
      }
    });
    
    if (response.ok()) {
      console.log(`✅ Test ${user.role} user verified`);
    } else {
      console.warn(`⚠️ Test ${user.role} user login failed`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not verify test ${user.role} user:`, error.message);
  }
}

module.exports = globalSetup;