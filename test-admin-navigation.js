#!/usr/bin/env node

/**
 * Puppeteer Test: Admin Navigation Verification
 * Tests that amitrace_admin users see correct navigation elements
 * - Should see: Dashboard, Browse Stories, Add Story, Admin Browse Stories, Admin Panel
 * - Should NOT see: My Classes (teacher-specific)
 */

const puppeteer = require('puppeteer');

const PRODUCTION_URL = 'https://podcast-stories-production.up.railway.app';
const ADMIN_CREDENTIALS = {
  email: 'admin@vidpod.com',
  password: 'vidpod'
};

class AdminNavigationTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${timestamp}] ${message}`);
    this.results.push({ timestamp, type, message });
  }

  async initialize() {
    this.log('🚀 Initializing Admin Navigation Test');
    
    this.browser = await puppeteer.launch({
      headless: false, // Show browser for visual verification
      defaultViewport: null,
      args: ['--start-maximized'],
      devtools: false
    });

    this.page = await this.browser.newPage();
    
    // Monitor console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        this.log(`Browser Console Error: ${msg.text()}`, 'error');
      }
    });

    this.page.on('pageerror', error => {
      this.log(`Page Error: ${error.message}`, 'error');
    });

    this.log('Browser initialized successfully');
  }

  async loginAsAdmin() {
    this.log('🔐 Testing admin login...');
    
    try {
      await this.page.goto(`${PRODUCTION_URL}/index.html`, { waitUntil: 'networkidle0' });
      
      // Wait for and fill login form
      await this.page.waitForSelector('#email', { timeout: 10000 });
      await this.page.waitForSelector('#password');
      await this.page.waitForSelector('button[type="submit"]');

      await this.page.type('#email', ADMIN_CREDENTIALS.email);
      await this.page.type('#password', ADMIN_CREDENTIALS.password);
      
      this.log('Submitting login form...');
      await this.page.click('button[type="submit"]');
      
      // Wait for redirect
      await this.page.waitForNavigation({ timeout: 15000 });
      
      const currentUrl = this.page.url();
      if (currentUrl.includes('dashboard.html') || currentUrl.includes('admin.html')) {
        this.log('Admin login successful', 'success');
        return true;
      } else {
        this.log(`Login failed - redirected to: ${currentUrl}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Login error: ${error.message}`, 'error');
      return false;
    }
  }

  async testNavigationElements() {
    this.log('🧪 Testing navigation elements...');
    
    // Wait for navigation to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      // Test expected visible elements
      const expectedVisible = [
        { selector: '[data-page="dashboard"]', name: 'Dashboard', icon: '🏠' },
        { selector: '[data-page="stories"]', name: 'Browse Stories', icon: '📚' },
        { selector: '[data-page="add-story"]', name: 'Add Story', icon: '✏️' },
        { selector: '[data-page="admin-browse-stories"]', name: 'Admin Browse Stories', icon: '🏛️' },
        { selector: '[data-page="admin"]', name: 'Admin Panel', icon: '⚙️' }
      ];

      // Test expected hidden elements
      const expectedHidden = [
        { selector: '[data-page="teacher-dashboard"]', name: 'My Classes', icon: '🎓' }
      ];

      this.log('Checking visible navigation elements...');
      let visibleCount = 0;
      
      for (const item of expectedVisible) {
        try {
          const element = await this.page.$(item.selector);
          if (element) {
            const isVisible = await this.page.evaluate(el => {
              const style = window.getComputedStyle(el);
              return style.display !== 'none' && style.visibility !== 'hidden';
            }, element);
            
            if (isVisible) {
              this.log(`${item.icon} ${item.name}: VISIBLE`, 'success');
              visibleCount++;
            } else {
              this.log(`${item.icon} ${item.name}: HIDDEN (should be visible)`, 'error');
            }
          } else {
            this.log(`${item.icon} ${item.name}: NOT FOUND`, 'error');
          }
        } catch (error) {
          this.log(`${item.icon} ${item.name}: ERROR - ${error.message}`, 'error');
        }
      }

      this.log('Checking hidden navigation elements...');
      let hiddenCount = 0;
      
      for (const item of expectedHidden) {
        try {
          const element = await this.page.$(item.selector);
          if (element) {
            const isVisible = await this.page.evaluate(el => {
              const style = window.getComputedStyle(el);
              return style.display !== 'none' && style.visibility !== 'hidden';
            }, element);
            
            if (!isVisible) {
              this.log(`${item.icon} ${item.name}: CORRECTLY HIDDEN`, 'success');
              hiddenCount++;
            } else {
              this.log(`${item.icon} ${item.name}: VISIBLE (should be hidden)`, 'error');
            }
          } else {
            this.log(`${item.icon} ${item.name}: NOT FOUND (could be removed)`, 'warning');
            hiddenCount++; // Count as success if not found
          }
        } catch (error) {
          this.log(`${item.icon} ${item.name}: ERROR - ${error.message}`, 'error');
        }
      }

      return {
        expectedVisible: expectedVisible.length,
        actuallyVisible: visibleCount,
        expectedHidden: expectedHidden.length,
        actuallyHidden: hiddenCount
      };

    } catch (error) {
      this.log(`Navigation test error: ${error.message}`, 'error');
      return null;
    }
  }

  async testMobileNavigation() {
    this.log('📱 Testing mobile navigation...');
    
    try {
      // Set mobile viewport
      await this.page.setViewport({ width: 375, height: 667 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if mobile toggle exists and is visible
      const mobileToggle = await this.page.$('#mobileToggle');
      if (mobileToggle) {
        const isToggleVisible = await this.page.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }, mobileToggle);

        if (isToggleVisible) {
          this.log('Mobile toggle found and visible', 'success');
          
          // Click mobile toggle
          await this.page.click('#mobileToggle');
          await new Promise(resolve => setTimeout(resolve, 500));

          // Check mobile menu is visible
          const mobileMenu = await this.page.$('#mobileMenu');
          if (mobileMenu) {
            const isMenuVisible = await this.page.evaluate(el => {
              const style = window.getComputedStyle(el);
              return style.display !== 'none' && style.visibility !== 'hidden';
            }, mobileMenu);

            if (isMenuVisible) {
              this.log('Mobile menu opens correctly', 'success');
              
              // Check that My Classes is not in mobile menu either
              const teacherDashboardMobile = await this.page.$('.mobile-nav [data-page="teacher-dashboard"]');
              if (teacherDashboardMobile) {
                const isVisible = await this.page.evaluate(el => {
                  const style = window.getComputedStyle(el);
                  return style.display !== 'none' && style.visibility !== 'hidden';
                }, teacherDashboardMobile);
                
                if (!isVisible) {
                  this.log('🎓 My Classes correctly hidden in mobile menu', 'success');
                } else {
                  this.log('🎓 My Classes visible in mobile menu (should be hidden)', 'error');
                }
              } else {
                this.log('🎓 My Classes not found in mobile menu (correctly removed)', 'success');
              }
            } else {
              this.log('Mobile menu not visible after toggle', 'error');
            }
          } else {
            this.log('Mobile menu not found', 'error');
          }
        } else {
          this.log('Mobile toggle not visible', 'error');
        }
      } else {
        this.log('Mobile toggle not found', 'error');
      }

      // Reset to desktop view
      await this.page.setViewport({ width: 1200, height: 800 });
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      this.log(`Mobile navigation test error: ${error.message}`, 'error');
    }
  }

  async testNavigationConsistency() {
    this.log('🔄 Testing navigation consistency across pages...');
    
    const pages = [
      { url: '/dashboard.html', name: 'Dashboard' },
      { url: '/stories.html', name: 'Browse Stories' },
      { url: '/add-story.html', name: 'Add Story' },
      { url: '/admin.html', name: 'Admin Panel' }
    ];

    for (const pageInfo of pages) {
      try {
        this.log(`Testing navigation on ${pageInfo.name}...`);
        await this.page.goto(`${PRODUCTION_URL}${pageInfo.url}`, { waitUntil: 'networkidle0' });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check that My Classes is hidden on this page too
        const teacherDashboard = await this.page.$('[data-page="teacher-dashboard"]');
        if (teacherDashboard) {
          const isVisible = await this.page.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
          }, teacherDashboard);
          
          if (!isVisible) {
            this.log(`✅ ${pageInfo.name}: My Classes correctly hidden`, 'success');
          } else {
            this.log(`❌ ${pageInfo.name}: My Classes visible (should be hidden)`, 'error');
          }
        } else {
          this.log(`✅ ${pageInfo.name}: My Classes not found (correctly removed)`, 'success');
        }
      } catch (error) {
        this.log(`Error testing ${pageInfo.name}: ${error.message}`, 'error');
      }
    }
  }

  async generateReport() {
    const successCount = this.results.filter(r => r.type === 'success').length;
    const errorCount = this.results.filter(r => r.type === 'error').length;
    const warningCount = this.results.filter(r => r.type === 'warning').length;

    this.log('📊 === ADMIN NAVIGATION TEST REPORT ===');
    this.log(`✅ Successes: ${successCount}`);
    this.log(`❌ Errors: ${errorCount}`);
    this.log(`⚠️ Warnings: ${warningCount}`);
    this.log(`📈 Success Rate: ${Math.round((successCount / (successCount + errorCount)) * 100)}%`);

    if (errorCount === 0) {
      this.log('🎉 ALL TESTS PASSED - Admin navigation working correctly!', 'success');
    } else {
      this.log(`⚠️ ${errorCount} issues found - please review`, 'warning');
    }

    return {
      total: this.results.length,
      successes: successCount,
      errors: errorCount,
      warnings: warningCount,
      passed: errorCount === 0
    };
  }

  async runFullTest() {
    try {
      await this.initialize();
      
      // Test login
      const loginSuccess = await this.loginAsAdmin();
      if (!loginSuccess) {
        this.log('Cannot proceed without successful login', 'error');
        await this.cleanup();
        return false;
      }

      // Test navigation elements
      const navResults = await this.testNavigationElements();
      if (navResults) {
        this.log(`Navigation Summary: ${navResults.actuallyVisible}/${navResults.expectedVisible} visible, ${navResults.actuallyHidden}/${navResults.expectedHidden} hidden`);
      }

      // Test mobile navigation
      await this.testMobileNavigation();

      // Test navigation consistency across pages
      await this.testNavigationConsistency();

      // Generate final report
      const report = await this.generateReport();

      // Keep browser open for 10 seconds for manual verification
      this.log('🔍 Keeping browser open for 10 seconds for manual verification...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      await this.cleanup();
      return report.passed;

    } catch (error) {
      this.log(`Test suite error: ${error.message}`, 'error');
      await this.cleanup();
      return false;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('Browser closed');
    }
  }
}

// Run the test
async function runTest() {
  console.log('🧪 === ADMIN NAVIGATION PUPPETEER TEST ===\n');
  
  const tester = new AdminNavigationTester();
  const success = await tester.runFullTest();
  
  if (success) {
    console.log('\n🎉 Admin navigation test PASSED - My Classes correctly hidden for amitrace_admin users!');
    process.exit(0);
  } else {
    console.log('\n❌ Admin navigation test FAILED - see errors above');
    process.exit(1);
  }
}

runTest().catch(error => {
  console.error('\n💥 Test crashed:', error);
  process.exit(1);
});