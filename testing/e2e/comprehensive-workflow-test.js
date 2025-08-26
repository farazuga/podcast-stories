/**
 * Comprehensive Workflow Testing Suite
 * Tests all user workflows to identify bugs and issues
 */

const puppeteer = require('puppeteer');

const TEST_USERS = {
  ADMIN: {
    email: 'admin@vidpod.com',
    password: 'vidpod',
    expectedRole: 'amitrace_admin',
    expectedRedirect: '/admin.html'
  },
  TEACHER: {
    email: 'teacher@vidpod.com', 
    password: 'vidpod',
    expectedRole: 'teacher',
    expectedRedirect: '/teacher-dashboard.html'
  },
  STUDENT: {
    email: 'student@vidpod.com',
    password: 'vidpod', 
    expectedRole: 'student',
    expectedRedirect: '/dashboard.html'
  }
};

const BASE_URL = 'https://podcast-stories-production.up.railway.app';
const bugs = [];

function logBug(severity, workflow, description, details = null) {
  const bug = {
    severity, // 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    workflow,
    description,
    timestamp: new Date().toISOString(),
    details
  };
  bugs.push(bug);
  console.log(`🐛 ${severity}: ${workflow} - ${description}`);
  if (details) console.log(`   Details: ${JSON.stringify(details)}`);
}

async function testLogin(page, userType) {
  console.log(`\n=== Testing ${userType} Login ===`);
  const user = TEST_USERS[userType];
  
  try {
    // Navigate to login page
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForSelector('#email', { timeout: 10000 });
    
    // Fill login form
    await page.type('#email', user.email);
    await page.type('#password', user.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    
    // Verify correct redirect
    const currentUrl = page.url();
    if (!currentUrl.includes(user.expectedRedirect)) {
      logBug('HIGH', `${userType} Login`, 
        `Incorrect redirect after login. Expected: ${user.expectedRedirect}, Got: ${currentUrl}`);
    }
    
    // Verify user info is displayed
    const userInfo = await page.evaluate(() => {
      const userInfoElement = document.getElementById('userInfo');
      return userInfoElement ? userInfoElement.textContent : null;
    });
    
    if (!userInfo || !userInfo.includes(user.email)) {
      logBug('MEDIUM', `${userType} Login`, 
        'User info not displayed correctly after login', { userInfo });
    }
    
    // Check for JavaScript errors
    const jsErrors = await page.evaluate(() => {
      return window.jsErrors || [];
    });
    
    if (jsErrors.length > 0) {
      logBug('HIGH', `${userType} Login`, 
        'JavaScript errors on dashboard', { errors: jsErrors });
    }
    
    console.log(`✅ ${userType} login test completed`);
    return true;
    
  } catch (error) {
    logBug('CRITICAL', `${userType} Login`, 
      'Login process failed completely', { error: error.message });
    return false;
  }
}

async function testStudentWorkflow(page) {
  console.log(`\n=== Testing Student Workflow ===`);
  
  try {
    // Test dashboard loading
    await page.goto(`${BASE_URL}/dashboard.html`);
    await page.waitForSelector('.story-grid', { timeout: 10000 });
    
    const storiesCount = await page.evaluate(() => {
      const storyCards = document.querySelectorAll('.story-card');
      return storyCards.length;
    });
    
    console.log(`📊 Found ${storiesCount} stories on dashboard`);
    
    // Test story creation
    await page.goto(`${BASE_URL}/add-story.html`);
    await page.waitForSelector('#ideaTitle', { timeout: 5000 });
    
    // Fill out story form
    await page.type('#ideaTitle', 'Test Student Story');
    await page.type('#ideaDescription', 'This is a test story created by automated testing');
    await page.type('#question1', 'What is the main issue?');
    
    // Submit story
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Check for success or error messages
    const notifications = await page.evaluate(() => {
      const notifications = document.querySelectorAll('.notification, .error-message, .success-message');
      return Array.from(notifications).map(n => n.textContent);
    });
    
    if (notifications.length === 0) {
      logBug('MEDIUM', 'Student Story Creation', 
        'No feedback message shown after story submission');
    }
    
    // Test favorites functionality
    await page.goto(`${BASE_URL}/stories.html`);
    await page.waitForSelector('.story-card', { timeout: 5000 });
    
    const favoriteButtons = await page.evaluate(() => {
      return document.querySelectorAll('.favorite-btn').length;
    });
    
    if (favoriteButtons === 0) {
      logBug('HIGH', 'Student Favorites', 'No favorite buttons found on stories page');
    } else {
      // Test clicking a favorite button
      try {
        await page.click('.favorite-btn');
        await page.waitForTimeout(2000);
        
        // Check if favorite status changed
        const favoriteResult = await page.evaluate(() => {
          const firstBtn = document.querySelector('.favorite-btn');
          const heartIcon = firstBtn ? firstBtn.querySelector('.heart-icon') : null;
          return heartIcon ? heartIcon.textContent : null;
        });
        
        console.log(`❤️ Favorite test result: ${favoriteResult}`);
      } catch (favoriteError) {
        logBug('MEDIUM', 'Student Favorites', 
          'Favorite button click failed', { error: favoriteError.message });
      }
    }
    
    // Test CSV import (should be available for students)
    const csvImportBtn = await page.evaluate(() => {
      return !!document.getElementById('csvImportBtn');
    });
    
    if (!csvImportBtn) {
      logBug('LOW', 'Student CSV Import', 'CSV import button not found for student');
    }
    
    console.log(`✅ Student workflow test completed`);
    
  } catch (error) {
    logBug('CRITICAL', 'Student Workflow', 
      'Student workflow test failed', { error: error.message });
  }
}

async function testTeacherWorkflow(page) {
  console.log(`\n=== Testing Teacher Workflow ===`);
  
  try {
    // Test teacher dashboard
    await page.goto(`${BASE_URL}/teacher-dashboard.html`);
    await page.waitForSelector('.dashboard-section', { timeout: 10000 });
    
    // Check for class management section
    const classSection = await page.evaluate(() => {
      return !!document.querySelector('.classes-section') || 
             !!document.querySelector('[data-tab="classes"]') ||
             !!document.getElementById('classesSection');
    });
    
    if (!classSection) {
      logBug('HIGH', 'Teacher Dashboard', 'Class management section not found');
    }
    
    // Test class creation
    try {
      // Look for create class button/form
      const createClassBtn = await page.evaluate(() => {
        return !!document.getElementById('createClassBtn') || 
               !!document.querySelector('.btn-create-class') ||
               !!document.querySelector('button[onclick*="createClass"]');
      });
      
      if (createClassBtn) {
        await page.click('#createClassBtn, .btn-create-class, button[onclick*="createClass"]');
        await page.waitForTimeout(1000);
        
        // Fill class creation form if visible
        const classNameInput = await page.$('#className, input[name="className"]');
        if (classNameInput) {
          await classNameInput.type('Test Automated Class');
          
          const subjectInput = await page.$('#subject, input[name="subject"]');
          if (subjectInput) {
            await subjectInput.type('Testing');
          }
          
          // Submit class creation
          await page.click('button[type="submit"], .btn-submit');
          await page.waitForTimeout(3000);
          
          console.log('🏫 Class creation form submitted');
        }
      } else {
        logBug('MEDIUM', 'Teacher Class Management', 'Create class button not found');
      }
    } catch (classError) {
      logBug('MEDIUM', 'Teacher Class Creation', 
        'Class creation test failed', { error: classError.message });
    }
    
    // Test story management capabilities
    await page.goto(`${BASE_URL}/stories.html`);
    await page.waitForSelector('.story-card', { timeout: 5000 });
    
    // Teachers should see additional management options
    const managementOptions = await page.evaluate(() => {
      const bulkActions = !!document.querySelector('.bulk-actions');
      const exportBtn = !!document.querySelector('[onclick*="exportSelected"], .btn-export');
      const deleteBtn = !!document.querySelector('[onclick*="deleteSelected"], .btn-delete');
      
      return { bulkActions, exportBtn, deleteBtn };
    });
    
    console.log('🔧 Teacher management options:', managementOptions);
    
    // Test CSV import for teachers
    const csvImportBtn = await page.$('#csvImportBtn');
    if (csvImportBtn) {
      await csvImportBtn.click();
      await page.waitForTimeout(1000);
      
      const csvModal = await page.evaluate(() => {
        return !!document.getElementById('csvModal') && 
               document.getElementById('csvModal').style.display !== 'none';
      });
      
      if (!csvModal) {
        logBug('MEDIUM', 'Teacher CSV Import', 'CSV import modal not opening');
      }
    }
    
    console.log(`✅ Teacher workflow test completed`);
    
  } catch (error) {
    logBug('CRITICAL', 'Teacher Workflow', 
      'Teacher workflow test failed', { error: error.message });
  }
}

async function testAdminWorkflow(page) {
  console.log(`\n=== Testing Admin Workflow ===`);
  
  try {
    // Test admin panel
    await page.goto(`${BASE_URL}/admin.html`);
    await page.waitForSelector('.admin-content', { timeout: 10000 });
    
    // Test tab switching
    const tabs = await page.evaluate(() => {
      const tabButtons = document.querySelectorAll('.tab-btn');
      return Array.from(tabButtons).map(btn => btn.textContent);
    });
    
    console.log('📋 Admin tabs found:', tabs);
    
    if (tabs.length === 0) {
      logBug('HIGH', 'Admin Panel', 'No admin tabs found');
    }
    
    // Test each tab
    for (const tabText of ['Schools', 'Teachers', 'Stories', 'Tags']) {
      try {
        const tabBtn = await page.$(`button:contains("${tabText}"), .tab-btn[onclick*="${tabText.toLowerCase()}"]`);
        if (tabBtn) {
          await tabBtn.click();
          await page.waitForTimeout(1000);
          
          // Check if content loaded
          const tabContent = await page.evaluate((tab) => {
            const activeTab = document.querySelector('.tab-content.active');
            return activeTab ? activeTab.innerHTML.length > 100 : false;
          }, tabText);
          
          if (!tabContent) {
            logBug('MEDIUM', `Admin ${tabText} Tab`, 
              `${tabText} tab content not loading or empty`);
          }
        }
      } catch (tabError) {
        logBug('MEDIUM', `Admin ${tabText} Tab`, 
          `Error testing ${tabText} tab`, { error: tabError.message });
      }
    }
    
    // Test teacher approval workflow
    try {
      // Look for pending teacher requests
      const teacherRequests = await page.evaluate(() => {
        const requestRows = document.querySelectorAll('tbody tr, .teacher-request');
        return requestRows.length;
      });
      
      console.log(`👨‍🏫 Found ${teacherRequests} teacher requests`);
      
      if (teacherRequests > 0) {
        // Test approve/reject functionality
        const approveBtn = await page.$('button[onclick*="approve"], .btn-approve');
        if (!approveBtn) {
          logBug('MEDIUM', 'Admin Teacher Approval', 'Approve button not found');
        }
      }
    } catch (approvalError) {
      logBug('MEDIUM', 'Admin Teacher Approval', 
        'Teacher approval test failed', { error: approvalError.message });
    }
    
    // Test story approval (if implemented)
    try {
      const pendingStories = await page.evaluate(() => {
        const storyRows = document.querySelectorAll('.pending-story, tbody tr');
        return Array.from(storyRows).filter(row => 
          row.textContent.includes('pending') || 
          row.textContent.includes('Pending')
        ).length;
      });
      
      console.log(`📖 Found ${pendingStories} pending stories`);
    } catch (storyApprovalError) {
      console.log('📖 Story approval feature not yet implemented (expected)');
    }
    
    console.log(`✅ Admin workflow test completed`);
    
  } catch (error) {
    logBug('CRITICAL', 'Admin Workflow', 
      'Admin workflow test failed', { error: error.message });
  }
}

async function testCrossUserFeatures(page) {
  console.log(`\n=== Testing Cross-User Features ===`);
  
  try {
    // Test navigation between pages
    const pages = ['/dashboard.html', '/stories.html', '/add-story.html'];
    
    for (const pagePath of pages) {
      try {
        await page.goto(`${BASE_URL}${pagePath}`);
        await page.waitForSelector('body', { timeout: 5000 });
        
        // Check for JavaScript errors
        const jsErrors = await page.evaluate(() => {
          return window.jsErrors || [];
        });
        
        if (jsErrors.length > 0) {
          logBug('HIGH', `Page ${pagePath}`, 
            'JavaScript errors on page load', { errors: jsErrors });
        }
        
        // Check for broken navigation
        const navLinks = await page.evaluate(() => {
          const links = document.querySelectorAll('nav a, .nav-menu a');
          return Array.from(links).map(link => ({
            href: link.href,
            text: link.textContent,
            visible: link.offsetWidth > 0
          }));
        });
        
        const brokenNavLinks = navLinks.filter(link => !link.visible && link.href);
        if (brokenNavLinks.length > 0) {
          logBug('LOW', `Page ${pagePath}`, 
            'Navigation links not visible', { brokenLinks: brokenNavLinks });
        }
        
      } catch (pageError) {
        logBug('HIGH', `Page ${pagePath}`, 
          'Page failed to load', { error: pageError.message });
      }
    }
    
    // Test logout functionality
    try {
      await page.goto(`${BASE_URL}/dashboard.html`);
      const logoutBtn = await page.$('button[onclick="logout"], .btn-logout');
      
      if (logoutBtn) {
        await logoutBtn.click();
        await page.waitForTimeout(2000);
        
        // Should redirect to login page
        const currentUrl = page.url();
        if (!currentUrl.includes('index.html') && !currentUrl.endsWith('/')) {
          logBug('MEDIUM', 'Logout', 
            'Logout did not redirect to login page', { currentUrl });
        }
      } else {
        logBug('MEDIUM', 'Logout', 'Logout button not found');
      }
    } catch (logoutError) {
      logBug('MEDIUM', 'Logout', 
        'Logout test failed', { error: logoutError.message });
    }
    
    console.log(`✅ Cross-user features test completed`);
    
  } catch (error) {
    logBug('CRITICAL', 'Cross-User Features', 
      'Cross-user features test failed', { error: error.message });
  }
}

async function runComprehensiveTest() {
  console.log('🧪 STARTING COMPREHENSIVE WORKFLOW TESTING');
  console.log('==========================================');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: false,
    defaultViewport: { width: 1400, height: 900 }
  });
  
  const page = await browser.newPage();
  
  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🔴 Console Error: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    logBug('HIGH', 'Page Error', error.message);
  });
  
  try {
    // Test each user type
    for (const userType of Object.keys(TEST_USERS)) {
      const loginSuccess = await testLogin(page, userType);
      
      if (loginSuccess) {
        // Run user-specific workflow tests
        switch (userType) {
          case 'STUDENT':
            await testStudentWorkflow(page);
            break;
          case 'TEACHER':
            await testTeacherWorkflow(page);
            break;
          case 'ADMIN':
            await testAdminWorkflow(page);
            break;
        }
      }
    }
    
    // Test features that work across user types
    await testCrossUserFeatures(page);
    
  } catch (error) {
    logBug('CRITICAL', 'Test Suite', 
      'Test suite execution failed', { error: error.message });
  }
  
  await browser.close();
  
  // Generate bug report
  console.log('\n🐛 COMPREHENSIVE BUG REPORT');
  console.log('============================');
  
  if (bugs.length === 0) {
    console.log('🎉 NO BUGS FOUND! All workflows working correctly.');
  } else {
    const bugsBySeverity = {
      CRITICAL: bugs.filter(b => b.severity === 'CRITICAL'),
      HIGH: bugs.filter(b => b.severity === 'HIGH'),
      MEDIUM: bugs.filter(b => b.severity === 'MEDIUM'),
      LOW: bugs.filter(b => b.severity === 'LOW')
    };
    
    console.log(`Total bugs found: ${bugs.length}\n`);
    
    Object.entries(bugsBySeverity).forEach(([severity, bugList]) => {
      if (bugList.length > 0) {
        console.log(`${severity} SEVERITY (${bugList.length} bugs):`);
        bugList.forEach((bug, index) => {
          console.log(`  ${index + 1}. ${bug.workflow}: ${bug.description}`);
          if (bug.details) {
            console.log(`     Details: ${JSON.stringify(bug.details, null, 2)}`);
          }
        });
        console.log('');
      }
    });
  }
  
  return bugs;
}

// Run the test
if (require.main === module) {
  runComprehensiveTest().then(bugs => {
    console.log(`\n✅ Testing complete. Found ${bugs.length} issues.`);
    process.exit(bugs.filter(b => b.severity === 'CRITICAL').length > 0 ? 1 : 0);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runComprehensiveTest, TEST_USERS, BASE_URL };