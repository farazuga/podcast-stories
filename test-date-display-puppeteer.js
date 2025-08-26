/**
 * Puppeteer Date Display Test
 * Test actual date display in browser to verify timezone issues
 */

import puppeteer from 'puppeteer';

const TEST_URL = 'https://podcast-stories-production.up.railway.app';
const TEST_CREDENTIALS = {
  email: 'admin@vidpod.com',
  password: 'vidpod'
};

console.log('=== Puppeteer Date Display Test ===\n');

class PuppeteerDateTester {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async runTest() {
    try {
      console.log('🚀 Starting Puppeteer browser...');
      this.browser = await puppeteer.launch({ 
        headless: false, // Show browser for debugging
        defaultViewport: { width: 1280, height: 720 }
      });
      this.page = await this.browser.newPage();
      
      // Enable console logging from browser
      this.page.on('console', msg => {
        console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
      });

      console.log('✅ Browser launched\n');

      // Test date display on stories page
      await this.testStoriesPageDates();
      
      // Test date display on admin page
      await this.testAdminPageDates();

      console.log('\n🎉 Puppeteer test completed');

    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      console.error(error.stack);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  async testStoriesPageDates() {
    console.log('📖 Testing Stories Page Date Display');
    console.log('=====================================');

    // Navigate to login page (homepage)
    console.log('→ Navigating to login page...');
    await this.page.goto(`${TEST_URL}/`, { waitUntil: 'networkidle0' });

    // Login
    console.log('→ Logging in...');
    await this.page.type('#email', TEST_CREDENTIALS.email);
    await this.page.type('#password', TEST_CREDENTIALS.password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' });

    // User is already on admin page, let's check the Story Approval tab
    console.log('→ Testing admin page story approval section...');
    
    // Click on Story Approval tab
    await this.page.click('button[onclick="showTab(\'stories\')"]');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for tab to load
    
    // Wait for stories to load in admin panel
    await this.page.waitForSelector('#stories-tab table tbody tr, .story-item', { timeout: 10000 });
    
    // Debug: Check what's in the DOM first
    const domDebug = await this.page.evaluate(() => {
      return {
        storiesTabExists: !!document.querySelector('#stories-tab'),
        tableExists: !!document.querySelector('#stories-tab table'),
        tbodyExists: !!document.querySelector('#stories-tab table tbody'),
        rowCount: document.querySelectorAll('#stories-tab table tbody tr').length,
        firstRowCells: document.querySelector('#stories-tab table tbody tr') ? 
          document.querySelector('#stories-tab table tbody tr').children.length : 0,
        tabContent: document.querySelector('#stories-tab')?.innerHTML.substring(0, 500) || 'No stories tab found'
      };
    });
    
    console.log('→ DOM Debug Info:', domDebug);
    
    // Find our test stories and check their dates
    console.log('→ Looking for test stories...');
    
    const storyData = await this.page.evaluate(() => {
      const stories = [];
      
      // Look for table rows in admin panel
      const tableRows = document.querySelectorAll('#stories-tab table tbody tr');
      
      tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 9) { // Ensure we have enough columns
          const title = cells[0]?.textContent?.trim(); // First column should be title
          const date = cells[8]?.textContent?.trim();  // Coverage date should be in column 9
          
          if (title && date && (title.toLowerCase().includes('whale') || title.toLowerCase().includes('racoons'))) {
            stories.push({ 
              title, 
              date, 
              html: cells[8]?.outerHTML || 'No date cell',
              allCells: Array.from(cells).map(cell => cell.textContent?.trim())
            });
          }
        }
      });
      
      // Also look for any story items with different structure
      const storyItems = document.querySelectorAll('.story-item, .story-card');
      storyItems.forEach(item => {
        const titleElement = item.querySelector('.story-title, .title, h3');
        const dateElement = item.querySelector('.story-date, .date, .coverage-date');
        
        if (titleElement && dateElement) {
          const title = titleElement.textContent?.trim();
          const date = dateElement.textContent?.trim();
          
          if (title && (title.toLowerCase().includes('whale') || title.toLowerCase().includes('racoons'))) {
            stories.push({ title, date, html: dateElement.outerHTML });
          }
        }
      });
      
      return stories;
    });

    console.log(`→ Found ${storyData.length} test stories on stories page:`);
    storyData.forEach((story, index) => {
      console.log(`   ${index + 1}. "${story.title}"`);
      console.log(`      Displayed date: "${story.date}"`);
      console.log(`      HTML: ${story.html}`);
      
      // Check expected dates
      if (story.title.toLowerCase().includes('whale')) {
        const expected = '03/05/1954';
        if (story.date === expected) {
          console.log(`      ✅ CORRECT - matches expected ${expected}`);
        } else {
          console.log(`      ❌ WRONG - expected ${expected}, got ${story.date}`);
        }
      } else if (story.title.toLowerCase().includes('racoons')) {
        const expected = '04/01/2024';
        if (story.date === expected) {
          console.log(`      ✅ CORRECT - matches expected ${expected}`);
        } else {
          console.log(`      ❌ WRONG - expected ${expected}, got ${story.date}`);
        }
      }
    });
  }

  async testAdminPageDates() {
    console.log('\n👤 Testing Admin Page Date Display');
    console.log('==================================');

    // Navigate to admin page
    console.log('→ Navigating to admin page...');
    await this.page.goto(`${TEST_URL}/backend/frontend/admin.html`, { waitUntil: 'networkidle0' });
    
    // Wait for stories to load
    await this.page.waitForSelector('.story-item, .story-row, tbody tr', { timeout: 10000 });
    
    console.log('→ Looking for test stories on admin page...');
    
    const adminStoryData = await this.page.evaluate(() => {
      const stories = [];
      
      // Try different selectors for admin page
      const storyElements = document.querySelectorAll('.story-item, .story-row, tbody tr');
      
      storyElements.forEach(element => {
        const titleElement = element.querySelector('.story-title, td:first-child, .title');
        const dateElement = element.querySelector('.story-date, .date, .coverage-date, td:nth-child(9)');
        
        if (titleElement && dateElement) {
          const title = titleElement.textContent?.trim();
          const date = dateElement.textContent?.trim();
          
          if (title && (title.toLowerCase().includes('whale') || title.toLowerCase().includes('racoons'))) {
            stories.push({ 
              title, 
              date, 
              rawHtml: element.innerHTML.substring(0, 200) + '...',
              dateHtml: dateElement.outerHTML 
            });
          }
        }
      });
      
      return stories;
    });

    console.log(`→ Found ${adminStoryData.length} test stories on admin page:`);
    adminStoryData.forEach((story, index) => {
      console.log(`   ${index + 1}. "${story.title}"`);
      console.log(`      Displayed date: "${story.date}"`);
      console.log(`      Date HTML: ${story.dateHtml}`);
      
      // Check expected dates
      if (story.title.toLowerCase().includes('whale')) {
        const expected = '03/05/1954';
        if (story.date === expected) {
          console.log(`      ✅ CORRECT - matches expected ${expected}`);
        } else {
          console.log(`      ❌ WRONG - expected ${expected}, got ${story.date}`);
        }
      } else if (story.title.toLowerCase().includes('racoons')) {
        const expected = '04/01/2024';
        if (story.date === expected) {
          console.log(`      ✅ CORRECT - matches expected ${expected}`);
        } else {
          console.log(`      ❌ WRONG - expected ${expected}, got ${story.date}`);
        }
      }
    });
  }

  async debugDateFormatting() {
    console.log('\n🐛 Debug Date Formatting');
    console.log('========================');

    // Test the date formatting functions directly in browser
    const debugInfo = await this.page.evaluate(() => {
      const testDates = ['1954-03-05', '2024-04-01'];
      const results = [];
      
      testDates.forEach(dateStr => {
        const result = {
          input: dateStr,
          formatDateSafe: null,
          newDateDisplay: null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timezoneOffset: new Date().getTimezoneOffset()
        };
        
        // Test formatDateSafe if available
        if (typeof window.formatDateSafe === 'function') {
          result.formatDateSafe = window.formatDateSafe(dateStr);
        }
        
        // Test standard new Date() formatting
        const date = new Date(dateStr);
        result.newDateDisplay = date.toLocaleDateString();
        result.newDateISOString = date.toISOString();
        result.newDateComponents = {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate()
        };
        
        results.push(result);
      });
      
      return results;
    });

    console.log('Debug results:');
    debugInfo.forEach((result, index) => {
      console.log(`\nDate ${index + 1}: ${result.input}`);
      console.log(`  Timezone: ${result.timezone} (offset: ${result.timezoneOffset} minutes)`);
      console.log(`  formatDateSafe(): ${result.formatDateSafe}`);
      console.log(`  new Date().toLocaleDateString(): ${result.newDateDisplay}`);
      console.log(`  new Date() components: ${JSON.stringify(result.newDateComponents)}`);
      console.log(`  ISO string: ${result.newDateISOString}`);
    });
  }
}

// Run the test
const tester = new PuppeteerDateTester();
tester.runTest().catch(console.error);